// Vietra, Wind Priestess. A dancer: big flaring bell skirt, wide flared sleeves, long wind ribbons
// trailing from the raised hand and the staff, a broad team-colour wreath, team shawl and apron.
export default function (THREE) {
  const g = new THREE.Group();
  const mat = (hex, name, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...o }); if (name) m.name = name; return m; };
  const linen = mat(0xe6dcc3, 'fabric', { side: THREE.DoubleSide }), ochre = mat(0xc98a2b, 'fabric', { side: THREE.DoubleSide }), team = mat(0xc0282d, 'fabric', { side: THREE.DoubleSide });
  const skin = mat(0xd9a07a), blond = mat(0xc7a060), wood = mat(0xa27a4f, 'timber'), leather = mat(0x6b4526, 'fabric');
  const J = (p, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); return o; };
  const add = (p, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1]) => {
    const me = new THREE.Mesh(geo, m); me.position.set(...pos); me.rotation.set(...rot); me.scale.set(...sc); p.add(me); return me; };
  const cyl = (rt, rb, h, s = 8, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open);
  const sph = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const lathe = (pts, s = 12, p0 = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s, p0, pl);
  // fluted, wind-swirled hem: radius grows with a wave the further down the skirt it is
  const flute = (geo, top, bot, amp = 0.09, k = 7, twist = 0.35) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = Math.min(1, Math.max(0, (top - y) / (top - bot)));
      const a = Math.atan2(x, z) + twist * t, f = 1 + amp * t * t * Math.sin(k * a);
      p.setXYZ(i, x * f, y, z * f);
    }
    geo.computeVertexNormals(); return geo;
  };
  // a flat ribbon streaming along dir with a travelling wave; top end at the origin
  const ribbon = (len, w, dir, wave, amp, ph = 0, segs = 7) => {
    const geo = new THREE.PlaneGeometry(w, len, 1, segs), p = geo.attributes.position;
    const d = new THREE.Vector3(...dir).normalize(), wv = new THREE.Vector3(...wave).normalize();
    const side = new THREE.Vector3().crossVectors(d, wv).normalize(), q = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const t = (len / 2 - p.getY(i)) / len, s = p.getX(i);
      q.copy(d).multiplyScalar(t * len).addScaledVector(wv, Math.sin(t * Math.PI * 2.2 + ph) * amp * t).addScaledVector(side, s * (1 - 0.3 * t));
      p.setXYZ(i, q.x, q.y, q.z);
    }
    geo.computeVertexNormals(); return geo;
  };

  // ---- skeleton
  const hips = J(g, 0, 0.9, 0);
  const spine = J(hips, 0, 0.06, 0);
  const head = J(spine, 0, 0.42, 0);
  const lShoulder = J(spine, 0.22, 0.34, 0), rShoulder = J(spine, -0.22, 0.34, 0);
  const lElbow = J(lShoulder, 0, -0.28, 0), rElbow = J(rShoulder, 0, -0.28, 0);
  const lHip = J(hips, 0.1, -0.04, 0), rHip = J(hips, -0.1, -0.04, 0);
  const lKnee = J(lHip, 0, -0.4, 0), rKnee = J(rHip, 0, -0.4, 0);

  // ---- big bell skirt (hips), fluted hem, ochre hem band, team apron front and back
  const sk = [[0.17, 0.05], [0.2, -0.12], [0.28, -0.38], [0.42, -0.64], [0.56, -0.8], [0.62, -0.87]];
  add(hips, flute(lathe(sk, 14), 0.05, -0.87), linen);
  add(hips, flute(lathe([[0.575, -0.8], [0.632, -0.878]], 14), 0.05, -0.87), ochre, [0, 0, 0], [0, 0, 0], [1.01, 1, 1.01]);
  add(hips, flute(lathe([[0.36, -0.56], [0.395, -0.62]], 14), 0.05, -0.87), ochre, [0, 0, 0], [0, 0, 0], [1.01, 1, 1.01]);
  for (const [p0, sc] of [[-0.75, 1], [Math.PI - 0.75, 1]]) {
    add(hips, flute(lathe([[0.19, 0.0], [0.22, -0.12], [0.3, -0.38], [0.42, -0.6]], 6, p0, 1.5), 0.05, -0.87), team, [0, 0, 0], [0, 0, 0], [1.05 * sc, 1, 1.05 * sc]);
  }
  add(hips, cyl(0.19, 0.19, 0.09, 10, true), team, [0, 0.02, 0]);                   // waist sash
  add(hips, cyl(0.195, 0.195, 0.03, 10, true), ochre, [0, 0.07, 0]);

  // ---- legs (hidden under the bell; boots show at the hem)
  for (const [hip, knee] of [[lHip, lKnee], [rHip, rKnee]]) {
    add(knee, cyl(0.055, 0.05, 0.38, 6), leather, [0, -0.19, 0]);
    add(knee, box(0.12, 0.09, 0.22), leather, [0, -0.43, 0.06]);
  }

  // ---- torso (spine) and a wide team shawl over the shoulders, readable from above
  add(spine, cyl(0.2, 0.16, 0.38, 8), linen, [0, 0.19, 0], [0, 0, 0], [1, 1, 0.75]);
  add(spine, box(0.07, 0.24, 0.04), ochre, [0, 0.12, 0.13]);                          // chest embroidery
  add(spine, cyl(0.16, 0.2, 0.05, 8, true), ochre, [0, 0.0, 0], [0, 0, 0], [1, 1, 0.8]); // belt
  add(spine, lathe([[0.11, 0.44], [0.22, 0.4], [0.33, 0.3], [0.38, 0.16], [0.37, 0.12]], 12), team, [0, 0, 0], [0, 0, 0], [1, 1, 0.82]);
  add(spine, lathe([[0.37, 0.12], [0.385, 0.16], [0.378, 0.2]], 12), ochre, [0, 0, 0], [0, 0, 0], [1, 1, 0.82]);
  add(spine, new THREE.ConeGeometry(0.3, 0.42, 3, 1, true), team, [0, 0.0, -0.17], [Math.PI + 0.12, Math.PI / 3, 0], [1, 1, 0.25]); // shawl point down the back
  add(spine, new THREE.ConeGeometry(0.06, 0.34, 4), team, [0.07, 0.02, 0.17], [Math.PI - 0.15, 0, 0.1], [1, 1, 0.35]); // shawl ends at the front
  add(spine, new THREE.ConeGeometry(0.06, 0.3, 4), team, [-0.07, 0.04, 0.17], [Math.PI - 0.15, 0, -0.1], [1, 1, 0.35]);

  // ---- head: large (x1.25) with a broad team wreath
  const hg = J(head, 0, 0, 0); hg.scale.setScalar(1.25);
  add(hg, cyl(0.055, 0.06, 0.1, 6), skin, [0, 0.03, 0]);
  add(hg, sph(0.17, 9, 7), skin, [0, 0.19, 0.01], [0, 0, 0], [1, 1.05, 1]);
  add(hg, box(0.04, 0.07, 0.05), skin, [0, 0.17, 0.18]);                      // nose
  add(hg, sph(0.022, 4, 3), leather, [0.06, 0.21, 0.155]);                    // eyes
  add(hg, sph(0.022, 4, 3), leather, [-0.06, 0.21, 0.155]);
  add(hg, sph(0.18, 8, 6), blond, [0, 0.215, -0.02], [0, 0, 0], [1.02, 1, 1]);
  const wreath = J(hg, 0, 0.29, -0.01); wreath.rotation.x = -0.18;
  add(wreath, new THREE.TorusGeometry(0.24, 0.055, 4, 12), team, [0, 0, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; add(wreath, sph(0.055, 5, 3), i % 2 ? ochre : linen, [Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24]); }
  // braid: stacked beads down the back, ending in a ribbon
  const braid = J(hg, 0, 0.14, -0.17);
  for (let i = 0; i < 4; i++) add(braid, sph(0.058 - i * 0.004, 6, 3), blond, [0, -0.04 - i * 0.1, -0.03 - i * 0.01], [0, 0, 0], [1, 1.5, 1]);
  add(braid, box(0.09, 0.12, 0.02), team, [0, -0.46, -0.07]);

  // ---- arms: wide flared sleeves, large hands
  for (const [sh, el] of [[lShoulder, lElbow], [rShoulder, rElbow]]) {
    add(sh, cyl(0.075, 0.09, 0.28, 8), linen, [0, -0.14, 0]);
    add(el, cyl(0.09, 0.2, 0.26, 9, true), linen, [0, -0.1, 0]);
    add(el, cyl(0.2, 0.215, 0.04, 9, true), ochre, [0, -0.225, 0]);
    add(el, cyl(0.04, 0.045, 0.18, 6), skin, [0, -0.2, 0]);
    add(el, sph(0.065, 7, 5), skin, [0, -0.32, 0.01], [0, 0, 0], [0.85 * 1.25, 1.1 * 1.25, 1.25]);
  }

  // ---- pose: right hand grips the staff, left arm raised in the dance
  rShoulder.rotation.set(-0.35, 0, -0.12);
  rElbow.rotation.set(-0.8, 0, 0);
  lShoulder.rotation.set(0, 0, 1.05);
  lElbow.rotation.set(0, 0, 0.75);

  const holdLevel = (elbow, pos, euler) => {
    const h = J(elbow, ...pos);
    g.updateMatrixWorld(true);
    const q = new THREE.Quaternion(); elbow.getWorldQuaternion(q);
    h.quaternion.copy(q.invert()).multiply(new THREE.Quaternion().setFromEuler(euler));
    g.updateMatrixWorld(true);
    return h;
  };

  // ribbons streaming from the raised left hand
  const lh = holdLevel(lElbow, [0, -0.34, 0.01], new THREE.Euler(0, 0, 0));
  add(lh, ribbon(0.85, 0.1, [0.35, -0.6, -0.55], [0, 1, -0.3], 0.12, 0), team);
  add(lh, ribbon(0.7, 0.085, [0.55, -0.55, -0.2], [0, 1, 0.3], 0.1, 1.5), linen);
  add(lh, ribbon(0.62, 0.08, [0.15, -0.75, -0.2], [1, 0, 0], 0.09, 2.6), team);

  // ---- staff, child of rElbow, kept world-vertical
  const grip = holdLevel(rElbow, [0, -0.32, 0.01], new THREE.Euler(0, 0, -0.06));
  const gy = grip.getWorldPosition(new THREE.Vector3()).y;
  const top = 2.02 - gy, bot = 0.04 - gy;
  add(grip, cyl(0.03, 0.036, top - bot, 7), wood, [0, (top + bot) / 2, 0]);
  add(grip, sph(0.07, 7, 5), ochre, [0, top, 0]);
  add(grip, new THREE.TorusGeometry(0.1, 0.022, 4, 8), wood, [0, top - 0.12, 0], [Math.PI / 2, 0, 0]);
  add(grip, cyl(0.045, 0.045, 0.05, 7), ochre, [0, top - 0.24, 0]);
  // long ribbons trailing on the wind off the top ring
  const rib = [[team, 1.0, [-0.75, -0.45, -0.35], 0], [linen, 0.85, [-0.6, -0.55, -0.6], 1.2], [team, 0.9, [-0.35, -0.5, -0.8], 2.3], [linen, 0.7, [-0.85, -0.6, 0.05], 3.1], [team, 0.75, [-0.2, -0.7, 0.55], 4.0]];
  for (const [m, len, dir, ph] of rib) add(grip, ribbon(len, 0.1, dir, [0, 1, 0], 0.13, ph), m, [0, top - 0.12, 0]);

  // ---- place: base at y=0, centred on x/z
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mt) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mt)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });

  g.userData.joints = { hips, spine, head, lShoulder, lElbow, rShoulder, rElbow, lHip, lKnee, rHip, rKnee };
  return g;
}
