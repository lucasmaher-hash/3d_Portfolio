import * as THREE from 'three'

// Replace noisy draft well bakes with a continuous, rounded ceiling return.
// Sample the adjacent ceiling bake so the lip shares its actual illuminated colour.
export function finishCeilingRecesses(model, settings) {
  model.updateMatrixWorld(true)
  const ceiling = []
  model.traverse(mesh => { if (mesh.isMesh && mesh.userData.galleryBakeLabel === 'ceiling') ceiling.push(mesh) })
  const ray = new THREE.Raycaster()
  const imageCanvas = document.createElement('canvas')
  const imageContext = imageCanvas.getContext('2d', { willReadFrequently: true })
  const image = ceiling[0]?.material.emissiveMap?.image
  if (!image) return
  imageCanvas.width = image.width
  imageCanvas.height = image.height
  imageContext.drawImage(image, 0, 0)
  const pixels = imageContext.getImageData(0, 0, image.width, image.height).data
  const replacements = []
  model.traverse(mesh => { if (mesh.isMesh && /^well-/.test(mesh.userData.galleryBakeLabel || '')) replacements.push(mesh) })
  for (const well of replacements) {
    const bounds = new THREE.Box3().setFromObject(well)
    const center = bounds.getCenter(new THREE.Vector3())
    const radius = well.userData.opening_diameter_m / 2
    const round = well.userData.rounded_edge_cm / 100
    const bottom = bounds.min.y
    const rise = round / 1.3 * settings.heightScale
    const colour = new THREE.Color(0, 0, 0)
    let count = 0
    for (let i=0; i<16; i++) {
      const a = i*Math.PI/8
      ray.set(new THREE.Vector3(center.x+(radius+.025)*Math.cos(a), bottom-.08, center.z+(radius+.025)*Math.sin(a)), new THREE.Vector3(0,1,0))
      const hit = ray.intersectObjects(ceiling, false)[0]
      if (!hit?.uv) continue
      const x = Math.max(0,Math.min(image.width-1,Math.floor(hit.uv.x*image.width)))
      const y = Math.max(0,Math.min(image.height-1,Math.floor(hit.uv.y*image.height)))
      const offset = (y*image.width+x)*4
      colour.add(new THREE.Color().setRGB(pixels[offset]/255,pixels[offset+1]/255,pixels[offset+2]/255,THREE.SRGBColorSpace))
      count++
    }
    if (count) colour.multiplyScalar(1/count)
    else colour.set('#376478').multiplyScalar(.2)
    const profile = []
    for (let i=0; i<=40; i++) {
      const t = i/40*Math.PI/2
      profile.push(new THREE.Vector2(radius-round*Math.sin(t), rise*(1-Math.cos(t))))
    }
    profile.push(new THREE.Vector2(radius-round, bounds.max.y-bottom))
    const geometry = new THREE.LatheGeometry(profile, 192)
    // A soft blue lift inside the recess describes the curved edge without a white ring.
    const gradient = document.createElement('canvas')
    gradient.width = 2; gradient.height = 128
    const ctx = gradient.getContext('2d')
    const data = ctx.createImageData(2,128)
    for(let y=0; y<128; y++) {
      const t = 1-y/127
      const c = colour.clone().multiplyScalar(1+.65*t*t).convertLinearToSRGB()
      for(let x=0;x<2;x++) {
        const k=(y*2+x)*4
        data.data[k]=Math.min(255,Math.round(c.r*255)); data.data[k+1]=Math.min(255,Math.round(c.g*255)); data.data[k+2]=Math.min(255,Math.round(c.b*255)); data.data[k+3]=255
      }
    }
    ctx.putImageData(data,0,0)
    const texture = new THREE.CanvasTexture(gradient)
    texture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.MeshStandardMaterial({color:0x000000,emissive:0xffffff,emissiveMap:texture,roughness:.3,envMapIntensity:.08,side:THREE.DoubleSide})
    const replacement = new THREE.Mesh(geometry, material)
    replacement.name=well.name
    replacement.userData={...well.userData}
    replacement.position.set(center.x,bottom,center.z)
    well.parent.worldToLocal(replacement.position)
    well.parent.add(replacement)
    well.removeFromParent()
  }
}
