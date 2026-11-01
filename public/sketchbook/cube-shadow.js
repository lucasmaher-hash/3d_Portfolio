// Soft shadow under the cube, falling to the front right. Always applied with the
// saved values; the separate dial only shows with ?shadow=1 (independent of ?tune=1).
const KEY = 'portfolio-sketchbook-shadow-v1'
const defaults = { x: 30, y: 26, blur: 26, spread: 96, opacity: 24, color: '#3b3d52', skew: 0, squash: 100, radius: 6 }
const labels = { x: ['Versatz X', 'px', -200, 200], y: ['Versatz Y', 'px', -200, 200], blur: ['Weichheit', 'px', 0, 120], spread: ['Ausbreitung', '%', 40, 180], opacity: ['Intensität', '%', 0, 100], skew: ['Neigung', '°', -45, 45], squash: ['Höhe', '%', 20, 160], radius: ['Rundung', '%', 0, 50] }

let values = { ...defaults }
try { Object.assign(values, JSON.parse(localStorage.getItem(KEY)) || {}) } catch {}

const cube = document.querySelector('.stack-button')
const shadow = document.createElement('span')
shadow.className = 'cube-shadow'
shadow.setAttribute('aria-hidden', 'true')
cube.prepend(shadow)

function apply() {
  const v = values
  Object.assign(shadow.style, {
    position: 'absolute', inset: '0', pointerEvents: 'none',
    background: v.color, opacity: v.opacity / 100, borderRadius: v.radius + '%',
    filter: `blur(${v.blur}px)`,
    transform: `translate(${v.x}px, ${v.y}px) skewX(${v.skew}deg) scale(${v.spread / 100}, ${v.spread / 100 * v.squash / 100})`,
  })
}
apply()

const q = new URLSearchParams(location.search)
if (q.get('shadow') === '1' || q.get('tune') === '1') {
  const panel = document.createElement('section')
  panel.style.cssText = 'position:fixed;left:20px;bottom:20px;z-index:9999;width:min(280px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:14px;border-radius:20px;background:rgba(240,240,245,.92);box-shadow:0 8px 30px rgba(0,0,0,.18);font:12px/1.4 "Roboto Flex UI",sans-serif;color:#222'
  panel.addEventListener('keydown', e => e.stopPropagation())
  panel.innerHTML = '<strong style="display:block;margin-bottom:8px">Würfel-Schatten</strong>'
  const rows = {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(values)) } catch {} ; out.value = JSON.stringify(values) }
  const row = (k, label, input, extra) => {
    const l = document.createElement('label'); l.style.cssText = 'display:grid;grid-template-columns:80px minmax(0,1fr) 44px;gap:6px;align-items:center;margin:4px 0'
    l.append(Object.assign(document.createElement('span'), { textContent: label }), input)
    if (extra) l.append(extra)
    panel.append(l)
  }
  for (const [k, [label, unit, min, max]] of Object.entries(labels)) {
    const r = Object.assign(document.createElement('input'), { type: 'range', min, max, step: 1, value: values[k] })
    const n = Object.assign(document.createElement('span'), { textContent: values[k] + unit, style: 'text-align:right' })
    r.addEventListener('input', () => { values[k] = r.valueAsNumber; n.textContent = values[k] + unit; apply(); save() })
    rows[k] = [r, n, unit]
    row(k, label, r, n)
  }
  const c = Object.assign(document.createElement('input'), { type: 'color', value: values.color })
  c.addEventListener('input', () => { values.color = c.value; apply(); save() })
  row('color', 'Farbe', c)
  const out = Object.assign(document.createElement('textarea'), { readOnly: true, rows: 2, value: JSON.stringify(values) })
  out.style.cssText = 'width:100%;margin-top:8px;font:11px monospace'
  const reset = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Zurücksetzen' })
  reset.style.cssText = 'margin-top:8px'
  reset.addEventListener('click', () => {
    values = { ...defaults }; apply(); save(); c.value = values.color
    for (const [k, [r, n, unit]] of Object.entries(rows)) { r.value = values[k]; n.textContent = values[k] + unit }
  })
  panel.append(out, reset)
  document.body.append(panel)
}
