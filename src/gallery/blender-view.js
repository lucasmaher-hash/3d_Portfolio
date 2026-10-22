import * as THREE from 'three'

// This display processor is used only by the fourth route. The source OCIO
// configuration and numeric error report are frozen alongside the HDR masters.
export async function installBlenderView(renderer) {
  const [settings,buffer] = await Promise.all([
    fetch('/gallery-baked-assets/colour.json').then(r=>{if(!r.ok)throw Error('Colour settings missing');return r.json()}),
    fetch('/gallery-baked-assets/blender-view.rgba16f').then(r=>{if(!r.ok)throw Error('Colour LUT missing');return r.arrayBuffer()}),
  ])
  const lut = new THREE.Data3DTexture(new Uint16Array(buffer),settings.size,settings.size,settings.size)
  lut.type=THREE.HalfFloatType;lut.format=THREE.RGBAFormat;lut.colorSpace=THREE.NoColorSpace
  lut.minFilter=lut.magFilter=THREE.LinearFilter;lut.unpackAlignment=1;lut.needsUpdate=true
  const chunk=THREE.ShaderChunk.tonemapping_pars_fragment
  const needle='vec3 CustomToneMapping( vec3 color ) { return color; }'
  if(!chunk.includes(needle))throw Error('Unsupported Three custom tone-mapping shader')
  THREE.ShaderChunk.tonemapping_pars_fragment=chunk.replace(needle,`
    uniform highp sampler3D uBlenderView;
    vec3 CustomToneMapping(vec3 color) {
      vec3 uvw=clamp((log2(max(color,vec3(exp2(${settings.logMin.toFixed(1)}))))-(${settings.logMin.toFixed(1)}))/(${(settings.logMax-settings.logMin).toFixed(1)}),0.0,1.0);
      uvw=vec3(0.5/${settings.size.toFixed(1)})+uvw*(1.0-1.0/${settings.size.toFixed(1)});
      return texture(uBlenderView,uvw).rgb;
    }
  `)
  renderer.toneMapping=THREE.CustomToneMapping
  renderer.toneMappingExposure=1 // The approved Blender exposure is inside the LUT.
  renderer.outputColorSpace=THREE.SRGBColorSpace
  return {settings,bind(shader){shader.uniforms.uBlenderView={value:lut}}}
}
