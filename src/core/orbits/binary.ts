/** Holman & Wiegert 1999 critical semi-major axis, as a fraction of the binary separation. */
export function circumbinaryCritical(massRatio: number, eccentricity: number): number {
  const mu = massRatio;
  const e = eccentricity;
  return (
    1.6 +
    5.1 * e -
    2.22 * e * e +
    4.12 * mu -
    4.27 * e * mu -
    5.09 * mu * mu +
    4.61 * e * e * mu * mu
  );
}

export function circumstellarCritical(massRatio: number, eccentricity: number): number {
  const mu = massRatio;
  const e = eccentricity;
  return 0.464 - 0.38 * mu - 0.631 * e + 0.586 * mu * e + 0.15 * e * e - 0.198 * mu * e * e;
}
