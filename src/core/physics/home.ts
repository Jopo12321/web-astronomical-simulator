import { G } from '../constants';
import { bodyById } from '../model/document';
import type { Body, SystemDocument } from '../model/schema';
import { orbitalPeriodSeconds, solarDaySeconds } from './derived';

/** Sidereal year and solar day for a world that orbits something and spins. */
export function yearAndDay(
  doc: SystemDocument,
  body: Body,
): { yearSeconds: number; daySeconds: number } | null {
  if (!body.orbit || !body.rotation || !body.parentId) return null;
  const parent = bodyById(doc, body.parentId);
  let orbit = body.orbit;
  let gm = G * (parent.massKg + body.massKg);
  if (body.kind === 'moon' && parent.orbit && parent.parentId) {
    const star = bodyById(doc, parent.parentId);
    orbit = parent.orbit;
    gm = G * (star.massKg + parent.massKg);
  }
  const yearSeconds = Math.abs(orbitalPeriodSeconds(orbit, gm));
  const daySeconds = Math.abs(solarDaySeconds(body.rotation.periodS, yearSeconds));
  if (!Number.isFinite(yearSeconds) || !Number.isFinite(daySeconds) || daySeconds === 0) return null;
  return { yearSeconds, daySeconds };
}
