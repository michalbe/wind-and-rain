// Wind & Rain asset, built as code (no imports, no textures).
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9 }); m.name = name; return m; };
  const mesh = (geo, mat, x = 0, y = 0, z = 0, ry = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };
  // Pine C: bark trunk and three lathed 6-sided tiers with a gently drooping, concave skirt
  // and a flat underside, so each tier reads as a solid bough mass with a clean edge.
  const bark = M(0x4a3322, 'timber'), up = M(0x2f5a3a, 'foliage'), low = M(0x1f3f2c, 'foliage');
  mesh(new THREE.CylinderGeometry(0.2, 0.34, 2.4, 6, 1, true), bark, 0, 1.2, 0);
  const tier = (r, h) => new THREE.LatheGeometry([
    new THREE.Vector2(0.001, h), new THREE.Vector2(r * 0.42, h * 0.52), new THREE.Vector2(r, 0.0),
    new THREE.Vector2(r * 0.86, -0.14), new THREE.Vector2(0.001, 0.12),
  ].reverse(), 6);
  [[1.6, 2.9, 2.35, low], [3.5, 2.6, 1.75, low], [5.1, 2.9, 1.15, up]]
    .forEach(([y, h, r, mt], i) => mesh(tier(r, h), mt, 0, y + 0.12, 0, i * 0.52));

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
