const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Replace app.use(express.static(path.join(__dirname, 'public'))); with:
app.use(express.static(__dirname));

// Heroes, maps and movement physics are shared with the browser client so that
// collision, spawns and weapon stats match exactly on both ends.
const {
  HEROES, MAPS, SURFACE_MULT, PHYS, publicPlayers, RESPAWN_MS, pickRespawn, updateBot,
  ENDLESS_ROUND_SECS, applyHero, rotateMap,
  getSolids, getSurfaceAt, slideMove, intersectAABB, intersectSolid
} = require('./shared.js');

const REWIND_MS = 2500;


// ============================================================================
// 3. ROOMS, STATE & 3D RAYCASTING ENGINE
// ============================================================================
const rooms = {};

function createPlayerState(id, name, heroId, spawn, isBot = false, spawnIdx = 0) {
  const hero = HEROES[heroId] || HEROES.vex;
  return {
    id, name, isBot, spawnIdx,
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
    lastStepAt: 0,
    stepDist: 0,
    tpSeq: 0,       // Bumped on every server-side teleport; stale client moveUpdates are dropped
    dead: false,    // Eliminated and waiting out the respawn cooldown
    respawnAt: 0,
    killedBy: '',
    patrolAngle: 0,
    history: []     // Used for Volt's Chrono Rewind
  };
}

function sendMatchState(room) {
  io.to(room.id).emit('matchState', {
    roomId: room.id,
    mapId: room.mapId,
    mode: room.mode,
    timeRemaining: room.timeRemaining,
    round: room.round,
    doors: room.doors,
    players: publicPlayers(room.players)
  });
}

// Server moved a player (dash, rewind, respawn): tell the owning client to adopt the new position
function teleportPlayer(room, p) {
  p.tpSeq++;
  p.history = [];
  io.to(room.id).emit('teleport', { id: p.id, x: p.x, y: p.y, z: p.z, yaw: p.yaw, seq: p.tpSeq });
}

function emitAcousticPing(room, sourcePlayer, baseRadius, type) {
  const now = Date.now();
  // Sable Shadow Stalker ult makes footsteps 100% silent
  if (type === 'footstep' && sourcePlayer.heroId === 'sable' &&
      (now < sourcePlayer.ultActiveUntil || now < sourcePlayer.defActiveUntil)) {
    return;
  }
  const map = MAPS[room.mapId];
  const mat = getSurfaceAt(map, sourcePlayer.x, sourcePlayer.y, sourcePlayer.z);
  const mult = SURFACE_MULT[mat] || 1.0;
  const effectiveRadius = baseRadius * mult;
  if (effectiveRadius <= 0.5) return;

  for (const pid of Object.keys(room.players)) {
    if (pid === sourcePlayer.id) continue;
    const listener = room.players[pid];
    const dist = Math.hypot(listener.x - sourcePlayer.x, listener.z - sourcePlayer.z);
    if (dist <= effectiveRadius) {
      io.to(pid).emit('acousticPing', {
        ownerId: sourcePlayer.id,
        x: sourcePlayer.x, y: sourcePlayer.y, z: sourcePlayer.z,
        surface: mat, type, radius: effectiveRadius,
        intensity: Math.max(0.2, 1 - dist / effectiveRadius)
      });
    }
  }
}

