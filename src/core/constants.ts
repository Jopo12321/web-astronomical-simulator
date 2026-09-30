/**
 * Physical and astronomical constants.
 * Each value names the defining source. Do not "round for convenience" here;
 * derived displays round at the UI boundary.
 */

/** CODATA 2018 Newtonian constant of gravitation, m^3 kg^-1 s^-2. */
export const G = 6.6743e-11;

/** Exact speed of light in vacuum, m/s (SI). */
export const C = 299_792_458;

/** CODATA 2018 Stefan-Boltzmann constant, W m^-2 K^-4. */
export const SIGMA = 5.670374419e-8;

/** Exact Boltzmann constant, J/K (SI 2019). */
export const K_B = 1.380649e-23;

/** IAU 2012 Resolution B2 astronomical unit, m. */
export const AU_M = 149_597_870_700;

/** IAU 2015 Resolution B3 nominal solar radius, m. */
export const R_SUN_M = 6.957e8;

/** IAU 2015 Resolution B3 nominal solar luminosity, W. */
export const L_SUN_W = 3.828e26;

/** IAU 2015 Resolution B3 nominal solar effective temperature, K. */
export const T_SUN_K = 5772;

/**
 * Heliocentric gravitational constant from JPL DE440, m^3 s^-2.
 * Source: https://ssd.jpl.nasa.gov/astro_par.html (Park et al. 2021).
 */
export const GM_SUN = 1.32712440041279419e20;

/** SI day, s. */
export const DAY_S = 86_400;

/** Julian year, days (IAU / explanatory supplement). */
export const JULIAN_YEAR_D = 365.25;

/** Julian century, days. */
export const JULIAN_CENTURY_D = 36_525;

/** J2000.0 epoch, Julian Date (TT/TDB noon). */
export const J2000_JD = 2_451_545.0;

/** Mean obliquity of the ecliptic at J2000, arcseconds (IAU 2006 / JPL). */
export const OBLIQUITY_J2000_ARCSEC = 84_381.406;

/** Earth GM from JPL DE440, m^3 s^-2. */
export const GM_EARTH = 3.98600435507e14;

/** Moon GM from JPL DE440, m^3 s^-2. */
export const GM_MOON = 4.902800118e12;
