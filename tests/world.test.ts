import { describe, expect, it } from 'vitest';
import { G, GM_SUN, L_SUN_W, SIGMA, T_SUN_K } from '../src/core/constants';
import {
  daylightSeconds,
  findMeanAnomaly,
  findSolarLongitude,
  solarPosition,
} from '../src/core/climate/solar';
import { degToRad } from '../src/core/math/angles';
import { meanTemperature, seasonalTemperatures } from '../src/core/climate/temperature';
import { bodyById } from '../src/core/model/document';
import {
  atmosphereMargin,
  habitableZone,
  insolationEarthUnits,
} from '../src/core/physics/habitable';
import {
  escapeSpeed,
  luminositySolar,
  orbitalPeriodSeconds,
  solarDaySeconds,
  surfaceGravity,
} from '../src/core/physics/derived';
import { axialPrecessionSeconds } from '../src/core/physics/precession';
import { solSystem } from '../src/core/presets/sol';
import { calendarToJd } from '../src/core/time/julian';
import seasons from './fixtures/usno-seasons.json';

const sol = solSystem();
const sun = bodyById(sol, 'sun');
const earth = bodyById(sol, 'earth');
const moon = bodyById(sol, 'moon');

function hours(seconds: number): number {
  return Math.abs(seconds) / 3600;
}

describe('derived Solar System values', () => {
  const cases = [
    { id: 'mercury', g: 3.7, escape: 4.3, dayH: 4222.6 },
    { id: 'venus', g: 8.9, escape: 10.4, dayH: 2802 },
    { id: 'earth', g: 9.8, escape: 11.2, dayH: 24 },
    { id: 'mars', g: 3.7, escape: 5, dayH: 24.7 },
    { id: 'jupiter', g: 23.1, escape: 59.5, dayH: 9.9 },
    { id: 'saturn', g: 9, escape: 35.5, dayH: 10.7 },
  ] as const;

  it('matches the NASA fact sheet gravity, escape speed, and solar day', () => {
    for (const item of cases) {
      const body = bodyById(sol, item.id);
      if (!body.orbit || !body.rotation) throw new Error(item.id);
      const parent = bodyById(sol, body.parentId ?? 'sun');
      const gm = G * (parent.massKg + body.massKg);
      const period = orbitalPeriodSeconds(body.orbit, gm);
      const day = solarDaySeconds(body.rotation.periodS, period);
      const gravityGap = Math.abs(surfaceGravity(body.massKg, body.radiusM) - item.g);
      const gravityLimit = item.id === 'jupiter' || item.id === 'saturn' ? 2 : 0.5;
      expect(gravityGap, item.id).toBeLessThan(gravityLimit);
      expect(escapeSpeed(body.massKg, body.radiusM) / 1000, item.id).toBeCloseTo(item.escape, 0);
      expect(Math.abs(hours(day) - item.dayH) / item.dayH, item.id).toBeLessThan(0.005);
    }
  });

  it('gives the Moon a synodic day near 708.7 hours', () => {
    if (!earth.orbit || !moon.rotation) throw new Error('missing');
    const year = orbitalPeriodSeconds(earth.orbit, GM_SUN);
    const day = solarDaySeconds(moon.rotation.periodS, year);
    expect(Math.abs(hours(day) - 708.7) / 708.7).toBeLessThan(0.005);
  });
});

describe('stars and habitable zone', () => {
  it('puts the Sun on the mass-luminosity relation and inside its own zone', () => {
    expect(luminositySolar(1)).toBe(1);
    const zone = habitableZone(L_SUN_W, T_SUN_K);
    const earthDistance = earth.orbit?.a ?? 0;
    expect(earthDistance).toBeGreaterThan(zone.innerM);
    expect(earthDistance).toBeLessThan(zone.outerM);
    expect(insolationEarthUnits(L_SUN_W, earthDistance)).toBeCloseTo(1, 2);
  });

  it('puts Earth above the cosmic shoreline and the Moon below it', () => {
    const earthEscape = escapeSpeed(earth.massKg, earth.radiusM);
    const moonEscape = escapeSpeed(moon.massKg, moon.radiusM);
    expect(atmosphereMargin(earthEscape, 1)).toBeGreaterThan(0);
    expect(atmosphereMargin(moonEscape, 1)).toBeLessThan(0);
  });

  it('precesses Earth in a few tens of thousands of years', () => {
    if (!earth.orbit || !earth.rotation || !moon.orbit) throw new Error('missing');
    const years =
      axialPrecessionSeconds({
        orbitalPeriodS: orbitalPeriodSeconds(earth.orbit, GM_SUN),
        rotationPeriodS: earth.rotation.periodS,
        eccentricity: earth.orbit.e,
        obliquityRad: earth.rotation.obliquity,
        dynamicalEllipticity: 0.003273,
        starMassKg: sun.massKg,
        planetSemiMajorM: earth.orbit.a,
        moons: [{ massKg: moon.massKg, semiMajorM: moon.orbit.a }],
      }) /
      (86400 * 365.25);
    expect(years).toBeGreaterThan(20_000);
    expect(years).toBeLessThan(35_000);
  });
});

