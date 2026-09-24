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
  // A: primitives. Bark trunk + four jagged stacked cones, dark below, lighter above.
  const bark = M(0x4a3322, 'timber'), pine = M(0x2f4f2c, 'foliage'), dark = M(0x223b22, 'foliage');
  const trunk = new THREE.CylinderGeometry(0.2, 0.36, 2.8, 6, 1);
  jitter(trunk, 0.03, 3, 0);
  mesh(trunk, bark, 0, 1.4, 0);
  // Saw-toothed rim: every other rim vertex is lifted and pulled in, so the tier reads as needle clumps.
  const tier = (r, h, k) => {
    const geo = new THREE.ConeGeometry(r, h, 12, 2);
    const p = geo.attributes.position, step = Math.PI * 2 / 12;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const rr = Math.hypot(x, z); if (rr < 1e-4) continue;
      const odd = Math.round(Math.atan2(z, x) / step + 20) % 2 === 1;
      const bottom = y < -h / 2 + 1e-4;
      if (bottom && odd) { p.setXYZ(i, x * 0.86, y + h * 0.07, z * 0.86); }
      else if (bottom) { p.setXYZ(i, x, y - h * 0.05, z); }
    }
    return jitter(geo, r * 0.035, k, h * 0.02);
  };
  const tiers = [[1.5, 2.6, 2.3, dark], [3.0, 2.4, 1.85, dark], [4.4, 2.2, 1.4, pine], [5.7, 2.3, 0.95, pine]];
  tiers.forEach(([y, h, r, mt], i) => {
    const t = mesh(tier(r, h, i + 1), mt, (rnd() - 0.5) * 0.14, y + h / 2, (rnd() - 0.5) * 0.14);
    t.rotation.y = rnd() * Math.PI;
    t.rotation.z = (rnd() - 0.5) * 0.07;
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
