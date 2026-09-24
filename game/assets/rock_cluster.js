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
  // B: low-segment spheres (6x5) squashed and jittered, a mossless heap of rounded chunks.
  const stone = M(0x8d8a80, 'stone', { flatShading: true }), dk = M(0x5f5d57, 'stone', { flatShading: true });
  const rock = (r, x, y, z, sx, sy, sz, mt, k) => {
    const s = mesh(jitter(new THREE.SphereGeometry(r, 6, 5), r * 0.18, k, r * 0.1), mt, x, y, z);
    s.scale.set(sx, sy, sz); s.rotation.set(0, k * 1.1, (k - 2) * 0.12);
  };
  rock(0.75, -0.2, 0.58, 0.0, 1.1, 0.85, 1.0, stone, 1);
  rock(0.55, 0.7, 0.38, -0.25, 1.05, 0.72, 1.0, dk, 2);
  rock(0.48, -0.5, 0.32, 0.72, 1.15, 0.68, 1.0, dk, 3);
  rock(0.34, 0.45, 0.24, 0.6, 1.0, 0.72, 1.1, stone, 4);
  wrap(1.08, 0.92, 1.2);

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
