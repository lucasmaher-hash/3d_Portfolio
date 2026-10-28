// Browser regression for scene reloading and first-visit GPU hitches.
// npm install --prefix /tmp/portfolio-perf-tools --no-audit --no-fund playwright-core
// PLAYWRIGHT_MODULE=/tmp/portfolio-perf-tools/node_modules/playwright-core/index.mjs node scripts/check-scene-smoothness.mjs
// Optional: BASE_URL, CHROMIUM, PERF_REPORT (JSON output file).
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core')
const base = process.env.BASE_URL || 'http://localhost:5174'
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const report = { base, browser: browser.version(), results: [] }
const projects = ['unify', 'vaccine', 'mac-lamp', 'virtual_cooking', 'kaffeemaschine', 'to.morrow']

async function check({ width, touch }) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 2,
    hasTouch: touch, isMobile: touch })
  await context.addInitScript(() => {
    sessionStorage.setItem('_enter3d', '1')
    sessionStorage.setItem('introSeen', '1')
    sessionStorage.setItem('defaultBakedGalleryIntroSeen', '1')
    window.__sceneTest = { token: Math.random(), frames: [], lost: 0 }
    let last = 0
    requestAnimationFrame(function sample(t) {
      if (last) window.__sceneTest.frames.push(t - last)
      last = t
      requestAnimationFrame(sample)
    })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/?perf', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window._gallery?.ready, { timeout: 120000 })
  const identity = await page.evaluate(() => {
    const state = window.__sceneTest
    state.renderer = __perf.renderer
    __perf.renderer.domElement.addEventListener('webglcontextlost', () => state.lost++)
    const floors = new Set()
    const wells = new Map()
    _gallery.model.traverse(mesh => {
      if (!mesh.isMesh) return
      const label = mesh.userData.galleryBakeLabel
      if (label !== 'floor' && !/^well-\d{2}$/.test(label)) return
      for (const material of [mesh.material].flat()) {
        const texture = __perf.renderer.properties.get(material).uniforms?.uBakedDiffuse?.value
        if (!texture) continue
        if (label === 'floor') floors.add(texture)
        else wells.set(label, texture)
      }
    })
    return { floorOriginal: floors.size > 0 && [...floors].every(t => !t.isCompressedTexture && t.image.width === _gallery.settings.lightmaps.floor.width),
      wellsOriginal: wells.size === 7 && [...wells].every(([label, t]) => !t.isCompressedTexture && t.image.width === _gallery.settings.lightmaps[label].width),
      token: state.token, programs: __perf.renderer.info.programs.length,
      textures: __perf.renderer.info.memory.textures,
      galleryRequests: performance.getEntriesByType('resource').filter(r => r.name.includes('/gallery-baked-assets/')).length }
  })
  assert(identity.floorOriginal, 'Floor lighting must use its full-resolution original PNG, including on mobile')
  assert(identity.wellsOriginal, 'All seven ceiling recesses must use their original PNGs without replacing the ceiling')
  const result = { width, touch, views: [], cycles: [] }
  // First visits, not a warmed second walk. These previously added programs /
  // textures and caused ~267–300ms gaps around the bottle and lamp.
  for (let i = 0; i < projects.length; i++) {
    await page.evaluate(i => {
      const ex = __perf.exhibits[i]
      __perf.setView(ex.group.position.x, ex.group.position.z - 3, Math.PI)
      window.__sceneTest.frames.length = 0
    }, i)
    await page.waitForTimeout(650)
    const view = await page.evaluate(i => {
      const samples = __sceneTest.frames.slice(1).sort((a, b) => a - b)
      return { project: __perf.exhibits[i].project, programs: __perf.renderer.info.programs.length,
        textures: __perf.renderer.info.memory.textures, p95Ms: samples[Math.floor(samples.length * .95)],
        maxMs: Math.max(...samples) }
    }, i)
    result.views.push(view)
    assert.equal(view.programs, identity.programs, 'First visit must not compile new shader variants')
    assert.equal(view.textures, identity.textures, 'First visit must not upload more static textures')
    assert(view.maxMs < 100, `First ${view.project} visit stalled ${view.maxMs}ms`)
  }

  // Real raycast click + pulse on Mac-Lamp, then each remaining project's real
  // document and Exit. Verify actual renderer identity and unchanged GPU counts.
  for (const project of ['mac-lamp', ...projects.filter(p => p !== 'mac-lamp')]) {
    if (project === 'mac-lamp') {
      await page.evaluate(() => {
        const ex = __perf.exhibits.find(e => e.project === 'Mac-Lamp')
        __perf.setView(ex.group.position.x, ex.group.position.z - 3, Math.PI)
      })
      await page.waitForTimeout(300)
      const point = await page.evaluate(() => {
        const ex = __perf.exhibits.find(e => e.project === 'Mac-Lamp'), { THREE } = _3dDebug
        const v = new THREE.Box3().setFromObject(ex.group).getCenter(new THREE.Vector3()).project(__perf.camera)
        return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2 }
      })
      await page.mouse.click(point.x, point.y)
    } else {
      await page.evaluate(project => window._nav(`/${project}2d.html?from=3d&scene=default`, 'left'), project)
    }
    await page.waitForSelector('#project-viewer')
    const frame = page.frameLocator('#project-viewer')
    await frame.locator('.exit-3d-btn').waitFor()
    assert(page.url().includes(`/${project}2d.html?from=3d`))
    const before = await page.evaluate(() => ({ frame: __perf.renderer.info.render.frame,
      position: __perf.camera.position.toArray() }))
    await page.waitForTimeout(150)
    assert.equal(await page.evaluate(() => __perf.renderer.info.render.frame), before.frame, 'Scene must pause behind project')
    if (project === 'unify') {
      assert(await frame.locator('video').count() > 0, 'Unify must retain its videos')
      await frame.locator('video').first().evaluate(async video => {
        video.muted = true
        await video.play()
      })
    }
    await frame.locator('.exit-3d-btn').click()
    await page.waitForSelector('#project-viewer', { state: 'detached' })
    await page.waitForTimeout(100)
    const cycle = await page.evaluate(() => ({ token: __sceneTest.token,
      sameRenderer: __sceneTest.renderer === __perf.renderer, textures: __perf.renderer.info.memory.textures,
      programs: __perf.renderer.info.programs.length, position: __perf.camera.position.toArray(),
      galleryRequests: performance.getEntriesByType('resource').filter(r => r.name.includes('/gallery-baked-assets/')).length }))
    assert.equal(cycle.token, identity.token, 'Exit must retain the scene document')
    assert(cycle.sameRenderer, 'Exit must retain the WebGL renderer')
    assert.equal(cycle.galleryRequests, identity.galleryRequests, 'Exit must not reload gallery assets')
    assert.equal(cycle.textures, identity.textures)
    assert.equal(cycle.programs, identity.programs)
    assert.equal(cycle.position[0], before.position[0]); assert.equal(cycle.position[2], before.position[2])
    result.cycles.push({ project, ...cycle })
  }
  await page.goForward()
  await page.waitForSelector('#project-viewer')
  await page.goBack()
  await page.waitForSelector('#project-viewer', { state: 'detached' })
  assert.equal(await page.evaluate(() => __sceneTest.token), identity.token)

  await page.evaluate(() => { resetScene(); __sceneTest.frames.length = 0 })
  const start = await page.evaluate(() => __perf.camera.position.toArray())
  await page.keyboard.down('w'); await page.waitForTimeout(1000); await page.keyboard.up('w')
  result.walk = await page.evaluate(() => ({ position: __perf.camera.position.toArray(),
    maxMs: Math.max(...__sceneTest.frames.slice(1)) }))
  assert(Math.hypot(result.walk.position[0] - start[0], result.walk.position[2] - start[2]) > .1, 'Walking must resume after Exit')
  assert(result.walk.maxMs < 100, `Walking stalled ${result.walk.maxMs}ms`)

  // Both mouse orbit buttons, then touch swipe and breakpoint coverage with
  // touch emulation enabled (the site's pointer:fine shrink cap matters).
  if (!touch) for (const button of ['right', 'middle']) {
    const yaw = await page.evaluate(() => __perf.camera.rotation.y)
    await page.mouse.move(700, 500); await page.mouse.down({ button })
    await page.mouse.move(760, 500, { steps: 5 }); await page.mouse.up({ button })
    assert.notEqual(await page.evaluate(() => __perf.camera.rotation.y), yaw)
  }
  if (touch) {
    const cdp = await context.newCDPSession(page)
    const yaw = await page.evaluate(() => __perf.camera.rotation.y)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 170, y: 450 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 250, y: 450 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(100)
    assert.notEqual(await page.evaluate(() => __perf.camera.rotation.y), yaw)
    await page.evaluate(() => resetScene())
    const stick = await page.locator('#joystick-base').boundingBox()
    const before = await page.evaluate(() => __perf.camera.position.toArray())
    const x = stick.x + stick.width / 2, y = stick.y + stick.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 35 }] })
    await page.waitForTimeout(700)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    const after = await page.evaluate(() => __perf.camera.position.toArray())
    assert(Math.hypot(after[0] - before[0], after[2] - before[2]) > .1, 'Touch joystick must resume after Exit')
    for (const w of [390, 430, 744, 768, 844, 859, 861]) {
      await page.setViewportSize({ width: w, height: 1000 })
      await page.evaluate(() => _nav('/kaffeemaschine2d.html?from=3d&scene=default', 'left'))
      await page.frameLocator('#project-viewer').locator('.exit-3d-btn').waitFor()
      const box = await page.locator('#project-viewer').boundingBox()
      assert.equal(box.width, w); assert.equal(box.height, 1000)
      await page.frameLocator('#project-viewer').locator('.exit-3d-btn').click()
      await page.waitForSelector('#project-viewer', { state: 'detached' })
    }
  }
  // Direct/bookmarked case studies still have a working standalone Exit.
  await page.goto(base + '/vaccine2d.html?from=3d&scene=default')
  await page.locator('.exit-3d-btn').click()
  await page.waitForURL(base + '/')
  await page.waitForFunction(() => window._gallery?.ready, { timeout: 120000 })
  assert.deepEqual(errors, [], 'No browser script errors')
  report.results.push(result)
  console.log(`PASS: ${width}px ${touch ? 'touch' : 'desktop'}: six first visits, six project cycles, same renderer, no scene reload, stable resources, history and controls`)
  await context.close()
}

try {
  await check({ width: 1440, touch: false })
  await check({ width: 390, touch: true })
  if (process.env.PERF_REPORT) await fs.writeFile(process.env.PERF_REPORT, JSON.stringify(report, null, 2) + '\n')
} finally {
  await browser.close()
}
