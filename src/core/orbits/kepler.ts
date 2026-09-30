import { wrapPi, wrapTwoPi } from '../math/angles';

/**
 * Solve Kepler's equation M = E − e sin E for the eccentric anomaly.
 * Elliptic orbits only (e < 1).
 */
export function eccentricAnomaly(meanAnomaly: number, eccentricity: number): number {
  if (eccentricity < 0 || eccentricity >= 1) {
    throw new Error(`Eccentricity must be in [0, 1), got ${eccentricity}`);
  }
  const mean = wrapPi(meanAnomaly);
  if (eccentricity < 1e-12) {
    return wrapTwoPi(meanAnomaly);
  }
  let eccentric = eccentricity < 0.8 ? mean : Math.PI;
  if (eccentricity > 0.8) {
    eccentric = mean + eccentricity * Math.sin(mean);
  }
  for (let i = 0; i < 30; i += 1) {
    const sinE = Math.sin(eccentric);
    const cosE = Math.cos(eccentric);
    const residual = eccentric - eccentricity * sinE - mean;
    const derivative = 1 - eccentricity * cosE;
    const delta = residual / derivative;
    eccentric -= delta;
    if (Math.abs(delta) < 1e-14) {
      break;
    }
  }
  return wrapTwoPi(eccentric);
}

export function meanAnomalyFromEccentric(eccentric: number, eccentricity: number): number {
  return wrapTwoPi(eccentric - eccentricity * Math.sin(eccentric));
}

export function trueAnomalyFromEccentric(eccentric: number, eccentricity: number): number {
  const beta = eccentricity / (1 + Math.sqrt(1 - eccentricity * eccentricity));
  const e = eccentric;
  return wrapTwoPi(e + 2 * Math.atan2(beta * Math.sin(e), 1 - beta * Math.cos(e)));
}
