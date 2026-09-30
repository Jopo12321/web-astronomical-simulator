import { useEffect, useRef } from 'preact/hooks';
import { solSystem } from '../core/presets/sol';
import { jdToCalendar } from '../core/time/julian';
import { downloadSystem, readSystemFile } from '../io/file';
import { t } from '../i18n';
import { OrbitMap } from './OrbitMap';
import { SidePanels } from './SidePanels';
import {
  daysPerSecond,
  playing,
  replaceSystem,
  selectedId,
  statusMessage,
  system,
  viewJd,
} from './state';

export function App() {
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (playing.value) {
        viewJd.value += ((now - last) / 1000) * daysPerSecond.value;
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const onDrag = (event: DragEvent) => {
      event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer?.files[0];
      if (file) void loadFile(file);
    };
    window.addEventListener('dragover', onDrag);
    window.addEventListener('drop', onDrop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('dragover', onDrag);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const date = jdToCalendar(viewJd.value);
  const stamp = [
    `${date.year}-${pad(date.month)}-${pad(date.day)}`,
    `${pad(date.hour)}:${pad(date.minute)}`,
  ].join(' ');

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1>{t('appTitle')}</h1>
          <p>{system.value.name}</p>
        </div>
        <div className="toolbar">
          <button type="button" onClick={() => replaceSystem(solSystem())}>
            {t('solarSystem')}
          </button>
          <button
            type="button"
            onClick={() => downloadSystem({ ...system.value, viewJd: viewJd.value })}
          >
            {t('save')}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            {t('load')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void loadFile(file);
              event.currentTarget.value = '';
            }}
          />
          <span className="clock">{stamp}</span>
          <button
            type="button"
            onClick={() => {
              playing.value = !playing.value;
            }}
          >
            {playing.value ? t('pause') : t('play')}
          </button>
          <label className="speed">
            days/s
            <input
              type="number"
              min="0"
              value={daysPerSecond.value}
              onInput={(event) => {
                daysPerSecond.value = Number(event.currentTarget.value) || 0;
              }}
            />
          </label>
        </div>
      </header>
      <div className="workspace">
        <nav className="tree" aria-label={t('bodies')}>
          {system.value.bodies.map((body) => (
            <button
              key={body.id}
              type="button"
              className={body.id === selectedId.value ? 'node selected' : 'node'}
              style={{ paddingLeft: `${12 + depth(body.parentId) * 14}px` }}
              onClick={() => {
                selectedId.value = body.id;
              }}
            >
              {body.name}
            </button>
          ))}
        </nav>
        <OrbitMap />
        <SidePanels />
      </div>
    </div>
  );
}

function depth(parentId: string | null): number {
  let steps = 0;
  let current = parentId;
  const bodies = system.value.bodies;
  while (current) {
    steps += 1;
    current = bodies.find((body) => body.id === current)?.parentId ?? null;
  }
  return steps;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

async function loadFile(file: File): Promise<void> {
  try {
    replaceSystem(await readSystemFile(file));
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : t('loadError');
  }
}
