import { effect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { solSystem } from '../core/presets/sol';
import { jdToCalendar } from '../core/time/julian';
import { almanacMarkdown, bodiesCsv } from '../io/export';
import { downloadSystem, downloadText, readSystemFile } from '../io/file';
import { decodeShare, encodeShare } from '../io/share';
import { loadSlot, saveSlot } from '../io/storage';
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
    const hash = location.hash.startsWith('#s=') ? location.hash.slice(3) : '';
    if (hash) {
      void decodeShare(hash).then(replaceSystem).catch(() => {
        statusMessage.value = t('loadError');
      });
    } else {
      void loadSlot('autosave')
        .then((doc) => {
          if (doc) replaceSystem(doc);
        })
        .catch(() => undefined);
    }
    let timer = 0;
    const stop = effect(() => {
      const doc = system.value;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void saveSlot('autosave', doc);
      }, 800);
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('dragover', onDrag);
      window.removeEventListener('drop', onDrop);
      stop();
      window.clearTimeout(timer);
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
          <button
            type="button"
            onClick={() => downloadText('bodies.csv', bodiesCsv(system.value), 'text/csv')}
          >
            {t('csv')}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText('almanac.md', almanacMarkdown(system.value), 'text/markdown')
            }
          >
            {t('almanac')}
          </button>
          <button
            type="button"
            onClick={() => {
              void encodeShare({ ...system.value, viewJd: viewJd.value }).then((hash) => {
                const url = `${location.origin}${location.pathname}#s=${hash}`;
                void navigator.clipboard.writeText(url).then(() => {
                  statusMessage.value = url;
                });
              });
            }}
          >
            {t('share')}
          </button>
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
