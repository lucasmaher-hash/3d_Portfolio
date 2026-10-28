import { DESKTOP_VIEW, viewAngles } from './camera-view.js'
import './camera-tuner.css'

const STORAGE_KEY = 'portfolio-camera-tuner-v1'
const definitions = [
  { key: 'horizontalFov', label: 'Horizontaler Blickwinkel', min: 60, max: 140 },
  { key: 'verticalLimit', label: 'Vertikale Begrenzung', min: 35, max: 110 },
]

// Explicit authoring mode only. Stored settings never affect ordinary visitors.
export function installCameraTuner(camera, apply, resetInput) {
  let stored = {}
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { /* defaults */ }
  const values = { ...DESKTOP_VIEW }
  for (const { key } of definitions) {
    if (Number.isFinite(stored[key]) && stored[key] >= 5 && stored[key] <= 170) values[key] = stored[key]
  }
  const panel = document.createElement('section')
  panel.className = 'camera-tuner'
  panel.setAttribute('aria-label', 'Kamera einstellen')
  panel.innerHTML = `
    <header><strong>Kamera einstellen</strong><button type="button" class="camera-tuner-toggle" aria-expanded="true" aria-controls="camera-tuner-body" aria-label="Regler einklappen">−</button></header>
    <div id="camera-tuner-body">
      <p>Weiterer Winkel = mehr Raum, stärkere Randdehnung.</p>
      ${definitions.map(({ key, label, min, max }) => `
        <div class="camera-tuner-control">
          <label for="camera-${key}">${label}</label>
          <div><input id="camera-${key}" data-key="${key}" type="range" min="${min}" max="${max}" step="0.5">
          <input data-number="${key}" type="number" min="5" max="170" step="0.5" aria-label="${label} in Grad"><span>°</span></div>
        </div>`).join('')}
      <output class="camera-tuner-angles"></output>
      <div class="camera-tuner-actions"><button type="button" data-reset>Zurücksetzen</button><button type="button" data-copy>Werte kopieren</button></div>
      <textarea rows="4" readonly aria-label="Kameraeinstellungen zum Kopieren" spellcheck="false"></textarea>
      <small>Ziehen zum Verschieben · nur auf diesem Gerät gespeichert</small>
    </div>`
  document.body.append(panel)
  const toggle = panel.querySelector('.camera-tuner-toggle')
  const body = panel.querySelector('#camera-tuner-body')
  const output = panel.querySelector('output')
  const json = panel.querySelector('textarea')
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...values, collapsed: body.hidden,
        left: panel.offsetLeft, top: panel.offsetTop }))
    } catch { /* storage may be disabled */ }
  }
  const angles = () => {
    const actual = viewAngles(camera)
    output.textContent = `Aktuell: ${actual.horizontal.toFixed(1)}° horizontal / ${actual.vertical.toFixed(1)}° vertikal`
  }
  const sync = () => {
    for (const { key, min, max } of definitions) {
      const range = panel.querySelector(`[data-key="${key}"]`)
      range.min = Math.min(min, values[key])
      range.max = Math.max(max, values[key])
      range.value = values[key]
      panel.querySelector(`[data-number="${key}"]`).value = values[key]
    }
    apply({ ...values })
    angles()
    json.value = JSON.stringify(values, null, 2)
  }
  panel.addEventListener('input', event => {
    const key = event.target.dataset.key || event.target.dataset.number
    if (!key) return
    const value = event.target.valueAsNumber
    if (!Number.isFinite(value) || value < 5 || value > 170) return
    values[key] = value
    // Don't rewrite a numeric input mid-keystroke; allow entering e.g. 105.
    const range = panel.querySelector(`[data-key="${key}"]`)
    range.min = Math.min(Number(range.min), value)
    range.max = Math.max(Number(range.max), value)
    range.value = value
    if (event.target.type === 'range') panel.querySelector(`[data-number="${key}"]`).value = value
    apply({ ...values }); angles()
    json.value = JSON.stringify(values, null, 2)
    save()
  })
  panel.addEventListener('change', sync)
  // Arrow keys and scene shortcuts must stay inside editable controls.
  panel.addEventListener('keydown', event => event.stopPropagation())
  panel.addEventListener('focusin', resetInput)
  panel.querySelector('[data-reset]').addEventListener('click', () => {
    Object.assign(values, DESKTOP_VIEW); sync(); save()
  })
  panel.querySelector('[data-copy]').addEventListener('click', async event => {
    try {
      await navigator.clipboard.writeText(json.value)
      event.target.textContent = 'Kopiert'
    } catch { json.focus(); json.select() }
  })
  const clamp = (left = panel.offsetLeft, top = panel.offsetTop) => {
    const gutter = 12
    panel.style.right = 'auto'; panel.style.bottom = 'auto'
    panel.style.left = `${Math.max(gutter, Math.min(left, innerWidth - panel.offsetWidth - gutter))}px`
    panel.style.top = `${Math.max(gutter, Math.min(top, innerHeight - panel.offsetHeight - gutter))}px`
  }
  const collapse = collapsed => {
    body.hidden = collapsed
    toggle.setAttribute('aria-expanded', String(!collapsed))
    toggle.setAttribute('aria-label', collapsed ? 'Regler ausklappen' : 'Regler einklappen')
    toggle.textContent = collapsed ? '+' : '−'
    clamp()
  }
  toggle.addEventListener('click', () => { collapse(!body.hidden); save() })
  let drag = null
  panel.addEventListener('pointerdown', event => {
    resetInput()
    if (event.button !== 0 || event.target.closest('button,input,textarea,label,a,output')) return
    drag = { id: event.pointerId, x: event.clientX - panel.offsetLeft, y: event.clientY - panel.offsetTop }
    panel.setPointerCapture(event.pointerId)
    panel.classList.add('is-dragging')
    event.preventDefault()
  })
  panel.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) clamp(event.clientX - drag.x, event.clientY - drag.y)
  })
  const endDrag = () => { drag = null; panel.classList.remove('is-dragging'); save() }
  panel.addEventListener('pointerup', endDrag)
  panel.addEventListener('pointercancel', endDrag)
  panel.addEventListener('lostpointercapture', endDrag)
  window.addEventListener('resize', () => { clamp(); angles() })
  sync()
  if (stored.collapsed === true) collapse(true)
  if (Number.isFinite(stored.left) && Number.isFinite(stored.top)) clamp(stored.left, stored.top)
  else clamp()
}
