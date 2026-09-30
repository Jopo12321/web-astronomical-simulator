export type Vec3 = readonly [number, number, number];

export function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a: Vec3, factor: number): Vec3 {
  return [a[0] * factor, a[1] * factor, a[2] * factor];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function norm(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function unit(a: Vec3): Vec3 {
  const length = norm(a);
  if (length === 0) {
    return [0, 0, 0];
  }
  return scale(a, 1 / length);
}

export function lonLatRange(position: Vec3): { lon: number; lat: number; range: number } {
  const range = norm(position);
  return {
    lon: Math.atan2(position[1], position[0]),
    lat: range === 0 ? 0 : Math.asin(Math.min(1, Math.max(-1, position[2] / range))),
    range,
  };
}
