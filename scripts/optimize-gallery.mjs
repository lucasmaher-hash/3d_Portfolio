import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import { weld, quantize, dedup, prune } from '@gltf-transform/functions'
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
const document = await io.read(path.join(source, 'gallery.glb'))
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
await document.transform(weld(), quantize({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14 }), dedup(), prune())
document.createExtension(EXTMeshoptCompression).setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
const bytes = await io.writeBinary(document)
await fs.writeFile(new URL('gallery.glb', output), bytes)
await fs.copyFile(path.join(source, 'scene.json'), new URL('scene.json', output))
console.log(`Gallery: ${(bytes.length / 1e6).toFixed(1)} MB, denoised textures and meshopt geometry`)
