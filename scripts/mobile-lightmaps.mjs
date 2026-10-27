// Encode: BASISU=/path/to/basisu node scripts/mobile-lightmaps.mjs --encode
// Verify generated assets (also runs before production builds): node scripts/mobile-lightmaps.mjs
// Encoder: Basis Universal 1.16.3, e.g. the @gpu-tex-enc/basis@1.16.4 binary.
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { read } from 'three/addons/libs/ktx-parse.module.js'

const run = promisify(execFile)
const root = new URL('../public/gallery-baked-assets/', import.meta.url)
const settings = JSON.parse(await fs.readFile(new URL('scene.json', root)))
const target = new URL('maps-mobile/', root)
const manifestPath = new URL('mobile-lightmaps.json', root)
const encode = process.argv.includes('--encode')
const manifest = encode ? { encoding: 'UASTC-linear-RGBM', maps: {} }
  : JSON.parse(await fs.readFile(manifestPath))
let gpuBytes = 0, originalBytes = 0, downloadBytes = 0
if (encode) await fs.mkdir(target, { recursive: true })

for (const [key, info] of Object.entries(settings.lightmaps)) {
  const source = new URL('maps/' + info.file, root)
  const hash = crypto.createHash('sha256').update(await fs.readFile(source)).digest('hex')
  const file = info.file.replace(/\.png$/, `.${hash.slice(0, 12)}.ktx2`)
  if (encode) {
    // RGBM is linear DATA: alpha is radiance magnitude, never opacity. No
    // sRGB conversion, alpha removal, rescaling or lossy RDO postprocessing.
    await run(process.env.BASISU || 'basisu', [
      '-ktx2', '-uastc', '-uastc_level', '3', '-linear', '-force_alpha',
      '-mipmap', '-mip_filter', 'box', '-mip_clamp',
      '-file', source.pathname, '-output_file', new URL(file, target).pathname,
    ], { maxBuffer: 2 * 1024 * 1024 })
    manifest.maps[key] = { file, source: info.file, sourceSHA256: hash,
      width: info.width, height: info.height, range: info.range }
    console.log('Encoded mobile lightmap:', file)
  }
  const entry = manifest.maps[key]
  if (!entry || entry.sourceSHA256 !== hash || entry.range !== info.range) {
    throw Error(`Stale mobile lightmap ${key}; regenerate with --encode`)
  }
  const bytes = await fs.readFile(new URL(entry.file, target))
  const ktx = read(bytes)
  if (ktx.pixelWidth !== info.width || ktx.pixelHeight !== info.height ||
      ktx.dataFormatDescriptor[0].transferFunction !== 1 ||
      ktx.levels.length !== Math.floor(Math.log2(Math.max(info.width, info.height))) + 1) {
    throw Error('Wrong dimensions, colour transfer or mip chain: ' + key)
  }
  // UASTC/ASTC4x4/BC7/ETC2 RGBA: 16 bytes per 4×4 block, including alpha.
  for (let level = 0; level < ktx.levels.length; level++) {
    const w = Math.max(1, info.width >> level), h = Math.max(1, info.height >> level)
    gpuBytes += Math.ceil(w / 4) * Math.ceil(h / 4) * 16
    originalBytes += w * h * 4
  }
  downloadBytes += bytes.length
}
if (encode) {
  manifest.gpuBytes = gpuBytes
  manifest.originalRGBABytes = originalBytes
  manifest.downloadBytes = downloadBytes
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
}
console.log(`PASS: ${Object.keys(settings.lightmaps).length} full-resolution mobile lightmaps; GPU mips ${(originalBytes / 1048576).toFixed(1)} → ${(gpuBytes / 1048576).toFixed(1)} MiB; downloads ${(downloadBytes / 1048576).toFixed(1)} MiB`)
