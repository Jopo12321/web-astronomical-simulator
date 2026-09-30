import { buildSolarCalendar } from '../core/calendar/leap';
import { G } from '../core/constants';
import { generateSystem } from '../core/generate/system';
import { bodyById } from '../core/model/document';
import type { GeneratorSettings } from '../core/model/schema';
import { orbitalPeriodSeconds, solarDaySeconds } from '../core/physics/derived';
import { t } from '../i18n';
import { replaceSystem, system } from './state';

const ARCHITECTURES: GeneratorSettings['architecture'][] = [
  'solar-like',
  'compact',
  'titius-bode',
  'circumbinary',
  'circumstellar',
  'red-dwarf',
];

export function OptionsPanel() {
  const settings = system.value.settings;
  const update = (patch: Partial<GeneratorSettings>) => {
    system.value = { ...system.value, settings: { ...settings, ...patch } };
  };
  return (
    <div className="stack">
      <label>
        Seed
        <input
          value={settings.seed}
          onInput={(event) => update({ seed: event.currentTarget.value })}
        />
      </label>
      <label>
        Layout
        <select
          value={settings.architecture}
          onChange={(event) =>
            update({ architecture: event.currentTarget.value as GeneratorSettings['architecture'] })
          }
        >
          {ARCHITECTURES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={settings.ensureHabitable}
          onChange={(event) => update({ ensureHabitable: event.currentTarget.checked })}
        />
        Ensure a habitable world
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={settings.habitableMoon === true}
          onChange={(event) => update({ habitableMoon: event.currentTarget.checked })}
        />
        Habitable moon
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={settings.tidalLock === true}
          onChange={(event) => update({ tidalLock: event.currentTarget.checked })}
        />
        Tidally lock the home world
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={settings.locks.includes('star')}
          onChange={(event) =>
            update({ locks: event.currentTarget.checked ? ['star'] : [] })
          }
        />
        Lock the star
      </label>
      <button
        type="button"
        onClick={() => {
          const next = { ...settings };
          if (next.architecture === 'circumbinary' || next.architecture === 'circumstellar') {
            next.starCount = 2;
          }
          replaceSystem(generateSystem(next, system.value));
        }}
      >
        {t('generate')}
      </button>
      <button type="button" onClick={() => attachCalendar()}>
        Build calendar
      </button>
    </div>
  );
}

function attachCalendar(): void {
  const doc = system.value;
  if (!doc.homeBodyId) return;
  const home = bodyById(doc, doc.homeBodyId);
  if (!home.orbit || !home.rotation || !home.parentId) return;
  const parent = bodyById(doc, home.parentId);
  let yearOrbit = home.orbit;
  let gm = G * (parent.massKg + home.massKg);
  if (home.kind === 'moon' && parent.orbit && parent.parentId) {
    const star = bodyById(doc, parent.parentId);
    yearOrbit = parent.orbit;
    gm = G * (star.massKg + parent.massKg);
  }
  const year = orbitalPeriodSeconds(yearOrbit, gm);
  const day = Math.abs(solarDaySeconds(home.rotation.periodS, year));
  const calendar = buildSolarCalendar(year / day);
  calendar.epochJd = doc.epochJd;
  system.value = { ...doc, calendar };
}
