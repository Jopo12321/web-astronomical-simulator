import { AU_M, L_SUN_W } from '../constants';

/**
 * Kopparapu et al. 2014 polynomial for stellar flux at a habitable-zone edge,
 * relative to the modern solar constant. Tstar is in kelvin.
 * Coefficients are the runaway-greenhouse and maximum-greenhouse limits.
 */
interface FluxCoeff {
  s: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

const RUNAWAY: FluxCoeff = {
  s: 1.107,
  a: 1.332e-4,
  b: 1.58e-8,
  c: -8.308e-12,
  d: -1.931e-15,
};

const MAXIMUM_GREENHOUSE: FluxCoeff = {
  s: 0.356,
  a: 6.171e-5,
  b: 1.698e-9,
  c: -3.198e-12,
  d: -5.575e-16,
};

function effectiveFlux(coeff: FluxCoeff, stellarTemperatureK: number): number {
  const t = stellarTemperatureK - 5780;
  return coeff.s + coeff.a * t + coeff.b * t ** 2 + coeff.c * t ** 3 + coeff.d * t ** 4;
}

export interface HabitableZone {
  /** Meters from the star. */
  innerM: number;
  outerM: number;
}

export function habitableZone(
  luminosityW: number,
  stellarTemperatureK: number,
): HabitableZone {
  const luminositySun = Math.max(luminosityW, 1) / L_SUN_W;
  const innerFlux = Math.max(0.05, effectiveFlux(RUNAWAY, stellarTemperatureK));
  const outerFlux = Math.max(0.01, effectiveFlux(MAXIMUM_GREENHOUSE, stellarTemperatureK));
  const innerAu = Math.sqrt(luminositySun / innerFlux);
  const outerAu = Math.sqrt(luminositySun / outerFlux);
  return { innerM: innerAu * AU_M, outerM: outerAu * AU_M };
}

/**
 * Simplified cosmic shoreline (Zahnle & Catling 2017): insolation scales as
 * escape speed to the fourth. The constant is set so Mars (5.0 km/s, 0.43 Earth
 * insolation) lies on the line. Above the line, a planet is more able to hold an atmosphere.
 */
export function atmosphereMargin(escapeMps: number, insolationEarthUnits: number): number {
  const marsEscape = 5_000;
  const marsInsolation = 0.43;
  const intercept = Math.log10(marsEscape) - 0.25 * Math.log10(marsInsolation);
  const slope = 0.25 * Math.log10(Math.max(insolationEarthUnits, 1e-6));
  return Math.log10(escapeMps) - (slope + intercept);
}

export function insolationEarthUnits(
  luminosityW: number,
  distanceM: number,
): number {
  const earthFlux = L_SUN_W / (4 * Math.PI * AU_M * AU_M);
  const flux = luminosityW / (4 * Math.PI * distanceM * distanceM);
  return flux / earthFlux;
}
