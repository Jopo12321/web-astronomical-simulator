import { parseSystemDocument } from '../core/model/document';
import type { SystemDocument } from '../core/model/schema';

export function serializeSystem(doc: SystemDocument): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export function downloadSystem(doc: SystemDocument): void {
  const blob = new Blob([serializeSystem(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safe = doc.name.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'system';
  link.href = url;
  link.download = `${safe}.ssim.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readSystemFile(file: File): Promise<SystemDocument> {
  const text = await file.text();
  return parseSystemDocument(JSON.parse(text));
}
