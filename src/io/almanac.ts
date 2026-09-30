import { buildSolarCalendar } from '../core/calendar/leap';
import { meanTemperature, seasonalTemperatures } from '../core/climate/temperature';
import { AU_M, DAY_S } from '../core/constants';
import { norm } from '../core/math/vec';
import { bodyById } from '../core/model/document';
import type { Body, CalendarSpec, SystemDocument } from '../core/model/schema';
import { placeSystem } from '../core/orbits/system';
import { surfaceGravity } from '../core/physics/derived';
import { yearAndDay } from '../core/physics/home';
import { worldBrief } from '../core/world/brief';
import {
  findSyzygy,
  meeusMoon,
  solarEclipseKind,
  type EclipseKind,
} from '../core/sky/meeus';
import { jdToCalendar } from '../core/time/julian';

export function watchLatitude(doc: SystemDocument): number {
  return doc.watchLatitudeDeg ?? 45;
}

/** Calendar for the home world, built from its year and day if the save has none. */
export function withCalendar(doc: SystemDocument): SystemDocument {
  if (doc.calendar || !doc.homeBodyId) return doc;
  const home = doc.bodies.find((body) => body.id === doc.homeBodyId);
  if (!home) return doc;
  const clock = yearAndDay(doc, home);
  if (!clock) return doc;
  const calendar = buildSolarCalendar(clock.yearSeconds / clock.daySeconds);
  calendar.epochJd = doc.epochJd;
  return { ...doc, calendar };
}

export function almanacMarkdown(doc: SystemDocument): string {
  const ready = withCalendar(doc);
  const home = ready.homeBodyId
    ? ready.bodies.find((body) => body.id === ready.homeBodyId)
    : undefined;
  const lines = [
    `# ${ready.name}`,
    '',
    'This Almanac is a readable handout for the star system. Open it in any text editor, or paste it into notes for a story or a game. Distances, the calendar, and eclipses are calculated from the system as it was when you downloaded the file.',
    '',
    '## Home world',
    '',
    home ? homeSection(ready, home) : 'No home world is selected. Pick one in the app, or the first planet is used after you generate a system.',
    '',
    home ? worldSection(ready, home) : '',
    '',
    '## Calendar',
    '',
    calendarSection(ready.calendar),
    '',
    '## Bodies',
    '',
    '| Name | Kind | Orbits | Distance from parent | Distance from star |',
    '| --- | --- | --- | --- | --- |',
    ...ready.bodies.map((body) => bodyRow(ready, body)),
    '',
    '## Eclipses',
    '',
    eclipseSection(ready, home),
    '',
  ];
  return lines.join('\n');
}

function homeSection(doc: SystemDocument, home: Body): string {
  const clock = yearAndDay(doc, home);
  const placed = placeSystem(doc, doc.viewJd ?? doc.epochJd);
  const here = placed.find((item) => item.id === home.id);
  const fromStar = here ? norm(here.position) : home.orbit?.a;
  const parts = [`**${home.name}**`];
  if (fromStar !== undefined) {
    parts.push(`Distance from the star: ${formatDistance(fromStar)}. ${earthCompare(fromStar)}`);
  }
  if (clock) {
    parts.push(
      `Year: ${(clock.yearSeconds / DAY_S).toFixed(2)} Earth days (${(clock.yearSeconds / clock.daySeconds).toFixed(2)} local days).`,
    );
    parts.push(`Solar day: ${(clock.daySeconds / 3600).toFixed(2)} hours.`);
  }
  if (home.radiusM > 0 && home.massKg > 0) {
    parts.push(`Surface gravity: ${surfaceGravity(home.massKg, home.radiusM).toFixed(2)} m/s².`);
  }
  if (home.rotation) {
    parts.push(`Axial tilt: ${((home.rotation.obliquity * 180) / Math.PI).toFixed(2)}°.`);
  }
  const temperature = roughTemperature(doc, home);
  if (temperature !== null) {
    parts.push(
      `A simple climate model puts the global average near ${temperature.toFixed(0)} °C. That is a guide, not a weather forecast.`,
    );
  }
  return parts.join(' ');
}

function roughTemperature(doc: SystemDocument, home: Body): number | null {
  if (!home.orbit || !home.rotation || !home.parentId) return null;
  const parent = bodyById(doc, home.parentId);
  const star = parent.kind === 'star' ? parent : parent.parentId ? bodyById(doc, parent.parentId) : parent;
  if (!star.luminosityW) return null;
  const distance = home.kind === 'moon' && parent.orbit ? parent.orbit.a : home.orbit.a;
  const solarConstant = star.luminosityW / (4 * Math.PI * distance * distance);
  const grid = seasonalTemperatures({
    solarConstant,
    obliquityRad: home.rotation.obliquity,
    eccentricity: (parent.orbit ?? home.orbit).e,
    equinoxTrueAnomaly: 0,
    samples: 8,
  });
  return meanTemperature(grid);
}

function worldSection(doc: SystemDocument, home: Body): string {
  const brief = worldBrief(doc, home);
  if (!brief) return '';
  const facts = brief.lines.map((line) => `- **${line.label}.** ${line.value}`).join('\n');
  const azgaar = brief.azgaar ? `## Azgaar map\n\n${brief.azgaar.text}` : '';
  return `## Sunlight, tides, and limits\n\n${facts}\n\n${azgaar}`;
}

