// Vietra, Wind Priestess. Candidate A: assembled from primitives (cylinders, spheres, boxes).
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

  // ---- skeleton
  const hips = J(g, 0, 0.9, 0);
  const spine = J(hips, 0, 0.06, 0);
  const head = J(spine, 0, 0.42, 0);
  const lShoulder = J(spine, 0.22, 0.34, 0), rShoulder = J(spine, -0.22, 0.34, 0);
  const lElbow = J(lShoulder, 0, -0.28, 0), rElbow = J(rShoulder, 0, -0.28, 0);
  const lHip = J(hips, 0.1, -0.04, 0), rHip = J(hips, -0.1, -0.04, 0);
  const lKnee = J(lHip, 0, -0.4, 0), rKnee = J(rHip, 0, -0.4, 0);

  // ---- skirt (hips)
  add(hips, cyl(0.16, 0.37, 0.82, 10), linen, [0, -0.39, 0]);
  add(hips, cyl(0.35, 0.375, 0.08, 10, true), ochre, [0, -0.72, 0]);
  add(hips, cyl(0.3, 0.315, 0.04, 10, true), ochre, [0, -0.56, 0]);
  add(hips, cyl(0.185, 0.185, 0.08, 10, true), team, [0, 0.02, 0]);           // sash
  add(hips, box(0.07, 0.4, 0.03), team, [0.1, -0.2, 0.2], [-0.2, 0, 0.12]); // sash tails
  add(hips, box(0.06, 0.32, 0.03), team, [0.16, -0.17, 0.17], [-0.2, 0, 0.3]);
  add(hips, box(0.06, 0.55, 0.02), ochre, [0, -0.33, 0.235], [-0.26, 0, 0]); // front panel stripe
  add(hips, box(0.06, 0.55, 0.02), ochre, [0, -0.33, -0.235], [0.26, 0, 0]); // back panel stripe

  // ---- legs (mostly hidden by the dress; boots show at the hem)
  for (const [hip, knee] of [[lHip, lKnee], [rHip, rKnee]]) {
    add(hip, cyl(0.07, 0.055, 0.4, 6), linen, [0, -0.2, 0]);
    add(knee, cyl(0.055, 0.05, 0.38, 6), leather, [0, -0.19, 0]);
    add(knee, box(0.12, 0.09, 0.22), leather, [0, -0.43, 0.04]);
  }

  // ---- torso (spine)
  add(spine, cyl(0.2, 0.16, 0.38, 8), linen, [0, 0.19, 0], [0, 0, 0], [1, 1, 0.75]);
  add(spine, cyl(0.21, 0.2, 0.06, 8), ochre, [0, 0.36, 0], [0, 0, 0], [1, 1, 0.78]);   // collar band
  add(spine, box(0.07, 0.3, 0.04), ochre, [0, 0.19, 0.13]);                           // chest embroidery
  add(spine, box(0.14, 0.03, 0.03), ochre, [0, 0.26, 0.14]);
  add(spine, box(0.14, 0.03, 0.03), ochre, [0, 0.14, 0.14]);
  add(spine, cyl(0.16, 0.2, 0.05, 8, true), ochre, [0, 0.0, 0], [0, 0, 0], [1, 1, 0.8]);   // belt
  // shawl draped over shoulders, team colour, hanging down the back
  add(spine, box(0.42, 0.3, 0.04), team, [0, 0.2, -0.14], [0.1, 0, 0]);
  add(spine, cyl(0.22, 0.22, 0.06, 8), team, [0, 0.33, 0], [0, 0, 0], [1, 1, 0.8]);

  // ---- head
  add(head, cyl(0.055, 0.06, 0.1, 6), skin, [0, 0.03, 0]);
  add(head, sph(0.17, 9, 7), skin, [0, 0.19, 0.01], [0, 0, 0], [1, 1.05, 1]);
  add(head, box(0.04, 0.07, 0.05), skin, [0, 0.17, 0.18]);                      // nose
  add(head, sph(0.022, 4, 3), leather, [0.06, 0.21, 0.155]);                     // eyes
  add(head, sph(0.022, 4, 3), leather, [-0.06, 0.21, 0.155]);
  add(head, sph(0.18, 8, 6), blond, [0, 0.215, -0.02], [0, 0, 0], [1.02, 1, 1]);
  // headscarf: open cap sitting over the crown, knot at the back
  add(head, new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.42), team, [0, 0.22, -0.01], [-0.35, 0, 0]);
  add(head, box(0.34, 0.035, 0.05), ochre, [0, 0.29, 0.1], [-0.35, 0, 0]);      // brow band
  add(head, sph(0.05, 6, 4), team, [0, 0.2, -0.19]);
  add(head, box(0.05, 0.22, 0.02), team, [0.04, 0.07, -0.2], [0.2, 0, 0.2]);
  // braid: stacked beads down the back, ending in a ribbon
  const braid = J(head, 0, 0.14, -0.17);
  for (let i = 0; i < 6; i++) add(braid, sph(0.056 - i * 0.004, 6, 4), blond, [0, -0.03 - i * 0.088, -0.03 - i * 0.008], [0, 0, 0], [1, 1.35, 1]);
  add(braid, box(0.07, 0.1, 0.02), team, [0, -0.55, -0.08]);

  // ---- arms: linen sleeve, flared cuff, big hands
  for (const [sh, el] of [[lShoulder, lElbow], [rShoulder, rElbow]]) {
    add(sh, sph(0.08, 6, 4), linen, [0, -0.02, 0]);
    add(sh, cyl(0.065, 0.06, 0.28, 8), linen, [0, -0.14, 0]);
    add(el, cyl(0.06, 0.11, 0.18, 8), linen, [0, -0.09, 0]);
    add(el, cyl(0.112, 0.115, 0.03, 8, true), ochre, [0, -0.18, 0]);
    add(el, cyl(0.04, 0.045, 0.14, 6), skin, [0, -0.2, 0]);
    add(el, sph(0.065, 8, 6), skin, [0, -0.3, 0.01], [0, 0, 0], [0.85, 1.1, 1]);
  }

  // ---- pose: right hand grips the staff, left arm lifted in the dance
  rShoulder.rotation.set(-0.35, 0, -0.12);
  rElbow.rotation.set(-0.8, 0, 0);
  lShoulder.rotation.set(0, 0, 1.0);
  lElbow.rotation.set(0, 0, 0.7);

  // ---- staff, child of rElbow, kept world-vertical
  g.updateMatrixWorld(true);
  const grip = J(rElbow, 0, -0.3, 0.01);
  g.updateMatrixWorld(true);
  const q = new THREE.Quaternion(); rElbow.getWorldQuaternion(q);
  grip.quaternion.copy(q.invert()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.06)));
  g.updateMatrixWorld(true);
  const gy = grip.getWorldPosition(new THREE.Vector3()).y;
  const top = 2.02 - gy, bot = 0.04 - gy;
  add(grip, cyl(0.028, 0.034, top - bot, 7), wood, [0, (top + bot) / 2, 0]);
  add(grip, sph(0.06, 8, 6), ochre, [0, top, 0]);
  add(grip, new THREE.TorusGeometry(0.09, 0.018, 4, 8), wood, [0, top - 0.12, 0]);
  add(grip, cyl(0.04, 0.04, 0.05, 7), ochre, [0, top - 0.24, 0]);
  // ribbons fluttering off the top ring
  const rib = [[linen, 0.0, 0.5], [team, 1.3, 0.42], [linen, 2.5, 0.48], [team, 3.7, 0.38], [linen, 5.0, 0.44]];
  for (const [m, a, len] of rib) {
    const r = J(grip, Math.sin(a) * 0.09, top - 0.12, Math.cos(a) * 0.09);
    r.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
    add(r, box(0.045, len, 0.012), m, [0, -len / 2, 0], [0, a, 0]);
  }

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
