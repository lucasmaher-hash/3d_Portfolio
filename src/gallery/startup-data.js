import manifest from './startup-data.json'

// These are the exact Float32 results of the original podium/seam calculations,
// captured by scripts/gallery-startup-data.mjs and checked against their sources.
export async function loadStartupData() {
  if (new URLSearchParams(location.search).get('startup') === 'off') return null
  try {
    const response = await fetch('/gallery-baked-assets/' + manifest.file)
    if (!response.ok) throw Error('Startup data unavailable')
    const buffer = await response.arrayBuffer()
    const result = { caps: {}, seams: {} }
    for (const kind of ['caps', 'seams']) for (const [key, entry] of Object.entries(manifest[kind])) {
      result[kind][key] = new Float32Array(buffer, entry.offset, entry.length / 4)
    }
    return result
  } catch (error) {
    console.warn('Startup data fallback:', error)
    return null
  }
}
