export function installLayoutTuner() {
  const defaults = { textX: -28, textY: -46, cubeX: 117, cubeY: -22, cubeSize: 93, dialX: 13, dialY: 29, rotateX: -13, rotateY: 147, rotateZ: -1, glassLight: 100, glassOpacity: 38, glassBlur: 22, glassSaturate: 150, glassHue: 220, glassTint: 0 }
  if (matchMedia('(max-width: 540px)').matches) Object.assign(defaults, { textX: 17, textY: -41, cubeX: 36, cubeY: 14, dialX: 8, dialY: 62 })
  const labels = { textX: 'Text X', textY: 'Text Y', cubeX: 'Würfel X', cubeY: 'Würfel Y', cubeSize: 'Würfelgröße', dialX: 'Slider X', dialY: 'Slider Y', rotateX: 'Drehung X', rotateY: 'Drehung Y', rotateZ: 'Drehung Z', glassLight: 'Glas Helligkeit (%)', glassOpacity: 'Glas Deckkraft (%)', glassBlur: 'Glas Unschärfe (px)', glassSaturate: 'Glas Sättigung der Unschärfe (%)', glassHue: 'Glas Farbton (°)', glassTint: 'Glas Farbintensität (%)' }
  const ranges = { glassLight: [0, 100], glassOpacity: [0, 100], glassBlur: [0, 60], glassSaturate: [50, 300], glassHue: [0, 360], glassTint: [0, 100] }
  const key = 'portfolio-sketchbook-layout-v1', uiKey = key + '-panel'
  let saved = {}, ui = {}
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; ui = JSON.parse(localStorage.getItem(uiKey)) || {} } catch {}
  const values = { ...defaults }
  for (const k of Object.keys(values)) if (Number.isFinite(saved[k]) && Math.abs(saved[k]) <= 5000 && (k !== 'cubeSize' || saved[k] >= 1)) values[k] = saved[k]
  const text = document.querySelector('.intro'), cube = document.querySelector('.stack-button'), stack = document.querySelector('.stack'), dial = document.querySelector('.timeline')
  const style = document.createElement('style')
  style.textContent = `.layout-panel{position:fixed;right:20px;bottom:20px;z-index:9999;width:min(300px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:14px;border-radius:20px;background:#dcdce3;color:#1a1a1a;font:12px/1.4 system-ui;box-shadow:5px 5px 15px #0004,-4px -4px 14px #fff9}.layout-panel header{display:flex;justify-content:space-between;align-items:center;cursor:grab;touch-action:none}.layout-panel button{border:0;border-radius:12px;padding:7px 10px;background:#dcdce3;box-shadow:3px 3px 7px #aeaebea6,-3px -3px 7px #fff;cursor:pointer}.layout-panel label{display:block;margin-top:9px}.layout-panel .row{display:flex;align-items:center;gap:7px;position:relative}.layout-panel .default-dot{position:absolute;top:50%;width:5px;height:5px;border-radius:50%;background:#222;transform:translate(-50%,-50%);pointer-events:none;z-index:2}.layout-panel input[type=range]{width:100%;accent-color:#536b85}.layout-panel input[type=number]{width:58px;border:0;border-radius:7px;padding:4px;background:#eee;font:inherit}.layout-panel textarea{width:100%;height:115px;margin-top:10px;font:11px monospace;resize:vertical}.layout-panel .actions{display:flex;gap:10px;margin-top:12px}.layout-panel p{margin:10px 0;font-size:11px}.layout-dial-handle{position:absolute;left:-19px;top:50%;width:20px;height:60px;transform:translateY(-50%);cursor:grab;touch-action:none;border-left:2px dotted #555}.stack.tuning .sheet{backface-visibility:visible}.intro.tuning{pointer-events:auto;cursor:grab;touch-action:none}.stack-button.tuning{cursor:grab;touch-action:none}`
  document.head.append(style)
  const panel = document.createElement('section'); panel.className = 'layout-panel'
  panel.innerHTML = `<header><strong>Layout einstellen</strong><button type="button" aria-expanded="true" aria-controls="layout-panel-body" aria-label="Regler einklappen">−</button></header><div id="layout-panel-body"><p>Text und Würfel ziehen. Shift + Ziehen dreht den Würfel. Slider am Griff links verschieben.</p><div class="fields"></div><div class="actions"><button data-preset="original">Original</button><button data-preset="flat">Flacher</button><button data-preset="deep">Räumlicher</button></div><div class="actions"><button data-reset>Zurücksetzen</button><button data-copy>Werte kopieren</button></div><textarea readonly aria-label="Einstellungen zum Kopieren"></textarea></div>`
  document.body.append(panel)
  panel.addEventListener('keydown', event => event.stopPropagation())
  const body = panel.querySelector('#layout-panel-body'), toggle = panel.querySelector('header button'), output = panel.querySelector('textarea'), fields = panel.querySelector('.fields')
  const handle = document.createElement('div'); handle.className = 'layout-dial-handle'; handle.title = 'Slider verschieben'; dial.append(handle)
  text.classList.add('tuning'); cube.classList.add('tuning'); stack.classList.add('tuning')
  for (const k of Object.keys(values)) {
    const angle = k.startsWith('rotate'), size = k === 'cubeSize', range = ranges[k], min = range ? range[0] : size ? 25 : angle ? -180 : -1000, max = range ? range[1] : size ? 400 : angle ? 180 : 1000
    const label = document.createElement('label'); label.textContent = labels[k] + (range ? '' : size ? ' (%)' : angle ? ' (°)' : ' (px)')
    const row = document.createElement('div'); row.className = 'row'
    row.innerHTML = `<input type="range" min="${min}" max="${max}" step="1" aria-label="${labels[k]}; Punkt markiert den Ausgangswert"><input type="number" step="1" aria-label="${labels[k]} Zahlenwert">`
    const dot = document.createElement('span'); dot.className = 'default-dot'; dot.setAttribute('aria-hidden', 'true'); row.append(dot)
    fields.append(label, row); label.htmlFor = 'layout-' + k; row.firstElementChild.id = label.htmlFor
    for (const input of row.children) input.addEventListener('input', () => {
      const value = input.valueAsNumber
      if (!Number.isFinite(value) || Math.abs(value) > 5000 || (size && value < 1)) return
      values[k] = value; update(); save()
    })
    row.dataset.key = k
  }
  function save() { try { localStorage.setItem(key, JSON.stringify(values)) } catch {} }
  function update() {
    text.style.transform = `translate(${values.textX}px, ${values.textY}px)`
    cube.style.transform = `translate(calc(-50% + ${values.cubeX}px), calc(-50% + ${values.cubeY}px))`
    dial.style.transform = `translate(${values.dialX}px, calc(-50% + ${values.dialY}px))`
    stack.style.transform = `scale3d(${values.cubeSize / 100}, ${values.cubeSize / 100}, ${values.cubeSize / 100}) rotateX(${values.rotateX}deg) rotateY(${values.rotateY}deg) rotateZ(${values.rotateZ}deg)`
    const root = document.documentElement.style
    root.setProperty('--glass-light', values.glassLight + '%'); root.setProperty('--glass-alpha', values.glassOpacity / 100)
    root.setProperty('--glass-blur', values.glassBlur + 'px'); root.setProperty('--glass-saturate', values.glassSaturate + '%')
    root.setProperty('--glass-hue', values.glassHue); root.setProperty('--glass-tint', values.glassTint + '%')
    window.dispatchEvent(new CustomEvent('sketchbook-orientation', { detail: values.rotateY }))
    for (const row of fields.children) {
      const k = row.dataset.key; if (!k) continue
      const [slider, number] = row.children, angle = k.startsWith('rotate'), size = k === 'cubeSize'
      const range = ranges[k]
      slider.min = range ? range[0] : Math.min(size ? 25 : angle ? -180 : -1000, values[k]); slider.max = range ? range[1] : Math.max(size ? 400 : angle ? 180 : 1000, values[k])
      slider.value = values[k]; if (document.activeElement !== number) number.value = values[k]
      const marker = (defaults[k] - Number(slider.min)) / (Number(slider.max) - Number(slider.min)) * 100
      row.querySelector('.default-dot').style.left = `${slider.offsetLeft + 7 + (slider.clientWidth - 14) * marker / 100}px`
    }
    output.value = JSON.stringify(values, null, 2)
  }
  function drag(target, kind) {
    let state, moved = false
    target.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('a')) return
      e.stopPropagation(); state = { x:e.clientX, y:e.clientY, shift:e.shiftKey, start:{...values} }; moved = false
      target.setPointerCapture(e.pointerId)
    })
    target.addEventListener('pointermove', e => {
      if (!state) return
      const dx=e.clientX-state.x, dy=e.clientY-state.y
      if (Math.hypot(dx,dy)>3) moved=true
      if (!moved) return
      if (kind === 'cube' && (state.shift || e.shiftKey)) { values.rotateY=Math.round(state.start.rotateY + dx*.7); values.rotateX=Math.round(state.start.rotateX - dy*.7) }
      else { values[kind+'X']=Math.round(state.start[kind+'X']+dx); values[kind+'Y']=Math.round(state.start[kind+'Y']+dy) }
      update(); save()
    })
    target.addEventListener('pointerup', () => { state = null })
    target.addEventListener('pointercancel', () => { state = null })
    target.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopImmediatePropagation(); moved = false } }, true)
  }
  drag(text,'text'); drag(cube,'cube'); drag(handle,'dial')
  panel.querySelector('[data-reset]').onclick = () => { Object.assign(values, defaults); update(); save() }
  panel.querySelectorAll('[data-preset]').forEach(button => button.onclick = () => {
    const presets = { original: [-13,147,-1], flat: [-1,12,0], deep: [-8,40,-3] }
    ;[values.rotateX,values.rotateY,values.rotateZ] = presets[button.dataset.preset]; update(); save()
  })
  panel.querySelector('[data-copy]').onclick = async () => { try { await navigator.clipboard.writeText(output.value) } catch { output.focus(); output.select() } }
  function clamp(x=panel.offsetLeft,y=panel.offsetTop) { panel.style.right='auto';panel.style.bottom='auto';panel.style.left=Math.max(12,Math.min(x,innerWidth-panel.offsetWidth-12))+'px';panel.style.top=Math.max(12,Math.min(y,innerHeight-panel.offsetHeight-12))+'px' }
  function saveUI() { try { localStorage.setItem(uiKey,JSON.stringify({left:panel.offsetLeft,top:panel.offsetTop,collapsed:body.hidden})) } catch {} }
  toggle.onclick=()=>{ body.hidden=!body.hidden;toggle.textContent=body.hidden?'+':'−';toggle.setAttribute('aria-expanded',String(!body.hidden));toggle.setAttribute('aria-label',body.hidden?'Regler ausklappen':'Regler einklappen');clamp();saveUI() }
  document.addEventListener('pointerdown', event => { if (!body.hidden && !panel.contains(event.target)) toggle.click() }, true)
  window.addEventListener('blur', () => {
    if (!body.hidden && document.activeElement?.tagName === 'IFRAME') toggle.click()
  })
  let panelDrag
  panel.addEventListener('pointerdown', e => { if(e.button!==0 || e.target.closest('button,input,textarea,label'))return; panelDrag={x:e.clientX-panel.offsetLeft,y:e.clientY-panel.offsetTop};panel.setPointerCapture(e.pointerId);e.preventDefault() })
  panel.addEventListener('pointermove',e=>{if(panelDrag)clamp(e.clientX-panelDrag.x,e.clientY-panelDrag.y)})
  for(const event of ['pointerup','pointercancel'])panel.addEventListener(event,()=>{if(panelDrag){panelDrag=null;saveUI()}})
  window.addEventListener('resize',()=>{clamp();update()})
  update();if(ui.collapsed)toggle.click();if(Number.isFinite(ui.left)&&Number.isFinite(ui.top))clamp(ui.left,ui.top);else clamp()
}
