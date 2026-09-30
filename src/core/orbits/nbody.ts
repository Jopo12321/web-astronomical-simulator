import { G } from '../constants';
import { add, norm, scale, sub, type Vec3 } from '../math/vec';

export interface NBody {
  massKg: number;
  position: Vec3;
  velocity: Vec3;
}

function acceleration(bodies: readonly NBody[], index: number): Vec3 {
  let ax = 0;
  let ay = 0;
  let az = 0;
  const origin = bodies[index]?.position ?? [0, 0, 0];
  for (let other = 0; other < bodies.length; other += 1) {
    if (other === index) continue;
    const body = bodies[other];
    if (!body) continue;
    const delta = sub(body.position, origin);
    const distance = norm(delta);
    const softened = Math.max(distance, 1);
    const factor = (G * body.massKg) / softened ** 3;
    ax += delta[0] * factor;
    ay += delta[1] * factor;
    az += delta[2] * factor;
  }
  return [ax, ay, az];
}

/** Velocity Verlet. Returns whether any body ran away from the first. */
export function leapfrog(input: readonly NBody[], dt: number, steps: number): {
  ejected: boolean;
  maxRadiusRatio: number;
} {
  const bodies: NBody[] = input.map((body) => ({
    massKg: body.massKg,
    position: [body.position[0], body.position[1], body.position[2]],
    velocity: [body.velocity[0], body.velocity[1], body.velocity[2]],
  }));
  const initial = bodies.map((body) => norm(sub(body.position, bodies[0]?.position ?? [0, 0, 0])));
  let accel = bodies.map((_, index) => acceleration(bodies, index));
  let maxRatio = 1;
  for (let step = 0; step < steps; step += 1) {
    for (let index = 0; index < bodies.length; index += 1) {
      const body = bodies[index];
      const a = accel[index] ?? [0, 0, 0];
      if (!body) continue;
      body.position = add(add(body.position, scale(body.velocity, dt)), scale(a, 0.5 * dt * dt));
    }
    const next = bodies.map((_, index) => acceleration(bodies, index));
    for (let index = 0; index < bodies.length; index += 1) {
      const body = bodies[index];
      if (!body) continue;
      const a0 = accel[index] ?? [0, 0, 0];
      const a1 = next[index] ?? [0, 0, 0];
      body.velocity = add(body.velocity, scale(add(a0, a1), 0.5 * dt));
    }
    accel = next;
    for (let index = 1; index < bodies.length; index += 1) {
      const radius = norm(sub(bodies[index]?.position ?? [0, 0, 0], bodies[0]?.position ?? [0, 0, 0]));
      const start = initial[index] ?? radius;
      if (start > 0) maxRatio = Math.max(maxRatio, radius / start);
    }
  }
  return { ejected: maxRatio > 5, maxRadiusRatio: maxRatio };
}
