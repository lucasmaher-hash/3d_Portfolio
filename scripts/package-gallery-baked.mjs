import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions'
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer'
import {weld,quantize,dedup,prune,unpartition,mergeDocuments} from '@gltf-transform/functions'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const root=process.argv[2]
if(!root)throw Error('Pass final HDR bake directory')
const output='public/gallery-baked-assets'
const sourcePath='public/gallery-original-assets/gallery.glb'
const hash=b=>crypto.createHash('sha256').update(b).digest('hex')
const sourceBytes=await fs.readFile(sourcePath)
assert.equal(hash(sourceBytes),'084ed362ae0ff47f774db25e9b47baa5fa756bd71548d8204a4e1260fdd37c41','Third version changed')
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready])
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder})
const doc=await io.read(path.join(root,'gallery.glb'))
const scene=doc.getRoot().getDefaultScene()
const lightmaps=JSON.parse(await fs.readFile(path.join(root,'web-lightmaps.json')))
for(const node of doc.getRoot().listNodes()) {
 const key=node.getExtras().galleryBakeLabel
 if(!lightmaps[key]||!node.getMesh())continue
 const uv=new Set(node.getMesh().listPrimitives().map(p=>p.getMaterial().getEmissiveTextureInfo()?.getTexCoord()??0))
 assert.equal(uv.size,1,`Bake UV differs between primitives: ${node.getName()}`)
 const uvSet=[...uv][0]
 assert(node.getMesh().listPrimitives().every(p=>p.getAttribute(`TEXCOORD_${uvSet}`)),`Missing bake UV: ${node.getName()}`)
 node.setExtras({...node.getExtras(),galleryBakeUV:uvSet})
}
// Quantize/compress only new geometry BEFORE importing the immutable web bottle.
await doc.transform(unpartition(),weld(),quantize({quantizePosition:16,quantizeNormal:14,quantizeTexcoord:16}),dedup(),prune({keepAttributes:true,keepSolidTextures:true}))
const source=await io.readBinary(sourceBytes)
const bottleNames=new Set(['bottle body_Podest','label_Podest','lid_Podest'])
// Meshopt may cyclically rotate a triangle's three indices; winding and geometry
// remain identical. Compare oriented triangles independently of that rotation.
function triangleHash(accessor) {
 const a=Array.from(accessor.getArray())
 for(let j=0;j<a.length;j+=3) {
  const t=a.slice(j,j+3), k=t.indexOf(Math.min(...t))
  a.splice(j,3,t[k],t[(k+1)%3],t[(k+2)%3])
 }
 return hash(JSON.stringify(a))
}
function signature(document) {
 return document.getRoot().listNodes().filter(n=>bottleNames.has(n.getName())).map(n=>({name:n.getName(),matrix:n.getWorldMatrix(),primitives:n.getMesh().listPrimitives().map(p=>{
  const m=p.getMaterial(),ext=m.getExtension('KHR_materials_transmission'),ior=m.getExtension('KHR_materials_ior')
  const attrs=Object.fromEntries(p.listSemantics().sort().map(name=>{const a=p.getAttribute(name);return [name,{type:a.getType(),normalized:a.getNormalized(),component:a.getComponentType(),hash:hash(new Uint8Array(a.getArray().buffer,a.getArray().byteOffset,a.getArray().byteLength))}]}))
  const i=p.getIndices()
  const texture=m.getBaseColorTexture(),info=m.getBaseColorTextureInfo()
  return {mode:p.getMode(),attrs,indices:triangleHash(i),material:{base:m.getBaseColorFactor(),metal:m.getMetallicFactor(),rough:m.getRoughnessFactor(),emission:m.getEmissiveFactor(),alpha:m.getAlphaMode(),cutoff:m.getAlphaCutoff(),double:m.getDoubleSided(),extensions:m.listExtensions().map(e=>e.extensionName).sort(),transmission:ext?.getTransmissionFactor(),ior:ior?.getIOR(),image:texture?hash(texture.getImage()):null,texCoord:info?.getTexCoord(),wrap:info?[info.getWrapS(),info.getWrapT(),info.getMagFilter(),info.getMinFilter()]:null}}
 })})).sort((a,b)=>a.name.localeCompare(b.name))
}
const before=signature(source);assert.equal(before.length,3)
const mapping=mergeDocuments(doc,source)
for(const node of source.getRoot().listNodes()) {
 const copy=mapping.get(node)
 if(bottleNames.has(node.getName()))scene.addChild(copy)
 else copy.dispose()
}
for(const s of source.getRoot().listScenes())mapping.get(s).dispose()
doc.getRoot().setDefaultScene(scene)
await doc.transform(unpartition(),prune({keepAttributes:true,keepSolidTextures:true}))
// Optimization can collapse duplicate UV sets and update texture bindings.
// Read the final binding after transforms rather than retaining its old index.
for(const node of doc.getRoot().listNodes()) {
 if(!lightmaps[node.getExtras().galleryBakeLabel]||!node.getMesh())continue
 const uvSet=node.getMesh().listPrimitives()[0].getMaterial().getEmissiveTextureInfo()?.getTexCoord()??0
 assert(node.getMesh().listPrimitives().every(p=>p.getAttribute(`TEXCOORD_${uvSet}`)))
 node.setExtras({...node.getExtras(),galleryBakeUV:uvSet})
}
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE})
const bytes=await io.writeBinary(doc)
const check=await io.readBinary(bytes)
assert.deepEqual(signature(check),before,'Bottle geometry/material/texture changed during packaging')
const settings=JSON.parse(await fs.readFile(path.join(root,'scene.json')))
settings.lightmaps=lightmaps
settings.probes=JSON.parse(await fs.readFile(path.join(root,'../probes/probes.json')))
settings.reviewViews=JSON.parse(await fs.readFile(path.join(root,'../probes/cameras.json')))
settings.bottleSourceSHA256=hash(sourceBytes)
settings.bottlePreservation='Decoded geometry, indices, transforms, materials and texture bytes verified after serialization'
settings.runtimeRoomLights=0
settings.displayTransform='Frozen Blender 5.1 OCIO AgX + Medium High Contrast; exposure baked into display LUT once'
await fs.mkdir(output,{recursive:true})
await fs.writeFile(path.join(output,'gallery.glb'),bytes)
await fs.writeFile(path.join(output,'scene.json'),JSON.stringify(settings,null,2))
await fs.writeFile(path.join(root,'bottle-preservation.json'),JSON.stringify({sourceAssetSHA256:hash(sourceBytes),semantics:before,verified:true},null,2))
await fs.mkdir(path.join(output,'probes'),{recursive:true})
for(const probe of settings.probes)await fs.copyFile(path.join(root,'../probes',probe.file),path.join(output,'probes',probe.file))
console.log(`PASS: fourth GLB ${(bytes.byteLength/1e6).toFixed(1)} MB; ${Object.keys(lightmaps).length} HDR diffuse maps; exact web bottle preserved; third GLB unchanged`)
