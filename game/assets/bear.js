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
  // Bear A: scaled spheres + tapered cylinders.
  const fur = mat(0x5a3b22, 'fabric');
  const muz = mat(0x9a6a3e, 'fabric');
  const bone = mat(0xe0cfa8);
  const team = mat(0xc0282d, 'fabric', { side: THREE.DoubleSide });
  const wood = mat(0xa27a4f, 'timber');
  const dark = mat(0x3b2618, 'fabric');
  const glow = mat(0x9ff0c8, null, { emissive: 0x9ff0c8, emissiveIntensity: 1.5 });

  const body = J(g, 'body', 0, 1.12, 0);
  ball(body, 1, fur, 0, 0, -0.12, 0.62, 0.55, 0.82, 9, 7);          // barrel
  ball(body, 1, fur, 0, 0.1, 0.42, 0.66, 0.46, 0.55, 9, 7);          // shoulders
  ball(body, 1, fur, 0, 0.33, 0.4, 0.42, 0.25, 0.45, 8, 5);         // hump (top ~1.7)
  ball(body, 1, fur, 0, 0.02, -0.7, 0.55, 0.5, 0.45, 8, 6);         // rump
  ball(body, 0.13, fur, 0, 0.12, -1.1, 1, 0.9, 1, 6, 4);             // tail
  // shaggy ridge along the spine and haunches, pointing back
  for (let i = 0; i < 5; i++) {
    const z = 0.2 - i * 0.27, y = 0.5 - i * 0.05 - (i > 2 ? (i - 2) * 0.04 : 0);
    cone(body, [0, y - 0.1, z + 0.1], [0, y + 0.02, z - 0.22], 0.13, fur, 5);
  }
  for (const s of [1, -1]) {
    cone(body, [s * 0.35, 0.25, -0.85], [s * 0.38, 0.1, -1.12], 0.14, fur, 5);
    cone(body, [s * 0.45, -0.05, -0.85], [s * 0.45, -0.28, -1.06], 0.14, fur, 5);
  }
  // shaggy fur tufts along the belly and flanks
  for (let i = 0; i < 5; i++) {
    const z = -0.62 + i * 0.28;
    for (const s of [1, -1]) cone(body, [s * 0.5, -0.2, z], [s * 0.54, -0.55, z - 0.06], 0.14, fur, 5);
  }

  const neck = J(body, 'neck', 0, 0.12, 0.72);
  seg(neck, [0, 0, -0.1], [0, -0.06, 0.38], 0.42, 0.34, fur, 9);
  // team band + amulet
  add(neck, new THREE.TorusGeometry(0.39, 0.05, 5, 12), team, 0, -0.04, 0.2, 0, 0, 0, 1, 1.02, 1).rotation.set(0, 0, 0);
  seg(neck, [0.14, -0.4, 0.26], [0.2, -0.72, 0.2], 0.04, 0.02, team, 4, false);
  seg(neck, [0.06, -0.4, 0.26], [0.04, -0.66, 0.22], 0.04, 0.02, team, 4, false);
  // knot and trailing ribbon tails over the hump (reads from behind)
  ball(neck, 0.08, team, 0, 0.36, 0.12, 1.3, 0.8, 1, 6, 3);
  seg(neck, [0.04, 0.36, 0.1], [0.16, 0.4, -0.35], 0.05, 0.03, team, 4, false).scale.set(1, 1, 0.3);
  seg(neck, [-0.04, 0.36, 0.1], [-0.12, 0.44, -0.4], 0.05, 0.03, team, 4, false).scale.set(1, 1, 0.3);
  seg(neck, [0, -0.42, 0.3], [0, -0.5, 0.33], 0.012, 0.012, dark, 4);
  const am = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 7); am.rotateX(Math.PI / 2);
  add(neck, am, wood, 0, -0.58, 0.36);
  add(neck, new THREE.TorusGeometry(0.055, 0.012, 3, 7), dark, 0, -0.58, 0.385);
  ball(neck, 0.025, glow, 0, -0.58, 0.385, 1, 1, 0.5, 6, 3);            // faint sacred glow in the carving

  const head = J(neck, 'head', 0, -0.04, 0.36);
  ball(head, 1, fur, 0, 0.04, 0.06, 0.34, 0.3, 0.34, 8, 6);          // skull
  ball(head, 1, fur, 0, -0.06, 0.12, 0.38, 0.22, 0.26, 8, 5);         // cheek ruff
  seg(head, [0, -0.02, 0.2], [0, -0.1, 0.52], 0.18, 0.12, muz, 8, false);   // muzzle
  ball(head, 1, muz, 0, -0.16, 0.38, 0.13, 0.07, 0.16, 7, 4);          // jaw
  ball(head, 1, dark, 0, -0.07, 0.54, 0.08, 0.06, 0.05, 6, 4);          // nose
  for (const s of [1, -1]) {
    ball(head, 0.1, fur, s * 0.24, 0.28, -0.02, 1, 1, 0.6, 6, 4);     // ears
    ball(head, 0.05, muz, s * 0.24, 0.28, 0.03, 1, 1, 0.4, 5, 3);
    ball(head, 0.04, dark, s * 0.14, 0.1, 0.34, 1, 1, 1, 6, 3);       // eyes
  }

  const paw = (p, y, z) => {
    ball(p, 1, fur, 0, y + 0.11, z + 0.04, 0.2, 0.12, 0.24, 7, 4);
    ball(p, 1, dark, 0, y + 0.03, z + 0.06, 0.19, 0.04, 0.22, 7, 3);
    ball(p, 1, dark, 0, y + 0.1, z - 0.14, 0.14, 0.08, 0.05, 6, 3);
    for (let i = 0; i < 4; i++) {
      const x = -0.12 + i * 0.08;
      cone(p, [x, y + 0.06, z + 0.22], [x * 1.1, y - 0.0, z + 0.38], 0.03, bone, 5);
    }
  };
  const leg = (name, x, y, z, front) => {
    const hip = J(body, name, x, y, z);
    const kn = name.replace('Leg', 'Knee');
    const kz = front ? 0.04 : -0.06;
    if (front) ball(hip, 1, fur, 0, 0.0, 0, 0.24, 0.34, 0.3, 7, 5);
    else ball(hip, 1, fur, 0, -0.05, 0, 0.26, 0.4, 0.34, 7, 5);
    seg(hip, [0, 0, 0], [0, -0.55, kz], front ? 0.24 : 0.26, 0.19, fur, 8);
    const k = J(hip, kn, 0, -0.55, kz);
    ball(k, 0.19, fur, 0, 0, 0, 1, 1, 1, 7, 4);
    seg(k, [0, 0, 0], [0, -0.48, 0.02], 0.18, 0.16, fur, 8);
    paw(k, front ? -0.52 : -0.54, 0.0);
  };
  leg('flLeg', 0.38, -0.04, 0.58, true);
  leg('frLeg', -0.38, -0.04, 0.58, true);
  leg('blLeg', 0.38, -0.02, -0.68, false);
  leg('brLeg', -0.38, -0.02, -0.68, false);
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
