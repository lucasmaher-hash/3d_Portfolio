let language = (() => { try { return localStorage.getItem('lang') === 'de' ? 'de' : 'en' } catch { return 'en' } })()
document.documentElement.lang = language
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
const translations = {
  en: { back: 'Back to About', title: 'Sketchbook', intro: 'A selection of my sketches and drawings of people, objects and imagined scenes.', next: 'Next drawing', timeline: 'Drawing, oldest to newest', about: 'About' },
  de: { back: 'Zurück zu Über mich', title: 'Skizzenbuch', intro: 'Eine Auswahl meiner Skizzen und Zeichnungen von Menschen, Dingen und erfundenen Szenen.', next: 'Nächste Zeichnung', timeline: 'Zeichnung, von alt nach neu', about: 'Über mich' },
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
function fitSheet(image, art, bands) {
  const apply = () => {
    const nw = image.naturalWidth, nh = image.naturalHeight
    if (!nw || !nh) return
    const ratio = nw / nh
    const w = ratio < 1 ? ratio : 1, h = ratio < 1 ? 1 : 1 / ratio
    // inset FIRST: the shorthand would otherwise reset left/top to auto.
    Object.assign(art.style, { inset: 'auto', left: `${(1 - w) * 50}%`, top: `${(1 - h) * 50}%`, width: `${w * 100}%`, height: `${h * 100}%` })
    const gap = `${(ratio < 1 ? 1 - w : 1 - h) * 50}%`
    const [a, b] = bands
    if (ratio < 1) { Object.assign(a.style, { left: 0, top: 0, bottom: 0, width: gap }); Object.assign(b.style, { right: 0, top: 0, bottom: 0, width: gap }) }
    else { Object.assign(a.style, { top: 0, left: 0, right: 0, height: gap }); Object.assign(b.style, { bottom: 0, left: 0, right: 0, height: gap }) }
    for (const band of bands) band.hidden = ratio === 1
  }
  if (image.complete) apply()
  image.addEventListener('load', () => { apply(); if (typeof syncFrontGlass === 'function') syncFrontGlass() })
}
const sheets = Array.from({ length: drawings.length }, (_, slot) => {
  const drawingIndex = drawings.length - 1 - slot
  const sheet = document.createElement('span')
  sheet.className = 'sheet'
  const bands = [0, 1].map(() => { const band = document.createElement('span'); band.className = 'glass'; return band })
  const art = document.createElement('span')
  art.className = 'art'
  const image = new Image()
  image.src = drawings[drawingIndex].src
  image.alt = ''; image.draggable = false
  fitSheet(image, art, bands)
  // Four edge faces give the panel its thickness (see .edge in the CSS).
  const edges = ['t', 'r', 'b', 'l'].map(side => { const edge = document.createElement('span'); edge.className = `edge edge-${side}`; return edge })
  art.append(image); sheet.append(...bands, art, ...edges); stack.append(sheet)
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
const frontBands = [0, 1].map(() => { const band = document.createElement('span'); band.className = 'glass'; frontGlass.append(band); return band })
stackButton.append(frontGlass)
function syncFrontGlass(fade = false) {
  const current = sheets.find(item => item.drawingIndex === index)
  if (!current) return
  frontGlass.style.transform = `${getComputedStyle(stack).transform} ${current.sheet.style.transform}`
  current.sheet.querySelectorAll('.glass').forEach((band, i) => { frontBands[i].style.cssText = band.style.cssText; frontBands[i].hidden = band.hidden })
  if (fade && !reduceMotion.matches) frontGlass.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 230, easing: 'ease-in-out' })
}
window.addEventListener('sketchbook-orientation', () => syncFrontGlass())

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
    if (animate && !reduceMotion.matches && Math.abs(presented - opacity) > 0.001) {
      sheet.animate([{ opacity: presented }, { opacity }], { duration: 230, easing: 'ease-in-out' })
    }
  }
  syncFrontGlass(animate)
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
let preview = null, press = null, suppressClickUntil = 0

const ART_INSET = 1 // the drawing runs edge to edge along its long side; glass only fills the rest of the square
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
  const nw = image.naturalWidth, nh = image.naturalHeight
  if (nw && nh) {
    const fit = Math.min(Math.min(innerWidth * .9, 1100) / nw, innerHeight * .88 / nh)
    image.style.width = `${nw * fit}px`; image.style.height = `${nh * fit}px`
    if (!reduceMotion.matches && current) startLift(overlay, image, current, nw, nh, fit)
  }
  // A fresh press on the overlay is an intentional close, even immediately
  // after the long press. The release that opened it must not close it again.
  overlay.addEventListener('pointerdown', () => { suppressClickUntil = 0 })
  overlay.addEventListener('click', event => {
    event.stopPropagation()
    if (performance.now() >= suppressClickUntil) closePreview()
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
  const mirrored = stack.classList.contains('reverse')
  rig.append(clone); scene.append(rig); overlay.append(scene)
  image.style.visibility = 'hidden'
  current.sheet.style.visibility = 'hidden'
  frontGlass.style.visibility = 'hidden'

  const z0 = new DOMMatrix(current.sheet.style.transform).m43
  const shown = Math.min(side * ART_INSET / nw, side * ART_INSET / nh) // contain-fit inside the frame
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
  for (const band of clone.querySelectorAll('.glass')) band.animate([{ opacity: 1 }, { opacity: 1, offset: .3 }, { opacity: 0 }], timing)
  // The back face is seen mirrored, so the artwork is pre-flipped; hand it back
  // exactly when the sheet turns edge-on (rotation passes 90 degrees).
  if (mirrored) {
    const tilt = Math.acos(Math.max(-1, Math.min(1, matrix.m33 / Math.hypot(matrix.m31, matrix.m32, matrix.m33)))) * 180 / Math.PI // angle between the face normal and the viewer
    const turn = Math.max(.05, Math.min(.95, 1 - 90 / (180 - tilt || 147)))
    cloneImage.animate([{ transform: 'scaleX(-1)' }, { transform: 'scaleX(-1)', offset: turn }, { transform: 'scaleX(1)', offset: Math.min(.99, turn + .001) }, { transform: 'scaleX(1)' }], timing)
  }
  overlay.animate([{ backgroundColor: 'rgba(18,20,19,0)' }, { backgroundColor: 'rgba(18,20,19,.7)' }], { duration: 950, easing: 'cubic-bezier(.45, 0, .2, 1)' })
  lift = { scene, sheet: current.sheet }
  sheetMove.finished.then(() => {
    if (lift?.scene !== scene) return
    image.style.visibility = ''
    scene.remove()
  }).catch(() => {})
}

function closePreview() {
  if (!preview) return
  const overlay = preview
  preview = null
  if (lift) { lift.sheet.style.visibility = ''; lift = null }
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
  if (preview) { if (event.key === 'Escape') closePreview(); return }
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
