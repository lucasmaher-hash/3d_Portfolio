let language = (() => { try { return localStorage.getItem('lang') === 'de' ? 'de' : 'en' } catch { return 'en' } })()
document.documentElement.lang = language
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
const translations = {
  en: { back: 'Back to About', title: 'Sketchbook', intro: 'A short selection of my artworks.<br><span class="hint">(click for the next one, hold to open full screen)</span>', next: 'Next drawing', timeline: 'Drawing, oldest to newest', about: 'About' },
  de: { back: 'Zurück zu Über mich', title: 'Skizzenbuch', intro: 'Eine kleine Auswahl meiner Kunstwerke.<br><span class="hint">(klicken für das nächste, gedrückt halten für Vollbild)</span>', next: 'Nächste Zeichnung', timeline: 'Zeichnung, von alt nach neu', about: 'Über mich' },
}
let copy = translations[language]
const stack = document.querySelector('.stack')
const stackButton = document.querySelector('.stack-button')
const range = document.querySelector('#timeline')
function translate() {
  copy = translations[language]
  document.documentElement.lang = language
  document.title = `${copy.title} — Lucas Maher`
  for (const element of document.querySelectorAll('[data-copy]')) element.innerHTML = copy[element.dataset.copy]
  document.querySelector('.back').setAttribute('aria-label', copy.back)
  document.querySelector('[data-menu-about]').textContent = copy.about
  range.setAttribute('aria-label', copy.timeline)
  for (const button of document.querySelectorAll('[data-lang]')) button.classList.toggle('is-active', button.dataset.lang === language)
}
translate()
const response = await fetch('/sketchbook/drawings.json')
if (!response.ok) throw new Error('Sketchbook collection could not be loaded')
const drawings = (await response.json()).sort((a, b) => a.date.localeCompare(b.date))
let index = 0
range.max = drawings.length - 1

