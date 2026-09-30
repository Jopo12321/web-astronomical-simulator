import { GM_SUN } from '../constants';
import { wrapPi } from '../math/angles';
import { lonLatRange } from '../math/vec';
import type { SystemDocument } from '../model/schema';
import { resolveElements, stateFromElements } from '../orbits/elements';
import fixture from '../../../tests/fixtures/horizons-ecliptic.json';

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

export interface CheckResult {
  id: string;
  passed: boolean;
  detail: string;
}

/** Compare JPL-fitted orbits in the document with Horizons samples from 1900 to 2050. */
export function checkHorizons(doc: SystemDocument): CheckResult[] {
  return fixture.samples.map((sample) => {
    const id = sample.body === 'emb' ? 'earth' : sample.body;
    const body = doc.bodies.find((item) => item.id === id);
    const limit = NOMINAL[sample.body as keyof typeof NOMINAL];
    if (!body?.orbit || !limit) {
      return { id: `${id} ${sample.date}`, passed: false, detail: 'Body or orbit missing' };
    }
    const state = stateFromElements(
      resolveElements(body.orbit, doc.epochJd, sample.jd, GM_SUN),
      GM_SUN,
    );
    const predicted = lonLatRange(state.position);
    const reference = lonLatRange([sample.xKm * 1000, sample.yKm * 1000, sample.zKm * 1000]);
    const dLon = Math.abs(wrapPi(predicted.lon - reference.lon)) * (180 / Math.PI) * 3600;
    const dLat = Math.abs(predicted.lat - reference.lat) * (180 / Math.PI) * 3600;
    const dRangeKm = Math.abs(predicted.range - reference.range) / 1000;
    const passed =
      dLon < limit.lon * FACTOR &&
      dLat < limit.lat * FACTOR &&
      dRangeKm < limit.rangeKm * FACTOR;
    return {
      id: `${id} ${sample.date}`,
      passed,
      detail: `Δλ ${dLon.toFixed(0)}″, Δβ ${dLat.toFixed(1)}″, Δr ${dRangeKm.toFixed(0)} km`,
    };
  });
}
