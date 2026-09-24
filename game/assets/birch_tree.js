// Wind & Rain asset, built as code (no imports, no textures).
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9 }); m.name = name; return m; };
  const mesh = (geo, mat, x = 0, y = 0, z = 0, ry = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };
  // Birch B: pale trunk, a lighter upper crown and two darker lower blobs (squashed 8x6 spheres).
  const trunk = M(0xd8cdb0, 'plaster'), leaf = M(0x6a8a30, 'foliage'), leafD = M(0x56722a, 'foliage');
  const tr = mesh(new THREE.CylinderGeometry(0.11, 0.2, 4.8, 7, 1, true), trunk, 0, 2.4, 0);
  tr.rotation.z = 0.04;
  const blob = (r, mt, x, y, z, sy, ry) => { const b = mesh(new THREE.SphereGeometry(r, 8, 6), mt, x, y, z, ry); b.scale.set(1, sy, 1); };
  blob(1.4, leaf, 0.05, 5.5, 0.0, 0.8, 0);
  blob(1.1, leafD, -0.85, 4.35, 0.35, 0.75, 1);
  blob(1.05, leafD, 0.85, 4.2, -0.4, 0.75, 2);

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
