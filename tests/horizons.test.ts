import { describe, expect, it } from 'vitest';
import { solSystem } from '../src/core/presets/sol';
import { checkHorizons } from '../src/core/validate/horizons';

describe('JPL approximate elements vs Horizons', () => {
  it('keeps every 1900-2050 sample inside 5x the nominal error', () => {
    for (const row of checkHorizons(solSystem())) {
      expect(row.passed, `${row.id} ${row.detail}`).toBe(true);
    }
  });
});
