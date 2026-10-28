import { LoadingManager } from 'three'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import transcoderJS from 'three/examples/jsm/libs/basis/basis_transcoder.js?url'
import transcoderWASM from 'three/examples/jsm/libs/basis/basis_transcoder.wasm?url'

// Imported for supported GPUs on desktop and mobile. Vite versions the decoder
// assets with the installed Three release; no external CDN or copied binaries.
export async function compressedLightmapLoader(renderer) {
  const quality = new URLSearchParams(location.search).get('textures')
  if (quality === 'original') return null
  const manager = new LoadingManager()
  manager.setURLModifier(url => url === 'basis_transcoder.js' ? transcoderJS
    : url === 'basis_transcoder.wasm' ? transcoderWASM : url)
  const loader = new KTX2Loader(manager).setWorkerLimit(2).detectSupport(renderer)
  const support = loader.workerConfig
  if (!(support.astcSupported || support.bptcSupported || support.etc2Supported || support.dxtSupported)) return null
  const response = await fetch('/gallery-baked-assets/' + (quality === 'full' ? 'mobile-lightmaps.json' : 'lightmaps-balanced.json'))
  if (!response.ok) throw Error('Compressed lightmap manifest unavailable')
  const manifest = await response.json()
  // Overlap the decoder download with the texture downloads.
  loader.init().catch(() => {})
  return { loader, maps: manifest.maps, folder: quality === 'full' ? 'maps-mobile' : 'maps-balanced' }
}
