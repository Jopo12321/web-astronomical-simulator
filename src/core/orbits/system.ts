import { G } from '../constants';
import { type Vec3, add, scale, sub } from '../math/vec';
import { type SystemDocument, bodyById } from '../model/document';
import type { Body } from '../model/schema';
import { resolveElements, stateFromElements, type StateVector } from './elements';

export interface PlacedBody {
  id: string;
  position: Vec3;
  velocity: Vec3;
  relativeToParent: Vec3;
}

function zero(): StateVector {
  return { position: [0, 0, 0], velocity: [0, 0, 0] };
}

function isMarker(body: Body): boolean {
  return body.kind === 'belt' || body.kind === 'ring';
}

/** Positions in meters, relative to the system barycenter of the root bodies. */
export function placeSystem(doc: SystemDocument, jd: number): PlacedBody[] {
  const children = new Map<string, Body[]>();
  for (const body of doc.bodies) {
    if (body.parentId === null) continue;
    const list = children.get(body.parentId) ?? [];
    list.push(body);
    children.set(body.parentId, list);
  }

  const placed = new Map<string, PlacedBody>();

  function orbitState(parent: Body, child: Body): StateVector {
    if (!child.orbit) {
      throw new Error(`${child.name} has no orbit.`);
    }
    const gm = G * (parent.massKg + child.massKg);
    return stateFromElements(resolveElements(child.orbit, doc.epochJd, jd, gm), gm);
  }

  function placeChildren(parent: Body, parentPosition: Vec3, parentVelocity: Vec3): void {
    const satellites = children.get(parent.id) ?? [];
    const relatives = new Map<string, StateVector>();
    for (const child of satellites) {
      relatives.set(child.id, isMarker(child) ? zero() : orbitState(parent, child));
    }

    let origin = parentPosition;
    let originVelocity = parentVelocity;
    if (parent.orbitFrame === 'barycenter' && satellites.length > 0) {
      let mass = parent.massKg;
      let moment: Vec3 = [0, 0, 0];
      let momentVelocity: Vec3 = [0, 0, 0];
      for (const child of satellites) {
        if (isMarker(child)) continue;
        const relative = relatives.get(child.id) ?? zero();
        mass += child.massKg;
        moment = add(moment, scale(relative.position, child.massKg));
        momentVelocity = add(momentVelocity, scale(relative.velocity, child.massKg));
      }
      const shift = scale(moment, 1 / mass);
      const shiftVelocity = scale(momentVelocity, 1 / mass);
      origin = sub(parentPosition, shift);
      originVelocity = sub(parentVelocity, shiftVelocity);
      const current = placed.get(parent.id);
      if (current) {
        placed.set(parent.id, {
          ...current,
          position: origin,
          velocity: originVelocity,
          relativeToParent: sub(current.relativeToParent, shift),
        });
      }
    }

    for (const child of satellites) {
      const relative = relatives.get(child.id) ?? zero();
      const position = add(origin, relative.position);
      const velocity = add(originVelocity, relative.velocity);
      placed.set(child.id, {
        id: child.id,
        position,
        velocity,
        relativeToParent: relative.position,
      });
      placeChildren(child, position, velocity);
    }
  }

  for (const body of doc.bodies) {
    if (body.parentId !== null) continue;
    placed.set(body.id, {
      id: body.id,
      position: [0, 0, 0],
      velocity: [0, 0, 0],
      relativeToParent: [0, 0, 0],
    });
    placeChildren(body, [0, 0, 0], [0, 0, 0]);
  }

  return doc.bodies.map((body) => {
    const state = placed.get(body.id);
    if (!state) {
      throw new Error(`${body.name} was not placed.`);
    }
    return state;
  });
}

export function placedById(states: readonly PlacedBody[], id: string): PlacedBody {
  const state = states.find((item) => item.id === id);
  if (!state) {
    throw new Error(`No position for ${id}`);
  }
  return state;
}

export function parentGm(doc: SystemDocument, body: Body): number {
  if (body.parentId === null) {
    return G * body.massKg;
  }
  const parent = bodyById(doc, body.parentId);
  return G * (parent.massKg + body.massKg);
}
