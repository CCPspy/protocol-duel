const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Replace app.use(express.static(path.join(__dirname, 'public'))); with:
app.use(express.static(__dirname));

// ============================================================================
// 1. SIX (6) HERO DEFINITIONS
// ============================================================================
const HEROES = {
  vex: {
    id: 'vex',
    name: 'VEX',
    role: 'Recon Anchor',
    color: 0x00e5ff,
    maxHp: 100,
    speed: 7.2,
    primary: {
      name: 'SR-9 Talon (Lever-Action Rifle)',
      dmg: 68, headMult: 2.13, fireRateMs: 750, mag: 8, reloadMs: 1800,
      spread: 0.002, recoilPitch: 0.065, recoilYaw: 0.008, pellets: 1,
      noiseRadius: 38, pattern: 'single'
    },
    secondary: {
      name: 'P4-Whisper (Silenced Pistol)',
      dmg: 25, headMult: 2.0, fireRateMs: 165, mag: 12, reloadMs: 1200,
      spread: 0.012, recoilPitch: 0.018, recoilYaw: 0.005, pellets: 1,
      noiseRadius: 11, pattern: 'semi-silenced'
    },
    defensive: { name: 'Phase Step', cdMs: 14000, durationMs: 350, desc: '6.5m invulnerable directional dash' },
    ultimate: { name: 'Echo Pulse', cost: 1000, durationMs: 6000, desc: 'Wall-piercing sonar silhouette reveal' }
  },
  krosh: {
    id: 'krosh',
    name: 'KROSH',
    role: 'Breacher Juggernaut',
    color: 0xff5722,
    maxHp: 125,
    speed: 6.6,
    primary: {
      name: 'M88 Slag (Lever-Action Shotgun)',
      dmg: 12, headMult: 1.5, fireRateMs: 850, mag: 6, reloadMs: 2100,
      spread: 0.065, recoilPitch: 0.08, recoilYaw: 0.035, pellets: 10,
      noiseRadius: 42, pattern: 'shotgun'
    },
    secondary: {
      name: 'Vulcan .50 (Heavy Revolver)',
      dmg: 56, headMult: 2.0, fireRateMs: 460, mag: 6, reloadMs: 1700,
      spread: 0.006, recoilPitch: 0.055, recoilYaw: 0.012, pellets: 1,
      noiseRadius: 36, pattern: 'revolver'
    },
    defensive: { name: 'Aegis Bulwark', cdMs: 16000, durationMs: 4500, desc: '250 HP mobile front energy shield' },
    ultimate: { name: 'Seismic Overdrive', cost: 1100, durationMs: 4000, desc: '+50 armor & concussive slow wave' }
  },
  cipher: {
    id: 'cipher',
    name: 'CIPHER',
    role: 'Corridor Tactician',
    color: 0xaa00ff,
    maxHp: 100,
    speed: 7.4,
    primary: {
      name: 'VX-3 Hornet (3-Round Burst SMG)',
      dmg: 20, headMult: 2.0, fireRateMs: 90, burstCount: 3, burstDelayMs: 240, mag: 27, reloadMs: 1500,
      spread: 0.014, recoilPitch: 0.022, recoilYaw: 0.018, pellets: 1,
      noiseRadius: 28, pattern: 'burst'
    },
    secondary: {
      name: 'G-18 Stinger (Auto-Pistol)',
      dmg: 14, headMult: 1.8, fireRateMs: 72, mag: 18, reloadMs: 1300,
      spread: 0.032, recoilPitch: 0.026, recoilYaw: 0.022, pellets: 1,
      noiseRadius: 25, pattern: 'auto'
    },
    defensive: { name: 'Dynamic Smoke Wall', cdMs: 15000, durationMs: 6000, desc: 'Deploys opaque corridor smoke screen' },
    ultimate: { name: 'Neural Blackout', cost: 1050, durationMs: 8000, desc: 'EMP scrambles enemy HUD & pings actions' }
  },
  sable: {
    id: 'sable',
    name: 'SABLE',
    role: 'Silent Lurker',
    color: 0x00e676,
    maxHp: 100,
    speed: 7.7,
    primary: {
      name: 'KR-7 Spectre (Suppressed Carbine)',
      dmg: 26, headMult: 2.0, fireRateMs: 92, mag: 24, reloadMs: 1550,
      spread: 0.015, recoilPitch: 0.02, recoilYaw: 0.014, pellets: 1,
      noiseRadius: 15, pattern: 'auto-silenced'
    },
    secondary: {
      name: 'Volt-2 (Taser Sensor Sidearm)',
      dmg: 22, headMult: 1.5, fireRateMs: 400, mag: 4, reloadMs: 1400,
      spread: 0.008, recoilPitch: 0.012, recoilYaw: 0.004, pellets: 1,
      noiseRadius: 10, pattern: 'sensor'
    },
    defensive: { name: 'Mirage Cloak', cdMs: 17000, durationMs: 2600, desc: 'Optical stealth + fake acoustic decoy' },
    ultimate: { name: 'Shadow Stalker', cost: 1000, durationMs: 10000, desc: '100% silent footsteps & +25% speed' }
  },
  bastion: {
    id: 'bastion',
    name: 'BASTION',
    role: 'Zone Controller',
    color: 0xffc400,
    maxHp: 115,
    speed: 6.8,
    primary: {
      name: 'HMG-42 Anvil (Heavy Battle Rifle)',
      dmg: 39, headMult: 2.0, fireRateMs: 135, mag: 20, reloadMs: 2000,
      spread: 0.011, recoilPitch: 0.038, recoilYaw: 0.01, pellets: 1,
      noiseRadius: 40, pattern: 'wallbang'
    },
    secondary: {
      name: 'Flare-X (Incendiary Pistol)',
      dmg: 32, headMult: 1.4, fireRateMs: 650, mag: 3, reloadMs: 1600,
      spread: 0.01, recoilPitch: 0.03, recoilYaw: 0.005, pellets: 1,
      noiseRadius: 26, pattern: 'incendiary'
    },
    defensive: { name: 'Hardlight Barricade', cdMs: 16000, durationMs: 7000, desc: 'Deploys 320 HP physical cover barrier' },
    ultimate: { name: 'Lockdown Array', cost: 1150, durationMs: 9000, desc: 'Seals doors & tethers shock zone' }
  },
  volt: {
    id: 'volt',
    name: 'VOLT',
    role: 'Kinetic Duelist',
    color: 0x2979ff,
    maxHp: 100,
    speed: 7.5,
    primary: {
      name: 'AR-11 Pulse (Ramping Energy AR)',
      dmg: 24, headMult: 2.0, fireRateMs: 80, mag: 28, reloadMs: 1450,
      spread: 0.013, recoilPitch: 0.021, recoilYaw: 0.009, pellets: 1,
      noiseRadius: 30, pattern: 'ramping'
    },
    secondary: {
      name: 'Mag-Shot (Ricochet Pistol)',
      dmg: 34, headMult: 2.0, fireRateMs: 280, mag: 8, reloadMs: 1350,
      spread: 0.007, recoilPitch: 0.03, recoilYaw: 0.008, pellets: 1,
      noiseRadius: 28, pattern: 'ricochet'
    },
    defensive: { name: 'Kinetic Deflector', cdMs: 15000, durationMs: 1300, desc: 'Blocks shots & refills magazine' },
    ultimate: { name: 'Chrono Rewind', cost: 1100, durationMs: 6000, desc: 'Rewinds position, HP & ammo by 2.5s' }
  }
};