// Each drawing owns a fixed position in the stack. Viewed pages disappear;
// the remaining pages stay where they were, so the stack visibly shrinks.
// Size the drawing's box to its own ratio, edge to edge along the long side and
// centred, and place the two glass bands in what is left of the square
// (portrait: left + right, landscape: top + bottom; a square drawing gets none).
// Runs again once the file has loaded (naturalWidth is 0 before that).
const glassRim = () => Math.min(20, Math.max(0, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--glass-rim')) || 0)) / 100
const fitters = []
const BACK_RIM = 2.6 // sheets still waiting in the stack get a wider frame than the revealed one
function fitSheet(image, art, bands, isCurrent) {
  const apply = () => {
    const nw = image.naturalWidth, nh = image.naturalHeight
    if (!nw || !nh) return
    const ratio = nw / nh, rim = glassRim() * (isCurrent() ? 1 : BACK_RIM), s = 1 - 2 * rim
    const w = (ratio < 1 ? ratio : 1) * s, h = (ratio < 1 ? 1 : 1 / ratio) * s
    const L = (1 - w) * 50, T = (1 - h) * 50
    // inset FIRST: the shorthand would otherwise reset left/top to auto.
    Object.assign(art.style, { inset: 'auto', left: `${L}%`, top: `${T}%`, width: `${w * 100}%`, height: `${h * 100}%` })
    const box = (band, l, tp, bw, bh) => Object.assign(band.style, { inset: 'auto', left: `${l}%`, top: `${tp}%`, width: `${bw}%`, height: `${bh}%` })
    const [a, b, c, d] = bands
    box(a, 0, 0, L, 100); box(b, 100 - L, 0, L, 100)
    box(c, L, 0, w * 100, T); box(d, L, 100 - T, w * 100, T)
    for (const band of bands) band.hidden = ratio === 1 && rim === 0
  }
  fitters.push(apply)
  if (image.complete) apply()
  image.addEventListener('load', () => { apply(); if (typeof syncFrontGlass === 'function') syncFrontGlass() })
}
const sheets = Array.from({ length: drawings.length }, (_, slot) => {
  const drawingIndex = drawings.length - 1 - slot
  const sheet = document.createElement('span')
  sheet.className = 'sheet'
  const bands = [0, 1, 2, 3].map(() => { const band = document.createElement('span'); band.className = 'glass'; return band })
  const art = document.createElement('span')
  art.className = 'art'
  const image = new Image()
  image.src = drawings[drawingIndex].src
  image.alt = ''; image.draggable = false
  fitSheet(image, art, bands, () => sheet.classList.contains('is-current'))
  art.append(image); sheet.append(...bands, art); stack.append(sheet)
  return { sheet, drawingIndex }
})

// Real frosted glass for the sheet in front. backdrop-filter does nothing to an
// element inside the stack's preserve-3d (Chrome: no blur at all, checked
// 2026-11-01), so the current sheet's two bands are drawn again in a flat
// overlay beside the stack, carrying the same 3D transform. Flat, its backdrop
// is the whole rendered stack, so the sheets behind blur through it like the
// gimaguas.com header. It paints above the stack, which is right only for the
// front sheet - exactly the one it copies. The other sheets keep plain veils.
const frontGlass = document.createElement('span')
frontGlass.className = 'glass-front'
frontGlass.setAttribute('aria-hidden', 'true')
const frontBands = [0, 1, 2, 3].map(() => { const band = document.createElement('span'); band.className = 'glass'; frontGlass.append(band); return band })
stackButton.append(frontGlass)
function syncFrontGlass() {
  const current = sheets.find(item => item.drawingIndex === index)
  if (!current) return
  frontGlass.style.transform = `${getComputedStyle(stack).transform} ${current.sheet.style.transform}`
  current.sheet.querySelectorAll('.glass').forEach((band, i) => { frontBands[i].style.cssText = band.style.cssText; frontBands[i].hidden = band.hidden })
}
window.addEventListener('sketchbook-orientation', () => { fitters.forEach(fn => fn()); syncFrontGlass() })

// At angles viewed from behind, chronological order starts on that visible side.
let reverseView = true
window.addEventListener('sketchbook-orientation', event => {
  const reverse = Math.cos(event.detail * Math.PI / 180) < 0
  if (reverse !== reverseView) { reverseView = reverse; sizeStack() }
})
// Spread the fixed planes through a depth equal to the square face's width.
function sizeStack() {
  const depth = stackButton.clientWidth
  stack.classList.toggle('reverse', reverseView)
  for (const { sheet, drawingIndex } of sheets) {
    sheet.style.transform = `translateZ(${-depth * (reverseView ? drawings.length - 1 - drawingIndex : drawingIndex) / Math.max(1, drawings.length - 1)}px)`
  }
  syncFrontGlass()
}
sizeStack()
window.addEventListener('resize', sizeStack)

// Decode placeholders ahead of time so changing a page never flashes a blank.
await Promise.all(drawings.map(drawing => {
  const image = new Image(); image.src = drawing.src
  return image.decode().catch(() => {})
}))
function render(animate = true) {
  const drawing = drawings[index]
  for (const { sheet, drawingIndex } of sheets) {
    const opacity = drawingIndex < index ? 0 : 1
    const presented = Number(getComputedStyle(sheet).opacity)
    for (const animation of sheet.getAnimations()) animation.cancel()
    sheet.style.opacity = opacity
    sheet.classList.toggle('is-current', drawingIndex === index)
    sheet.classList.toggle('is-gone', drawingIndex < index)
    if (animate && !reduceMotion.matches && Math.abs(presented - opacity) > 0.001) {
      sheet.animate([{ opacity: presented }, { opacity }], { duration: 230, easing: 'ease-in-out' })
    }
  }
  fitters.forEach(fn => fn()) // the revealed sheet drops to the slim frame at once, the others keep the wide one
  syncFrontGlass()
  range.value = index
  document.querySelector('.timeline-art').style.setProperty('--progress', `${index / Math.max(1, drawings.length - 1) * 100}%`)
  range.setAttribute('aria-valuetext', `${index + 1} / ${drawings.length}: ${drawing.title[language]}`)
  stackButton.setAttribute('aria-label', `${drawing.title[language]}. ${copy.next}`)
  stackButton.dataset.index = index
}
function select(value, animate = true) {
  if (preview) return
  const nextIndex = Math.max(0, Math.min(drawings.length - 1, Math.round(value)))
  if (nextIndex === index) return
  index = nextIndex; render(animate)
}
let preview = null, press = null, suppressClickUntil = 0, previewControls = null

function fitPreviewImage(image, nw, nh) {
  const fit = Math.min(Math.min(innerWidth * .9, 1100) / nw, innerHeight * .88 / nh)
  image.style.width = `${nw * fit}px`; image.style.height = `${nh * fit}px`
  return fit
}
function stepPreview(direction, slide = false, onSwapped = null) {
  if (!preview || !previewControls) return
  const next = index + direction
  if (next < 0 || next > drawings.length - 1) return
  // Leave the lift: the sheet that flew out goes back, the new picture simply replaces the old one.
  if (lift) { lift.scene.remove(); lift.sheet.style.visibility = ''; lift = null }
  index = next; render(false)
  const { image, placeChevrons } = previewControls
  const drawing = drawings[index]
  const sheetImage = sheets.find(item => item.drawingIndex === index)?.sheet.querySelector('img')
  image.style.visibility = ''
  image.src = drawing.src; image.alt = drawing.title[language]
  preview.setAttribute('aria-label', drawing.title[language])
  if (sheetImage?.naturalWidth) fitPreviewImage(image, sheetImage.naturalWidth, sheetImage.naturalHeight)
  if (slide) {
    // Swipe: the neighbour already slid into the middle; hand over to the real image once it has decoded.
    image.style.transform = ''
    const done = () => onSwapped?.()
    image.decode ? image.decode().then(done, done) : done()
  } else if (!reduceMotion.matches) image.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' })
  placeChevrons()
}

const artInset = () => 1 - 2 * glassRim() // the drawing runs edge to edge along its long side; glass only fills the rest of the square
let lift = null

function openPreview() {
  if (preview) return
  const drawing = drawings[index]
  const current = sheets.find(item => item.drawingIndex === index)
  const overlay = document.createElement('div')
  overlay.className = 'sketch-preview'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', drawing.title[language])
  overlay.tabIndex = -1
  const image = new Image()
  image.src = drawing.src
  image.alt = drawing.title[language]
  overlay.append(image)
  document.body.append(overlay)
  preview = overlay
  overlay.focus({ preventScroll: true })
  // The new Image above may not have decoded yet (Safari): read the size from the sheet's own, already loaded picture.
  const loaded = current?.sheet.querySelector('img')
  const nw = image.naturalWidth || loaded?.naturalWidth || 0, nh = image.naturalHeight || loaded?.naturalHeight || 0
  if (nw && nh) {
    const fit = Math.min(Math.min(innerWidth * .9, 1100) / nw, innerHeight * .88 / nh)
    image.style.width = `${nw * fit}px`; image.style.height = `${nh * fit}px`
    if (!reduceMotion.matches && current) startLift(overlay, image, current, nw, nh, fit)
  }
  // Two minimal chevrons beside the picture (and the arrow keys) step through the drawings while it is open.
  const chevrons = [-1, 1].map(direction => {
    const button = document.createElement('button')
    button.type = 'button'; button.className = 'preview-step'
    button.setAttribute('aria-label', direction < 0 ? copy.prev || 'Previous' : copy.next)
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction < 0 ? 'M15 4 7 12l8 8' : 'M9 4l8 8-8 8'}"/></svg>`
    button.addEventListener('pointerdown', event => event.stopPropagation())
    button.addEventListener('click', event => { event.stopPropagation(); stepPreview(direction) })
    overlay.append(button)
    return { button, direction }
  })
  // One fixed spot per orientation (so the chevrons never hop between pictures of the same kind): just
  // outside the widest portrait picture, or outside the widest landscape one.
  const placeChevrons = () => {
    const sizeOf = img => img.naturalWidth * Math.min(Math.min(innerWidth * .9, 1100) / img.naturalWidth, innerHeight * .88 / img.naturalHeight)
    const current = sheets.find(item => item.drawingIndex === index)?.sheet.querySelector('img')
    const landscape = !!current?.naturalWidth && current.naturalWidth > current.naturalHeight
    let half = 0, halfH = 0
    for (const { sheet } of sheets) {
      const img = sheet.querySelector('img')
      if (img?.naturalWidth && (img.naturalWidth > img.naturalHeight) === landscape) {
        half = Math.max(half, sizeOf(img) / 2)
        halfH = Math.max(halfH, sizeOf(img) * img.naturalHeight / img.naturalWidth / 2)
      }
    }
    if (!half) half = image.getBoundingClientRect().width / 2
    if (matchMedia('(max-width: 540px)').matches) {
      // Phones: both chevrons sit centred under the picture with a gap between them, at one fixed height per orientation.
      const top = Math.min(innerHeight - 40, innerHeight / 2 + (halfH || image.getBoundingClientRect().height / 2) + 12 + 32)
      for (const { button, direction } of chevrons) {
        button.style.top = `${top}px`
        button.style.left = `${innerWidth / 2 + (direction < 0 ? -14 - 44 : 14)}px`
        button.disabled = index + direction < 0 || index + direction > drawings.length - 1
      }
      return
    }
    for (const { button, direction } of chevrons) {
      button.style.top = `${innerHeight / 2}px`
      button.style.left = `${Math.max(4, Math.min(innerWidth - 48, innerWidth / 2 + direction * (half + 12) - (direction < 0 ? 44 : 0)))}px`
      button.disabled = index + direction < 0 || index + direction > drawings.length - 1
    }
  }
  previewControls = { image, placeChevrons, overlay }
  placeChevrons()
  addEventListener('resize', () => { if (preview === overlay) placeChevrons() })
  for (const { button } of chevrons) button.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: reduceMotion.matches ? 0 : 700, easing: 'ease-out', fill: 'backwards' })
  // A fresh press on the overlay is an intentional close, even immediately
  // after the long press. The release that opened it must not close it again.
  overlay.addEventListener('pointerdown', () => { suppressClickUntil = 0 })
  // Phones: drag the picture sideways like a photo gallery. It follows the finger; past a quarter of the width (or a flick) it
  // slides out and the next one slides in; short of that it springs back. At either end it only gives a little, then returns.
  let startX = 0, startY = 0, axis = null, dragging = false, lastX = 0, lastT = 0, vx = 0, busy = false
  let ghost = null, ghostDir = 0, travel = 0
  // Like Apple Photos: pulling a picture down drags it freely with the finger, it shrinks as it goes and the backdrop fades with it.
  // Let go far enough (or with a downward flick) and it flies back into the stack and closes; otherwise it springs back.
  let dismissing = false, vy = 0, lastY = 0, dismissAmount = 0
  const backdrop = .7
  const dismissLook = (dx, dy) => {
    const progress = Math.min(1, Math.max(0, dy) / (innerHeight * .55))
    dismissAmount = progress
    image.style.transform = `translate(${dx}px, ${dy}px) scale(${1 - .5 * progress})`
    overlay.style.background = `rgba(18, 20, 19, ${backdrop * (1 - progress)})`
    for (const button of overlay.querySelectorAll('.preview-step')) button.style.opacity = String(1 - Math.min(1, progress * 4))
  }
  const GAP = 24
  const removeGhost = () => { ghost?.remove(); ghost = null; ghostDir = 0 }
  // The neighbour is laid out beside the picture while dragging, so the gallery reads as a strip of pictures.
  const makeGhost = dir => {
    const n = index + dir
    if (n < 0 || n > drawings.length - 1) return
    const src = sheets.find(item => item.drawingIndex === n)?.sheet.querySelector('img')
    if (!src?.naturalWidth) return
    ghost = new Image(); ghost.src = drawings[n].src; ghost.alt = ''
    const fit = Math.min(Math.min(innerWidth * .9, 1100) / src.naturalWidth, innerHeight * .88 / src.naturalHeight)
    const gw = src.naturalWidth * fit, gh = src.naturalHeight * fit
    Object.assign(ghost.style, { position: 'absolute', left: '50%', top: '50%', width: `${gw}px`, height: `${gh}px`, marginLeft: `${-gw / 2}px`, marginTop: `${-gh / 2}px`, pointerEvents: 'none' })
    ghostDir = dir
    travel = image.getBoundingClientRect().width / 2 + GAP + gw / 2
    overlay.append(ghost)
  }
  const place = dx => {
    const edge = (dx < 0 && index >= drawings.length - 1) || (dx > 0 && index <= 0)
    image.style.transform = `translateX(${edge ? dx * .3 : dx}px)`
    if (ghost) ghost.style.transform = `translateX(${dx + ghostDir * travel}px)`
  }
  overlay.addEventListener('touchstart', event => {
    dragging = event.touches.length === 1 && !busy && !closing && image.style.visibility !== 'hidden'
    axis = null; vx = 0; vy = 0; dismissing = false
    if (dragging) { lastY = event.touches[0].clientY; startX = lastX = event.touches[0].clientX; startY = event.touches[0].clientY; lastT = event.timeStamp }
  }, { passive: true })
  overlay.addEventListener('touchmove', event => {
    if (!dragging || event.touches.length !== 1) return
    const x = event.touches[0].clientX, dx = x - startX, dy = event.touches[0].clientY - startY
    if (!axis && Math.hypot(dx, dy) > 10) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (axis === 'y' && dy > 0 && !ghost && (dismissing || Math.abs(dy) > 10)) dismissing = true
    if (dismissing) {
      event.preventDefault()
      const dtY = event.timeStamp - lastT, y = event.touches[0].clientY
      if (dtY > 0) vy = (y - lastY) / dtY
      lastY = y; lastT = event.timeStamp
      dismissLook(dx, dy)
      return
    }
    if (axis !== 'x') return
    event.preventDefault()
    const dt = event.timeStamp - lastT
    if (dt > 0) vx = (x - lastX) / dt
    lastX = x; lastT = event.timeStamp
    const dir = dx < 0 ? 1 : -1
    if (ghostDir !== dir) { removeGhost(); makeGhost(dir) }
    place(dx)
  }, { passive: false })
  const endSwipe = event => {
    if (!dragging) return
    dragging = false
    if (dismissing) {
      dismissing = false
      suppressClickUntil = performance.now() + 450
      const endY = event.changedTouches?.[0]?.clientY ?? lastY, endX = event.changedTouches?.[0]?.clientX ?? lastX
      const dy = endY - startY, dx = endX - startX
      const ease = 'cubic-bezier(.22, .61, .36, 1)'
      if (dy > 110 || vy > .6) {
        closeWithFlight({ x: dx, y: dy, scale: 1 - .5 * dismissAmount })
      } else {
        image.animate([{ transform: image.style.transform }, { transform: 'none' }], { duration: 300, easing: ease }); image.style.transform = ''
        overlay.animate([{ background: overlay.style.background }, { background: `rgba(18, 20, 19, ${backdrop})` }], { duration: 300, easing: ease }).onfinish = () => { overlay.style.background = '' }
        for (const button of overlay.querySelectorAll('.preview-step')) button.style.opacity = ''
      }
      return
    }
    if (axis !== 'x') return
    suppressClickUntil = performance.now() + 450
    const dx = (event.changedTouches?.[0]?.clientX ?? lastX) - startX
    const direction = dx < 0 ? 1 : -1
    const far = Math.abs(dx) >= Math.max(40, innerWidth * .25), flick = Math.abs(vx) >= .5 && Math.sign(vx) === Math.sign(dx)
    const next = index + direction
    const ease = 'cubic-bezier(.22, .61, .36, 1)'
    if (!dx || (!far && !flick) || next < 0 || next > drawings.length - 1) {
      const from = image.style.transform || 'none', gFrom = ghost?.style.transform
      image.animate([{ transform: from }, { transform: 'none' }], { duration: 260, easing: ease }); image.style.transform = ''
      if (ghost) { const g = ghost; g.animate([{ transform: gFrom }, { transform: `translateX(${ghostDir * travel}px)` }], { duration: 260, easing: ease }).onfinish = () => g.remove(); ghost = null; ghostDir = 0 }
      return
    }
    busy = true
    const run = reduceMotion.matches ? 0 : 300
    const from = image.style.transform, gFrom = ghost?.style.transform
    if (run) {
      image.animate([{ transform: from }, { transform: `translateX(${-direction * travel}px)` }], { duration: run, easing: ease, fill: 'forwards' })
      ghost?.animate([{ transform: gFrom }, { transform: 'translateX(0)' }], { duration: run, easing: ease, fill: 'forwards' })
    }
    setTimeout(() => {
      // Swap under the ghost (it sits exactly where the new picture will be), then drop the ghost once the real one has decoded.
      image.getAnimations().forEach(animation => animation.cancel())
      stepPreview(direction, true, () => { removeGhost(); busy = false })
    }, run)
  }
  overlay.addEventListener('touchend', endSwipe, { passive: true })
  overlay.addEventListener('touchcancel', endSwipe, { passive: true })
  overlay.addEventListener('click', event => {
    event.stopPropagation()
    if (performance.now() >= suppressClickUntil) closeWithFlight()
  })
}

