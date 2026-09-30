import { seasonalTemperatures, type TemperatureGrid } from '../climate/temperature';
import { AU_M, G, GM_MOON, L_SUN_W } from '../constants';
import { bodyById } from '../model/document';
import type { Body, SystemDocument } from '../model/schema';
import { hillRadius, rocheLimit } from '../orbits/stability';
import { orbitalPeriodSeconds } from '../physics/derived';

/** Flux at Earth's orbit, L☉ / (4 π au²), about 1361 W/m². */
export const EARTH_SUNLIGHT_WM2 = L_SUN_W / (4 * Math.PI * AU_M * AU_M);

const EARTH_RADIUS_M = 6_371_000;
const MOON_DISTANCE_M = 384_400_000;
const MOON_RADIUS_M = 1_737_400;
const EARTH_TIDE = (2 * G * (GM_MOON / G) * EARTH_RADIUS_M) / MOON_DISTANCE_M ** 3;
const MOON_FROM_EARTH_DEG = (2 * Math.asin(MOON_RADIUS_M / MOON_DISTANCE_M) * 180) / Math.PI;

export interface AzgaarTemperatures {
  equatorC: number;
  northPoleC: number;
  southPoleC: number;
  tidallyLocked: boolean;
  text: string;
  copyText: string;
}

export interface WorldLine {
  label: string;
  value: string;
}

export interface WorldBrief {
  azgaar: AzgaarTemperatures | null;
  lines: WorldLine[];
}

const briefCache = new Map<string, WorldBrief | null>();

export function worldBrief(doc: SystemDocument, body: Body): WorldBrief | null {
  const key = `${body.id}|${doc.bodies
    .map(
      (item) =>
        `${item.id},${item.massKg},${item.radiusM},${item.luminosityW ?? 0},${item.orbit?.a ?? 0},${item.orbit?.e ?? 0},${item.rotation?.periodS ?? 0},${item.rotation?.obliquity ?? 0},${item.parentId ?? ''}`,
    )
    .join(';')}`;
  if (briefCache.has(key)) return briefCache.get(key) ?? null;
  const result = computeBrief(doc, body);
  if (briefCache.size > 24) briefCache.clear();
  briefCache.set(key, result);
  return result;
}

function computeBrief(doc: SystemDocument, body: Body): WorldBrief | null {
  const star = illuminatingStar(doc, body);
  const distance = climateDistance(doc, body);
  if (!star?.luminosityW || !distance) return null;
  const sunlight = star.luminosityW / (4 * Math.PI * distance * distance);
  const obliquity = body.rotation?.obliquity ?? 0;
  const eccentricity = orbitEccentricity(doc, body);
  const locked = isTidallyLocked(doc, body);
  const grid = seasonalTemperatures({
    solarConstant: sunlight,
    obliquityRad: obliquity,
    eccentricity,
    equinoxTrueAnomaly: 0,
    samples: 8,
  });
  const azgaar = azgaarTemperatures(grid, locked);
  const lines: WorldLine[] = [
    {
      label: 'Sunlight',
      value: `${sunlight.toFixed(0)} W/m² (${(sunlight / EARTH_SUNLIGHT_WM2).toFixed(2)}× Earth). Required by this orbit.`,
    },
  ];
  const tide = tideLine(doc, body);
  if (tide) lines.push(tide);
  const roche = rocheLine(doc, body);
  if (roche) lines.push(roche);
  const hill = hillLine(doc, body);
  if (hill) lines.push(hill);
  const sky = skyLine(doc, body);
  if (sky) lines.push(sky);
  return { azgaar, lines };
}

export function azgaarTemperatures(grid: TemperatureGrid, tidallyLocked: boolean): AzgaarTemperatures {
  const equatorC = bandMean(grid, 0);
  const northPoleC = bandMean(grid, 90);
  const southPoleC = bandMean(grid, -90);
  const notes = ['Eclipses are too brief to change these yearly averages.'];
  if (tidallyLocked) {
    notes.push('This world is tidally locked. In Azgaar, set the north and south poles separately.');
  }
  const copyText = [
    `Equator: ${equatorC.toFixed(0)} °C`,
    `North pole: ${northPoleC.toFixed(0)} °C`,
    `South pole: ${southPoleC.toFixed(0)} °C`,
  ].join('\n');
  const text = [
    'Azgaar → Configure World → Temperature',
    copyText,
    'Precipitation: choose this in Azgaar. Astronomy does not set rainfall.',
    ...notes,
  ].join('\n');
  return { equatorC, northPoleC, southPoleC, tidallyLocked, text, copyText };
}

function bandMean(grid: TemperatureGrid, target: number): number {
  let index = 0;
  let best = Number.POSITIVE_INFINITY;
  grid.latitudesDeg.forEach((latitude, item) => {
    const gap = Math.abs(latitude - target);
    if (gap < best) {
      best = gap;
      index = item;
    }
  });
  const samples = grid.celsius.map((row) => row[index] ?? 0);
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
}

