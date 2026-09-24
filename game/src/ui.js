/**
 * Camera, input (mouse, keyboard, touch), selection, commands, placement, HUD and minimap.
 * Classic RTS conventions (design doc section 15) on a laptop; tap / drag / pinch / long-press
 * plus a camera stick on a phone.
 */
import * as THREE from 'three';
import { UNITS, BUILDINGS, TEAM, MAP, OBJECTIVES, LAYOUT, clamp, damp } from './config.js';
import { heightAt, G, baseColors } from './terrain.js';
import { makeBuildingModel } from './models.js';
import { sfx, setMuted, isMuted } from './audio.js';
import { ICON } from './icons.js';

const $ = (id) => document.getElementById(id);
const TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const FINE = window.matchMedia('(pointer:fine)').matches;
const NARROW = () => innerWidth <= 640;

export class UI {
  constructor(game, camera, canvas, portraits) {
    this.g = game; this.cam = camera; this.canvas = canvas; this.portraits = portraits;
    this.target = new THREE.Vector2(LAYOUT.playerGrod[0] + 4, LAYOUT.playerGrod[1] + 4);
    this.dist = 50; this.distGoal = 50; this.pitch = 1.06;
    this.keys = new Set(); this.mouse = { x: 0, y: 0, in: false, down: false, bx: 0, by: 0, button: 0 };
    this.mode = null;               // null | {type:'place', bt} | {type:'amove'}
    this.groups = {};
    this.stick = { active: false, x: 0, y: 0, id: null };
    this.touches = new Map(); this.pinch = null; this.boxMode = false;
    this.camVel = 0; this.lastTap = 0; this.lastClick = { t: 0, id: -1 };
    this.ghosts = {}; this.ghost = null;
    this.ghostMat = new THREE.MeshStandardMaterial({ color: 0x66ff66, transparent: true, opacity: 0.45, depthWrite: false });
    this.cmdKeys = {};
    this.panelT = 0;
    this.toastT = 0;
    this.pings = [];
    this.bind();
    this.buildMinimap();
    this.renderObjectives();
    game.on('selection', () => this.refreshPanel(true));
    game.on('objective', (done, next) => { this.toast(`Objective complete: ${done.text}`, 'good'); this.renderObjectives(); });
    game.on('alarm', (t) => { this.toast('Your settlement is under attack!', 'bad'); sfx('alarm'); this.pings.push({ x: t.x, z: t.z, t: 3 }); });
    game.on('toast', (m) => this.toast(m));
    game.on('raid', () => {});
    game.on('grodDown', (b) => { if (b.team === TEAM.PLAYER) this.toast('Your Grod has fallen! Rebuild it with a Vietra (300 Wind).', 'bad'); });
    game.on('end', (r) => this.showEnd(r));
    game.on('built', (b) => this.toast(`${b.def.name} complete`, 'good'));
    this.resize();
  }