// ============================================================================
// 4. SOCKET.IO CONNECTION & EVENT HANDLERS
// ============================================================================
io.on('connection', (socket) => {
  socket.emit('initCatalog', { heroes: HEROES, maps: MAPS });

  socket.on('joinMatch', ({ roomId, playerName, heroId, mapId, mode, spawnBot } = {}) => {
    const rId = String(roomId || 'duel-1').trim().toLowerCase();

    if (!rooms[rId]) {
      const chosenMap = MAPS[mapId] ? mapId : 'foundry';
      rooms[rId] = {
        id: rId,
        mapId: chosenMap,
        mode: ['timer', 'endless'].includes(mode) ? mode : 'stock',
        timeRemaining: mode === 'endless' ? ENDLESS_ROUND_SECS : 180,
        round: 1,
        suddenDeath: false,
        over: false,
        players: {},
        deployables: [],
        doors: JSON.parse(JSON.stringify(MAPS[chosenMap].doors))
      };
    }

    const room = rooms[rId];
    const humans = Object.values(room.players).filter((p) => !p.isBot && p.id !== socket.id);
    if (humans.length >= 2) {
      socket.emit('joinError', `Room "${rId}" is full (1v1).`);
      return;
    }
    if (room.over) {
      socket.emit('joinError', `The match in room "${rId}" has already ended.`);
      return;
    }

    socket.join(rId);
    socket.roomId = rId;
    const map = MAPS[room.mapId];

    // A real opponent replaces the AI, and takes whichever spawn the other human isn't using
    const botId = 'bot_' + rId;
    if (humans.length > 0) delete room.players[botId];
    const idx = humans.length > 0 ? 1 - (humans[0].spawnIdx || 0) : 0;

    room.players[socket.id] = createPlayerState(
      socket.id,
      String(playerName || 'Operative').slice(0, 24),
      heroId,
      map.spawns[idx],
      false,
      idx
    );

    if (spawnBot && humans.length === 0) {
      const botHeroes = Object.keys(HEROES).filter((h) => h !== heroId);
      const botHero = botHeroes[Math.floor(Math.random() * botHeroes.length)];
      room.players[botId] = createPlayerState(
        botId,
        `BOT // ${HEROES[botHero].name}`,
        botHero,
        map.spawns[1 - idx],
        true,
        1 - idx
      );
    }

    sendMatchState(room);
  });

  socket.on('moveUpdate', (data) => {
    const room = rooms[socket.roomId];
    if (!room || room.over || !data) return;
    const p = room.players[socket.id];
    if (!p || p.dead) return;
    if ((data.tpSeq || 0) !== p.tpSeq) return; // Sent before a teleport reached the client
    if (![data.x, data.y, data.z].every(Number.isFinite)) return;

    const movedDist = Math.hypot(data.x - p.x, data.z - p.z);
    p.x = Math.max(-PHYS.ARENA_LIMIT, Math.min(PHYS.ARENA_LIMIT, data.x));
    p.y = Math.max(0, Math.min(10, data.y));
    p.z = Math.max(-PHYS.ARENA_LIMIT, Math.min(PHYS.ARENA_LIMIT, data.z));
    p.yaw = Number(data.yaw) || 0;
    p.pitch = Number(data.pitch) || 0;
    p.stance = ['stand', 'walk', 'crouch'].includes(data.stance) ? data.stance : 'stand';

    // Record history for Volt's Chrono Rewind
    const now = Date.now();
    p.history.push({ t: now, x: p.x, y: p.y, z: p.z, hp: p.hp });
    while (p.history.length && now - p.history[0].t > REWIND_MS) p.history.shift();

    // Footsteps from distance travelled, independent of client update rate
    if (p.stance === 'crouch') {
      p.stepDist = 0;
    } else {
      p.stepDist += movedDist;
      if (p.stepDist > 0.4 && now - p.lastStepAt > (p.stance === 'walk' ? 520 : 310)) {
        p.lastStepAt = now;
        p.stepDist = 0;
        emitAcousticPing(room, p, p.stance === 'walk' ? 4.5 : 18.0, 'footstep');
      }
    }
  });

  // Eliminated players redeploy only when they ask to, once the cooldown has elapsed
  socket.on('requestRespawn', () => {
    const room = rooms[socket.roomId];
    const p = room && room.players[socket.id];
    if (!p || !p.dead || Date.now() < p.respawnAt) return;
    respawnPlayer(room, p);
  });

  // Pick a different operative while eliminated
  socket.on('selectHero', (heroId) => {
    const room = rooms[socket.roomId];
    const p = room && room.players[socket.id];
    if (!p || !p.dead || p.heroId === heroId) return;
    applyHero(p, heroId);
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
    if (p.dead) return;
    const slot = p.weaponSlot;
    const w = HEROES[p.heroId][slot];
    const now = Date.now();
    if (now < p.reloadingUntil || p.ammo[slot] === w.mag) return;
    p.reloadingUntil = now + w.reloadMs;
    setTimeout(() => {
      if (room.players[socket.id]) room.players[socket.id].ammo[slot] = w.mag;
    }, w.reloadMs);
  });

  socket.on('toggleDoor', () => {
    const room = rooms[socket.roomId];
    if (!room || !room.players[socket.id]) return;
    const p = room.players[socket.id];
    if (p.dead) return;
    let changed = false;
    for (const d of room.doors) {
      if (Math.hypot(p.x - d.x, p.z - d.z) <= 8.5) {
        if (d.lockedUntil && Date.now() < d.lockedUntil) continue;
        d.open = !d.open;
        changed = true;
      }
    }
    if (changed) {
      emitAcousticPing(room, p, 28, 'door');
      io.to(room.id).emit('doorState', room.doors);
    }
  });

  socket.on('useAbility', (type) => {
    const room = rooms[socket.roomId];
    if (!room || room.over || !room.players[socket.id]) return;
    const p = room.players[socket.id];
    if (p.dead) return;
    const hero = HEROES[p.heroId];
    const now = Date.now();

    if (type === 'defensive') {
      if (now < p.defCdUntil || now < p.blackoutUntil) return;
      p.defCdUntil = now + hero.defensive.cdMs;
      p.defActiveUntil = now + hero.defensive.durationMs;

      if (p.heroId === 'vex') {
        // Phase Step dash along facing vector (swept, so it can't pass through walls)
        const pos = slideMove(room.mapId, room.doors, room.deployables, p.x, p.y, p.z,
          -Math.sin(p.yaw) * 6.0, -Math.cos(p.yaw) * 6.0);
        p.x = pos.x; p.z = pos.z;
        teleportPlayer(room, p);
      } else if (p.heroId === 'cipher') {
        room.deployables.push({
          id: 'smoke_' + now, owner: p.id, type: 'smoke',
          x: p.x - Math.sin(p.yaw) * 6.5, y: p.y + 1.8, z: p.z - Math.cos(p.yaw) * 6.5,
          w: 8.5, h: 3.8, d: 3.0, hp: 9999, expiresAt: now + 6000
        });
      } else if (p.heroId === 'bastion') {
        room.deployables.push({
          id: 'barrier_' + now, owner: p.id, type: 'barrier',
          x: p.x - Math.sin(p.yaw) * 3.2, y: p.y + 1.1, z: p.z - Math.cos(p.yaw) * 3.2,
          w: 4.2, h: 2.2, d: 0.8, hp: 320, expiresAt: now + 7000
        });
      } else if (p.heroId === 'sable') {
        // Emit decoy footsteps forward
        emitAcousticPing(room, {
          ...p,
          id: p.id + '_decoy',
          x: p.x - Math.sin(p.yaw) * 9,
          z: p.z - Math.cos(p.yaw) * 9
        }, 28, 'decoy');
      } else if (p.heroId === 'volt') {
        p.ammo.primary = hero.primary.mag;
      }
    } else if (type === 'ultimate') {
      if (p.ultCharge < p.ultMax) return;
      p.ultCharge = 0;
      p.ultActiveUntil = now + hero.ultimate.durationMs;

      // Apply 1v1 turnaround ultimate effects
      for (const pid of Object.keys(room.players)) {
        const target = room.players[pid];
        if (pid === p.id || target.dead) continue;
        if (p.heroId === 'vex') {
          target.revealedUntil = now + 6500;
        } else if (p.heroId === 'krosh') {
          p.armor = 50;
          if (Math.hypot(target.x - p.x, target.z - p.z) <= 18) {
            target.slowedUntil = now + 3500;
          }
        } else if (p.heroId === 'cipher') {
          target.revealedUntil = now + 6500;
          target.blackoutUntil = now + 4000;
          target.defCdUntil = Math.max(target.defCdUntil, now + 4000);
        } else if (p.heroId === 'bastion') {
          room.doors.forEach((d) => { d.open = false; d.lockedUntil = now + 6000; });
          io.to(room.id).emit('doorState', room.doors);
          if (Math.hypot(target.x - p.x, target.z - p.z) <= 16) {
            applyDamage(room, p, target, 45, 'Lockdown Zap');
          }
        }
      }

      if (p.heroId === 'volt' && p.history.length > 0) {
        const snap = p.history[0];
        p.x = snap.x; p.y = snap.y; p.z = snap.z;
        p.hp = Math.max(p.hp, snap.hp);
        p.ammo.primary = hero.primary.mag;
        teleportPlayer(room, p);
      }
    }
  });

  socket.on('fireWeapon', ({ origin, dir, spread } = {}) => {
    const room = rooms[socket.roomId];
    if (!room || room.over || !room.players[socket.id]) return;
    if (!origin || !dir) return;
    const shooter = room.players[socket.id];
    const now = Date.now();
    if (shooter.dead || now < shooter.reloadingUntil) return;

    const hero = HEROES[shooter.heroId];
    const weapon = hero[shooter.weaponSlot];
    if (shooter.ammo[shooter.weaponSlot] <= 0) return;

    shooter.ammo[shooter.weaponSlot]--;
    shooter.lastShotAt = now;
    emitAcousticPing(room, shooter, weapon.noiseRadius, 'gunfire');

    // Client reports its movement/recoil spread; never tighter than the weapon allows
    const sp = Math.max(weapon.baseSpread, Math.min(0.4, Number(spread) || 0));
    const pellets = weapon.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const rx = dir.x + (Math.random() - 0.5) * sp;
      const ry = dir.y + (Math.random() - 0.5) * sp;
      const rz = dir.z + (Math.random() - 0.5) * sp;
      const len = Math.hypot(rx, ry, rz) || 1;
      resolveHitscan(room, shooter, weapon, origin, { x: rx / len, y: ry / len, z: rz / len }, 1.0);
    }
  });

  socket.on('disconnect', () => {
    const room = rooms[socket.roomId];
    if (room && room.players[socket.id]) {
      delete room.players[socket.id];
      if (Object.values(room.players).filter((p) => !p.isBot).length === 0) {
        delete rooms[socket.roomId];
      } else {
        sendMatchState(room);
      }
    }
  });
});

