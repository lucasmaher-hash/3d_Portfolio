// Replaces the baked Cybercoffee egg and Virtual Cooking panel in the fourth gallery
// with the untouched meshes + materials from the old coloured-rooms scene
// (public/current🟢.glb). Both are polished metal: a diffuse bake reads wrong on them,
// so they render with their native PBR materials and the gallery's local reflection
// probes, like the preserved bottle. Run AFTER scripts/package-gallery-baked.mjs
// (that packager rebuilds gallery.glb with the baked versions).
//
// Placement: the gallery copies are the same meshes (same triangle counts), only
// re-quantized. Each old mesh is fitted onto its gallery copy by a uniform scale +
// translation in mesh space (checked per axis and against every vertex), then given
// the gallery node's transform, so it sits exactly where the baked one stood.
import {NodeIO,getBounds} from '@gltf-transform/core'
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions'
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer'
import {prune,unpartition,mergeDocuments} from '@gltf-transform/functions'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'

const galleryPath='public/gallery-baked-assets/gallery.glb'
const scenePath='public/gallery-baked-assets/scene.json'
const oldPath='public/current🟢.glb'
const SWAPS=['egg-rig','Pivot_VRPanel']
// The old site's MATERIAL_FIXUPS for these two (src/main.js): full metal, polished,
// light silver tint and a small emissive floor. Written into the GLB so the gallery
// shows the same material the old scene did.
const SILVER={metal:1,rough:.14,color:0xc9ced8,emissive:0x353b47}
const SILVER_NAMES=new Set(['M_Silver_Egg','M_Silver_Panel'])

await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready])
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder})
const doc=await io.read(galleryPath)
const old=await io.read(oldPath)
const scene=doc.getRoot().getDefaultScene()
// Column-major 4x4 multiply (glTF layout).
const mul=(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
const byName=(d,n)=>d.getRoot().listNodes().find(x=>x.getName()===n)
const lin=c=>{const s=c/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4}
const hexLin=h=>[lin(h>>16&255),lin(h>>8&255),lin(h&255)]

// Mesh-space positions, dequantized (gallery is normalized ints, old is float).
function positions(mesh) {
  const out=[]
  for(const p of mesh.listPrimitives()){const a=p.getAttribute('POSITION');for(let i=0;i<a.getCount();i++)out.push(a.getElement(i,[]))}
  return out
}
function box(pts){const mn=[1/0,1/0,1/0],mx=[-1/0,-1/0,-1/0];for(const p of pts)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k])}return {mn,mx}}

const before=JSON.stringify(doc.getRoot().listNodes().filter(n=>/_Podest$/.test(n.getName())).map(n=>[n.getName(),n.getWorldMatrix()]))
const fits=new Map()
for(const name of SWAPS) {
  const g=byName(doc,name),o=byName(old,name)
  assert(g?.getMesh()&&o?.getMesh(),`Missing ${name}`)
  assert.equal(g.getExtras().galleryRole,'project',`${name} is not a gallery project node`)
  const gp=positions(g.getMesh()),op=positions(o.getMesh())
  const gb=box(gp),ob=box(op)
  const s=[0,1,2].map(k=>(gb.mx[k]-gb.mn[k])/(ob.mx[k]-ob.mn[k]))
  assert(Math.max(...s)/Math.min(...s)<1.002,`${name}: non-uniform fit ${s}`)
  const scale=(s[0]+s[1]+s[2])/3,t=[0,1,2].map(k=>gb.mn[k]-scale*ob.mn[k])
  // Every old vertex must land on a gallery vertex (quantization tolerance).
  const grid=new Map(),cell=(gb.mx[0]-gb.mn[0])/64,key=p=>p.map(v=>Math.floor(v/cell)).join()
  for(const p of gp){const k=key(p);(grid.get(k)??grid.set(k,[]).get(k)).push(p)}
  let worst=0
  for(const p of op){
    const q=p.map((v,k)=>v*scale+t[k]),c=q.map(v=>Math.floor(v/cell));let best=1/0
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const r of grid.get([c[0]+x,c[1]+y,c[2]+z].join())??[])best=Math.min(best,Math.hypot(r[0]-q[0],r[1]-q[1],r[2]-q[2]))
    worst=Math.max(worst,best)
  }
  const worstWorld=worst*g.getScale()[0]
  assert(worstWorld<.002,`${name}: old mesh does not match gallery mesh (worst ${worstWorld} m)`)
  const fit=[scale,0,0,0, 0,scale,0,0, 0,0,scale,0, t[0],t[1],t[2],1]
  fits.set(name,{matrix:mul(g.getWorldMatrix(),fit),extras:g.getExtras(),bounds:getBounds(g),worstWorld})
}

const mapping=mergeDocuments(doc,old)
for(const s of old.getRoot().listScenes())mapping.get(s).dispose()
for(const node of old.getRoot().listNodes()) {
  const copy=mapping.get(node)
  if(!SWAPS.includes(node.getName())){copy.dispose();continue}
  const fit=fits.get(node.getName())
  const {galleryBakeLabel,galleryBaked,galleryBakeUV,...extras}=fit.extras
  copy.setMatrix(fit.matrix).setExtras({...extras,galleryOldSceneAsset:true})
  for(const c of copy.listChildren())copy.removeChild(c)
  byName(doc,node.getName()).dispose()   // baked gallery copy; the merged copy keeps the name
  scene.addChild(copy)
  for(const p of copy.getMesh().listPrimitives()){
    const m=p.getMaterial()
    if(!SILVER_NAMES.has(m.getName()))continue
    m.setMetallicFactor(SILVER.metal).setRoughnessFactor(SILVER.rough)
     .setBaseColorFactor([...hexLin(SILVER.color),1]).setEmissiveFactor(hexLin(SILVER.emissive))
  }
}
doc.getRoot().setDefaultScene(scene)
await doc.transform(unpartition(),prune({keepAttributes:true,keepSolidTextures:true}))
if(!doc.getRoot().listExtensionsUsed().some(e=>e.extensionName===EXTMeshoptCompression.EXTENSION_NAME))
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE})
const bytes=await io.writeBinary(doc)
const check=await io.readBinary(bytes)
assert.equal(JSON.stringify(check.getRoot().listNodes().filter(n=>/_Podest$/.test(n.getName())).map(n=>[n.getName(),n.getWorldMatrix()])),before,'Bottle moved')
for(const name of SWAPS){
  const n=byName(check,name),b=getBounds(n),f=fits.get(name).bounds
  const off=Math.max(...[0,1,2].flatMap(k=>[Math.abs(b.min[k]-f.min[k]),Math.abs(b.max[k]-f.max[k])]))
  assert(off<.002,`${name}: placement off by ${off}`)
  console.log(`${name}: old asset placed, bbox within ${(off*1000).toFixed(2)} mm, worst vertex ${(fits.get(name).worstWorld*1000).toFixed(2)} mm`)
}
await fs.writeFile(galleryPath,bytes)
const settings=JSON.parse(await fs.readFile(scenePath))
for(const label of ['egg-rig','pivot-vrpanel'])delete settings.lightmaps[label]
settings.oldSceneExhibits=SWAPS
await fs.writeFile(scenePath,JSON.stringify(settings,null,2))
for(const file of ['egg-rig.png','pivot-vrpanel.png'])await fs.rm(`public/gallery-baked-assets/maps/${file}`,{force:true})
console.log(`PASS: gallery.glb ${(bytes.byteLength/1e6).toFixed(1)} MB with the old egg + VR panel`)
