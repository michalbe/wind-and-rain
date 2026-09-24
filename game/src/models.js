/**
 * Turning generated asset modules into things the game can place.
 *
 *  - Characters and beasts are articulated assets (userData.joints). Loaded with the
 *    hierarchy, then collapsed into ONE SkinnedMesh whose bones are the asset's own joints.
 *    Every part is rigidly bound to its nearest joint, and material colours are carried as
 *    vertex colours, so a whole unit is one draw call (two if it glows or has iron) and every
 *    joint still moves. Team colour is swapped at the vertex-colour stage.
 *  - Buildings are merged by the loader, textured with the harness surfaces, and cloned from
 *    a per-team template (clones share geometry and materials, so they stay cheap).
 *  - Vegetation is instanced: one InstancedMesh per material of the prototype.
 */
import * as THREE from 'three';
import { ASSET } from '../assetlib.js';
import { TEAM_COLOR, TEAM_HEX_IN_ASSETS } from './config.js';

const url = (name) => `./assets/${name}.js`;

/* ------------------------------------------------------------------ articulated units */
const unitTemplates = new Map();   // `${asset}|${team}` -> Promise<template>

function isGlow(m) { return m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05 && (m.emissiveIntensity ?? 1) > 0; }
function isMetal(m) { return (m.metalness ?? 0) > 0.25; }

function boneList(inst) {
  const joints = inst.userData.joints || {};
  const list = [inst];
  const names = ['__root'];
  for (const [k, v] of Object.entries(joints)) if (v && v.isObject3D && !list.includes(v)) { list.push(v); names.push(k); }
  return { list, names, joints };
}

async function buildUnitTemplate(asset, team, height) {
  const inst = await ASSET(url(asset), { keepHierarchy: true, height });
  const root = new THREE.Group();
  root.add(inst);
  root.updateMatrixWorld(true);
  const { list } = boneList(inst);
  const boneIndex = new Map(list.map((b, i) => [b, i]));
  const teamCol = new THREE.Color(TEAM_COLOR[team]);
  const buckets = { main: [], metal: [], glow: [] };
  let glowMat = null;
  const c = new THREE.Color();
  inst.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    let p = o, bi = 0;
    while (p) { if (boneIndex.has(p)) { bi = boneIndex.get(p); break; } p = p.parent; }
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.morphAttributes = {}; g.clearGroups();
    const n = g.attributes.position.count;
    c.copy(m.color || new THREE.Color(0xffffff));
    if ((m.color?.getHex?.() ?? -1) === TEAM_HEX_IN_ASSETS) c.copy(teamCol);
    const col = new Float32Array(n * 3);
    const pa = g.attributes.position.array;
    for (let v = 0; v < n; v++) {
      // a painted wobble: +-7% value noise in object space, so flat parts read hand-painted
      const w = 1 + (Math.sin(pa[v * 3] * 7.1 + pa[v * 3 + 1] * 5.3) * Math.sin(pa[v * 3 + 2] * 6.7 - pa[v * 3 + 1] * 3.1)) * 0.07;
      col[v * 3] = c.r * w; col[v * 3 + 1] = c.g * w; col[v * 3 + 2] = c.b * w;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) { si[v * 4] = bi; sw[v * 4] = 1; }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    if (isGlow(m)) { buckets.glow.push(g); if (!glowMat) glowMat = m; }
    else if (isMetal(m)) buckets.metal.push(g);
    else buckets.main.push(g);
  });
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  const parts = [];
  const mk = (geos, mat) => { if (!geos.length) return; const g = mergeGeometries(geos, false); g.computeBoundingSphere(); g.boundingSphere.radius *= 1.35; parts.push({ geo: g, mat }); };
  mk(buckets.main, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }));
  mk(buckets.metal, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.55 }));
  if (glowMat) mk(buckets.glow, new THREE.MeshStandardMaterial({ vertexColors: true, emissive: glowMat.emissive.clone(), emissiveIntensity: Math.max(1.2, glowMat.emissiveIntensity || 1), roughness: 0.6 }));
  const size = new THREE.Box3().setFromObject(inst).getSize(new THREE.Vector3());
  return { asset, team, height, parts, size };
}

/**
 * makeUnitModel(asset, team, height) -> { root, joints, rest, meshes }
 * root is a Group you position; joints are the named joints; rest holds their rest pose.
 */
