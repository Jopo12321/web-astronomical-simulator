import { AU_M } from '../core/constants';
import type { SystemDocument } from '../core/model/schema';

export function bodiesCsv(doc: SystemDocument): string {
  const header = ['id', 'name', 'kind', 'parent', 'massKg', 'radiusKm', 'semiMajorAu', 'eccentricity'];
  const lines = doc.bodies.map((body) =>
    [
      body.id,
      body.name,
      body.kind,
      body.parentId ?? '',
      body.massKg,
      body.radiusM / 1000,
      body.orbit ? body.orbit.a / AU_M : '',
      body.orbit?.e ?? '',
    ].join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

export function eventsIcs(title: string, events: readonly { name: string; jd: number }[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `X-WR-CALNAME:${title}`];
  for (const event of events) {
    const date = calendarToJdStamp(event.jd);
    lines.push('BEGIN:VEVENT', `SUMMARY:${event.name}`, `DTSTART:${date}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function calendarToJdStamp(jd: number): string {
  const z = Math.floor(jd + 0.5);
  const a = z >= 2299161 ? z + 1 + Math.floor((z - 1867216.25) / 36524.25) - Math.floor(Math.floor((z - 1867216.25) / 36524.25) / 4) : z;
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = Math.floor(b - d - Math.floor(30.6001 * e));
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${year}${pad(month)}${pad(day)}T120000Z`;
}