// ============================================================================
// 2. FIVE (5) LAUNCH MAPS WITH ACOUSTIC SURFACES & VERTICAL TOPOLOGY
// ============================================================================
// Acoustic multipliers: metal=1.8, wood=1.6, concrete=1.0, snow=0.75, grass=0.4
const MAPS = {
  foundry: {
    id: 'foundry',
    name: 'The Foundry',
    subtitle: 'High-Verticality Catwalks & Noisy Metal Flooring',
    ambientColor: 0x2a1a14,
    fogColor: 0x1a0f0a,
    floorMat: 'concrete',
    spawns: [
      { x: -22, y: 0, z: -22, yaw: -Math.PI / 4 },
      { x: 22, y: 4, z: 22, yaw: (3 * Math.PI) / 4 }
    ],
    // Boxes: [x, y, z, w, h, d, material, color,walkable]
    structures: [
      // Outer perimeter walls
      { x: 0, y: 5, z: -30, w: 60, h: 10, d: 2, mat: 'concrete', color: 0x3a322d },
      { x: 0, y: 5, z: 30, w: 60, h: 10, d: 2, mat: 'concrete', color: 0x3a322d },
      { x: -30, y: 5, z: 0, w: 2, h: 10, d: 60, mat: 'concrete', color: 0x3a322d },
      { x: 30, y: 5, z: 0, w: 2, h: 10, d: 60, mat: 'concrete', color: 0x3a322d },
      // Central Smelting Vat (Chokepoint divider)
      { x: 0, y: 2.5, z: 0, w: 10, h: 5, d: 10, mat: 'metal', color: 0x8c2d19 },
      // High-Verticality Metal Catwalks (+4m elevation, noisy metal!)
      { x: -14, y: 3.8, z: 0, w: 6, h: 0.4, d: 44, mat: 'metal', color: 0x606870, walkable: true },
      { x: 14, y: 3.8, z: 0, w: 6, h: 0.4, d: 44, mat: 'metal', color: 0x606870, walkable: true },
      { x: 0, y: 3.8, z: -16, w: 22, h: 0.4, d: 5, mat: 'metal', color: 0x606870, walkable: true },
      { x: 0, y: 3.8, z: 16, w: 22, h: 0.4, d: 5, mat: 'metal', color: 0x606870, walkable: true },
      // Ramps to Catwalks
      { x: -14, y: 1.9, z: -24, w: 5, h: 3.8, d: 6, mat: 'metal', color: 0x50555c, ramp: true },
      { x: 14, y: 1.9, z: 24, w: 5, h: 3.8, d: 6, mat: 'metal', color: 0x50555c, ramp: true },
      // Lower corridor cover pillars
      { x: -8, y: 2, z: -9, w: 3, h: 4, d: 3, mat: 'concrete', color: 0x4b423c },
      { x: 8, y: 2, z: 9, w: 3, h: 4, d: 3, mat: 'concrete', color: 0x4b423c },
      { x: -22, y: 2, z: 10, w: 6, h: 4, d: 3, mat: 'metal', color: 0x5a3e36 },
      { x: 22, y: 2, z: -10, w: 6, h: 4, d: 3, mat: 'metal', color: 0x5a3e36 }
    ],
    doors: []
  },

  subzero: {
    id: 'subzero',
    name: 'Sub-Zero Research Station',
    subtitle: 'Claustrophobic Arctic Lab with Dynamic Blast Doors & Exterior Blizzard Flanks',
    ambientColor: 0x162636,
    fogColor: 0x102030,
    floorMat: 'snow',
    spawns: [
      { x: -24, y: 0, z: 0, yaw: -Math.PI / 2 },
      { x: 24, y: 0, z: 0, yaw: Math.PI / 2 }
    ],
    structures: [
      { x: 0, y: 4, z: -30, w: 60, h: 8, d: 2, mat: 'concrete', color: 0x627d98 },
      { x: 0, y: 4, z: 30, w: 60, h: 8, d: 2, mat: 'concrete', color: 0x627d98 },
      { x: -30, y: 4, z: 0, w: 2, h: 8, d: 60, mat: 'concrete', color: 0x627d98 },
      { x: 30, y: 4, z: 0, w: 2, h: 8, d: 60, mat: 'concrete', color: 0x627d98 },
      // Central Cryo Lab Corridors (Tight interior chokepoints)
      { x: 0, y: 3, z: -10, w: 28, h: 6, d: 2, mat: 'metal', color: 0xd9e2ec },
      { x: 0, y: 3, z: 10, w: 28, h: 6, d: 2, mat: 'metal', color: 0xd9e2ec },
      { x: -14, y: 3, z: -18, w: 2, h: 6, d: 14, mat: 'metal', color: 0xbcccdc },
      { x: 14, y: 3, z: 18, w: 2, h: 6, d: 14, mat: 'metal', color: 0xbcccdc },
      // Cryo Containment Pods inside central corridor
      { x: -5, y: 1.8, z: 0, w: 3, h: 3.6, d: 3, mat: 'metal', color: 0x00b4d8 },
      { x: 5, y: 1.8, z: 0, w: 3, h: 3.6, d: 3, mat: 'metal', color: 0x00b4d8 },
      // Exterior snow ridges (low visibility flank routes)
      { x: 0, y: 1.5, z: -22, w: 12, h: 3, d: 4, mat: 'snow', color: 0xf0f4f8 },
      { x: 0, y: 1.5, z: 22, w: 12, h: 3, d: 4, mat: 'snow', color: 0xf0f4f8 }
    ],
    doors: [
      { id: 'cryo_west', x: -14, y: 2.5, z: 0, w: 1.5, h: 5, d: 8, open: false },
      { id: 'cryo_east', x: 14, y: 2.5, z: 0, w: 1.5, h: 5, d: 8, open: false }
    ]
  },

  overpass: {
    id: 'overpass',
    name: 'Overpass Transit Hub',
    subtitle: 'Long Sniper Sightlines Balanced by Subterranean Flank Tunnels',
    ambientColor: 0x1f2430,
    fogColor: 0x12151e,
    floorMat: 'concrete',
    spawns: [
      { x: -25, y: 0, z: -20, yaw: 0 },
      { x: 25, y: 0, z: 20, yaw: Math.PI }
    ],
    structures: [
      { x: 0, y: 5, z: -30, w: 60, h: 10, d: 2, mat: 'concrete', color: 0x333942 },
      { x: 0, y: 5, z: 30, w: 60, h: 10, d: 2, mat: 'concrete', color: 0x333942 },
      { x: -30, y: 5, z: 0, w: 2, h: 10, d: 60, mat: 'concrete', color: 0x333942 },
      { x: 30, y: 5, z: 0, w: 2, h: 10, d: 60, mat: 'concrete', color: 0x333942 },
      // Elevated Sniper Overpass Deck (+4.2m long sightline across the map)
      { x: 0, y: 4.2, z: -18, w: 50, h: 0.5, d: 8, mat: 'concrete', color: 0x525c6a, walkable: true },
      { x: -24, y: 2.1, z: -12, w: 6, h: 4.2, d: 6, mat: 'concrete', color: 0x454e59, ramp: true },
      { x: 24, y: 2.1, z: -12, w: 6, h: 4.2, d: 6, mat: 'concrete', color: 0x454e59, ramp: true },
      // Subterranean/Enclosed Underpass Tunnel (Roofed flank corridor on +Z side)
      { x: 0, y: 2.5, z: 14, w: 42, h: 5, d: 2, mat: 'concrete', color: 0x2b303a },
      { x: 0, y: 4.8, z: 21, w: 42, h: 0.6, d: 14, mat: 'concrete', color: 0x22262e, walkable: true },
      // Transit Train Car in Central Concourse
      { x: 0, y: 2.0, z: -2, w: 22, h: 4.0, d: 4.5, mat: 'metal', color: 0x2b5876 }
    ],
    doors: []
  },

  sanctuary: {
    id: 'sanctuary',
    name: 'The Sanctuary',
    subtitle: 'Sound-Muffling Courtyard Gardens & Creaking Wooden Chokepoints',
    ambientColor: 0x1b2a1e,
    fogColor: 0x0f1911,
    floorMat: 'grass',
    spawns: [
      { x: -23, y: 0, z: 23, yaw: -Math.PI / 4 },
      { x: 23, y: 0, z: -23, yaw: (3 * Math.PI) / 4 }
    ],
    structures: [
      { x: 0, y: 4, z: -30, w: 60, h: 8, d: 2, mat: 'wood', color: 0x4a3525 },
      { x: 0, y: 4, z: 30, w: 60, h: 8, d: 2, mat: 'wood', color: 0x4a3525 },
      { x: -30, y: 4, z: 0, w: 2, h: 8, d: 60, mat: 'wood', color: 0x4a3525 },
      { x: 30, y: 4, z: 0, w: 2, h: 8, d: 60, mat: 'wood', color: 0x4a3525 },
      // Central Wooden Temple Veranda (Creaky wood = 1.6x noise multiplier!)
      { x: 0, y: 2.2, z: 0, w: 18, h: 0.4, d: 18, mat: 'wood', color: 0x7c4d2b, walkable: true },
      { x: 0, y: 1.1, z: -11, w: 6, h: 2.2, d: 4, mat: 'wood', color: 0x6b4226, ramp: true },
      { x: 0, y: 1.1, z: 11, w: 6, h: 2.2, d: 4, mat: 'wood', color: 0x6b4226, ramp: true },
      // Temple Shrine Pillars on Veranda
      { x: -6, y: 4.5, z: -6, w: 2, h: 4.5, d: 2, mat: 'wood', color: 0x9c2b23 },
      { x: 6, y: 4.5, z: 6, w: 2, h: 4.5, d: 2, mat: 'wood', color: 0x9c2b23 },
      { x: -6, y: 4.5, z: 6, w: 2, h: 4.5, d: 2, mat: 'wood', color: 0x9c2b23 },
      { x: 6, y: 4.5, z: -6, w: 2, h: 4.5, d: 2, mat: 'wood', color: 0x9c2b23 },
      // Wooden Chokepoint Gates flanking the garden
      { x: -18, y: 2.5, z: 0, w: 2, h: 5, d: 16, mat: 'wood', color: 0x5c3a21 },
      { x: 18, y: 2.5, z: 0, w: 2, h: 5, d: 16, mat: 'wood', color: 0x5c3a21 }
    ],
    doors: []
  },

  aegis: {
    id: 'aegis',
    name: 'Aegis Bunker',
    subtitle: 'Underground Silo Centered Around a Multi-Vector Control Room',
    ambientColor: 0x142228,
    fogColor: 0x0a1216,
    floorMat: 'concrete',
    spawns: [
      { x: 0, y: 0, z: -25, yaw: Math.PI },
      { x: 0, y: 0, z: 25, yaw: 0 }
    ],
    structures: [
      { x: 0, y: 5, z: -30, w: 60, h: 10, d: 2, mat: 'concrete', color: 0x24343d },
      { x: 0, y: 5, z: 30, w: 60, h: 10, d: 2, mat: 'concrete', color: 0x24343d },
      { x: -30, y: 5, z: 0, w: 2, h: 10, d: 60, mat: 'concrete', color: 0x24343d },
      { x: 30, y: 5, z: 0, w: 2, h: 10, d: 60, mat: 'concrete', color: 0x24343d },
      // Central Elevated Control Room Platform (+3m)
      { x: 0, y: 2.8, z: 0, w: 16, h: 0.4, d: 16, mat: 'metal', color: 0x37515f, walkable: true },
      { x: -10, y: 1.4, z: 0, w: 4, h: 2.8, d: 5, mat: 'metal', color: 0x2c424e, ramp: true },
      { x: 10, y: 1.4, z: 0, w: 4, h: 2.8, d: 5, mat: 'metal', color: 0x2c424e, ramp: true },
      // Control Room Partition Walls (4 entry vectors)
      { x: -6, y: 5, z: -6, w: 4, h: 4, d: 4, mat: 'metal', color: 0x1d2d35 },
      { x: 6, y: 5, z: -6, w: 4, h: 4, d: 4, mat: 'metal', color: 0x1d2d35 },
      { x: -6, y: 5, z: 6, w: 4, h: 4, d: 4, mat: 'metal', color: 0x1d2d35 },
      { x: 6, y: 5, z: 6, w: 4, h: 4, d: 4, mat: 'metal', color: 0x1d2d35 },
      // Outer Silo Flank Ring Barriers
      { x: -20, y: 2.5, z: -14, w: 3, h: 5, d: 12, mat: 'concrete', color: 0x2f4450 },
      { x: 20, y: 2.5, z: 14, w: 3, h: 5, d: 12, mat: 'concrete', color: 0x2f4450 },
      { x: -20, y: 2.5, z: 14, w: 3, h: 5, d: 12, mat: 'concrete', color: 0x2f4450 },
      { x: 20, y: 2.5, z: -14, w: 3, h: 5, d: 12, mat: 'concrete', color: 0x2f4450 }
    ],
    doors: [
      { id: 'silo_north', x: 0, y: 2.5, z: -14, w: 8, h: 5, d: 1.5, open: true },
      { id: 'silo_south', x: 0, y: 2.5, z: 14, w: 8, h: 5, d: 1.5, open: true }
    ]
  }
};

