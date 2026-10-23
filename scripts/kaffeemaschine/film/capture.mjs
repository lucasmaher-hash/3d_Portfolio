// Frame-exact capture of a live page (used for the Cybercoffee landing loop).
// The page's clock is replaced before any of its scripts run — Date, performance.now,
// setTimeout/setInterval, requestAnimationFrame, and every CSS transition/animation (held
// paused and set to the clock through the Web Animations API) — in the page and in every
// same-origin iframe, all on ONE shared clock. Between screenshots the clock moves exactly
// one frame, so a screenshot can take as long as it likes. (Chrome's own virtual time +
// begin-frame control would do this natively, but begin-frame control is not supported on
// macOS and plain virtual time stalls screenshots.)
import {spawn} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const CLOCK = (startEpochMs) => `(() => {
  const top = (() => { try { return window.top.document && window.top } catch (e) { return window } })()
  const C = top.__vclock || (top.__vclock = { now: 0, epoch: ${startEpochMs}, wins: [], seq: 0 })
  window.__vclock = C
  const W = { win: window, timers: new Map(), rafs: new Map() }
  C.wins.push(W)
  const RealDate = Date
  function VDate(...a) { if (!new.target) return new RealDate(C.epoch + C.now).toString(); return a.length ? new RealDate(...a) : new RealDate(C.epoch + C.now) }
  VDate.prototype = RealDate.prototype
  VDate.now = () => C.epoch + C.now
  VDate.UTC = RealDate.UTC; VDate.parse = RealDate.parse
  window.Date = VDate
  performance.now = () => C.now
  const add = (fn, ms, args, repeat) => { const id = ++C.seq; W.timers.set(id, { at: C.now + Math.max(0, +ms || 0), fn, args, repeat: repeat ? Math.max(1, +ms || 0) : 0, id }); return id }
  window.setTimeout = (fn, ms, ...args) => add(fn, ms, args, false)
  window.setInterval = (fn, ms, ...args) => add(fn, ms, args, true)
  window.clearTimeout = window.clearInterval = id => W.timers.delete(id)
  window.requestAnimationFrame = fn => { const id = ++C.seq; W.rafs.set(id, fn); return id }
  window.cancelAnimationFrame = id => W.rafs.delete(id)
  if (top !== window) return
  C.advance = (dt) => {
    const end = C.now + dt
    for (let guard = 0; guard < 100000; guard++) {
      let next = null, nw = null
      for (const w of C.wins) for (const t of w.timers.values()) if (t.at <= end && (!next || t.at < next.at || (t.at === next.at && t.id < next.id))) { next = t; nw = w }
      if (!next) break
      C.now = Math.max(C.now, next.at)
      if (next.repeat) next.at += next.repeat; else nw.timers.delete(next.id)
      try { typeof next.fn === 'function' ? next.fn(...(next.args || [])) : nw.win.eval(next.fn) } catch (e) { console.error(e) }
    }
    C.now = end
    for (const w of C.wins) { const rafs = [...w.rafs.values()]; w.rafs.clear(); for (const f of rafs) try { f(C.now) } catch (e) { console.error(e) } }
    for (const w of C.wins) {
      let anims = []; try { anims = w.win.document.getAnimations() } catch (e) {}
      for (const a of anims) {
        if (a.__vs === undefined) { a.__vs = C.now - (a.currentTime || 0); a.pause() }
        a.currentTime = C.now - a.__vs
      }
    }
  }
})()`

export async function capture({ url, width, height, fps, startEpochMs, dpr = 1, chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }) {
  const port = 9400 + Math.floor(Math.random() * 400)
  const prof = fs.mkdtempSync('/tmp/cc-film-')
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof,
    '--use-angle=metal', '--ignore-gpu-blocklist', '--hide-scrollbars', '--mute-audio', '--window-size=' + width + ',' + height, 'about:blank'], { stdio: 'ignore' })
  let list
  for (let i = 0; i < 60 && !list; i++) { await new Promise(r => setTimeout(r, 200)); try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json() } catch {} }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r)
  let id = 0; const pend = new Map(), logs = []
  ws.onmessage = e => { const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + m.params.exceptionDetails.exception?.description)
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(m.params.type + ' ' + m.params.args.map(a => a.value ?? a.description).join(' ')) }
  const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; pend.set(i, m => m.error ? j(new Error(method + ': ' + m.error.message)) : r(m.result)); ws.send(JSON.stringify({ id: i, method, params })) })
  await send('Runtime.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: CLOCK(startEpochMs) })
  await send('Page.navigate', { url })
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(e + ': ' + r.exceptionDetails.exception?.description); return r.result?.value }
  const step = ms => ev(`window.__vclock.advance(${ms}), 1`)
  const shot = async (file, clip) => { const format = file.endsWith('.webp') ? 'webp' : 'png'
    const r = await send('Page.captureScreenshot', { format, ...(format === 'webp' ? { quality: 88 } : {}), ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')) }
  return { send, ev, step, shot, logs, dt: 1000 / fps, close() { proc.kill() } }
}