function resolveHitscan(room, shooter, weapon, origin, rayDir, dmgMultiplier) {
  let nearestWallDist = 65;
  for (const box of getSolids(room.mapId, room.doors, room.deployables)) {
    const t = intersectSolid(origin, rayDir, box);
    if (t !== null && t < nearestWallDist) nearestWallDist = t;
  }

  // Check player hitboxes
  let hitTarget = null;
  let hitDist = Infinity;
  let isHeadshot = false;
  const reach = weapon.pattern === 'wallbang' ? nearestWallDist + 2.5 : nearestWallDist;

  for (const pid of Object.keys(room.players)) {
    const target = room.players[pid];
    if (pid === shooter.id || target.dead) continue;
    const bodyBox = { x: target.x, y: target.y + 0.9, z: target.z, w: 0.95, h: 1.8, d: 0.95 };
    const t = intersectAABB(origin, rayDir, bodyBox);
    if (t !== null && t < hitDist && t < reach) {
      hitDist = t;
      hitTarget = target;
      isHeadshot = origin.y + rayDir.y * t >= target.y + 1.38;
    }
  }

  const endDist = hitTarget ? hitDist : nearestWallDist;
  const endPt = {
    x: origin.x + rayDir.x * endDist,
    y: origin.y + rayDir.y * endDist,
    z: origin.z + rayDir.z * endDist
  };
  io.to(room.id).emit('tracerFx', { start: origin, end: endPt, color: HEROES[shooter.heroId].color, hitPlayer: !!hitTarget });

  const now = Date.now();
  if (hitTarget) {
    // Bastion wallbang loses damage through cover
    const wallbangMult = hitDist >= nearestWallDist ? 0.6 : 1.0;

    // Check defensive abilities (Vex Phase Step i-frames, Krosh Shield, Volt Deflector)
    if (now < hitTarget.defActiveUntil && ['vex', 'krosh', 'volt'].includes(hitTarget.heroId)) {
      io.to(room.id).emit('hitMarker', { shooterId: shooter.id, blocked: true });
      return;
    }

    const rawDmg = weapon.dmg * (isHeadshot ? weapon.headMult : 1.0) * dmgMultiplier * wallbangMult;
    applyDamage(room, shooter, hitTarget, Math.round(rawDmg), weapon.name, isHeadshot);
  } else if (weapon.pattern === 'ricochet' && dmgMultiplier === 1.0 && nearestWallDist < 60) {
    // Volt's Mag-Shot single wall bounce with bonus damage
    const back = nearestWallDist - 0.05;
    const hitPoint = { x: origin.x + rayDir.x * back, y: origin.y + rayDir.y * back, z: origin.z + rayDir.z * back };
    resolveHitscan(room, shooter, weapon, hitPoint, { x: -rayDir.x, y: rayDir.y, z: -rayDir.z }, 1.3);
  }
}

