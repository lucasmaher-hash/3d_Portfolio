import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import { mergeDocuments, prune, unpartition } from '@gltf-transform/functions'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder})
const baseline = process.argv[2] || '/tmp/gallery-fixed-baseline.glb'
const exhibits = '/Users/lucasmaher/TEMP/glb-backups/gallery-final-02'
const approved = '/Users/lucasmaher/TEMP/glb-backups/gallery-floor-ceiling-approved/gallery.glb'
const doc = await io.read(baseline), scene = doc.getRoot().getDefaultScene()
const preserved = doc.getRoot().listNodes().filter(n => n.getExtras().galleryRole === 'wall').flatMap(n => n.getMesh().listPrimitives().map(p => p.getMaterial().getEmissiveTexture())).map(t => [t.getName(),crypto.createHash('sha256').update(t.getImage()).digest('hex')])
// Keep the repaired walls and rim strips; replace exhibits and both slabs independently.
for (const node of doc.getRoot().listNodes()) if (['project','podium','floor','ceiling'].includes(node.getExtras().galleryRole) || node.getName().startsWith('Ceiling ') || node.getName().startsWith('LED | podium')) node.dispose()
async function addSelected(source, select) {
  const mapping = mergeDocuments(doc, source)
  const retained = new Set()
  for (const node of source.getRoot().listNodes()) if(select(node)) {
    const copy = mapping.get(node); scene.addChild(copy); retained.add(copy)
  }
  for (const node of source.getRoot().listNodes()) if(!retained.has(mapping.get(node))) mapping.get(node).dispose()
  for (const s of source.getRoot().listScenes()) mapping.get(s).dispose()
  doc.getRoot().setDefaultScene(scene)
  return [...retained]
}
const products = await io.read(`${exhibits}/gallery.glb`)
// Replace only newly imported baked textures with their denoised versions.
for (const tex of products.getRoot().listTextures()) {
  const filename = `${exhibits}/denoised/${tex.getName()}.png`
  try { const image = await fs.readFile(filename); tex.setImage(await sharp(image).jpeg({quality:92,chromaSubsampling:'4:4:4'}).toBuffer()).setMimeType('image/jpeg') } catch {}
}
const added = await addSelected(products, n => ['project','podium'].includes(n.getExtras().galleryRole) || n.getName().startsWith('LED | podium'))
const floorSource = await io.read(approved)
for (const node of doc.getRoot().listNodes()) if(node.getExtras().galleryRole === 'floor') node.dispose()
const floorNodes = await addSelected(floorSource, n => ['floor','ceiling'].includes(n.getExtras().galleryRole) || n.getName().startsWith('Ceiling '))
const decode = v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4
const encode = v => v <= .0031308 ? 12.92*v : 1.055*v**(1/2.4)-.055
for (const node of floorNodes.filter(n => n.getExtras().galleryBakeLabel)) for(const p of node.getMesh().listPrimitives()) {
  const material = p.getMaterial(), tex = material.getEmissiveTexture()
  const raw = await sharp(tex.getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true})
  const sum = Float32Array.from(raw.data, v => decode(v/255)*.59)
  const label = node.getExtras().galleryBakeLabel
  const levels = [.41,.30,.25,.25,.25,.25]
  for(let i=0;i<6;i++) {
    const bytes = await sharp(`public/gallery-assets/lightmaps/light-${String(i+1).padStart(2,'0')}-${label}.jpg`).resize(raw.info.width,raw.info.height).removeAlpha().raw().toBuffer()
    for(let k=0;k<sum.length;k++) sum[k] += decode(bytes[k]/255)*levels[i]
  }
  const pixels = Buffer.from(Uint8Array.from(sum, v => Math.round(255*Math.min(1,encode(v*.56)))))
  tex.setImage(await sharp(pixels,{raw:{width:raw.info.width,height:raw.info.height,channels:3}}).png().toBuffer()).setMimeType('image/png')
  material.setRoughnessFactor(.3)
}
await doc.transform(unpartition(),prune())
// Original wall/ceiling image bytes must remain identical to the first gallery.
const current = new Set(doc.getRoot().listTextures().map(t => crypto.createHash('sha256').update(t.getImage()).digest('hex')))
const oldFloor = (await io.read(baseline)).getRoot().listNodes().find(n=>n.getExtras().galleryRole==='floor').getMesh().listPrimitives()[0].getMaterial().getEmissiveTexture().getName()
for(const [name,hash] of preserved) if(!current.has(hash)) throw Error(`Original texture changed: ${name}`)
await fs.writeFile('public/gallery-original-assets/gallery.glb',await io.writeBinary(doc))
console.log(JSON.stringify({added:added.map(n=>n.getName()),floor:floorNodes.map(n=>n.getName()),originalTexturesPreserved:true}))
