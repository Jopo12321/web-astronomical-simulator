import { AU_M, DAY_S, G, L_SUN_W } from '../core/constants';
import { bodyById } from '../core/model/document';
import type { Body } from '../core/model/schema';
import { habitableZone } from '../core/physics/habitable';
import {
  escapeSpeed,
  orbitalPeriodSeconds,
  solarDaySeconds,
  surfaceGravity,
} from '../core/physics/derived';
import { checkHorizons } from '../core/validate/horizons';
import { worldBrief } from '../core/world/brief';
import { jdToCalendar } from '../core/time/julian';
import { t } from '../i18n';
import { Editor } from './Editor';
import { Guide } from './Guide';
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

export function SidePanels() {
  const doc = system.value;
  const selected = doc.bodies.find((body) => body.id === selectedId.value) ?? doc.bodies[0];
  return (
    <aside className="panel">
      <div className="tabs">
        {(['guide', 'layers', 'options', 'tools', 'data', 'validation'] as const).map((name) => (
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
      {panel.value === 'guide' ? <Guide /> : null}
      {panel.value === 'layers' ? <Layers /> : null}
      {panel.value === 'options' ? <OptionsPanel /> : null}
      {panel.value === 'tools' && selected ? <Editor body={selected} /> : null}
      {panel.value === 'data' && selected ? <Data body={selected} /> : null}
      {panel.value === 'validation' ? <Validation /> : null}
      {statusMessage.value ? <p className="status">{statusMessage.value}</p> : null}
    </aside>
  );
}

function Layers() {
  return (
    <div className="stack">
      <label className="check">
        <input
          type="checkbox"
          checked={showOrbits.value}
          onChange={(event) => {
            showOrbits.value = event.currentTarget.checked;
          }}
        />
        {t('orbits')}
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={showLabels.value}
          onChange={(event) => {
            showLabels.value = event.currentTarget.checked;
          }}
        />
        {t('labels')}
      </label>
      <label className="check">
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
  const brief = worldBrief(doc, body);
  if (brief) {
    for (const line of brief.lines) rows.push([line.label, line.value]);
  }
  const azgaar = body.id === doc.homeBodyId ? (brief?.azgaar ?? null) : null;
  return (
    <div>
      <dl className="facts">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {azgaar ? (
        <div className="stack">
          <p className="hint azgaar-copy">{azgaar.text}</p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(azgaar.copyText).then(() => {
                statusMessage.value = 'Azgaar temperatures copied.';
              });
            }}
          >
            Copy for Azgaar
          </button>
        </div>
      ) : null}
    </div>
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

