import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import vm from 'node:vm'
import {execFileSync} from 'node:child_process'
import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {MeshoptDecoder} from 'meshoptimizer'
const root=new URL('../public/gallery-baked-assets/',import.meta.url)
const settings=JSON.parse(await fs.readFile(new URL('scene.json',root)))
assert.equal(settings.floorY,0);assert.equal(settings.eyeHeight,1.9386224159559822)
assert.equal(settings.fov,90);assert.equal(settings.speed,3.45)
assert.deepEqual(settings.spawn,[0,settings.eyeHeight,0]);assert.equal(settings.yaw,Math.PI)
assert.equal(settings.runtimeRoomLights,0)
assert.equal(Object.keys(settings.lightmaps).length,20);assert.equal(settings.probes.length,6)
await MeshoptDecoder.ready
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder})
const doc=await io.read(new URL('gallery.glb',root).pathname)
let baked=0;const projects=new Set(),podiums=new Set()
for(const node of doc.getRoot().listNodes()) {
 const e=node.getExtras()
 if(e.galleryRole==='project')projects.add(e.galleryProject)
 if(e.galleryRole==='podium')podiums.add(e.galleryBakeLabel)
 if(!settings.lightmaps[e.galleryBakeLabel]||!node.getMesh())continue
 baked++
 for(const primitive of node.getMesh().listPrimitives()) {
  const uv=primitive.getAttribute(`TEXCOORD_${e.galleryBakeUV}`)
  assert(uv,`Missing bake UV: ${node.getName()}`)
  for(let i=0;i<uv.getCount();i++)for(const x of uv.getElement(i,[]))assert(x>=-.0001&&x<=1.0001)
 }
}
assert.equal(baked,20);assert.equal(podiums.size,5);assert.equal(projects.size,5)
const original=execFileSync('git',['show','gallery-third-preserved-2026-10-22:public/gallery-original-assets/gallery.glb'],{maxBuffer:100*1024*1024})
assert.equal(crypto.createHash('sha256').update(original).digest('hex'),settings.bottleSourceSHA256)
let bytes=0,pixels=0
for(const map of Object.values(settings.lightmaps)) {
 const file=await fs.readFile(new URL('maps/'+map.file,root));assert.equal(file.readUInt32BE(16),map.width)
 assert.equal(file.readUInt32BE(20),map.height);bytes+=file.length;pixels+=map.width*map.height
}
for(const p of settings.probes)bytes+=(await fs.stat(new URL('probes/'+p.file,root))).size
bytes+=(await fs.stat(new URL('gallery.glb',root))).size+(await fs.stat(new URL('blender-view.rgba16f',root))).size
console.log(`PASS: 20 valid lightmap UV sets (egg + VR panel use the old scene asset), five podiums/projects, six HDR probes, approved spawn and movement, zero runtime room lights, protected third GLB hash. Assets ${(bytes/1e6).toFixed(1)} MB; lightmap mip allocation about ${(pixels*4*4/3/1048576).toFixed(0)} MiB, excluding geometry/probes/LUT.`)
const main=await fs.readFile(new URL('../src/main.js',import.meta.url),'utf8')
const flags=main.slice(main.indexOf('const IS_DEFAULT_GALLERY'),main.indexOf("import * as THREE"))
for(const [pathname,expected]of [['/','default'],['/index.html','default'],['/gallery-1.html','gallery-1'],['/gallery-4.html','gallery-4']]) {
 const result=vm.runInNewContext(flags+';\n({id:GALLERY_ENTRY_ID,baked:IS_BAKED_GALLERY,key:RETURN_STATE_KEY})',{location:{pathname}})
 assert.equal(result.id,expected);assert.equal(result.baked,['default','gallery-4'].includes(expected))
}
const exit=await fs.readFile(new URL('../public/js/exit-3d.js',import.meta.url),'utf8')
for(const id of ['default','gallery-1','gallery-4']) {
 const nodes=[];const document={getElementById:()=>null,querySelector:()=>null,createElement:()=>({style:{}}),head:{appendChild(){}},body:{appendChild:n=>nodes.push(n)}}
 vm.runInNewContext(exit.slice(0,exit.indexOf('  // Same button-pop'))+'\n})();',{document,location:{search:'?from=3d&scene='+id},URLSearchParams})
 assert.equal(nodes[0].href,id==='default'?'/':`/${id}.html`)
}
for(const file of ['gallery-2.html','gallery-3.html','gallery.html','gallery-original.html','public/gallery-assets','public/gallery-original-assets'])assert.equal(await fs.stat(new URL('../'+file,import.meta.url)).then(()=>true,()=>false),false)
console.log('PASS: retained default/1/4 routes and Exit destinations; iterations 2/3 and their assets removed')
