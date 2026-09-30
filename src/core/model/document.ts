import { systemDocumentSchema, type SystemDocument } from './schema';

export type { Body, CalendarSpec, GeneratorSettings, SystemDocument } from './schema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Future schema versions get a function here. Version 1 is the first public shape. */
export function migrateSystemDocument(input: unknown): unknown {
  if (!isRecord(input)) {
    return input;
  }
  const version = input.schemaVersion;
  if (typeof version === 'number' && version > 1) {
    throw new Error(`This file uses schema version ${version}, which this app cannot open.`);
  }
  if (version === undefined) {
    return { ...input, schemaVersion: 1 };
  }
  return input;
}

export function parseSystemDocument(input: unknown): SystemDocument {
  const migrated = migrateSystemDocument(input);
  const parsed = systemDocumentSchema.safeParse(migrated);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid system file. ${details}`);
  }
  const ids = new Set<string>();
  for (const body of parsed.data.bodies) {
    if (ids.has(body.id)) {
      throw new Error(`Duplicate body id ${body.id}`);
    }
    ids.add(body.id);
  }
  for (const body of parsed.data.bodies) {
    if (body.parentId !== null && !ids.has(body.parentId)) {
      throw new Error(`${body.name} points at a missing parent ${body.parentId}`);
    }
  }
  const roots = parsed.data.bodies.filter((body) => body.parentId === null);
  if (roots.length === 0) {
    throw new Error('The system needs a primary body with no parent.');
  }
  return parsed.data;
}

export function bodyById(doc: SystemDocument, id: string): SystemDocument['bodies'][number] {
  const body = doc.bodies.find((item) => item.id === id);
  if (!body) {
    throw new Error(`Unknown body ${id}`);
  }
  return body;
}
