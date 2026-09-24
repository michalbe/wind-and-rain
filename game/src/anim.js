/**
 * Procedural animation on the asset joints. Every pose is rest + delta, so an asset whose
 * joints have a non-zero rest rotation still animates correctly.
 *
 * Axis conventions (STYLE.md): character faces +Z, character's LEFT is +X.
 *  shoulder.x < 0 swings the arm forward/up; lShoulder.z > 0 / rShoulder.z < 0 raise sideways.
 *  hip.x < 0 swings the thigh forward; knee.x > 0 bends the shin back; elbow.x < 0 bends forward.
 */
const sin = Math.sin, cos = Math.cos, max = Math.max, PI = Math.PI;

function setJ(u, name, x = 0, y = 0, z = 0) {
  const j = u.model.joints[name]; if (!j) return;
  const r = u.model.rest[name].rot;
  j.rotation.set(r.x + x, r.y + y, r.z + z);
}
function offJ(u, name, dy = 0, dz = 0) {
  const j = u.model.joints[name]; if (!j) return;
  const p = u.model.rest[name].pos;
  j.position.set(p.x, p.y + dy, p.z + dz);
}
const ease = (t) => t * t * (3 - 2 * t);

/** 0..1 swing curve for an attack that started `t` seconds ago over `dur` seconds */
function swing(t, dur) { const k = t / dur; if (k <= 0 || k >= 1) return 0; return k < 0.45 ? ease(k / 0.45) : 1 - ease((k - 0.45) / 0.55); }

