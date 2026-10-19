// Records the Unify page's three home-screen cards (.home-previews in
// public/unify2d.html) as seamless loops, one frame at a time:
//   desktop  1440-wide layout at 2x  -> public/videos/unify/home-previews.mp4
//   mobile   390-wide phone layout at 3x -> public/videos/unify/home-previews-mobile.mp4
// The cards are public/unify/app-home/home.html in iframes; this page must still
// show them (temporarily put the iframes back into .home-previews, see the
// comment there) while recording.
//
// Usage (dev server on :5173, Chromium + ffmpeg installed):
//   npm i --no-save playwright-core
//   CHROMIUM=/path/to/chrome node scripts/record-unify-home.mjs <frames-dir>
//   then the two ffmpeg lines printed at the end.
//
// The loop: every animation in the cards (friends 7.5-9 s, posters 11-13 s,
// map dots 2.4 s) is paused and set to t * P / P', where P' = LOOP / round(LOOP / P)
// is its period stretched or squeezed (by at most 11%) to fit a whole number of
// times into LOOP. Frame LOOP is then exactly frame 0, so the video loops with no seam.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || './frames';
const LOOP = 24, FPS = 30, N = LOOP * FPS;
const URL = 'http://localhost:5173/unify2d.html';

const b = await chromium.launch({ executablePath: process.env.CHROMIUM });
for (const cut of [
  { name: 'desktop', ctx: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 } },
  { name: 'mobile',  ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
]) {
  const dir = `${OUT}/${cut.name}`; mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext(cut.ctx);
  await ctx.addInitScript(() => { try { sessionStorage.setItem('siteLoaderSeen', '1'); } catch (e) {} });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  const el = p.locator('.home-previews');
  // Park it below the nav, so the nav's shading never falls on it.
  await el.evaluate(e => { const r = e.getBoundingClientRect(); window.scrollTo(0, scrollY + r.top - 160); });
  await p.waitForTimeout(800);
  const frames = () => p.frames().filter(f => f.url().includes('/unify/app-home/'));
  for (let i = 0; i < 100 && frames().length < 3; i++) await p.waitForTimeout(100);
  for (const f of frames()) {
    await f.waitForLoadState('load');
    await f.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  }
  await p.waitForTimeout(500);
  for (const f of frames()) {
    await f.evaluate(({ LOOP }) => {
      window.__anims = document.getAnimations().map(a => {
        a.pause();
        const P = a.effect.getTiming().duration / 1000;
        const fit = LOOP / Math.max(1, Math.round(LOOP / P));
        return { a, k: P / fit };
      });
      window.__seek = t => { for (const { a, k } of window.__anims) a.currentTime = t * k * 1000; };
    }, { LOOP });
  }
  for (let i = 0; i < N; i++) {
    const t = i / FPS;
    for (const f of frames()) await f.evaluate(t => window.__seek(t), t);
    await el.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.png`, animations: 'allow', caret: 'initial' });
    if (i % 120 === 0) console.log(cut.name, i, '/', N);
  }
  const box = await el.boundingBox();
  console.log(cut.name, 'box', box.width.toFixed(2), 'x', box.height.toFixed(2));
  await ctx.close();
}
await b.close();
console.log(`ffmpeg -framerate ${FPS} -i ${OUT}/desktop/f%04d.png -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -movflags +faststart -an public/videos/unify/home-previews.mp4`);
console.log(`ffmpeg -framerate ${FPS} -i ${OUT}/mobile/f%04d.png -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -movflags +faststart -an public/videos/unify/home-previews-mobile.mp4`);
