import { signal } from '@preact/signals';
import { solSystem } from '../core/presets/sol';
import type { SystemDocument } from '../core/model/schema';

export const system = signal<SystemDocument>(solSystem());
export const viewJd = signal(system.value.epochJd);
export const selectedId = signal(system.value.homeBodyId ?? system.value.bodies[0]?.id ?? '');
export const playing = signal(false);
export const daysPerSecond = signal(20);
export const panel = signal<'layers' | 'options' | 'tools' | 'data' | 'validation'>('data');
export const showOrbits = signal(true);
export const showLabels = signal(true);
export const showBelts = signal(true);
export const statusMessage = signal('');

export function replaceSystem(doc: SystemDocument): void {
  system.value = doc;
  viewJd.value = doc.viewJd ?? doc.epochJd;
  selectedId.value = doc.homeBodyId ?? doc.bodies[0]?.id ?? '';
  statusMessage.value = '';
}
