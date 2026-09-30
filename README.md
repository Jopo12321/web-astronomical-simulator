# Web Astronomical Simulator

A browser app for designing fantasy star systems and calculating the numbers a world needs: orbits, day length, calendars, seasons, temperatures, and eclipses. The built-in Solar System is checked against NASA, JPL, IAU, and USNO data.

The interface is inspired by [Azgaar's Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator). No code is copied from that project.

**Live app:** https://jopo12321.github.io/web-astronomical-simulator/

## Run it

Open the live site, or download the single-file build from [Releases](https://github.com/Jopo12321/web-astronomical-simulator/releases) and double-click it. Nothing needs to be installed.

## Using the app

Open the live site. The **Guide** tab in the side panel explains every button. Short version:

- **Load Solar System** replaces the system on screen with the real Solar System. It asks first. Files you already saved are not deleted.
- **Save** downloads a `.ssim.json` file. **Load**, or dropping that file on the page, opens it again.
- **Play** and **days/s** move the simulation clock.
- **Tools** edits the selected body: distance, mass, orbit angles in degrees, day length, and axial tilt. **Add planet** and **Add moon** create bodies. The star cannot be deleted.
- **Almanac** downloads a readable handout. It builds a calendar for the home world if you have not already, and it lists distances and eclipses. You do not need another button first.
- **CSV** is a spreadsheet of the bodies. **Calendar file** is an `.ics` of the epoch. **Share** copies a link.

The same text is in the Guide tab, which is the place to look while you use the app.

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
