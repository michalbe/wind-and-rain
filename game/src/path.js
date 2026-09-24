/** A* over the 90 x 90 grid, 8-connected, with line-of-sight smoothing. */
import { G, blocked, cellOf, cellCenter } from './terrain.js';

const gScore = new Float32Array(G * G);
const came = new Int32Array(G * G);
const stamp = new Uint32Array(G * G);
const closed = new Uint32Array(G * G);
let gen = 1;

class Heap {
  constructor() { this.k = []; this.p = []; }
  push(k, p) { const a = this.k, b = this.p; let i = a.length; a.push(k); b.push(p);
    while (i > 0) { const q = (i - 1) >> 1; if (b[q] <= p) break; a[i] = a[q]; b[i] = b[q]; i = q; } a[i] = k; b[i] = p; }
  pop() { const a = this.k, b = this.p; const top = a[0]; const lk = a.pop(), lp = b.pop();
    if (a.length) { let i = 0; const n = a.length;
      for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && b[c + 1] < b[c]) c++; if (b[c] >= lp) break; a[i] = a[c]; b[i] = b[c]; i = c; }
      a[i] = lk; b[i] = lp; }
    return top; }
  get size() { return this.k.length; }
}

/** nearest walkable cell to (i, j), spiralling out */
export function nearestFree(i, j, ignore = -1) {
  if (!blocked(i, j) || j * G + i === ignore) return [i, j];
  for (let r = 1; r < 14; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    if (!blocked(i + di, j + dj)) return [i + di, j + dj];
  }
  return [i, j];
}

export function lineFree(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az);
  const n = Math.ceil(d / 0.8);
  for (let s = 1; s < n; s++) {
    const t = s / n;
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    const [i, j] = cellOf(x, z);
    if (blocked(i, j)) return false;
    // keep diagonal squeezes honest: check the corner cells too
    const [i2, j2] = cellOf(x + 0.55, z + 0.55), [i3, j3] = cellOf(x - 0.55, z - 0.55);
    if (blocked(i2, j2) || blocked(i3, j3)) return false;
  }
  return true;
}

/**
 * findPath(sx, sz, tx, tz) -> [[x, z], ...] ending at (tx, tz) or the nearest reachable point.
 * `limit` caps expansions so one bad request cannot stall a frame.
 */
export function findPath(sx, sz, tx, tz, limit = 9000) {
  if (lineFree(sx, sz, tx, tz)) return [[tx, tz]];
  gen++;
  let [si, sj] = cellOf(sx, sz); [si, sj] = nearestFree(si, sj);
  let [ti, tj] = cellOf(tx, tz);
  const targetBlocked = blocked(ti, tj);
  if (targetBlocked) [ti, tj] = nearestFree(ti, tj);
  const start = sj * G + si, goal = tj * G + ti;
  const heap = new Heap();
  stamp[start] = gen; gScore[start] = 0; came[start] = -1;
  const h = (i, j) => { const dx = Math.abs(i - ti), dy = Math.abs(j - tj); return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy); };
  heap.push(start, h(si, sj));
  let best = start, bestH = h(si, sj), n = 0;
  while (heap.size && n++ < limit) {
    const cur = heap.pop();
    if (closed[cur] === gen) continue;
    closed[cur] = gen;
    if (cur === goal) { best = cur; break; }
    const ci = cur % G, cj = (cur / G) | 0;
    const hh = h(ci, cj); if (hh < bestH) { bestH = hh; best = cur; }
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (blocked(ni, nj)) continue;
      if (di && dj && (blocked(ci + di, cj) || blocked(ci, cj + dj))) continue;
      const nk = nj * G + ni;
      if (closed[nk] === gen) continue;
      const g = gScore[cur] + (di && dj ? 1.4142 : 1);
      if (stamp[nk] !== gen || g < gScore[nk]) {
        stamp[nk] = gen; gScore[nk] = g; came[nk] = cur;
        heap.push(nk, g + h(ni, nj));
      }
    }
  }
  const cells = [];
  for (let c = best; c !== -1; c = came[c]) cells.push(c);
  cells.reverse();
  const pts = cells.map((c) => cellCenter(c % G, (c / G) | 0));
  if (best === goal && !targetBlocked) pts[pts.length - 1] = [tx, tz];
  // string-pull
  const out = [];
  let ax = sx, az = sz, k = 0;
  while (k < pts.length) {
    let far = k;
    for (let m = pts.length - 1; m > k; m--) if (lineFree(ax, az, pts[m][0], pts[m][1])) { far = m; break; }
    out.push(pts[far]);
    ax = pts[far][0]; az = pts[far][1];
    k = far + 1;
  }
  return out.length ? out : [[tx, tz]];
}
