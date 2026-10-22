import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dequantize, prune } from '@gltf-transform/functions'
import { MeshoptDecoder } from 'meshoptimizer'
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(process.argv[2])
const keep = new Set(['Base_Orange_Table', 'VerticalPlate_Orange_Table'])
const root = doc.getRoot()
for (const n of root.listNodes()) if (!keep.has(n.getName())) n.dispose()
await doc.transform(prune(), dequantize())
for (const e of root.listExtensionsUsed()) if (/meshopt|quantization/.test(e.extensionName)) e.dispose()
for (const n of root.listNodes()) { const p=n.getMesh().listPrimitives()[0]; const a=p.getAttribute('POSITION'); console.log(n.getName(), n.getScale(), a.getMin([]), a.getMax([]), a.getCount(), Object.keys(p.listSemantics?{}:{})) }
await io.write(process.argv[3], doc)
