# Web Astronomical Simulator

A browser app for designing fantasy star systems and calculating the numbers a world needs: orbits, day length, calendars, seasons, temperatures, and eclipses. The built-in Solar System is checked against NASA, JPL, IAU, and USNO data.

The interface is inspired by [Azgaar's Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator). No code is copied from that project.

**Live app:** https://jopo12321.github.io/web-astronomical-simulator/

## Run it

Open the live site, or download the single-file build from [Releases](https://github.com/Jopo12321/web-astronomical-simulator/releases) and double-click it. Nothing needs to be installed.

## Develop

This repository is built in GitHub Actions (Node.js is not required on the machine that edits the files).

- **GitHub Codespaces** uses the config in `.devcontainer/` and runs in GitHub's cloud.
- **StackBlitz:** [open this repo](https://stackblitz.com/github.com/Jopo12321/web-astronomical-simulator)

If you have Node.js 22 or newer locally:

```sh
npm ci
npm run dev
```

## Layout

- `src/core/` — physics and orbit engine, no browser code
- `src/ui/` — editors and the orbit map
- `src/io/` — save, load, and export
- `tests/` — unit tests and Solar System checks against published data

Models and sources are written up in `docs/PHYSICS.md` and `docs/DATA_SOURCES.md` as those pieces land.
