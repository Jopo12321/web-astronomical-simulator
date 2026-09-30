import { describe, expect, it } from 'vitest';
import { addOrbitingBody, deleteBody } from '../src/core/model/edit';
import { almanacMarkdown } from '../src/io/almanac';
import { solSystem } from '../src/core/presets/sol';

describe('almanac and editing', () => {
  it('writes a calendar and distances without a stored calendar', () => {
    const doc = solSystem();
    const text = almanacMarkdown({ ...doc, calendar: undefined });
    expect(text).not.toContain('No calendar has been generated');
    expect(text).toContain('Primus');
    expect(text).toContain('AU');
    expect(text).toContain('°');
  });

  it('refuses to delete the star and can add a planet', () => {
    const doc = solSystem();
    const refused = deleteBody(doc, 'sun');
    expect(refused.error).toBeTruthy();
    expect(refused.doc.bodies.some((body) => body.id === 'sun')).toBe(true);
    const added = addOrbitingBody(doc, 'sun', 'planet');
    expect(added.bodies.length).toBe(doc.bodies.length + 1);
    const planet = added.bodies[added.bodies.length - 1];
    expect(planet?.orbit?.a).toBeGreaterThan(0);
  });
});
