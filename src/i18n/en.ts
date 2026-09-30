export const en = {
  appTitle: 'Web Astronomical Simulator',
  tagline: 'Fantasy star systems, calculated',
  save: 'Save',
  load: 'Load',
  solarSystem: 'Load Solar System',
  guide: 'Guide',
  refreshCalendar: 'Refresh calendar in the save file',
  layers: 'Layers',
  tools: 'Tools',
  data: 'Data',
  validation: 'Validation',
  options: 'Options',
  generate: 'New system',
  share: 'Share',
  csv: 'CSV',
  almanac: 'Almanac',
  ics: 'Calendar file',
  play: 'Play',
  pause: 'Pause',
  bodies: 'Bodies',
  runChecks: 'Run Solar System checks',
  dropToLoad: 'Drop a .ssim.json file to load it',
  loadError: 'That file could not be read as a system.',
  orbits: 'Orbits',
  labels: 'Labels',
  belts: 'Belts and rings',
  guideLead:
    'This app designs a star system and calculates the dates, distances, day length, seasons, and eclipses a story needs. The clock at the top is the simulation date, not the date on your computer.',
  guideButtonsTitle: 'Buttons',
  guideLoadSolar:
    'replaces the system on screen with the real Solar System. It asks first if you have something else open. Your save files on disk are not deleted.',
  guideSave: 'downloads a .ssim.json file. Load, or drop that file on the page, opens it again.',
  guideLoad: 'opens a .ssim.json file from your computer.',
  guideCsv: 'downloads a spreadsheet of every body: mass, radius, and distance.',
  guideAlmanac:
    'downloads a readable handout. It builds a calendar for the home world if you have not already, and it lists distances and eclipses. You do not need to press Refresh calendar first.',
  guideIcs: 'downloads a calendar file with the epoch date, for a calendar app.',
  guideShare: 'copies a link that reopens this system.',
  guidePlay:
    'moves the simulation clock forward. days/s is how many simulated days pass each real second.',
  guideSetupTitle: 'Setting up a world',
  guideSetup:
    'Pick a body in the list, then open Tools. Add planet puts a new world around the star, outside the outermost one. Add moon puts a moon around the body you have selected. Delete removes that body and its moons. The star cannot be deleted.',
  guideUnitsTitle: 'Numbers',
  guideUnits:
    'AU is the distance from Earth to the Sun. Planet masses are in Earth masses, and the star is in solar masses. Orbit angles are in degrees: inclination is the tilt of the orbit, the node is where the orbit crosses the reference plane, periapsis is the closest point, and mean anomaly is where the body sits at the start date. Axial tilt is the lean of the spin axis. Watch latitude is the latitude you stand at when the Almanac talks about eclipses. Eclipse separation is how many degrees the moon sits from the center of the star.',
  guideDistance:
    'Under the orbit distance, Tools also shows how far the body is right now, and how that compares with Earth.',
  guideAzgaarTitle: 'Azgaar’s map',
  guideAzgaar:
    'Azgaar’s map uses only three temperatures: equator, north pole, and south pole. Data and the Almanac give those for the home world, and Copy for Azgaar puts them on the clipboard. Rainfall is not astronomy, so precipitation stays a choice in Azgaar. Day length, tides, eclipses, and how big the giant looks are for the story, not for the map generator.',
  guideDocsTitle: 'Written notes',
  guideDocsLead: 'The same notes are on GitHub, with pictures in the user guide.',
  guideDocsGuide: 'User guide',
  guideDocsPhysics: 'Physics notes',
  guideDocsSources: 'Data sources',
} as const;

export type MessageKey = keyof typeof en;
