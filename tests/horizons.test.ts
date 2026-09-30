import { describe, expect, it } from 'vitest';
import { GM_SUN } from '../src/core/constants';
import { wrapPi } from '../src/core/math/angles';
import { lonLatRange } from '../src/core/math/vec';
import { bodyById } from '../src/core/model/document';
import { resolveElements, stateFromElements } from '../src/core/orbits/elements';
import { solSystem } from '../src/core/presets/sol';
import fixture from './fixtures/horizons-ecliptic.json';

/**
 * JPL states these as nominal errors for 1800–2050, not hard maxima.
 * Samples from Horizons on 2026-09-30 stay inside 5× those figures.
 */
const NOMINAL = {
  mercury: { lon: 15, lat: 1, rangeKm: 1_000 },
  venus: { lon: 20, lat: 1, rangeKm: 4_000 },
  emb: { lon: 20, lat: 8, rangeKm: 6_000 },
  mars: { lon: 40, lat: 2, rangeKm: 25_000 },
  jupiter: { lon: 400, lat: 10, rangeKm: 600_000 },
  saturn: { lon: 600, lat: 25, rangeKm: 1_500_000 },
  uranus: { lon: 50, lat: 2, rangeKm: 1_000_000 },
  neptune: { lon: 10, lat: 1, rangeKm: 200_000 },
} as const;

const FACTOR = 5;

describe('JPL approximate elements vs Horizons', () => {
  const sol = solSystem();

  it('keeps every 1900–2050 sample inside 5× the nominal error', () => {
    for (const sample of fixture.samples) {
      const id = sample.body === 'emb' ? 'earth' : sample.body;
      const body = bodyById(sol, id);
      if (!body.orbit) {
        throw new Error(`${id} has no orbit`);
      }
      const state = stateFromElements(
        resolveElements(body.orbit, sol.epochJd, sample.jd, GM_SUN),
        GM_SUN,
      );
      const predicted = lonLatRange(state.position);
      const reference = lonLatRange([sample.xKm * 1000, sample.yKm * 1000, sample.zKm * 1000]);
      const dLon = Math.abs(wrapPi(predicted.lon - reference.lon)) * (180 / Math.PI) * 3600;
      const dLat = Math.abs(predicted.lat - reference.lat) * (180 / Math.PI) * 3600;
      const dRangeKm = Math.abs(predicted.range - reference.range) / 1000;
      const limit = NOMINAL[sample.body as keyof typeof NOMINAL];
      expect(dLon, `${sample.body} ${sample.date} longitude`).toBeLessThan(limit.lon * FACTOR);
      expect(dLat, `${sample.body} ${sample.date} latitude`).toBeLessThan(limit.lat * FACTOR);
      expect(dRangeKm, `${sample.body} ${sample.date} range`).toBeLessThan(limit.rangeKm * FACTOR);
    }
  });
});
