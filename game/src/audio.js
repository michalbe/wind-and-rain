/**
 * All sound is synthesised with WebAudio at runtime. No files.
 *
 * The economy is the soundtrack (design doc section 19): every dancing Vietra adds a layer
 * to one settlement rhythm (frame drum, ankle bells, wooden clave, a soft vocal drone, wind),
 * and working Zhercas add a low chant, water, a slow drum and distant thunder.
 */
let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
let windNode = null, windGain = null, chantGain = null, chantOsc = [], waterGain = null;
let beat = 0, nextBeat = 0;
const state = { dancers: 0, ritualists: 0, near: 1, muted: false };

export function initAudio() {
  if (ctx) return;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; return; }
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(comp);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // wind bed
  windNode = noise(true);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
  windGain = ctx.createGain(); windGain.gain.value = 0;
  windNode.connect(bp); bp.connect(windGain); windGain.connect(musicBus); windNode.start();
  // chant drone: two detuned saws through a vowel formant
  chantGain = ctx.createGain(); chantGain.gain.value = 0;
  const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 6;
  const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 880; f2.Q.value = 8;
  for (const fr of [98, 98.7, 146.8]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f1); o.connect(f2); o.start(); chantOsc.push(o); }
  f1.connect(chantGain); f2.connect(chantGain); chantGain.connect(musicBus);
  // water trickle
  const wn = noise(true); const wf = ctx.createBiquadFilter(); wf.type = 'highpass'; wf.frequency.value = 1800;
  const wf2 = ctx.createBiquadFilter(); wf2.type = 'lowpass'; wf2.frequency.value = 5200;
  waterGain = ctx.createGain(); waterGain.gain.value = 0;
  wn.connect(wf); wf.connect(wf2); wf2.connect(waterGain); waterGain.connect(musicBus); wn.start();
  nextBeat = ctx.currentTime + 0.1;
}
export function resumeAudio() { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); }
export function setMuted(m) { state.muted = m; if (master) master.gain.value = m ? 0 : 0.8; }
export function isMuted() { return state.muted; }

function noise(loop = false) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = loop; return s; }
function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }

/* ---------------------------------------------------------------- instruments */
function drum(t, freq = 90, vol = 0.5, bus = musicBus) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(freq * 1.8, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
  env(g, t, 0.005, vol, 0.35); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.5);
  const n = noise(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
  nf.type = 'lowpass'; nf.frequency.value = 900; env(ng, t, 0.002, vol * 0.35, 0.08);
  n.connect(nf); nf.connect(ng); ng.connect(bus); n.start(t); n.stop(t + 0.15);
}
function bells(t, vol = 0.12) {
  for (let k = 0; k < 3; k++) {
    const tt = t + k * 0.018;
    for (const f of [3150, 4420, 5870]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * (1 + Math.random() * 0.02);
      env(g, tt, 0.002, vol / 3, 0.22); o.connect(g); g.connect(musicBus); o.start(tt); o.stop(tt + 0.3);
    }
  }
}
function clave(t, vol = 0.18, f = 1250) {
  const o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = f; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 12;
  env(g, t, 0.001, vol, 0.07); o.connect(bp); bp.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.12);
}
function voice(t, freq, dur, vol = 0.08, bus = musicBus) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = freq;
  const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5; vg.gain.value = freq * 0.012; vib.connect(vg); vg.connect(o.frequency);
  const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 700; f1.Q.value = 5;
  const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 7;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(bus);
  o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
}
function thunder(t) {
  const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'lowpass'; f.frequency.setValueAtTime(420, t); f.frequency.exponentialRampToValueAtTime(70, t + 3.5);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
  n.connect(f); f.connect(g); g.connect(musicBus); n.start(t); n.stop(t + 4.2);
}

