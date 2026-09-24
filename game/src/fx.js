/**
 * Everything small and numerous, each pooled into ONE draw call:
 * wind motes, rain streaks, dust/sparks, arrows, selection rings, blob shadows, health bars.
 */
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

/* ---------------------------------------------------------------- soft points */
function pointsMaterial(additive = true) {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 300 } },
    vertexShader: `attribute float aSize; attribute vec4 aColor; varying vec4 vColor;
      uniform float uScale;
      void main(){ vColor = aColor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec4 vColor; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d)*4.0; if(r>1.0) discard; gl_FragColor = vec4(vColor.rgb, vColor.a * (1.0 - r)); }`,
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}
class PointPool {
  constructor(scene, n, additive) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.size = new Float32Array(n);
    this.col = new Float32Array(n * 4); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grav = new Float32Array(n);
    this.base = new Float32Array(n * 4); this.baseSize = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.mat = pointsMaterial(additive);
    this.obj = new THREE.Points(g, this.mat); this.obj.frustumCulled = false; this.obj.renderOrder = 5;
    scene.add(this.obj);
  }
  emit(x, y, z, vx, vy, vz, life, size, r, g, b, a, grav = 0) {
    const i = this.i; this.i = (this.i + 1) % this.n;
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3);
    this.life[i] = life; this.max[i] = life; this.grav[i] = grav; this.baseSize[i] = size;
    this.base.set([r, g, b, a], i * 4);
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.max[i]);
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const fade = Math.min(1, (1 - k) * 6) * k;
      this.size[i] = this.baseSize[i] * (0.6 + 0.4 * k);
      this.col[i * 4] = this.base[i * 4]; this.col[i * 4 + 1] = this.base[i * 4 + 1]; this.col[i * 4 + 2] = this.base[i * 4 + 2];
      this.col[i * 4 + 3] = this.base[i * 4 + 3] * fade;
    }
    const g = this.obj.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aColor.needsUpdate = true;
  }
}

/* ---------------------------------------------------------------- instanced pools */
class InstPool {
  constructor(scene, geo, mat, n, { order = 0, shadow = false } = {}) {
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = order;
    this.mesh.castShadow = shadow;
    this.n = n; this.k = 0;
    for (let i = 0; i < n; i++) this.mesh.setColorAt(i, _c.set(1, 1, 1));
    scene.add(this.mesh);
  }
  begin() { this.k = 0; }
  put(m, color) { if (this.k >= this.n) return; this.mesh.setMatrixAt(this.k, m); if (color) this.mesh.setColorAt(this.k, color); this.k++; }
  end() { this.mesh.count = this.k; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; }
}

function blobTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}

/**
 * Wind ribbons: three streaks spiralling up around each dancer, rebuilt every frame into one
 * dynamic strip geometry (one draw call for every dancer on screen).
 */
class Ribbons {
  constructor(scene, max = 40, per = 3, seg = 14) {
    this.max = max; this.per = per; this.seg = seg;
    const quads = max * per * (seg - 1);
    this.pos = new Float32Array(quads * 4 * 3); this.alpha = new Float32Array(quads * 4);
    const idx = new Uint32Array(quads * 6);
    for (let q = 0; q < quads; q++) { const v = q * 4; idx.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], q * 6); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: 'attribute float aAlpha; varying float vA; void main(){ vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(0.86, 0.96, 1.0, vA); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
    scene.add(this.mesh);
    this.list = [];
  }
  add(x, y, z, t) { if (this.list.length < this.max) this.list.push([x, y, z, t]); }
  flush() {
    let q = 0;
    const P = this.pos, A = this.alpha, S = this.seg;
    for (const [x, y, z, t] of this.list) {
      for (let k = 0; k < this.per; k++) {
        const ph = t * 2.3 + k * 2.094;
        const lift = ((t * 0.45 + k / this.per) % 1);            // each ribbon rises, fades, restarts
        const fadeCycle = Math.sin(lift * Math.PI);
        let px = 0, py = 0, pz = 0;
        for (let s = 0; s < S; s++) {
          const u = s / (S - 1);
          const a = ph - u * 2.4;
          const r = 1.05 + 0.35 * Math.sin(a * 1.7 + k) + u * 0.25;
          const cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r, cy = y + 0.3 + lift * 2.6 - u * 1.1;
          const w = 0.16 * (1 - u * 0.7);
          if (s > 0) {
            const v = q * 4;
            P.set([px, py - w, pz, px, py + w, pz, cx, cy - w, cz, cx, cy + w, cz], v * 3);
            const a0 = (1 - (u - 1 / (S - 1))) * 0.75 * fadeCycle, a1 = (1 - u) * 0.75 * fadeCycle;
            A[v] = a0 * 0.3; A[v + 1] = a0; A[v + 2] = a1 * 0.3; A[v + 3] = a1;
            q++;
          }
          px = cx; py = cy; pz = cz;
        }
      }
    }
    // collapse the unused tail
    for (let i = q * 4; i < this.alpha.length; i++) this.alpha[i] = 0;
    const g = this.mesh.geometry;
    g.setDrawRange(0, q * 6);
    g.attributes.position.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true;
    this.list.length = 0;
  }
}

