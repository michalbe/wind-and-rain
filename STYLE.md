# Wind & Rain — the locked style

> Chunky, hand-made early-2000s RTS models of a mythological early-medieval Slavic world: few, bold
> parts with low segment counts (6–10 radial), oversized heads, hands, weapons and timber beams,
> steep dominant thatch roofs, slightly uneven and hand-cut, smooth shading with flat per-part
> colours (surfaces are applied at load time), readable in silhouette from a high RTS camera.

## Palette (use these exact hex values; name materials after a surfaces recipe where given)

| role | hex | material name | where it belongs |
|---|---|---|---|
| TEAM CLOTH | `0xc0282d` | `fabric` | **the one team colour**: sashes, shield faces, banners, hoods, cloth strips. Use this exact hex for team-coloured parts and for nothing else. The game swaps it per clan. |
| timber light | `0xa27a4f` | `timber` | logs, planks, handles, bows |
| timber dark | `0x5e4029` | `timber` | oversized beams, posts, carved poles, idols |
| thatch | `0x8a6a3a` | `fabric` | roofs (the dominant silhouette of every building) |
| thatch shade | `0x5a4424` | `fabric` | alternate roof courses, ridge bundles, eaves |
| daub | `0xd8cdb0` | `plaster` | wattle-and-daub wall infill |
| stone | `0x8d8a80` | `stone` | foundations, basins, standing stones |
| stone dark | `0x5f5d57` | `stone` | shadowed stones, cairns |
| linen | `0xe6dcc3` | `fabric` | priestess dresses, shirts, ribbons |
| ochre | `0xc98a2b` | `fabric` | embroidery bands, belts, trims |
| skin | `0xd9a07a` | — | faces, hands |
| hair dark | `0x3b2618` | — | hair, beards |
| hair blond | `0xc7a060` | — | long braids (Vietra) |
| iron | `0x6f7479` | `metal` (metalness 0.5) | axe heads, helmets, spear tips, bosses |
| leather | `0x6b4526` | `fabric` | boots, belts, quivers, saddles |
| fur brown | `0x5a3b22` | `fabric` | bear, fur caps, cloaks |
| deer hide | `0x9a6a3e` | `fabric` | deer body |
| antler / bone | `0xe0cfa8` | — | antlers, bones, skulls |
| pine | `0x2f4f2c` | `foliage` | pine needle tiers |
| pine dark | `0x223b22` | `foliage` | lower tiers, shadow side |
| bark | `0x4a3322` | `timber` | trunks |
| moss | `0x6f8f3a` | `foliage` | moss, spirit overgrowth |
| water | `0x4f8fb0` | — (roughness 0.15) | spring pools, basin water |
| spirit glow | `0x9ff0c8` | — emissive same hex, emissiveIntensity 1.5 | Forest Spirit eyes, sacred glow |

Keep each asset to **at most 7 distinct materials** (draw calls are one per material).

## Fixed decisions

- Metres. Base at y = 0, centred on x and z, **front faces +Z**.
- Exaggerated RTS proportions: head about 1/5 of body height, hands and weapons ~1.5× real.
- Heights: Vietra 1.75 m (to top of staff 2.1), Zherca 1.8 m, Streletz 1.8 m, Vitez 2.1 m (bulky,
  1.2 m shoulder width with shield), Deer Rider 3.0 m to rider's head (deer is oversized, 2.2 m at
  withers + antlers), Bear 1.7 m at shoulder, 2.8 m long, Forest Spirit 5 m.
- Buildings (footprint width × depth, height): Grod 11 × 11 m, 9 m; Khata 5 × 5 m, 5 m; War Hall
  9 × 7 m, 7 m; Rain Shrine 5 × 5 m, 4.5 m; Sacred Grove 9 × 9 m, 7 m.
- Pine tree 8 m. Sacred spring 4 m across, 0.6 m. Landmark 8 m.
- Triangle budgets: characters ≤ 1,800, beasts ≤ 2,500, buildings ≤ 6,000, trees ≤ 300,
  rocks ≤ 200.
- **No glyphs or text anywhere.** Carvings are geometry (notches, rings, stacked faces).
- Smooth shading (default). No textures, no vertex colours, no files, no imports.
- Material names from the contract list only: plaster | stone | timber | tile | metal | fabric | foliage | ground.

## Articulation (anything that animates)

Joints are empty `Object3D`s placed AT the anatomical joint; the geometry is an offset child.
Declare on the root group `g.userData.joints = { ... }` with exactly these names:

- **Humanoid** (Vietra, Zherca, Streletz, Vitez, Forest Spirit, and the deer's rider):
  `hips, spine, head, lShoulder, lElbow, rShoulder, rElbow, lHip, lKnee, rHip, rKnee`.
  Hierarchy: hips → spine → (head, lShoulder → lElbow, rShoulder → rElbow); hips → lHip → lKnee,
  hips → rHip → rKnee. Held items (staff, bow, axe, vessel) are children of the elbow joint of the
  hand holding them. Skirts/cloaks attach to hips or spine.
  Character faces +Z; character's LEFT is +X.
- **Quadruped** (Bear, the Deer): `body, neck, head, flLeg, frLeg, blLeg, brLeg`
  (+ `flKnee, frKnee, blKnee, brKnee` optional). The Deer Rider asset contains both: the deer
  joints as above plus rider joints prefixed `r_` (`r_hips, r_spine, r_head, r_lShoulder,
  r_lElbow, r_rShoulder, r_rElbow`), rider parented to the deer's `body`.
