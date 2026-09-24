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
  // B: flat double-sided blades (planes pinched to a tip and curled) fanning out, plus cattails.
  const moss = M(0x6f8f3a, 'foliage', { side: THREE.DoubleSide }), thatch = M(0xb89a55, 'fabric', { side: THREE.DoubleSide });
  const head = M(0x5e4029, 'timber');
  const bladeGeo = (h, curl) => {
    const geo = new THREE.PlaneGeometry(0.1, h, 1, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + h / 2) / h;             // 0 at root, 1 at tip
      p.setX(i, p.getX(i) * (1 - t * 0.95));
      p.setZ(i, t * t * h * curl);                     // curl outward
    }
    geo.translate(0, h / 2, 0);
    geo.computeVertexNormals();
    return geo;
  };
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2 * 3 + rnd() * 0.5, d = 0.05 + Math.sqrt(rnd()) * 0.35;
    const h = 1.05 + rnd() * 0.45 - d * 0.6;
    const b = mesh(bladeGeo(h, 0.15 + d), i % 3 === 0 ? thatch : moss, Math.cos(a) * d, 0, Math.sin(a) * d);
    b.rotation.y = Math.PI / 2 - a;
    b.rotateX(0.08 + d * 0.5);
  }
  [[0.0, 0.0, 1.6, 0.02], [0.14, 0.1, 1.42, 0.08], [-0.13, 0.06, 1.33, -0.1], [0.02, -0.16, 1.25, 0.12]].forEach(([x, z, h, l]) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.set(l, 0, -l); g.add(p);
    mesh(new THREE.ConeGeometry(0.018, h, 3, 1, true), thatch, 0, h / 2, 0, p);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 5, 1), head, 0, h - 0.28, 0, p);
  });
  wrap(0.62, 1, 0.62);

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