function applyDamage(room, attacker, victim, dmg, sourceName, isHeadshot = false) {
  const now = Date.now();
  if (victim.dead) return;
  attacker.ultCharge = Math.min(attacker.ultMax, attacker.ultCharge + dmg * 2.4);
  victim.ultCharge = Math.min(victim.ultMax, victim.ultCharge + dmg * 1.4);

  if (victim.armor > 0) {
    const absorbed = Math.min(victim.armor, dmg);
    victim.armor -= absorbed;
    dmg -= absorbed;
  }
  victim.hp -= dmg;

  // Sable Shadow Stalker emergency reload under 35 HP
  if (victim.heroId === 'sable' && now < victim.ultActiveUntil && victim.hp > 0 && victim.hp <= 35) {
    victim.ammo.primary = HEROES.sable.primary.mag;
  }

  // Volt Chrono Rewind auto-saves from fatal damage if active
  if (victim.hp <= 0 && victim.heroId === 'volt' && now < victim.ultActiveUntil && victim.history.length > 0) {
    const snap = victim.history[0];
    victim.x = snap.x; victim.y = snap.y; victim.z = snap.z;
    victim.hp = 35;
    victim.ultActiveUntil = 0;
    teleportPlayer(room, victim);
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

    // Down for at least RESPAWN_MS; humans then press to respawn, bots return automatically
    victim.hp = 0;
    victim.dead = true;
    victim.respawnAt = now + RESPAWN_MS;
    victim.killedBy = attacker.name;
    victim.defActiveUntil = 0;
    victim.ultActiveUntil = 0;
  }
}

