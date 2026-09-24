/**
 * Wind & Rain — every number the design doc names, in one place.
 * Costs and supply are the doc's section 21 table verbatim. Combat stats are the
 * doc's section 14 relationships turned into numbers (prototype constants).
 */
export const MAP = { size: 180, half: 90, cell: 2 };   // metres; grid is 90 x 90

export const TEAM = { PLAYER: 0, RIVAL: 1, NEUTRAL: 2 };
export const TEAM_COLOR = [0xc0282d, 0x2d62b8, 0x6f8f3a];
export const TEAM_HEX_IN_ASSETS = 0xc0282d;

export const START = { wind: 50, rain: 0, supply: 10, supplyPerKhata: 8, supplyMax: 60 };

export const WIND_PER_VIETRA = 1;   // per second
export const RAIN_PER_ZHERCA = 1;   // per second
export const SHRINE_SLOTS = 3;
export const DANCE_RADIUS = 18;     // a Vietra must be this close to a friendly Grod to dance
export const INTERRUPT_S = 4;       // combat interrupts a ritual for this long

/**
 * kind: 'econ' | 'mil' | 'beast' | 'spirit'
 * range in metres (melee ~2), cd = seconds between attacks, sight in metres
 */
/** unit heights are ~1.45x life size, the early-2000s RTS convention, so units read next to buildings */
export const UNITS = {
  vietra:   { name: 'Vietra',     title: 'Wind Priestess',  asset: 'vietra',    wind: 50,  rain: 0,  supply: 1, time: 12, hp: 60,   dmg: 3,  cd: 1.5, range: 1.4, speed: 3.4, sight: 12, kind: 'econ',  radius: 0.59, height: 3.04,  key: 'V' },
  zherca:   { name: 'Zherca',     title: 'Rain Priest',     asset: 'zherca',    wind: 50,  rain: 0,  supply: 1, time: 14, hp: 70,   dmg: 4,  cd: 1.5, range: 1.4, speed: 3.2, sight: 12, kind: 'econ',  radius: 0.59, height: 2.7, key: 'Z' },
  streletz: { name: 'Streletz',   title: 'Archer',          asset: 'streletz',  wind: 50,  rain: 0,  supply: 1, time: 11, hp: 85,   dmg: 10, cd: 1.35, range: 13, speed: 3.6, sight: 16, kind: 'mil',   radius: 0.59, height: 2.83, key: 'S', ranged: true, vsBuilding: 0.35 },
  vitez:    { name: 'Vitez',      title: 'Heavy Warrior',   asset: 'vitez',     wind: 100, rain: 25, supply: 2, time: 18, hp: 280,  dmg: 21, cd: 1.6, range: 2.0, speed: 2.9, sight: 13, kind: 'mil',   radius: 0.85, height: 3.16, key: 'X' },
  deer:     { name: 'Deer Rider', title: 'Scout / Raider',  asset: 'deer_rider',wind: 50,  rain: 50, supply: 1, time: 16, hp: 140,  dmg: 12, cd: 1.1, range: 2.4, speed: 7.2, sight: 24, kind: 'mil',   radius: 1.17,  height: 5.44,  key: 'D', vsEcon: 2.2 },
  bear:     { name: 'Bear',       title: 'Heavy Beast',     asset: 'bear',      wind: 100, rain: 0,  supply: 2, time: 22, hp: 440,  dmg: 26, cd: 1.9, range: 2.6, speed: 2.5, sight: 13, kind: 'beast', radius: 1.43,  height: 2.46,  key: 'B', vsBuilding: 3 },
  spirit:   { name: 'Forest Spirit', title: 'Guardian of the Clearing', asset: 'forest_spirit', wind: 0, rain: 0, supply: 0, time: 0, hp: 1500, dmg: 48, cd: 2.4, range: 3.6, speed: 2.2, sight: 15, kind: 'spirit', radius: 1.82, height: 7.38 },
};

/** size = footprint in metres (square), used for the path grid and selection. */
export const BUILDINGS = {
  grod:   { name: 'Grod',         title: 'Settlement',      asset: 'grod',          wind: 300, rain: 0,  time: 45, hp: 2200, size: 11, height: 9,   sight: 18, trains: ['vietra', 'zherca'], key: 'G', builtBy: ['vietra'] },
  khata:  { name: 'Khata',        title: '+8 Supply',       asset: 'khata',         wind: 100, rain: 0,  time: 20, hp: 420,  size: 5,  height: 5,   sight: 9,  trains: [], key: 'K', builtBy: ['vietra'], supply: 8 },
  warhall:{ name: 'War Hall',     title: 'Military',        asset: 'war_hall',      wind: 150, rain: 0,  time: 30, hp: 750,  size: 9,  height: 7,   sight: 12, trains: ['streletz', 'vitez', 'deer'], key: 'W', builtBy: ['vietra'] },
  shrine: { name: 'Rain Shrine',  title: 'Gathers Rain',    asset: 'rain_shrine',   wind: 75,  rain: 0,  time: 16, hp: 380,  size: 5,  height: 4.5, sight: 10, trains: [], key: 'R', builtBy: ['zherca'], atSpring: true },
  grove:  { name: 'Sacred Grove', title: 'Beasts',          asset: 'sacred_grove',  wind: 150, rain: 50, time: 30, hp: 650,  size: 9,  height: 7,   sight: 12, trains: ['bear'], key: 'O', builtBy: ['zherca'] },
};

/** The Sacred Valley. North is -Z. Player southwest, rival northeast. */
export const LAYOUT = {
  playerGrod: [-60, 60],
  rivalGrod: [60, -60],
  springs: [[-40, 71], [22, 18], [71, -36]],   // near player, exposed centre-east, near rival
  clearing: [-4, -4],                          // the Forest Spirit's clearing
  idol: [-58, -52],                            // the mysterious landmark on a hill
};

export const OBJECTIVES = [
  { id: 'wind100',  text: 'Gather 100 Wind' },
  { id: 'khata',    text: 'Build a Khata' },
  { id: 'warhall',  text: 'Build a War Hall' },
  { id: 'streletz3',text: 'Train 3 Streletz' },
  { id: 'shrine',   text: 'Build a Rain Shrine' },
  { id: 'rain50',   text: 'Gather 50 Rain' },
  { id: 'vitez',    text: 'Train a Vitez' },
  { id: 'find',     text: 'Find the rival settlement' },
  { id: 'destroy',  text: 'Destroy the rival Grod' },
];

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
