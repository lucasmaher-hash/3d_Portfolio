// Pulls the Cybercoffee egg out of the old 3D scene (public/current🟢.glb) into a small
// stand-alone GLB for the interactive machine on kaffeemaschine2d.html.
// Source: egg-rig_staging (the row behind the building), because there every part is its
// own node — egg-body, display-bezel, display-screen, logo-btn, logo-RLB, btn-L1..R3,
// chev-L1..R3 — so the page can press each button on its own. (The in-room egg-rig is
// the same geometry merged into one mesh.) World transforms are baked into the nodes;
// the page centres the egg itself. Run: node scripts/kaffeemaschine/export-egg.mjs
import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {clearNodeParent, prune, dedup} from '@gltf-transform/functions'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read('public/current🟢.glb')
const root = doc.getRoot(), scene = root.getDefaultScene()
const rig = root.listNodes().find(n => n.getName() === 'egg-rig_staging')
if (!rig) throw Error('egg-rig_staging not found')
const parts = rig.listChildren().filter(n => n.getMesh())
for (const p of parts) clearNodeParent(p)                 // keeps the world transform
for (const n of scene.listChildren()) scene.removeChild(n)
for (const p of parts) scene.addChild(p)
for (const n of root.listNodes()) if (!parts.includes(n)) n.dispose()   // everything else in the old scene
for (const s of root.listScenes()) if (s !== scene) s.dispose()
for (const a of root.listAnimations()) a.dispose()
await doc.transform(prune(), dedup())
await io.write('public/kaffeemaschine/egg.glb', doc)
console.log('egg.glb:', parts.map(p => p.getName()).join(', '))
