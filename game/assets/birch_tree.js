export default function (THREE) {
  const g = new THREE.Group();
  let _s = 7919;
  const rnd = () => { _s = (_s * 16807) % 2147483647; return (_s - 1) / 2147483646; };
  const M = (hex, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.9 }, o));
    if (name) m.name = name;
    return m;
  };
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = g) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
  };
  // Position-hashed jitter: coincident vertices (seams, caps) move together, so nothing tears.
  const hash = (x, y, z, k) => {
    const h = Math.sin(Math.round(x * 997) * 12.9898 + Math.round(y * 991) * 78.233 + Math.round(z * 983) * 37.719 + k * 11.13) * 43758.5453;
    return (h - Math.floor(h)) * 2 - 1;
  };
  const jitter = (geo, a, k = 1, ay = a) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      p.setXYZ(i, x + a * hash(x, y, z, k), y + ay * hash(x, y, z, k + 17), z + a * hash(x, y, z, k + 31));
    }
    geo.computeVertexNormals();
    return geo;
  };
  // Re-proportion the finished parts as one unit (used to hit the stated footprint exactly).
  const wrap = (sx, sy, sz) => {
    const w = new THREE.Group(); while (g.children.length) w.add(g.children[0]);
    w.scale.set(sx, sy, sz); g.add(w); return w;
  };
  // A: primitives. Pale slightly leaning trunk with dark rings, three rounded moss clumps.
  const daub = M(0xd8cdb0, 'plaster'), bark = M(0x4a3322, 'timber'), moss = M(0x6f8f3a, 'foliage');
  const tr = new THREE.Group(); g.add(tr); tr.rotation.z = 0.05; tr.rotation.x = -0.03;
  mesh(jitter(new THREE.CylinderGeometry(0.12, 0.21, 4.6, 7, 1), 0.015, 2, 0), daub, 0, 2.3, 0, tr);
  [[0.5, 0.16], [1.35, 0.1], [2.2, 0.14], [3.3, 0.08]].forEach(([y, h], i) => {
    const r = 0.21 - (0.09 * y) / 4.6 + 0.012;
    const b = mesh(new THREE.CylinderGeometry(r, r + 0.004, h, 7, 1, true), bark, 0, y, 0, tr);
    b.rotation.y = i;
  });
  const clump = (r, x, y, z, sy, k) => {
    const s = mesh(jitter(new THREE.SphereGeometry(r, 8, 5), r * 0.1, k), moss, x, y, z, tr);
    s.scale.set(1, sy, 1);
  };
  clump(1.25, 0.15, 5.6, 0.05, 1.05, 1);
  clump(1.0, -0.75, 4.55, 0.35, 0.85, 2);
  clump(0.95, 0.7, 4.35, -0.45, 0.85, 3);

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
