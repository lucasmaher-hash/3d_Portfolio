import assert from 'node:assert/strict'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import * as THREE from 'three'
await MeshoptDecoder.ready
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).read(process.argv[2] || 'public/gallery-assets/gallery.glb')
for (const node of doc.getRoot().listNodes().filter(n=>/^(Outer Wall|Inner Ring) \|/.test(n.getName()))) {
 const matrix=new THREE.Matrix4().fromArray(node.getWorldMatrix()),rates=[]
 for(const p of node.getMesh().listPrimitives()) {
  const a=p.getAttribute('POSITION'),b=p.getAttribute('TEXCOORD_0'),idx=p.getIndices().getArray()
  const pos=new THREE.BufferAttribute(a.getArray(),3,a.getNormalized()),uv=new THREE.BufferAttribute(b.getArray(),2,b.getNormalized())
  for(let i=0;i<idx.length;i+=3)for(let k=0;k<3;k++) {
   const ai=idx[i+k],bi=idx[i+(k+1)%3]
   const pa=new THREE.Vector3().fromBufferAttribute(pos,ai).applyMatrix4(matrix),pb=new THREE.Vector3().fromBufferAttribute(pos,bi).applyMatrix4(matrix)
   const d=pa.distanceTo(pb),du=Math.abs(uv.getX(ai)-uv.getX(bi))
   if(pa.y<.2||pa.y>4.7||Math.abs(pa.y-pb.y)>.001||d<.001||d>2||du<.00001||du>.08)continue
   rates.push(du/d)
  }
 }
 rates.sort((a,b)=>a-b)
 const median=rates[Math.floor(rates.length*.5)],p99=rates[Math.floor(rates.length*.99)],ratio=p99/median
 console.log(node.getName(),JSON.stringify({edges:rates.length,texelDensityRatio:ratio}))
 assert(rates.length && ratio<4,'Narrow grooves must not receive disproportionately wide lightmap strips')
}
