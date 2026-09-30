import type { Body } from '../core/model/schema';
import { placeSystem } from '../core/orbits/system';
import { selectedId, showBelts, showLabels, showOrbits, system, viewJd } from './state';

function plotRadius(meters: number): number {
  return 18 + Math.log10(Math.max(meters, 1e8) / 1e8) * 42;
}

export function OrbitMap() {
  const doc = system.value;
  const placed = placeSystem(doc, viewJd.value);
  const byId = new Map(placed.map((item) => [item.id, item]));
  const primary = doc.bodies.find((body) => body.parentId === null);
  const children = doc.bodies.filter((body) => body.parentId === primary?.id);

  function point(body: Body): { x: number; y: number } | null {
    const state = byId.get(body.id);
    if (!state) return null;
    const x = state.position[0];
    const y = state.position[1];
    const radius = Math.hypot(x, y);
    if (radius === 0) return { x: 0, y: 0 };
    const scale = plotRadius(radius) / radius;
    return { x: x * scale, y: -y * scale };
  }

  return (
    <svg className="map" viewBox="-280 -280 560 560" role="img" aria-label="Orbit map">
      <circle cx="0" cy="0" r="270" className="map-sky" />
      {primary ? (
        <circle cx="0" cy="0" r="8" fill={primary.color ?? '#ffd27a'}>
          <title>{primary.name}</title>
        </circle>
      ) : null}
      {children.map((body) => {
        const at = point(body);
        if (!at) return null;
        if ((body.kind === 'belt' || body.kind === 'ring') && showBelts.value) {
          const inner = plotRadius(body.innerRadiusM ?? body.orbit?.a ?? 1);
          const outer = plotRadius(body.outerRadiusM ?? body.orbit?.a ?? 1);
          return (
            <circle
              key={body.id}
              cx="0"
              cy="0"
              r={(inner + outer) / 2}
              className="belt"
              strokeWidth={Math.max(2, Math.abs(outer - inner))}
            />
          );
        }
        if (!body.orbit) return null;
        const orbitR = plotRadius(body.orbit.a);
        return (
          <g key={body.id}>
            {showOrbits.value ? <circle cx="0" cy="0" r={orbitR} className="orbit" /> : null}
            <circle
              cx={at.x}
              cy={at.y}
              r={body.id === selectedId.value ? 7 : 4.5}
              fill={body.color ?? '#9ecbff'}
              className="body-dot"
              onClick={() => {
                selectedId.value = body.id;
              }}
            >
              <title>{body.name}</title>
            </circle>
            {showLabels.value ? (
              <text x={at.x + 8} y={at.y - 8} className="label">
                {body.name}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
