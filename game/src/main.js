/**
 * Wind & Rain — boot, world build, loop, and the jam telemetry contract.
 */
import * as THREE from 'three';
import { createRig } from '../rig.js';
import { setSurfaceDefaults } from '../surfaces.js';
import { preloadAssets } from '../assetlib.js';
import { UNITS, BUILDINGS, TEAM, LAYOUT, MAP } from './config.js';
import { buildTerrain, vegetation, buildStaticGrid, heightAt, applyFog, fogFactorAt } from './terrain.js';
import { makeUnitModel, makeBuildingModel, makeProp, instanced, portrait } from './models.js';
import { Game } from './game.js';
import { RivalAI, setupMatch } from './ai.js';
import { FX } from './fx.js';
import { UI } from './ui.js';
import { initAudio, resumeAudio, updateAudio, sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const bar = $('barf'), msg = $('loadmsg');
const step = (f, m) => { bar.style.width = (f * 100).toFixed(0) + '%'; msg.textContent = m; };
window.__GAME__ = { pos: [0, 0], fps: 0, speed: 0, score: 0, over: false, draws: 0, tris: 0 };

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight, false);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 2, 500);
const rig = createRig(THREE, renderer, scene, { hour: 16.2, azimuth: 225, tier: 'auto', fogStart: 90, bloomStrength: 0.18, exposure: 0.66 });
const phone = rig.tier.name === 'phone';
setSurfaceDefaults({ size: phone ? 256 : 512 });

let game, ui, ai, fx, veg = {}, props = [], started = false;
const SPEED = Math.max(1, Math.min(20, +(new URLSearchParams(location.search).get('speed') || 1)));

async function boot() {
  step(0.05, 'shaping the valley');
  const terrain = buildTerrain(scene, rig.tier.name);
  const layout = vegetation();
  buildStaticGrid(layout);
  await new Promise((r) => setTimeout(r, 0));

  step(0.15, 'reading the asset modules');
  const names = ['vietra', 'zherca', 'streletz', 'vitez', 'deer_rider', 'bear', 'forest_spirit', 'grod', 'khata', 'war_hall', 'rain_shrine', 'sacred_grove', 'pine_tree', 'birch_tree', 'rock_cluster', 'sacred_spring', 'reeds', 'stone_idol', 'grass_tuft'];
  await preloadAssets(names.map((n) => `./assets/${n}.js`));

  step(0.3, 'planting the forest');
  const S = phone ? 256 : 512;
  veg.pines = await instanced('pine_tree', layout.pines, heightAt, { surfSize: S });
  veg.birches = await instanced('birch_tree', layout.birches, heightAt, { surfSize: S });
  veg.rocks = await instanced('rock_cluster', layout.rocks, heightAt, { surfSize: S });
  veg.reeds = await instanced('reeds', layout.reeds, heightAt, { shadow: false, surfaces: false });
  veg.grass = await instanced('grass_tuft', layout.grass, heightAt, { shadow: false, surfaces: false, tile: 24 });
  veg.pines.bright = 1.3; veg.birches.bright = 1.1;
  for (const v of Object.values(veg)) scene.add(v.group);

  step(0.45, 'finding the sacred springs');
  fx = new FX(scene, camera);
  game = new Game(scene, fx);
  for (const s of game.springs) {
    const p = await makeProp('sacred_spring', S);
    p.position.set(s.x, heightAt(s.x, s.z) - 0.05, s.z); scene.add(p); s.prop = p; props.push({ obj: p, x: s.x, z: s.z });
  }
  const idol = await makeProp('stone_idol', S);
  idol.position.set(LAYOUT.idol[0], heightAt(...LAYOUT.idol) - 0.2, LAYOUT.idol[1]); idol.rotation.y = 0.5;
  scene.add(idol); props.push({ obj: idol, x: LAYOUT.idol[0], z: LAYOUT.idol[1], idol: true });

  step(0.55, 'carving the clans');
  const jobs = [];
  for (const team of [0, 1]) {
    for (const ut of Object.keys(UNITS)) if (ut !== 'spirit') jobs.push(makeUnitModel(UNITS[ut].asset, team, UNITS[ut].height));
    for (const bt of Object.keys(BUILDINGS)) jobs.push(makeBuildingModel(BUILDINGS[bt].asset, team, S));
  }
  jobs.push(makeUnitModel(UNITS.spirit.asset, TEAM.NEUTRAL, UNITS.spirit.height));
  await Promise.all(jobs);

  step(0.75, 'painting portraits');
  const portraits = {};
  for (const ut of Object.keys(UNITS)) {
    const m = await makeUnitModel(UNITS[ut].asset, ut === 'spirit' ? TEAM.NEUTRAL : 0, UNITS[ut].height);
    portraits[ut] = portrait(renderer, m.root, { yaw: 0.45, zoom: ut === 'deer' ? 1.3 : ut === 'spirit' ? 1.6 : 2.4, focusY: ut === 'bear' ? 0.6 : ut === 'deer' ? 0.72 : 0.84 });
  }
  for (const bt of Object.keys(BUILDINGS)) portraits[bt] = portrait(renderer, await makeBuildingModel(BUILDINGS[bt].asset, 0, S), { yaw: 0.6, zoom: 1.05, focusY: 0.5 });

  step(0.85, 'raising the settlements');
  await setupMatch(game);
  ai = new RivalAI(game);
  ui = new UI(game, camera, canvas, portraits);
  ui.treeDots = [...layout.pines, ...layout.birches].filter((_, i) => i % 2 === 0);
  ui.onResize = () => { renderer.setSize(innerWidth, innerHeight, false); rig.resize(innerWidth, innerHeight); };
  game.terrain = terrain;
  game.on('fog', () => fogVisuals());
  game.updateFog(); fogVisuals();
  ui.updateCamera(0);
  rig.refresh();

  step(1, 'ready');
  // compile everything before the first real frame, so the tap does not hitch
  renderer.compile(scene, camera);
  await rig.ready.catch(() => {});
  $('load').style.display = 'none';
  $('start').classList.add('on');
  window.__READY__ = true;
  window.__DBG__ = { game, ui, camera };
}

