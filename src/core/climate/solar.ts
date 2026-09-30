import { C, DAY_S, J2000_JD } from '../constants';
import { wrapPi, wrapTwoPi } from '../math/angles';
import { norm } from '../math/vec';
import type { OrbitalElements } from '../orbits/elements';
import { resolveElements, stateFromElements, trueAnomaly } from '../orbits/elements';

/** IAU general precession in longitude, arcseconds per Julian century. */
const PRECESSION_ARCSEC_PER_CENTURY = 5028.83;

export interface SolarPosition {
  /** Apparent ecliptic longitude of the star as seen from the planet, radians, equinox of date. */
  longitude: number;
  /** Star-planet distance, meters. */
  distanceM: number;
  /** Declination of the star, radians. */
  declination: number;
}

function planetLongitude(elements: OrbitalElements, epochJd: number, jd: number, gm: number): {
  longitude: number;
  distanceM: number;
} {
  const resolved = resolveElements(elements, epochJd, jd, gm);
  const state = stateFromElements(resolved, gm);
  const trueLon = wrapTwoPi(resolved.Omega + resolved.omega + trueAnomaly(resolved));
  return { longitude: trueLon, distanceM: norm(state.position) };
}

/** One light-time iteration, then precession into the equinox of date. */
export function solarPosition(
  elements: OrbitalElements,
  epochJd: number,
  jd: number,
  gm: number,
  obliquityRad: number,
): SolarPosition {
  const first = planetLongitude(elements, epochJd, jd, gm);
  const lightDays = first.distanceM / C / DAY_S;
  const delayed = planetLongitude(elements, epochJd, jd - lightDays, gm);
  const centuries = (jd - J2000_JD) / 36525;
  const precession = ((PRECESSION_ARCSEC_PER_CENTURY * centuries) / 3600) * (Math.PI / 180);
  const longitude = wrapTwoPi(delayed.longitude + Math.PI + precession);
  const declination = Math.asin(Math.sin(obliquityRad) * Math.sin(longitude));
  return { longitude, distanceM: delayed.distanceM, declination };
}

function crossed(previous: number, next: number, target: number): boolean {
  const travel = wrapTwoPi(next - previous);
  const until = wrapTwoPi(target - previous);
  return until <= travel;
}

/** First time at or after `startJd` when the star's longitude of date equals `target`. */
export function findSolarLongitude(
  elements: OrbitalElements,
  epochJd: number,
  startJd: number,
  target: number,
  gm: number,
  obliquityRad: number,
): number {
  let jd = startJd;
  let previous = solarPosition(elements, epochJd, jd, gm, obliquityRad).longitude;
  for (let step = 0; step < 400; step += 1) {
    const nextJd = jd + 1;
    const next = solarPosition(elements, epochJd, nextJd, gm, obliquityRad).longitude;
    if (crossed(previous, next, target)) {
      let lo = jd;
      let hi = nextJd;
      let lonLo = previous;
      for (let i = 0; i < 50; i += 1) {
        const mid = (lo + hi) / 2;
        const lonMid = solarPosition(elements, epochJd, mid, gm, obliquityRad).longitude;
        if (crossed(lonLo, lonMid, target)) hi = mid;
        else {
          lo = mid;
          lonLo = lonMid;
        }
      }
      return (lo + hi) / 2;
    }
    jd = nextJd;
    previous = next;
  }
  throw new Error('No solar longitude crossing in the next 400 days.');
}

export function findMeanAnomaly(
  elements: OrbitalElements,
  epochJd: number,
  startJd: number,
  target: number,
  gm: number,
): number {
  let jd = startJd;
  let previous = resolveElements(elements, epochJd, jd, gm).M;
  for (let step = 0; step < 40000; step += 1) {
    const nextJd = jd + 1;
    const next = resolveElements(elements, epochJd, nextJd, gm).M;
    const travel = wrapTwoPi(next - previous);
    const until = wrapTwoPi(target - previous);
    if (until <= travel) {
      let lo = jd;
      let hi = nextJd;
      let anomalyLo = previous;
      for (let i = 0; i < 50; i += 1) {
        const mid = (lo + hi) / 2;
        const anomaly = resolveElements(elements, epochJd, mid, gm).M;
        const span = wrapTwoPi(anomaly - anomalyLo);
        const remain = wrapTwoPi(target - anomalyLo);
        if (remain <= span) hi = mid;
        else {
          lo = mid;
          anomalyLo = anomaly;
        }
      }
      return (lo + hi) / 2;
    }
    jd = nextJd;
    previous = next;
  }
  throw new Error('No mean-anomaly crossing found.');
}

/**
 * Hour angle of sunrise and sunset. Altitude of the star's center defaults to
 * −0.833°, which includes the solar semi-diameter and standard refraction.
 * Returns null during polar night, and π during polar day.
 */
export function sunriseHourAngle(
  latitudeRad: number,
  declinationRad: number,
  altitudeRad = (-0.833 * Math.PI) / 180,
): number | null {
  const cosHour =
    (Math.sin(altitudeRad) - Math.sin(latitudeRad) * Math.sin(declinationRad)) /
    (Math.cos(latitudeRad) * Math.cos(declinationRad));
  if (cosHour <= -1) return Math.PI;
  if (cosHour >= 1) return null;
  return Math.acos(cosHour);
}

/** Daylight duration in seconds of clock time, using the local solar day. */
export function daylightSeconds(
  latitudeRad: number,
  declinationRad: number,
  solarDayS: number,
): number {
  const hourAngle = sunriseHourAngle(latitudeRad, declinationRad);
  if (hourAngle === null) return 0;
  return (hourAngle / Math.PI) * solarDayS;
}

export function longitudeError(actual: number, expected: number): number {
  return Math.abs(wrapPi(actual - expected));
}
