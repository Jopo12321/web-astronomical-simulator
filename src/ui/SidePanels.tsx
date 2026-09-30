import { AU_M, DAY_S, G, L_SUN_W } from '../core/constants';
import { radToDeg } from '../core/math/angles';
import { bodyById } from '../core/model/document';
import type { Body } from '../core/model/schema';
import { MUTUAL_HILL_STABLE, hillRadius, mutualHillSeparation } from '../core/orbits/stability';
import { habitableZone } from '../core/physics/habitable';
import {
  escapeSpeed,
  orbitalPeriodSeconds,
  solarDaySeconds,
  surfaceGravity,
} from '../core/physics/derived';
import { checkHorizons } from '../core/validate/horizons';
import { jdToCalendar } from '../core/time/julian';
import { t } from '../i18n';
import { OptionsPanel } from './OptionsPanel';
import {
  panel,
  selectedId,
  showBelts,
  showLabels,
  showOrbits,
  statusMessage,
  system,
} from './state';
import { useSignal } from '@preact/signals';

function patchBody(id: string, next: Body): void {
  system.value = {
    ...system.value,
    bodies: system.value.bodies.map((body) => (body.id === id ? next : body)),
  };
}

export function SidePanels() {
  const doc = system.value;
  const selected = doc.bodies.find((body) => body.id === selectedId.value) ?? doc.bodies[0];
  return (
    <aside className="panel">
      <div className="tabs">
        {(['layers', 'options', 'tools', 'data', 'validation'] as const).map((name) => (
          <button
            key={name}
            type="button"
            className={panel.value === name ? 'tab active' : 'tab'}
            onClick={() => {
              panel.value = name;
            }}
          >
            {t(name)}
          </button>
        ))}
      </div>
      {panel.value === 'layers' ? <Layers /> : null}
      {panel.value === 'options' ? <OptionsPanel /> : null}
      {panel.value === 'tools' && selected ? <Editor body={selected} onChange={patchBody} /> : null}
      {panel.value === 'data' && selected ? <Data body={selected} /> : null}
      {panel.value === 'validation' ? <Validation /> : null}
      {statusMessage.value ? <p className="status">{statusMessage.value}</p> : null}
    </aside>
  );
}

function Layers() {
  return (
    <div className="stack">
      <label>
        <input
          type="checkbox"
          checked={showOrbits.value}
          onChange={(event) => {
            showOrbits.value = event.currentTarget.checked;
          }}
        />
        {t('orbits')}
      </label>
      <label>
        <input
          type="checkbox"
          checked={showLabels.value}
          onChange={(event) => {
            showLabels.value = event.currentTarget.checked;
          }}
        />
        {t('labels')}
      </label>
      <label>
        <input
          type="checkbox"
          checked={showBelts.value}
          onChange={(event) => {
            showBelts.value = event.currentTarget.checked;
          }}
        />
        {t('belts')}
      </label>
    </div>
  );
}

function Editor({ body, onChange }: { body: Body; onChange: (id: string, next: Body) => void }) {
  const warnings = stabilityNotes(body);
  const orbit = body.orbit;
  return (
    <div className="stack">
      <label>
        Name
        <input
          value={body.name}
          onInput={(event) => onChange(body.id, { ...body, name: event.currentTarget.value })}
        />
      </label>
      <NumberField
        label="Mass (kg)"
        value={body.massKg}
        onChange={(massKg) => onChange(body.id, { ...body, massKg })}
      />
      <NumberField
        label="Radius (km)"
        value={body.radiusM / 1000}
        onChange={(km) => onChange(body.id, { ...body, radiusM: km * 1000 })}
      />
      {orbit ? (
        <>
          <NumberField
            label="Semi-major axis (AU)"
            value={orbit.a / AU_M}
            onChange={(au) => onChange(body.id, { ...body, orbit: { ...orbit, a: au * AU_M } })}
          />
          <NumberField
            label="Eccentricity"
            value={orbit.e}
            onChange={(eccentricity) =>
              onChange(body.id, {
                ...body,
                orbit: { ...orbit, e: Math.min(0.999, Math.max(0, eccentricity)) },
              })
            }
          />
          <NumberField
            label="Inclination (deg)"
            value={radToDeg(orbit.i)}
            onChange={(degrees) =>
              onChange(body.id, {
                ...body,
                orbit: { ...orbit, i: (degrees * Math.PI) / 180 },
              })
            }
          />
        </>
      ) : null}
      {warnings.map((warning) => (
        <p key={warning} className="warn">
          {warning}
        </p>
      ))}
    </div>
  );
}