export class FX {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.wind = new PointPool(scene, 900, true);
    this.dust = new PointPool(scene, 500, false);
    this.glow = new PointPool(scene, 400, true);
    this.ribbons = new Ribbons(scene);
    this.clouds = new PointPool(scene, 160, false);
    // rain streaks
    this.rainN = 700;
    this.rainPos = new Float32Array(this.rainN * 6);
    this.rainVel = new Float32Array(this.rainN);
    this.rainLife = new Float32Array(this.rainN);
    this.rainI = 0;
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xc8ecff, transparent: true, opacity: 0.85, depthWrite: false }));
    this.rainX = new Float32Array(this.rainN * 3);
    this.rain.frustumCulled = false; scene.add(this.rain);
    // arrows
    const ag = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 4); ag.rotateX(Math.PI / 2);
    this.arrows = new InstPool(scene, ag, new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.8 }), 120);
    this.flying = [];
    // rings, shadows, bars
    const ring = new THREE.RingGeometry(0.86, 1, 32); ring.rotateX(-Math.PI / 2);
    this.rings = new InstPool(scene, ring, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, fog: false }), 260, { order: 3 });
    const disc = new THREE.PlaneGeometry(2, 2); disc.rotateX(-Math.PI / 2);
    this.shadows = new InstPool(scene, disc, new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, color: 0xffffff, fog: false }), 260, { order: 2 });
    const bar = new THREE.PlaneGeometry(1, 1);
    this.barsBg = new InstPool(scene, bar, new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, depthTest: false, transparent: true, opacity: 0.85, fog: false }), 300, { order: 10 });
    const barF = new THREE.PlaneGeometry(1, 1); barF.translate(0.5, 0, 0);
    this.barsFg = new InstPool(scene, barF, new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, depthTest: false, transparent: true, fog: false }), 300, { order: 11 });
    // order marker
    const mg = new THREE.RingGeometry(0.5, 0.75, 24); mg.rotateX(-Math.PI / 2);
    this.marker = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0x9fff7a, transparent: true, depthWrite: false, fog: false }));
    this.marker.visible = false; this.marker.renderOrder = 4; scene.add(this.marker);
    this.markerT = 0;
    this.t = 0;
  }

  /* one-shots */
  orderMarker(x, y, z, color = 0x9fff7a) { this.marker.position.set(x, y + 0.08, z); this.marker.material.color.setHex(color); this.markerT = 0.6; this.marker.visible = true; }
  puff(x, y, z, n = 8, color = [0.55, 0.47, 0.36], spread = 1, a = 0.55, size = 1.2) {
    for (let i = 0; i < n; i++) this.dust.emit(x + (Math.random() - 0.5) * spread, y + Math.random() * 0.5, z + (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 1.2, 0.8 + Math.random() * 0.8, size * (0.7 + Math.random() * 0.6), color[0], color[1], color[2], a, 0.6);
  }
  blood(x, y, z, n = 5) { for (let i = 0; i < n; i++) this.dust.emit(x, y, z, (Math.random() - 0.5) * 2.5, 1 + Math.random() * 2, (Math.random() - 0.5) * 2.5, 0.5, 0.35, 0.55, 0.08, 0.06, 0.9, 9); }
  sparkle(x, y, z, n, rgb) { for (let i = 0; i < n; i++) this.glow.emit(x + (Math.random() - 0.5), y + Math.random() * 2, z + (Math.random() - 0.5), (Math.random() - 0.5), 1 + Math.random() * 2, (Math.random() - 0.5), 1.2, 0.5, rgb[0], rgb[1], rgb[2], 0.9); }
  arrow(from, to, speed, onHit) {
    const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
    const T = Math.max(0.2, d / speed);
    this.flying.push({ x0: from.x, y0: from.y, z0: from.z, x1: to.x, y1: to.y, z1: to.z, t: 0, T, arc: Math.min(3.5, d * 0.14), onHit });
  }

  /* per-frame emitters */
  windAround(x, y, z, t, strength = 1) {
    this.ribbons.add(x, y, z, t);
    // and a few motes circling the dancer, spiralling upward
    for (let k = 0; k < 1; k++) {
      const a = t * 3 + Math.random() * 6.28, r = 1.2 + Math.random() * 1.1;
      this.wind.emit(x + Math.cos(a) * r, y + 0.3 + Math.random() * 2.6, z + Math.sin(a) * r,
        -Math.sin(a) * 3.2 * strength, 0.5 + Math.random() * 0.6, Math.cos(a) * 3.2 * strength, 1.0 + Math.random() * 0.6, 0.42 + Math.random() * 0.3, 0.85, 0.95, 1.0, 0.7);
    }
  }
  rainOver(x, y, z, rate = 1) {
    for (let k = 0; k < rate * 2; k++) {
      const i = this.rainI; this.rainI = (this.rainI + 1) % this.rainN;
      const px = x + (Math.random() - 0.5) * 3.4, pz = z + (Math.random() - 0.5) * 3.4, py = y + 5 + Math.random() * 2.5;
      this.rainPos.set([px, py, pz, px + 0.03, py - 0.8, pz], i * 6);
      this.rainVel[i] = 11 + Math.random() * 3; this.rainLife[i] = (py - y - 0.3) / this.rainVel[i];
      this.rainX.set([px, y + 0.25, pz], i * 3);
    }
    // a small dark raincloud gathering over the shrine
    if (Math.random() < 0.5) this.clouds.emit(x + (Math.random() - 0.5) * 3.6, y + 7.2 + Math.random() * 0.8, z + (Math.random() - 0.5) * 3.6, (Math.random() - 0.5) * 0.4, 0.05, (Math.random() - 0.5) * 0.4, 2.6, 3.2 + Math.random() * 1.6, 0.34, 0.38, 0.44, 0.75);
  }
  spiritAura(x, y, z) { if (Math.random() < 0.5) this.glow.emit(x + (Math.random() - 0.5) * 3, y + Math.random() * 4.5, z + (Math.random() - 0.5) * 3, 0, 0.4 + Math.random() * 0.4, 0, 2, 0.35, 0.62, 0.94, 0.78, 0.8); }

  update(dt, heightAt) {
    this.t += dt;
    this.wind.update(dt); this.dust.update(dt); this.glow.update(dt); this.clouds.update(dt);
    this.ribbons.flush();
    for (let i = 0; i < this.rainN; i++) {
      if (this.rainLife[i] <= 0) { this.rainPos[i * 6 + 1] = -99; this.rainPos[i * 6 + 4] = -99; continue; }
      this.rainLife[i] -= dt; const dy = this.rainVel[i] * dt;
      if (this.rainLife[i] <= 0 && Math.random() < 0.6) this.glow.emit(this.rainX[i * 3], this.rainX[i * 3 + 1], this.rainX[i * 3 + 2], (Math.random() - 0.5) * 0.8, 0.8, (Math.random() - 0.5) * 0.8, 0.35, 0.35, 0.7, 0.88, 1.0, 0.8, 5);
      this.rainPos[i * 6 + 1] -= dy; this.rainPos[i * 6 + 4] -= dy;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
    // arrows
    this.arrows.begin();
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const a = this.flying[i]; a.t += dt; const k = Math.min(1, a.t / a.T);
      const x = a.x0 + (a.x1 - a.x0) * k, z = a.z0 + (a.z1 - a.z0) * k, y = a.y0 + (a.y1 - a.y0) * k + Math.sin(k * Math.PI) * a.arc;
      const k2 = Math.min(1, k + 0.02);
      const nx = a.x0 + (a.x1 - a.x0) * k2, nz = a.z0 + (a.z1 - a.z0) * k2, ny = a.y0 + (a.y1 - a.y0) * k2 + Math.sin(k2 * Math.PI) * a.arc;
      _p.set(x, y, z); _m.lookAt(_p, new THREE.Vector3(nx, ny, nz), UP); _q.setFromRotationMatrix(_m); _s.set(1, 1, 1);
      _m.compose(_p, _q, _s); this.arrows.put(_m);
      if (k >= 1) { this.flying.splice(i, 1); a.onHit && a.onHit(); }
    }
    this.arrows.end();
    if (this.marker.visible) {
      this.markerT -= dt; const k = Math.max(0, this.markerT / 0.6);
      this.marker.scale.setScalar(0.6 + (1 - k) * 1.2); this.marker.material.opacity = k;
      if (this.markerT <= 0) this.marker.visible = false;
    }
  }

  /** rings/shadows/bars are rebuilt each frame by the game from its entity list */
  beginOverlays() { this.rings.begin(); this.shadows.begin(); this.barsBg.begin(); this.barsFg.begin(); }
  ring(x, y, z, r, color) { _p.set(x, y + 0.06, z); _q.identity(); _s.set(r, 1, r); _m.compose(_p, _q, _s); this.rings.put(_m, _c.setHex(color)); }
  shadow(x, y, z, r) { _p.set(x, y + 0.04, z); _q.identity(); _s.set(r, 1, r); _m.compose(_p, _q, _s); this.shadows.put(_m); }
  bar(x, y, z, w, frac, color) {
    const q = this.camera.quaternion;
    _p.set(x, y, z); _s.set(w + 0.12, 0.2, 1); _m.compose(_p, q, _s); this.barsBg.put(_m, _c.setHex(0x151008));
    // the fill starts at the left edge of the background
    const left = new THREE.Vector3(-w / 2, 0, 0).applyQuaternion(q);
    _p.set(x + left.x, y + left.y, z + left.z + 0.001); _s.set(Math.max(0.001, w * frac), 0.12, 1); _m.compose(_p, q, _s); this.barsFg.put(_m, _c.setHex(color));
  }
  endOverlays() { this.rings.end(); this.shadows.end(); this.barsBg.end(); this.barsFg.end(); }
}
