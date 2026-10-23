// Renders the Cybercoffee landing loop: node scripts/kaffeemaschine/film/render.mjs [out] [--preview]
// Needs the dev server on :5191 (npx vite --port 5191). Films film.html frame by frame on a
// virtual clock (capture.mjs), 1340x1104 @ 60 fps for 28 s, then encodes
//   public/videos/kaffeemaschine/cybercoffee-loop.mp4        (desktop tile, 680/560)
//   public/videos/kaffeemaschine/cybercoffee-loop-mobile.mp4 (phone tile, the middle 1064 px)
import { capture } from './capture.mjs'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/cc-frames'
const preview = process.argv.includes('--preview')
const W = 1340, H = 1104, FPS = 60, SECONDS = 28
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true })
// 23:24 local (CEST, UTC+2), like the old loop.
const c = await capture({ url: 'http://localhost:5191/scripts/kaffeemaschine/film/film.html', width: W, height: H, fps: FPS,
  startEpochMs: Date.UTC(2026, 9, 23, 21, 24, 0) })
// Load in real time (network: GLB, fonts), ticking the virtual clock so rAF-driven setup runs.
for (let i = 0; i < 400; i++) {
  await new Promise(r => setTimeout(r, 25))
  if (i % 4 === 0) await c.step(16)
  try { if (await c.ev('!!window.__filmReady && window.__filmReady()')) break } catch {}
}
await new Promise(r => setTimeout(r, 1500))              // fonts settle
for (let i = 0; i < 60; i++) await c.step(1000 / FPS)    // one second of idle on the virtual clock
await c.ev('document.fonts.ready.then(() => 1)')
await c.ev('window.__filmStart(), 1')
const frames = preview ? [0, 300, 700, 990, 1010, 1100, 1200, 1500, 1560, 1590, 1620, 1650, 1665, 1679] : null
const total = SECONDS * FPS
for (let f = 0; f < total; f++) {
  if (!frames || frames.includes(f)) await c.shot(`${out}/${String(f).padStart(5, '0')}.png`)
  await c.step(1000 / FPS)
  if (f % 120 === 0) process.stdout.write(`${f}/${total} `)
}
console.log('\n' + (c.logs.filter(l => !/deprecated|GPU stall|PCF/.test(l)).join('\n') || 'no page errors'))
c.close()
if (preview) process.exit(0)
const enc = (vf, file) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', `${out}/%05d.png`,
  ...(vf ? ['-vf', vf] : []), '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', file], { stdio: 'inherit' })
enc(null, 'public/videos/kaffeemaschine/cybercoffee-loop.mp4')
enc(`crop=1064:${H}:${(W - 1064) / 2}:0`, 'public/videos/kaffeemaschine/cybercoffee-loop-mobile.mp4')
// posters = frame 0 (ffmpeg here has no libwebp; cwebp from Homebrew)
execFileSync('cwebp', ['-quiet', '-q', '82', `${out}/00000.png`, '-o', 'public/images/cybercoffee/loop-poster.webp'])
execFileSync('cwebp', ['-quiet', '-q', '82', '-crop', String((W - 1064) / 2), '0', '1064', String(H), `${out}/00000.png`, '-o', 'public/images/cybercoffee/loop-poster-mobile.webp'])
console.log('encoded')
process.exit(0)