function stabilityNotes(body: Body): string[] {
  const notes: string[] = [];
  if (!body.orbit || body.parentId === null) return notes;
  const doc = system.value;
  const parent = bodyById(doc, body.parentId);
  const hill = hillRadius(body.orbit.a, body.orbit.e, body.massKg, parent.massKg);
  const moons = doc.bodies.filter((item) => item.parentId === body.id && item.orbit);
  for (const moon of moons) {
    if (moon.orbit && moon.orbit.a > hill) {
      notes.push(`${moon.name} is outside the Hill sphere.`);
    }
  }
  const siblings = doc.bodies.filter(
    (item) => item.parentId === body.parentId && item.id !== body.id && item.orbit,
  );
  for (const sibling of siblings) {
    if (!sibling.orbit) continue;
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

function Data({ body }: { body: Body }) {
  const doc = system.value;
  const rows: Array<[string, string]> = [['Kind', body.kind]];
  if (body.radiusM > 0 && body.massKg > 0) {
    rows.push(['Gravity', `${surfaceGravity(body.massKg, body.radiusM).toFixed(2)} m/s²`]);
    rows.push(['Escape', `${(escapeSpeed(body.massKg, body.radiusM) / 1000).toFixed(2)} km/s`]);
  }
  if (body.orbit && body.parentId) {
    const parent = bodyById(doc, body.parentId);
    const gm = G * (parent.massKg + body.massKg);
    const period = orbitalPeriodSeconds(body.orbit, gm);
    rows.push(['Orbital period', `${(period / DAY_S).toFixed(2)} days`]);
    if (body.rotation) {
      let clock = period;
      if (body.kind === 'moon' && parent.orbit && parent.parentId) {
        const star = bodyById(doc, parent.parentId);
        clock = orbitalPeriodSeconds(parent.orbit, G * (star.massKg + parent.massKg));
      }
      const day = solarDaySeconds(body.rotation.periodS, clock);
      rows.push(['Solar day', `${(Math.abs(day) / 3600).toFixed(2)} h`]);
    }
  }
  if (body.kind === 'star' && body.luminosityW && body.temperatureK) {
    const zone = habitableZone(body.luminosityW, body.temperatureK);
    rows.push(['Habitable inner', `${(zone.innerM / AU_M).toFixed(3)} AU`]);
    rows.push(['Habitable outer', `${(zone.outerM / AU_M).toFixed(3)} AU`]);
    rows.push(['Luminosity', `${(body.luminosityW / L_SUN_W).toFixed(3)} L☉`]);
  }
  const when = jdToCalendar(system.value.epochJd);
  rows.push(['Epoch', `${when.year}-${when.month}-${when.day}`]);
  return (
    <dl className="facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Validation() {
  const results = useSignal<ReturnType<typeof checkHorizons>>([]);
  return (
    <div className="stack">
      <button
        type="button"
        onClick={() => {
          results.value = checkHorizons(system.value);
        }}
      >
        {t('runChecks')}
      </button>
      <p className="hint">
        {results.value.length === 0
          ? 'Compares fitted orbits with JPL Horizons samples.'
          : `${results.value.filter((row) => row.passed).length} / ${results.value.length} passed.`}
      </p>
      <ul className="checks">
        {results.value.map((row) => (
          <li key={row.id} className={row.passed ? 'pass' : 'fail'}>
            {row.passed ? 'Pass' : 'Fail'} {row.id}: {row.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onInput={(event) => {
          const next = Number(event.currentTarget.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </label>
  );
}
