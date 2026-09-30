import { J2000_JD } from '../constants';

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function isGregorian(year: number, month: number, day: number): boolean {
  if (year > 1582) return true;
  if (year < 1582) return false;
  if (month > 10) return true;
  if (month < 10) return false;
  return day >= 15;
}

/** Calendar date to Julian Date. Time is the simulation clock (TT for the Solar System preset). */
export function calendarToJd(date: CalendarDate): number {
  const fraction = (date.hour + date.minute / 60 + date.second / 3600) / 24;
  let year = date.year;
  let month = date.month;
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const century = Math.floor(year / 100);
  const gregorianShift = isGregorian(date.year, date.month, date.day)
    ? 2 - century + Math.floor(century / 4)
    : 0;
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    date.day +
    fraction +
    gregorianShift -
    1524.5
  );
}

export function jdToCalendar(jd: number): CalendarDate {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const dayFloat = b - d - Math.floor(30.6001 * e) + f;
  const day = Math.floor(dayFloat);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  const hours = (dayFloat - day) * 24;
  const hour = Math.floor(hours);
  const minutes = (hours - hour) * 60;
  const minute = Math.floor(minutes);
  const second = (minutes - minute) * 60;
  return { year, month, day, hour, minute, second };
}

export function centuriesSinceJ2000(jd: number): number {
  return (jd - J2000_JD) / 36525;
}