export async function makeUnitModel(asset, team, height) {
  const key = `${asset}|${team}|${height}`;
  if (!unitTemplates.has(key)) unitTemplates.set(key, buildUnitTemplate(asset, team, height));
  const tpl = await unitTemplates.get(key);
  const inst = await ASSET(url(asset), { keepHierarchy: true, height });
  const root = new THREE.Group();
  root.add(inst);
  // strip the per-part meshes; the skinned mesh replaces them
  const kill = [];
  inst.traverse((o) => { if (o.isMesh) kill.push(o); });
  for (const o of kill) o.parent.remove(o);
  root.updateMatrixWorld(true);
  const { list, joints } = boneList(inst);
  const inverses = list.map((b) => b.matrixWorld.clone().invert());
  const skeleton = new THREE.Skeleton(list, inverses);
  const meshes = [];
  for (const p of tpl.parts) {
    const sm = new THREE.SkinnedMesh(p.geo, p.mat);
    sm.bind(skeleton, new THREE.Matrix4());
    sm.boundingSphere = p.geo.boundingSphere.clone();
    sm.castShadow = false;   // units use blob shadows, the early-2000s way, and it keeps draws low
    sm.receiveShadow = true;
    root.add(sm);
    meshes.push(sm);
  }
  const rest = {};
  for (const [k, j] of Object.entries(joints)) if (j && j.isObject3D) rest[k] = { rot: j.rotation.clone(), pos: j.position.clone() };
  rest.__inst = { pos: inst.position.clone(), rot: inst.rotation.clone() };
  return { root, inst, joints, rest, meshes, size: tpl.size };
}

/* ------------------------------------------------------------------ buildings */
const buildingTemplates = new Map();
export async function makeBuildingModel(asset, team, surfSize = 256) {
  const key = `${asset}|${team}`;
  if (!buildingTemplates.has(key)) {
    buildingTemplates.set(key, (async () => {
      const g = await ASSET(url(asset), { surfaces: { size: surfSize } });
      const teamMats = new Map();
      g.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        if (m && m.color && m.color.getHex() === TEAM_HEX_IN_ASSETS && team !== 0) {
          if (!teamMats.has(m)) { const t = m.clone(); t.color.setHex(TEAM_COLOR[team]); teamMats.set(m, t); }
          o.material = teamMats.get(m);
        }
      });
      return g;
    })());
  }
  const tpl = await buildingTemplates.get(key);
  const g = tpl.clone(true);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/* ------------------------------------------------------------------ plain static props */
export async function makeProp(asset, surfSize = 256) {
  return ASSET(url(asset), { surfaces: { size: surfSize } });
}

/* ------------------------------------------------------------------ instanced vegetation */
/**
 * instanced(asset, placements[[x, z, scale, rotY]], heightAt, opts) -> { group, meshes, placements }
 * One InstancedMesh per material in the prototype.
 */
export async function instanced(asset, placements, heightAt, { shadow = true, surfSize = 256, surfaces = true, tile = 36, bright = 1 } = {}) {
  const proto = await ASSET(url(asset), surfaces ? { surfaces: { size: surfSize } } : {});
  proto.updateMatrixWorld(true);
  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const white = new THREE.Color(1, 1, 1);
  const parts = [];
  proto.traverse((o) => { if (o.isMesh) parts.push({ geo: o.geometry, mat: o.material, local: o.matrixWorld.clone() }); });
  // bucket placements into tiles
  const tiles = new Map();
  for (const pl of placements) { const k = Math.floor((pl[0] + 200) / tile) + ',' + Math.floor((pl[1] + 200) / tile); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(pl); }
  const chunks = [];
  for (const list of tiles.values()) {
    const meshes = [];
    for (const part of parts) {
      const im = new THREE.InstancedMesh(part.geo, part.mat, list.length);
      list.forEach(([x, z, sc, r], i) => {
        q.setFromAxisAngle(up, r); s.setScalar(sc); p.set(x, heightAt(x, z) - 0.05, z);
        m.compose(p, q, s).multiply(part.local);
        im.setMatrixAt(i, m); im.setColorAt(i, white);
      });
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = shadow; im.receiveShadow = true;
      im.computeBoundingSphere();
      group.add(im); meshes.push(im);
    }
    chunks.push({ meshes, placements: list });
  }
  return { group, chunks, placements };
}

/* ------------------------------------------------------------------ portraits */
/** Render a model to a small image once, for the selection panel. */
export function portrait(renderer, obj, { size = 112, yaw = 0.5, zoom = 1, focusY = 0.72 } = {}) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x4a3a28, 1.6));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.6); key.position.set(2, 3, 3); scene.add(key);
  const holder = new THREE.Group(); holder.add(obj); holder.rotation.y = yaw; scene.add(holder);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const sz = box.getSize(new THREE.Vector3());
  const h = Math.max(sz.y, sz.x * 0.8) / zoom;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  const cy = box.min.y + sz.y * focusY;
  cam.position.set(0, cy + h * 0.15, h * 1.9 + sz.z * 0.5);
  cam.lookAt(0, cy - h * 0.05, 0);
  const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const prevBg = scene.background; scene.background = new THREE.Color(0x221a12);
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  const px = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
  renderer.setRenderTarget(prevTarget);
  rt.dispose();
  scene.background = prevBg;
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
  ctx.putImageData(img, 0, 0);
  holder.remove(obj);
  return cv.toDataURL();
}