function respawnPlayer(room, p) {
  const spawn = pickRespawn(room, p);
  const hero = HEROES[p.heroId];
  p.dead = false;
  p.respawnAt = 0;
  p.hp = p.maxHp;
  p.armor = 0;
  p.x = spawn.x; p.y = spawn.y; p.z = spawn.z; p.yaw = spawn.yaw;
  p.ammo.primary = hero.primary.mag;
  p.ammo.secondary = hero.secondary.mag;
  p.reloadingUntil = 0;
  p.slowedUntil = 0;
  p.blackoutUntil = 0;
  p.botSeenAt = 0;
  teleportPlayer(room, p);
}

// ============================================================================
// 5. SERVER AUTHORITATIVE TICK LOOP (20 Hz State Sync + 1 Hz Match Clock)
// ============================================================================
const botHooks = (room) => ({
  noise: (p, radius, type) => emitAcousticPing(room, p, radius, type),
  shoot: (p, weapon, origin, dir, mult) => resolveHitscan(room, p, weapon, origin, dir, mult)
});

setInterval(() => {
  const now = Date.now();
  for (const rId of Object.keys(rooms)) {
    const room = rooms[rId];
    if (room.over) continue;

    room.deployables = room.deployables.filter((d) => d.expiresAt > now && d.hp > 0);

    for (const p of Object.values(room.players)) {
      if (p.dead) {
        if (p.isBot && now >= p.respawnAt) respawnPlayer(room, p); // Humans press to respawn
        continue;
      }
      p.ultCharge = Math.min(p.ultMax, p.ultCharge + 0.7);
      if (p.isBot) updateBot(room, p, now, botHooks(room));
      if (room.over) break;
    }

    io.to(rId).emit('worldTick', {
      players: publicPlayers(room.players),
      deployables: room.deployables
    });
  }
}, 50);

// 1-Second Match Timer Loop
setInterval(() => {
  for (const rId of Object.keys(rooms)) {
    const room = rooms[rId];
    if (room.over) continue;
    if (room.mode === 'endless') {
      // Rotate arenas every 5 minutes for as long as anyone is playing
      room.timeRemaining--;
      if (room.timeRemaining <= 0) {
        rotateMap(room);
        sendMatchState(room);
      }
      io.to(rId).emit('timerSync', room.timeRemaining);
      continue;
    }
    if (Object.keys(room.players).length < 2) continue;
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
