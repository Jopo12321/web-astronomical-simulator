import { J2000_JD } from '../constants';
import { wrapTwoPi } from '../math/angles';

/** Meeus chapter 47 lunar terms. Longitude/distance and latitude series. */
const LONGITUDE: readonly (readonly number[])[] = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
];

const LATITUDE: readonly (readonly number[])[] = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
];

function wrapDeg(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export interface MoonPosition {
  longitudeDeg: number;
  latitudeDeg: number;
  distanceKm: number;
}

export function meeusMoon(jd: number): MoonPosition {
  const centuries = (jd - J2000_JD) / 36525;
  const t = centuries;
  const lp =
    218.3164477 +
    481267.88123421 * t -
    0.0015786 * t * t +
    t ** 3 / 538841 -
    t ** 4 / 65194000;
  const d =
    297.8501921 + 445267.1114034 * t - 0.0018819 * t * t + t ** 3 / 545868 - t ** 4 / 113065000;
  const m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t * t + t ** 3 / 24490000;
  const mp =
    134.9633964 + 477198.8675055 * t + 0.0087414 * t * t + t ** 3 / 69699 - t ** 4 / 14712000;
  const f =
    93.272095 + 483202.0175233 * t - 0.0036539 * t * t - t ** 3 / 3526000 + t ** 4 / 863310000;
  const a1 = 119.75 + 131.849 * t;
  const a2 = 53.09 + 479264.29 * t;
  const a3 = 313.45 + 481266.484 * t;
  const eccentricity = 1 - 0.002516 * t - 0.0000074 * t * t;
  let lon = 0;
  let dist = 0;
  let latSum = 0;
  for (const term of LONGITUDE) {
    const arg = ((term[0] * d + term[1] * m + term[2] * mp + term[3] * f) * Math.PI) / 180;
    const scale = eccentricity ** Math.abs(term[1]);
    lon += term[4] * scale * Math.sin(arg);
    dist += term[5] * scale * Math.cos(arg);
  }
  for (const term of LATITUDE) {
    const arg = ((term[0] * d + term[1] * m + term[2] * mp + term[3] * f) * Math.PI) / 180;
    const scale = eccentricity ** Math.abs(term[1]);
    latSum += term[4] * scale * Math.sin(arg);
  }
  const longitude =
    lp +
    lon / 1e6 +
    (3958 * Math.sin((a1 * Math.PI) / 180)) / 1e6 +
    (1962 * Math.sin(((lp - f) * Math.PI) / 180)) / 1e6 +
    (318 * Math.sin((a2 * Math.PI) / 180)) / 1e6;
  const latitude =
    latSum / 1e6 +
    (-2235 * Math.sin((lp * Math.PI) / 180)) / 1e6 +
    (382 * Math.sin((a3 * Math.PI) / 180)) / 1e6 +
    (175 * Math.sin(((a1 - f) * Math.PI) / 180)) / 1e6;
  return {
    longitudeDeg: wrapDeg(longitude),
    latitudeDeg: latitude,
    distanceKm: 385000.56 + dist / 1000,
  };
}

/** Meeus chapter 25 apparent solar longitude, degrees, equinox of date. */
export function meeusSunLongitude(jd: number): number {
  const t = (jd - J2000_JD) / 36525;
  const mean = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const anomaly = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const rad = (anomaly * Math.PI) / 180;
  let center = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(rad);
  center += (0.019993 - 0.000101 * t) * Math.sin(2 * rad);
  center += 0.000289 * Math.sin(3 * rad);
  const omega = 125.04 - 1934.136 * t;
  const apparent = mean + center - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);
  return wrapDeg(apparent);
}

export function sunDistanceKm(jd: number): number {
  const t = (jd - J2000_JD) / 36525;
  const anomaly = ((357.52911 + 35999.05029 * t) * Math.PI) / 180;
  const eccentricity = 0.016708634 - 0.000042037 * t;
  const trueAnomaly = anomaly + 2 * eccentricity * Math.sin(anomaly);
  const radiusAu = (1 - eccentricity ** 2) / (1 + eccentricity * Math.cos(trueAnomaly));
  return radiusAu * 149597870.7;
}

export function illuminatedFraction(jd: number): number {
  const elongation = ((meeusMoon(jd).longitudeDeg - meeusSunLongitude(jd)) * Math.PI) / 180;
  return (1 - Math.cos(elongation)) / 2;
}

function signedElongation(jd: number, full: boolean): number {
  const delta = wrapDeg(meeusMoon(jd).longitudeDeg - meeusSunLongitude(jd));
  const target = full ? 180 : 0;
  return ((delta - target + 180) % 360) - 180;
}

export function findSyzygy(startJd: number, full: boolean): number {
  let jd = startJd;
  let previous = signedElongation(jd, full);
  for (let step = 0; step < 80; step += 1) {
    const next = jd + 0.5;
    const now = signedElongation(next, full);
    if (previous < 0 && now >= 0) {
      let lo = jd;
      let hi = next;
      for (let i = 0; i < 50; i += 1) {
        const mid = (lo + hi) / 2;
        if (signedElongation(mid, full) < 0) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }
    jd = next;
    previous = now;
  }
  throw new Error('No syzygy in the search window.');
}

export type EclipseKind = 'none' | 'partial' | 'annular' | 'total' | 'penumbral';

export function solarEclipseKind(jd: number): EclipseKind {
  const lunar = meeusMoon(jd);
  const separation = Math.abs((lunar.latitudeDeg * Math.PI) / 180);
  const sunDistance = sunDistanceKm(jd);
  const moonRadius = Math.asin(1737.4 / lunar.distanceKm);
  const sunRadius = Math.asin(695700 / sunDistance);
  const parallax = Math.asin(6378.14 / lunar.distanceKm) - Math.asin(6378.14 / sunDistance);
  if (separation >= parallax + sunRadius + moonRadius) return 'none';
  if (separation < parallax - sunRadius + moonRadius) {
    return moonRadius >= sunRadius ? 'total' : 'annular';
  }
  return 'partial';
}

export function lunarEclipseKind(jd: number): EclipseKind {
  const lunar = meeusMoon(jd);
  const separation = Math.abs((lunar.latitudeDeg * Math.PI) / 180);
  const sunDistance = sunDistanceKm(jd);
  const moonRadius = Math.asin(1737.4 / lunar.distanceKm);
  const sunRadius = Math.asin(695700 / sunDistance);
  const moonParallax = Math.asin(6378.14 / lunar.distanceKm);
  const sunParallax = Math.asin(6378.14 / sunDistance);
  const umbra = moonParallax + sunParallax - sunRadius;
  const penumbra = moonParallax + sunParallax + sunRadius;
  if (separation < umbra - moonRadius) return 'total';
  if (separation < umbra + moonRadius) return 'partial';
  if (separation < penumbra + moonRadius) return 'penumbral';
  return 'none';
}

export function longitudeRadians(degrees: number): number {
  return wrapTwoPi((degrees * Math.PI) / 180);
}