const SURFACE_MULT = { metal: 1.8, wood: 1.6, concrete: 1.0, snow: 0.75, grass: 0.4 };

// ============================================================================
// 3. ROOMS, STATE & 3D RAYCASTING ENGINE
// ============================================================================
const rooms = {};

function createPlayerState(id, name, heroId, spawn, isBot = false) {
  const hero = HEROES[heroId] || HEROES.vex;
  return {
    id, name, isBot,
    heroId: hero.id,
    x: spawn.x, y: spawn.y, z: spawn.z,
    yaw: spawn.yaw || 0, pitch: 0,
    stance: 'stand', // 'stand' | 'walk' | 'crouch'
    hp: hero.maxHp, maxHp: hero.maxHp, armor: 0,
    stocks: 3, kills: 0, deaths: 0,
    weaponSlot: 'primary',
    ammo: { primary: hero.primary.mag, secondary: hero.secondary.mag },
    reloadingUntil: 0,
    defCdUntil: 0,
    defActiveUntil: 0,
    ultCharge: 250,
    ultMax: hero.ultimate.cost,
    ultActiveUntil: 0,
    slowedUntil: 0,
    blackoutUntil: 0,
    revealedUntil: 0,
    consecShots: 0,
    lastShotAt: 0,
    history: [] // Used for Volt's Chrono Rewind
  };
}

