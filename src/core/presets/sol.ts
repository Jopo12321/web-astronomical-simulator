import { AU_M, G, GM_EARTH, GM_MOON, GM_SUN, J2000_JD } from '../constants';
import { degToRad } from '../math/angles';
import { parseSystemDocument } from '../model/document';
import type { Body, OrbitalElementsData, SystemDocument } from '../model/schema';

/** GM values from JPL DE440, m^3 s^-2. https://ssd.jpl.nasa.gov/astro_par.html */
const GM = {
  mercury: 2.2031868551e13,
  venus: 3.24858592e14,
  mars: 4.2828375816e13,
  jupiter: 1.267127641e17,
  saturn: 3.79405848418e16,
  uranus: 5.7945564e15,
  neptune: 6.83652710058e15,
  pluto: 9.755e11,
} as const;

interface ElementRow {
  id: string;
  name: string;
  gm: number;
  radiusM: number;
  rotationH: number;
  obliquityDeg: number;
  color: string;
  a: number;
  e: number;
  i: number;
  L: number;
  w: number;
  O: number;
  da: number;
  de: number;
  di: number;
  dL: number;
  dw: number;
  dO: number;
}

/**
 * JPL Keplerian elements, Table 1 (1800–2050).
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * Radii and rotation: NASA Planetary Fact Sheet, 18 March 2025.
 */
const PLANETS: ElementRow[] = [
  row(
    'mercury',
    'Mercury',
    GM.mercury,
    4879,
    1407.6,
    0.034,
    '#b5b5b5',
    0.38709927,
    0.20563593,
    7.00497902,
    252.2503235,
    77.45779628,
    48.33076593,
    0.00000037,
    0.00001906,
    -0.00594749,
    149472.67411175,
    0.16047689,
    -0.12534081,
  ),
  row(
    'venus',
    'Venus',
    GM.venus,
    12104,
    -5832.5,
    177.4,
    '#e6c07b',
    0.72333566,
    0.00677672,
    3.39467605,
    181.9790995,
    131.60246718,
    76.67984255,
    0.0000039,
    -0.00004107,
    -0.0007889,
    58517.81538729,
    0.00268329,
    -0.27769418,
  ),
  row(
    'earth',
    'Earth',
    GM_EARTH,
    12756,
    23.9,
    23.4,
    '#4f86c6',
    1.00000261,
    0.01671123,
    -0.00001531,
    100.46457166,
    102.93768193,
    0,
    0.00000562,
    -0.00004392,
    -0.01294668,
    35999.37244981,
    0.32327364,
    0,
  ),
  row(
    'mars',
    'Mars',
    GM.mars,
    6792,
    24.6,
    25.2,
    '#c1440e',
    1.52371034,
    0.0933941,
    1.84969142,
    -4.55343205,
    -23.94362959,
    49.55953891,
    0.00001847,
    0.00007882,
    -0.00813131,
    19140.30268499,
    0.44441088,
    -0.29257343,
  ),
  row(
    'jupiter',
    'Jupiter',
    GM.jupiter,
    142984,
    9.9,
    3.1,
    '#d8c39a',
    5.202887,
    0.04838624,
    1.30439695,
    34.39644051,
    14.72847983,
    100.47390909,
    -0.00011607,
    -0.00013253,
    -0.00183714,
    3034.74612775,
    0.21252668,
    0.20469106,
  ),
  row(
    'saturn',
    'Saturn',
    GM.saturn,
    120536,
    10.7,
    26.7,
    '#e6d3a1',
    9.53667594,
    0.05386179,
    2.48599187,
    49.95424423,
    92.59887831,
    113.66242448,
    -0.0012506,
    -0.00050991,
    0.00193609,
    1222.49362201,
    -0.41897216,
    -0.28867794,
  ),
  row(
    'uranus',
    'Uranus',
    GM.uranus,
    51118,
    -17.2,
    97.8,
    '#7fdbda',
    19.18916464,
    0.04725744,
    0.77263783,
    313.23810451,
    170.9542763,
    74.01692503,
    -0.00196176,
    -0.00004397,
    -0.00242939,
    428.48202785,
    0.40805281,
    0.04240589,
  ),
  row(
    'neptune',
    'Neptune',
    GM.neptune,
    49528,
    16.1,
    28.3,
    '#3d5aef',
    30.06992276,
    0.00859048,
    1.77004347,
    -55.12002969,
    44.96476227,
    131.78422574,
    0.00026291,
    0.00005105,
    0.00035372,
    218.45945325,
    -0.32241464,
    -0.00508664,
  ),
];

