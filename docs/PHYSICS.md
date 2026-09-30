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

## Constants

See `src/core/constants.ts` and `docs/DATA_SOURCES.md`. Published values that do not fit in an IEEE-754 number are rounded by the language; the comment keeps the official digits.