/* ---------------------------------------------------------------- the settlement rhythm */
const BPM = 92, SPB = 60 / BPM / 2;   // eighth notes
const SCALE = [196, 220, 261.6, 293.7, 329.6];
export function updateAudio(dancers, ritualists, near) {
  if (!ctx || ctx.state !== 'running') return;
  state.dancers = dancers; state.ritualists = ritualists; state.near = near;
  const now = ctx.currentTime;
  const k = Math.min(1, dancers / 6) * near;
  windGain.gain.setTargetAtTime(0.02 + 0.10 * k, now, 0.8);
  chantGain.gain.setTargetAtTime(ritualists ? Math.min(0.05, 0.018 + ritualists * 0.008) * Math.max(0.35, near) : 0, now, 1.2);
  waterGain.gain.setTargetAtTime(ritualists ? 0.025 : 0, now, 1.0);
  while (nextBeat < now + 0.25) {
    const t = nextBeat, b = beat % 16;
    const d = dancers * near;
    if (d > 0.3 && (b === 0 || b === 6 || b === 8 || b === 11)) drum(t, b === 0 ? 80 : 110, 0.28 + 0.05 * Math.min(4, dancers));
    if (d > 1.3 && (b % 4 === 2)) bells(t, 0.07 + 0.015 * Math.min(4, dancers));
    if (d > 2.3 && (b === 3 || b === 7 || b === 10 || b === 14)) clave(t, 0.1);
    if (d > 3.3 && b === 0 && beat % 32 === 0) voice(t, SCALE[(beat / 32 | 0) % SCALE.length], SPB * 14, 0.05);
    if (d > 4.3 && b === 8 && beat % 32 === 8) voice(t, SCALE[((beat / 32 | 0) + 2) % SCALE.length] * 1.5, SPB * 7, 0.035);
    if (ritualists && b === 0 && beat % 32 === 0) drum(t, 55, 0.3);
    if (ritualists && beat % 256 === 128 && Math.random() < 0.7) thunder(t + Math.random());
    nextBeat += SPB; beat++;
  }
}

/* ---------------------------------------------------------------- sound effects */
const last = {};
function throttle(name, ms) { const n = performance.now(); if (last[name] && n - last[name] < ms) return false; last[name] = n; return true; }
export function sfx(name, vol = 1) {
  if (!ctx || ctx.state !== 'running' || !throttle(name, name === 'click' ? 30 : 70)) return;
  const t = ctx.currentTime;
  if (name === 'bow') {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.12);
    env(g, t, 0.002, 0.18 * vol, 0.14); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.2);
  } else if (name === 'hit') {
    const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
    env(g, t, 0.002, 0.3 * vol, 0.09); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + 0.12);
    drum(t, 70, 0.25 * vol, sfxBus);
  } else if (name === 'axe') {
    const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 2600;
    env(g, t, 0.001, 0.22 * vol, 0.16); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + 0.2);
    drum(t, 60, 0.35 * vol, sfxBus);
  } else if (name === 'shout') {
    voice(t, 150 + Math.random() * 60, 0.35, 0.08 * vol, sfxBus);
  } else if (name === 'roar') {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(70, t + 0.8);
    f.type = 'lowpass'; f.frequency.value = 600; env(g, t, 0.05, 0.3 * vol, 0.8);
    o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.95);
  } else if (name === 'deer') {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.5);
    env(g, t, 0.03, 0.12 * vol, 0.5); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.6);
  } else if (name === 'spirit') {
    for (const fr of [55, 82.4, 110.3]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = fr;
      env(g, t, 0.4, 0.14 * vol, 2.2); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 2.8); }
  } else if (name === 'collapse') {
    const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(90, t + 1.6);
    env(g, t, 0.02, 0.45 * vol, 1.6); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + 1.8);
  } else if (name === 'knock') {
    clave(t, 0.12 * vol, 520 + Math.random() * 120);
  } else if (name === 'trained') {
    [392, 523.3].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; env(g, t + i * 0.09, 0.005, 0.12, 0.3); o.connect(g); g.connect(sfxBus); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.4); });
  } else if (name === 'objective') {
    [392, 493.9, 587.3, 784].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; env(g, t + i * 0.11, 0.005, 0.12, 0.55); o.connect(g); g.connect(sfxBus); o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.7); });
  } else if (name === 'click') {
    clave(t, 0.08, 1800);
  } else if (name === 'deny') {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 140; env(g, t, 0.005, 0.06, 0.15); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.2);
  } else if (name === 'alarm') {
    drum(t, 70, 0.5, sfxBus); drum(t + 0.25, 70, 0.5, sfxBus); drum(t + 0.5, 60, 0.6, sfxBus);
  } else if (name === 'victory') {
    [261.6, 329.6, 392, 523.3].forEach((f, i) => voice(t + i * 0.25, f, 1.8, 0.07, sfxBus));
  } else if (name === 'defeat') {
    [220, 207.7, 174.6].forEach((f, i) => voice(t + i * 0.4, f, 2.2, 0.07, sfxBus));
  }
}
