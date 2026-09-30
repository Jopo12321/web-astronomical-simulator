# Web Astronomical Simulator

A browser app for designing fantasy star systems and calculating the numbers a world needs: orbits, day length, calendars, seasons, temperatures, eclipses, sunlight, and tides. The built-in Solar System is checked against NASA, JPL, IAU, and USNO data.

This app was vibe coded via Cursor.

The layout is inspired by [Azgaar's Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator). No code is copied from that project. Azgaar can use three yearly temperatures from this app. It cannot import the orbits.

## Links

- **Live app:** https://jopo12321.github.io/web-astronomical-simulator/
- **User guide:** [docs/GUIDE.md](docs/GUIDE.md)
- **Physics notes:** [docs/PHYSICS.md](docs/PHYSICS.md)
- **Data sources:** [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)
- **Releases:** https://github.com/Jopo12321/web-astronomical-simulator/releases
- **Azgaar's generator:** https://azgaar.github.io/Fantasy-Map-Generator/

## What's in it

- Orbits drawn on a map, with distances, angles, day length, and axial tilt.
- A calendar, eclipse times, and an Almanac you can download.
- Yearly equator and pole temperatures for Azgaar's map. Rainfall is not calculated.
- Sunlight in W/m², tides compared with Earth, the Roche limit, and the Hill sphere.
- Save and load a `.ssim.json` file, or copy a share link.

## Use it

Open the live site. Nothing needs to be installed.

Or download `web-astronomical-simulator.html` from [Releases](https://github.com/Jopo12321/web-astronomical-simulator/releases) and open that file in a browser. GitHub does not run the file from the release page.

The longer walkthrough, with pictures, is the [user guide](docs/GUIDE.md). The **Guide** tab in the app is the short version.

## Develop

This repository is built in GitHub Actions. Node.js is not required on the machine that edits the files.

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
- `docs/` — the user guide, the physics notes, and the data sources
- `tests/` — unit tests and Solar System checks against published data

License: MIT.
