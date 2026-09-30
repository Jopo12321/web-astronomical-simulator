/**
 * Spin-axis precession from the star and any moons.
 * Solar torque follows the standard (3/2) n²/ω (C−A)/C cos ε formula.
 * Each moon adds a factor (m_moon/m_star) (a_planet/a_moon)³.
 * For Earth this is the reason the cycle is ~26,000 years rather than the
 * much longer Sun-only cycle.
 */
export function axialPrecessionSeconds(input: {
  orbitalPeriodS: number;
  rotationPeriodS: number;
  eccentricity: number;
  obliquityRad: number;
  dynamicalEllipticity: number;
  starMassKg: number;
  planetSemiMajorM: number;
  moons: readonly { massKg: number; semiMajorM: number }[];
}): number {
  const cosObliquity = Math.cos(input.obliquityRad);
  if (Math.abs(input.rotationPeriodS) < 1 || Math.abs(cosObliquity) < 1e-4) {
    return Number.POSITIVE_INFINITY;
  }
  const meanMotion = (Math.PI * 2) / input.orbitalPeriodS;
  const spin = (Math.PI * 2) / input.rotationPeriodS;
  let moonFactor = 1;
  const starTerm = input.starMassKg / input.planetSemiMajorM ** 3;
  for (const moon of input.moons) {
    moonFactor += moon.massKg / moon.semiMajorM ** 3 / starTerm;
  }
  const eccentricityFactor = (1 - input.eccentricity ** 2) ** 1.5;
  const rate =
    (1.5 * (meanMotion ** 2 / spin) * input.dynamicalEllipticity * cosObliquity * moonFactor) /
    eccentricityFactor;
  return Math.abs((Math.PI * 2) / rate);
}
