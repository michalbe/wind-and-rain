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
  // C: a different reading. A rough octagonal column that swells into one great four-faced head
  // under a tall round cap; heavy brows overhang glowing eye pockets; three rings of carved
  // bands; an octagonal stepped plinth; a broken ring of leaning menhirs.
  const stone = M(0x8d8a80, 'stone'), dk = M(0x5f5d57, 'stone'), moss = M(0x6f8f3a, 'foliage');
  const glow = M(0x9ff0c8, null, { emissive: 0x9ff0c8, emissiveIntensity: 1.5, roughness: 0.6 });
  const oct = (rt, rb, h, mt, y, j = 0, k = 1) => {
    const geo = new THREE.CylinderGeometry(rt, rb, h, 8, 1);
    if (j) jitter(geo, j, k, j * 0.3);
    const c = mesh(geo, mt, 0, y + h / 2, 0); c.rotation.y = Math.PI / 8; return c;
  };
  oct(2.6, 2.8, 0.45, dk, 0, 0.07, 1);
  oct(2.0, 2.15, 0.45, stone, 0.45, 0.05, 2);
  oct(1.4, 1.5, 0.4, dk, 0.9, 0.04, 3);
  // column and head
  oct(0.78, 0.9, 3.5, stone, 1.3, 0.03, 4);
  oct(0.95, 0.78, 0.35, stone, 4.8, 0, 5);                 // swell up to the head
  oct(0.95, 0.95, 1.35, stone, 5.15, 0, 6);                // the head block
  // bands
  [2.0, 3.2, 4.45].forEach((y, i) => oct(0.9 - i * 0.03, 0.9 - i * 0.03, 0.14, dk, y));
  const nz = 0.95 * Math.cos(Math.PI / 8);                  // distance to an octagon face
  // cap: brim, tall drum, rounded crown
  mesh(new THREE.CylinderGeometry(1.25, 1.22, 0.18, 14, 1), dk, 0, 6.59, 0);
  mesh(new THREE.CylinderGeometry(0.97, 1.02, 0.6, 14, 1), stone, 0, 6.98, 0);
  const crown = mesh(new THREE.SphereGeometry(0.97, 14, 5, 0, Math.PI * 2, 0, Math.PI / 2), stone, 0, 7.27, 0);
  crown.scale.y = 0.7;
  const B = (w, h, d, mt, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), mt, x, y, z, p);
  for (let k = 0; k < 4; k++) {
    const f = new THREE.Group(); f.rotation.y = k * Math.PI / 2; g.add(f);
    const z = nz;
    // brow: one heavy overhanging bar, notched in the middle
    const bl = B(0.4, 0.17, 0.26, stone, -0.2, 6.22, z + 0.1, f); bl.rotation.z = -0.1;
    const br = B(0.4, 0.17, 0.26, stone, 0.2, 6.22, z + 0.1, f); br.rotation.z = 0.1;
    // eye pockets: glowing back, dark side walls
    B(0.26, 0.14, 0.03, glow, -0.2, 6.03, z + 0.01, f);
    B(0.26, 0.14, 0.03, glow, 0.2, 6.03, z + 0.01, f);
    B(0.05, 0.14, 0.14, dk, -0.34, 6.03, z + 0.05, f);
    B(0.05, 0.14, 0.14, dk, 0.34, 6.03, z + 0.05, f);
    // nose wedge, cheekbones, drooping moustache, mouth, chin
    const n = B(0.16, 0.5, 0.2, stone, 0, 5.84, z + 0.08, f); n.rotation.x = -0.2;
    B(0.28, 0.1, 0.13, stone, -0.24, 5.9, z + 0.05, f);
    B(0.28, 0.1, 0.13, stone, 0.24, 5.9, z + 0.05, f);
    const ml = B(0.3, 0.08, 0.1, stone, -0.15, 5.54, z + 0.05, f); ml.rotation.z = 0.35;
    const mr = B(0.3, 0.08, 0.1, stone, 0.15, 5.54, z + 0.05, f); mr.rotation.z = -0.35;
    B(0.24, 0.05, 0.03, dk, 0, 5.46, z + 0.005, f);
    B(0.34, 0.12, 0.08, stone, 0, 5.33, z + 0.03, f);
    // relief figures on the column: small face and hands between the bands
    const zc = 0.84 * Math.cos(Math.PI / 8);
    B(0.4, 0.08, 0.1, stone, 0, 4.05, zc + 0.03, f);
    B(0.1, 0.06, 0.03, dk, -0.1, 3.95, zc + 0.005, f);
    B(0.1, 0.06, 0.03, dk, 0.1, 3.95, zc + 0.005, f);
    B(0.08, 0.22, 0.08, stone, 0, 3.86, zc + 0.03, f);
    B(0.12, 0.5, 0.08, stone, -0.3, 3.6, zc + 0.03, f);
    B(0.12, 0.5, 0.08, stone, 0.3, 3.6, zc + 0.03, f);
    B(0.1, 0.04, 0.03, dk, -0.3, 2.6, zc + 0.02, f);
    B(0.1, 0.04, 0.03, dk, 0.3, 2.6, zc + 0.02, f);
    B(0.08, 0.5, 0.06, dk, 0, 2.55, zc + 0.03, f);
  }
  // menhirs, one fallen
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2, R = 4.2 + rnd() * 0.3;
    const fallen = i === 5, h = fallen ? 1.3 : 1.1 + rnd() * 0.8;
    const geo = jitter(new THREE.CylinderGeometry(0.2 + rnd() * 0.05, 0.3, h, 5, 1), 0.05, i + 9);
    const s = mesh(geo, i % 3 ? stone : dk, Math.cos(a) * R, fallen ? 0.22 : h / 2 - 0.04, Math.sin(a) * R);
    if (fallen) s.rotation.set(0, -a, Math.PI / 2 - 0.05); else s.rotation.set((rnd() - 0.5) * 0.25, rnd() * 3, (rnd() - 0.5) * 0.25);
    if (i % 2 === 1 && !fallen) { const c = mesh(new THREE.SphereGeometry(0.26, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), moss, Math.cos(a) * R, h - 0.1, Math.sin(a) * R); c.scale.set(1, 0.4, 1); }
  }
  [[1.9, 0.45, 1.3], [-1.6, 0.45, -1.7], [-0.9, 0.9, 1.25]].forEach(([x, y, z], i) => {
    const c = mesh(jitter(new THREE.SphereGeometry(0.45, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0.05, i + 40), moss, x, y - 0.02, z);
    c.scale.set(1.3, 0.3, 0.9);
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