function fogVisuals() {
  applyFog(game.terrain, game.vis, game.seen);
  const c = new THREE.Color();
  for (const v of Object.values(veg)) for (const ch of v.chunks) {
    let changed = false;
    ch.placements.forEach(([x, z], i) => {
      const f = fogFactorAt(x, z, game.vis, game.seen);
      const want = (f < 0.2 ? 0.16 : f < 0.9 ? 0.55 : 1) * (v.bright || 1);
      if (ch.last?.[i] === want) return;
      (ch.last ||= [])[i] = want; changed = true;
      c.setScalar(want);
      for (const m of ch.meshes) m.setColorAt(i, c);
    });
    if (changed) for (const m of ch.meshes) m.instanceColor.needsUpdate = true;
  }
  for (const p of props) p.obj.visible = game.cellSeen(p.x, p.z) && !(p.obj === game.springs.find((s) => s.prop === p.obj)?.prop && game.springs.find((s) => s.prop === p.obj)?.shrine);
}

function start() {
  if (started) return;
  started = true;
  initAudio(); resumeAudio();
  $('start').classList.remove('on');
  $('ui').classList.add('on');
  if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) $('touch').classList.add('on');
  game.teams[0].wind = 50; game.teams[0].windTotal = 0; game.teams[0].rain = 0; game.teams[0].rainTotal = 0; game.time = 0;
  ui.refreshPanel(true); ui.renderObjectives();
  ui.toast('Your Vietras dance for Wind. Build, train, and find the rival clan.', 'good');
  sfx('objective');
}
$('startb').addEventListener('click', start);
$('startb').addEventListener('touchend', (e) => { e.preventDefault(); start(); });
window.__START__ = start;

