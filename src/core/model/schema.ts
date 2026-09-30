import { z } from 'zod';

export const SCHEMA_VERSION = 1;

export const bodyKindSchema = z.enum(['star', 'planet', 'moon', 'belt', 'ring', 'barycenter']);

export const elementRatesSchema = z.object({
  a: z.number().optional(),
  e: z.number().optional(),
  i: z.number().optional(),
  Omega: z.number().optional(),
  varpi: z.number().optional(),
  L: z.number().optional(),
});

export const orbitalElementsSchema = z.object({
  a: z.number().positive(),
  e: z.number().min(0).max(0.999999),
  i: z.number(),
  Omega: z.number(),
  omega: z.number(),
  M0: z.number(),
  rates: elementRatesSchema.optional(),
});

export const rotationSchema = z.object({
  periodS: z.number(),
  obliquity: z.number(),
  poleRa: z.number().optional(),
  poleDec: z.number().optional(),
  meridian0: z.number().optional(),
});

export const bodySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: bodyKindSchema,
  parentId: z.string().nullable(),
  massKg: z.number().nonnegative(),
  radiusM: z.number().nonnegative(),
  j2: z.number().nonnegative().optional(),
  bondAlbedo: z.number().min(0).max(1).optional(),
  emissivity: z.number().positive().optional(),
  luminosityW: z.number().nonnegative().optional(),
  temperatureK: z.number().positive().optional(),
  color: z.string().optional(),
  orbit: orbitalElementsSchema.optional(),
  orbitFrame: z.enum(['body', 'barycenter']).optional(),
  rotation: rotationSchema.optional(),
  innerRadiusM: z.number().positive().optional(),
  outerRadiusM: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const calendarSchema = z.object({
  type: z.enum(['solar', 'lunar', 'lunisolar']),
  epochJd: z.number(),
  monthNames: z.array(z.string()),
  weekdayNames: z.array(z.string()),
  monthLengths: z.array(z.number().positive()),
  leapEvery: z.number().positive(),
  leapDropEvery: z.number().positive().optional(),
  leapMonthIndex: z.number().nonnegative(),
});

export const generatorSettingsSchema = z.object({
  seed: z.string(),
  architecture: z.enum([
    'solar-like',
    'compact',
    'titius-bode',
    'circumbinary',
    'circumstellar',
    'red-dwarf',
    'custom',
  ]),
  ensureHabitable: z.boolean(),
  habitableMoon: z.boolean().optional(),
  tidalLock: z.boolean().optional(),
  starCount: z.union([z.literal(1), z.literal(2)]),
  locks: z.array(z.string()),
});

export const systemDocumentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  name: z.string().min(1),
  epochJd: z.number(),
  viewJd: z.number().optional(),
  /** Latitude on the home world used when the Almanac talks about eclipses. */
  watchLatitudeDeg: z.number().min(-90).max(90).optional(),
  homeBodyId: z.string().nullable(),
  settings: generatorSettingsSchema,
  bodies: z.array(bodySchema).min(1),
  calendar: calendarSchema.optional(),
  notes: z.string().optional(),
});

export type BodyKind = z.infer<typeof bodyKindSchema>;
export type OrbitalElementsData = z.infer<typeof orbitalElementsSchema>;
export type Body = z.infer<typeof bodySchema>;
export type CalendarSpec = z.infer<typeof calendarSchema>;
export type GeneratorSettings = z.infer<typeof generatorSettingsSchema>;
export type SystemDocument = z.infer<typeof systemDocumentSchema>;
