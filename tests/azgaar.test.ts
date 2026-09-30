import { describe, expect, it } from 'vitest';
import { solSystem } from '../src/core/presets/sol';
import { EARTH_SUNLIGHT_WM2, worldBrief } from '../src/core/world/brief';
import { almanacMarkdown } from '../src/io/almanac';

describe('Azgaar temperatures and world forces', () => {
  it('puts sunlight at Earth near 1361 W/m² and tides near one Earth', () => {
    expect(EARTH_SUNLIGHT_WM2).toBeGreaterThan(1300);
    expect(EARTH_SUNLIGHT_WM2).toBeLessThan(1400);
    const earth = solSystem().bodies.find((body) => body.id === 'earth');
    if (!earth) throw new Error('missing earth');
    const brief = worldBrief(solSystem(), earth);
    expect(brief?.lines.find((line) => line.label === 'Sunlight')?.value).toContain('W/m²');
    expect(brief?.lines.find((line) => line.label === 'Tides')?.value).toMatch(/1\.\d+× Earth, from Moon/);
    expect(brief?.azgaar?.text).toContain('Equator:');
    expect(brief?.azgaar?.text).toContain('Precipitation:');
    expect(brief?.azgaar?.equatorC).toBeGreaterThan(brief?.azgaar?.northPoleC ?? 0);
    const moon = solSystem().bodies.find((body) => body.id === 'moon');
    if (!moon) throw new Error('missing moon');
    const moonBrief = worldBrief(solSystem(), moon);
    expect(moonBrief?.lines.find((line) => line.label === 'Parent in the sky')?.value).toContain('°');
    expect(moonBrief?.lines.find((line) => line.label === 'Hill sphere')?.value).toContain('not a promise of stability');
    expect(moonBrief?.azgaar?.tidallyLocked).toBe(true);
  });

  it('writes the Azgaar block into the Almanac', () => {
    const text = almanacMarkdown(solSystem());
    expect(text).toContain('Azgaar');
    expect(text).toContain('W/m²');
    expect(text).toContain('Roche limit');
  });
});
