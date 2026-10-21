// ============================================================================
// PROTOCOL: DUEL shared catalog + movement physics.
// Loaded by the browser (<script src="shared.js">) and by server.js (require),
// so client prediction, the P2P host and the Node server all agree on maps,
// heroes and collision.
// ============================================================================
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof self !== 'undefined' ? self : this, function () {
  const HEROES = {
    vex: {
      id: 'vex', name: 'VEX', role: 'Recon Sniper', color: 0x00e5ff, maxHp: 100, speed: 7.2,
      primary: { name: 'SR-9 Talon (Single-Shot Rifle)', dmg: 68, headMult: 2.13, fireRateMs: 700, mag: 8, reloadMs: 1600, baseSpread: 0.001, moveSpread: 0.065, recoilPitch: 0.075, recoilYaw: 0.01, pellets: 1, noiseRadius: 38, pattern: 'single' },
      secondary: { name: 'P4-Whisper (Silenced Pistol)', dmg: 26, headMult: 2.0, fireRateMs: 170, mag: 12, reloadMs: 1100, baseSpread: 0.006, moveSpread: 0.025, recoilPitch: 0.022, recoilYaw: 0.006, pellets: 1, noiseRadius: 10, pattern: 'semi-silenced' },
      defensive: { name: 'Phase Step (Dash)', cdMs: 12000, durationMs: 400 },
      ultimate: { name: 'Echo Pulse (Wallhack)', cost: 1000, durationMs: 6500 }
    },
    krosh: {
      id: 'krosh', name: 'KROSH', role: 'Shotgun Breacher', color: 0xff5722, maxHp: 125, speed: 6.7,
      primary: { name: 'M88 Slag (Lever Shotgun)', dmg: 13, headMult: 1.5, fireRateMs: 800, mag: 6, reloadMs: 1900, baseSpread: 0.055, moveSpread: 0.03, recoilPitch: 0.095, recoilYaw: 0.03, pellets: 10, noiseRadius: 42, pattern: 'shotgun' },
      secondary: { name: 'Vulcan .50 (Heavy Revolver)', dmg: 56, headMult: 2.0, fireRateMs: 440, mag: 6, reloadMs: 1500, baseSpread: 0.004, moveSpread: 0.045, recoilPitch: 0.065, recoilYaw: 0.015, pellets: 1, noiseRadius: 36, pattern: 'revolver' },
      defensive: { name: 'Aegis Shield (Block)', cdMs: 14000, durationMs: 4200 },
      ultimate: { name: 'Seismic Slam (+50 Armor & Slow)', cost: 1050, durationMs: 4500 }
    },
    cipher: {
      id: 'cipher', name: 'CIPHER', role: 'Burst Tactician', color: 0xaa00ff, maxHp: 100, speed: 7.4,
      primary: { name: 'VX-3 Hornet (3-Burst SMG)', dmg: 21, headMult: 2.0, fireRateMs: 270, mag: 27, reloadMs: 1400, baseSpread: 0.008, moveSpread: 0.035, recoilPitch: 0.024, recoilYaw: 0.016, pellets: 1, noiseRadius: 28, pattern: 'burst' },
      secondary: { name: 'G-18 Stinger (Auto-Pistol)', dmg: 15, headMult: 1.8, fireRateMs: 78, mag: 18, reloadMs: 1200, baseSpread: 0.022, moveSpread: 0.04, recoilPitch: 0.026, recoilYaw: 0.022, pellets: 1, noiseRadius: 25, pattern: 'auto' },
      defensive: { name: 'Smoke Wall (Cover)', cdMs: 14000, durationMs: 6000 },
      ultimate: { name: 'Neural EMP (Reveal + Jam)', cost: 1000, durationMs: 7000 }
    },
    sable: {
      id: 'sable', name: 'SABLE', role: 'Silent Flanker', color: 0x00e676, maxHp: 100, speed: 7.7,
      primary: { name: 'KR-7 Spectre (Silenced Carbine)', dmg: 26, headMult: 2.0, fireRateMs: 95, mag: 24, reloadMs: 1450, baseSpread: 0.009, moveSpread: 0.038, recoilPitch: 0.022, recoilYaw: 0.014, pellets: 1, noiseRadius: 14, pattern: 'auto-silenced' },
      secondary: { name: 'Volt-2 (Taser Pistol)', dmg: 28, headMult: 1.5, fireRateMs: 360, mag: 6, reloadMs: 1200, baseSpread: 0.005, moveSpread: 0.02, recoilPitch: 0.015, recoilYaw: 0.005, pellets: 1, noiseRadius: 10, pattern: 'sensor' },
      defensive: { name: 'Mirage Cloak (Stealth)', cdMs: 15000, durationMs: 3000 },
      ultimate: { name: 'Shadow Stalker (Silent Sprint)', cost: 1000, durationMs: 9000 }
    },
    bastion: {
      id: 'bastion', name: 'BASTION', role: 'Heavy Anchor', color: 0xffc400, maxHp: 115, speed: 6.8,
      primary: { name: 'HMG-42 Anvil (Heavy Rifle)', dmg: 39, headMult: 2.0, fireRateMs: 135, mag: 20, reloadMs: 1850, baseSpread: 0.007, moveSpread: 0.055, recoilPitch: 0.042, recoilYaw: 0.012, pellets: 1, noiseRadius: 40, pattern: 'wallbang' },
      secondary: { name: 'Flare-X (Incendiary)', dmg: 36, headMult: 1.4, fireRateMs: 550, mag: 4, reloadMs: 1400, baseSpread: 0.008, moveSpread: 0.025, recoilPitch: 0.032, recoilYaw: 0.005, pellets: 1, noiseRadius: 26, pattern: 'incendiary' },
      defensive: { name: 'Hardlight Wall (320 HP Cover)', cdMs: 15000, durationMs: 7000 },
      ultimate: { name: 'Lockdown Zap (Door Lock + Shock)', cost: 1100, durationMs: 8000 }
    },
    volt: {
      id: 'volt', name: 'VOLT', role: 'Kinetic Duelist', color: 0x2979ff, maxHp: 100, speed: 7.6,
      primary: { name: 'AR-11 Pulse (Ramping AR)', dmg: 24, headMult: 2.0, fireRateMs: 82, mag: 28, reloadMs: 1350, baseSpread: 0.008, moveSpread: 0.036, recoilPitch: 0.023, recoilYaw: 0.01, pellets: 1, noiseRadius: 30, pattern: 'ramping' },
      secondary: { name: 'Mag-Shot (Wall Ricochet)', dmg: 35, headMult: 2.0, fireRateMs: 260, mag: 8, reloadMs: 1250, baseSpread: 0.004, moveSpread: 0.025, recoilPitch: 0.032, recoilYaw: 0.008, pellets: 1, noiseRadius: 28, pattern: 'ricochet' },
      defensive: { name: 'Kinetic Deflector (Block + Reload)', cdMs: 14000, durationMs: 1500 },
      ultimate: { name: 'Chrono Rewind (Recall 2.5s)', cost: 1050, durationMs: 6000 }
    }
  };

  const MAPS = {
    foundry: {
      id: 'foundry', name: 'The Foundry', subtitle: 'Elevated Metal Catwalks (1.8x Footstep Noise) & Smelting Vat',
      ambientColor: 0x2a1c17, fogColor: 0x140d0a, floorMat: 'concrete',
      spawns: [{ x: -22, y: 0, z: -22, yaw: -Math.PI * 0.75 }, { x: 22, y: 0, z: 22, yaw: Math.PI * 0.25 }],
      structures: [
        { x: 0, y: 2.5, z: 0, w: 9, h: 5, d: 9, mat: 'metal', color: 0x9a3412 },
        { x: -14, y: 3.6, z: 0, w: 5, h: 0.4, d: 36, mat: 'metal', color: 0x64748b, walkable: true },
        { x: 14, y: 3.6, z: 0, w: 5, h: 0.4, d: 36, mat: 'metal', color: 0x64748b, walkable: true },
        { x: 0, y: 3.6, z: -15, w: 23, h: 0.4, d: 4.5, mat: 'metal', color: 0x64748b, walkable: true },
        { x: 0, y: 3.6, z: 15, w: 23, h: 0.4, d: 4.5, mat: 'metal', color: 0x64748b, walkable: true },
        { x: -14, y: 1.8, z: -21, w: 5, h: 3.6, d: 6, mat: 'metal', color: 0x475569, ramp: true },
        { x: 14, y: 1.8, z: 21, w: 5, h: 3.6, d: 6, mat: 'metal', color: 0x475569, ramp: true },
        { x: -7, y: 2, z: -8, w: 3, h: 4, d: 3, mat: 'concrete', color: 0x57534e },
        { x: 7, y: 2, z: 8, w: 3, h: 4, d: 3, mat: 'concrete', color: 0x57534e }
      ],
      doors: []
    },
    subzero: {
      id: 'subzero', name: 'Sub-Zero Station', subtitle: 'Tight Lab Corridors, Interactive Blast Doors [F] & Snow Flanks',
      ambientColor: 0x1e293b, fogColor: 0x0f172a, floorMat: 'snow',
      spawns: [{ x: -23, y: 0, z: 0, yaw: -Math.PI / 2 }, { x: 23, y: 0, z: 0, yaw: Math.PI / 2 }],
      structures: [
        { x: 0, y: 2.5, z: -9, w: 24, h: 5, d: 2, mat: 'metal', color: 0xcbd5e1 },
        { x: 0, y: 2.5, z: 9, w: 24, h: 5, d: 2, mat: 'metal', color: 0xcbd5e1 },
        { x: -5, y: 2, z: 0, w: 3, h: 4, d: 3, mat: 'metal', color: 0x0284c7 },
        { x: 5, y: 2, z: 0, w: 3, h: 4, d: 3, mat: 'metal', color: 0x0284c7 },
        { x: 0, y: 1.8, z: -20, w: 12, h: 3.6, d: 3.5, mat: 'snow', color: 0xe2e8f0 },
        { x: 0, y: 1.8, z: 20, w: 12, h: 3.6, d: 3.5, mat: 'snow', color: 0xe2e8f0 }
      ],
      doors: [
        { id: 'cryo_west', x: -12, y: 2.5, z: 0, w: 1.5, h: 5, d: 8, open: false },
        { id: 'cryo_east', x: 12, y: 2.5, z: 0, w: 1.5, h: 5, d: 8, open: false }
      ]
    },
    overpass: {
      id: 'overpass', name: 'Overpass Hub', subtitle: 'Elevated Sniper Bridge Balanced by Flank Underpass',
      ambientColor: 0x1e2430, fogColor: 0x0f131a, floorMat: 'concrete',
      spawns: [{ x: -24, y: 0, z: -20, yaw: -Math.PI / 2 }, { x: 24, y: 0, z: 20, yaw: Math.PI / 2 }],
      structures: [
        { x: 0, y: 3.8, z: -16, w: 40, h: 0.4, d: 7, mat: 'concrete', color: 0x64748b, walkable: true },
        { x: -23, y: 1.9, z: -16, w: 6, h: 3.8, d: 6, mat: 'concrete', color: 0x475569, ramp: true },
        { x: 23, y: 1.9, z: -16, w: 6, h: 3.8, d: 6, mat: 'concrete', color: 0x475569, ramp: true },
        { x: 0, y: 2.2, z: 0, w: 18, h: 4.4, d: 4.5, mat: 'metal', color: 0x0369a1 },
        { x: -10, y: 2.2, z: 14, w: 12, h: 4.4, d: 2.5, mat: 'concrete', color: 0x334155 },
        { x: 10, y: 2.2, z: 14, w: 12, h: 4.4, d: 2.5, mat: 'concrete', color: 0x334155 }
      ],
      doors: []
    },
    sanctuary: {
      id: 'sanctuary', name: 'The Sanctuary', subtitle: 'Sound-Muffling Grass Courtyard (0.4x Noise) & Creaky Wood Shrine',
      ambientColor: 0x1a2e22, fogColor: 0x0b160f, floorMat: 'grass',
      spawns: [{ x: -22, y: 0, z: 22, yaw: -Math.PI / 4 }, { x: 22, y: 0, z: -22, yaw: (3 * Math.PI) / 4 }],
      structures: [
        { x: 0, y: 2.2, z: 0, w: 16, h: 0.4, d: 16, mat: 'wood', color: 0x92400e, walkable: true },
        { x: 0, y: 1.1, z: -10, w: 5, h: 2.2, d: 4, mat: 'wood', color: 0x78350f, ramp: true },
        { x: 0, y: 1.1, z: 10, w: 5, h: 2.2, d: 4, mat: 'wood', color: 0x78350f, ramp: true },
        { x: -15, y: 2.2, z: 0, w: 2.5, h: 4.4, d: 14, mat: 'wood', color: 0x7c2d12 },
        { x: 15, y: 2.2, z: 0, w: 2.5, h: 4.4, d: 14, mat: 'wood', color: 0x7c2d12 }
      ],
      doors: []
    },
    aegis: {
      id: 'aegis', name: 'Aegis Bunker', subtitle: 'Central Elevated Control Room & Dynamic Silo Doors [F]',
      ambientColor: 0x16242c, fogColor: 0x091116, floorMat: 'concrete',
      spawns: [{ x: 0, y: 0, z: -24, yaw: Math.PI }, { x: 0, y: 0, z: 24, yaw: 0 }],
      structures: [
        { x: 0, y: 2.6, z: 0, w: 15, h: 0.4, d: 15, mat: 'metal', color: 0x475569, walkable: true },
        { x: -9.5, y: 1.3, z: 0, w: 4, h: 2.6, d: 5, mat: 'metal', color: 0x334155, ramp: true },
        { x: 9.5, y: 1.3, z: 0, w: 4, h: 2.6, d: 5, mat: 'metal', color: 0x334155, ramp: true },
        { x: -16, y: 2.2, z: -12, w: 3, h: 4.4, d: 10, mat: 'concrete', color: 0x334155 },
        { x: 16, y: 2.2, z: 12, w: 3, h: 4.4, d: 10, mat: 'concrete', color: 0x334155 }
      ],
      doors: [
        { id: 'silo_north', x: 0, y: 2.5, z: -12, w: 8, h: 5, d: 1.5, open: true },
        { id: 'silo_south', x: 0, y: 2.5, z: 12, w: 8, h: 5, d: 1.5, open: true }
      ]
    }
  };

  const SURFACE_MULT = { metal: 1.8, wood: 1.6, concrete: 1.0, snow: 0.75, grass: 0.4 };

  // ==========================================================================
  // RAMP SLOPES: each ramp rises toward the walkable deck it touches
  // ==========================================================================
  function footprintContains(s, x, z, margin) {
    return Math.abs(x - s.x) <= s.w / 2 + margin && Math.abs(z - s.z) <= s.d / 2 + margin;
  }

  Object.values(MAPS).forEach((map) => {
    const decks = map.structures.filter((s) => s.walkable);
    map.structures.filter((s) => s.ramp).forEach((r) => {
      const probes = [
        { slope: '+x', x: r.x + r.w / 2 + 0.5, z: r.z },
        { slope: '-x', x: r.x - r.w / 2 - 0.5, z: r.z },
        { slope: '+z', x: r.x, z: r.z + r.d / 2 + 0.5 },
        { slope: '-z', x: r.x, z: r.z - r.d / 2 - 0.5 }
      ];
      const hit = probes.find((p) => decks.some((d) => footprintContains(d, p.x, p.z, 0)));
      r.slope = hit ? hit.slope : '+z';
    });
  });

  // ==========================================================================
  // SHARED MOVEMENT PHYSICS (client prediction, P2P host, Node server & bots)
  // ==========================================================================
  const PHYS = {
    ARENA_LIMIT: 27.8,  // Perimeter wall inner face (28.25) minus player radius
    RADIUS: 0.45,       // Player physical radius
    HEIGHT: 1.8,        // Player collision height (matches hitbox)
    STEP: 0.6,          // Max ledge height walked up without jumping
    SNAP: 0.5,          // Max drop that keeps a grounded player glued to the floor
    FOOT_MARGIN: 0.25,  // Ledge forgiveness when standing on an edge
    MAX_SUBSTEP: 0.25   // Long moves (dashes) are swept in chunks to avoid tunnelling
  };

  function getSolids(mapId, doors, deployables) {
    const map = MAPS[mapId];
    return [
      ...map.structures,
      ...(doors || []).filter((d) => !d.open),
      ...(deployables || []).filter((d) => d.type === 'barrier')
    ];
  }

  // Height of a solid's top surface at (x, z); ramps interpolate along their slope
  function surfaceTop(s, x, z) {
    const top = s.y + s.h / 2;
    if (!s.ramp) return top;
    const bottom = s.y - s.h / 2;
    let t;
    if (s.slope === '+x') t = (x - (s.x - s.w / 2)) / s.w;
    else if (s.slope === '-x') t = ((s.x + s.w / 2) - x) / s.w;
    else if (s.slope === '-z') t = ((s.z + s.d / 2) - z) / s.d;
    else t = (z - (s.z - s.d / 2)) / s.d;
    return bottom + Math.max(0, Math.min(1, t)) * (top - bottom);
  }

  function closestOnFootprint(s, x, z) {
    return {
      x: Math.max(s.x - s.w / 2, Math.min(s.x + s.w / 2, x)),
      z: Math.max(s.z - s.d / 2, Math.min(s.z + s.d / 2, z))
    };
  }

  // Highest surface under (x, z) that a player whose feet are at y can stand on
  function getFloorElevation(mapId, doors, deployables, x, y, z) {
    let floor = 0;
    for (const s of getSolids(mapId, doors, deployables)) {
      if (!footprintContains(s, x, z, PHYS.FOOT_MARGIN)) continue;
      const c = closestOnFootprint(s, x, z);
      const top = surfaceTop(s, c.x, c.z);
      if (top <= y + PHYS.STEP && top > floor) floor = top;
    }
    return floor;
  }

  // Lowest overhead surface (catwalk/deck underside) above a player at y
  function getCeiling(mapId, doors, deployables, x, y, z) {
    let ceil = Infinity;
    for (const s of getSolids(mapId, doors, deployables)) {
      if (!footprintContains(s, x, z, PHYS.RADIUS)) continue;
      const bottom = s.y - s.h / 2;
      if (bottom > y + PHYS.STEP && bottom < ceil) ceil = bottom;
    }
    return ceil;
  }

  function collidesAt(mapId, doors, deployables, x, y, z) {
    if (Math.abs(x) > PHYS.ARENA_LIMIT || Math.abs(z) > PHYS.ARENA_LIMIT) return true;
    const r = PHYS.RADIUS;
    for (const b of getSolids(mapId, doors, deployables)) {
      if (x + r <= b.x - b.w / 2 || x - r >= b.x + b.w / 2 ||
          z + r <= b.z - b.d / 2 || z - r >= b.z + b.d / 2) continue;
      const c = closestOnFootprint(b, x, z);
      const bottom = b.y - b.h / 2;
      const top = surfaceTop(b, c.x, c.z);
      // Blocked unless we fit fully underneath or can step up onto it
      if (y + PHYS.HEIGHT > bottom && y + PHYS.STEP < top) return true;
    }
    return false;
  }

  // Axis-separated sliding collision, swept in sub-steps so fast moves can't tunnel
  function slideMove(mapId, doors, deployables, x, y, z, dx, dz) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / PHYS.MAX_SUBSTEP));
    const sx = dx / steps, sz = dz / steps;
    let nx = x, nz = z;
    for (let i = 0; i < steps; i++) {
      // A door/barrier that closed on top of us must not trap us: let the player walk out
      const stuck = collidesAt(mapId, doors, deployables, nx, y, nz);
      if (stuck || !collidesAt(mapId, doors, deployables, nx + sx, y, nz)) nx += sx;
      if (stuck || !collidesAt(mapId, doors, deployables, nx, y, nz + sz)) nz += sz;
    }
    nx = Math.max(-PHYS.ARENA_LIMIT, Math.min(PHYS.ARENA_LIMIT, nx));
    nz = Math.max(-PHYS.ARENA_LIMIT, Math.min(PHYS.ARENA_LIMIT, nz));
    return { x: nx, z: nz };
  }

  function getSurfaceAt(map, x, y, z) {
    let best = null, bestTop = -Infinity;
    for (const s of map.structures) {
      if (!footprintContains(s, x, z, PHYS.FOOT_MARGIN)) continue;
      const c = closestOnFootprint(s, x, z);
      const top = surfaceTop(s, c.x, c.z);
      if (Math.abs(top - y) < 0.3 && top > bestTop) { best = s.mat; bestTop = top; }
    }
    return best || map.floorMat;
  }

  // Ray vs AABB (slab method)
  function intersectAABB(orig, dir, box) {
    const minX = box.x - box.w / 2, maxX = box.x + box.w / 2;
    const minY = box.y - box.h / 2, maxY = box.y + box.h / 2;
    const minZ = box.z - box.d / 2, maxZ = box.z + box.d / 2;
    let tmin = -Infinity, tmax = Infinity;
    const axes = [[orig.x, dir.x, minX, maxX], [orig.y, dir.y, minY, maxY], [orig.z, dir.z, minZ, maxZ]];
    for (const [o, d, mn, mx] of axes) {
      if (Math.abs(d) > 1e-6) {
        let t1 = (mn - o) / d, t2 = (mx - o) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) return null;
      } else if (o < mn || o > mx) return null;
    }
    return tmax >= 0 ? (tmin >= 0 ? tmin : tmax) : null;
  }

  // Ray vs map solid; ramps are wedges, so march through the box to find the slope
  function intersectSolid(orig, dir, s) {
    const t0 = intersectAABB(orig, dir, s);
    if (t0 === null || !s.ramp) return t0;
    for (let t = t0; t < t0 + 12; t += 0.1) {
      const px = orig.x + dir.x * t, py = orig.y + dir.y * t, pz = orig.z + dir.z * t;
      if (!footprintContains(s, px, pz, 0.01)) { if (t > t0) break; continue; }
      if (py <= surfaceTop(s, px, pz)) return t;
    }
    return null;
  }

  // ==========================================================================
  // RESPAWN & AI DUELIST (run by whichever side is authoritative: Node server or P2P host)
  // ==========================================================================
  const RESPAWN_MS = 3000;

  // ==========================================================================
  // ENDLESS MODE MAP ROTATION & HERO SWAPPING
  // ==========================================================================
  const ENDLESS_ROUND_SECS = 300; // Each arena lasts 5 minutes
  const MAP_ORDER = Object.keys(MAPS);

  // Swap a player's operative (allowed while eliminated); takes effect fully on respawn
  function applyHero(p, heroId) {
    const h = HEROES[heroId];
    if (!h) return false;
    p.heroId = h.id;
    p.maxHp = h.maxHp;
    p.ultMax = h.ultimate.cost;
    p.ultCharge = Math.min(p.ultCharge, p.ultMax);
    p.weaponSlot = 'primary';
    p.ammo = { primary: h.primary.mag, secondary: h.secondary.mag };
    p.reloadingUntil = 0;
    p.defCdUntil = 0;
    p.defActiveUntil = 0;
    p.ultActiveUntil = 0;
    return true;
  }

  // Advance to the next arena: fresh doors/deployables, everyone revived at their own side's spawn.
  // Scores carry over. Caller broadcasts the new match state (which carries each player's new tpSeq).
  function rotateMap(room) {
    const next = MAP_ORDER[(MAP_ORDER.indexOf(room.mapId) + 1) % MAP_ORDER.length];
    const map = MAPS[next];
    room.mapId = next;
    room.doors = JSON.parse(JSON.stringify(map.doors));
    room.deployables = [];
    room.timeRemaining = ENDLESS_ROUND_SECS;
    room.round = (room.round || 1) + 1;
    for (const p of Object.values(room.players)) {
      const sp = map.spawns[p.spawnIdx || 0];
      const h = HEROES[p.heroId];
      p.x = sp.x; p.y = sp.y; p.z = sp.z; p.yaw = sp.yaw;
      p.dead = false; p.respawnAt = 0;
      p.hp = p.maxHp; p.armor = 0;
      p.ammo = { primary: h.primary.mag, secondary: h.secondary.mag };
      p.reloadingUntil = 0; p.slowedUntil = 0; p.blackoutUntil = 0; p.revealedUntil = 0;
      p.history = [];
      p.botSeenAt = 0; p.botLastTarget = null;
      p.tpSeq++;
    }
  }

  // Spawn node farthest from every living opponent
  function pickRespawn(room, victim) {
    const map = MAPS[room.mapId];
    const foes = Object.values(room.players).filter((p) => p.id !== victim.id && !p.dead);
    let best = map.spawns[0], bestDist = -1;
    for (const s of map.spawns) {
      const d = foes.length ? Math.min(...foes.map((f) => Math.hypot(f.x - s.x, f.z - s.z))) : 0;
      if (d > bestDist) { best = s; bestDist = d; }
    }
    return best;
  }

  const BOT = {
    REACTION_MS: 700,        // Delay between first seeing you and pulling the trigger
    REACQUIRE_MS: 350,       // Shorter delay if it only lost sight of you briefly
    MIN_FIRE_GAP_MS: 950,    // Never shoots faster than this...
    FIRE_GAP_MULT: 2.4,      // ...or than 2.4x the weapon's own fire interval
    FIRE_JITTER_MS: 450,     // Random extra delay so its rhythm isn't robotic
    MAX_RANGE: 34,           // Won't engage beyond this distance
    NEAR_RANGE: 10,          // Backs off when closer than this...
    FAR_RANGE: 18,           // ...and closes in when farther than this
    BASE_SPREAD: 0.07,       // Much looser than a player standing still
    RANGE_SPREAD: 0.0025,    // Extra spread per metre of distance
    MOVING_TARGET_SPREAD: 0.06,
    DMG_MULT: 0.5,
    PELLET_DMG_MULT: 0.5,    // Extra cut for shotguns, which fire many pellets per shot
    AIM_HEIGHT: 1.0          // Aims at the chest, not the head
  };

  // hooks: { noise(p, radius, type), shoot(p, weapon, origin, dir, dmgMult) }
  function updateBot(room, p, now, hooks) {
    if (p.dead) return;
    const target = Object.values(room.players).find((h) => !h.isBot && !h.dead);
    const hero = HEROES[p.heroId];
    const w = hero.primary;

    // Finish an in-progress reload (bots never skip the empty-mag window)
    if (p.reloadingUntil && now >= p.reloadingUntil) { p.ammo.primary = w.mag; p.reloadingUntil = 0; }

    if (!target) { p.botSeenAt = 0; return; } // Opponent respawning: hold position
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    const dist = Math.hypot(dx, dz) || 1;
    p.yaw = Math.atan2(-dx, -dz);

    // Line of sight check against all solid cover
    const eye = { x: p.x, y: p.y + 1.5, z: p.z };
    const aimY = target.y + BOT.AIM_HEIGHT - eye.y;
    const aimLen = Math.hypot(dx, aimY, dz) || 1;
    const aimDir = { x: dx / aimLen, y: aimY / aimLen, z: dz / aimLen };
    let wallBlocked = false;
    for (const b of getSolids(room.mapId, room.doors, room.deployables)) {
      const t = intersectSolid(eye, aimDir, b);
      if (t !== null && t < aimLen) { wallBlocked = true; break; }
    }

    // Hold a duelling distance instead of charging to point-blank: approach when far, back off when
    // too close, strafe sideways in between; wander around cover when it has no sight line.
    const fx = dx / dist, fz = dz / dist;
    let moveX, moveZ;
    if (wallBlocked) {
      p.patrolAngle += 0.03;
      moveX = Math.cos(p.patrolAngle) * 0.18 + fx * 0.08;
      moveZ = Math.sin(p.patrolAngle) * 0.18 + fz * 0.08;
    } else {
      const radial = dist > BOT.FAR_RANGE ? 0.17 : (dist < BOT.NEAR_RANGE ? -0.14 : 0);
      if (!p.strafeFlipAt || now > p.strafeFlipAt) {
        p.strafeDir = Math.random() < 0.5 ? -1 : 1;
        p.strafeFlipAt = now + 900 + Math.random() * 1600;
      }
      const side = 0.11 * p.strafeDir;
      moveX = fx * radial - fz * side;
      moveZ = fz * radial + fx * side;
    }
    const next = slideMove(room.mapId, room.doors, room.deployables, p.x, p.y, p.z, moveX, moveZ);
    p.x = next.x; p.z = next.z;
    p.y = getFloorElevation(room.mapId, room.doors, room.deployables, p.x, p.y, p.z);

    if (now - p.lastStepAt > 420) {
      p.lastStepAt = now;
      hooks.noise(p, 16, 'footstep');
    }

    // Reaction time: track when it acquired the target; brief occlusions get a shorter re-acquire
    const canSee = !wallBlocked && dist <= BOT.MAX_RANGE;
    if (canSee) {
      if (!p.botSeenAt) p.botSeenAt = now + (now - (p.botLostAt || 0) < 1500 ? BOT.REACQUIRE_MS : BOT.REACTION_MS);
    } else if (p.botSeenAt) {
      p.botSeenAt = 0; p.botLostAt = now;
    }

    // Estimate how fast the target is strafing (sampled every tick)
    const tSpeed = p.botLastTarget ? Math.hypot(target.x - p.botLastTarget.x, target.z - p.botLastTarget.z) : 0;
    p.botLastTarget = { x: target.x, z: target.z };

    if (!canSee || now < p.botSeenAt || p.reloadingUntil || now < (p.botNextShotAt || 0)) return;

    if (p.ammo.primary <= 0) { p.reloadingUntil = now + w.reloadMs; return; }
    p.ammo.primary--;
    p.lastShotAt = now;
    p.botNextShotAt = now + Math.max(BOT.MIN_FIRE_GAP_MS, w.fireRateMs * BOT.FIRE_GAP_MULT) + Math.random() * BOT.FIRE_JITTER_MS;
    hooks.noise(p, w.noiseRadius, 'gunfire');

    const spread = BOT.BASE_SPREAD + dist * BOT.RANGE_SPREAD + (tSpeed > 0.1 ? BOT.MOVING_TARGET_SPREAD : 0);
    for (let i = 0; i < (w.pellets || 1); i++) {
      const rx = aimDir.x + (Math.random() - 0.5) * spread;
      const ry = aimDir.y + (Math.random() - 0.5) * spread;
      const rz = aimDir.z + (Math.random() - 0.5) * spread;
      const l = Math.hypot(rx, ry, rz) || 1;
      const mult = BOT.DMG_MULT * ((w.pellets || 1) > 1 ? BOT.PELLET_DMG_MULT : 1);
      hooks.shoot(p, w, eye, { x: rx / l, y: ry / l, z: rz / l }, mult);
    }
  }

  // Network-safe copy of the player table (rewind history stays on the authority)
  function publicPlayers(players) {
    const out = {};
    for (const id of Object.keys(players)) {
      const { history, ...pub } = players[id];
      out[id] = pub;
    }
    return out;
  }

  return {
    HEROES, MAPS, SURFACE_MULT, PHYS, publicPlayers, RESPAWN_MS, BOT, pickRespawn, updateBot,
    ENDLESS_ROUND_SECS, MAP_ORDER, applyHero, rotateMap,
    getSolids, surfaceTop, getFloorElevation, getCeiling, collidesAt, slideMove,
    getSurfaceAt, intersectAABB, intersectSolid
  };
});
