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
  // A: primitives. Faceted stone ring with moss caps round a still pool, reeds on one bank,
  // three short ribboned stakes at the front.
  const stone = M(0x8d8a80, 'stone'), dk = M(0x5f5d57, 'stone'), moss = M(0x6f8f3a, 'foliage');
  const water = M(0x4f8fb0, null, { roughness: 0.15 });
  const wood = M(0x5e4029, 'timber'), linen = M(0xe6dcc3, 'fabric', { side: THREE.DoubleSide }), ochre = M(0xc98a2b, 'fabric', { side: THREE.DoubleSide });
  mesh(new THREE.CylinderGeometry(1.55, 1.7, 0.08, 18, 1), dk, 0, 0.04, 0);         // pool bed
  mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.05, 18, 1), water, 0, 0.1, 0);       // water surface
  const N = 13;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rnd() * 0.15, R = 1.62 + rnd() * 0.1;
    const r = 0.24 + rnd() * 0.09, sy = 0.8 + rnd() * 0.25;
    const s = mesh(jitter(new THREE.DodecahedronGeometry(r, 0), r * 0.15, i + 1), i % 3 ? stone : dk, Math.cos(a) * R, r * sy * 0.85, Math.sin(a) * R);
    s.scale.set(1.25, sy, 1.0); s.rotation.set(0, -a, 0);
    if (i % 2 === 0) {
      const c = mesh(new THREE.SphereGeometry(r * 0.85, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), moss, Math.cos(a) * R, r * sy * 1.55, Math.sin(a) * R);
      c.scale.set(1.2, 0.5, 1.0); c.rotation.y = -a;
    }
  }
  // reeds on the back-left bank, inside the ring
  for (let i = 0; i < 12; i++) {
    const a = 2.3 + rnd() * 0.9, R = 1.1 + rnd() * 0.3, h = 0.4 + rnd() * 0.22;
    const p = new THREE.Group(); p.position.set(Math.cos(a) * R, 0.08, -Math.abs(Math.sin(a)) * R); p.rotation.set(rnd() * 0.3 - 0.15, 0, rnd() * 0.3 - 0.15); g.add(p);
    mesh(new THREE.ConeGeometry(0.03, h, 4, 1, true), i % 3 ? moss : ochre, 0, h / 2, 0, p);
  }
  // ribboned stakes at the front arc
  [[-0.9, 1.95, 0.08], [0.0, 2.08, -0.05], [0.9, 1.95, 0.1]].forEach(([x, z, t], i) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.set(t, 0, -t); g.add(p);
    mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.58, 6, 1), wood, 0, 0.29, 0, p);
    mesh(new THREE.ConeGeometry(0.045, 0.08, 6, 1), wood, 0, 0.62, 0, p);
    mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 6, 1), i === 1 ? ochre : linen, 0, 0.5, 0, p);
    [[0.3, linen], [-0.4, ochre]].forEach(([ry, mt], j) => {
      const r = mesh(new THREE.PlaneGeometry(0.09, 0.38, 1, 2), mt, 0.05 * (j ? -1 : 1), 0.3, 0.06, p);
      r.rotation.set(0.25, ry, 0.12 * (j ? -1 : 1));
    });
  });
  // linen cord strung between the stakes
  [[-0.9, 1.95, 0.0, 2.08], [0.0, 2.08, 0.9, 1.95]].forEach(([x0, z0, x1, z1]) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const c = mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 4, 1), linen, (x0 + x1) / 2, 0.47, (z0 + z1) / 2);
    c.rotation.set(0, -Math.atan2(z1 - z0, x1 - x0), Math.PI / 2);
  });

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