/* ---------------------------------------------------------------- loop */
let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsT = 0, fps = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const real = Math.max(0.0001, (now - last) / 1000);
  const dt = Math.min(0.05, real);
  last = now;
  fpsAcc += real; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (!game || !ui) return;
  for (let k = 0; k < SPEED; k++) {
    if (started) ai.update(dt);
    game.update(started ? dt : dt * 0.6);
  }
  ui.updateCamera(dt);
  overlays(dt);
  fx.update(dt, heightAt);
  if (started) {
    ui.hud(dt);
    const g0 = game.grodOf(0);
    const near = g0 ? Math.max(0.25, 1 - Math.hypot(ui.target.x - g0.x, ui.target.y - g0.z) / 70) : 0.3;
    updateAudio(game.alive(0, (u) => u.anim.mode === 'dance').length, game.alive(0, (u) => u.anim.mode === 'rite').length, near);
  }
  renderer.info.autoReset = false; renderer.info.reset();
  rig.render(camera, dt);
  const G = window.__GAME__;
  G.pos[0] = ui.target.x; G.pos[1] = ui.target.y;
  G.fps = fps; G.speed = ui.camVel; G.over = !!game.over;
  G.score = Math.floor(game.teams[0].windTotal + game.teams[0].rainTotal + game.stats.kills * 10);
  G.draws = renderer.info.render.calls; G.tris = renderer.info.render.triangles;
  G.wind = Math.floor(game.teams[0].wind); G.rain = Math.floor(game.teams[0].rain); G.units = game.alive(0).length; G.time = game.time;
}

function overlays(dt) {
  fx.beginOverlays();
  const sel = new Set(game.selection);
  const t = fx.t;
  for (const u of game.units) {
    const shown = ui.shown(u);
    u.model.root.visible = shown || (u.dead && u.team === 0);
    if (!shown || u.dead) continue;
    const r = u.def.radius * (u.ut === 'spirit' ? 1.6 : 1.5);
    fx.shadow(u.x, u.y, u.z, r);
    const col = u.team === 0 ? 0x6cff5a : u.team === 1 ? 0xff5040 : 0xffd84a;
    if (sel.has(u)) fx.ring(u.x, u.y, u.z, u.def.radius * 1.5 + 0.2, col);
    if (sel.has(u) || u.hp < u.maxHp) fx.bar(u.x, u.y + u.def.height + 0.45, u.z, Math.max(0.9, u.def.radius * 1.8), u.hp / u.maxHp, col);
    if (u.anim.mode === 'dance') fx.windAround(u.x, u.y, u.z, t + u.id, 1);
    if (u.ut === 'spirit') fx.spiritAura(u.x, u.y, u.z);
  }
  for (const b of game.buildings) {
    const shown = ui.shown(b);
    b.root.visible = shown;
    if (!shown || b.dead) continue;
    const y = heightAt(b.x, b.z);
    const col = b.team === 0 ? 0x6cff5a : 0xff5040;
    if (sel.has(b)) fx.ring(b.x, y, b.z, b.def.size * 0.72, col);
    if (!b.built) fx.bar(b.x, y + b.def.height * (0.2 + 0.8 * b.progress) + 1, b.z, b.def.size * 0.5, b.progress, 0x7fc8ff);
    else if (sel.has(b) || b.hp < b.maxHp) fx.bar(b.x, y + b.def.height + 1, b.z, b.def.size * 0.5, b.hp / b.maxHp, col);
    if (b.bt === 'shrine' && b.built) {
      const n = b.workers.filter((w) => !w.dead && w.anim.mode === 'rite').length;
      if (n) fx.rainOver(b.x, y, b.z, n);
    }
    if (sel.has(b) && b.rally && b.team === 0) fx.ring(b.rally.x, heightAt(b.rally.x, b.rally.z), b.rally.z, 0.6 + 0.15 * Math.sin(t * 5), 0xffe07a);
  }
  for (const p of props) if (p.idol && p.obj.visible && Math.random() < 0.3) fx.sparkle(p.x + (Math.random() - 0.5) * 3, heightAt(p.x, p.z) + 5 + Math.random() * 2, p.z + (Math.random() - 0.5) * 3, 1, [0.62, 0.94, 0.78]);
  fx.endOverlays();
}

requestAnimationFrame(frame);
boot().catch((e) => { console.warn(e); msg.textContent = 'failed to load: ' + e.message; });
