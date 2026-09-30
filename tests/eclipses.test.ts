import { describe, expect, it } from 'vitest';
import { J2000_JD } from '../src/core/constants';
import { findConjunctions, sarosPairs } from '../src/core/sky/events';
import {
  findSyzygy,
  illuminatedFraction,
  lunarEclipseKind,
  meeusMoon,
  solarEclipseKind,
} from '../src/core/sky/meeus';
import { solSystem } from '../src/core/presets/sol';
import { calendarToJd } from '../src/core/time/julian';

describe('Meeus Moon', () => {
  it('matches Horizons at J2000 to a few arcminutes', () => {
    const moon = meeusMoon(J2000_JD);
    expect(moon.longitudeDeg).toBeCloseTo(223.3189, 2);
    expect(moon.latitudeDeg).toBeCloseTo(5.1709, 2);
    expect(moon.distanceKm).toBeCloseTo(402449, -2);
  });
});

describe('solar eclipses vs NASA', () => {
  const cases = [
    { year: 2024, month: 4, day: 8, hour: 18, minute: 18, kind: 'total' },
    { year: 2024, month: 10, day: 2, hour: 18, minute: 46, kind: 'annular' },
    { year: 2025, month: 3, day: 29, hour: 10, minute: 48, kind: 'partial' },
    { year: 2026, month: 8, day: 12, hour: 17, minute: 47, kind: 'total' },
  ] as const;

  it('finds the type and the time of greatest eclipse within 30 minutes', () => {
    for (const event of cases) {
      const expected = calendarToJd({
        year: event.year,
        month: event.month,
        day: event.day,
        hour: event.hour,
        minute: event.minute,
        second: 0,
      });
      const start = calendarToJd({
        year: event.year,
        month: event.month,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });
      const jd = findSyzygy(start, false);
      const minutes = Math.abs(jd - expected) * 1440;
      expect(solarEclipseKind(jd), `${event.year}-${event.month}`).toBe(event.kind);
      expect(minutes, `${event.year}-${event.month}`).toBeLessThan(30);
      expect(illuminatedFraction(jd)).toBeLessThan(0.02);
    }
  });

  it('finds a total lunar eclipse near 2025-09-07', () => {
    const start = calendarToJd({
      year: 2025,
      month: 9,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    });
    const jd = findSyzygy(start, true);
    expect(lunarEclipseKind(jd)).toBe('total');
  });
});

describe('conjunctions and saros', () => {
  it('finds an Earth-Mars heliocentric conjunction within 800 days of J2000', () => {
    const hits = findConjunctions(solSystem(), 'earth', 'mars', J2000_JD, 800);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('pairs eclipses one saros apart', () => {
    const first = 2_451_545;
    const pairs = sarosPairs([first, first + 10, first + 6585.3211]);
    expect(pairs).toHaveLength(1);
  });
});
