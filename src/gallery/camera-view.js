// Keep the desktop field of view consistent across wide displays. Three.js's
// camera.fov is vertical; a fixed 90° becomes 121° horizontally at 16:9.
export const DESKTOP_VIEW = Object.freeze({ horizontalFov: 92, verticalLimit: 62.5 })

export function applyDesktopView(camera, settings = DESKTOP_VIEW) {
  const radians = Math.PI / 180
  const vertical = 2 * Math.atan(Math.tan(settings.horizontalFov * radians / 2) / camera.aspect) / radians
  camera.fov = Math.min(settings.verticalLimit, vertical)
  camera.updateProjectionMatrix()
}

export function viewAngles(camera) {
  const vertical = camera.getEffectiveFOV()
  const horizontal = 2 * Math.atan(Math.tan(vertical * Math.PI / 360) * camera.aspect) * 180 / Math.PI
  return { horizontal, vertical }
}
