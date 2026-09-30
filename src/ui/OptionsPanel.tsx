import { buildSolarCalendar } from '../core/calendar/leap';
import { generateSystem } from '../core/generate/system';
import { bodyById } from '../core/model/document';
import type { GeneratorSettings } from '../core/model/schema';
import { yearAndDay } from '../core/physics/home';
import { t } from '../i18n';
import { replaceSystem, system } from './state';

const ARCHITECTURES: GeneratorSettings['architecture'][] = [
  'solar-like',
  'compact',
  'titius-bode',
  'circumbinary',
  'circumstellar',
  'red-dwarf',
  'custom',
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
        {t('refreshCalendar')}
      </button>
      <p className="hint">
        Stores a calendar in the save file. The Almanac builds one on download if this is empty.
      </p>
    </div>
  );
}

function attachCalendar(): void {
  const doc = system.value;
  if (!doc.homeBodyId) return;
  const home = bodyById(doc, doc.homeBodyId);
  const clock = yearAndDay(doc, home);
  if (!clock) return;
  const calendar = buildSolarCalendar(clock.yearSeconds / clock.daySeconds);
  calendar.epochJd = doc.epochJd;
  system.value = { ...doc, calendar };
}
