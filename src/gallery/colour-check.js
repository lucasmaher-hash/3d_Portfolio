import * as THREE from 'three'
import {installBlenderView} from './blender-view.js'
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true})
renderer.setPixelRatio(1);renderer.setSize(576,288);document.querySelector('#gpu').append(renderer.domElement)
const view=await installBlenderView(renderer)
const patches=await fetch('/gallery-baked-assets/colour-patches.json').then(r=>r.json())
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,12,6,0,.01,10);camera.position.z=1
patches.forEach((rgb,i)=>{
 const mat=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(...rgb)})
 mat.onBeforeCompile=shader=>view.bind(shader);mat.customProgramCacheKey=()=> 'blender-view-chart'
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat);mesh.position.set(i%12+.5,5.5-Math.floor(i/12),0);scene.add(mesh)
})
renderer.render(scene,camera)
document.querySelector('#status').textContent='Rendered Blender display transform'
