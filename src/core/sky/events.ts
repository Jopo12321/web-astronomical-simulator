import { wrapPi, wrapTwoPi } from '../math/angles';
import { lonLatRange } from '../math/vec';
import type { SystemDocument } from '../model/schema';
import { placeSystem } from '../orbits/system';

export interface Conjunction {
  jd: number;
  bodyA: string;
  bodyB: string;
}

/** Times when two orbiting bodies share an ecliptic longitude, as seen from the primary. */
export function findConjunctions(
  doc: SystemDocument,
  bodyA: string,
  bodyB: string,
  startJd: number,
  days: number,
): Conjunction[] {
  const hits: Conjunction[] = [];
  let previous = separation(doc, bodyA, bodyB, startJd);
  for (let day = 1; day <= days; day += 1) {
    const jd = startJd + day;
    const now = separation(doc, bodyA, bodyB, jd);
    if (previous < 0 && now >= 0) {
      hits.push({ jd: refine(doc, bodyA, bodyB, jd - 1, jd), bodyA, bodyB });
    }
    previous = now;
  }
  return hits;
}

function separation(doc: SystemDocument, bodyA: string, bodyB: string, jd: number): number {
  const placed = placeSystem(doc, jd);
  const a = placed.find((body) => body.id === bodyA);
  const b = placed.find((body) => body.id === bodyB);
  if (!a || !b) throw new Error('Missing body for a conjunction search.');
  const lonA = lonLatRange(a.position).lon;
  const lonB = lonLatRange(b.position).lon;
  return wrapPi(lonA - lonB);
}

function refine(
  doc: SystemDocument,
  bodyA: string,
  bodyB: string,
  lo: number,
  hi: number,
): number {
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (separation(doc, bodyA, bodyB, mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Pairs of eclipses separated by one saros (6585.32 days), within a day. */
export function sarosPairs(timesJd: readonly number[]): Array<[number, number]> {
  const saros = 6585.3211;
  const pairs: Array<[number, number]> = [];
  const sorted = [...timesJd].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const gap = (sorted[j] ?? 0) - (sorted[i] ?? 0);
      if (Math.abs(gap - saros) <= 1) pairs.push([sorted[i] ?? 0, sorted[j] ?? 0]);
      if (gap > saros + 1) break;
    }
  }
  return pairs;
}

export function phaseAngle(longitudeA: number, longitudeB: number): number {
  return Math.abs(wrapTwoPi(longitudeA - longitudeB));
}
