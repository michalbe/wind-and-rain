export default function (THREE) {
  const g = new THREE.Group();
  const joints = {};
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const mat = (hex, name, o) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.85, metalness: 0 }, o || {}));
    if (name) m.name = name;
    return m;
  };
  const J = (parent, name, x, y, z) => {
    const o = new THREE.Object3D(); o.name = name; o.position.set(x, y, z);
    parent.add(o); joints[name] = o; return o;
  };
  const add = (parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); me.scale.set(sx, sy, sz);
    parent.add(me); return me;
  };
  const UP = V(0, 1, 0);
  // tapered cylinder from point a (radius r1) to point b (radius r2)
  const seg = (parent, a, b, r1, r2, m, s = 8, open = true) => {
    const A = V(a[0], a[1], a[2]), B = V(b[0], b[1], b[2]);
    const d = B.clone().sub(A); const L = d.length();
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, L, s, 1, open), m);
    me.position.copy(A).addScaledVector(d, 0.5);
    me.quaternion.setFromUnitVectors(UP, d.normalize());
    parent.add(me); return me;
  };
  // cone from a (base radius r) to tip b
  const cone = (parent, a, b, r, m, s = 7) => seg(parent, a, b, r, 0.001, m, s, true);
  const ball = (parent, r, m, x, y, z, sx = 1, sy = 1, sz = 1, ws = 7, hs = 5) =>
    add(parent, new THREE.SphereGeometry(r, ws, hs), m, x, y, z, 0, 0, 0, sx, sy, sz);
  // lathe from [[r,h],...] around Y; optionally laid along +Z
  const lathe = (pts, s = 8, alongZ = false) => {
    const geo = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), s);
    if (alongZ) geo.rotateX(Math.PI / 2);
    return geo;
  };
  // lathe a profile [[r, t], ...] (t in 0..1) along the segment a->b
  const lseg = (parent, a, b, prof, m, s = 7) => {
    const A = V(a[0], a[1], a[2]), B = V(b[0], b[1], b[2]);
    const d = B.clone().sub(A); const L = d.length();
    const me = new THREE.Mesh(lathe(prof.map((p) => [p[0], p[1] * L]), s), m);
    me.position.copy(A); me.quaternion.setFromUnitVectors(UP, d.normalize());
    parent.add(me); return me;
  };
  const extr = (drawFn, depth) => {
    const sh = new THREE.Shape(); drawFn(sh);
    const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 3 });
    geo.translate(0, 0, -depth / 2); return geo;
  };
  const cap = (parent, a, b, r, m, s = 7) => {
    const A = V(a[0], a[1], a[2]), B = V(b[0], b[1], b[2]); const d = B.clone().sub(A); const L = d.length();
    const me = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, L), 2, s), m);
    me.position.copy(A).addScaledVector(d, 0.5); me.quaternion.setFromUnitVectors(UP, d.normalize()); parent.add(me); return me;
  };
  // Forest Spirit C: every limb a bundle of twisted root strands; a root cage around a glowing core.
  const bark = mat(0x4a3322, 'timber');
  const wood = mat(0x5e4029, 'timber');
  const moss = mat(0x6f8f3a, 'foliage');
  const mossDark = mat(0x223b22, 'foliage');
  const glow = mat(0x9ff0c8, null, { emissive: 0x9ff0c8, emissiveIntensity: 1.5 });
  // n strands twisting from a to b around the axis; each strand in 2 pieces
  const strands = (p, a, b, r, rs, m, n = 3, twist = 1.2) => {
    const A = V(...a), B = V(...b), d = B.clone().sub(A);
    const side = Math.abs(d.clone().normalize().y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
    const u = d.clone().cross(side).normalize(), w = d.clone().cross(u).normalize();
    const at = (t, k) => { const ang = k * (Math.PI * 2 / n) + t * twist; return A.clone().addScaledVector(d, t).addScaledVector(u, Math.cos(ang) * r).addScaledVector(w, Math.sin(ang) * r).toArray(); };
    for (let k = 0; k < n; k++) {
      seg(p, at(0, k), at(0.5, k), rs, rs * 0.9, m, 5, true);
      seg(p, at(0.5, k), at(1, k), rs * 0.9, rs * 0.8, m, 5, true);
    }
  };
  const hips = J(g, 'hips', 0, 2.05, 0);
  add(hips, new THREE.DodecahedronGeometry(0.42, 0), bark, 0, 0, 0, 0, 0, 0, 1, 0.7, 0.85);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cone(hips, [Math.sin(a) * 0.36, 0, Math.cos(a) * 0.3], [Math.sin(a) * 0.5, -0.8 - (i % 3) * 0.2, Math.cos(a) * 0.42], 0.11, i % 2 ? mossDark : moss, 4);
  }
  const spine = J(hips, 'spine', 0, 0.2, 0);
  spine.rotation.x = 0.25;
  // cage of 7 root ribs from pelvis to shoulders around a glowing core
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const x0 = Math.sin(a) * 0.3, z0 = Math.cos(a) * 0.25;
    const x1 = Math.sin(a + 0.5) * 0.55, z1 = Math.cos(a + 0.5) * 0.42;
    const x2 = Math.sin(a + 0.9) * 0.4, z2 = Math.cos(a + 0.9) * 0.3;
    seg(spine, [x0, 0, z0], [x1, 0.7, z1], 0.1, 0.12, bark, 5, true);
    seg(spine, [x1, 0.7, z1], [x2, 1.25, z2], 0.12, 0.1, bark, 5, true);
    ball(spine, 0.12, bark, x1, 0.7, z1, 1, 1, 1, 5, 3);
  }
  add(spine, new THREE.IcosahedronGeometry(0.24, 0), glow, 0, 0.65, 0);
  add(spine, new THREE.DodecahedronGeometry(0.5, 0), bark, 0, 1.2, -0.05, 0, 0, 0, 1.3, 0.45, 0.9);   // shoulder yoke
  add(spine, new THREE.DodecahedronGeometry(0.4, 0), moss, 0.1, 1.33, -0.1, 0, 0.5, 0, 1.3, 0.3, 0.9);
  const head = J(spine, 'head', 0, 1.3, 0.15);
  add(head, new THREE.CylinderGeometry(0.34, 0.28, 0.65, 7), bark, 0, 0.3, 0);
  add(head, new THREE.CylinderGeometry(0.3, 0.3, 0.02, 7), wood, 0, 0.63, 0);
  add(head, new THREE.BoxGeometry(0.4, 0.26, 0.1), mossDark, 0, 0.32, 0.26);   // shadowed face hollow
  for (const s of [1, -1]) add(head, new THREE.OctahedronGeometry(0.095, 0), glow, s * 0.1, 0.36, 0.32, 0, 0, 0).scale.set(1, 0.6, 0.5);
  for (let i = 0; i < 4; i++) cone(head, [-0.15 + i * 0.1, 0.18, 0.3], [-0.2 + i * 0.13, -0.35 - (i % 2) * 0.2, 0.36], 0.06, moss, 4);
  // antler-branches: thick forked beams, knuckled at each fork
  for (const s of [1, -1]) {
    const b0 = [s * 0.16, 0.58, 0], b1 = [s * 0.42, 0.98, -0.12], b2 = [s * 0.78, 1.22, -0.02], b3 = [s * 0.95, 1.5, 0.12];
    seg(head, b0, b1, 0.11, 0.085, wood, 6, true); seg(head, b1, b2, 0.085, 0.065, wood, 6, true); seg(head, b2, b3, 0.065, 0.045, wood, 5, true);
    ball(head, 0.09, wood, ...b1, 1, 1, 1, 6, 3); ball(head, 0.068, wood, ...b2, 1, 1, 1, 6, 3);
    cone(head, b3, [s * 1.0, 1.72, 0.2], 0.045, wood, 5);
    cone(head, b1, [s * 0.36, 1.5, 0.08], 0.06, wood, 5);
    cone(head, b1, [s * 0.55, 1.15, 0.3], 0.045, wood, 5);
    cone(head, b2, [s * 1.18, 1.3, -0.2], 0.05, wood, 5);
    cone(head, b2, [s * 0.7, 1.55, -0.2], 0.045, wood, 5);
    cone(head, b0, [s * 0.26, 0.98, 0.34], 0.055, wood, 5);
    ball(head, 1, moss, b1[0] * 0.9, b1[1] - 0.05, b1[2], 0.1, 0.06, 0.1, 5, 3);
  }
  const arm = (side) => {
    const s = side === 'l' ? 1 : -1;
    const sh = J(spine, side + 'Shoulder', s * 0.6, 1.15, 0);
    sh.rotation.z = s * 0.1;
    strands(sh, [0, 0, 0], [s * 0.12, -1.0, 0.06], 0.1, 0.08, bark, 3, 1.5);
    const el = J(sh, side + 'Elbow', s * 0.12, -1.0, 0.06);
    ball(el, 0.15, wood, 0, 0, 0, 1, 1, 1, 6, 3);
    ball(el, 1, moss, s * 0.05, -0.35, 0.02, 0.14, 0.22, 0.14, 5, 3);
    cone(el, [s * 0.1, -0.3, 0.0], [s * 0.14, -0.85, -0.02], 0.08, mossDark, 4);
    strands(el, [0, 0, 0], [0, -1.0, 0.2], 0.08, 0.065, bark, 3, -1.5);
    for (let i = 0; i < 4; i++) {
      const a = -0.6 + i * 0.4;
      seg(el, [0, -1.0, 0.2], [Math.sin(a) * 0.25, -1.35, 0.22 + Math.cos(a) * 0.18], 0.05, 0.035, wood, 5, true);
      cone(el, [Math.sin(a) * 0.25, -1.35, 0.22 + Math.cos(a) * 0.18], [Math.sin(a) * 0.3, -1.65, 0.32 + Math.cos(a) * 0.2], 0.035, wood, 5);
    }
  };
  arm('l'); arm('r');
  const leg = (side) => {
    const s = side === 'l' ? 1 : -1;
    const hp = J(hips, side + 'Hip', s * 0.28, -0.1, 0);
    strands(hp, [0, 0, 0], [s * 0.06, -0.95, 0.1], 0.13, 0.1, bark, 3, 1.4);
    const kn = J(hp, side + 'Knee', s * 0.06, -0.95, 0.1);
    ball(kn, 0.18, wood, 0, 0, 0, 1, 1, 1, 6, 3);
    ball(kn, 1, moss, s * 0.04, -0.3, 0.1, 0.16, 0.2, 0.14, 5, 3);
    strands(kn, [0, 0, 0], [0, -0.9, -0.1], 0.12, 0.1, bark, 3, -1.4);
    for (let i = 0; i < 5; i++) {
      const a = -1.2 + i * 0.6;
      cone(kn, [0, -0.85, -0.1], [Math.sin(a) * 0.55, -1.0, -0.1 + Math.cos(a) * 0.55], 0.1, bark, 5);
    }
  };
  leg('l'); leg('r');
  g.userData.joints = joints;
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
