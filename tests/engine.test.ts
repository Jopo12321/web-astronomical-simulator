import { describe, expect, it } from 'vitest';
import { AU_M, DAY_S, GM_SUN, J2000_JD } from '../src/core/constants';
import { wrapPi } from '../src/core/math/angles';
import { sfc32 } from '../src/core/math/rng';
import { norm } from '../src/core/math/vec';
import { parseSystemDocument } from '../src/core/model/document';
import {
  elementsFromState,
  periodSeconds,
  resolveElements,
  stateFromElements,
} from '../src/core/orbits/elements';
import { eccentricAnomaly, meanAnomalyFromEccentric } from '../src/core/orbits/kepler';
import { hillRadius } from '../src/core/orbits/stability';
import { placeSystem } from '../src/core/orbits/system';
import { calendarToJd, jdToCalendar } from '../src/core/time/julian';

function angleClose(actual: number, expected: number): void {
  expect(Math.abs(wrapPi(actual - expected))).toBeLessThan(1e-8);
}

describe('time', () => {
  it('maps 2000-01-01 12:00 to J2000', () => {
    const jd = calendarToJd({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0 });
    expect(jd).toBeCloseTo(J2000_JD, 8);
  });

  it('round-trips a calendar date', () => {
    const original = { year: 2026, month: 9, day: 30, hour: 13, minute: 47, second: 0 };
    const back = jdToCalendar(calendarToJd(original));
    expect(back.year).toBe(original.year);
    expect(back.month).toBe(original.month);
    expect(back.day).toBe(original.day);
    expect(back.hour).toBe(original.hour);
    expect(back.minute).toBe(original.minute);
    expect(back.second).toBeCloseTo(0, 4);
  });
});

describe('kepler', () => {
  it('solves a circular orbit as E = M', () => {
    expect(eccentricAnomaly(1.2, 0)).toBeCloseTo(1.2, 12);
  });

  it('returns periapsis at M = 0', () => {
    const eccentric = eccentricAnomaly(0, 0.5);
    expect(eccentric).toBeCloseTo(0, 12);
    expect(meanAnomalyFromEccentric(eccentric, 0.5)).toBeCloseTo(0, 12);
  });
});

describe('elements', () => {
  it('gives Earth a sidereal year near 365.256 days', () => {
    expect(periodSeconds(GM_SUN, AU_M) / DAY_S).toBeCloseTo(365.256, 2);
  });

  it('round-trips an inclined eccentric orbit', () => {
    const original = {
      a: AU_M,
      e: 0.2,
      i: 0.4,
      Omega: 1.1,
      omega: 0.7,
      M0: 2.2,
    };
    const resolved = resolveElements(original, J2000_JD, J2000_JD, GM_SUN);
    const state = stateFromElements(resolved, GM_SUN);
    const recovered = elementsFromState(state, GM_SUN);
    expect(recovered.a).toBeCloseTo(original.a, -2);
    expect(recovered.e).toBeCloseTo(original.e, 8);
    angleClose(recovered.i, original.i);
    angleClose(recovered.Omega, original.Omega);
    angleClose(recovered.omega, original.omega);
    angleClose(recovered.M0, original.M0);
    expect(norm(state.position)).toBeGreaterThan(AU_M * 0.5);
  });
});

describe('rng and documents', () => {
  it('repeats a seeded sequence', () => {
    expect(sfc32('sol')()).toBe(sfc32('sol')());
    expect(sfc32('sol')()).not.toBe(sfc32('other')());
  });

  it('rejects a duplicate body id', () => {
    expect(() =>
      parseSystemDocument({
        schemaVersion: 1,
        name: 'Bad',
        epochJd: J2000_JD,
        homeBodyId: null,
        settings: {
          seed: 'x',
          architecture: 'custom',
          ensureHabitable: false,
          starCount: 1,
          locks: [],
        },
        bodies: [
          { id: 'a', name: 'A', kind: 'star', parentId: null, massKg: 1, radiusM: 1 },
          { id: 'a', name: 'B', kind: 'planet', parentId: 'a', massKg: 1, radiusM: 1 },
        ],
      }),
    ).toThrow(/Duplicate body id/);
  });
});

describe('barycenter', () => {
  it('places equal planet and moon on opposite sides of the orbit point', () => {
    const doc = parseSystemDocument({
      schemaVersion: 1,
      name: 'Pair',
      epochJd: J2000_JD,
      homeBodyId: 'planet',
      settings: {
        seed: 'pair',
        architecture: 'custom',
        ensureHabitable: false,
        starCount: 1,
        locks: [],
      },
      bodies: [
        {
          id: 'star',
          name: 'Star',
          kind: 'star',
          parentId: null,
          massKg: 2e30,
          radiusM: 7e8,
        },
        {
          id: 'planet',
          name: 'Planet',
          kind: 'planet',
          parentId: 'star',
          massKg: 1e24,
          radiusM: 6e6,
          orbitFrame: 'barycenter',
          orbit: { a: 1.5e11, e: 0, i: 0, Omega: 0, omega: 0, M0: 0 },
        },
        {
          id: 'moon',
          name: 'Moon',
          kind: 'moon',
          parentId: 'planet',
          massKg: 1e24,
          radiusM: 1e6,
          orbit: { a: 1e8, e: 0, i: 0, Omega: 0, omega: 0, M0: 0 },
        },
      ],
    });
    const placed = placeSystem(doc, J2000_JD);
    const planet = placed.find((body) => body.id === 'planet');
    const moon = placed.find((body) => body.id === 'moon');
    expect(planet).toBeDefined();
    expect(moon).toBeDefined();
    if (!planet || !moon) return;
    expect(planet.position[0]).toBeCloseTo(1.5e11 - 5e7, -2);
    expect(moon.position[0]).toBeCloseTo(1.5e11 + 5e7, -2);
    expect(hillRadius(1.5e11, 0, 1e24, 2e30)).toBeGreaterThan(0);
  });
});
