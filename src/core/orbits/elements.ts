import { DAY_S, JULIAN_CENTURY_D } from '../constants';
import { wrapTwoPi } from '../math/angles';
import { type Vec3, cross, dot, norm, unit } from '../math/vec';
import { eccentricAnomaly, trueAnomalyFromEccentric } from './kepler';

/** Secular rates per Julian century. Angles are radians. `L` includes mean motion. */
export interface ElementRates {
  a?: number;
  e?: number;
  i?: number;
  Omega?: number;
  varpi?: number;
  L?: number;
}

export interface OrbitalElements {
  /** Semi-major axis, meters. */
  a: number;
  e: number;
  /** Inclination, radians. */
  i: number;
  /** Longitude of the ascending node, radians. */
  Omega: number;
  /** Argument of periapsis, radians. */
  omega: number;
  /** Mean anomaly at the document epoch, radians. */
  M0: number;
  rates?: ElementRates;
}

export interface ResolvedElements {
  a: number;
  e: number;
  i: number;
  Omega: number;
  omega: number;
  M: number;
}

export interface StateVector {
  position: Vec3;
  velocity: Vec3;
}

export function meanMotion(gm: number, semiMajorAxis: number): number {
  return Math.sqrt(gm / semiMajorAxis ** 3);
}

export function periodSeconds(gm: number, semiMajorAxis: number): number {
  return (Math.PI * 2) / meanMotion(gm, semiMajorAxis);
}

export function resolveElements(
  elements: OrbitalElements,
  epochJd: number,
  jd: number,
  gm: number,
): ResolvedElements {
  const centuries = (jd - epochJd) / JULIAN_CENTURY_D;
  const rates = elements.rates;
  const a = elements.a + (rates?.a ?? 0) * centuries;
  const e = Math.min(0.999999, Math.max(0, elements.e + (rates?.e ?? 0) * centuries));
  const i = elements.i + (rates?.i ?? 0) * centuries;
  const Omega = elements.Omega + (rates?.Omega ?? 0) * centuries;

  if (rates?.L !== undefined) {
    const varpi0 = elements.omega + elements.Omega;
    const meanLongitude0 = elements.M0 + varpi0;
    const varpi = varpi0 + (rates.varpi ?? 0) * centuries;
    const meanLongitude = meanLongitude0 + rates.L * centuries;
    return {
      a,
      e,
      i,
      Omega,
      omega: varpi - Omega,
      M: wrapTwoPi(meanLongitude - varpi),
    };
  }

  const omega = elements.omega + ((rates?.varpi ?? 0) - (rates?.Omega ?? 0)) * centuries;
  const seconds = (jd - epochJd) * DAY_S;
  const motion = meanMotion(gm, a);
  return {
    a,
    e,
    i,
    Omega,
    omega,
    M: wrapTwoPi(elements.M0 + motion * seconds),
  };
}

function rotatePerifocal(
  x: number,
  y: number,
  vx: number,
  vy: number,
  omega: number,
  inclination: number,
  Omega: number,
): StateVector {
  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosi = Math.cos(inclination);
  const sini = Math.sin(inclination);
  const cosw = Math.cos(omega);
  const sinw = Math.sin(omega);
  const px = cosO * cosw - sinO * sinw * cosi;
  const py = sinO * cosw + cosO * sinw * cosi;
  const pz = sinw * sini;
  const qx = -cosO * sinw - sinO * cosw * cosi;
  const qy = -sinO * sinw + cosO * cosw * cosi;
  const qz = cosw * sini;
  return {
    position: [x * px + y * qx, x * py + y * qy, x * pz + y * qz],
    velocity: [vx * px + vy * qx, vx * py + vy * qy, vx * pz + vy * qz],
  };
}

export function stateFromElements(resolved: ResolvedElements, gm: number): StateVector {
  const { a, e, i, Omega, omega, M } = resolved;
  const eccentric = eccentricAnomaly(M, e);
  const cosE = Math.cos(eccentric);
  const sinE = Math.sin(eccentric);
  const p = Math.sqrt(Math.max(0, 1 - e * e));
  const x = a * (cosE - e);
  const y = a * p * sinE;
  const motion = meanMotion(gm, a);
  const denom = 1 - e * cosE;
  const vx = (-motion * a * sinE) / denom;
  const vy = (motion * a * p * cosE) / denom;
  return rotatePerifocal(x, y, vx, vy, omega, i, Omega);
}

function angleFromVectors(reference: Vec3, target: Vec3, hemisphere: number): number {
  const referenceLength = norm(reference);
  const targetLength = norm(target);
  if (referenceLength < 1e-12 || targetLength < 1e-12) {
    return 0;
  }
  const cosine = Math.min(
    1,
    Math.max(-1, dot(reference, target) / (referenceLength * targetLength)),
  );
  const angle = Math.acos(cosine);
  return hemisphere < 0 ? Math.PI * 2 - angle : angle;
}

/** Recover elliptic elements. Mean anomaly is at this instant. */
export function elementsFromState(state: StateVector, gm: number): OrbitalElements {
  const r = state.position;
  const v = state.velocity;
  const radius = norm(r);
  const speed2 = dot(v, v);
  const h = cross(r, v);
  const hNorm = norm(h);
  const k: Vec3 = [0, 0, 1];
  const node = cross(k, h);
  const eccentricityVector = [
    (v[1] * h[2] - v[2] * h[1]) / gm - r[0] / radius,
    (v[2] * h[0] - v[0] * h[2]) / gm - r[1] / radius,
    (v[0] * h[1] - v[1] * h[0]) / gm - r[2] / radius,
  ] as const;
  const e = norm(eccentricityVector);
  const energy = speed2 / 2 - gm / radius;
  const a = -gm / (2 * energy);
  const i = Math.acos(Math.min(1, Math.max(-1, h[2] / hNorm)));
  const Omega = norm(node) < 1e-8 ? 0 : angleFromVectors([1, 0, 0], node, node[1]);
  const omega =
    e < 1e-8 || norm(node) < 1e-8
      ? 0
      : angleFromVectors(node, eccentricityVector, eccentricityVector[2]);
  const periapsis =
    e < 1e-8
      ? norm(node) < 1e-8
        ? ([1, 0, 0] as const)
        : unit(node)
      : unit(eccentricityVector);
  const nu = angleFromVectors(periapsis, r, dot(r, v));
  const cosNu = Math.cos(nu);
  const sinNu = Math.sin(nu);
  const eccentric = Math.atan2(Math.sqrt(1 - e * e) * sinNu, e + cosNu);
  const M0 = wrapTwoPi(eccentric - e * Math.sin(eccentric));
  return { a, e, i, Omega, omega, M0 };
}

export function trueAnomaly(resolved: ResolvedElements): number {
  return trueAnomalyFromEccentric(eccentricAnomaly(resolved.M, resolved.e), resolved.e);
}
