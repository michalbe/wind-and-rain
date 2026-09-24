// Streletz, archer. Candidate B: built from profiles (lathe tunic/cap/quiver, tube recurve bow, extruded sash).
export default function (THREE) {
  const g = new THREE.Group();
  const mat = (hex, name, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...o }); if (name) m.name = name; return m; };
  const linen = mat(0xe6dcc3, 'fabric', { side: THREE.DoubleSide }), team = mat(0xc0282d, 'fabric', { side: THREE.DoubleSide });
  const fur = mat(0x5a3b22, 'fabric', { side: THREE.DoubleSide }), leather = mat(0x6b4526, 'fabric', { side: THREE.DoubleSide });
  const skin = mat(0xd9a07a), hair = mat(0x3b2618), wood = mat(0xa27a4f, 'timber');
  const J = (p, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); return o; };
  const add = (p, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1]) => {
    const me = new THREE.Mesh(geo, m); me.position.set(...pos); me.rotation.set(...rot); me.scale.set(...sc); p.add(me); return me; };
  const lathe = (pts, s = 8) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s);
  const ext = (shape, depth) => { const e = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 3 }); e.translate(0, 0, -depth / 2); return e; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const hips = J(g, 0, 0.94, 0);
  const spine = J(hips, 0, 0.06, 0);
  const head = J(spine, 0, 0.42, 0);
  const lShoulder = J(spine, 0.24, 0.34, 0), rShoulder = J(spine, -0.24, 0.34, 0);
  const lElbow = J(lShoulder, 0, -0.29, 0), rElbow = J(rShoulder, 0, -0.29, 0);
  const lHip = J(hips, 0.11, -0.05, 0), rHip = J(hips, -0.11, -0.05, 0);
  const lKnee = J(lHip, 0, -0.43, 0), rKnee = J(rHip, 0, -0.43, 0);

  // ---- tunic skirt (lathe) with leather hem, team sash with extruded knot
  add(hips, lathe([[0.2, 0.08], [0.21, -0.05], [0.27, -0.28], [0.31, -0.4], [0.3, -0.42]], 8), linen, [0, 0, 0], [0, 0, 0], [1, 1, 0.82]);
  add(hips, lathe([[0.295, -0.36], [0.315, -0.415]], 8), leather, [0, 0, 0], [0, 0, 0], [1.02, 1, 0.84]);
  add(hips, lathe([[0.2, 0.0], [0.22, 0.04], [0.215, 0.09], [0.2, 0.1]], 8), team, [0, 0, 0], [0, 0, 0], [1.02, 1, 0.85]);
  const tail = new THREE.Shape(); tail.moveTo(-0.04, 0); tail.lineTo(0.04, 0); tail.quadraticCurveTo(0.07, -0.2, 0.03, -0.36); tail.lineTo(-0.04, -0.34); tail.quadraticCurveTo(0.0, -0.18, -0.04, 0);
  add(hips, ext(tail, 0.02), team, [-0.15, 0.03, 0.17], [-0.15, -0.4, 0]);
  add(hips, ext(tail, 0.02), team, [-0.2, 0.03, 0.13], [-0.1, -0.7, 0.2], [0.8, 0.85, 1]);
  add(hips, new THREE.SphereGeometry(0.05, 6, 4), team, [-0.16, 0.05, 0.16]);

  const boot = new THREE.Shape(); boot.moveTo(-0.08, 0); boot.lineTo(0.18, 0); boot.quadraticCurveTo(0.19, 0.08, 0.07, 0.1); boot.lineTo(0.06, 0.2); boot.lineTo(-0.08, 0.2); boot.closePath();
  for (const [hip, knee] of [[lHip, lKnee], [rHip, rKnee]]) {
    add(hip, lathe([[0.085, 0.02], [0.09, -0.15], [0.07, -0.43]], 7), hair);
    add(knee, lathe([[0.07, 0.02], [0.072, -0.1], [0.062, -0.3]], 7), leather);
    for (const y of [-0.08, -0.22]) add(knee, lathe([[0.074, y + 0.02], [0.072, y - 0.02]], 7), hair);
    add(knee, ext(boot, 0.14), leather, [0, -0.5, 0], [0, -Math.PI / 2, 0]);
  }

  // ---- torso lathe + strap
  add(spine, lathe([[0, -0.02], [0.2, -0.02], [0.21, 0.15], [0.24, 0.3], [0.15, 0.38], [0.1, 0.42]], 8), linen, [0, 0, 0], [0, 0, 0], [1, 1, 0.78]);
  add(spine, lathe([[0.12, 0.37], [0.14, 0.4], [0.1, 0.44]], 8), leather, [0, 0, 0], [0, 0, 0], [1.02, 1, 0.9]);
  const strap = new THREE.CatmullRomCurve3([V(0.2, 0.36, 0.08), V(0.0, 0.2, 0.2), V(-0.2, 0.02, 0.14), V(-0.23, 0.0, -0.05), V(-0.05, 0.12, -0.2), V(0.18, 0.34, -0.12)]);
  add(spine, new THREE.TubeGeometry(strap, 8, 0.022, 4, false), leather);

  // ---- quiver: lathe tube with a flared mouth, arrows fanning out
  const quiver = J(spine, -0.02, 0.2, -0.23);
  quiver.rotation.set(-0.15, 0, 0.5);
  add(quiver, lathe([[0, -0.3], [0.07, -0.3], [0.08, 0.1], [0.1, 0.28], [0.095, 0.3]], 8), leather);
  add(quiver, lathe([[0.101, 0.2], [0.104, 0.28]], 8), fur, [0, 0, 0], [0, 0, 0], [1.02, 1, 1.02]);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26, x = Math.sin(a) * 0.045, z = Math.cos(a) * 0.045;
    const ar = J(quiver, x, 0.2, z); ar.rotation.set(z * 2, 0, -x * 2);
    add(ar, new THREE.CylinderGeometry(0.009, 0.009, 0.22, 4), wood, [0, 0.1, 0]);
    const f = new THREE.Shape(); f.moveTo(0, 0); f.lineTo(0.03, 0.02); f.lineTo(0.03, 0.12); f.lineTo(0, 0.1); f.closePath();
    add(ar, ext(f, 0.006), linen, [0, 0.13, 0], [0, a, 0]);
    add(ar, ext(f, 0.006), linen, [0, 0.13, 0], [0, a + Math.PI, 0]);
  }

  // ---- head: lathe fur kolpak with a team-cloth crown
  add(head, lathe([[0.06, 0], [0.065, 0.1]], 6), skin);
  add(head, new THREE.SphereGeometry(0.17, 9, 7), skin, [0, 0.19, 0.01], [0, 0, 0], [1, 1.05, 1]);
  add(head, new THREE.ConeGeometry(0.035, 0.09, 4), skin, [0, 0.18, 0.19], [Math.PI / 2 + 0.3, 0, 0]);
  add(head, new THREE.SphereGeometry(0.018, 4, 3), hair, [0.058, 0.215, 0.158]);
  add(head, new THREE.SphereGeometry(0.018, 4, 3), hair, [-0.058, 0.215, 0.158]);
  const must = new THREE.Shape(); must.moveTo(0, 0.02); must.quadraticCurveTo(0.08, 0.03, 0.1, -0.1); must.lineTo(0.08, -0.1); must.quadraticCurveTo(0.06, -0.02, 0, -0.01); must.quadraticCurveTo(-0.06, -0.02, -0.08, -0.1); must.lineTo(-0.1, -0.1); must.quadraticCurveTo(-0.08, 0.03, 0, 0.02);
  add(head, ext(must, 0.04), hair, [0, 0.14, 0.16]);
  add(head, new THREE.SphereGeometry(0.172, 8, 6), hair, [0, 0.19, -0.035]);
  const cap = J(head, 0, 0.25, -0.01); cap.rotation.x = -0.12;
  add(cap, lathe([[0.19, -0.02], [0.205, 0.04], [0.2, 0.11], [0.16, 0.13]], 9), fur);
  add(cap, lathe([[0.165, 0.1], [0.16, 0.15], [0.11, 0.19], [0, 0.2]], 9), team);
  add(cap, new THREE.SphereGeometry(0.035, 5, 4), fur, [0, 0.21, 0]);

  // ---- arms (lathe sleeves, leather bracers)
  for (const [sh, el] of [[lShoulder, lElbow], [rShoulder, rElbow]]) {
    add(sh, lathe([[0, 0.08], [0.08, 0.05], [0.085, -0.05], [0.07, -0.29]], 7), linen);
    add(el, lathe([[0.065, 0.02], [0.07, -0.08], [0.06, -0.21]], 7), leather);
    add(el, new THREE.SphereGeometry(0.07, 7, 5), skin, [0, -0.28, 0.01], [0, 0, 0], [0.85, 1.1, 1]);
  }
  lShoulder.rotation.set(-0.45, 0, 0.2);
  lElbow.rotation.set(-0.7, 0, 0);
  rShoulder.rotation.set(0.05, 0, -0.14);
  rElbow.rotation.set(-0.35, 0, 0);

  // ---- recurve bow: one tube swept along a recurve curve, plus string
  const bowJ = J(lElbow, 0, -0.28, 0.01);
  g.updateMatrixWorld(true);
  const q = new THREE.Quaternion(); lElbow.getWorldQuaternion(q);
  bowJ.quaternion.copy(q.invert()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, -0.1)));
  const bow = new THREE.CatmullRomCurve3([V(0, -0.84, 0.03), V(0, -0.74, -0.05), V(0, -0.45, 0.05), V(0, 0, 0.12), V(0, 0.45, 0.05), V(0, 0.74, -0.05), V(0, 0.84, 0.03)]);
  add(bowJ, new THREE.TubeGeometry(bow, 14, 0.032, 5, false), wood);
  add(bowJ, new THREE.CylinderGeometry(0.042, 0.042, 0.16, 6), leather, [0, 0, 0.115]);
  add(bowJ, new THREE.CylinderGeometry(0.006, 0.006, 1.6, 4), linen, [0, 0, -0.03]);

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
