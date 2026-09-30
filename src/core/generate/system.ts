import { AU_M, G, GM_SUN, J2000_JD, L_SUN_W, R_SUN_M, SIGMA } from '../constants';
import { sfc32 } from '../math/rng';
import { parseSystemDocument } from '../model/document';
import type { Body, GeneratorSettings, SystemDocument } from '../model/schema';
import { circumbinaryCritical, circumstellarCritical } from '../orbits/binary';
import { habitableZone } from '../physics/habitable';
import { effectiveTemperature, luminositySolar, radiusSolar } from '../physics/derived';

const M_SUN = GM_SUN / G;
const M_EARTH = 5.972e24;
const R_EARTH = 6.371e6;
const NAMES = ['Asha', 'Boreal', 'Cinder', 'Dusk', 'Eland', 'Frost', 'Gale', 'Harbor', 'Iris', 'Jasper', 'Kite', 'Lumen'];
const COLORS = ['#b5b5b5', '#e6c07b', '#4f86c6', '#c1440e', '#d8c39a', '#7fdbda', '#3d5aef', '#c9b7a7'];

function range(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

function radiusOf(massKg: number): number {
  const earths = massKg / M_EARTH;
  let radii = 1;
  if (earths < 2) radii = Math.max(0.2, earths ** 0.27);
  else if (earths < 100) radii = 1.6 * earths ** 0.18;
  else radii = 11.2;
  return radii * R_EARTH;
}

function starBody(massSolar: number, id: string, name: string, parentId: string | null, orbit?: Body['orbit']): Body {
  const luminosity = luminositySolar(massSolar) * L_SUN_W;
  const radius = radiusSolar(massSolar) * R_SUN_M;
  return {
    id,
    name,
    kind: 'star',
    parentId,
    massKg: massSolar * M_SUN,
    radiusM: Math.max(radius, 1e7),
    luminosityW: luminosity,
    temperatureK: effectiveTemperature(luminosity, Math.max(radius, 1e7), SIGMA),
    color: '#ffd27a',
    orbit,
  };
}

function planetSpacing(architecture: GeneratorSettings['architecture'], count: number, rng: () => number): number[] {
  if (architecture === 'compact') {
    return Array.from({ length: count }, (_, index) => 0.04 * 1.7 ** index);
  }
  if (architecture === 'titius-bode') {
    return Array.from({ length: count }, (_, index) => (index === 0 ? 0.4 : 0.4 + 0.3 * 2 ** (index - 1)));
  }
  const solar = [0.39, 0.72, 1, 1.52, 5.2, 9.54, 19.2, 30.1];
  return solar.slice(0, count).map((au) => au * range(rng, 0.9, 1.1));
}

export function generateSystem(settings: GeneratorSettings, previous?: SystemDocument): SystemDocument {
  const rng = sfc32(settings.seed || 'system');
  const lockedStar = settings.locks.includes('star') ? previous?.bodies.find((body) => body.kind === 'star') : undefined;
  let massSolar = lockedStar ? lockedStar.massKg / M_SUN : range(rng, 0.6, 1.3);
  if (settings.architecture === 'red-dwarf') massSolar = lockedStar ? massSolar : 0.25;
  if (settings.starCount === 2) massSolar = lockedStar ? massSolar : range(rng, 0.8, 1.2);
  const companionSolar = range(rng, 0.4, massSolar);
  const primary = starBody(massSolar, 'star', 'Primary', null);
  if (lockedStar) {
    primary.massKg = lockedStar.massKg;
    primary.radiusM = lockedStar.radiusM;
    primary.luminosityW = lockedStar.luminosityW;
    primary.temperatureK = lockedStar.temperatureK;
    primary.name = lockedStar.name;
  }
  const luminosity = primary.luminosityW ?? L_SUN_W;
  const temperature = primary.temperatureK ?? 5772;
  const zone = habitableZone(luminosity, temperature);
  const zoneAu = { inner: zone.innerM / AU_M, outer: zone.outerM / AU_M };
  const bodies: Body[] = [primary];
  const binary = settings.starCount === 2 || settings.architecture === 'circumbinary' || settings.architecture === 'circumstellar';

  if (binary) {
    const separationAu = settings.architecture === 'circumstellar' ? 15 : 0.25;
    const mu = companionSolar / (massSolar + companionSolar);
    const eccentricity = 0.1;
    const separation = separationAu * AU_M;
    const companion = starBody(companionSolar, 'companion', 'Companion', 'star', {
      a: separation,
      e: eccentricity,
      i: 0,
      Omega: 0,
      omega: 0,
      M0: range(rng, 0, Math.PI * 2),
    });
    bodies.push(companion);
    const totalL = luminosity + (companion.luminosityW ?? 0);
    const totalT = temperature;
    const wideZone = habitableZone(totalL, totalT);
    if (settings.architecture === 'circumstellar') {
      const limit = circumstellarCritical(mu, eccentricity) * separation;
      const home = Math.min(Math.sqrt(zone.innerM * zone.outerM), limit * 0.6);
      bodies.push(world('home', 'Haven', 'star', home, M_EARTH, primary.massKg, true, settings.tidalLock === true));
    } else {
      const limit = circumbinaryCritical(mu, eccentricity) * separation;
      const home = Math.max(limit * 1.3, Math.sqrt(wideZone.innerM * wideZone.outerM));
      bodies.push(world('home', 'Haven', 'star', home, M_EARTH, primary.massKg, true, false));
    }
  } else {
    const count = 6;
    const scale = Math.sqrt(Math.max(luminosity, 1e20) / L_SUN_W);
    const axes = planetSpacing(settings.architecture, count, rng).map((au) => au * scale);
    const center = Math.sqrt(Math.max(zoneAu.inner, 0.01) * Math.max(zoneAu.outer, 0.02));
    let homeIndex = 0;
    if (settings.ensureHabitable && Number.isFinite(center)) {
      let best = Number.POSITIVE_INFINITY;
      axes.forEach((au, index) => {
        const gap = Math.abs(Math.log(au / center));
        if (gap < best) {
          best = gap;
          homeIndex = index;
        }
      });
      axes[homeIndex] = center;
    }
    axes.forEach((au, index) => {
      const giant = au > 2.7 * scale;
      const mass = giant ? M_EARTH * range(rng, 40, 300) : M_EARTH * range(rng, 0.2, 3);
      const home = settings.ensureHabitable && index === homeIndex;
      const locked = (settings.architecture === 'red-dwarf' || settings.tidalLock === true) && home;
      const planet = world(
        `p${index + 1}`,
        NAMES[index] ?? `Planet ${index + 1}`,
        'star',
        au * AU_M,
        mass,
        primary.massKg,
        home,
        locked,
      );
      bodies.push(planet);
      if (giant) bodies.push(moonOf(planet, primary.massKg, rng, false));
    });
  }

  if (settings.habitableMoon && !binary) {
    const host = bodies.find((body) => body.kind === 'planet' && body.massKg > 20 * M_EARTH);
    if (host) {
      const moon = moonOf(host, primary.massKg, rng, true);
      moon.id = 'haven-moon';
      moon.name = 'Haven';
      bodies.push(moon);
    }
  }

  const home = bodies.find((body) => body.id === 'haven-moon' || body.id === 'home' || body.name === 'Haven');
  return parseSystemDocument({
    schemaVersion: 1,
    name: settings.seed ? `System ${settings.seed}` : 'Generated system',
    epochJd: J2000_JD,
    homeBodyId: home?.id ?? bodies[1]?.id ?? null,
    settings,
    bodies,
  });
}

function world(
  id: string,
  name: string,
  parentId: string,
  semiMajor: number,
  massKg: number,
  starMassKg: number,
  home: boolean,
  locked: boolean,
): Body {
  const radius = radiusOf(massKg);
  const period = Math.PI * 2 * Math.sqrt(semiMajor ** 3 / (G * starMassKg));
  return {
    id: home ? 'home' : id,
    name,
    kind: 'planet',
    parentId,
    massKg,
    radiusM: radius,
    color: COLORS[name.length % COLORS.length] ?? '#9ecbff',
    orbit: { a: semiMajor, e: home ? 0.02 : 0.05, i: 0.03, Omega: 0, omega: 0, M0: 0.4 },
    rotation: {
      periodS: locked ? period : 8.64e4 * (0.6 + (name.length % 5) / 5),
      obliquity: locked ? 0 : 0.4,
    },
  };
}

function moonOf(host: Body, starMassKg: number, rng: () => number, habitable: boolean): Body {
  const hill = host.orbit
    ? host.orbit.a * (host.massKg / (3 * starMassKg)) ** (1 / 3)
    : host.radiusM * 20;
  const distance = Math.min(hill * 0.3, Math.max(host.radiusM * 8, range(rng, host.radiusM * 6, host.radiusM * 30)));
  const mass = habitable ? M_EARTH : M_EARTH * range(rng, 0.01, 0.2);
  const period = (Math.PI * 2) * Math.sqrt(distance ** 3 / (G * (host.massKg + mass)));
  return {
    id: `${host.id}-moon`,
    name: habitable ? 'Haven' : `${host.name} I`,
    kind: 'moon',
    parentId: host.id,
    massKg: mass,
    radiusM: radiusOf(mass),
    color: '#d0d0d0',
    orbit: { a: distance, e: 0.01, i: 0.02, Omega: 0, omega: 0, M0: 1 },
    rotation: { periodS: period, obliquity: habitable ? 0.1 : 0 },
  };
}
