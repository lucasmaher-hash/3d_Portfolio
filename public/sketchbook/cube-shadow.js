// Cast shadow of the cube on a floor that shares the cube's own tilt (it lives
// inside .stack's preserve-3d space, at the bottom of the sheets). Light comes
// from behind-left, so the shadow falls toward the viewer and to the right.
// Richtung is relative to the cube's rotateY, so the shadow keeps its screen
// direction when the layout tuner turns the cube (70° = front right, Lucas's values 2026-11-01).
// The tuning dial was removed; the values above are final.
const values = { angle: 70, length: 67, blur: 40, opacity: 39, tip: 8, color: '#000000', gap: 0 }

const button = document.querySelector('.stack-button')
const stack = document.querySelector('.stack')
const NS = 'http://www.w3.org/2000/svg'
const floor = document.createElement('span')
floor.className = 'cube-shadow'
floor.setAttribute('aria-hidden', 'true')
const svg = document.createElementNS(NS, 'svg')
svg.innerHTML = '<defs><linearGradient id="cube-shadow-fade" gradientUnits="userSpaceOnUse"><stop offset="0"/><stop offset="1"/></linearGradient></defs><polygon fill="url(#cube-shadow-fade)"/>'
floor.append(svg)
stack.prepend(floor)
const [stopA, stopB] = svg.querySelectorAll('stop')
const grad = svg.querySelector('linearGradient')
const poly = svg.querySelector('polygon')

let rotateY = 147
window.addEventListener('sketchbook-orientation', e => { rotateY = Number(e.detail) || 0; apply() })
window.addEventListener('resize', () => apply())

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = [], upper = []
  for (const q of p) { while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop(); lower.push(q) }
  for (const q of p.reverse()) { while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop(); upper.push(q) }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

// Depth the remaining (not yet viewed) sheets occupy, as fractions of the
// stack depth from the front plane (0) to the back plane (1). The shadow's
// footprint covers only that range and eases to it when a sheet is removed.
const span = { a: 0, b: 1, ta: 0, tb: 1 }
function readStack() {
  const st = window.__sketchStack
  if (!st || st.total < 2) return
  const n = st.total - 1
  // Only the sheets already shown count: the shadow grows with the cube while it builds up.
  const lo = st.fillLo ?? st.index, hi = st.fillHi ?? Math.max(lo, (st.loaded ?? st.total) - 1)
  floor.style.visibility = st.loaded === 0 ? 'hidden' : ''
  if (st.reverse) { span.ta = (n - hi) / n; span.tb = (n - lo) / n }
  else { span.ta = lo / n; span.tb = hi / n }
}
let easing = 0
function ease() {
  span.a += (span.ta - span.a) * 0.18; span.b += (span.tb - span.b) * 0.18
  if (Math.abs(span.ta - span.a) + Math.abs(span.tb - span.b) < 0.001) { span.a = span.ta; span.b = span.tb; easing = 0; apply(); return }
  apply(); easing = requestAnimationFrame(ease)
}
window.addEventListener('sketchbook-stack', () => {
  readStack()
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { span.a = span.ta; span.b = span.tb; apply(); return }
  if (!easing) easing = requestAnimationFrame(ease)
})
readStack(); span.a = span.ta; span.b = span.tb

function apply() {
  const v = values
  const W = button.clientWidth, H = button.clientHeight, D = W
  if (!W) return
  // Screen direction on the floor -> cube-local floor axes (x along the sheet, z through the stack).
  const a = (v.angle - rotateY) * Math.PI / 180
  const L = W * v.length / 100
  const du = Math.sin(a) * L, dv = -Math.cos(a) * L   // element v axis points away from the viewer after rotateX(90deg) (measured)
  const pad = Math.max(W, L) + v.blur * 3
  Object.assign(floor.style, {
    position: 'absolute', left: '0', top: `calc(100% + ${v.gap}px)`, width: `${W}px`, height: `${D}px`,
    pointerEvents: 'none', transformOrigin: '50% 0', transform: `translateZ(${-D}px) rotateX(90deg)`,
  })
  Object.assign(svg.style, { position: 'absolute', left: `${-pad}px`, top: `${-pad}px`, width: `${W + 2 * pad}px`, height: `${D + 2 * pad}px`, overflow: 'visible', filter: `blur(${v.blur}px)` })
  svg.setAttribute('viewBox', `${-pad} ${-pad} ${W + 2 * pad} ${D + 2 * pad}`)
  const thin = 0.03 // a single sheet still throws a sliver of shadow
  const mid = (span.a + span.b) / 2, half = Math.max(thin / 2, (span.b - span.a) / 2)
  const v0 = D * (1 - Math.min(1, mid + half)), v1 = D * (1 - Math.max(0, mid - half))
  const base = [[0, v0], [W, v0], [W, v1], [0, v1]]
  poly.setAttribute('points', hull(base.concat(base.map(([x, y]) => [x + du, y + dv]))).map(p => p.join(',')).join(' '))
  grad.setAttribute('x1', W / 2); grad.setAttribute('y1', (v0 + v1) / 2)
  grad.setAttribute('x2', W / 2 + du * 1.5); grad.setAttribute('y2', (v0 + v1) / 2 + dv * 1.5)
  stopA.setAttribute('stop-color', v.color); stopA.setAttribute('stop-opacity', v.opacity / 100)
  stopB.setAttribute('stop-color', v.color); stopB.setAttribute('stop-opacity', v.opacity / 100 * v.tip / 100)
}
apply()
requestAnimationFrame(apply)
