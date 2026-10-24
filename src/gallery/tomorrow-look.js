import * as THREE from 'three'

// to.morrow exhibit finish, dialled in by Lucas on 2026-10-24 (dev dial removed).
// Body: colour + brightness TINT the baked light (the body has no runtime diffuse lighting),
// `bake` scales it; metalness/roughness/clearcoat shape the environment reflection only.
// Glass button: tint x brightness is the material colour; glow is an added emissive.
// Icon: brightness 0 = pure black.
const BODY = { color: '#b9badf', brightness: 1.59, bake: 0.7, metalness: 0.12, roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 0 }
const GLASS = { color: '#c2cbd7', brightness: 2, metalness: 0, roughness: 0, clearcoat: 0, clearcoatRoughness: 0.1, transmission: 0.82, ior: 1.53, thickness: 0, glow: 0.16, glowColor: '#949494', envMapIntensity: 0.72 }
const ICON = { color: '#121416', brightness: 0, roughness: 0.68, metalness: 0 }

const materialsOf = (model, name) => {
  const out = []
  model.traverse(o => { if (o.isMesh && o.name === name) for (const m of [o.material].flat()) if (!out.includes(m)) out.push(m) })
  return out
}

export function applyTomorrowLook(model) {
  for (const m of materialsOf(model, 'Tomorrow_ContinuousShell')) {
    m.userData.bakeTint?.value.set(BODY.color).multiplyScalar(BODY.brightness)
    if (m.userData.bakeRange) m.userData.bakeRange.value *= BODY.bake
    Object.assign(m, { metalness: BODY.metalness, roughness: BODY.roughness, clearcoat: BODY.clearcoat,
      clearcoatRoughness: BODY.clearcoatRoughness, envMapIntensity: BODY.envMapIntensity })
    m.needsUpdate = true
  }
  for (const m of materialsOf(model, 'Tomorrow_GlassBubbleButton')) {
    m.color.set(GLASS.color).multiplyScalar(GLASS.brightness)
    Object.assign(m, { metalness: GLASS.metalness, roughness: GLASS.roughness, clearcoat: GLASS.clearcoat,
      clearcoatRoughness: GLASS.clearcoatRoughness, transmission: GLASS.transmission, ior: GLASS.ior,
      thickness: GLASS.thickness, envMapIntensity: GLASS.envMapIntensity })
    m.emissive.set(GLASS.glowColor); m.emissiveIntensity = GLASS.glow
    m.needsUpdate = true
  }
  for (const n of ['Tomorrow_LiveIcon_Ring', 'Tomorrow_LiveIcon_Dot']) for (const m of materialsOf(model, n)) {
    m.color.set(ICON.color).multiplyScalar(ICON.brightness)
    m.roughness = ICON.roughness; m.metalness = ICON.metalness
    m.needsUpdate = true
  }
}
