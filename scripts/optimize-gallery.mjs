import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import { weld, quantize, dedup, prune, mergeDocuments, unpartition } from '@gltf-transform/functions'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

const source = process.argv[2]
if (!source) throw new Error('Pass the gallery bake directory')
const output = new URL('../public/gallery-assets/', import.meta.url)
await fs.mkdir(output, { recursive: true })
await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
})
const wallsOnly = process.argv.includes('--walls-only')
let document = await io.read(path.join(source, 'gallery.glb'))
if (wallsOnly) {
  const incoming = document
  document = await io.read(new URL('gallery.glb', output).pathname)
  const baseScene = document.getRoot().getDefaultScene()
  const existing = new Map(document.getRoot().listNodes().map(node => [node.getName(), node]))
  const copied = mergeDocuments(document, incoming)
  let replaced = 0
  for (const node of incoming.getRoot().listNodes()) {
    if (!['wall', 'podium'].includes(node.getExtras().galleryRole)) continue
    const target = existing.get(node.getName()), updated = copied.get(node)
    if (!target || !updated.getMesh()) continue
    target.setMesh(updated.getMesh()).setTranslation(updated.getTranslation()).setRotation(updated.getRotation()).setScale(updated.getScale()).setExtras(updated.getExtras())
    replaced++
  }
  for (const node of incoming.getRoot().listNodes()) copied.get(node).dispose()
  for (const scene of incoming.getRoot().listScenes()) copied.get(scene).dispose()
  document.getRoot().setDefaultScene(baseScene)
  if (replaced !== 7) throw new Error(`Expected seven plaster surfaces, got ${replaced}`)
  console.log('Replaced only walls/podiums; floor, ceiling, lights and exhibits retained')
}
// Background source files may contain independent sample scenes. Package only
// the default gallery scene, including when reading an older raw export.
const root = document.getRoot()
const activeScene = root.getDefaultScene() || root.listScenes()[0]
const activeNodes = new Set()
function retain(node) { activeNodes.add(node); for (const child of node.listChildren()) retain(child) }
for (const child of activeScene.listChildren()) retain(child)
for (const node of root.listNodes()) if (!activeNodes.has(node)) node.dispose()
for (const scene of root.listScenes()) if (scene !== activeScene) scene.dispose()
for (const texture of root.listTextures()) {
  const denoised = path.join(source, 'denoised', texture.getName() + '.png')
  // Imported product textures retain their original UVs, alpha and materials.
  try { await fs.access(denoised) } catch { continue }
  const input = await fs.readFile(denoised)
  const bytes = await sharp(input).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer()
  texture.setImage(bytes).setMimeType('image/jpeg')
}
// Sub-millimetre position precision over the ~50 m plan, retaining the small
// grooves while reducing the cost of the dense curved architecture.
await document.transform(unpartition(), weld(), quantize({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }), dedup(), prune())
document.createExtension(EXTMeshoptCompression).setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
const bytes = await io.writeBinary(document)
await fs.writeFile(new URL('gallery.glb', output), bytes)
if (!wallsOnly) await fs.copyFile(path.join(source, 'scene.json'), new URL('scene.json', output))
else {
  const settings = JSON.parse(await fs.readFile(new URL('scene.json', output)))
  Object.assign(settings, { exposure: .56, ambientLevel: .59, defaultLightLevels: [.41,.30,.25,.25,.25,.25], wallFill: 65, wallLightingVersion: 3 })
  await fs.writeFile(new URL('scene.json', output), JSON.stringify(settings, null, 2))
}
const basisDir = new URL('lightmaps/', output)
await fs.mkdir(basisDir, { recursive: true })
let basisCount = 0
for (const filename of await fs.readdir(path.join(source, 'denoised'))) {
  if (!/^light-\d{2}-.+\.png$/.test(filename)) continue
  const bytes = await sharp(path.join(source, 'denoised', filename)).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer()
  await fs.writeFile(new URL(filename.replace(/\.png$/, '.jpg'), basisDir), bytes)
  basisCount++
}
console.log(`Independent lightmaps: ${basisCount}`)
console.log(`Gallery: ${(bytes.length / 1e6).toFixed(1)} MB, denoised textures and meshopt geometry`)
