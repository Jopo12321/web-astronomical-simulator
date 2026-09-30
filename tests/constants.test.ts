import { describe, expect, it } from 'vitest';
import { AU_M, GM_SUN, J2000_JD } from '../src/core/constants';

describe('constants', () => {
  it('uses the IAU 2012 astronomical unit', () => {
    expect(AU_M).toBe(149_597_870_700);
  });

  it('uses the JPL DE440 solar GM', () => {
    expect(GM_SUN / 1e20).toBeCloseTo(1.3271244, 5);
  });

  it('places J2000 at JD 2451545.0', () => {
    expect(J2000_JD).toBe(2_451_545);
  });
});
