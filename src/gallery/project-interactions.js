import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export const GALLERY_RETURN_STATE_KEY = '_bakedGalleryReturnState'
export const GALLERY_PROJECTS = [
  { title: 'Unify', url: '/unify2d.html', arrow: false, bottom: false },
  { title: 'Double Packaging', url: '/vaccine2d.html', arrow: true, bottom: true, phase: 2.6 },
  { title: 'Mac-Lamp', url: '/mac-lamp2d.html', arrow: true, bottom: true, phase: 1.3 },
  { title: 'Virtual Cooking', url: '/virtual_cooking2d.html', arrow: true, bottom: false, phase: 6.5 },
  { title: 'Cybercoffee', url: '/kaffeemaschine2d.html', arrow: true, bottom: false, phase: 5.2 },
]
const lampParts = ['Base_Orange_Table', 'VerticalPlate_Orange_Table', 'KB_Grey_Panel_Table',
  'Back_Grey_Panel_Table', 'Trackpad_Back_Grey_Table', 'Trackpad_Front_Grey_Table']
const bottleParts = ['bottle_body_Podest', 'label_Podest', 'lid_Podest']

function projectOf(mesh) {
  for (let node = mesh; node; node = node.parent) {
    if (node.userData.galleryRole && node.userData.galleryRole !== 'project') return null
    const title = node.userData.galleryProject
    if (GALLERY_PROJECTS.some(project => project.title === title)) return title
    const name = node.name.replace(/\s/g, '_')
    if (name === 'Pivot_UNify' || name.startsWith('PinkRoom_Creature_')) return 'Unify'
    if (bottleParts.includes(name)) return 'Double Packaging'
    if (lampParts.includes(name)) return 'Mac-Lamp'
    if (name === 'Pivot_VRPanel') return 'Virtual Cooking'
    if (name === 'egg-rig') return 'Cybercoffee'
  }
  return null
}

// Same silhouette, bevel and dimensions as makeArrowGeometry() in main.js.
function arrowGeometry() {
  const h = .55, w = h * .78, shaft = w * .42, head = h * .52
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  for (const [x, y] of [[w/2,head], [shaft/2,head], [shaft/2,h],
    [-shaft/2,h], [-shaft/2,head], [-w/2,head]]) shape.lineTo(x, y)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .12, bevelEnabled: true, bevelThickness: .018, bevelSize: .018, bevelSegments: 3,
  })
  geometry.center()
  return geometry
}

export function readGalleryReturnPose(storage) {
  try {
    const pose = JSON.parse(storage.getItem(GALLERY_RETURN_STATE_KEY))
    return pose && ['x', 'y', 'z', 'yaw', 'pitch'].every(key => Number.isFinite(pose[key])) ? pose : null
  } catch { return null }
}

/** Fourth-version adapter. Call after BOTH the new model and retained bottle are loaded.
 * Uses main.js's existing startPop/updatePops and projectArrows animation loop.
 * This module installs no render loop, pointer listeners, lights or material changes.
 */
export function prepareGalleryProjectInteractions({ roots, scene, renderer, clickables, projectArrows,
  arrowMaterial: suppliedMaterial }) {
  const members = new Map(GALLERY_PROJECTS.map(project => [project.title, []]))
  const projectByMesh = new Map()
  const ownedArrows = []
  const registered = []
  let busy = false, probeTarget, material = suppliedMaterial, geometry
  for (const root of roots) {
    root.updateWorldMatrix(true, true)
    root.traverse(mesh => {
      if (!mesh.isMesh || projectByMesh.has(mesh)) return
      const project = GALLERY_PROJECTS.find(project => project.title === projectOf(mesh))
      if (!project) return
      members.get(project.title).push(mesh)
      projectByMesh.set(mesh, project)
      if (!clickables.includes(mesh)) { clickables.push(mesh); registered.push(mesh) }
    })
  }
  const missing = GALLERY_PROJECTS.filter(project => !members.get(project.title).length)
  if (missing.length) throw new Error(`Gallery interaction assets missing: ${missing.map(p => p.title).join(', ')}`)
  if (!material) {
    const pmrem = new THREE.PMREMGenerator(renderer)
    const environment = new RoomEnvironment()
    probeTarget = pmrem.fromScene(environment, .04)
    environment.dispose(); pmrem.dispose()
    material = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: .12,
      envMap: probeTarget.texture, envMapIntensity: 1.2 })
  }
  geometry = arrowGeometry()
  GALLERY_PROJECTS.forEach((project, i) => {
    if (!project.arrow) return // Original portfolio deliberately has no Unify arrow.
    const box = new THREE.Box3()
    for (const mesh of members.get(project.title)) box.union(new THREE.Box3().setFromObject(mesh))
    const center = box.getCenter(new THREE.Vector3())
    const baseY = box.max.y + .35 + .55/2
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `ProjectArrow_Baked_${i}`
    mesh.position.set(center.x, baseY, center.z)
    mesh.castShadow = false
    scene.add(mesh)
    projectByMesh.set(mesh, project)
    ownedArrows.push(mesh); clickables.push(mesh); registered.push(mesh)
    projectArrows.push({ mesh, baseY, phase: project.phase })
  })

  function resolvePopTargets(mesh) {
    const project = projectByMesh.get(mesh)
    if (!project) return null
    if (ownedArrows.includes(mesh)) return { targets: [mesh], bottom: false }
    const all = members.get(project.title)
    // Never scale both an ancestor and its child: multi-primitive groups must pop once.
    const targets = all.filter(mesh => {
      for (let node = mesh.parent; node; node = node.parent) if (all.includes(node)) return false
      return true
    })
    return { targets, bottom: project.bottom }
  }

  return {
    members,
    resolvePopTargets,
    // Called from the old click handler AFTER its overlay/drag and raycast guards.
    activate(mesh, { startPop, navigate, readPose, storage, track }) {
      const project = projectByMesh.get(mesh)
      if (!project) return false
      if (busy) return true
      busy = true
      try { storage.setItem(GALLERY_RETURN_STATE_KEY, JSON.stringify(readPose())) } catch { /* Storage may be blocked. */ }
      track?.('project_open', { project: project.title, via: '3d-click' })
      const pop = resolvePopTargets(mesh)
      startPop(pop.targets, () => navigate(`${project.url}?from=3d&scene=gallery-baked`, 'left'), pop.bottom)
      return true
    },
    resetNavigation() { busy = false }, // Call with the existing pageshow/bfcache pop reset.
    dispose() {
      for (let i = clickables.length - 1; i >= 0; i--) if (registered.includes(clickables[i])) clickables.splice(i, 1)
      for (let i = projectArrows.length - 1; i >= 0; i--) if (ownedArrows.includes(projectArrows[i].mesh)) projectArrows.splice(i, 1)
      for (const arrow of ownedArrows) arrow.removeFromParent()
      geometry.dispose()
      if (!suppliedMaterial) material.dispose()
      probeTarget?.dispose()
      projectByMesh.clear()
    },
  }
}
