import { leapfrog, type NBody } from '../core/orbits/nbody';

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ bodies: NBody[]; dt: number; steps: number }>) => void) | null;
  postMessage: (data: { ejected: boolean; maxRadiusRatio: number }) => void;
};

scope.onmessage = (event) => {
  const { bodies, dt, steps } = event.data;
  scope.postMessage(leapfrog(bodies, dt, steps));
};