function humanoid(u, dt, pre = '') {
  const a = u.anim, s = u.def.height;
  const J = (n) => pre + n;
  const set = (n, x, y, z) => setJ(u, J(n), x, y, z);
  const t = a.t;
  // defaults: everything to rest
  for (const n of ['hips', 'spine', 'head', 'lShoulder', 'lElbow', 'rShoulder', 'rElbow', 'lHip', 'lKnee', 'rHip', 'rKnee']) set(n, 0, 0, 0);
  offJ(u, J('hips'), 0, 0);
  const mode = a.mode;
  if (mode === 'walk') {
    a.phase += dt * u.speedNow * (6.2 / max(1.2, s));
    const p = a.phase, sw = 0.55;
    set('lHip', -sin(p) * sw); set('rHip', sin(p) * sw);
    set('lKnee', max(0, sin(p + 1.4)) * 0.8); set('rKnee', max(0, -sin(p + 1.4)) * 0.8);
    if (!u.def.ranged || !a.aiming) { set('lShoulder', sin(p) * 0.45, 0, 0.08); set('rShoulder', -sin(p) * 0.45, 0, -0.08); }
    set('lElbow', -0.35); set('rElbow', -0.35);
    offJ(u, J('hips'), Math.abs(sin(p)) * 0.04 * s);
    set('spine', 0.06, sin(p) * 0.06, 0);
  } else if (mode === 'dance') {
    // Wind Dance: arms raised, slow spin (done on the instance), stamping feet, swaying hips
    const b = t * 3.1;
    set('lShoulder', -0.25 + sin(b) * 0.25, 0, 2.3 + sin(b * 0.5) * 0.35);
    set('rShoulder', -0.25 - sin(b) * 0.25, 0, -2.3 - sin(b * 0.5 + 1.3) * 0.35);
    set('lElbow', -0.5 - sin(b) * 0.3); set('rElbow', -0.5 + sin(b) * 0.3);
    const st = max(0, sin(b * 1.0)), st2 = max(0, -sin(b * 1.0));
    set('lHip', -st * 0.7); set('lKnee', st * 1.1);
    set('rHip', -st2 * 0.7); set('rKnee', st2 * 1.1);
    offJ(u, J('hips'), -Math.abs(sin(b)) * 0.07 * s);
    set('spine', -0.12, 0, sin(b * 0.5) * 0.18);
    set('head', -0.25, 0, sin(b * 0.5) * 0.15);
  } else if (mode === 'rite') {
    // Rain Rite: kneel, raise the vessel to the sky, pour, strike the ground with the staff
    const cyc = (t % 6) / 6;
    offJ(u, J('hips'), -0.24 * s);
    set('lHip', -1.25); set('lKnee', 1.9);          // left knee up, foot planted
    set('rHip', 0.15); set('rKnee', 1.6);           // right knee down
    const raise = cyc < 0.5 ? ease(cyc / 0.5) : 1 - ease((cyc - 0.5) / 0.5);
    set('lShoulder', -0.6 - raise * 2.1, 0, 0.25); set('lElbow', -0.4 + raise * 0.2);
    const strike = swing((t % 3) , 0.7);
    set('rShoulder', -0.5 - strike * 1.1, 0, -0.15); set('rElbow', -0.6 + strike * 0.5);
    set('spine', 0.2 - raise * 0.35);
    set('head', -raise * 0.45);
  } else if (mode === 'build') {
    const k = (t * 2.4) % 1;
    const h = k < 0.6 ? ease(k / 0.6) : 1 - ease((k - 0.6) / 0.4);
    set('rShoulder', -2.3 + h * 2.1); set('rElbow', -0.6 + h * 0.4);
    set('lShoulder', -0.8); set('lElbow', -0.9);
    set('spine', 0.35); set('lHip', -0.5); set('lKnee', 0.7); set('rHip', 0.2); set('rKnee', 0.3);
    offJ(u, J('hips'), -0.08 * s);
  } else if (mode === 'attack') {
    const k = swing(a.attackT, a.attackDur);
    if (u.def.ranged) {
      set('lShoulder', -1.55, 0, 0.1); set('lElbow', -0.05);
      const draw = a.attackT < a.attackDur * 0.8 ? ease(Math.min(1, a.attackT / (a.attackDur * 0.6))) : 0;
      set('rShoulder', -1.5, 0, -0.1 * draw); set('rElbow', -1.4 * draw - 0.2);
      set('spine', 0, -0.35, 0); set('head', 0, 0.3, 0);
      set('lHip', -0.2); set('rHip', 0.2);
    } else if (u.ut === 'spirit') {
      set('lShoulder', -2.6 + k * 2.4); set('rShoulder', -2.6 + k * 2.4);
      set('lElbow', -0.4); set('rElbow', -0.4); set('spine', -0.2 + k * 0.6);
    } else {
      set('rShoulder', -2.7 + k * 3.1, 0, -0.2); set('rElbow', -0.9 + k * 0.8);
      set('lShoulder', -0.9, 0, 0.3); set('lElbow', -1.0);
      set('spine', -0.1 + k * 0.35, 0.4 - k * 0.8, 0);
      set('lHip', -0.45); set('lKnee', 0.4); set('rHip', 0.3);
    }
  } else {
    // idle: breathing and a slow weight shift
    const b = t * 1.6 + u.id;
    set('spine', sin(b) * 0.03); set('head', sin(b * 0.7) * 0.06, sin(b * 0.3) * 0.2, 0);
    set('lShoulder', 0.02, 0, 0.08 + sin(b) * 0.02); set('rShoulder', 0.02, 0, -0.08 - sin(b) * 0.02);
    set('lElbow', -0.2); set('rElbow', -0.25);
    if (u.def.ranged) { set('lShoulder', -0.3, 0, 0.1); set('lElbow', -0.5); }
    if (u.ut === 'vitez') { set('rShoulder', -0.35, 0, -0.1); set('rElbow', -0.9); set('lShoulder', -0.5, 0, 0.2); set('lElbow', -1.1); }
  }
}

