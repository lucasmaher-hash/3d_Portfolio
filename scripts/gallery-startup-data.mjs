// Capture exact derived buffers: PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node scripts/gallery-startup-data.mjs --generate
// Normal builds only verify freshness; no browser dependency is needed on CI.
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
const root = new URL('../', import.meta.url)
const source = await fs.readFile(new URL('src/main.js', root), 'utf8')
const settings = JSON.parse(await fs.readFile(new URL('public/gallery-baked-assets/scene.json', root)))
const hash = data => crypto.createHash('sha256').update(data).digest('hex')
const inputs = {}
for (const name of ['gallery.glb', 'scene.json', 'wall-seams.json',
  ...Object.entries(settings.lightmaps).filter(([key]) => key.startsWith('podium-')).map(([, info]) => 'maps/' + info.file)]) {
  inputs[name] = hash(await fs.readFile(new URL('public/gallery-baked-assets/' + name, root)))
}
inputs.calculation = hash(source.slice(source.indexOf('const PODIUM_CAP_R'), source.indexOf('function updateHelpIcons')))
const manifestPath = new URL('src/gallery/startup-data.json', root)
if (process.argv.includes('--generate')) {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core')
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  let snapshot
  try {
    const context = await browser.newContext()
    await context.addInitScript(() => {
      sessionStorage.setItem('_enter3d', '1')
      sessionStorage.setItem('defaultBakedGalleryIntroSeen', '1')
    })
    const page = await context.newPage()
    await page.goto((process.env.BASE_URL || 'http://localhost:5174') + '/?perf&startup=off')
    await page.waitForFunction(() => window._gallery?.ready, { timeout: 120000 })
    snapshot = await page.evaluate(() => {
      const caps = {}, seams = {}
      const encode = array => {
        const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
        let binary = ''
        for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768))
        return btoa(binary)
      }
      _gallery.model.traverse(mesh => {
        if (!mesh.isMesh) return
        const label = mesh.userData.galleryBakeLabel
        for (const material of [mesh.material].flat()) {
          const field = __perf.renderer.properties.get(material).uniforms?.uCapField?.value
          if (field) caps[label] = { data: encode(field.image.data), width: field.image.width, height: field.image.height }
        }
        const seam = mesh.geometry.getAttribute('gallerySeamD')
        if (seam) seams[mesh.name] = { data: encode(seam.array), count: seam.count }
      })
      return { caps, seams }
    })
  } finally { await browser.close() }
  if (Object.keys(snapshot.caps).length !== 7 || Object.keys(snapshot.seams).length !== 2) throw Error('Incomplete startup capture')
  const buffers = [], manifest = { inputs, caps: {}, seams: {} }
  let offset = 0
  for (const kind of ['caps', 'seams']) for (const [key, entry] of Object.entries(snapshot[kind])) {
    const bytes = Buffer.from(entry.data, 'base64')
    const { data, ...info } = entry
    manifest[kind][key] = { ...info, offset, length: bytes.length, sha256: hash(bytes) }
    buffers.push(bytes); offset += bytes.length
  }
  const bytes = Buffer.concat(buffers)
  manifest.file = `startup-data.${hash(bytes).slice(0, 12)}.bin`
  manifest.sha256 = hash(bytes)
  await fs.writeFile(new URL('public/gallery-baked-assets/' + manifest.file, root), bytes)
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
}
const manifest = JSON.parse(await fs.readFile(manifestPath))
if (JSON.stringify(manifest.inputs) !== JSON.stringify(inputs)) throw Error('Startup data is stale; regenerate with --generate')
const bytes = await fs.readFile(new URL('public/gallery-baked-assets/' + manifest.file, root))
if (hash(bytes) !== manifest.sha256) throw Error('Startup data hash mismatch')
console.log(`PASS: seven exact podium fields and two wall seam buffers; ${(bytes.length / 1024).toFixed(0)} KiB, source hashes verified`)
