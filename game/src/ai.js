/**
 * The Rival Clan (design doc section 11): gather, train, defend, raid, replace losses.
 * Deliberately simple and readable. Ticks once a second.
 */
import { TEAM, LAYOUT, UNITS, BUILDINGS } from './config.js';
import { heightAt } from './terrain.js';

const R = TEAM.RIVAL;
const GAPS = [[41, 41], [-42, -42]];   // the two passages through the forest; the spirit's clearing is avoided

export class RivalAI {
  constructor(game) {
    this.g = game; this.t = 0; this.tick = 0;
    this.nextWave = 300;        // minute 5: the first patrol
    this.waveN = 0;
    this.building = false;
  }
  update(dt) {
    this.t += dt; this.tick -= dt;
    if (this.tick > 0 || this.g.over) return;
    this.tick = 1;
    const g = this.g, T = g.teams[R];
    const grod = g.grodOf(R);
    const units = g.alive(R);
    const by = (ut) => units.filter((u) => u.ut === ut);
    const vietras = by('vietra'), zhercas = by('zherca');
    const military = units.filter((u) => u.def.kind === 'mil' || u.def.kind === 'beast');

    // keep the economy dancing
    for (const v of vietras) if (!v.order && grod) g.dance([v]);
    for (const z of zhercas) if (!z.order) { const s = g.freeShrine(R, z); if (s) g.rite([z], s); }

    if (grod) {
      const q = grod.queue.length;
      if (!q && vietras.length < 6) g.train(grod, 'vietra');
      else if (!q && zhercas.length < 2 + g.aliveB(R, 'shrine').length - 1) g.train(grod, 'zherca');
    }
    // supply
    const cap = g.supplyCap(R), used = g.supplyUsed(R);
    if (cap - used <= 3 && cap < 60 && !this.building && T.wind >= BUILDINGS.khata.wind && vietras.length > 2) this.buildNear('khata', vietras);
    // a sacred grove later on
    if (this.t > 360 && !g.aliveB(R, 'grove').length && !this.building && T.wind >= 150 && T.rain >= 50 && zhercas.length) this.buildNear('grove', zhercas);
    // contest the exposed spring after minute 8
    const exposed = g.springs[1];
    if (this.t > 480 && !exposed.shrine && !this.building && T.wind >= 75 && zhercas.length > 1 && !this.expanding) {
      this.expanding = true;
      const z = zhercas.find((z) => z.order?.type === 'rite') || zhercas[0];
      this.building = true;
      g.build(z, 'shrine', exposed.x, exposed.z).then((r) => { this.building = false; if (!r.ok) this.expanding = false; });
      military.slice(0, 2).forEach((m) => g.order(m, { type: 'amove', x: exposed.x + 3, z: exposed.z - 3 }));
    }

    // production
    for (const h of g.aliveB(R, 'warhall')) {
      if (!h.built || h.queue.length >= 2) continue;
      const roll = Math.random();
      const ut = T.rain >= 50 && roll < 0.2 ? 'deer' : T.rain >= 25 && roll < 0.55 ? 'vitez' : 'streletz';
      g.train(h, ut);
    }
    for (const h of g.aliveB(R, 'grove')) if (h.built && !h.queue.length && Math.random() < 0.5) g.train(h, 'bear');

    // defend: anything hit near home pulls the home army
    const home = LAYOUT.rivalGrod;
    const hurt = g.buildings.find((b) => b.team === R && !b.dead && g.time - b.lastHitT < 4 && b.lastHitBy && !b.lastHitBy.dead);
    const hurtU = units.find((u) => u.lastHitBy && !u.lastHitBy.dead && u.lastHitBy.team !== R && Math.hypot(u.x - home[0], u.z - home[1]) < 40);
    const threat = hurt?.lastHitBy || hurtU?.lastHitBy;
    if (threat && threat.team === TEAM.PLAYER) {
      for (const m of military) if (!m.wave && (!m.order || m.order.type !== 'attack') && Math.hypot(m.x - home[0], m.z - home[1]) < 50) g.order(m, { type: 'attack', target: threat });
    }
    // idle home guard drifts back to its post
    for (const m of military) if (!m.order && !m.wave && Math.hypot(m.x - home[0], m.z - home[1]) > 30) g.order(m, { type: 'move', x: home[0] - 10 + Math.random() * 6, z: home[1] + 14 + Math.random() * 6 });

    // raids
    if (this.t >= this.nextWave) {
      const guard = 3;
      const avail = military.filter((m) => !m.wave).sort((a, b) => b.def.hp - a.def.hp);
      const size = this.waveN === 0 ? 3 : Math.min(4 + this.waveN * 2, 14);
      if (avail.length >= Math.min(size, 3) + (this.waveN === 0 ? 0 : guard)) {
        const team = avail.slice(0, Math.min(size, avail.length - (this.waveN === 0 ? 0 : guard)));
        const target = this.pickTarget();
        const gap = GAPS[this.waveN % 2];
        for (const m of team) {
          m.wave = true;
          g.order(m, { type: 'amove', x: gap[0] + Math.random() * 3, z: gap[1] + Math.random() * 3 });
          m.next.push({ type: 'amove', x: target[0], z: target[1] });
        }
        g.emit('raid', team.length);
        this.waveN++;
        this.nextWave = this.t + 150 + Math.random() * 40;
      } else this.nextWave = this.t + 20;
    }
    // raiders who ran out of orders go looking again
    for (const m of military) if (m.wave && !m.order) { const t = this.pickTarget(); g.order(m, { type: 'amove', x: t[0], z: t[1] }); }
  }
  pickTarget() {
    const g = this.g;
    const mine = g.buildings.filter((b) => b.team === TEAM.PLAYER && !b.dead);
    if (!mine.length) { const u = g.alive(TEAM.PLAYER)[0]; return u ? [u.x, u.z] : LAYOUT.playerGrod; }
    // the building nearest to the rival clan, which is usually the most exposed one
    mine.sort((a, b) => Math.hypot(a.x - 60, a.z + 60) - Math.hypot(b.x - 60, b.z + 60));
    const b = mine[0];
    return [b.x + 2, b.z - b.def.size / 2 - 2];
  }
  buildNear(bt, builders) {
    const g = this.g, def = BUILDINGS[bt];
    const [cx, cz] = LAYOUT.rivalGrod;
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * Math.PI * 2, r = 13 + Math.random() * 12;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      // keep the dance circle in front of the Grod clear
      if (z > cz + 4 && Math.abs(x - cx) < 12) continue;
      if (g.canPlace(bt, x, z, R).ok) {
        const b = builders.find((u) => u.order?.type === 'dance') || builders[0];
        this.building = true;
        g.build(b, bt, x, z).then(() => { this.building = false; });
        return true;
      }
    }
    return false;
  }
}

