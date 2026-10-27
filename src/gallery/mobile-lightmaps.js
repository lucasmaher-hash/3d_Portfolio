import { LoadingManager } from 'three'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import transcoderJS from 'three/examples/jsm/libs/basis/basis_transcoder.js?url'
import transcoderWASM from 'three/examples/jsm/libs/basis/basis_transcoder.wasm?url'

// Imported only for coarse-pointer touch devices. Vite versions the decoder
// assets with the installed Three release; no external CDN or copied binaries.
export async function mobileLightmapLoader(renderer) {
  const manager = new LoadingManager()
  manager.setURLModifier(url => url === 'basis_transcoder.js' ? transcoderJS
    : url === 'basis_transcoder.wasm' ? transcoderWASM : url)
  const loader = new KTX2Loader(manager).setWorkerLimit(2).detectSupport(renderer)
  const support = loader.workerConfig
  if (!(support.astcSupported || support.bptcSupported || support.etc2Supported || support.dxtSupported)) return null
  const response = await fetch('/gallery-baked-assets/mobile-lightmaps.json')
  if (!response.ok) throw Error('Mobile lightmap manifest unavailable')
  const manifest = await response.json()
  return { loader, maps: manifest.maps }
}