function quadruped(u, dt) {
  const a = u.anim, s = u.def.height;
  const set = (n, x, y, z) => setJ(u, n, x, y, z);
  for (const n of ['body', 'neck', 'head', 'flLeg', 'frLeg', 'blLeg', 'brLeg', 'flKnee', 'frKnee', 'blKnee', 'brKnee']) set(n, 0, 0, 0);
  offJ(u, 'body', 0, 0);
  const t = a.t, mode = a.mode;
  if (mode === 'walk') {
    const fast = u.ut === 'deer';
    a.phase += dt * u.speedNow * (fast ? 1.6 : 2.6) / max(1, s * 0.6);
    const p = a.phase, sw = fast ? 0.75 : 0.5;
    if (fast) { // gallop: front pair, then back pair
      set('flLeg', sin(p) * sw); set('frLeg', sin(p + 0.5) * sw);
      set('blLeg', sin(p + PI) * sw); set('brLeg', sin(p + PI + 0.5) * sw);
      set('flKnee', max(0, -cos(p)) * 0.9); set('frKnee', max(0, -cos(p + 0.5)) * 0.9);
      set('body', sin(p * 1) * 0.08); offJ(u, 'body', Math.abs(sin(p)) * 0.12 * s * 0.4);
      set('neck', -sin(p) * 0.12); set('head', sin(p) * 0.1);
    } else {    // bear: heavy diagonal walk
      set('flLeg', sin(p) * sw); set('brLeg', sin(p) * sw);
      set('frLeg', -sin(p) * sw); set('blLeg', -sin(p) * sw);
      set('body', 0, 0, sin(p) * 0.06); offJ(u, 'body', Math.abs(cos(p)) * 0.04 * s);
      set('head', 0, sin(p) * 0.15, 0); set('neck', 0.05);
    }
  } else if (mode === 'attack') {
    const k = swing(a.attackT, a.attackDur);
    if (u.ut === 'bear') {
      set('body', -k * 0.55); set('flLeg', -k * 1.6); set('frLeg', -k * 1.2);
      set('blLeg', k * 0.45); set('brLeg', k * 0.45);
      set('neck', k * 0.3); set('head', k * 0.35);
    } else {
      set('neck', k * 0.5); set('head', k * 0.4); set('flLeg', -k * 0.5); set('body', -k * 0.12);
    }
  } else {
    const b = t * 1.3 + u.id;
    set('body', sin(b) * 0.015); set('neck', sin(b * 0.6) * 0.08); set('head', sin(b * 0.4) * 0.1, sin(b * 0.23) * 0.4, 0);
  }
  if (u.ut === 'deer') {
    // the rider
    const rs = (n, x, y, z) => setJ(u, 'r_' + n, x, y, z);
    for (const n of ['hips', 'spine', 'head', 'lShoulder', 'lElbow', 'rShoulder', 'rElbow']) rs(n, 0, 0, 0);
    if (mode === 'attack') { const k = swing(a.attackT, a.attackDur); rs('rShoulder', -0.6 - k * 1.2); rs('rElbow', -1.2 + k * 1.1); rs('spine', 0, 0.3 - k * 0.6, 0); }
    else if (mode === 'walk') { rs('spine', 0.25); rs('rShoulder', -0.5); rs('rElbow', -0.8); rs('lShoulder', -0.6); rs('lElbow', -0.8); }
    else { rs('spine', sin(t * 1.2) * 0.04); rs('head', 0, sin(t * 0.4) * 0.4, 0); rs('rShoulder', -0.3); rs('rElbow', -0.6); }
  }
}

/** called every frame for every living unit */
export function animate(u, dt) {
  const a = u.anim;
  a.t += dt;
  if (a.attackT < a.attackDur) a.attackT += dt;
  const inst = u.model.inst, r = u.model.rest.__inst;
  if (a.mode === 'dance') inst.rotation.y += dt * 1.25;
  else inst.rotation.y += (0 - inst.rotation.y) * Math.min(1, dt * 6);
  if (u.model.joints.hips) humanoid(u, dt);
  else if (u.model.joints.body) quadruped(u, dt);
  inst.position.y = r.pos.y;
}

/** death: fall over and sink */
export function animateDeath(u, dt) {
  const inst = u.model.inst;
  u.deadT += dt;
  const k = Math.min(1, u.deadT / 0.7);
  inst.rotation.x = -ease(k) * PI / 2 * (u.model.joints.body ? 0 : 1);
  inst.rotation.z = u.model.joints.body ? ease(k) * PI / 2 : 0;
  if (u.deadT > 4) inst.position.y -= dt * 0.35;
}