// The sheet itself detaches: a clone of it is placed in a copy of the stack's
// 3D scene, over the dimmed page, and flies from its slot to the screen centre
// while the stack's rotation is undone. The glass frame dissolves on the way.
function startLift(overlay, image, current, nw, nh, fit) {
  const box = stackButton.getBoundingClientRect()
  const side = stackButton.clientWidth
  const scene = document.createElement('div')
  scene.className = 'lift-scene'
  Object.assign(scene.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` })
  const rig = document.createElement('div')
  rig.className = 'lift-rig'
  const matrix = new DOMMatrix(getComputedStyle(stack).transform)
  rig.style.transform = matrix.toString()
  const clone = current.sheet.cloneNode(true)
  clone.style.opacity = 1
  clone.classList.remove('is-current')
  const cloneImage = clone.querySelector('img')
  rig.append(clone); scene.append(rig); overlay.append(scene)
  image.style.visibility = 'hidden'
  current.sheet.style.visibility = 'hidden'
  // The frosted front glass cannot travel with the sheet (blur does not work in 3D), and the clone's
  // own bands are flat veils: swapping one for the other popped. The frosted glass fades out in place,
  // the clone carries none.
  frontGlass.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' })
  for (const band of clone.querySelectorAll('.glass')) band.style.visibility = 'hidden'

  const z0 = new DOMMatrix(current.sheet.style.transform).m43
  const shown = Math.min(side * artInset() / nw, side * artInset() / nh) // contain-fit inside the frame
  const k = fit / shown
  const dx = innerWidth / 2 - (box.left + box.width / 2)
  const dy = innerHeight / 2 - (box.top + box.height / 2)
  const end = matrix.inverse().multiply(new DOMMatrix().translate(dx, dy).scale(k))
  const timing = { duration: 1050, easing: 'cubic-bezier(.5, 0, .15, 1)', fill: 'forwards' }
  const sheetMove = clone.animate([
    { transform: `translate3d(0, 0, ${z0}px)` },
    { transform: end.toString() },
  ], timing)
  // Dissolve the glass border during the second half of the flight.
  // The artwork is pre-flipped while the sheet shows its back face (the stack seen from behind), and
  // handed back the moment the sheet turns edge-on. Decided every frame from the sheet's real,
  // animated orientation - a precomputed keyframe offset was off by a few frames and showed the
  // painting mirrored for an instant.
  const faceFlip = () => {
    const world = matrix.multiply(new DOMMatrix(getComputedStyle(clone).transform))
    cloneImage.style.transform = world.m33 < 0 ? 'scaleX(-1)' : 'scaleX(1)'
  }
  faceFlip()
  const watch = () => { if (lift?.scene !== scene) return; faceFlip(); requestAnimationFrame(watch) }
  requestAnimationFrame(watch)
  overlay.animate([{ backgroundColor: 'rgba(18,20,19,0)' }, { backgroundColor: 'rgba(18,20,19,.7)' }], { duration: 950, easing: 'cubic-bezier(.45, 0, .2, 1)' })
  lift = { scene, sheet: current.sheet }
  sheetMove.finished.then(() => {
    if (lift?.scene !== scene) return
    image.style.visibility = ''
    scene.remove()
  }).catch(() => {})
}

// The opening in reverse: the picture shrinks back into its sheet, the sheet turns back into the stack's rotation and slots in
// at its place while the backdrop clears. `drag` carries where a pull-down left the picture.
let closing = false
function closeWithFlight(drag = { x: 0, y: 0, scale: 1 }) {
  if (!preview || closing) return
  const overlay = preview
  const image = overlay.querySelector(':scope > img')
  const current = sheets.find(item => item.drawingIndex === index)
  const sheetImage = current?.sheet.querySelector('img')
  if (reduceMotion.matches || lift?.scene.isConnected || !image || !sheetImage?.naturalWidth) { closePreview(); return }
  closing = true
  const nw = sheetImage.naturalWidth, nh = sheetImage.naturalHeight
  const box = stackButton.getBoundingClientRect(), side = stackButton.clientWidth
  const scene = document.createElement('div')
  scene.className = 'lift-scene'
  Object.assign(scene.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` })
  const rig = document.createElement('div')
  rig.className = 'lift-rig'
  const matrix = new DOMMatrix(getComputedStyle(stack).transform)
  rig.style.transform = matrix.toString()
  const clone = current.sheet.cloneNode(true)
  clone.style.opacity = 1
  clone.style.visibility = 'visible' // the sheet itself has been hidden since the lift
  clone.classList.remove('is-current')
  const cloneImage = clone.querySelector('img')
  for (const band of clone.querySelectorAll('.glass')) band.style.visibility = 'hidden'
  rig.append(clone); scene.append(rig); overlay.append(scene)
  const fit = image.offsetWidth / nw
  const shown = Math.min(side * artInset() / nw, side * artInset() / nh)
  const k = fit / shown
  const dx = innerWidth / 2 - (box.left + box.width / 2) + drag.x
  const dy = innerHeight / 2 - (box.top + box.height / 2) + drag.y
  const start = matrix.inverse().multiply(new DOMMatrix().translate(dx, dy).scale(k * drag.scale))
  const z0 = new DOMMatrix(current.sheet.style.transform).m43
  image.style.visibility = 'hidden'
  current.sheet.style.visibility = 'hidden'
  lift = { scene, sheet: current.sheet }
  const faceFlip = () => {
    const world = matrix.multiply(new DOMMatrix(getComputedStyle(clone).transform))
    cloneImage.style.transform = world.m33 < 0 ? 'scaleX(-1)' : 'scaleX(1)'
  }
  faceFlip()
  const duration = 780
  const move = clone.animate([{ transform: start.toString() }, { transform: `translate3d(0, 0, ${z0}px)` }], { duration, easing: 'cubic-bezier(.45, 0, .3, 1)', fill: 'forwards' })
  const watch = () => { if (!closing) return; faceFlip(); requestAnimationFrame(watch) }
  requestAnimationFrame(watch)
  overlay.animate([{ backgroundColor: getComputedStyle(overlay).backgroundColor }, { backgroundColor: 'rgba(18,20,19,0)' }], { duration: duration * .9, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' })
  overlay.style.background = 'none'
  for (const button of overlay.querySelectorAll('.preview-step')) button.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' })
  // The frosted glass comes back over the last stretch, as the sheet settles into the stack.
  frontGlass.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration * .4, delay: duration * .6, fill: 'both' })
  move.finished.then(() => { closing = false; closePreview() }, () => { closing = false; closePreview() })
}

