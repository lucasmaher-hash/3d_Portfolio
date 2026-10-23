// The still behind the "click me" overlay on kaffeemaschine2d.html: the machine page (3D
// egg, home screen) rendered at the overlay's own box size (480 wide, 969/1344) at 2x, on a
// transparent background. The page blurs it with CSS.
import { capture } from './capture.mjs'
const W = 480, H = Math.round(480 * 1344 / 969)
const c = await capture({ url: 'http://localhost:5191/kaffeemaschine/kaffeemaschine.html', width: W, height: H, fps: 60,
  startEpochMs: Date.UTC(2026, 9, 23, 21, 24, 0) })
await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false })
await c.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
for (let i = 0; i < 300; i++) {
  await new Promise(r => setTimeout(r, 25)); if (i % 4 === 0) await c.step(16)
  try { if (await c.ev("!!document.querySelector('.machine.egg3d-ready')")) break } catch {}
}
await new Promise(r => setTimeout(r, 1500))
for (let i = 0; i < 30; i++) await c.step(16.7)
await c.ev('document.fonts.ready.then(() => 1)')
await c.ev("document.querySelectorAll('*').forEach(e => e.style.cursor = 'none'), 1")
await c.shot('public/images/cybercoffee/machine-overlay.webp')   // Chrome encodes the webp (ffmpeg here has no libwebp)
c.close()
console.log('written public/images/cybercoffee/machine-overlay.webp', c.logs.join(' | '))
process.exit(0)