function calendarSection(calendar: CalendarSpec | undefined): string {
  if (!calendar) {
    return 'This world has no spin and orbit to count days from, so there is no calendar. Give the home world a day length and a distance, then download the Almanac again.';
  }
  const lengths = calendar.monthNames
    .map((name, index) => `${name} (${calendar.monthLengths[index] ?? 0} days)`)
    .join(', ');
  const leap =
    calendar.leapDropEvery === calendar.leapEvery
      ? 'The year is a whole number of local days, so no leap day is needed.'
      : `A leap day is added every ${calendar.leapEvery} years, in ${calendar.monthNames[calendar.leapMonthIndex] ?? 'the last month'}.`;
  return [
    `The calendar is solar. Day 1 of ${calendar.monthNames[0] ?? 'the first month'} is the epoch in the save file.`,
    `Months: ${lengths}.`,
    leap,
    'After the last month, the next year starts. The simulation clock at the top of the app is still counted in Earth-style dates; this calendar is the local one.',
  ].join(' ');
}

function bodyRow(doc: SystemDocument, body: Body): string {
  const placed = placeSystem(doc, doc.epochJd);
  const here = placed.find((item) => item.id === body.id);
  const parent = body.parentId ? (doc.bodies.find((item) => item.id === body.parentId)?.name ?? '') : '—';
  const fromParent = here && body.parentId ? formatDistance(norm(here.relativeToParent)) : '—';
  const fromStar = here ? formatDistance(norm(here.position)) : '—';
  return `| ${body.name} | ${body.kind} | ${parent} | ${fromParent} | ${fromStar} |`;
}

function eclipseSection(doc: SystemDocument, home: Body | undefined): string {
  if (!home) return 'Select a home world to list eclipses.';
  const latitude = watchLatitude(doc);
  const moons = doc.bodies.filter((body) => body.parentId === home.id && body.kind === 'moon');
  if (home.id === 'earth' && moons.some((moon) => moon.id === 'moon')) {
    return meeusLines(doc.epochJd, latitude).join('\n\n');
  }
  if (moons.length === 0 && home.kind !== 'moon') {
    return `${home.name} has no moon, so the star is not eclipsed by a moon. You can add one with Add moon.`;
  }
  return sampledLines(doc, home, latitude).join('\n\n');
}

function meeusLines(startJd: number, latitude: number): string[] {
  const lines = [
    `Watched from latitude ${latitude}° on Earth. Separation is how many degrees the Moon's center sits from the Sun's center, as seen from Earth's center.`,
  ];
  let jd = startJd;
  for (let index = 0; index < 4; index += 1) {
    try {
      jd = findSyzygy(jd + 1, false);
    } catch {
      break;
    }
    lines.push(eclipseSentence(jd, solarEclipseKind(jd), Math.abs(meeusMoon(jd).latitudeDeg), latitude));
  }
  return lines;
}

function sampledLines(doc: SystemDocument, home: Body, latitude: number): string[] {
  const lines = [
    `Watched from latitude ${latitude}° on ${home.name}. Separation is how many degrees the moon's center sits from the star's center.`,
  ];
  const moons = doc.bodies.filter((body) => body.parentId === home.id && body.kind === 'moon');
  const occulter = home.kind === 'moon' ? doc.bodies.find((body) => body.id === home.parentId) : moons[0];
  if (!occulter) return lines;
  let previous = separationDegrees(doc, home, occulter, doc.epochJd);
  let best = previous;
  let bestJd = doc.epochJd;
  const found: string[] = [];
  for (let step = 1; step <= 400 && found.length < 4; step += 1) {
    const jd = doc.epochJd + step;
    const now = separationDegrees(doc, home, occulter, jd);
    if (now < best) {
      best = now;
      bestJd = jd;
    }
    if (previous < 2 && now > previous && best < 1.5) {
      const kind: EclipseKind = best < 0.5 ? 'total' : 'partial';
      found.push(eclipseSentence(bestJd, kind, best, latitude));
      best = 180;
    }
    previous = now;
  }
  if (found.length === 0) {
    found.push('No close eclipse turned up in the next 400 days. Try a closer moon, or a lower orbital tilt.');
  }
  return lines.concat(found);
}

function separationDegrees(doc: SystemDocument, home: Body, other: Body, jd: number): number {
  const placed = placeSystem(doc, jd);
  const here = placed.find((item) => item.id === home.id);
  const there = placed.find((item) => item.id === other.id);
  if (!here || !there) return 180;
  const toStar = [-here.position[0], -here.position[1], -here.position[2]] as const;
  const toOther = [
    there.position[0] - here.position[0],
    there.position[1] - here.position[1],
    there.position[2] - here.position[2],
  ] as const;
  const star = norm(toStar);
  const moon = norm(toOther);
  if (star === 0 || moon === 0) return 180;
  const cosine =
    (toStar[0] * toOther[0] + toStar[1] * toOther[1] + toStar[2] * toOther[2]) / (star * moon);
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
}

function eclipseSentence(jd: number, kind: EclipseKind, separationDeg: number, latitude: number): string {
  const date = jdToCalendar(jd);
  const stamp = `${date.year}-${date.month}-${date.day}`;
  const reach = separationDeg < 0.6 ? 65 : 80;
  const visible = kind !== 'none' && Math.abs(latitude) <= reach;
  const view = visible
    ? `From ${latitude}° latitude you can see it if you are near the track.`
    : `From ${latitude}° latitude this one is not in view.`;
  return `${stamp}: ${kind}. The moon is ${separationDeg.toFixed(2)}° from the center of the star. ${view}`;
}

function formatDistance(meters: number): string {
  const au = meters / AU_M;
  if (au >= 0.05) return `${au.toFixed(3)} AU`;
  return `${(meters / 1000).toFixed(0)} km`;
}

function earthCompare(meters: number): string {
  const times = meters / AU_M;
  if (times < 0.01) return '';
  return `That is about ${times.toFixed(2)} times Earth's distance from the Sun.`;
}