  /* ------------------------------------------------------------ camera */
  updateCamera(dt) {
    const pan = new THREE.Vector2();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) pan.y -= 1;
    if (this.keys.has('KeyS') && !this.cmdKeys.KeyS || this.keys.has('ArrowDown')) pan.y += 1;
    if (this.keys.has('KeyA') && !this.cmdKeys.KeyA || this.keys.has('ArrowLeft')) pan.x -= 1;
    if (this.keys.has('KeyD') && !this.cmdKeys.KeyD || this.keys.has('ArrowRight')) pan.x += 1;
    if (FINE && this.mouse.in && !this.mouse.down) {
      const e = 6;
      if (this.mouse.x < e) pan.x -= 1; if (this.mouse.x > innerWidth - e) pan.x += 1;
      if (this.mouse.y < e) pan.y -= 1; if (this.mouse.y > innerHeight - e) pan.y += 1;
    }
    if (this.stick.active) pan.set(this.stick.x, this.stick.y);
    const speed = 0.9 * this.dist;
    this.target.x += pan.x * speed * dt; this.target.y += pan.y * speed * dt;
    this.camVel = pan.length() * speed;
    this.target.x = clamp(this.target.x, -MAP.half + 6, MAP.half - 6);
    this.target.y = clamp(this.target.y, -MAP.half + 4, MAP.half + 6);
    this.dist = damp(this.dist, this.distGoal, 10, dt);
    const ty = heightAt(this.target.x, this.target.y);
    this.cam.position.set(this.target.x, ty + this.dist * Math.sin(this.pitch), this.target.y + this.dist * Math.cos(this.pitch));
    this.cam.lookAt(this.target.x, ty, this.target.y);
  }
  centerOn(x, z) { this.target.set(x, z); }

  /* ------------------------------------------------------------ picking */
  groundAt(sx, sy) {
    const ndc = new THREE.Vector2((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.cam);
    const o = ray.ray.origin, d = ray.ray.direction;
    let t = 0, prev = 0;
    for (let i = 0; i < 400; i++) {
      const p = o.clone().addScaledVector(d, t);
      if (p.y <= heightAt(p.x, p.z)) {
        // refine
        let a = prev, b = t;
        for (let k = 0; k < 12; k++) { const m = (a + b) / 2; const q = o.clone().addScaledVector(d, m); if (q.y <= heightAt(q.x, q.z)) b = m; else a = m; }
        const q = o.clone().addScaledVector(d, b); return new THREE.Vector3(q.x, heightAt(q.x, q.z), q.z);
      }
      prev = t; t += 0.5 + t * 0.01;
    }
    return null;
  }
  screenOf(x, y, z) { const v = new THREE.Vector3(x, y, z).project(this.cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, v.z]; }
  shown(e) {
    if (e.team === TEAM.PLAYER) return true;
    if (e.kind === 'building') return this.g.cellSeen(e.x, e.z);
    return this.g.cellVisible(e.x, e.z);
  }
  pick(sx, sy) {
    let best = null, bd = 1e9;
    for (const u of this.g.units) {
      if (u.dead || !this.shown(u)) continue;
      const [x, y] = this.screenOf(u.x, u.y + u.def.height * 0.5, u.z);
      const r = Math.max(TOUCH ? 30 : 18, (u.def.height * 0.5) * innerHeight / this.dist * 0.9);
      const d = Math.hypot(x - sx, y - sy);
      if (d < r && d < bd) { bd = d; best = u; }
    }
    if (best) return best;
    const p = this.groundAt(sx, sy);
    for (const b of this.g.buildings) {
      if (b.dead || !this.shown(b)) continue;
      const h = b.def.size / 2 + 0.5;
      if (p && Math.abs(p.x - b.x) < h && Math.abs(p.z - b.z) < h) return b;
      const [x, y] = this.screenOf(b.x, heightAt(b.x, b.z) + b.def.height * 0.55, b.z);
      if (Math.hypot(x - sx, y - sy) < b.def.size * innerHeight / this.dist * 0.35) return b;
    }
    return null;
  }

  /* ------------------------------------------------------------ selection */
  select(list, add = false) {
    let sel = add ? [...this.g.selection] : [];
    for (const e of list) { const i = sel.indexOf(e); if (add && i >= 0 && list.length === 1) sel.splice(i, 1); else if (i < 0) sel.push(e); }
    // own units beat buildings beat foreign things
    const own = sel.filter((e) => e.team === TEAM.PLAYER && e.kind === 'unit');
    if (own.length) sel = own;
    else if (sel.length > 1) sel = [sel[0]];
    this.g.selection = sel;
    if (sel.length) sfx('click');
    this.refreshPanel(true);
  }
  ownUnits() { return this.g.selection.filter((e) => e.kind === 'unit' && e.team === TEAM.PLAYER && !e.dead); }
  ownBuilding() { const s = this.g.selection; return s.length === 1 && s[0].kind === 'building' && s[0].team === TEAM.PLAYER ? s[0] : null; }

  /* ------------------------------------------------------------ commands */
  command(sx, sy) {
    const g = this.g, units = this.ownUnits(), b = this.ownBuilding();
    const t = this.pick(sx, sy), p = this.groundAt(sx, sy);
    if (b) {
      if (!p && !t) return;
      b.rally = { x: t ? t.x : p.x, z: t ? t.z : p.z, target: t };
      this.g.fx.orderMarker(b.rally.x, heightAt(b.rally.x, b.rally.z), b.rally.z, 0xffe07a);
      sfx('click');
      return;
    }
    if (!units.length) return;
    if (t && t.team !== TEAM.PLAYER) {
      const fighters = units.filter((u) => u.def.kind !== 'econ');
      g.attack(fighters.length ? fighters : units, t);
      this.g.fx.orderMarker(t.x, heightAt(t.x, t.z), t.z, 0xff6050);
      sfx('shout', 0.5);
      return;
    }
    if (t && t.team === TEAM.PLAYER && t.kind === 'building') {
      const v = units.filter((u) => u.ut === 'vietra'), z = units.filter((u) => u.ut === 'zherca');
      if (t.bt === 'grod' && v.length) { g.dance(v); sfx('click'); return; }
      if (t.bt === 'shrine' && z.length) { g.rite(z, t); sfx('click'); return; }
      if (!t.built) { const builders = units.filter((u) => t.def.builtBy.includes(u.ut)); if (builders.length) { for (const u of builders) g.order(u, { type: 'build', site: t }); return; } }
    }
    // right-click a free spring with a Zherca: build a shrine there
    if (p && !t) {
      const s = g.springs.find((s) => !s.shrine && Math.hypot(s.x - p.x, s.z - p.z) < 3.5);
      const z = units.find((u) => u.ut === 'zherca');
      if (s && z) { this.tryBuild(z, 'shrine', s.x, s.z); return; }
    }
    if (p) {
      g.moveGroup(units, p.x, p.z, this.mode?.type === 'amove' ? 'amove' : 'move');
      this.g.fx.orderMarker(p.x, p.y, p.z, this.mode?.type === 'amove' ? 0xff9a50 : 0x9fff7a);
      sfx('click');
    }
  }
  async tryBuild(u, bt, x, z) {
    const r = await this.g.build(u, bt, x, z);
    if (!r.ok) { this.toast(r.why, 'bad'); sfx('deny'); }
    else sfx('knock');
    this.refreshPanel(true);
  }
  startPlace(bt) {
    const def = BUILDINGS[bt];
    if (!this.g.canAfford(0, def)) { this.toast(`Not enough ${this.g.teams[0].wind < def.wind ? 'Wind' : 'Rain'}`, 'bad'); sfx('deny'); return; }
    this.cancelMode();
    this.mode = { type: 'place', bt };
    this.showGhost(bt);
    $('placehint').textContent = TOUCH ? `Tap where the ${def.name} should stand` : `Click to place the ${def.name}. Right-click or Esc to cancel.`;
    $('placehint').classList.add('on');
    if (def.atSpring) { const s = this.g.springs.find((s) => !s.shrine && this.g.cellSeen(s.x, s.z)); if (s && TOUCH) this.ghostAt(s.x, s.z); }
    else if (TOUCH) this.ghostAt(this.target.x, this.target.y);
  }
  async showGhost(bt) {
    if (!this.ghosts[bt]) {
      const m = await makeBuildingModel(BUILDINGS[bt].asset, 0);
      m.traverse((o) => { if (o.isMesh) { o.material = this.ghostMat; o.castShadow = false; o.receiveShadow = false; } });
      this.ghosts[bt] = m;
    }
    if (this.mode?.type !== 'place' || this.mode.bt !== bt) return;
    if (this.ghost) this.g.scene.remove(this.ghost);
    this.ghost = this.ghosts[bt]; this.g.scene.add(this.ghost);
    if (this.mode.gx !== undefined) this.ghostAt(this.mode.gx, this.mode.gz);
    else this.ghost.visible = false;
  }
  ghostAt(x, z) {
    if (!this.mode || this.mode.type !== 'place') return;
    const pl = this.g.canPlace(this.mode.bt, x, z);
    this.mode.gx = x; this.mode.gz = z; this.mode.ok = pl.ok; this.mode.px = pl.x; this.mode.pz = pl.z;
    if (!this.ghost) return;
    this.ghost.visible = true;
    this.ghost.position.set(pl.x, this.g.groundLevel(pl.x, pl.z, BUILDINGS[this.mode.bt].size), pl.z);
    this.ghostMat.color.setHex(pl.ok ? 0x66ff66 : 0xff4444);
  }
  commitPlace() {
    const m = this.mode; if (!m || m.type !== 'place' || m.gx === undefined) return;
    const def = BUILDINGS[m.bt];
    const builder = this.ownUnits().filter((u) => def.builtBy.includes(u.ut)).sort((a, b) => Math.hypot(a.x - m.px, a.z - m.pz) - Math.hypot(b.x - m.px, b.z - m.pz))[0];
    if (!builder) { this.toast(`Select a ${def.builtBy.map((k) => UNITS[k].name).join(' or ')} to build that`, 'bad'); this.cancelMode(); return; }
    this.tryBuild(builder, m.bt, m.gx, m.gz);
    this.cancelMode();
  }
  cancelMode() {
    this.mode = null;
    if (this.ghost) { this.g.scene.remove(this.ghost); this.ghost = null; }
    $('placehint').classList.remove('on');
    this.refreshPanel(true);
  }
  commandsFor() {
    const g = this.g, b = this.ownBuilding(), units = this.ownUnits();
    const cmds = [];
    if (b) {
      if (!b.built) return [{ label: 'Building…', disabled: true }];
      for (const ut of b.def.trains) {
        const d = UNITS[ut];
        cmds.push({ label: d.name, key: d.key, icon: this.portraits[ut], cost: d, tip: `${d.name}: ${d.title}`, act: () => { const r = g.train(b, ut); if (!r.ok) { this.toast(r.why, 'bad'); sfx('deny'); } else sfx('click'); this.refreshPanel(true); } });
      }
      if (b.queue.length) cmds.push({ label: 'Cancel', key: 'Escape', icon: null, glyph: ICON.cancel, act: () => { g.cancelTrain(b); this.refreshPanel(true); } });
      return cmds;
    }
    if (!units.length) return cmds;
    const has = (ut) => units.some((u) => u.ut === ut);
    if (has('vietra')) {
      cmds.push({ label: 'Dance', key: 'Q', glyph: ICON.dance, tip: 'Wind Dance at the Grod: +1 Wind per second each', act: () => { g.dance(units); sfx('click'); } });
      if (units.every((u) => u.ut === 'vietra')) for (const bt of ['khata', 'warhall', 'grod']) {
        const d = BUILDINGS[bt]; cmds.push({ label: d.name, key: d.key, icon: this.portraits[bt], cost: d, tip: `${d.name}: ${d.title}`, act: () => this.startPlace(bt) });
      }
    }
    if (has('zherca')) {
      cmds.push({ label: 'Rite', key: 'E', glyph: ICON.rite, tip: 'Rain Rite at a Rain Shrine: +1 Rain per second each', act: () => { const z = units.filter((u) => u.ut === 'zherca'); if (!g.freeShrine(0, z[0])) { this.toast('Build a Rain Shrine at a Sacred Spring first', 'bad'); sfx('deny'); } else { g.rite(z); sfx('click'); } } });
      if (units.every((u) => u.ut === 'zherca')) for (const bt of ['shrine', 'grove']) {
        const d = BUILDINGS[bt]; cmds.push({ label: d.name, key: d.key, icon: this.portraits[bt], cost: d, tip: `${d.name}: ${d.title}`, act: () => this.startPlace(bt) });
      }
    }
    if (units.some((u) => u.def.kind !== 'econ')) cmds.push({ label: 'Attack', key: 'A', glyph: ICON.attack, tip: 'Attack-move: fight anything on the way', act: () => { this.cancelMode(); this.mode = { type: 'amove' }; $('placehint').textContent = TOUCH ? 'Tap where to attack-move' : 'Click where to attack-move'; $('placehint').classList.add('on'); } });
    cmds.push({ label: 'Stop', key: 'S', glyph: ICON.stop, tip: 'Stop', act: () => { g.stop(units); sfx('click'); } });
    return cmds;
  }

  /* ------------------------------------------------------------ panel */
  refreshPanel(force = false) {
    const g = this.g, sel = g.selection.filter((e) => !e.dead);
    const panel = $('panel');
    if (!sel.length) { $('queuebar').classList.remove('on'); panel.classList.add('empty'); $('cmds').innerHTML = ''; $('info').innerHTML = '<div class="hint">' + (TOUCH ? 'Tap a unit to select it. Drag to look around.' : 'Select units with a click or a box. Right-click to command.') + '</div>'; $('portrait').style.backgroundImage = ''; this.cmdKeys = {}; this.lastCmdSig = ''; this.syncPanelH(); return; }
    panel.classList.remove('empty');
    const e = sel[0];
    const key = e.kind === 'unit' ? e.ut : e.bt;
    $('portrait').style.backgroundImage = this.portraits[key] ? `url(${this.portraits[key]})` : '';
    let html = '', queueHtml = '';
    if (sel.length === 1) {
      const d = e.def;
      const owner = e.team === TEAM.PLAYER ? '' : e.team === TEAM.RIVAL ? ' <span class="foe">Rival Clan</span>' : ' <span class="neutral">Neutral</span>';
      html += `<div class="nm">${d.name}${owner}</div><div class="tt">${d.title || ''}</div>`;
      html += `<div class="hp"><i style="width:${(e.hp / e.maxHp * 100).toFixed(0)}%"></i><b>${Math.ceil(e.hp)} / ${e.maxHp}</b></div>`;
      if (e.kind === 'unit') {
        const st = e.anim.mode === 'dance' ? 'Dancing: +1 Wind/s' : e.anim.mode === 'rite' ? 'Rain Rite: +1 Rain/s' : e.order?.type === 'build' ? 'Building' : e.interruptT > 0 ? 'Interrupted by combat' : e.order?.type === 'attack' ? 'Fighting' : e.order ? 'Moving' : 'Idle';
        html += `<div class="st">${st} · dmg ${d.dmg} · range ${d.range}</div>`;
      } else {
        if (!e.built) html += `<div class="st">Under construction: ${(e.progress * 100) | 0}%</div>`;
        else if (e.bt === 'shrine') html += `<div class="st">Zhercas: ${e.workers.length} / 3 · +${e.workers.filter((w) => w.anim.mode === 'rite').length} Rain/s</div>`;
        else if (e.bt === 'grod') html += `<div class="st">Dancers: ${(e.dancers || []).filter((d) => !d.dead && d.anim.mode === 'dance').length} · +${(e.dancers || []).filter((d) => !d.dead && d.anim.mode === 'dance').length} Wind/s</div>`;
        else if (e.bt === 'khata') html += `<div class="st">+8 Supply</div>`;
        if (e.queue.length && e.team === TEAM.PLAYER) {
          const q = e.queue[0]; const f = q.t / UNITS[q.ut].time;
          queueHtml = e.queue.map((q, i) => `<span data-q="${i}" title="Cancel ${UNITS[q.ut].name}" style="background-image:url(${this.portraits[q.ut]})">${i === 0 ? `<i style="height:${(f * 100) | 0}%"></i><b>${Math.ceil(UNITS[q.ut].time - q.t)}s</b>` : ''}</span>`).join('');
          if (!NARROW()) html += `<div class="queue">${queueHtml}</div>`;
        }
      }
    } else {
      html += '<div class="multi">' + sel.slice(0, 18).map((u) => `<span data-id="${u.id}" style="background-image:url(${this.portraits[u.ut]})"><i style="width:${(u.hp / u.maxHp * 100) | 0}%"></i></span>`).join('') + '</div>';
    }
    $('info').innerHTML = html;
    this.syncPanelH();
    const qb = $('queuebar');
    qb.innerHTML = NARROW() ? queueHtml : '';
    qb.classList.toggle('on', NARROW() && !!queueHtml);
    for (const sp of document.querySelectorAll('#queuebar span, #info .queue span')) sp.onpointerup = (ev) => { ev.stopPropagation(); if (e.kind === 'building') { g.cancelTrain(e, +sp.dataset.q); sfx('click'); this.refreshPanel(true); } };
    for (const sp of $('info').querySelectorAll('.multi span')) sp.onclick = () => { const u = g.units.find((u) => u.id === +sp.dataset.id); if (u) this.select([u]); };
    // command buttons: rebuild only when they change
    const cmds = e.team === TEAM.PLAYER ? this.commandsFor() : [];
    const t = g.teams[0];
    const sig = cmds.map((c) => c.label + (c.cost ? (t.wind >= c.cost.wind && t.rain >= (c.cost.rain || 0)) : '')).join('|') + (this.mode?.type || '');
    if (!force && sig === this.lastCmdSig) return;
    this.lastCmdSig = sig;
    this.cmdKeys = {};
    const box = $('cmds'); box.innerHTML = '';
    for (const c of cmds) {
      const el = document.createElement('button');
      el.className = 'cmd pe';
      const afford = !c.cost || (t.wind >= c.cost.wind && t.rain >= (c.cost.rain || 0));
      if (!afford || c.disabled) el.classList.add('dim');
      el.innerHTML = (c.icon ? `<span class="ic" style="background-image:url(${c.icon})"></span>` : `<span class="gl">${c.glyph || ''}</span>`) +
        `<span class="lb">${c.label}</span>` + (c.key && FINE ? `<span class="hk">${c.key === 'Escape' ? 'Esc' : c.key}</span>` : '') +
        (c.cost ? `<span class="cs">${c.cost.wind ? `<em class="w">${c.cost.wind}</em>` : ''}${c.cost.rain ? `<em class="r">${c.cost.rain}</em>` : ''}</span>` : '');
      el.title = c.tip || c.label;
      if (c.act) el.addEventListener('pointerup', (ev) => { ev.stopPropagation(); c.act(); });
      box.appendChild(el);
      if (c.key && c.act) this.cmdKeys[c.key.length === 1 ? 'Key' + c.key : c.key] = c.act;
    }
    this.syncPanelH();
  }

  syncPanelH() {
    if (!NARROW()) { document.documentElement.style.removeProperty('--panelH'); return; }
    const h = $('panel').offsetHeight;
    if (h && h !== this.lastPanelH) { this.lastPanelH = h; document.documentElement.style.setProperty('--panelH', h + 'px'); }
  }

  /* ------------------------------------------------------------ HUD */
  hud(dt) {
    const g = this.g, t = g.teams[0];
    $('wind').textContent = Math.floor(t.wind);
    $('rain').textContent = Math.floor(t.rain);
    const used = g.supplyUsed(0), cap = g.supplyCap(0);
    $('supply').textContent = `${used} / ${cap}`;
    $('supply').parentElement.classList.toggle('full', used >= cap);
    const dancing = g.alive(0, (u) => u.anim.mode === 'dance').length, rites = g.alive(0, (u) => u.anim.mode === 'rite').length;
    $('windrate').textContent = `+${dancing}/s`; $('rainrate').textContent = `+${rites}/s`;
    const s = Math.floor(g.time); $('clock').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    this.panelT -= dt; if (this.panelT <= 0) { this.panelT = 0.25; this.refreshPanel(false); }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) $('toast').classList.remove('on'); }
    this.drawMinimap(dt);
  }
  toast(msg, cls = '') { const el = $('toast'); el.textContent = msg; el.className = 'on ' + cls; this.toastT = 3.2; }
  renderObjectives() {
    const i = this.g.objective;
    const cur = OBJECTIVES[i];
    $('objs').innerHTML = cur ? `<div class="ot">Objective <small>${i + 1}/${OBJECTIVES.length}</small></div><div class="oc">${cur.text}</div>` : '<div class="oc">The Sacred Valley is yours</div>';
  }
  showEnd(r) {
    const g = this.g, t = g.teams[0], s = Math.floor(g.time);
    $('endh').textContent = r === 'victory' ? 'VICTORY' : 'DEFEAT';
    $('endp').innerHTML = (r === 'victory' ? 'The rival Grod has fallen. Wind and Rain answer to your clan now.' : 'Your Grod is ash and there is no one left to raise it.') +
      `<br><br>Time ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · Wind gathered ${Math.floor(t.windTotal)} · Rain gathered ${Math.floor(t.rainTotal)} · Units trained ${g.stats.unitsTrained} · Enemies slain ${g.stats.kills}`;
    setTimeout(() => $('end').classList.add('on'), 1600);
  }

  /* ------------------------------------------------------------ minimap */
  buildMinimap() {
    const c = $('minimap'); const N = 90;
    this.mmBase = document.createElement('canvas'); this.mmBase.width = this.mmBase.height = N;
    const x = this.mmBase.getContext('2d'); const img = x.createImageData(N, N);
    const VN = 131;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const wx = -90 + (i + 0.5) * 2, wz = -90 + (j + 0.5) * 2;
      const vi = Math.round((wx + 130) / 2), vj = Math.round((wz + 130) / 2), k = (vj * VN + vi) * 3;
      const h = heightAt(wx, wz);
      const lin = (v) => Math.pow(v, 1 / 2.2) * 255;
      const o = (j * N + i) * 4;
      if (h < -0.5) { img.data[o] = 60; img.data[o + 1] = 110; img.data[o + 2] = 150; }
      else { img.data[o] = lin(baseColors[k]) * 0.9; img.data[o + 1] = lin(baseColors[k + 1]) * 0.9; img.data[o + 2] = lin(baseColors[k + 2]) * 0.9; }
      img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    this.mmFog = document.createElement('canvas'); this.mmFog.width = this.mmFog.height = N;
    this.mmFogCtx = this.mmFog.getContext('2d'); this.mmFogImg = this.mmFogCtx.createImageData(N, N);
    this.mmT = 0;
    this.treesMM = null;
  }
  drawMinimap(dt) {
    this.mmT -= dt; if (this.mmT > 0) return; this.mmT = 0.2;
    const c = $('minimap'), ctx = c.getContext('2d'), W = c.width, g = this.g;
    const sc = W / MAP.size, w = (x) => (x + MAP.half) * sc;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.mmBase, 0, 0, W, W);
    if (this.treeDots) { ctx.fillStyle = 'rgba(28,48,24,0.8)'; for (const [x, z] of this.treeDots) ctx.fillRect(w(x) - 1, w(z) - 1, 2, 2); }
    const d = this.mmFogImg.data;
    for (let k = 0; k < G * G; k++) { d[k * 4 + 3] = g.vis[k] ? 0 : g.seen[k] ? 110 : 235; }
    this.mmFogCtx.putImageData(this.mmFogImg, 0, 0);
    ctx.drawImage(this.mmFog, 0, 0, W, W);
    for (const s of g.springs) if (g.cellSeen(s.x, s.z)) { ctx.fillStyle = '#7fc8ff'; ctx.beginPath(); ctx.arc(w(s.x), w(s.z), 3, 0, 7); ctx.fill(); }
    for (const b of g.buildings) {
      if (b.dead || !this.shown(b)) continue;
      ctx.fillStyle = b.team === 0 ? '#e0453e' : '#4a86e8';
      const s = Math.max(4, b.def.size * sc);
      ctx.fillRect(w(b.x) - s / 2, w(b.z) - s / 2, s, s);
    }
    for (const u of g.units) {
      if (u.dead || !this.shown(u)) continue;
      ctx.fillStyle = u.team === 0 ? (g.selection.includes(u) ? '#ffffff' : '#ff8a70') : u.team === 1 ? '#8ab8ff' : '#e8e070';
      ctx.fillRect(w(u.x) - 1.5, w(u.z) - 1.5, u.ut === 'spirit' ? 5 : 3, u.ut === 'spirit' ? 5 : 3);
    }
    // camera footprint
    const corners = [[0, 0], [innerWidth, 0], [innerWidth, innerHeight], [0, innerHeight]].map(([sx, sy]) => this.groundAt(sx, sy) || new THREE.Vector3(this.target.x, 0, this.target.y));
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(w(p.x), w(p.z)) : ctx.moveTo(w(p.x), w(p.z)))); ctx.closePath(); ctx.stroke();
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const p = this.pings[i]; p.t -= 0.2; if (p.t <= 0) { this.pings.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(255,70,50,${p.t / 3})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w(p.x), w(p.z), 4 + (3 - p.t) * 5, 0, 7); ctx.stroke();
    }
  }
  minimapToWorld(ev) { const r = $('minimap').getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * MAP.size - MAP.half, (ev.clientY - r.top) / r.height * MAP.size - MAP.half]; }

  /* ------------------------------------------------------------ input */
  bind() {
    const cv = this.canvas;
    addEventListener('resize', () => this.resize());
    addEventListener('keydown', (e) => this.keydown(e));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('mouseenter', () => (this.mouse.in = true));
    cv.addEventListener('mouseleave', () => (this.mouse.in = false));
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.distGoal = clamp(this.distGoal * (e.deltaY > 0 ? 1.12 : 0.89), 24, 82); }, { passive: false });
    cv.addEventListener('mousedown', (e) => this.mdown(e));
    addEventListener('mousemove', (e) => this.mmove(e));
    addEventListener('mouseup', (e) => this.mup(e));
    cv.addEventListener('touchstart', (e) => this.tstart(e), { passive: false });
    cv.addEventListener('touchmove', (e) => this.tmove(e), { passive: false });
    cv.addEventListener('touchend', (e) => this.tend(e), { passive: false });
    cv.addEventListener('touchcancel', (e) => this.tend(e), { passive: false });
    const mm = $('minimap');
    mm.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const [x, z] = this.minimapToWorld(e);
      if (e.button === 2) { const u = this.ownUnits(); if (u.length) { this.g.moveGroup(u, x, z, 'move'); sfx('click'); } }
      else { this.centerOn(x, z + 6); this.mmDrag = true; }
    });
    mm.addEventListener('pointermove', (e) => { if (this.mmDrag) { const [x, z] = this.minimapToWorld(e); this.centerOn(x, z + 6); } });
    addEventListener('pointerup', () => (this.mmDrag = false));
    mm.addEventListener('contextmenu', (e) => e.preventDefault());
    // camera stick (touch)
    const st = $('stick');
    const setStick = (t) => {
      const r = st.getBoundingClientRect();
      if (!this.stick.active) { this.stick.cx = t.clientX; this.stick.cy = t.clientY; }
      let dx = (t.clientX - this.stick.cx) / 44, dy = (t.clientY - this.stick.cy) / 44;
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      this.stick.x = dx; this.stick.y = dy; this.stick.active = true;
      $('sticknub').style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
    };
    st.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); const t = e.changedTouches[0]; this.stick.id = t.identifier; this.stick.active = false; setStick(t); st.classList.add('dn'); }, { passive: false });
    st.addEventListener('touchmove', (e) => { e.preventDefault(); e.stopPropagation(); for (const t of e.changedTouches) if (t.identifier === this.stick.id) setStick(t); }, { passive: false });
    const endStick = (e) => { e.preventDefault(); e.stopPropagation(); this.stick.active = false; this.stick.x = this.stick.y = 0; $('sticknub').style.transform = ''; st.classList.remove('dn'); };
    st.addEventListener('touchend', endStick, { passive: false }); st.addEventListener('touchcancel', endStick, { passive: false });
    // touch helper buttons
    $('bArmy').addEventListener('pointerup', (e) => { e.stopPropagation(); const a = this.g.alive(0, (u) => u.def.kind !== 'econ'); if (a.length) this.select(a); else this.toast('No army yet: build a War Hall', 'bad'); });
    $('bIdle').addEventListener('pointerup', (e) => { e.stopPropagation(); this.selectIdle(); });
    $('bHome').addEventListener('pointerup', (e) => { e.stopPropagation(); const g = this.g.grodOf(0); if (g) { this.centerOn(g.x, g.z + 8); this.select([g]); } });
    $('bBox').addEventListener('pointerup', (e) => { e.stopPropagation(); this.boxMode = !this.boxMode; $('bBox').classList.toggle('on', this.boxMode); });
    $('bMute').addEventListener('pointerup', (e) => { e.stopPropagation(); setMuted(!isMuted()); $('bMute').innerHTML = isMuted() ? ICON.mute : ICON.sound; });
    $('bObj').addEventListener('pointerup', (e) => { e.stopPropagation(); $('objs').classList.toggle('min'); });
    $('again').addEventListener('click', () => location.reload());
    $('bMute').innerHTML = ICON.sound; $('bObj').innerHTML = ICON.menu;
    for (const [id, ic] of [['icw', 'wind'], ['icr', 'rain'], ['ics', 'supply']]) $(id).innerHTML = ICON[ic];
  }
  selectIdle() {
    const idle = this.g.alive(0, (u) => u.def.kind === 'econ' && !u.order);
    if (!idle.length) { this.toast('No idle Vietras or Zhercas'); return; }
    this.idleI = ((this.idleI || 0) + 1) % idle.length;
    const u = idle[this.idleI]; this.select([u]); this.centerOn(u.x, u.z + 6);
  }
  resize() {
    const portrait = innerHeight > innerWidth;
    this.cam.aspect = innerWidth / innerHeight;
    this.cam.fov = portrait ? 56 : 40;
    this.cam.updateProjectionMatrix();
    const mm = $('minimap'); const s = Math.round(Math.min(170, Math.max(104, Math.min(innerWidth, innerHeight) * 0.3)));
    mm.width = mm.height = s * Math.min(2, devicePixelRatio || 1); mm.style.width = mm.style.height = s + 'px';
    const top = (window.visualViewport ? 0 : 0) + 46 + s + 16; $('tside').style.top = top + 'px';
    this.onResize && this.onResize();
  }
  keydown(e) {
    if (e.repeat && !e.code.startsWith('Arrow')) return;
    this.keys.add(e.code);
    const n = e.code.startsWith('Digit') ? +e.code.slice(5) : NaN;
    if (!isNaN(n)) {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.groups[n] = this.ownUnits(); this.toast(`Group ${n} set`); }
      else if (this.groups[n]) { const live = this.groups[n].filter((u) => !u.dead); if (live.length) { const again = this.lastGroup === n && performance.now() - this.lastGroupT < 400; this.select(live); if (again) this.centerOn(live[0].x, live[0].z + 6); this.lastGroup = n; this.lastGroupT = performance.now(); } }
      return;
    }
    if (e.code === 'Escape') { if (this.mode) this.cancelMode(); else if (this.cmdKeys.Escape) this.cmdKeys.Escape(); else { this.g.selection = []; this.refreshPanel(true); } return; }
    if (e.code === 'Space') { const g = this.g.grodOf(0); if (g) this.centerOn(g.x, g.z + 8); e.preventDefault(); return; }
    if (e.code === 'Period') { this.selectIdle(); return; }
    if (e.code === 'F2') { const a = this.g.alive(0, (u) => u.def.kind !== 'econ'); if (a.length) this.select(a); return; }
    const act = this.cmdKeys[e.code];
    if (act && !e.ctrlKey && !e.metaKey) { act(); this.keys.delete(e.code); }
  }
  mdown(e) {
    this.mouse.down = true; this.mouse.button = e.button; this.mouse.bx = e.clientX; this.mouse.by = e.clientY; this.mouse.box = false;
    if (e.button === 2) {
      if (this.mode) { this.cancelMode(); return; }
      this.command(e.clientX, e.clientY);
    } else if (e.button === 1) { this.mouse.panning = true; }
  }
  mmove(e) {
    this.mouse.x = e.clientX; this.mouse.y = e.clientY;
    if (this.mode?.type === 'place') { const p = this.groundAt(e.clientX, e.clientY); if (p) this.ghostAt(p.x, p.z); }
    if (this.mouse.down && this.mouse.button === 1) { this.target.x -= e.movementX * this.dist * 0.0025; this.target.y -= e.movementY * this.dist * 0.0035; return; }
    if (this.mouse.down && this.mouse.button === 0 && !this.mode) {
      if (Math.hypot(e.clientX - this.mouse.bx, e.clientY - this.mouse.by) > 6) this.mouse.box = true;
      if (this.mouse.box) this.drawBox(this.mouse.bx, this.mouse.by, e.clientX, e.clientY);
    }
  }
  mup(e) {
    if (!this.mouse.down) return;
    this.mouse.down = false;
    if (e.button !== 0 || e.target !== this.canvas && !this.mouse.box) { $('box').style.display = 'none'; return; }
    if (this.mode?.type === 'place') { this.commitPlace(); return; }
    if (this.mode?.type === 'amove') { this.command(e.clientX, e.clientY); this.cancelMode(); return; }
    if (this.mouse.box) { this.boxSelect(this.mouse.bx, this.mouse.by, e.clientX, e.clientY, e.shiftKey); $('box').style.display = 'none'; return; }
    const t = this.pick(e.clientX, e.clientY);
    const now = performance.now();
    if (t && t.kind === 'unit' && t.team === 0 && this.lastClick.id === t.id && now - this.lastClick.t < 350) {
      // double click: all of that type on screen
      this.select(this.g.alive(0, (u) => u.ut === t.ut && this.onScreen(u)));
    } else this.select(t ? [t] : [], e.shiftKey);
    this.lastClick = { t: now, id: t ? t.id : -1 };
  }
  onScreen(u) { const [x, y, z] = this.screenOf(u.x, u.y, u.z); return z < 1 && x > 0 && y > 0 && x < innerWidth && y < innerHeight; }
  drawBox(x0, y0, x1, y1) { const b = $('box'); b.style.display = 'block'; b.style.left = Math.min(x0, x1) + 'px'; b.style.top = Math.min(y0, y1) + 'px'; b.style.width = Math.abs(x1 - x0) + 'px'; b.style.height = Math.abs(y1 - y0) + 'px'; }
  boxSelect(x0, y0, x1, y1, add) {
    const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
    const inside = this.g.alive(0).filter((u) => { const [x, y] = this.screenOf(u.x, u.y + u.def.height * 0.4, u.z); return x >= ax && x <= bx && y >= ay && y <= by; });
    if (inside.length) this.select(inside, add); else if (!add) this.select([]);
  }
  /* touch */
  tstart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) this.touches.set(t.identifier, { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t0: performance.now(), moved: false });
    if (this.touches.size === 2) {
      const [a, b] = [...this.touches.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: this.distGoal, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      for (const t of this.touches.values()) t.moved = true;
      clearTimeout(this.longT);
    } else if (this.touches.size === 1) {
      const t = e.changedTouches[0];
      clearTimeout(this.longT);
      this.longT = setTimeout(() => { const s = this.touches.get(t.identifier); if (s && !s.moved) { s.long = true; if (navigator.vibrate) navigator.vibrate(15); this.command(s.x, s.y); } }, 480);
      if (this.mode?.type === 'place') { const p = this.groundAt(t.clientX, t.clientY); if (p) this.ghostAt(p.x, p.z); }
    }
  }
  tmove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const s = this.touches.get(t.identifier); if (!s) continue;
      const dx = t.clientX - s.x, dy = t.clientY - s.y;
      if (Math.hypot(t.clientX - s.x0, t.clientY - s.y0) > 10) { s.moved = true; clearTimeout(this.longT); }
      s.x = t.clientX; s.y = t.clientY;
      if (this.touches.size === 1 && s.moved) {
        if (this.mode?.type === 'place') { const p = this.groundAt(s.x, s.y); if (p) this.ghostAt(p.x, p.z); }
        else if (this.boxMode) this.drawBox(s.x0, s.y0, s.x, s.y);
        else { this.target.x -= dx * this.dist * 0.0028; this.target.y -= dy * this.dist * 0.0042; }
      }
    }
    if (this.touches.size === 2 && this.pinch) {
      const [a, b] = [...this.touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.distGoal = clamp(this.pinch.dist * this.pinch.d / Math.max(20, d), 24, 82);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this.target.x -= (mx - this.pinch.mx) * this.dist * 0.0028; this.target.y -= (my - this.pinch.my) * this.dist * 0.0042;
      this.pinch.mx = mx; this.pinch.my = my;
    }
  }
  tend(e) {
    e.preventDefault();
    clearTimeout(this.longT);
    for (const t of e.changedTouches) {
      const s = this.touches.get(t.identifier); this.touches.delete(t.identifier);
      if (!s || this.touches.size) { if (!this.touches.size) this.pinch = null; continue; }
      this.pinch = null;
      if (s.long) continue;
      if (this.mode?.type === 'place') { if (!s.moved) { const p = this.groundAt(s.x, s.y); if (p) this.ghostAt(p.x, p.z); } this.commitPlace(); continue; }
      if (s.moved) { if (this.boxMode) { this.boxSelect(s.x0, s.y0, s.x, s.y, false); $('box').style.display = 'none'; this.boxMode = false; $('bBox').classList.remove('on'); } continue; }
      this.tap(s.x, s.y);
    }
  }
  tap(x, y) {
    if (this.mode?.type === 'amove') { this.command(x, y); this.cancelMode(); return; }
    const t = this.pick(x, y);
    const own = this.ownUnits();
    if (t && t.team === TEAM.PLAYER) {
      const now = performance.now();
      if (t.kind === 'unit' && this.lastClick.id === t.id && now - this.lastClick.t < 350) this.select(this.g.alive(0, (u) => u.ut === t.ut && this.onScreen(u)));
      else this.select([t]);
      this.lastClick = { t: now, id: t.id };
      return;
    }
    if (own.length || this.ownBuilding()) { this.command(x, y); return; }
    this.select(t ? [t] : []);
  }
}
