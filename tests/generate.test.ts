import { describe, expect, it } from 'vitest';
import { AU_M, GM_SUN, G } from '../src/core/constants';
import { leapRule } from '../src/core/calendar/leap';
import { circumbinaryCritical } from '../src/core/orbits/binary';
import { leapfrog } from '../src/core/orbits/nbody';
import { generateSystem } from '../src/core/generate/system';
import { habitableZone } from '../src/core/physics/habitable';
import { bodiesCsv } from '../src/io/export';
import { solSystem } from '../src/core/presets/sol';

describe('generator', () => {
  const settings = {
    seed: 'harbor',
    architecture: 'solar-like' as const,
    ensureHabitable: true,
    starCount: 1 as const,
    locks: [],
  };

  it('repeats a seed and puts a world in the habitable zone', () => {
    const first = generateSystem(settings);
    const second = generateSystem(settings);
    const home = first.bodies.find((body) => body.id === 'home');
    const star = first.bodies.find((body) => body.id === 'star');
    expect(home?.orbit).toBeDefined();
    expect(star?.luminosityW).toBeDefined();
    expect(star?.temperatureK).toBeDefined();
    if (!home?.orbit || !star?.luminosityW || !star.temperatureK) return;
    const zone = habitableZone(star.luminosityW, star.temperatureK);
    expect(home.orbit.a).toBeGreaterThan(zone.innerM);
    expect(home.orbit.a).toBeLessThan(zone.outerM);
    expect(first.bodies.map((body) => body.orbit?.a)).toEqual(second.bodies.map((body) => body.orbit?.a));
  });

  it('locks a red-dwarf world and keeps a circumbinary world outside the critical orbit', () => {
    const dwarf = generateSystem({ ...settings, architecture: 'red-dwarf', tidalLock: true });
    const home = dwarf.bodies.find((body) => body.id === 'home');
    expect(home?.rotation?.obliquity).toBe(0);
    expect(home?.rotation?.periodS).toBeGreaterThan(0);
    const binary = generateSystem({
      ...settings,
      architecture: 'circumbinary',
      starCount: 2,
    });
    const companion = binary.bodies.find((body) => body.id === 'companion');
    const planet = binary.bodies.find((body) => body.id === 'home');
    if (!companion?.orbit || !planet?.orbit || !companion.massKg) return;
    const primary = binary.bodies.find((body) => body.id === 'star');
    const mu = companion.massKg / ((primary?.massKg ?? 1) + companion.massKg);
    const limit = circumbinaryCritical(mu, companion.orbit.e) * companion.orbit.a;
    expect(planet.orbit.a).toBeGreaterThan(limit);
  });
});

describe('calendar, n-body, and export', () => {
  it('turns a quarter day into a four-year leap', () => {
    expect(leapRule(0.25).every).toBe(4);
  });

  it('keeps Earth bound for a short integration', () => {
    const sol = solSystem();
    const sun = sol.bodies.find((body) => body.id === 'sun');
    const earth = sol.bodies.find((body) => body.id === 'earth');
    if (!sun || !earth?.orbit) throw new Error('missing');
    const a = earth.orbit.a;
    const speed = Math.sqrt(GM_SUN / a);
    const result = leapfrog(
      [
        { massKg: sun.massKg, position: [0, 0, 0], velocity: [0, 0, 0] },
        { massKg: earth.massKg, position: [a, 0, 0], velocity: [0, speed, 0] },
      ],
      86400,
      20,
    );
    expect(result.ejected).toBe(false);
    expect(result.maxRadiusRatio).toBeLessThan(1.2);
  });

  it('writes a CSV row for Earth', () => {
    expect(bodiesCsv(solSystem())).toContain('Earth');
    expect(AU_M).toBeGreaterThan(0);
    expect(G).toBeGreaterThan(0);
  });
});
