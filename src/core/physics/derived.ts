import { DAY_S, G, JULIAN_CENTURY_D } from '../constants';
import { degToRad } from '../math/angles';
import type { OrbitalElements } from '../orbits/elements';
import { periodSeconds } from '../orbits/elements';

export function surfaceGravity(massKg: number, radiusM: number): number {
  return (G * massKg) / radiusM ** 2;
}

export function escapeSpeed(massKg: number, radiusM: number): number {
  return Math.sqrt((2 * G * massKg) / radiusM);
}

export function meanDensity(massKg: number, radiusM: number): number {
  return massKg / ((4 / 3) * Math.PI * radiusM ** 3);
}

/** Sidereal orbital period. Uses the fitted mean-longitude rate when the body has one. */
export function orbitalPeriodSeconds(elements: OrbitalElements, gm: number): number {
  const longitudeRate = elements.rates?.L;
  if (longitudeRate !== undefined && longitudeRate !== 0) {
    const degreesPerCentury = longitudeRate / degToRad(1);
    const days = (360 * JULIAN_CENTURY_D) / degreesPerCentury;
    return days * DAY_S;
  }
  return periodSeconds(gm, elements.a);
}

/**
 * Synodic solar day. Negative when the sun moves west to east (retrograde rotation,
 * as on Venus). The length of the daylight cycle is the absolute value.
 */
export function solarDaySeconds(siderealRotationS: number, orbitalPeriodS: number): number {
  const denominator = 1 - siderealRotationS / orbitalPeriodS;
  if (Math.abs(denominator) < 1e-12) {
    return Number.POSITIVE_INFINITY;
  }
  return siderealRotationS / denominator;
}

/**
 * Main-sequence estimates in solar units. The middle piece passes through the Sun.
 * Mass-luminosity exponents follow the standard broken power law
 * (Duric, Advanced Astrophysics; the Sun is on the 1–2 solar-mass piece).
 */
export function luminositySolar(massSolar: number): number {
  if (massSolar <= 0) return 0;
  if (massSolar < 0.43) return 0.23 * massSolar ** 2.3;
  if (massSolar < 2) return massSolar ** 4;
  if (massSolar < 55) return 1.4 * massSolar ** 3.5;
  return 32_000 * massSolar;
}

export function radiusSolar(massSolar: number): number {
  if (massSolar <= 0) return 0;
  if (massSolar < 1) return massSolar ** 0.8;
  return massSolar ** 0.57;
}

export function effectiveTemperature(luminosityW: number, radiusM: number, sigma: number): number {
  return (luminosityW / (4 * Math.PI * radiusM * radiusM * sigma)) ** 0.25;
}