// Ray vs Axis-Aligned Bounding Box (Slab Method)
function intersectRayAABB(origin, dir, box) {
  const minX = box.x - box.w / 2, maxX = box.x + box.w / 2;
  const minY = box.y - box.h / 2, maxY = box.y + box.h / 2;
  const minZ = box.z - box.d / 2, maxZ = box.z + box.d / 2;

  let tmin = -Infinity, tmax = Infinity;
  const axes = [
    [origin.x, dir.x, minX, maxX],
    [origin.y, dir.y, minY, maxY],
    [origin.z, dir.z, minZ, maxZ]
  ];
  for (const [o, d, mn, mx] of axes) {
    if (Math.abs(d) > 1e-6) {
      let t1 = (mn - o) / d;
      let t2 = (mx - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    } else if (o < mn || o > mx) {
      return null;
    }
  }
  return tmax >= 0 ? (tmin >= 0 ? tmin : tmax) : null;
}

function getFloorMaterial(map, x, y, z) {
  for (const s of map.structures) {
    if ((s.walkable || s.ramp) &&
        Math.abs(x - s.x) <= s.w / 2 &&
        Math.abs(z - s.z) <= s.d / 2 &&
        y >= s.y - 1.5) {
      return s.mat;
    }
  }
  return map.floorMat;
}

function emitAcousticPing(room, sourcePlayer, baseRadius, type) {
  const now = Date.now();
  // Sable Shadow Stalker ult makes footsteps 100% silent
  if (type === 'footstep' && sourcePlayer.heroId === 'sable' &&
      (now < sourcePlayer.ultActiveUntil || now < sourcePlayer.defActiveUntil)) {
    return;
  }
  const map = MAPS[room.mapId];
  const mat = getFloorMaterial(map, sourcePlayer.x, sourcePlayer.y, sourcePlayer.z);
  const mult = SURFACE_MULT[mat] || 1.0;
  const effectiveRadius = baseRadius * mult;
  if (effectiveRadius <= 0.5) return;

  for (const pid of Object.keys(room.players)) {
    if (pid === sourcePlayer.id) continue;
    const listener = room.players[pid];
    const dist = Math.hypot(listener.x - sourcePlayer.x, listener.z - sourcePlayer.z);
    if (dist <= effectiveRadius) {
      io.to(pid).emit('acousticPing', {
        x: sourcePlayer.x, y: sourcePlayer.y, z: sourcePlayer.z,
        surface: mat, type, intensity: Math.max(0.2, 1 - dist / effectiveRadius)
      });
    }
  }
}

// ============================================================================
// 4. SOCKET.IO CONNECTION & EVENT HANDLERS
// ============================================================================
io.on('connection', (socket) => {
  socket.emit('initCatalog', { heroes: HEROES, maps: MAPS });

  socket.on('joinMatch', ({ roomId, playerName, heroId, mapId, mode, spawnBot }) => {
    const rId = (roomId || 'duel-1').trim().toLowerCase();
    socket.join(rId);
    socket.roomId = rId;

    if (!rooms[rId]) {
      const chosenMap = MAPS[mapId] ? mapId : 'foundry';
      rooms[rId] = {
        id: rId,
        mapId: chosenMap,
        mode: mode === 'timer' ? 'timer' : 'stock',
        timeRemaining: 180,
        suddenDeath: false,
        over: false,
        players: {},
        deployables: [],
        doors: JSON.parse(JSON.stringify(MAPS[chosenMap].doors))
      };
    }

    const room = rooms[rId];
    const map = MAPS[room.mapId];
    const pCount = Object.keys(room.players).length;
    const spawn = map.spawns[pCount % 2];

    room.players[socket.id] = createPlayerState(
      socket.id,
      playerName || 'Operative',
      heroId,
      spawn,
      false
    );

    if (spawnBot && Object.keys(room.players).length < 2) {
      const botHeroes = Object.keys(HEROES).filter((h) => h !== heroId);
      const botHero = botHeroes[Math.floor(Math.random() * botHeroes.length)];
      const botId = 'bot_' + rId;
      room.players[botId] = createPlayerState(
        botId,
        `BOT // ${HEROES[botHero].name}`,
        botHero,
        map.spawns[1],
        true
      );
    }

    io.to(rId).emit('matchState', {
      roomId: room.id,
      mapId: room.mapId,
      mode: room.mode,
      timeRemaining: room.timeRemaining,
      doors: room.doors,
      players: room.players
    });
  });

  socket.on('moveUpdate', (data) => {
    const room = rooms[socket.roomId];
    if (!room || room.over) return;
    const p = room.players[socket.id];
    if (!p) return;

    const movedDist = Math.hypot(data.x - p.x, data.z - p.z);
    p.x = Math.max(-28.5, Math.min(28.5, data.x));
    p.y = Math.max(0, Math.min(10, data.y));
    p.z = Math.max(-28.5, Math.min(28.5, data.z));
    p.yaw = data.yaw;
    p.pitch = data.pitch;
    p.stance = data.stance || 'stand';

    // Record history for Volt's Chrono Rewind
    const now = Date.now();
    p.history.push({ t: now, x: p.x, y: p.y, z: p.z, hp: p.hp });
    if (p.history.length > 60) p.history.shift();

    // Footstep acoustic checks
    if (movedDist > 0.08 && p.stance !== 'crouch') {
      const baseNoise = p.stance === 'walk' ? 4.5 : 18.0;
      if (!p.lastStepAt || now - p.lastStepAt > (p.stance === 'walk' ? 520 : 310)) {
        p.lastStepAt = now;
        emitAcousticPing(room, p, baseNoise, 'footstep');
      }
    }
  });

  socket.on('switchWeapon', (slot) => {
    const room = rooms[socket.roomId];
    if (!room || !room.players[socket.id]) return;
    const p = room.players[socket.id];
    p.weaponSlot = slot === 'secondary' ? 'secondary' : 'primary';
    p.consecShots = 0;
  });

  socket.on('reloadWeapon', () => {
    const room = rooms[socket.roomId];
    if (!room || !room.players[socket.id]) return;
    const p = room.players[socket.id];
    const hero = HEROES[p.heroId];
    const w = hero[p.weaponSlot];
    const now = Date.now();
    if (now < p.reloadingUntil || p.ammo[p.weaponSlot] === w.mag) return;
    p.reloadingUntil = now + w.reloadMs;
    setTimeout(() => {
      if (room.players[socket.id]) {
        room.players[socket.id].ammo[p.weaponSlot] = w.mag;
        socket.emit('ammoSync', room.players[socket.id].ammo);
      }
    }, w.reloadMs);
  });

  socket.on('toggleDoor', () => {
    const room = rooms[socket.roomId];
    if (!room || !room.players[socket.id]) return;
    const p = room.players[socket.id];
    for (const d of room.doors) {
      if (Math.hypot(p.x - d.x, p.z - d.z) <= 8.5) {
        if (d.lockedUntil && Date.now() < d.lockedUntil) continue;
        d.open = !d.open;
        emitAcousticPing(room, p, 32, 'door');
        io.to(room.id).emit('doorState', room.doors);
      }
    }
  });

  socket.on('useAbility', (type) => {
    const room = rooms[socket.roomId];
    if (!room || room.over || !room.players[socket.id]) return;
    const p = room.players[socket.id];
    const hero = HEROES[p.heroId];
    const now = Date.now();

    if (type === 'defensive') {
      if (now < p.defCdUntil) return;
      p.defCdUntil = now + hero.defensive.cdMs;
      p.defActiveUntil = now + hero.defensive.durationMs;

      if (p.heroId === 'vex') {
        // Phase Step dash along facing vector
        p.x = Math.max(-28, Math.min(28, p.x - Math.sin(p.yaw) * 6.5));
        p.z = Math.max(-28, Math.min(28, p.z - Math.cos(p.yaw) * 6.5));
      } else if (p.heroId === 'cipher') {
        room.deployables.push({
          id: 'smoke_' + now, owner: p.id, type: 'smoke',
          x: p.x - Math.sin(p.yaw) * 7, y: p.y + 1.8, z: p.z - Math.cos(p.yaw) * 7,
          w: 9, h: 3.8, d: 3.5, hp: 9999, expiresAt: now + 6000
        });
      } else if (p.heroId === 'bastion') {
        room.deployables.push({
          id: 'barrier_' + now, owner: p.id, type: 'barrier',
          x: p.x - Math.sin(p.yaw) * 3.5, y: p.y + 1.2, z: p.z - Math.cos(p.yaw) * 3.5,
          w: 4.5, h: 2.5, d: 1.0, hp: 320, expiresAt: now + 7000
        });
      } else if (p.heroId === 'sable') {
        // Emit decoy footsteps forward
        emitAcousticPing(room, {
          ...p,
          x: p.x - Math.sin(p.yaw) * 9,
          z: p.z - Math.cos(p.yaw) * 9
        }, 28, 'decoy');
      } else if (p.heroId === 'volt') {
        p.ammo.primary = hero.primary.mag;
      }

      io.to(room.id).emit('abilityTriggered', {
        playerId: p.id, heroId: p.heroId, slot: 'defensive',
        abilityName: hero.defensive.name, x: p.x, y: p.y, z: p.z
      });
    } else if (type === 'ultimate') {
      if (p.ultCharge < p.ultMax) return;
      p.ultCharge = 0;
      p.ultActiveUntil = now + hero.ultimate.durationMs;

      // Apply 1v1 turnaround ultimate effects
      for (const pid of Object.keys(room.players)) {
        const target = room.players[pid];
        if (pid === p.id) continue;
        if (p.heroId === 'vex') {
          target.revealedUntil = now + 6000;
        } else if (p.heroId === 'krosh') {
          p.armor = 50;
          if (Math.hypot(target.x - p.x, target.z - p.z) <= 18) {
            target.slowedUntil = now + 3500;
          }
        } else if (p.heroId === 'cipher') {
          target.blackoutUntil = now + 8000;
          target.defCdUntil = Math.max(target.defCdUntil, now + 4000);
        } else if (p.heroId === 'bastion') {
          room.doors.forEach((d) => { d.open = false; d.lockedUntil = now + 6000; });
          io.to(room.id).emit('doorState', room.doors);
          if (Math.hypot(target.x - p.x, target.z - p.z) <= 15) {
            applyDamage(room, p, target, 45, 'Lockdown Tether');
          }
        }
      }

      if (p.heroId === 'volt' && p.history.length > 0) {
        const snap = p.history[0];
        p.x = snap.x; p.y = snap.y; p.z = snap.z;
        p.hp = Math.max(p.hp, snap.hp);
        p.ammo.primary = hero.primary.mag;
      }

      io.to(room.id).emit('abilityTriggered', {
        playerId: p.id, heroId: p.heroId, slot: 'ultimate',
        abilityName: hero.ultimate.name, x: p.x, y: p.y, z: p.z
      });
    }
  });

  socket.on('fireWeapon', ({ origin, dir }) => {
    const room = rooms[socket.roomId];
    if (!room || room.over || !room.players[socket.id]) return;
    const shooter = room.players[socket.id];
    const now = Date.now();
    if (now < shooter.reloadingUntil) return;

    const hero = HEROES[shooter.heroId];
    const weapon = hero[shooter.weaponSlot];
    if (shooter.ammo[shooter.weaponSlot] <= 0) return;

    shooter.ammo[shooter.weaponSlot]--;
    shooter.lastShotAt = now;
    emitAcousticPing(room, shooter, weapon.noiseRadius, 'gunfire');

    const map = MAPS[room.mapId];
    const pellets = weapon.pellets || 1;

    for (let i = 0; i < pellets; i++) {
      const spread = shooter.stance === 'crouch' ? weapon.spread * 0.55 : weapon.spread;
      const rx = dir.x + (Math.random() - 0.5) * spread;
      const ry = dir.y + (Math.random() - 0.5) * spread;
      const rz = dir.z + (Math.random() - 0.5) * spread;
      const len = Math.hypot(rx, ry, rz) || 1;
      const rayDir = { x: rx / len, y: ry / len, z: rz / len };

      resolveHitscan(room, map, shooter, weapon, origin, rayDir, 1.0);
    }
  });

  socket.on('disconnect', () => {
    const room = rooms[socket.roomId];
    if (room && room.players[socket.id]) {
      delete room.players[socket.id];
      if (Object.keys(room.players).filter((id) => !id.startsWith('bot_')).length === 0) {
        delete rooms[socket.roomId];
      }
    }
  });
});

function resolveHitscan(room, map, shooter, weapon, origin, rayDir, dmgMultiplier) {
  let nearestWallDist = Infinity;
  let hitWallBox = null;

  const allBlocks = [
    ...map.structures,
    ...room.doors.filter((d) => !d.open),
    ...room.deployables.filter((dep) => dep.type === 'barrier')
  ];

  for (const box of allBlocks) {
    const t = intersectRayAABB(origin, rayDir, box);
    if (t !== null && t < nearestWallDist) {
      nearestWallDist = t;
      hitWallBox = box;
    }
  }

  // Check player hitboxes
  let hitTarget = null;
  let hitDist = Infinity;
  let isHeadshot = false;

  for (const pid of Object.keys(room.players)) {
    if (pid === shooter.id) continue;
    const target = room.players[pid];
    const bodyBox = { x: target.x, y: target.y + 0.9, z: target.z, w: 0.95, h: 1.8, d: 0.95 };
    const t = intersectRayAABB(origin, rayDir, bodyBox);
    if (t !== null && t < hitDist) {
      hitDist = t;
      hitTarget = target;
      const hitY = origin.y + rayDir.y * t;
      isHeadshot = hitY >= target.y + 1.42;
    }
  }

  const now = Date.now();
  // Direct hit or Bastion wallbang
  if (hitTarget && (hitDist < nearestWallDist || (weapon.pattern === 'wallbang' && hitDist < nearestWallDist + 2.5))) {
    const wallbangMult = hitDist >= nearestWallDist ? 0.6 : 1.0;

    // Check defensive abilities (Vex Phase Step i-frames, Krosh Shield, Volt Deflector)
    if (now < hitTarget.defActiveUntil) {
      if (hitTarget.heroId === 'vex' || hitTarget.heroId === 'volt' || hitTarget.heroId === 'krosh') {
        io.to(room.id).emit('hitMarker', { shooterId: shooter.id, blocked: true });
        return;
      }
    }

    const rawDmg = weapon.dmg * (isHeadshot ? weapon.headMult : 1.0) * dmgMultiplier * wallbangMult;
    applyDamage(room, shooter, hitTarget, Math.round(rawDmg), weapon.name, isHeadshot);
  } else if (weapon.pattern === 'ricochet' && nearestWallDist < 50 && dmgMultiplier === 1.0 && hitWallBox) {
    // Volt's Mag-Shot single wall bounce with 1.25x multiplier
    const hitPoint = {
      x: origin.x + rayDir.x * (nearestWallDist - 0.05),
      y: origin.y + rayDir.y * (nearestWallDist - 0.05),
      z: origin.z + rayDir.z * (nearestWallDist - 0.05)
    };
    const bounceDir = { x: -rayDir.x, y: rayDir.y, z: -rayDir.z };
    resolveHitscan(room, map, shooter, weapon, hitPoint, bounceDir, 1.25);
  }
}

function applyDamage(room, attacker, victim, dmg, sourceName, isHeadshot = false) {
  const now = Date.now();
  attacker.ultCharge = Math.min(attacker.ultMax, attacker.ultCharge + dmg * 2.2);
  victim.ultCharge = Math.min(victim.ultMax, victim.ultCharge + dmg * 1.1);

  if (victim.armor > 0) {
    const absorbed = Math.min(victim.armor, dmg);
    victim.armor -= absorbed;
    dmg -= absorbed;
  }
  victim.hp -= dmg;

  // Sable Shadow Stalker emergency smoke trigger under 35 HP
  if (victim.heroId === 'sable' && now < victim.ultActiveUntil && victim.hp > 0 && victim.hp <= 35) {
    victim.ammo.primary = HEROES.sable.primary.mag;
  }

  // Volt Chrono Rewind auto-saves from fatal damage if active
  if (victim.hp <= 0 && victim.heroId === 'volt' && now < victim.ultActiveUntil && victim.history.length > 0) {
    const snap = victim.history[0];
    victim.x = snap.x; victim.y = snap.y; victim.z = snap.z;
    victim.hp = 35;
    victim.ultActiveUntil = 0;
    io.to(room.id).emit('abilityTriggered', {
      playerId: victim.id, heroId: 'volt', slot: 'ultimate',
      abilityName: 'Chrono Lifeline Triggered!', x: victim.x, y: victim.y, z: victim.z
    });
    return;
  }

  io.to(room.id).emit('hitMarker', {
    shooterId: attacker.id, victimId: victim.id, dmg, isHeadshot, blocked: false
  });

  if (victim.hp <= 0) {
    attacker.kills++;
    victim.deaths++;
    victim.stocks = Math.max(0, victim.stocks - 1);

    io.to(room.id).emit('killFeed', {
      killer: attacker.name, victim: victim.name, weapon: sourceName, isHeadshot
    });

    if (room.mode === 'stock' && victim.stocks <= 0) {
      room.over = true;
      io.to(room.id).emit('matchOver', { winner: attacker.name, reason: 'Opponent Stocks Depleted' });
      return;
    }

    // Respawn at farthest spawn node
    const map = MAPS[room.mapId];
    const s0 = map.spawns[0], s1 = map.spawns[1];
    const d0 = Math.hypot(attacker.x - s0.x, attacker.z - s0.z);
    const d1 = Math.hypot(attacker.x - s1.x, attacker.z - s1.z);
    const bestSpawn = d0 > d1 ? s0 : s1;

    victim.hp = victim.maxHp;
    victim.armor = 0;
    victim.x = bestSpawn.x; victim.y = bestSpawn.y; victim.z = bestSpawn.z;
    victim.ammo.primary = HEROES[victim.heroId].primary.mag;
    victim.ammo.secondary = HEROES[victim.heroId].secondary.mag;
  }
}

// ============================================================================
// 5. SERVER AUTHORITATIVE TICK LOOP (20 Hz State Sync + 1 Hz Match Clock)
// ============================================================================
setInterval(() => {
  const now = Date.now();
  for (const rId of Object.keys(rooms)) {
    const room = rooms[rId];
    if (room.over) continue;

    room.deployables = room.deployables.filter((d) => d.expiresAt > now && d.hp > 0);

    // Update AI Tactical Duelist if active in room
    for (const pid of Object.keys(room.players)) {
      const p = room.players[pid];
      p.ultCharge = Math.min(p.ultMax, p.ultCharge + 0.6);

      if (p.isBot) {
        const humans = Object.values(room.players).filter((h) => !h.isBot);
        if (humans.length > 0) {
          const target = humans[0];
          const dx = target.x - p.x;
          const dz = target.z - p.z;
          const dist = Math.hypot(dx, dz) || 1;
          p.yaw = Math.atan2(-dx, -dz);

          // Tactical routing: Patrol corridors, hold angles at 14m
          if (dist > 14) {
            p.x += (dx / dist) * 0.22;
            p.z += (dz / dist) * 0.22;
            if (Math.random() < 0.08) emitAcousticPing(room, p, 14, 'footstep');
          } else {
            // Strafe & duel
            const strafe = Math.sin(now * 0.004) * 0.16;
            p.x += (-dz / dist) * strafe;
            p.z += (dx / dist) * strafe;
          }

          // Check line of sight to fire
          const eyeOrigin = { x: p.x, y: p.y + 1.5, z: p.z };
          const aimDir = { x: dx / dist, y: (target.y - p.y) / dist, z: dz / dist };
          const hero = HEROES[p.heroId];
          if (now - p.lastShotAt > Math.max(420, hero.primary.fireRateMs * 1.4)) {
            p.lastShotAt = now;
            emitAcousticPing(room, p, hero.primary.noiseRadius, 'gunfire');
            resolveHitscan(room, MAPS[room.mapId], p, hero.primary, eyeOrigin, aimDir, 0.75);
          }
        }
      }
    }

    io.to(rId).emit('worldTick', {
      players: room.players,
      deployables: room.deployables
    });
  }
}, 50);

// 1-Second Match Timer Loop
setInterval(() => {
  for (const rId of Object.keys(rooms)) {
    const room = rooms[rId];
    if (room.over || Object.keys(room.players).length < 2) continue;
    if (room.mode === 'timer') {
      room.timeRemaining--;
      if (room.timeRemaining <= 0) {
        const list = Object.values(room.players).sort((a, b) => b.kills - a.kills);
        if (list.length >= 2 && list[0].kills === list[1].kills && !room.suddenDeath) {
          room.suddenDeath = true;
          room.timeRemaining = 45;
          io.to(rId).emit('suddenDeath');
        } else {
          room.over = true;
          io.to(rId).emit('matchOver', {
            winner: list[0].name,
            reason: `Timer Expired (${list[0].kills} Eliminations)`
          });
        }
      }
      io.to(rId).emit('timerSync', room.timeRemaining);
    }
  }
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`PROTOCOL: DUEL Server active on http://localhost:${PORT}`);
});
