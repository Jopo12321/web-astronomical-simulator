import type { CalendarSpec } from '../model/schema';

interface LeapRule {
  every: number;
  dropEvery?: number;
}

/** Continued-fraction leap rule for a fractional year, denominator at most 400. */
export function leapRule(fraction: number): LeapRule {
  const target = Math.abs(fraction % 1);
  if (target < 1e-6) return { every: 1, dropEvery: 1 };
  let a = 0;
  let b = 1;
  let c = 1;
  let d = 0;
  let value = target;
  for (let i = 0; i < 8; i += 1) {
    const term = Math.floor(value);
    const nextA = term * c + a;
    const nextB = term * d + b;
    if (nextB > 400) break;
    a = c;
    b = d;
    c = nextA;
    d = nextB;
    const remainder = value - term;
    if (remainder < 1e-8) break;
    value = 1 / remainder;
  }
  const every = Math.max(1, d);
  const leaps = c;
  const dropEvery = leaps === 0 ? every : undefined;
  if (leaps === 1) return { every };
  if (dropEvery) return { every, dropEvery };
  return { every: Math.round(every / Math.max(leaps, 1)) };
}

const MONTHS = ['Primus', 'Secundus', 'Tertius', 'Quartus', 'Quintus', 'Sextus', 'Septimus', 'Octavus', 'Nonus', 'Decimus', 'Undecimus', 'Duodecimus'];

export function buildSolarCalendar(daysPerYear: number, monthCount = 12): CalendarSpec {
  const year = Math.max(monthCount, Math.round(daysPerYear));
  const base = Math.floor(year / monthCount);
  const extra = year % monthCount;
  const lengths = Array.from({ length: monthCount }, (_, index) => base + (index < extra ? 1 : 0));
  const fraction = daysPerYear - Math.floor(daysPerYear);
  const leap = leapRule(fraction || (daysPerYear % 1));
  return {
    type: 'solar',
    epochJd: 0,
    monthNames: MONTHS.slice(0, monthCount),
    weekdayNames: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    monthLengths: lengths,
    leapEvery: leap.every,
    leapDropEvery: leap.dropEvery,
    leapMonthIndex: monthCount - 1,
  };
}
