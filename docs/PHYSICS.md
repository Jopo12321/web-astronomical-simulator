# Physics models

The default engine is analytic. Dates are reproducible, and nothing here integrates an n-body trajectory unless you turn that check on later.

## Orbits

Elliptic motion uses Kepler's equation, solved by Newton iteration:

`M = E − e sin E`

Position and velocity in the orbital plane, then a 3-1-3 rotation by argument of periapsis, inclination, and longitude of the ascending node.

Two propagation modes:

- **Two-body.** Mean anomaly advances with `n = √(GM / a³)`, using `GM = G (M_parent + M_body)`. Optional secular rates move the node and the perihelion.
- **Fitted elements.** When a mean-longitude rate `L` is stored (the JPL planetary tables), that rate already contains the mean motion. The app does not add `n` again.

A body with `orbitFrame: "barycenter"` (Earth in the Solar System preset) rides the barycenter of itself and its satellites. The planet is offset from that point by the mass-weighted satellite positions.

## Stability flags

- Hill sphere: `a (1 − e) (m / 3M)^(1/3)`
- Fluid Roche limit: `2.44 R (ρ_primary / ρ_secondary)^(1/3)`
- Mutual Hill spacing. Pairs closer than `2√3` mutual Hill radii are flagged as likely unstable.

## Day length, seasons, and climate

The solar day is `P_rot / (1 − P_rot / P_orbit)`. For a moon, `P_orbit` is the planet's year, because that is how the star moves through the moon's sky.

Equinoxes and solstices are the times when the star's ecliptic longitude of date is 0°, 90°, 180°, or 270°. Longitude of date is the J2000 geometric longitude plus IAU general precession (5028.83″ per century) and one light-time step.

Daily insolation is the Berger (1978) daylight integral. Seasonal temperature is a diffusive energy-balance model in the style of North, Cahalan, and Coakley (1981), with outgoing radiation linearized so Earth's global mean sits near 15 °C.

The habitable zone uses the Kopparapu et al. (2014) runaway-greenhouse and maximum-greenhouse polynomials. Atmosphere retention uses the Zahnle and Catling (2017) shoreline slope, with Mars placed on the line.

Azgaar's map does not read an orbit. It takes three yearly sea-level temperatures: the equator, the north pole, and the south pole. Those are the annual means of the matching bands on the seasonal grid. Rainfall is not calculated. Eclipses are too short to change the yearly means. A tidally locked world, one whose spin period is within 5% of its orbital period, can still use two different pole temperatures.

## Sunlight, tides, and limits

Each line in Data is tagged so a constraint is not mistaken for a story decision.

- **Sunlight, required by the orbit.** Flux at distance `d` is `L / (4 π d²)`. Earth's comparison is the solar luminosity at 1 AU, about 1361 W/m². For a moon, `d` is the planet's distance from the star.
- **Tides, a likely consequence.** The pull across the body is `2 G M R / d³`, divided by the same pull of the Moon on Earth. For a moon, `M` and `d` are the parent planet. The panel reports the stronger of the parent and the largest moon. The number does not fix a culture.
- **Roche limit, required.** `2.44 R (ρ_parent / ρ_body)^(1/3)`, with density from mass and volume. Inside that distance the body cannot hold together.
- **Hill sphere, a limit.** `a (1 − e) (m / 3M)^(1/3)` around the parent. A moon inside it can be kept by the parent. That is not a promise the orbit stays quiet for millions of years.
- **Parent in the sky, a likely consequence.** A moon sees its planet as `2 arcsin(R / d)` degrees wide. The Moon from Earth is about 0.5°.

## Constants

See `src/core/constants.ts` and `docs/DATA_SOURCES.md`. Published values that do not fit in an IEEE-754 number are rounded by the language; the comment keeps the official digits.
