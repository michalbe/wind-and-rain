// grod.js: Wind & Rain building, generated as code (no imports, no textures). Candidate grod_c.
export default function (THREE) {
  const g = new THREE.Group();
  let _s = 15660;
  const rnd = () => (_s = (_s * 16807) % 2147483647) / 2147483647;
  const J = (a) => (rnd() - 0.5) * 2 * a;
  const PI = Math.PI;
  const PAL = {
    team: [0xc0282d, 'fabric'], timL: [0xa27a4f, 'timber'], timD: [0x5e4029, 'timber'],
    thatch: [0x8a6a3a, 'fabric'], thatchS: [0x5a4424, 'fabric'], daub: [0xd8cdb0, 'plaster'],
    stone: [0x8d8a80, 'stone'], stoneD: [0x5f5d57, 'stone'], linen: [0xe6dcc3, 'fabric'],
    ochre: [0xc98a2b, 'fabric'], iron: [0x6f7479, 'metal'], leather: [0x6b4526, 'fabric'],
    bone: [0xe0cfa8, ''], bark: [0x4a3322, 'timber'], pine: [0x2f4f2c, 'foliage'],
    pineD: [0x223b22, 'foliage'], moss: [0x6f8f3a, 'foliage'], water: [0x4f8fb0, ''],
    glow: [0x9ff0c8, ''], fur: [0x5a3b22, 'fabric'],
  };
  const MATS = {};
  const m = (k) => {
    if (MATS[k]) return MATS[k];
    const o = { color: PAL[k][0], roughness: 0.9 };
    if (k === 'iron') { o.metalness = 0.5; o.roughness = 0.55; }
    if (k === 'water') o.roughness = 0.15;
    if (k === 'glow') { o.emissive = PAL[k][0]; o.emissiveIntensity = 1.5; }
    if (k === 'team' || k === 'linen') o.side = THREE.DoubleSide;
    const mm = new THREE.MeshStandardMaterial(o);
    mm.name = PAL[k][1];
    return (MATS[k] = mm);
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  function put(geo, k, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, p = g) {
    const o = new THREE.Mesh(geo, m(k));
    o.position.set(x, y, z); o.rotation.set(rx, ry, rz); p.add(o); return o;
  }
  const box = (w, h, d, k, x, y, z, rx, ry, rz, p) => put(new THREE.BoxGeometry(w, h, d), k, x, y, z, rx, ry, rz, p);
  const cyl = (rt, rb, h, k, x, y, z, seg = 7, rx, ry, rz, p) => put(new THREE.CylinderGeometry(rt, rb, h, seg), k, x, y, z, rx, ry, rz, p);
  const sph = (r, k, x, y, z, ws = 7, hs = 5, p) => put(new THREE.SphereGeometry(r, ws, hs), k, x, y, z, 0, 0, 0, p);
  const cone = (r, h, k, x, y, z, seg = 6, rx, ry, rz, p) => put(new THREE.ConeGeometry(r, h, seg), k, x, y, z, rx, ry, rz, p);
  const grp = (x = 0, y = 0, z = 0, ry = 0, p = g) => { const o = new THREE.Group(); o.position.set(x, y, z); o.rotation.y = ry; p.add(o); return o; };
  function orient(o, a, b) {
    const A = V(...a), B = V(...b), d = B.clone().sub(A);
    o.position.set((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    o.quaternion.setFromUnitVectors(UP, d.normalize());
    return o;
  }
  const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  // round rod from a to b (radius r at a, r2 at b)
  const rod = (a, b, r, k, seg = 6, r2 = r, p = g) => orient(put(new THREE.CylinderGeometry(r2, r, len(a, b), seg), k, 0, 0, 0, 0, 0, 0, p), a, b);
  // square beam from a to b, w across (local x), t thick (local z)
  const bar = (a, b, w, t, k, p = g) => orient(put(new THREE.BoxGeometry(w, len(a, b), t), k, 0, 0, 0, 0, 0, 0, p), a, b);
  // log along x
  const logX = (L, r, k, x, y, z, p, seg = 6) => cyl(r * (1 + J(0.08)), r * (1 + J(0.08)), L, k, x + J(0.03), y, z + J(0.02), seg, J(0.02), 0, PI / 2 + J(0.012), p);
  const logZ = (L, r, k, x, y, z, p, seg = 6) => cyl(r * (1 + J(0.08)), r * (1 + J(0.08)), L, k, x + J(0.02), y, z + J(0.03), seg, PI / 2 + J(0.012), 0, J(0.02), p);
  // ---- house kit (local frame: ridge runs along z) ----
  // log walls w (x) by d (z), from y0 up h; optional centred door gap in the +z wall
  function logWalls(p, w, d, y0, h, r, k, o = {}) {
    const step = r * 1.9, n = Math.max(1, Math.round(h / step)), ov = o.over ?? r * 2.4;
    for (let i = 0; i < n; i++) {
      const yx = y0 + r + i * step, yz = yx + step / 2;
      for (const s of [-1, 1]) {
        const L = w + 2 * ov, z = s * d / 2;
        if (s === 1 && o.door && yx < y0 + o.door.h) {
          const seg = (L - o.door.w) / 2;
          for (const t of [-1, 1]) logX(seg, r, k, t * (o.door.w / 2 + seg / 2), yx, z, p);
        } else logX(L, r, k, 0, yx, z, p);
        logZ(d + 2 * ov, r, k, s * w / 2, yz, 0, p);
      }
    }
    return y0 + r + (n - 1) * step + step / 2 + r * 0.6;
  }
  // gable triangle of shortening logs in plane z
  function gableLogs(p, w, z, yW, rise, r, k) {
    for (let y = yW + r; ; y += r * 1.9) {
      const W = w * (1 - (y + r - yW) / rise) + 0.2;
      if (W < 0.4) break;
      put(new THREE.CylinderGeometry(r, r, W, 6, 1, true), k, J(0.03), y, z + J(0.02), 0, 0, PI / 2 + J(0.015), p);
    }
  }
  // gable triangle of vertical planks in plane z
  function gablePlanks(p, w, z, yW, rise, k, pw = 0.42) {
    const n = Math.floor(w / pw);
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + pw * (i + 0.5) + (w - n * pw) / 2;
      const h = rise * (1 - (Math.abs(x) + pw / 2) / (w / 2)) + 0.1;
      if (h > 0.15) box(pw * 0.92, h, 0.1, k, x, yW + h / 2, z + J(0.02), 0, 0, J(0.02), p);
    }
  }
  // thatch roof, two slopes of stepped courses; returns geometry info for trims.
  // Each course is kicked out at its lower edge (o.lip, ~0.25 m) so it throws a shadow line onto
  // the next, and courses alternate light/dark thatch so the banding reads from a high camera.
  function roof(p, o) {
    const a = Math.atan2(o.rise, o.w / 2), c = Math.cos(a), s = Math.sin(a), yR = o.yW + o.rise;
    const Ls = (o.w / 2 + o.over) / c, zf = o.ozF ?? o.oz, zb = o.ozB ?? o.oz, L = o.l + zf + zb, zc = (zf - zb) / 2;
    const n = o.courses || 1, th = o.th, lip = o.lip ?? 0.25;
    for (const sx of [-1, 1]) {
      // point on this slope: t = distance down-slope from the ridge, q = height off the roof plane
      const P = (t, q) => [sx * (c * t + s * q), yR - s * t + c * q];
      for (let i = 0; i < n; i++) {
        const t0 = Ls * i / n, t1 = Ls * (i + 1) / n + (i < n - 1 ? 0.25 : 0);
        const A = P(t0, th / 2), B = P(t1, th / 2 + lip), ln = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const k = i % 2 ? (o.kS || 'thatchS') : (o.k || 'thatch');
        box(ln + 0.02, th, L + J(0.1) + i * 0.1, k, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, zc + J(0.05), 0, J(0.01), Math.atan2(B[1] - A[1], B[0] - A[0]) + J(0.015), p);
      }
      if (o.rolls) for (let i = 1; i < n; i++) { // dark rope binding just under each lip
        const Q = P(Ls * i / n + 0.12, th * 1.05);
        cyl(th * 0.3, th * 0.3, L + 0.05, 'timD', Q[0], Q[1], zc, 5, PI / 2, 0, 0, p);
      }
      if (o.eave !== false) { const E = P(Ls, lip + th * 0.35); cyl(th * 0.6, th * 0.6, L + 0.1 + n * 0.1, o.kS || 'thatchS', E[0], E[1], zc, 6, PI / 2, 0, 0, p); }
      if (o.cloth) { // team-colour ridge cloth laid over the top course, both slopes
        const C0 = P(0.1, th * 1.02), C1 = P(o.cloth, th * 1.02 + lip * o.cloth / (Ls / n));
        box(Math.hypot(C1[0] - C0[0], C1[1] - C0[1]), 0.08, L * (o.clothL ?? 0.92), 'team', (C0[0] + C1[0]) / 2, (C0[1] + C1[1]) / 2, zc, 0, 0, Math.atan2(C1[1] - C0[1], C1[0] - C0[0]), p);
      }
    }
    const yTop = yR + th / c * 0.75;
    if (o.ridge !== false) {
      cyl(th * 0.95, th * 0.95, L + 0.35, o.kS || 'thatchS', 0, yTop, zc, 7, PI / 2, 0, 0, p);
      box(0.34, 0.3, L + 0.9, 'timD', 0, yTop + th * 0.95 + 0.08, zc, 0, 0, 0, p); // dark ridge beam
      for (const z of [-0.42, -0.14, 0.14, 0.42]) box(0.5, 0.18, 0.18, 'timD', 0, yTop + th * 0.95 - 0.02, zc + z * L, 0, 0, 0, p); // pegs
    }
    return { a, c, s, yR, Ls, L, zc, zf, zb, th, lip };
  }
  // crossed barge boards ending in horse heads, gable in plane z
  function horses(p, R, z, k = 'timD', ext = 1.0, bw = 0.3) {
    const { c, s, yR, Ls, th, lip } = R;
    for (const sx of [-1, 1]) {
      const off = th + lip + 0.08, zz = z + sx * 0.06;
      const P = (t) => [sx * (c * t + s * off), yR - s * t + c * off, zz];
      bar(P(Ls * 0.97), P(-ext), bw, 0.14, k, p);
      const E = P(-ext), o = -sx; // head points outward to the -sx side
      box(0.66, 0.3, 0.17, k, E[0] + o * 0.26, E[1] + 0.08, zz, 0, 0, sx * 0.45, p); // head
      box(0.3, 0.2, 0.16, k, E[0] + o * 0.55, E[1] - 0.08, zz, 0, 0, sx * 0.8, p); // muzzle
      cone(0.07, 0.26, k, E[0] + o * 0.02, E[1] + 0.33, zz, 4, 0, 0, sx * 0.3, p); // ear
      for (let i = 1; i <= 3; i++) { const q = P(-ext + i * 0.28); box(0.12, 0.14, 0.18, k, q[0] - o * 0.05, q[1] + 0.16, zz, 0, 0, sx * a2(c, s), p); } // mane notches
    }
  }
  function a2(c, s) { return Math.atan2(s, c); }
  // sharpened stake
  function stake(p, x, z, h, r, k = 'timL', lean = 0.04) {
    const rx = J(lean), rz = J(lean);
    const o = put(new THREE.CylinderGeometry(r, r * 1.05, h * 0.82, 5, 1, true), k, x, h * 0.41, z, rx, 0, rz, p);
    cone(r, h * 0.2, k, x + Math.sin(-rz) * h * 0.9, h * 0.91, z + Math.sin(rx) * h * 0.9, 5, rx, 0, rz, p);
  }
  // arc of stakes centred cx,cz radius R from angle t0 to t1 (t=0 points +z)
  function palisade(p, cx, cz, R, t0, t1, h, r = 0.13, k = 'timL', kR = 'timD') {
    const n = Math.round(R * (t1 - t0) / (r * 2.15));
    for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n; stake(p, cx + R * Math.sin(t), cz + R * Math.cos(t), h * (1 + J(0.12)), r * (1 + J(0.1)), k); }
    for (const y of [h * 0.3, h * 0.62]) {
      const tor = put(new THREE.TorusGeometry(R - r * 1.3, 0.07, 4, Math.max(6, Math.round(n / 2)), t1 - t0), kR, cx, y, cz, PI / 2, 0, PI / 2 - t1, p);
    }
  }
  // flat triangle plate (gable infill) in plane z, facing +z
  function triPlate(p, w, h, z, y, k, t = 0.1) {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.lineTo(-w / 2, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }); geo.translate(0, 0, -t / 2);
    return put(geo, k, 0, y, z, 0, 0, 0, p);
  }
  // cloth draped over a lintel on a +z facing wall, centred x at height y
  function doorCloth(p, x, y, z, w) {
    box(w, 0.1, 0.34, 'team', x, y + 0.04, z, 0, 0, 0, p);
    box(w, 0.55, 0.05, 'team', x, y - 0.25, z + 0.17, 0.08, 0, 0, p);
    for (const s of [-1, 1]) box(0.22, 0.9, 0.05, 'team', x + s * (w / 2 - 0.12), y - 0.5, z + 0.19, 0.05, 0, s * 0.05, p);
  }
  // daub patch on a wall face; axis 'x' = face normal along x
  function patch(p, axis, s, pos, y, u, w, h) {
    if (axis === 'x') box(0.08, h, w, 'daub', pos + s * 0.02, y, u, 0, 0, J(0.05), p);
    else box(w, h, 0.08, 'daub', u, y, pos + s * 0.02, 0, 0, J(0.05), p);
  }
  // heavy timber frame wall from (x0,z0) to (x1,z1): posts, sill, plate, plank infill, braces
  function frameWall(p, x0, z0, x1, z1, y0, h, bays, o = {}) {
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), ang = Math.atan2(-dz, dx);
    const W = grp((x0 + x1) / 2, 0, (z0 + z1) / 2, ang, p);
    const ps = o.post ?? 0.4;
    box(L + 0.7, 0.4, 0.46, 'timD', 0, y0 + 0.2, 0, 0, 0, J(0.01), W);
    box(L + 0.9, 0.44, 0.5, 'timD', 0, y0 + h - 0.1, 0, 0, 0, J(0.015), W);
    for (let i = 0; i <= bays; i++) box(ps, h, ps + 0.06, 'timD', -L / 2 + L * i / bays + J(0.03), y0 + h / 2, 0, 0, 0, J(0.02), W);
    const bw = L / bays;
    for (let i = 0; i < bays; i++) {
      const cx = -L / 2 + bw * (i + 0.5);
      if (o.door === i) {
        const n = 3, dw = Math.min(1.5, bw - ps - 0.1);
        for (let j = 0; j < n; j++) box(dw / n - 0.03, h * 0.75, 0.08, 'timD', cx - dw / 2 + dw / n * (j + 0.5), y0 + 0.4 + h * 0.37, -0.1, 0, 0, J(0.02), W);
        box(bw, 0.4, 0.5, 'timD', cx, y0 + 0.4 + h * 0.76, 0.02, 0, 0, J(0.02), W);
        if (bw - ps - dw > 0.3) for (const s of [-1, 1]) box((bw - ps - dw) / 2, h - 0.6, 0.12, o.infill || 'timL', cx + s * (dw / 2 + (bw - ps - dw) / 4), y0 + h / 2, -0.05, 0, 0, 0, W);
        continue;
      }
      const pn = Math.max(2, Math.round((bw - ps) / 0.45));
      if (o.infill === 'daub') box(bw - ps, h - 0.6, 0.12, 'daub', cx, y0 + h / 2, -0.05, 0, 0, 0, W);
      else for (let j = 0; j < pn; j++) box((bw - ps) / pn - 0.03, h - 0.6, 0.12, 'timL', cx - (bw - ps) / 2 + (bw - ps) / pn * (j + 0.5), y0 + h / 2 + J(0.03), -0.05, 0, 0, J(0.015), W);
      if (o.brace !== false && (i === 0 || i === bays - 1)) {
        const sx = i === 0 ? 1 : -1;
        bar([cx - sx * (bw / 2 - ps / 2), y0 + 0.4, 0.1], [cx + sx * (bw / 2 - ps / 2), y0 + h - 0.35, 0.1], 0.22, 0.14, 'timD', W);
      }
    }
    return W;
  }
  // weapon rack facing +z: posts, rails, leaning spears, shields with team faces
  function rack(p, x, z, w, ry = 0, shields = 2) {
    const R = grp(x, 0, z, ry, p);
    for (const s of [-1, 1]) cyl(0.09, 0.11, 1.9, 'timD', s * w / 2, 0.95, 0, 6, 0, 0, 0, R);
    box(w + 0.3, 0.12, 0.14, 'timD', 0, 1.7, 0, 0, 0, 0, R);
    box(w + 0.3, 0.1, 0.12, 'timD', 0, 0.4, 0.15, 0, 0, 0, R);
    const n = Math.max(3, Math.round(w / 0.35));
    for (let i = 0; i < n; i++) {
      const sx = -w / 2 + 0.15 + (w - 0.3) * i / (n - 1), top = 2.5 + J(0.15);
      rod([sx, 0.02, 0.35], [sx + J(0.08), top, -0.08], 0.035, 'timL', 4);
      cone(0.07, 0.35, 'iron', sx, top + 0.17, -0.1, 4, -0.17, 0, 0, R);
    }
    for (let i = 0; i < shields; i++) {
      const sx = shields === 1 ? 0 : -w / 2 + 0.45 + (w - 0.9) * i / (shields - 1);
      cyl(0.48, 0.48, 0.07, 'team', sx, 1.15, 0.32, 10, PI / 2 - 0.12, 0, 0, R);
      put(new THREE.TorusGeometry(0.48, 0.05, 4, 10), 'timD', sx, 1.15, 0.36, -0.12, 0, 0, R);
      sph(0.12, 'iron', sx, 1.15, 0.38, 6, 4, R);
    }
    return R;
  }
  // skull with antlers facing +z, centred at x,y,z, scale sc
  function trophy(p, x, y, z, sc = 1, k = 'bone') {
    const T = grp(x, y, z, 0, p); T.scale.setScalar(sc);
    sph(0.26, k, 0, 0.05, 0, 7, 5, T);
    box(0.24, 0.2, 0.42, k, 0, -0.1, 0.25, 0.25, 0, 0, T);
    for (const s of [-1, 1]) {
      rod([s * 0.15, 0.2, 0], [s * 0.6, 0.55, -0.05], 0.05, k, 5, 0.04, T);
      rod([s * 0.6, 0.55, -0.05], [s * 0.85, 1.15, 0.0], 0.04, k, 5, 0.025, T);
      rod([s * 0.45, 0.45, -0.05], [s * 0.5, 0.95, 0.1], 0.035, k, 4, 0.02, T);
      rod([s * 0.7, 0.8, -0.03], [s * 1.05, 0.95, 0.05], 0.03, k, 4, 0.02, T);
      box(0.08, 0.07, 0.04, 'timD', s * 0.1, 0.02, 0.24, 0, 0, 0, T); // eye holes
    }
    return T;
  }
  // four-faced carved idol of stacked heads; tiers of height th, width w
  function idol(p, x, y, z, tiers, w, th, k = 'timD', ry = 0) {
    const I = grp(x, y, z, ry, p);
    let yy = 0;
    for (let i = 0; i < tiers; i++) {
      const ww = w * (1 - i * 0.08);
      box(ww, th, ww, k, 0, yy + th / 2, 0, 0, J(0.05), 0, I);
      for (let f = 0; f < 4; f++) {
        const F = grp(0, yy, 0, f * PI / 2, I);
        box(ww * 0.8, 0.09, 0.12, k, 0, th * 0.72, ww / 2 + 0.03, 0, 0, 0, F);          // brow
        box(ww * 0.16, th * 0.34, 0.16, k, 0, th * 0.5, ww / 2 + 0.06, 0.12, 0, 0, F);  // nose
        box(ww * 0.46, 0.07, 0.08, k, 0, th * 0.2, ww / 2 + 0.02, 0, 0, 0, F);          // mouth ridge
      }
      box(ww * 1.12, 0.1, ww * 1.12, k, 0, yy + th + 0.03, 0, 0, J(0.1), 0, I);         // collar between faces
      yy += th + 0.08;
    }
    cyl(0.02, w * 0.62, th * 0.8, k, 0, yy + th * 0.4, 0, 6, 0, PI / 6, 0, I);          // pointed cap
    return I;
  }
  // carved pole: shaft with rings and knob
  function cpole(p, x, z, h, r, k = 'timD', kn = true) {
    cyl(r * 0.9, r * 1.1, h, k, x, h / 2, z, 6, J(0.03), 0, J(0.03), p);
    for (let i = 1; i <= 3; i++) cyl(r * 1.35, r * 1.35, 0.12, k, x, h * (0.45 + i * 0.13), z, 6, 0, 0, 0, p);
    if (kn) cone(r * 1.3, r * 3, k, x, h + r * 1.5, z, 6, 0, 0, 0, p);
  }
  // bowl
  const bowl = (p, x, y, z, r, k) => put(new THREE.SphereGeometry(r, 7, 3, 0, PI * 2, PI / 2, PI / 2), k, x, y + r, z, PI, 0, 0, p);
  // twisted sacred tree: trunk segments spiralling up, branches, lumpy foliage clumps
  function tree(p, x, z, h, r, kT = 'bark', kF = 'moss', clumps = 4, ribbons = null) {
    const T = grp(x, 0, z, rnd() * PI * 2, p);
    let P0 = [0, 0, 0], rr = r; const n = 5, ph = rnd() * 6;
    const trunkTop = h * 0.62;
    for (let i = 1; i <= n; i++) {
      const t = i / n, a = ph + t * 3.2;
      const P1 = [Math.sin(a) * 0.35 * t + t * 0.3, trunkTop * t, Math.cos(a) * 0.35 * t];
      rod(P0, P1, rr, kT, 6, rr * 0.82, T); sph(rr * 0.82, kT, ...P1, 6, 4, T);
      P0 = P1; rr *= 0.82;
    }
    // root flares
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + ph; rod([Math.sin(a) * r * 1.8, 0, Math.cos(a) * r * 1.8], [0, 0.7, 0], r * 0.35, kT, 5, r * 0.6, T); }
    const tops = [];
    for (let i = 0; i < clumps; i++) {
      const a = ph + i / clumps * PI * 2, reach = h * (0.2 + rnd() * 0.08);
      const E = [P0[0] + Math.sin(a) * reach, trunkTop + h * (0.1 + rnd() * 0.1), P0[2] + Math.cos(a) * reach];
      rod(P0, E, rr * 0.8, kT, 5, rr * 0.4, T);
      const c = sph(h * (0.13 + rnd() * 0.04), kF, E[0], E[1] + h * 0.06, E[2], 7, 5, T); c.scale.set(1.2, 0.8, 1.1);
      tops.push(E);
    }
    const top = sph(h * 0.17, kF, P0[0], h * 0.86, P0[2], 7, 5, T); top.scale.set(1.2, 0.85, 1.2);
    if (ribbons) for (let i = 0; i < tops.length; i++) {
      const E = tops[i], m0 = [(E[0] + P0[0]) / 2, (E[1] + P0[1]) / 2 - 0.1, (E[2] + P0[2]) / 2];
      box(0.14, 0.9, 0.03, ribbons[i % ribbons.length], m0[0], m0[1] - 0.45, m0[2], J(0.1), rnd() * 3, J(0.1), T);
    }
    return T;
  }
  function standing(p, x, z, h, w, k = 'stone') {
    const t = Math.atan2(x, z);
    const o = box(w, h, w * 0.55, k, x, h / 2 - 0.15, z, J(0.07), t + J(0.2), J(0.08), p);
    cone(w * 0.62, 0.35, k, x, h - 0.1, z, 4, 0, t + PI / 4, 0, p).scale.set(1, 1, 0.55);
    return o;
  }
  function skullPole(p, x, z, h) {
    cyl(0.09, 0.12, h, 'bark', x, h / 2, z, 6);
    const S = grp(x, h + 0.1, z, 0, p);
    sph(0.22, 'bone', 0, 0.05, 0, 7, 5, S);
    box(0.2, 0.18, 0.32, 'bone', 0, -0.1, 0.18, 0.2, 0, 0, S);
    for (const s of [-1, 1]) { rod([s * 0.15, 0.1, 0], [s * 0.5, 0.35, 0.05], 0.06, 'bone', 5, 0.03, S); rod([s * 0.5, 0.35, 0.05], [s * 0.55, 0.65, 0.12], 0.03, 'bone', 4, 0.015, S); }
    return S;
  }
  function firestone(p, x, z) {
    const F = grp(x, 0, z, 0, p);
    cyl(0.85, 1.0, 0.45, 'stone', 0, 0.22, 0, 7, 0, 0, 0, F);
    for (let i = 0; i < 7; i++) { const t = i / 7 * PI * 2; sph(0.22, 'stone', Math.sin(t) * 1.05, 0.12, Math.cos(t) * 1.05, 5, 3, F); }
    cone(0.42, 1.0, 'glow', 0, 0.95, 0, 6, 0, 0, 0, F);
    cone(0.24, 0.7, 'glow', 0.25, 0.75, 0.1, 5, 0, 0, -0.3, F);
    cone(0.22, 0.6, 'glow', -0.22, 0.7, -0.1, 5, 0, 0, 0.3, F);
    return F;
  }
  function ribbonPole(p, x, z, h, cols) {
    cpole(p, x, z, h, 0.12, 'bark');
    box(1.1, 0.1, 0.1, 'bark', x, h - 0.4, z, 0, J(0.5), 0, p);
    for (let i = 0; i < cols.length; i++) box(0.13, 0.9 + rnd() * 0.4, 0.03, cols[i], x - 0.45 + i * 0.3, h - 0.95, z, J(0.1), 0, J(0.12), p);
  }

  // Grod C: cruciform hall, two crossing steep roofs with four horse-head gables,
  // stepped thatch courses, palisade filling the rear re-entrant corners,
  // dance ring directly before the front gable, banner beside it.
  const y0 = 0.5, AW = 4.8, rise = 4.2, r = 0.2;
  const makeArm = (p, l, doorF, doorB) => {
    const yW = logWalls(p, AW, l, y0, 2.5, r, 'timL', { door: doorF ? { w: 1.4, h: 2.2 } : null, over: 0.45 });
    for (const s of [-1, 1]) {
      for (let x = -AW / 2; x <= AW / 2 + 0.1; x += 1.0) box(1.0 + J(0.1), 0.55, 0.7, 'stone', x + J(0.1), 0.25, s * l / 2, 0, J(0.2), 0, p);
      gableLogs(p, AW, s * l / 2, yW, rise, 0.19, 'timL');
    }
    const R = roof(p, { w: AW, l, yW, rise, over: 0.9, oz: 0.6, th: 0.4, courses: 4, lip: 0.27, rolls: true, cloth: 1.3 });
    for (const s of [-1, 1]) horses(p, R, s * (l / 2 + 0.65), 'timD', 0.9, 0.3);
    return { yW, R };
  };
  const A = grp(0, 0, -0.9);           // arm along z (front gable with door)
  const { yW } = makeArm(A, 8.2, true);
  const Bq = grp(0, 0, -1.6, PI / 2);  // arm along x
  makeArm(Bq, 8.4, false);
  // door + porch on front gable
  const zf = 4.1;
  for (const s of [-1, 1]) box(0.32, 2.5, 0.36, 'timD', s * 0.85, y0 + 1.25, zf + 0.05, 0, 0, J(0.03), A);
  box(2.4, 0.42, 0.42, 'timD', 0, y0 + 2.45, zf + 0.1, 0, 0, J(0.02), A);
  for (let i = 0; i < 4; i++) box(0.36, 2.2, 0.08, 'timD', -0.55 + i * 0.37, y0 + 1.1, zf - 0.12, 0, 0, J(0.02), A);
  box(1.8, 0.35, 1.0, 'stone', 0, 0.17, zf + 0.6, 0, J(0.1), 0, A);
  // side doors on the cross arm ends (read from left/right)
  for (const s of [-1, 1]) {
    box(1.2, 2.0, 0.12, 'timD', 0, y0 + 1.0, s * 4.13, 0, 0, 0, Bq);
    box(1.9, 0.36, 0.36, 'timD', 0, y0 + 2.1, s * 4.2, 0, 0, 0, Bq);
  }
  // palisade in the rear corners
  palisade(g, 0, -0.9, 5.0, PI * 0.6, PI * 0.9, 2.3, 0.14);
  palisade(g, 0, -0.9, 5.0, PI * 1.1, PI * 1.4, 2.3, 0.14);
  // rear posts with skull-less carved knobs so the back reads
  for (const s of [-1, 1]) { cyl(0.16, 0.2, 3.2, 'timD', s * 0.9, 1.6, -5.4, 6); sph(0.22, 'timD', s * 0.9, 3.3, -5.4, 6, 4); }
  // dance ring in front
  const P = grp(1.3, 0, 4.5);
  cyl(1.35, 1.5, 0.4, 'timL', 0, 0.2, 0, 10, 0, 0, 0, P);
  put(new THREE.TorusGeometry(1.36, 0.09, 4, 12), 'timD', 0, 0.39, 0, PI / 2, 0, 0, P);
  cyl(0.4, 0.45, 0.14, 'stone', 0, 0.45, 0, 7, 0, 0, 0, P);
  for (let i = 0; i < 6; i++) {
    const t = i / 6 * PI * 2, x = Math.sin(t) * 1.2, z = Math.cos(t) * 1.2, h = 1.0 + J(0.15);
    cyl(0.09, 0.11, h, 'timD', x, 0.4 + h / 2, z, 6, 0, 0, 0, P);
    sph(0.13, 'timD', x, 0.45 + h, z, 6, 4, P);
  }
  const B = grp(-2.6, 0, 4.7);
  for (let i = 0; i < 4; i++) box(0.5 + J(0.1), 0.45, 0.5 + J(0.1), 'stone', Math.sin(i * 1.6) * 0.35, 0.2, Math.cos(i * 1.6) * 0.35, 0, rnd(), 0, B);
  cyl(0.09, 0.14, 8.3, 'timD', 0, 4.15, 0, 7, 0, 0, 0, B);
  box(1.6, 0.14, 0.14, 'timD', -0.55, 7.8, 0, 0, 0, 0, B);
  box(1.3, 2.4, 0.05, 'team', -0.65, 6.55, 0, 0, 0, J(0.02), B);
  box(0.55, 0.8, 0.05, 'team', -1.0, 5.0, 0.01, 0, 0, 0.06, B);
  box(0.55, 1.0, 0.05, 'team', -0.3, 4.9, 0.01, 0, 0, -0.06, B);
  cone(0.16, 0.6, 'timD', 0, 8.6, 0, 6, 0, 0, 0, B);

  const box3 = new THREE.Box3(), vv = new THREE.Vector3(), mm4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const putb = (mat) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(vv.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); putb(mm4.multiplyMatrices(n.matrixWorld, im)); } return; }
    putb(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