describe('seasons and daylight', () => {
  it('matches USNO equinoxes, solstices, perihelion, and aphelion to 30 minutes', () => {
    if (!earth.orbit || !earth.rotation) throw new Error('missing');
    for (const year of seasons.years) {
      for (const event of year.data) {
        const [hour, minute] = event.time.split(':').map(Number);
        const expected = calendarToJd({
          year: event.year,
          month: event.month,
          day: event.day,
          hour: hour ?? 0,
          minute: minute ?? 0,
          second: 0,
        });
        const start = calendarToJd({
          year: event.month === 1 ? event.year - 1 : event.year,
          month: event.month === 1 ? 12 : 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
        });
        let found = expected;
        if (event.phenom === 'Perihelion') {
          found = findMeanAnomaly(earth.orbit, sol.epochJd, start, 0, GM_SUN);
        } else if (event.phenom === 'Aphelion') {
          found = findMeanAnomaly(earth.orbit, sol.epochJd, start, Math.PI, GM_SUN);
        } else {
          const base = event.phenom === 'Solstice' ? Math.PI / 2 : 0;
          const target = event.month >= 9 ? base + Math.PI : base;
          found = findSolarLongitude(
            earth.orbit,
            sol.epochJd,
            start,
            target,
            GM_SUN,
            earth.rotation.obliquity,
          );
        }
        const minutes = Math.abs(found - expected) * 1440;
        const limit = event.phenom === 'Perihelion' || event.phenom === 'Aphelion' ? 2 * 1440 : 30;
        expect(minutes, `${event.phenom} ${event.year}-${event.month}`).toBeLessThan(limit);
      }
    }
  });

  it('matches Greenwich daylight on the June solstice to 2 minutes', () => {
    if (!earth.orbit || !earth.rotation) throw new Error('missing');
    const jd = calendarToJd({ year: 2026, month: 6, day: 21, hour: 12, minute: 0, second: 0 });
    const sky = solarPosition(earth.orbit, sol.epochJd, jd, GM_SUN, earth.rotation.obliquity);
    const seconds = daylightSeconds(degToRad(51.4769), sky.declination, 86400);
    const greenwichHours = 20 + 21 / 60 - (3 + 43 / 60);
    expect(Math.abs(seconds / 3600 - greenwichHours) * 60).toBeLessThan(2);
  });
});

describe('temperature model', () => {
  it('keeps Earth near 15 °C and warmer at the equator than at the pole', () => {
    if (!earth.orbit || !earth.rotation) throw new Error('missing');
    const grid = seasonalTemperatures({
      solarConstant: 1361,
      obliquityRad: earth.rotation.obliquity,
      eccentricity: earth.orbit.e,
      equinoxTrueAnomaly: 0,
      samples: 12,
    });
    const mean = meanTemperature(grid);
    expect(mean).toBeGreaterThan(10);
    expect(mean).toBeLessThan(20);
    const equator = grid.latitudesDeg.indexOf(0);
    const pole = grid.latitudesDeg.length - 1;
    const equatorMean =
      grid.celsius.reduce((sum, row) => sum + (row[equator] ?? 0), 0) / grid.celsius.length;
    const poleMean =
      grid.celsius.reduce((sum, row) => sum + (row[pole] ?? 0), 0) / grid.celsius.length;
    expect(equatorMean).toBeGreaterThan(poleMean);
  });
});

describe('solar constant consistency', () => {
  it('recovers the IAU solar temperature from luminosity and radius', () => {
    const temperature = (L_SUN_W / (4 * Math.PI * sun.radiusM ** 2 * SIGMA)) ** 0.25;
    expect(temperature).toBeCloseTo(T_SUN_K, 0);
  });
});
