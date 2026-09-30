import { AU_M, G, GM_SUN } from '../constants';
import { bodyById } from './document';
import type { Body, SystemDocument } from './schema';

const M_EARTH = 5.972e24;

function freshId(doc: SystemDocument, prefix: string): string {
  let n = doc.bodies.length + 1;
  let id = `${prefix}-${n}`;
  while (doc.bodies.some((body) => body.id === id)) {
    n += 1;
    id = `${prefix}-${n}`;
  }
  return id;
}

function nextDistance(doc: SystemDocument, parentId: string, kind: 'planet' | 'moon'): number {
  const parent = bodyById(doc, parentId);
  const farthest = doc.bodies.reduce((max, body) => {
    if (body.parentId !== parentId || !body.orbit) return max;
    return Math.max(max, body.orbit.a);
  }, 0);
  if (kind === 'moon') {
    const floor = Math.max(parent.radiusM * 8, 1_000_000);
    return Math.max(floor, farthest > 0 ? farthest * 1.5 : floor);
  }
  return Math.max(farthest * 1.4, AU_M);
}

export function addOrbitingBody(
  doc: SystemDocument,
  parentId: string,
  kind: 'planet' | 'moon',
): SystemDocument {
  const id = freshId(doc, kind === 'moon' ? 'moon' : 'planet');
  const massKg = kind === 'moon' ? 0.01 * M_EARTH : M_EARTH;
  const radiusM = kind === 'moon' ? 1_000_000 : 6_371_000;
  const body: Body = {
    id,
    name: kind === 'moon' ? 'New moon' : 'New planet',
    kind,
    parentId,
    massKg,
    radiusM,
    color: kind === 'moon' ? '#d0d0d0' : '#8fb7d6',
    orbit: {
      a: nextDistance(doc, parentId, kind),
      e: 0.02,
      i: 0,
      Omega: 0,
      omega: 0,
      M0: 0,
    },
    rotation: { periodS: 86_400, obliquity: 0.4 },
  };
  return { ...doc, bodies: [...doc.bodies, body] };
}

export function deleteBody(
  doc: SystemDocument,
  id: string,
): { doc: SystemDocument; error?: string } {
  const body = doc.bodies.find((item) => item.id === id);
  if (!body) return { doc, error: 'That body is not in the system.' };
  if (body.parentId === null) {
    return { doc, error: 'The star stays. Delete planets and moons instead.' };
  }
  const drop = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of doc.bodies) {
      if (item.parentId && drop.has(item.parentId) && !drop.has(item.id)) {
        drop.add(item.id);
        grew = true;
      }
    }
  }
  const bodies = doc.bodies.filter((item) => !drop.has(item.id));
  const homeBodyId = doc.homeBodyId && drop.has(doc.homeBodyId) ? null : doc.homeBodyId;
  return { doc: { ...doc, bodies, homeBodyId } };
}

export function solarMassKg(): number {
  return GM_SUN / G;
}

export function earthMassKg(): number {
  return M_EARTH;
}
