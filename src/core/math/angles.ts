export const DEG = Math.PI / 180;
export const ARCSEC = DEG / 3600;

export function degToRad(degrees: number): number {
  return degrees * DEG;
}

export function radToDeg(radians: number): number {
  return radians / DEG;
}

/** Wrap into [0, 2π). */
export function wrapTwoPi(radians: number): number {
  const turn = Math.PI * 2;
  const wrapped = radians % turn;
  return wrapped < 0 ? wrapped + turn : wrapped;
}

/** Wrap into (-π, π]. */
export function wrapPi(radians: number): number {
  const wrapped = wrapTwoPi(radians);
  return wrapped > Math.PI ? wrapped - Math.PI * 2 : wrapped;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
