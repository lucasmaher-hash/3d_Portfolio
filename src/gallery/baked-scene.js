import * as THREE from 'three'
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js'
import {installBlenderView} from './blender-view.js'

// onProgress(0..1) reports the downloads below (colour LUT, probes, lightmaps) for the
// welcome screen's percentage. The LUT is ~7 MB, so it counts as six items.
export async function prepareBakedGallery(model,scene,renderer,onProgress=()=>{}) {
  const response=await fetch('/gallery-baked-assets/scene.json')
  if(!response.ok)throw Error('Fourth gallery settings unavailable')
  const settings=await response.json()
  const LUT_WEIGHT=6,total=LUT_WEIGHT+settings.probes.length+Object.keys(settings.lightmaps).length
  let done=0;const tick=(w=1)=>{done+=w;onProgress(Math.min(1,done/total))}
  for(const child of [...scene.children])if(child.isLight)scene.remove(child)
  scene.fog=null;scene.background=new THREE.Color(0x071012);scene.environment=null
  renderer.shadowMap.enabled=false
  renderer.domElement.tabIndex=0
  renderer.domElement.addEventListener('pointerdown',()=>renderer.domElement.focus({preventScroll:true}))
  const view=await installBlenderView(renderer);tick(LUT_WEIGHT)
  const pmrem=new THREE.PMREMGenerator(renderer)
  const probeLoader=new EXRLoader().setDataType(THREE.HalfFloatType)
  const probes=await Promise.all(settings.probes.map(async probe=>{
    const hdr=await probeLoader.loadAsync('/gallery-baked-assets/probes/'+probe.file)
    hdr.mapping=THREE.EquirectangularReflectionMapping
    const filtered=pmrem.fromEquirectangular(hdr);hdr.dispose();tick()
    return {...probe,texture:filtered.texture}
  }))
  pmrem.dispose();scene.environment=probes[0].texture;scene.environmentIntensity=1
  const loader=new THREE.TextureLoader(),maps=new Map()
  await Promise.all(Object.entries(settings.lightmaps).map(async ([key,info])=>{
    const texture=await loader.loadAsync('/gallery-baked-assets/maps/'+info.file)
    texture.flipY=false;texture.colorSpace=THREE.NoColorSpace
    texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true
    maps.set(key,{...info,texture});tick()
  }))
  const collidables=[]
  model.updateMatrixWorld(true)
  model.traverse(mesh=>{
    if(!mesh.isMesh)return
    let owner=mesh
    while(owner.parent && owner!==model && !owner.userData.galleryRole)owner=owner.parent
    mesh.userData={...owner.userData,...mesh.userData}
    const role=mesh.userData.galleryRole
    if(role==='wall'||role==='podium')collidables.push(mesh)
    const centre=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3())
    const probe=[...probes].sort((a,b)=>Math.hypot(centre.x-a.position[0],centre.z-a.position[2])-Math.hypot(centre.x-b.position[0],centre.z-b.position[2]))[0]
    const baked=maps.get(mesh.userData.galleryBakeLabel)
    // GLB deduplication shares identical PBR materials across receivers. Each
    // receiver needs its own bake uniforms and local reflection assignment.
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>m.clone()):mesh.material.clone()
    if(baked){
      const attr=mesh.userData.galleryBakeUV===0?'uv':`uv${mesh.userData.galleryBakeUV}`
      const uv=mesh.geometry.getAttribute(attr)
      if(!uv)throw Error(`Missing HDR bake UV ${attr}: ${mesh.name}`)
      mesh.geometry.setAttribute('galleryBakeUV',uv)
    }
    // Do not modify the preserved bottle's imported material parameters.
    for(const material of [mesh.material].flat()){
      material.envMap=probe.texture
      if(baked){material.emissiveMap=null;material.emissive.set(0)}
      material.onBeforeCompile=shader=>{
        view.bind(shader)
        if(!baked)return
        shader.uniforms.uBakedDiffuse={value:baked.texture}
        shader.uniforms.uBakedRange={value:baked.range}
        shader.vertexShader='attribute vec2 galleryBakeUV;\nvarying vec2 vGalleryBakeUV;\n'+shader.vertexShader
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGalleryBakeUV=galleryBakeUV;')
        shader.fragmentShader='uniform sampler2D uBakedDiffuse;\nuniform float uBakedRange;\nvarying vec2 vGalleryBakeUV;\n'+shader.fragmentShader
        shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
          vec4 galleryRadiance=texture2D(uBakedDiffuse,vGalleryBakeUV);
          totalEmissiveRadiance+=galleryRadiance.rgb*galleryRadiance.a*uBakedRange;
        `)
        // Bake already contains all diffuse illumination. Keep environment specular.
        shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );','iblIrradiance += vec3(0.0);'))
      }
      material.customProgramCacheKey=()=>baked?'fourth-hdr-diffuse-ocio-v1':'fourth-native-pbr-ocio-v1'
      material.needsUpdate=true
    }
  })
  scene.add(model);model.updateMatrixWorld(true)
  return {settings,collidables,view,probes}
}
