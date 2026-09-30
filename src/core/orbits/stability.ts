/** Hill radius around a secondary of mass `secondaryKg` orbiting `primaryKg`. */
export function hillRadius(
  semiMajorAxis: number,
  eccentricity: number,
  secondaryKg: number,
  primaryKg: number,
): number {
  return semiMajorAxis * (1 - eccentricity) * Math.cbrt(secondaryKg / (3 * primaryKg));
}

/** Fluid Roche limit, meters. */
export function rocheLimit(
  primaryRadius: number,
  primaryDensity: number,
  secondaryDensity: number,
): number {
  return 2.44 * primaryRadius * Math.cbrt(primaryDensity / secondaryDensity);
}

/** Separation of two orbits in mutual Hill radii. Below ~2√3 ≈ 3.46 is a rough instability flag. */
export function mutualHillSeparation(
  a1: number,
  a2: number,
  m1: number,
  m2: number,
  primaryKg: number,
): number {
  const meanA = (a1 + a2) / 2;
  const hill = meanA * Math.cbrt((m1 + m2) / (3 * primaryKg));
  return Math.abs(a2 - a1) / hill;
}

export const MUTUAL_HILL_STABLE = 2 * Math.sqrt(3);
