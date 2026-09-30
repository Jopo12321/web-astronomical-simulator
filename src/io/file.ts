import { parseSystemDocument } from '../core/model/document';
import type { SystemDocument } from '../core/model/schema';

export function serializeSystem(doc: SystemDocument): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export function downloadText(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadSystem(doc: SystemDocument): void {
  const safe = doc.name.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'system';
  downloadText(`${safe}.ssim.json`, serializeSystem(doc), 'application/json');
}

export async function readSystemFile(file: File): Promise<SystemDocument> {
  const text = await file.text();
  return parseSystemDocument(JSON.parse(text));
}