/** The starting positions (design doc section 5 for the player; the rival starts established). */
export async function setupMatch(g) {
  const [px, pz] = LAYOUT.playerGrod, [rx, rz] = LAYOUT.rivalGrod;
  const jobs = [];
  jobs.push(g.placeBuilding('grod', TEAM.PLAYER, px, pz, true));
  jobs.push(g.placeBuilding('grod', R, rx, rz, true));
  jobs.push(g.placeBuilding('warhall', R, rx + 16, rz + 2, true));
  jobs.push(g.placeBuilding('khata', R, rx - 14, rz - 6, true));
  jobs.push(g.placeBuilding('shrine', R, LAYOUT.springs[2][0], LAYOUT.springs[2][1], true));
  await Promise.all(jobs);
  const pg = g.grodOf(TEAM.PLAYER), rg = g.grodOf(R);
  const us = [];
  for (let i = 0; i < 3; i++) us.push(g.spawnUnit('vietra', TEAM.PLAYER, px - 3 + i * 3, pz + 9));
  us.push(g.spawnUnit('zherca', TEAM.PLAYER, px + 8, pz + 8, 0.6));
  for (let i = 0; i < 4; i++) us.push(g.spawnUnit('vietra', R, rx - 3 + i * 2, rz + 9));
  us.push(g.spawnUnit('zherca', R, LAYOUT.springs[2][0] - 3, LAYOUT.springs[2][1] + 3));
  us.push(g.spawnUnit('streletz', R, rx - 8, rz + 16)); us.push(g.spawnUnit('streletz', R, rx - 5, rz + 17));
  us.push(g.spawnUnit('streletz', R, rx + 6, rz + 16)); us.push(g.spawnUnit('vitez', R, rx - 1, rz + 18));
  us.push(g.spawnUnit('spirit', TEAM.NEUTRAL, LAYOUT.clearing[0], LAYOUT.clearing[1], Math.PI));
  const made = await Promise.all(us);
  for (const u of made) {
    if (u.ut === 'vietra') { g.order(u, { type: 'dance', grod: u.team === R ? rg : pg }); }
    if (u.ut === 'zherca' && u.team === R) { const s = g.freeShrine(R, u); if (s) g.rite([u], s); }
  }
  g.teams[R].wind = 120;
  // the three dancers start already in the circle (the opening explains the economy)
  for (const u of made) if (u.ut === 'vietra') { const [sx, sz] = g.danceSpot(u.order.grod, u); u.x = sx; u.z = sz; u.y = heightAt(sx, sz); u.slot = [sx, sz]; u.slotOf = u.order.grod; }
  const z = made.find((u) => u.ut === 'zherca' && u.team === R); if (z && z.order) { const [sx, sz] = z.slot || g.riteSpot(z.order.shrine, z); z.x = sx; z.z = sz; z.slot = [sx, sz]; z.slotOf = z.order.shrine; }
}
