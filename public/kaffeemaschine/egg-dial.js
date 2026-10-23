// Material dial for the 3D egg of the interactive machine (kaffeemaschine2d.html).
// Lucas, 2026-10-23. LOCALHOST ONLY — on the live site this file does nothing.
// It drives window.Egg3D inside the machine's iframe (same origin) and keeps the values in
// localStorage('eggDial'), which egg3d.js reads on load (also localhost only), so a reload
// keeps them. "copy" puts the values on the clipboard: paste them to bake them in as the
// DEFAULTS in egg3d.js. The panel folds into a small round button.
(function () {
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return
  const frame = document.querySelector('.machine-frame-wrap iframe')
  if (!frame) return
  const ROWS = {
    metal: [['brightness', 'Brightness', 0.1, 3], ['metalness', 'Metalness', 0, 1], ['roughness', 'Roughness', 0, 1],
      ['brushed', 'Brushed', 0, 1], ['clearcoat', 'Clear coat', 0, 1]],
    plastic: [['brightness', 'Brightness', 0.1, 1.3], ['roughness', 'Roughness', 0, 1], ['clearcoat', 'Clear coat', 0, 1],
      ['glow', 'Glow', 0, 1]],
    chevron: [['glow', 'Red glow', 0, 3]],
    light: [['env', 'Reflections', 0, 2], ['key', 'Key light', 0, 6], ['exposure', 'Exposure', 0.3, 2]],
  }
  const TITLES = { metal: 'Egg · metal', plastic: 'Buttons · plastic', chevron: 'Chevrons', light: 'Light' }
  const get = k => { try { return localStorage.getItem(k) } catch (e) { return null } }
  const set = (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} }

  function build(E) {
    const v = E.values
    const css = document.createElement('style')
    css.textContent =
      '#egg-dial{position:fixed;right:16px;bottom:16px;z-index:100000;font:12px/1.35 system-ui,sans-serif;color:#eee}' +
      '#egg-dial .box{background:rgba(20,20,24,.86);border-radius:10px;padding:10px 12px;width:230px;max-height:calc(100vh - 32px);overflow:auto}' +
      '#egg-dial h4{margin:10px 0 2px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#aab}' +
      '#egg-dial label{display:flex;justify-content:space-between;margin-top:4px}' +
      '#egg-dial input{width:100%;margin:2px 0 0}' +
      '#egg-dial .bar{display:flex;gap:6px;justify-content:flex-end}' +
      '#egg-dial button{all:unset;cursor:pointer;padding:2px 7px;border-radius:6px;background:rgba(255,255,255,.1)}' +
      '#egg-dial .dot{width:40px;height:40px;padding:0;display:grid;place-items:center;border-radius:50%;background:rgba(20,20,24,.86);font-size:16px}' +
      '#egg-dial[data-open="0"] .box{display:none}#egg-dial[data-open="1"] .dot{display:none}'
    document.head.append(css)
    const el = document.createElement('div')
    el.id = 'egg-dial'
    el.dataset.open = get('eggDialOpen') === '0' ? '0' : '1'
    const box = document.createElement('div'); box.className = 'box'
    box.innerHTML = '<div class="bar"><b style="margin-right:auto">Egg material</b><button class="copy">copy</button>' +
      '<button class="reset">reset</button><button class="hide" title="Fold into a button">&#8211;</button></div>'
    const inputs = []
    for (const group in ROWS) {
      const h = document.createElement('h4'); h.textContent = TITLES[group]; box.append(h)
      for (const [key, label, min, max] of ROWS[group]) {
        const lab = document.createElement('label'), val = document.createElement('span')
        lab.append(label, val)
        const input = Object.assign(document.createElement('input'), { type: 'range', min, max, step: 0.01 })
        const show = () => { input.value = v[group][key]; val.textContent = (+v[group][key]).toFixed(2) }
        input.addEventListener('input', () => {
          E.set({ [group]: { [key]: +input.value } }); show(); set('eggDial', JSON.stringify(v))
        })
        show(); inputs.push(show)
        box.append(lab, input)
      }
    }
    const dot = document.createElement('button'); dot.className = 'dot'; dot.title = 'Egg material dial'; dot.textContent = '◐'
    el.append(box, dot)
    const open = o => { el.dataset.open = o ? '1' : '0'; set('eggDialOpen', o ? '1' : '0') }
    box.querySelector('.hide').onclick = () => open(false)
    dot.onclick = () => open(true)
    box.querySelector('.reset').onclick = () => {
      E.set(JSON.parse(JSON.stringify(E.defaults))); inputs.forEach(f => f()); set('eggDial', JSON.stringify(v))
    }
    box.querySelector('.copy').onclick = e => {
      const text = JSON.stringify(v)
      navigator.clipboard?.writeText(text).then(() => { e.target.textContent = 'copied'; setTimeout(() => e.target.textContent = 'copy', 1200) },
        () => prompt('Values:', text))
    }
    document.body.append(el)
  }

  const tryHook = () => {
    const w = frame.contentWindow
    if (!w) return
    if (w.Egg3D) build(w.Egg3D)
    else w.addEventListener('egg3d-ready', () => build(w.Egg3D), { once: true })
  }
  if (frame.contentDocument && frame.contentDocument.readyState === 'complete' && frame.contentWindow.location.href !== 'about:blank') tryHook()
  else frame.addEventListener('load', tryHook, { once: true })
})()