function illuminatingStar(doc: SystemDocument, body: Body): Body | null {
  if (body.kind === 'star') return body.luminosityW ? body : null;
  let current: Body | undefined = body;
  while (current?.parentId) {
    const parent = bodyById(doc, current.parentId);
    if (parent.kind === 'star') return parent;
    current = parent;
  }
  return doc.bodies.find((item) => item.kind === 'star' && item.luminosityW) ?? null;
}

function climateDistance(doc: SystemDocument, body: Body): number | null {
  if (!body.orbit || !body.parentId) return null;
  const parent = bodyById(doc, body.parentId);
  if (body.kind === 'moon' && parent.orbit) return parent.orbit.a;
  return body.orbit.a;
}

function orbitEccentricity(doc: SystemDocument, body: Body): number {
  if (!body.orbit || !body.parentId) return 0;
  const parent = bodyById(doc, body.parentId);
  return (body.kind === 'moon' ? parent.orbit?.e : body.orbit.e) ?? body.orbit.e;
}

function isTidallyLocked(doc: SystemDocument, body: Body): boolean {
  if (!body.orbit || !body.rotation || !body.parentId) return false;
  const parent = bodyById(doc, body.parentId);
  const period = Math.abs(orbitalPeriodSeconds(body.orbit, G * (parent.massKg + body.massKg)));
  if (period === 0) return false;
  return Math.abs(Math.abs(body.rotation.periodS) / period - 1) < 0.05;
}

function tideAcceleration(massKg: number, radiusM: number, distanceM: number): number {
  return (2 * G * massKg * radiusM) / distanceM ** 3;
}

function tideLine(doc: SystemDocument, body: Body): WorldLine | null {
  if (body.radiusM <= 0) return null;
  let best = 0;
  let source = '';
  if (body.parentId && body.orbit) {
    const parent = bodyById(doc, body.parentId);
    best = tideAcceleration(parent.massKg, body.radiusM, body.orbit.a);
    source = parent.name;
  }
  for (const moon of doc.bodies) {
    if (moon.parentId !== body.id || !moon.orbit || moon.massKg <= 0) continue;
    const pull = tideAcceleration(moon.massKg, body.radiusM, moon.orbit.a);
    if (pull > best) {
      best = pull;
      source = moon.name;
    }
  }
  if (best === 0 || !source) return null;
  const ratio = best / EARTH_TIDE;
  return {
    label: 'Tides',
    value: `${ratio.toFixed(2)}× Earth, from ${source}. Likely consequence of this distance, not a rule for culture.`,
  };
}

function density(body: Body): number | null {
  if (body.radiusM <= 0 || body.massKg <= 0) return null;
  return body.massKg / ((4 / 3) * Math.PI * body.radiusM ** 3);
}

function rocheLine(doc: SystemDocument, body: Body): WorldLine | null {
  if (!body.parentId || !body.orbit) return null;
  const parent = bodyById(doc, body.parentId);
  const parentDensity = density(parent);
  const bodyDensity = density(body);
  if (!parentDensity || !bodyDensity || parent.radiusM <= 0) return null;
  const limit = rocheLimit(parent.radiusM, parentDensity, bodyDensity);
  const inside = body.orbit.a < limit;
  const where = inside
    ? 'This orbit is inside that limit, so the body cannot hold together.'
    : 'This orbit is outside that limit.';
  return {
    label: 'Roche limit',
    value: `${(limit / 1000).toFixed(0)} km from ${parent.name}. Required. ${where}`,
  };
}

function hillLine(doc: SystemDocument, body: Body): WorldLine | null {
  if (!body.parentId || !body.orbit) return null;
  const parent = bodyById(doc, body.parentId);
  if (!parent.orbit || !parent.parentId) return null;
  const star = bodyById(doc, parent.parentId);
  const sphere = hillRadius(parent.orbit.a, parent.orbit.e, parent.massKg, star.massKg);
  const inside = body.orbit.a < sphere;
  return {
    label: 'Hill sphere',
    value: `${(sphere / 1000).toFixed(0)} km around ${parent.name}. This orbit is ${inside ? 'inside' : 'outside'} it. A limit, not a promise of stability for millions of years.`,
  };
}

function skyLine(doc: SystemDocument, body: Body): WorldLine | null {
  if (body.kind !== 'moon' || !body.parentId || !body.orbit || body.orbit.a <= 0) return null;
  const parent = bodyById(doc, body.parentId);
  if (parent.radiusM <= 0) return null;
  const width = (2 * Math.asin(Math.min(1, parent.radiusM / body.orbit.a)) * 180) / Math.PI;
  const times = width / MOON_FROM_EARTH_DEG;
  return {
    label: 'Parent in the sky',
    value: `${parent.name} looks ${width.toFixed(1)}° wide, about ${times.toFixed(0)}× the Moon from Earth. Likely consequence of this orbit.`,
  };
}
