import type { ComponentChildren } from 'preact';
import { AU_M } from '../core/constants';
import { degToRad, radToDeg } from '../core/math/angles';
import { norm } from '../core/math/vec';
import { bodyById } from '../core/model/document';
import { addOrbitingBody, deleteBody, earthMassKg, solarMassKg } from '../core/model/edit';
import type { Body, OrbitalElementsData } from '../core/model/schema';
import { placeSystem } from '../core/orbits/system';
import { MUTUAL_HILL_STABLE, hillRadius, mutualHillSeparation } from '../core/orbits/stability';
import { selectedId, statusMessage, system, viewJd } from './state';

export function Editor({ body }: { body: Body }) {
  const doc = system.value;
  const orbit = body.orbit;
  const star = body.kind === 'star';
  const moon = body.kind === 'moon';
  const massUnit = star ? body.massKg / solarMassKg() : body.massKg / earthMassKg();
  const here = placeSystem(doc, viewJd.value).find((item) => item.id === body.id);
  const nowMeters = here ? norm(body.parentId ? here.relativeToParent : here.position) : undefined;

  function commit(next: Body): void {
    system.value = {
      ...system.value,
      bodies: system.value.bodies.map((item) => (item.id === body.id ? next : item)),
    };
  }

  function commitOrbit(patch: Partial<OrbitalElementsData>): void {
    if (!orbit) return;
    commit({ ...body, orbit: { ...orbit, ...patch } });
  }

  return (
    <div className="stack">
      <Field label="Name" hint="The name shown in the list and on the map.">
        <input
          value={body.name}
          onInput={(event) => commit({ ...body, name: event.currentTarget.value })}
        />
      </Field>
      <Field
        label={star ? 'Mass (solar)' : 'Mass (Earths)'}
        hint={star ? '1 is the Sun.' : '1 is Earth. The Moon is about 0.012.'}
      >
        <input
          type="number"
          value={round(massUnit)}
          onInput={(event) => {
            const next = Number(event.currentTarget.value);
            if (!Number.isFinite(next) || next < 0) return;
            commit({ ...body, massKg: next * (star ? solarMassKg() : earthMassKg()) });
          }}
        />
      </Field>
      <Field label="Radius (km)" hint="Half the diameter. Earth's is 6371 km.">
        <input
          type="number"
          value={round(body.radiusM / 1000)}
          onInput={(event) => {
            const km = Number(event.currentTarget.value);
            if (Number.isFinite(km) && km >= 0) commit({ ...body, radiusM: km * 1000 });
          }}
        />
      </Field>
      {orbit ? (
        <>
          <Field
            label={moon ? 'Orbit distance (km)' : 'Orbit distance (AU)'}
            hint={distanceHint(moon, nowMeters)}
          >
            <input
              type="number"
              value={moon ? round(orbit.a / 1000) : round(orbit.a / AU_M)}
              onInput={(event) => {
                const next = Number(event.currentTarget.value);
                if (!Number.isFinite(next) || next <= 0) return;
                commitOrbit({ a: moon ? next * 1000 : next * AU_M });
              }}
            />
          </Field>
          <Field label="Eccentricity" hint="0 is a circle. Earth's is about 0.017.">
            <input
              type="number"
              value={round(orbit.e)}
              onInput={(event) => {
                const eccentricity = Number(event.currentTarget.value);
                if (!Number.isFinite(eccentricity)) return;
                commitOrbit({ e: Math.min(0.999, Math.max(0, eccentricity)) });
              }}
            />
          </Field>
          <AngleField
            label="Inclination (°)"
            hint="Tilt of the orbit. 0 stays in the reference plane."
            radians={orbit.i}
            onChange={(i) => commitOrbit({ i })}
          />
          <AngleField
            label="Ascending node (°)"
            hint="Where the orbit crosses the reference plane, going north."
            radians={orbit.Omega}
            onChange={(Omega) => commitOrbit({ Omega })}
          />
          <AngleField
            label="Periapsis (°)"
            hint="Direction of the closest point, measured from the node."
            radians={orbit.omega}
            onChange={(omega) => commitOrbit({ omega })}
          />
          <AngleField
            label="Start position (°)"
            hint="Mean anomaly: where the body is at the start date. 0 is the closest point."
            radians={orbit.M0}
            onChange={(M0) => commitOrbit({ M0 })}
          />
        </>
      ) : null}
      <Field label="Day length (hours)" hint="One sunrise to the next, if the body spins.">
        <input
          type="number"
          value={round((body.rotation?.periodS ?? 86_400) / 3600)}
          onInput={(event) => {
            const hours = Number(event.currentTarget.value);
            if (!Number.isFinite(hours)) return;
            commit({
              ...body,
              rotation: {
                periodS: hours * 3600,
                obliquity: body.rotation?.obliquity ?? 0.4,
              },
            });
          }}
        />
      </Field>
      <AngleField
        label="Axial tilt (°)"
        hint="Lean of the spin axis. Earth's is about 23.4°. This sets the seasons."
        radians={body.rotation?.obliquity ?? 0.4}
        onChange={(obliquity) =>
          commit({
            ...body,
            rotation: { periodS: body.rotation?.periodS ?? 86_400, obliquity },
          })
        }
      />
      {body.id === doc.homeBodyId ? (
        <Field
          label="Watch latitude (°)"
          hint="Where you stand when the Almanac says whether an eclipse is in view."
        >
          <input
            type="number"
            value={doc.watchLatitudeDeg ?? 45}
            onInput={(event) => {
              const latitude = Number(event.currentTarget.value);
              if (!Number.isFinite(latitude)) return;
              system.value = {
                ...system.value,
                watchLatitudeDeg: Math.min(90, Math.max(-90, latitude)),
              };
            }}
          />
        </Field>
      ) : null}
      {stabilityNotes(body).map((warning) => (
        <p key={warning} className="warn">
          {warning}
        </p>
      ))}
      <div className="row-buttons">
        <button type="button" onClick={() => addPlanet()}>
          Add planet
        </button>
        <button type="button" onClick={() => addMoon(body)}>
          Add moon
        </button>
        <button type="button" onClick={() => remove(body.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function addPlanet(): void {
  const star = system.value.bodies.find((body) => body.parentId === null);
  if (!star) return;
  const next = addOrbitingBody(system.value, star.id, 'planet');
  system.value = next;
  selectedId.value = next.bodies[next.bodies.length - 1]?.id ?? selectedId.value;
}

function addMoon(body: Body): void {
  const blocked = body.kind === 'star' || body.kind === 'belt' || body.kind === 'ring';
  const parentId = blocked ? null : body.kind === 'moon' ? body.parentId : body.id;
  if (!parentId) {
    statusMessage.value = 'Select a planet before adding a moon.';
    return;
  }
  const next = addOrbitingBody(system.value, parentId, 'moon');
  system.value = next;
  selectedId.value = next.bodies[next.bodies.length - 1]?.id ?? selectedId.value;
}

function remove(id: string): void {
  const result = deleteBody(system.value, id);
  if (result.error) {
    statusMessage.value = result.error;
    return;
  }
  system.value = result.doc;
  if (selectedId.value === id) {
    selectedId.value = result.doc.homeBodyId ?? result.doc.bodies[0]?.id ?? '';
  }
}

function distanceHint(moon: boolean, nowMeters: number | undefined): string {
  if (nowMeters === undefined) {
    return moon ? 'Average distance from the planet.' : 'Average distance from the star. 1 AU is Earth.';
  }
  const au = nowMeters / AU_M;
  const now = moon
    ? `Right now: ${(nowMeters / 1000).toFixed(0)} km.`
    : `Right now: ${au.toFixed(3)} AU, about ${au.toFixed(2)} times Earth's distance from the Sun.`;
  return now;
}

function stabilityNotes(body: Body): string[] {
  const notes: string[] = [];
  if (!body.orbit || body.parentId === null) return notes;
  const doc = system.value;
  const parent = bodyById(doc, body.parentId);
  const hill = hillRadius(body.orbit.a, body.orbit.e, body.massKg, parent.massKg);
  for (const moon of doc.bodies) {
    if (moon.parentId === body.id && moon.orbit && moon.orbit.a > hill) {
      notes.push(`${moon.name} is outside the Hill sphere.`);
    }
  }
  for (const sibling of doc.bodies) {
    if (sibling.parentId !== body.parentId || sibling.id === body.id || !sibling.orbit) continue;
    const spacing = mutualHillSeparation(
      body.orbit.a,
      sibling.orbit.a,
      body.massKg,
      sibling.massKg,
      parent.massKg,
    );
    if (spacing < MUTUAL_HILL_STABLE) {
      notes.push(`${body.name} and ${sibling.name} are closer than a stable Hill spacing.`);
    }
  }
  return notes;
}

function AngleField({
  label,
  hint,
  radians,
  onChange,
}: {
  label: string;
  hint: string;
  radians: number;
  onChange: (radians: number) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        value={round(radToDeg(radians))}
        onInput={(event) => {
          const degrees = Number(event.currentTarget.value);
          if (Number.isFinite(degrees)) onChange(degToRad(degrees));
        }}
      />
    </Field>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ComponentChildren;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      {children}
      <span className="help">{hint}</span>
    </div>
  );
}

function round(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 1e6) / 1e6;
}