function closePreview() {
  if (!preview) return
  const overlay = preview
  preview = null
  if (lift) { lift.sheet.style.visibility = ''; lift = null }
  for (const animation of frontGlass.getAnimations()) animation.cancel()
  frontGlass.style.visibility = ''
  overlay.remove()
  stackButton.focus({ preventScroll: true })
}

stackButton.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.shiftKey || preview) return
  press = { x: event.clientX, y: event.clientY, id: event.pointerId, opened: false }
  stackButton.setPointerCapture(event.pointerId)
  press.timer = setTimeout(() => { if (press) { press.opened = true; openPreview() } }, 500)
})
stackButton.addEventListener('pointermove', event => {
  if (press && press.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) {
    clearTimeout(press.timer); press = null
  }
})
function endPress(event) {
  if (!press || press.id !== event.pointerId) return
  clearTimeout(press.timer)
  if (press.opened) suppressClickUntil = performance.now() + 700
  press = null
}
document.addEventListener('pointerup', endPress, true)
document.addEventListener('pointercancel', endPress, true)
// Phones: a small button under the cube opens the current drawing big (the same view the long press opens).
const back = document.querySelector('.back')
const backHit = document.createElement('a')
backHit.className = 'back-hit'; backHit.href = back.getAttribute('href'); backHit.tabIndex = -1; backHit.setAttribute('aria-hidden', 'true')
document.body.append(backHit)
const placeBackHit = () => { const box = back.getBoundingClientRect(); backHit.style.left = `${box.left + box.width / 2 - 26}px`; backHit.style.top = `${box.top + box.height / 2 - 24}px` }
placeBackHit(); addEventListener('resize', placeBackHit); document.fonts?.ready.then(placeBackHit); addEventListener('load', placeBackHit)
const bigButton = document.createElement('button')
bigButton.type = 'button'; bigButton.className = 'big-button'
bigButton.setAttribute('aria-label', language === 'de' ? 'Groß anzeigen' : 'View full screen')
bigButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3"/></svg>'
bigButton.addEventListener('click', () => {
  if (preview) return
  const at = scale => ({ transform: `translate(-50%, -50%) scale(${scale})` })
  // Squash, overshoot, settle; the big view opens while it is still springing.
  if (!reduceMotion.matches) bigButton.animate([at(1), at(.82), at(1.14), at(.97), at(1)], { duration: 420, easing: 'ease-out' })
  setTimeout(() => { if (!preview) openPreview() }, reduceMotion.matches ? 0 : 140)
})
document.body.append(bigButton)
stackButton.addEventListener('contextmenu', event => event.preventDefault())
document.addEventListener('click', event => {
  if (performance.now() < suppressClickUntil && !event.target.closest('.sketch-preview')) {
    event.preventDefault(); event.stopImmediatePropagation(); suppressClickUntil = 0
  }
}, true)
stackButton.addEventListener('click', () => select(index === drawings.length - 1 ? 0 : index + 1))
document.addEventListener('click', event => {
  if (preview) return
  if (!matchMedia('(pointer: coarse)').matches) return
  if (event.target.closest('.stack-button, .intro, #top-bar, .mobile-menu, .layout-panel, a, button, input')) return
  if (document.querySelector('.mobile-menu.open')) return
  // The intro deliberately lets pointer events through, so check its bounds too.
  const intro = document.querySelector('.intro').getBoundingClientRect()
  if (event.clientX >= intro.left && event.clientX <= intro.right && event.clientY >= intro.top && event.clientY <= intro.bottom) return
  select(index === drawings.length - 1 ? 0 : index + 1)
})
range.addEventListener('input', () => select(Number(range.value), false))
// Group a trackpad gesture into deliberate pages, rather than racing to the end
// on the first scroll. New gestures, including reverse gestures, remain responsive.
let wheelSum = 0, lastWheel = 0, lastTurn = 0
window.addEventListener('wheel', event => {
  if (preview) { event.preventDefault(); return }
  if (event.target.closest('.layout-panel')) return
  if (event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return
  event.preventDefault()
  const now = performance.now()
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1)
  if (now - lastWheel > 170 || Math.sign(delta) !== Math.sign(wheelSum)) wheelSum = 0
  lastWheel = now; wheelSum += delta
  if (Math.abs(wheelSum) >= 55 && now - lastTurn > 240) {
    select(index + Math.sign(wheelSum)); wheelSum = 0; lastTurn = now
  }
}, { passive: false })
window.addEventListener('keydown', event => {
  if (preview) {
    if (event.key === 'Escape') closeWithFlight()
    else if (['ArrowRight', 'ArrowDown'].includes(event.key)) { event.preventDefault(); stepPreview(1) }
    else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) { event.preventDefault(); stepPreview(-1) }
    return
  }
  if (event.target === range || event.metaKey || event.ctrlKey || event.altKey) return
  if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); select(index + 1) }
  if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); select(index - 1) }
  if (event.key === 'Home') { event.preventDefault(); select(0) }
  if (event.key === 'End') { event.preventDefault(); select(drawings.length - 1) }
})
render(false)
const nav = document.querySelector('#top-bar')
const menu = document.querySelector('#mobile-menu')
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== nav.contentWindow || !event.data) return
  const { type, lang, url } = event.data
  if (type === 'mobile-menu-toggle') menu.classList.toggle('open')
  if (type === 'nav-expand') nav.style.height = '400px'
  if (type === 'nav-collapse') nav.style.height = '140px'
  if (type === 'page-slide' && url) location.assign(url)
  if (type === 'lang-change' && translations[lang]) {
    language = lang; translate()
    render(false)
  }
})
menu.addEventListener('click', event => { if (event.target === menu) menu.classList.remove('open') })
document.querySelector('[data-enter-3d]').addEventListener('click', () => { try { sessionStorage.setItem('_enter3d', '1') } catch {} })
for (const button of document.querySelectorAll('[data-lang]')) button.addEventListener('click', () => {
  try { localStorage.setItem('lang', button.dataset.lang) } catch {}
  nav.contentWindow.postMessage({ type: 'lang-change', lang: button.dataset.lang }, location.origin)
})
document.body.dataset.ready = 'true'
// Temporary authoring controls are available only through the explicit preview link.
if (new URLSearchParams(location.search).get('tune') === '1') {
  import('/sketchbook/layout-tuner.js').then(({ installLayoutTuner }) => installLayoutTuner())
}
