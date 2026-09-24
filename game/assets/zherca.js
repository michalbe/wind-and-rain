// Zherca, Rain Priest. A tall hooded column: full-length team mantle and peaked hood over a pale
// linen robe, a wooden bowl of water in the left hand, and a big staff crowned by a rain-drum
// held high above the head, drops hanging from its rim.
export default function (THREE) {
  const g = new THREE.Group();
  const mat = (hex, name, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...o }); if (name) m.name = name; return m; };
  const linen = mat(0xe6dcc3, 'fabric', { side: THREE.DoubleSide }), team = mat(0xc0282d, 'fabric', { side: THREE.DoubleSide }), ochre = mat(0xc98a2b, 'fabric', { side: THREE.DoubleSide });
  const skin = mat(0xd9a07a), hair = mat(0x3b2618), wood = mat(0x5e4029, 'timber', { side: THREE.DoubleSide }), water = mat(0x4f8fb0, null, { roughness: 0.15 });
  const J = (p, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); return o; };
  const add = (p, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1]) => {
    const me = new THREE.Mesh(geo, m); me.position.set(...pos); me.rotation.set(...rot); me.scale.set(...sc); p.add(me); return me; };
  const cap = (r, len) => new THREE.CylinderGeometry(r, r * 0.9, len + r * 1.4, 7);
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const lathe = (pts, s = 10, p0 = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s, p0, pl);

  const hips = J(g, 0, 0.92, 0);
  const spine = J(hips, 0, 0.06, 0);
  const head = J(spine, 0, 0.43, 0);
  const lShoulder = J(spine, 0.23, 0.34, 0), rShoulder = J(spine, -0.23, 0.34, 0);
  const lElbow = J(lShoulder, 0, -0.29, 0), rElbow = J(rShoulder, 0, -0.29, 0);
  const lHip = J(hips, 0.1, -0.04, 0), rHip = J(hips, -0.1, -0.04, 0);
  const lKnee = J(lHip, 0, -0.42, 0), rKnee = J(rHip, 0, -0.42, 0);

  // ---- linen robe (shows in the mantle's front opening), ochre hem and front band
  add(hips, new THREE.CylinderGeometry(0.19, 0.3, 0.88, 8), linen, [0, -0.41, 0], [0, Math.PI / 8, 0]);
  add(hips, new THREE.CylinderGeometry(0.3, 0.31, 0.07, 8, 1, true), ochre, [0, -0.81, 0], [0, Math.PI / 8, 0], [1.02, 1, 1.02]);
  add(hips, box(0.1, 0.8, 0.03), ochre, [0, -0.4, 0.23], [-0.13, 0, 0]);
  add(hips, new THREE.CylinderGeometry(0.205, 0.205, 0.06, 9, 1, true), ochre, [0, 0.03, 0], [0, 0, 0], [1, 1, 0.85]);

  // ---- full-length team mantle from the shoulders (spine) to the ground, a narrow front opening
  const cloak = J(spine, 0, 0.36, -0.02);
  const o0 = Math.PI * 0.16, ol = Math.PI * 1.68;
  add(cloak, lathe([[0.2, 0.02], [0.3, -0.12], [0.33, -0.5], [0.4, -1.0], [0.47, -1.3]], 11, o0, ol), team, [0, 0, 0], [0, 0, 0], [1, 1, 0.82]);
  add(cloak, lathe([[0.465, -1.24], [0.475, -1.31]], 11, o0, ol), ochre, [0, 0, 0], [0, 0, 0], [1.012, 1, 0.832]);
  add(cloak, lathe([[0.395, -0.95], [0.408, -1.02]], 11, o0, ol), ochre, [0, 0, 0], [0, 0, 0], [1.012, 1, 0.832]);
  // shoulder mantle: a closed team capelet that reads as one broad red disc from above
  add(cloak, lathe([[0.13, 0.1], [0.26, 0.04], [0.37, -0.1], [0.4, -0.22]], 11), team, [0, 0, 0], [0, 0, 0], [1, 1, 0.82]);
  add(cloak, lathe([[0.4, -0.22], [0.41, -0.18], [0.405, -0.16]], 11), ochre, [0, 0, 0], [0, 0, 0], [1, 1, 0.82]);
  // back sigil: crossed ochre bands
  add(cloak, box(0.07, 0.9, 0.02), ochre, [0, -0.72, -0.335], [0.07, 0, 0]);
  add(cloak, box(0.2, 0.05, 0.02), ochre, [0, -0.6, -0.33], [0.07, 0, Math.PI / 4]);
  add(cloak, box(0.2, 0.05, 0.02), ochre, [0, -0.6, -0.33], [0.07, 0, -Math.PI / 4]);
  add(cloak, new THREE.SphereGeometry(0.05, 6, 4), ochre, [0.12, 0.0, 0.2]);
  add(cloak, new THREE.SphereGeometry(0.05, 6, 4), ochre, [-0.12, 0.0, 0.2]);

  for (const [hip, knee] of [[lHip, lKnee], [rHip, rKnee]]) {
    add(hip, cap(0.07, 0.28), linen, [0, -0.21, 0]);
    add(knee, cap(0.055, 0.28), hair, [0, -0.2, 0]);
    add(knee, box(0.13, 0.09, 0.24), hair, [0, -0.455, 0.05]);
  }

  // ---- torso
  add(spine, box(0.38, 0.4, 0.24), linen, [0, 0.19, 0]);
  add(spine, box(0.16, 0.36, 0.02), ochre, [0, 0.19, 0.125]);

  // ---- head (x1.25): long beard, deep team hood with a tall peak
  const hg = J(head, 0, 0, 0); hg.scale.setScalar(1.25);
  add(hg, cap(0.05, 0.04), skin, [0, 0.03, 0]);
  add(hg, new THREE.SphereGeometry(0.17, 9, 7), skin, [0, 0.19, 0.01]);
  add(hg, box(0.05, 0.09, 0.06), skin, [0, 0.19, 0.18]);
  add(hg, box(0.15, 0.035, 0.03), hair, [0, 0.25, 0.16]);
  add(hg, box(0.04, 0.025, 0.02), hair, [0.055, 0.215, 0.16]);
  add(hg, box(0.04, 0.025, 0.02), hair, [-0.055, 0.215, 0.16]);
  add(hg, box(0.22, 0.2, 0.08), hair, [0, 0.06, 0.13], [0.2, 0, 0]);
  add(hg, new THREE.ConeGeometry(0.11, 0.3, 4), hair, [0, -0.13, 0.17], [Math.PI + 0.25, Math.PI / 4, 0], [1, 1, 0.6]);
  add(hg, box(0.22, 0.05, 0.06), hair, [0, 0.14, 0.18]);
  const hood = J(hg, 0, 0.2, -0.02);
  hood.rotation.x = -0.2;
  add(hood, new THREE.SphereGeometry(0.225, 10, 6, Math.PI * 0.5 + 0.75, Math.PI * 2 - 1.5, 0, Math.PI * 0.78), team);
  add(hood, new THREE.TorusGeometry(0.2, 0.03, 3, 8, Math.PI * 1.1), ochre, [0, 0.0, 0.1], [0.2, 0, -Math.PI * 0.05], [1, 1.15, 1]);
  add(hood, new THREE.ConeGeometry(0.19, 0.3, 7), team, [0, 0.15, -0.06], [-0.35, 0, 0]);

  // ---- arms: team upper sleeves, linen cuffs, large hands
  for (const [sh, el] of [[lShoulder, lElbow], [rShoulder, rElbow]]) {
    add(sh, cap(0.08, 0.18), team, [0, -0.12, 0]);
    add(el, new THREE.CylinderGeometry(0.08, 0.14, 0.22, 7, 1, true), team, [0, -0.1, 0]);
    add(el, new THREE.CylinderGeometry(0.14, 0.145, 0.04, 7, 1, true), ochre, [0, -0.21, 0]);
    add(el, cap(0.045, 0.12), skin, [0, -0.18, 0]);
    add(el, box(0.125, 0.16, 0.09), skin, [0, -0.31, 0.01]);
  }
  lShoulder.rotation.set(-0.5, 0, 0.12);
  lElbow.rotation.set(-1.0, 0, 0);
  rShoulder.rotation.set(-0.25, 0, -0.18);
  rElbow.rotation.set(-0.7, 0, 0);

  const holdLevel = (elbow, pos, euler) => {
    const h = J(elbow, ...pos);
    g.updateMatrixWorld(true);
    const q = new THREE.Quaternion(); elbow.getWorldQuaternion(q);
    h.quaternion.copy(q.invert()).multiply(new THREE.Quaternion().setFromEuler(euler));
    g.updateMatrixWorld(true);
    return h;
  };

  // wooden bowl of water
  const bowl = holdLevel(lElbow, [0, -0.37, 0.02], new THREE.Euler(0, 0, 0));
  add(bowl, new THREE.SphereGeometry(0.19, 9, 4, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), wood, [0, 0.13, 0], [0, 0, 0], [1, 0.6, 1]);
  add(bowl, new THREE.CircleGeometry(0.175, 9), water, [0, 0.11, 0], [-Math.PI / 2, 0, 0]);
  add(bowl, new THREE.TorusGeometry(0.185, 0.017, 4, 9), wood, [0, 0.13, 0], [Math.PI / 2, 0, 0]);

  // big staff with a rain-drum held high above the head
  const grip = holdLevel(rElbow, [0, -0.32, 0.01], new THREE.Euler(-0.12, 0, 0.2));
  const gy = grip.getWorldPosition(new THREE.Vector3()).y;
  const ct = Math.cos(0.12) * Math.cos(0.2), L = (2.09 - gy) / ct, bot = (0.03 - gy) / ct, dT = L - 0.08;
  add(grip, new THREE.CylinderGeometry(0.04, 0.046, dT - bot, 7), wood, [0, (dT + bot) / 2, 0]);
  add(grip, new THREE.CylinderGeometry(0.058, 0.058, 0.06, 7), ochre, [0, 0.28, 0]);
  add(grip, new THREE.CylinderGeometry(0.058, 0.058, 0.06, 7), ochre, [0, -0.1, 0]);
  const drum = J(grip, 0, dT, 0); drum.rotation.set(0.12, 0, -0.2);           // drum level in the world
  add(drum, new THREE.CylinderGeometry(0.22, 0.2, 0.15, 12), wood, [0, 0, 0]);
  add(drum, new THREE.CylinderGeometry(0.215, 0.215, 0.012, 12), linen, [0, 0.078, 0]);
  add(drum, new THREE.CylinderGeometry(0.228, 0.228, 0.04, 12, 1, true), ochre, [0, 0.06, 0]);
  add(drum, new THREE.CylinderGeometry(0.21, 0.21, 0.04, 12, 1, true), ochre, [0, -0.06, 0]);
  add(drum, new THREE.CylinderGeometry(0.075, 0.03, 0.12, 7), wood, [0, -0.13, 0]);
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7 + 0.2, x = Math.sin(a) * 0.19, z = Math.cos(a) * 0.19, l = 0.1 + (i % 3) * 0.07;
    add(drum, new THREE.CylinderGeometry(0.009, 0.009, l, 3, 1, true), ochre, [x, -0.07 - l / 2, z]);
    add(drum, new THREE.ConeGeometry(0.035, 0.1, 5), water, [x, -0.1 - l, z], [Math.PI, 0, 0]);
  }

  // ---- place
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
