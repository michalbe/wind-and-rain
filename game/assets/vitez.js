// Vitez, heavy warrior. Candidate B: built from profiles (lathe barrel chest, helmet, shield;
// extruded bearded-axe blade and beard).
export default function (THREE) {
  const g = new THREE.Group();
  const mat = (hex, name, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...o }); if (name) m.name = name; return m; };
  const iron = mat(0x6f7479, 'metal', { metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }), leather = mat(0x6b4526, 'fabric', { side: THREE.DoubleSide });
  const team = mat(0xc0282d, 'fabric', { side: THREE.DoubleSide }), fur = mat(0x5a3b22, 'fabric', { side: THREE.DoubleSide });
  const skin = mat(0xd9a07a), hair = mat(0x3b2618), wood = mat(0x5e4029, 'timber');
  const J = (p, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); return o; };
  const add = (p, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1]) => {
    const me = new THREE.Mesh(geo, m); me.position.set(...pos); me.rotation.set(...rot); me.scale.set(...sc); p.add(me); return me; };
  const lathe = (pts, s = 9, p0 = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s, p0, pl);
  const ext = (shape, depth, bevel = false) => { const e = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 4 }); e.translate(0, 0, -depth / 2); return e; };

  const hips = J(g, 0, 0.96, 0);
  const spine = J(hips, 0, 0.07, 0);
  const head = J(spine, 0, 0.52, 0);
  const lShoulder = J(spine, 0.35, 0.44, 0), rShoulder = J(spine, -0.35, 0.44, 0);
  const lElbow = J(lShoulder, 0, -0.33, 0), rElbow = J(rShoulder, 0, -0.33, 0);
  const lHip = J(hips, 0.15, -0.06, 0), rHip = J(hips, -0.15, -0.06, 0);
  const lKnee = J(lHip, 0, -0.42, 0), rKnee = J(rHip, 0, -0.42, 0);

  // ---- mail skirt (lathe), wide leather belt, team kilt panels
  add(hips, lathe([[0.3, 0.06], [0.31, -0.1], [0.37, -0.36], [0.38, -0.4]], 9), iron, [0, 0, 0], [0, 0, 0], [1, 1, 0.78]);
  add(hips, lathe([[0.315, -0.02], [0.33, 0.04], [0.315, 0.1]], 9), leather, [0, 0, 0], [0, 0, 0], [1.02, 1, 0.8]);
  const flap = new THREE.Shape(); flap.moveTo(-0.15, 0); flap.lineTo(0.15, 0); flap.lineTo(0.17, -0.4); flap.lineTo(0, -0.46); flap.lineTo(-0.17, -0.4); flap.closePath();
  for (const s of [1, -1]) add(hips, ext(flap, 0.025), team, [0, 0.0, 0.26 * s], [-0.16 * s, 0, 0]);
  add(hips, new THREE.BoxGeometry(0.12, 0.1, 0.04), iron, [0, 0.04, 0.26]);   // belt buckle

  const boot = new THREE.Shape(); boot.moveTo(-0.1, 0); boot.lineTo(0.2, 0); boot.quadraticCurveTo(0.22, 0.1, 0.08, 0.13); boot.lineTo(0.08, 0.24); boot.lineTo(-0.1, 0.24); boot.closePath();
  for (const [hip, knee] of [[lHip, lKnee], [rHip, rKnee]]) {
    add(hip, lathe([[0.12, 0.03], [0.13, -0.15], [0.1, -0.44]], 8), hair);
    add(knee, lathe([[0, 0.09], [0.08, 0.07], [0.105, 0], [0.1, -0.1], [0.085, -0.3]], 8), leather);
    for (const y of [-0.18]) add(knee, lathe([[0.108, y + 0.02], [0.1, y - 0.02]], 8), hair);
    add(knee, ext(boot, 0.2), leather, [0, -0.5, 0], [0, -Math.PI / 2, 0]);
  }

  // ---- barrel chest: one lathe profile in mail, fur mantle, crossing straps
  add(spine, lathe([[0.3, -0.02], [0.33, 0.12], [0.37, 0.3], [0.35, 0.42], [0.2, 0.5], [0.1, 0.52]], 9), iron, [0, 0, 0], [0, 0, 0], [1, 1, 0.75]);
  add(spine, lathe([[0.16, 0.56], [0.28, 0.52], [0.38, 0.42], [0.38, 0.34], [0.34, 0.3]], 9), fur, [0, 0, 0], [0, 0, 0], [1, 1, 0.8]);
  const strap = new THREE.CatmullRomCurve3([new THREE.Vector3(0.28, 0.4, 0.18), new THREE.Vector3(0, 0.22, 0.29), new THREE.Vector3(-0.3, 0.02, 0.22), new THREE.Vector3(-0.34, 0.0, -0.1), new THREE.Vector3(0, 0.22, -0.28), new THREE.Vector3(0.3, 0.4, -0.18)]);
  add(spine, new THREE.TubeGeometry(strap, 8, 0.03, 4, false), leather);
  add(spine, lathe([[0, 0], [0.07, 0], [0.08, 0.03], [0, 0.05]], 7), iron, [0, 0.24, 0.27], [Math.PI / 2 - 0.1, 0, 0]);
  const tab = new THREE.Shape(); tab.moveTo(-0.22, 0.2); tab.lineTo(0.22, 0.2); tab.lineTo(0.2, -0.25); tab.lineTo(0, -0.33); tab.lineTo(-0.2, -0.25); tab.closePath();
  add(spine, ext(tab, 0.025), team, [0, 0.26, -0.25], [0.12, 0, 0]);

  // ---- head: extruded forked beard, lathe spangenhelm with spike, nasal, mail aventail
  const hg = J(head, 0, 0, 0); hg.scale.setScalar(1.25);   // large head
  add(hg, lathe([[0.09, 0], [0.1, 0.12]], 7), skin);
  add(hg, new THREE.SphereGeometry(0.19, 8, 6), skin, [0, 0.21, 0.01], [0, 0, 0], [1, 1.05, 1]);
  add(hg, new THREE.ConeGeometry(0.04, 0.1, 4), skin, [0, 0.19, 0.21], [Math.PI / 2 + 0.3, 0, 0]);
  add(hg, new THREE.BoxGeometry(0.045, 0.03, 0.02), hair, [0.07, 0.235, 0.18]);
  add(hg, new THREE.BoxGeometry(0.045, 0.03, 0.02), hair, [-0.07, 0.235, 0.18]);
  const beard = new THREE.Shape(); beard.moveTo(-0.17, 0.12); beard.lineTo(0.17, 0.12); beard.quadraticCurveTo(0.18, -0.1, 0.1, -0.22); beard.lineTo(0.06, -0.34); beard.lineTo(0.0, -0.22); beard.lineTo(-0.06, -0.34); beard.lineTo(-0.1, -0.22); beard.quadraticCurveTo(-0.18, -0.1, -0.17, 0.12);
  add(hg, ext(beard, 0.12), hair, [0, 0.05, 0.14], [0.3, 0, 0]);
  add(hg, new THREE.BoxGeometry(0.26, 0.05, 0.06), hair, [0, 0.14, 0.2]);
  add(hg, lathe([[0.215, 0.0], [0.22, 0.06], [0.2, 0.14], [0.14, 0.22], [0.06, 0.29], [0.02, 0.33], [0.0, 0.36]], 8), iron, [0, 0.25, 0]);
  add(hg, lathe([[0.225, -0.01], [0.228, 0.06]], 8), leather, [0, 0.25, 0], [0, 0, 0], [1.01, 1, 1.01]);
  add(hg, new THREE.BoxGeometry(0.05, 0.17, 0.04), iron, [0, 0.19, 0.225]);
  add(hg, lathe([[0.215, 0.1], [0.23, -0.02], [0.25, -0.12]], 8, Math.PI * 0.35, Math.PI * 1.3), iron, [0, 0.25, -0.01]);

  // ---- arms: lathe pauldrons and arms
  for (const [sh, el, s] of [[lShoulder, lElbow, 1], [rShoulder, rElbow, -1]]) {
    add(sh, lathe([[0.0, 0.12], [0.1, 0.1], [0.17, 0.02], [0.18, -0.06]], 8), iron, [0.03 * s, 0.0, 0], [0, 0, -0.35 * s]);
    add(sh, lathe([[0.12, 0.0], [0.12, -0.2], [0.1, -0.34]], 8), iron);
    add(el, lathe([[0.09, 0.02], [0.1, -0.06], [0.1, -0.2], [0.085, -0.24]], 8), leather);
    add(el, new THREE.BoxGeometry(0.2, 0.19, 0.175), skin, [0, -0.33, 0.01]);   // large hands
  }
  lShoulder.rotation.set(-0.2, 0, 0.14);
  lElbow.rotation.set(-0.95, 0, 0);
  rShoulder.rotation.set(-0.15, 0, -0.1);
  rElbow.rotation.set(-0.7, 0, 0);

  const holdLevel = (elbow, pos, euler) => {
    const h = J(elbow, ...pos);
    g.updateMatrixWorld(true);
    const q = new THREE.Quaternion(); elbow.getWorldQuaternion(q);
    h.quaternion.copy(q.invert()).multiply(new THREE.Quaternion().setFromEuler(euler));
    g.updateMatrixWorld(true);
    return h;
  };

  // ---- shield: domed lathe disc, rim, boss
  const shield = holdLevel(lElbow, [0.02, -0.16, 0], new THREE.Euler(Math.PI / 2, 0, 0).set(0, 0.4, 0));
  const face = J(shield, 0, 0, 0.14); face.rotation.x = Math.PI / 2;
  add(face, lathe([[0.0, 0.07], [0.2, 0.05], [0.4, 0.0], [0.43, -0.02], [0.4, -0.03], [0, -0.03]], 10), team);
  add(face, lathe([[0.4, 0.005], [0.44, -0.015], [0.4, -0.035]], 10), iron);
  add(face, lathe([[0.12, 0.05], [0.11, 0.09], [0.08, 0.13], [0.03, 0.15], [0, 0.155]], 8), iron);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; add(face, new THREE.SphereGeometry(0.02, 4, 3), iron, [Math.sin(a) * 0.36, 0.012, Math.cos(a) * 0.36]); }

  // ---- axe: extruded bearded blade on a long haft
  const axe = holdLevel(rElbow, [0, -0.32, 0.02], new THREE.Euler(0.22, 0, 0));
  add(axe, lathe([[0, -0.42], [0.045, -0.4], [0.04, -0.3], [0.035, 0.0], [0.038, 0.85], [0.03, 0.98], [0, 1.0]], 7), wood);
  add(axe, lathe([[0.045, -0.12], [0.045, 0.06]], 7), leather);
  const blade = new THREE.Shape();
  blade.moveTo(-0.08, 0.08); blade.lineTo(0.08, 0.08); blade.quadraticCurveTo(0.16, 0.12, 0.24, 0.24);
  blade.quadraticCurveTo(0.34, 0.0, 0.32, -0.3); blade.quadraticCurveTo(0.22, -0.3, 0.12, -0.34);
  blade.quadraticCurveTo(0.14, -0.15, 0.08, -0.06); blade.lineTo(-0.08, -0.06); blade.closePath();
  const bg = ext(blade, 0.06);
  add(axe, bg, iron, [0, 0.8, 0.02], [0, -Math.PI / 2, 0], [1.3, 1.3, 1]);
  add(axe, lathe([[0.055, -0.1], [0.06, 0.1]], 7), iron, [0, 0.83, 0]);

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
