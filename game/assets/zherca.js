// Zherca, Rain Priest. Candidate C: different reading: pale linen robe under a full-length team cloak
// with a deep hood, wooden bowl of water, staff crowned by a rain-cloud of hanging drops.
export default function (THREE) {
  const g = new THREE.Group();
  const mat = (hex, name, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...o }); if (name) m.name = name; return m; };
  const linen = mat(0xe6dcc3, 'fabric'), team = mat(0xc0282d, 'fabric', { side: THREE.DoubleSide }), ochre = mat(0xc98a2b, 'fabric');
  const skin = mat(0xd9a07a), hair = mat(0x3b2618), wood = mat(0x5e4029, 'timber', { side: THREE.DoubleSide }), water = mat(0x4f8fb0, null, { roughness: 0.15 });
  const J = (p, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); return o; };
  const add = (p, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1]) => {
    const me = new THREE.Mesh(geo, m); me.position.set(...pos); me.rotation.set(...rot); me.scale.set(...sc); p.add(me); return me; };
  const cap = (r, len) => new THREE.CylinderGeometry(r, r * 0.9, len + r * 1.4, 7);
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

  const hips = J(g, 0, 0.92, 0);
  const spine = J(hips, 0, 0.06, 0);
  const head = J(spine, 0, 0.43, 0);
  const lShoulder = J(spine, 0.23, 0.34, 0), rShoulder = J(spine, -0.23, 0.34, 0);
  const lElbow = J(lShoulder, 0, -0.29, 0), rElbow = J(rShoulder, 0, -0.29, 0);
  const lHip = J(hips, 0.1, -0.04, 0), rHip = J(hips, -0.1, -0.04, 0);
  const lKnee = J(lHip, 0, -0.42, 0), rKnee = J(rHip, 0, -0.42, 0);

  // ---- linen robe, hexagonal, with ochre hem and front band
  add(hips, new THREE.CylinderGeometry(0.19, 0.3, 0.88, 8), linen, [0, -0.41, 0], [0, Math.PI / 8, 0]);
  add(hips, new THREE.CylinderGeometry(0.3, 0.31, 0.07, 8, 1, true), ochre, [0, -0.81, 0], [0, Math.PI / 8, 0], [1.02, 1, 1.02]);
  add(hips, box(0.1, 0.8, 0.03), ochre, [0, -0.4, 0.23], [-0.13, 0, 0]);
  add(hips, new THREE.TorusGeometry(0.2, 0.03, 4, 9), ochre, [0, 0.03, 0], [Math.PI / 2, 0, 0], [1, 0.85, 1]);

  // ---- cloak: hangs from the shoulders (spine) to the ankles, open at the front
  const cloak = J(spine, 0, 0.36, -0.02);
  add(cloak, new THREE.CylinderGeometry(0.2, 0.42, 1.28, 9, 1, true, Math.PI * 0.28, Math.PI * 1.44), team, [0, -0.6, -0.03], [0, 0, 0], [1, 1, 0.8]);
  add(cloak, new THREE.CylinderGeometry(0.17, 0.25, 0.1, 9, 1, true), team, [0, 0.0, 0], [0, 0, 0], [1, 1, 0.85]);
  add(cloak, new THREE.CylinderGeometry(0.42, 0.425, 0.05, 9, 1, true, Math.PI * 0.28, Math.PI * 1.44), ochre, [0, -1.2, -0.03], [0, 0, 0], [1.01, 1, 0.81]);
  const rAt = (y) => 0.2 + (-y / 1.28) * 0.22 + 0.006;
  for (const y of [-0.42, -0.95]) add(cloak, new THREE.CylinderGeometry(rAt(y - 0.03), rAt(y + 0.03), 0.06, 9, 1, true, Math.PI * 0.28, Math.PI * 1.44), ochre, [0, y + 0.03 - 0.03, -0.03], [0, 0, 0], [1, 1, 0.8]);
  add(cloak, box(0.07, 1.1, 0.02), ochre, [0, -0.62, -0.03 - rAt(-0.62) * 0.8 - 0.005], [0.137, 0, 0]);
  add(cloak, box(0.18, 0.05, 0.02), ochre, [0, -0.62, -0.03 - rAt(-0.62) * 0.8 - 0.01], [0.137, 0, Math.PI / 4]);
  add(cloak, box(0.18, 0.05, 0.02), ochre, [0, -0.62, -0.03 - rAt(-0.62) * 0.8 - 0.01], [0.137, 0, -Math.PI / 4]);
  add(cloak, new THREE.SphereGeometry(0.045, 6, 4), ochre, [0.12, -0.02, 0.15]);
  add(cloak, new THREE.SphereGeometry(0.045, 6, 4), ochre, [-0.12, -0.02, 0.15]);

  for (const [hip, knee] of [[lHip, lKnee], [rHip, rKnee]]) {
    add(hip, cap(0.07, 0.28), linen, [0, -0.21, 0]);
    add(knee, cap(0.055, 0.28), hair, [0, -0.2, 0]);
    add(knee, box(0.13, 0.09, 0.24), hair, [0, -0.455, 0.04]);
  }

  // ---- torso
  add(spine, box(0.38, 0.4, 0.24), linen, [0, 0.19, 0]);
  add(spine, box(0.16, 0.36, 0.02), ochre, [0, 0.19, 0.125]);
  add(spine, box(0.1, 0.04, 0.025), linen, [0, 0.27, 0.13]);
  add(spine, box(0.1, 0.04, 0.025), linen, [0, 0.15, 0.13]);

  // ---- head: long beard, deep hood with a brim
  add(head, cap(0.05, 0.04), skin, [0, 0.03, 0]);
  add(head, new THREE.SphereGeometry(0.17, 9, 7), skin, [0, 0.19, 0.01]);
  add(head, box(0.05, 0.09, 0.06), skin, [0, 0.19, 0.18]);
  add(head, box(0.15, 0.035, 0.03), hair, [0, 0.25, 0.16]);
  add(head, box(0.04, 0.025, 0.02), hair, [0.055, 0.215, 0.16]);
  add(head, box(0.04, 0.025, 0.02), hair, [-0.055, 0.215, 0.16]);
  add(head, box(0.22, 0.2, 0.08), hair, [0, 0.06, 0.13], [0.2, 0, 0]);
  add(head, new THREE.ConeGeometry(0.11, 0.26, 4), hair, [0, -0.12, 0.17], [Math.PI + 0.25, Math.PI / 4, 0], [1, 1, 0.6]);
  add(head, box(0.22, 0.05, 0.06), hair, [0, 0.14, 0.18]);
  const hood = J(head, 0, 0.2, -0.02);
  hood.rotation.x = -0.25;
  add(hood, new THREE.SphereGeometry(0.22, 9, 6, Math.PI * 0.5 + 0.8, Math.PI * 2 - 1.6, 0, Math.PI * 0.75), team);
  add(hood, new THREE.ConeGeometry(0.08, 0.3, 6), team, [0, -0.05, -0.24], [-2.75, 0, 0]);

  // ---- arms
  for (const [sh, el] of [[lShoulder, lElbow], [rShoulder, rElbow]]) {
    add(sh, cap(0.075, 0.18), team, [0, -0.12, 0]);
    add(el, new THREE.CylinderGeometry(0.075, 0.12, 0.22, 7, 1, true), linen, [0, -0.1, 0]);
    add(el, cap(0.045, 0.12), skin, [0, -0.18, 0]);
    add(el, box(0.1, 0.13, 0.07), skin, [0, -0.3, 0.01]);
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

  // wooden bowl
  const bowl = holdLevel(lElbow, [0, -0.35, 0.02], new THREE.Euler(0, 0, 0));
  add(bowl, new THREE.SphereGeometry(0.17, 9, 5, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), wood, [0, 0.12, 0], [0, 0, 0], [1, 0.6, 1]);
  add(bowl, new THREE.CircleGeometry(0.155, 9), water, [0, 0.1, 0], [-Math.PI / 2, 0, 0]);
  add(bowl, new THREE.TorusGeometry(0.165, 0.015, 4, 9), wood, [0, 0.12, 0], [Math.PI / 2, 0, 0]);

  // staff with a rain-cloud head
  const grip = holdLevel(rElbow, [0, -0.31, 0.01], new THREE.Euler(0.05, 0, -0.05));
  const gy = grip.getWorldPosition(new THREE.Vector3()).y;
  const top = 1.72 - gy, bot = 0.03 - gy;
  add(grip, new THREE.CylinderGeometry(0.034, 0.04, top - bot, 7), wood, [0, (top + bot) / 2, 0]);
  add(grip, new THREE.CylinderGeometry(0.05, 0.05, 0.05, 7), ochre, [0, 0.3, 0]);
  add(grip, new THREE.SphereGeometry(0.09, 7, 5), ochre, [0, top, 0], [0, 0, 0], [1.4, 0.7, 1]);
  add(grip, new THREE.SphereGeometry(0.06, 6, 4), ochre, [0.08, top + 0.03, 0.02]);
  add(grip, new THREE.SphereGeometry(0.06, 6, 4), ochre, [-0.07, top + 0.02, -0.02]);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26;
    const x = Math.sin(a) * 0.1, z = Math.cos(a) * 0.08, l = 0.12 + (i % 2) * 0.08;
    add(grip, box(0.012, l, 0.012), ochre, [x, top - 0.04 - l / 2, z]);
    add(grip, new THREE.ConeGeometry(0.025, 0.06, 5), water, [x, top - 0.06 - l, z], [Math.PI, 0, 0]);
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
