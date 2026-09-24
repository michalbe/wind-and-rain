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
  // Deer Rider A: primitives (scaled spheres + tapered cylinders), recursive cylinder antlers.
  const hide = mat(0x9a6a3e, 'fabric');
  const bone = mat(0xe0cfa8);
  const linen = mat(0xe6dcc3, 'fabric');
  const team = mat(0xc0282d, 'fabric', { side: THREE.DoubleSide });
  const skin = mat(0xd9a07a);
  const leather = mat(0x6b4526, 'fabric');
  const fur = mat(0x5a3b22, 'fabric');

  // ---------- deer ----------
  const body = J(g, 'body', 0, 1.75, 0);
  ball(body, 1, hide, 0, 0, 0.05, 0.42, 0.4, 0.95, 8, 5);          // barrel
  ball(body, 1, hide, 0, 0.08, 0.55, 0.44, 0.37, 0.5, 8, 5);        // chest / withers
  ball(body, 1, hide, 0, 0.03, -0.72, 0.42, 0.4, 0.45, 8, 5);       // rump
  ball(body, 1, bone, 0, -0.17, 0.05, 0.33, 0.25, 0.8, 7, 5);       // pale belly
  ball(body, 1, bone, 0, -0.02, -1.08, 0.2, 0.2, 0.1, 8, 6);         // rump patch
  cone(body, [0, 0.2, -1.05], [0, 0.02, -1.32], 0.09, hide, 6);      // tail
  cone(body, [0, 0.14, -1.08], [0, -0.02, -1.3], 0.07, bone, 6);

  // neck and head
  const neck = J(body, 'neck', 0, 0.2, 0.85);
  seg(neck, [0, -0.05, -0.05], [0, 0.72, 0.42], 0.27, 0.17, hide, 9);
  ball(neck, 1, bone, 0, 0.2, 0.18, 0.17, 0.3, 0.14, 8, 6);          // pale throat
  ball(neck, 1, hide, 0, 0.35, 0.08, 0.2, 0.34, 0.2, 8, 6);          // neck ruff
  const head = J(neck, 'head', 0, 0.75, 0.44);
  ball(head, 1, hide, 0, 0.02, 0.04, 0.17, 0.17, 0.2, 8, 6);         // skull
  seg(head, [0, 0.0, 0.12], [0, -0.1, 0.48], 0.13, 0.08, hide, 8, false);   // muzzle
  ball(head, 1, bone, 0, -0.1, 0.36, 0.08, 0.05, 0.12, 7, 5);        // pale chin
  ball(head, 0.06, fur, 0, -0.08, 0.5, 1, 0.9, 0.8, 6, 3);           // nose
  for (const s of [1, -1]) {
    ball(head, 0.035, fur, s * 0.13, 0.06, 0.16, 1, 1, 1, 6, 3);      // eyes
    const ear = add(head, new THREE.ConeGeometry(0.07, 0.28, 6), hide, s * 0.2, 0.14, -0.04, 0, 0, -s * 1.1);
    ear.scale.set(1, 1, 0.45);
  }
  // antlers: explicit main beam with tines
  for (const s of [1, -1]) {
    const P = [[s * 0.09, 0.15, -0.02], [s * 0.3, 0.36, -0.14], [s * 0.52, 0.56, -0.12], [s * 0.66, 0.76, 0.0], [s * 0.7, 0.92, 0.14]];
    const R = [0.055, 0.048, 0.04, 0.032, 0.024];
    for (let i = 0; i < 4; i++) seg(head, P[i], P[i + 1], R[i], R[i + 1], bone, 6, true);
    cone(head, P[4], [s * 0.7, 1.02, 0.24], R[4], bone, 6);
    ball(head, 0.065, bone, P[0][0], P[0][1], P[0][2], 1, 1, 1, 6, 3);            // burr
    const tines = [[0, [s * 0.2, 0.3, 0.3]], [1, [s * 0.34, 0.64, 0.12]], [2, [s * 0.5, 0.86, -0.06]], [3, [s * 0.86, 0.92, -0.08]], [3, [s * 0.58, 1.0, 0.08]]];
    for (const [i, t] of tines) cone(head, P[i], t, R[i] * 0.8, bone, 6);
  }

  // legs
  const leg = (name, x, y, z, front) => {
    const hip = J(body, name, x, y, z);
    const kn = name.replace('Leg', 'Knee');
    if (front) {
      ball(hip, 1, hide, 0, -0.05, 0, 0.14, 0.3, 0.2, 7, 5);          // shoulder
      seg(hip, [0, 0, 0], [0, -0.6, 0.02], 0.14, 0.08, hide, 8);
      const k = J(hip, kn, 0, -0.6, 0.02);
      ball(k, 0.075, hide, 0, 0, 0, 1, 1, 1, 6, 3);
      seg(k, [0, 0, 0], [0, -0.8, 0.02], 0.075, 0.062, hide, 6);
      seg(k, [0, -0.82, 0.03], [0, -0.95, 0.06], 0.07, 0.085, fur, 6, false); // hoof
    } else {
      ball(hip, 1, hide, 0, -0.18, 0.0, 0.18, 0.42, 0.3, 7, 5);        // haunch
      seg(hip, [0, -0.1, 0.05], [0, -0.95, -0.22], 0.17, 0.09, hide, 8);
      const k = J(hip, kn, 0, -0.95, -0.22);
      ball(k, 0.08, hide, 0, 0, 0, 1, 1, 1, 6, 3);
      seg(k, [0, 0, 0], [0, -0.62, 0.1], 0.075, 0.062, hide, 6);
      seg(k, [0, -0.63, 0.11], [0, -0.75, 0.15], 0.07, 0.085, fur, 6, false);
    }
  };
  leg('flLeg', 0.24, -0.2, 0.72, true);
  leg('frLeg', -0.24, -0.2, 0.72, true);
  leg('blLeg', 0.25, -0.05, -0.78, false);
  leg('brLeg', -0.25, -0.05, -0.78, false);

  // saddle + team saddle cloth
  const cloth = new THREE.CylinderGeometry(0.47, 0.47, 0.75, 10, 1, true, Math.PI - 1.35, 2.7);
  cloth.rotateX(Math.PI / 2);
  add(body, cloth, team, 0, 0.0, -0.05);
  add(body, new THREE.CylinderGeometry(0.28, 0.32, 0.1, 8), leather, 0, 0.44, -0.05, 0, 0, 0, 1, 1, 1.3);
  add(body, new THREE.BoxGeometry(0.42, 0.14, 0.08), leather, 0, 0.52, -0.42, -0.3, 0, 0);   // cantle
  add(body, new THREE.BoxGeometry(0.2, 0.16, 0.08), leather, 0, 0.52, 0.32, 0.3, 0, 0);      // pommel
  seg(body, [0.44, 0.1, 0.1], [0.36, -0.36, 0.12], 0.03, 0.03, leather, 6);                // girth
  seg(body, [-0.44, 0.1, 0.1], [-0.36, -0.36, 0.12], 0.03, 0.03, leather, 6);

  // ---------- rider ----------
  const hips = J(body, 'r_hips', 0, 0.55, -0.05);
  add(hips, new THREE.CylinderGeometry(0.2, 0.25, 0.22, 8), linen, 0, 0.0, 0);
  add(hips, new THREE.CylinderGeometry(0.21, 0.21, 0.07, 8), leather, 0, 0.1, 0);          // belt
  for (const s of [1, -1]) {
    seg(hips, [s * 0.12, -0.02, 0.04], [s * 0.4, -0.18, 0.3], 0.1, 0.085, linen, 6);        // thigh
    ball(hips, 0.085, linen, s * 0.4, -0.18, 0.3, 1, 1, 1, 6, 3);
    seg(hips, [s * 0.4, -0.18, 0.3], [s * 0.47, -0.62, 0.12], 0.08, 0.07, leather, 6);     // shin wraps
    add(hips, new THREE.BoxGeometry(0.12, 0.1, 0.24), leather, s * 0.48, -0.67, 0.18);       // boot
  }
  const spine = J(hips, 'r_spine', 0, 0.12, 0);
  add(spine, new THREE.CylinderGeometry(0.27, 0.21, 0.5, 8), linen, 0, 0.25, 0);          // tunic torso
  // team sash: diagonal band
  add(spine, new THREE.BoxGeometry(0.1, 0.62, 0.5), team, 0, 0.25, 0.0, 0, 0, 0.62).scale.set(1, 1, 1.0);
  // cloak on back
  const cloak = new THREE.CylinderGeometry(0.29, 0.44, 0.85, 9, 1, true, Math.PI * 0.62, Math.PI * 0.76);
  add(spine, cloak, team, 0, 0.1, -0.02);
  add(spine, new THREE.TorusGeometry(0.22, 0.05, 4, 8), fur, 0, 0.5, 0, Math.PI / 2, 0, 0); // fur collar
  const head2 = J(spine, 'r_head', 0, 0.52, 0);
  seg(head2, [0, 0, 0], [0, 0.1, 0], 0.08, 0.08, skin, 6);
  ball(head2, 0.17, skin, 0, 0.18, 0.01, 1, 1.05, 1, 9, 6);
  ball(head2, 1, fur, 0, 0.08, 0.1, 0.13, 0.12, 0.09, 7, 5);         // beard
  add(head2, new THREE.CylinderGeometry(0.17, 0.19, 0.13, 9), fur, 0, 0.3, 0);             // fur cap brim
  ball(head2, 0.16, fur, 0, 0.36, 0, 1, 0.8, 1, 8, 4);               // cap crown
  // left arm: holds reins
  const lSh = J(spine, 'r_lShoulder', 0.28, 0.44, 0);
  ball(lSh, 0.1, linen, 0, 0, 0, 1, 1, 1, 6, 3);
  seg(lSh, [0, 0, 0], [0.05, -0.28, 0.05], 0.085, 0.07, linen, 6);
  const lEl = J(lSh, 'r_lElbow', 0.05, -0.28, 0.05);
  seg(lEl, [0, 0, 0], [-0.1, -0.02, 0.3], 0.07, 0.06, linen, 6);
  ball(lEl, 0.075, skin, -0.1, -0.02, 0.33, 1, 1, 1, 6, 3);
  // right arm: short spear
  const rSh = J(spine, 'r_rShoulder', -0.28, 0.44, 0);
  ball(rSh, 0.1, linen, 0, 0, 0, 1, 1, 1, 6, 3);
  seg(rSh, [0, 0, 0], [-0.08, -0.27, 0.0], 0.085, 0.07, linen, 6);
  const rEl = J(rSh, 'r_rElbow', -0.08, -0.27, 0.0);
  seg(rEl, [0, 0, 0], [0, 0.0, 0.3], 0.07, 0.06, linen, 6);
  ball(rEl, 0.075, skin, 0, 0, 0.33, 1, 1, 1, 6, 3);
  // spear through the fist, pointing forward and up
  const sd = V(0, 0.55, 0.83).normalize();
  const hp = V(0, 0, 0.33);
  const back = hp.clone().addScaledVector(sd, -0.6), tipb = hp.clone().addScaledVector(sd, 1.25), tip = hp.clone().addScaledVector(sd, 1.6);
  seg(rEl, back.toArray(), tipb.toArray(), 0.03, 0.03, leather, 6, false);
  add(rEl, new THREE.CylinderGeometry(0.04, 0.04, 0.06, 6), fur, 0, 0, 0).position.copy(hp.clone().addScaledVector(sd, 1.22));
  cone(rEl, tipb.toArray(), tip.toArray(), 0.065, bone, 6);
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