function row(
  id: string,
  name: string,
  gm: number,
  diameterKm: number,
  rotationH: number,
  obliquityDeg: number,
  color: string,
  a: number,
  e: number,
  i: number,
  L: number,
  w: number,
  O: number,
  da: number,
  de: number,
  di: number,
  dL: number,
  dw: number,
  dO: number,
): ElementRow {
  return {
    id,
    name,
    gm,
    radiusM: (diameterKm * 1000) / 2,
    rotationH,
    obliquityDeg,
    color,
    a,
    e,
    i,
    L,
    w,
    O,
    da,
    de,
    di,
    dL,
    dw,
    dO,
  };
}

function orbitOf(item: ElementRow): OrbitalElementsData {
  return {
    a: item.a * AU_M,
    e: item.e,
    i: degToRad(item.i),
    Omega: degToRad(item.O),
    omega: degToRad(item.w - item.O),
    M0: degToRad(item.L - item.w),
    rates: {
      a: item.da * AU_M,
      e: item.de,
      i: degToRad(item.di),
      Omega: degToRad(item.dO),
      varpi: degToRad(item.dw),
      L: degToRad(item.dL),
    },
  };
}

function planetBody(item: ElementRow): Body {
  return {
    id: item.id,
    name: item.name,
    kind: 'planet',
    parentId: 'sun',
    massKg: item.gm / G,
    radiusM: item.radiusM,
    color: item.color,
    orbit: orbitOf(item),
    orbitFrame: item.id === 'earth' ? 'barycenter' : 'body',
    rotation: {
      periodS: item.rotationH * 3600,
      obliquity: degToRad(item.obliquityDeg),
    },
  };
}

/** The real Solar System, used as the reference world. */
export function solSystem(): SystemDocument {
  const sun: Body = {
    id: 'sun',
    name: 'Sun',
    kind: 'star',
    parentId: null,
    massKg: GM_SUN / G,
    radiusM: 6.957e8,
    luminosityW: 3.828e26,
    temperatureK: 5772,
    color: '#ffd27a',
  };
  const moon: Body = {
    id: 'moon',
    name: 'Moon',
    kind: 'moon',
    parentId: 'earth',
    massKg: GM_MOON / G,
    radiusM: (3475 * 1000) / 2,
    color: '#d0d0d0',
    bondAlbedo: 0.11,
    orbit: {
      a: 384_400_000,
      e: 0.0549,
      i: degToRad(5.145),
      Omega: 0,
      omega: 0,
      M0: 0,
    },
    rotation: { periodS: 655.7 * 3600, obliquity: degToRad(6.7) },
  };
  const pluto: Body = {
    id: 'pluto',
    name: 'Pluto',
    kind: 'planet',
    parentId: 'sun',
    massKg: GM.pluto / G,
    radiusM: (2376 * 1000) / 2,
    color: '#c9b7a7',
    orbit: {
      a: 5_906_400_000_000,
      e: 0.244,
      i: degToRad(17.2),
      Omega: degToRad(110.3),
      omega: degToRad(113.8),
      M0: 0,
    },
    rotation: { periodS: -153.3 * 3600, obliquity: degToRad(119.5) },
  };
  const belt: Body = {
    id: 'asteroids',
    name: 'Asteroid belt',
    kind: 'belt',
    parentId: 'sun',
    massKg: 0,
    radiusM: 0,
    innerRadiusM: 2.2 * AU_M,
    outerRadiusM: 3.2 * AU_M,
  };
  const rings: Body = {
    id: 'saturn-rings',
    name: 'Saturn rings',
    kind: 'ring',
    parentId: 'saturn',
    massKg: 0,
    radiusM: 0,
    innerRadiusM: 66_900_000,
    outerRadiusM: 140_220_000,
  };
  return parseSystemDocument({
    schemaVersion: 1,
    name: 'Solar System',
    epochJd: J2000_JD,
    homeBodyId: 'earth',
    settings: {
      seed: 'sol',
      architecture: 'custom',
      ensureHabitable: true,
      starCount: 1,
      locks: [],
    },
    notes: [
      'Reference system. Planetary orbits are the JPL 1800-2050 element fit.',
      'The Earth orbit is the Earth-Moon barycenter.',
    ].join(' '),
    bodies: [sun, ...PLANETS.map(planetBody), moon, pluto, belt, rings],
  });
}
