import { en, type MessageKey } from './en';

const catalogs = { en };
export type Locale = keyof typeof catalogs;

let locale: Locale = 'en';

export function setLocale(next: Locale): void {
  locale = next;
}

export function t(key: MessageKey): string {
  return catalogs[locale][key];
}
