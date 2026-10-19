// Accent tuner (Lucas, 2026-10-19): a panel for trying out a page's accent
// colour live. Hidden unless asked for: open any 2D page with ?tune (it stays on
// for the tab, across pages) and close it with ?tune=0 or the panel's ✕.
// Nothing it does is saved to the site — the chosen colours live in this
// browser's localStorage only, and "Copy" gives the values to paste back.
// Everything visible is built in a shadow root, so page CSS cannot reach it.
(function () {
  var q = new URLSearchParams(location.search);
  try {
    if (q.get('tune') === '0') sessionStorage.removeItem('accentTuner');
    else if (q.has('tune')) sessionStorage.setItem('accentTuner', '1');
    if (sessionStorage.getItem('accentTuner') !== '1') return;
  } catch (e) { if (!q.has('tune') || q.get('tune') === '0') return; }

  var PAGE = (location.pathname.split('/').pop() || '2D.html').replace('.html', '') || '2D';
  var STORE = 'accentTuner:colors';
  var root = document.documentElement;
  var original = getComputedStyle(root).getPropertyValue('--accent-orange').trim() || '#809BBC';
  var pageHover = parseFloat(getComputedStyle(root).getPropertyValue('--accent-hover-mix')) || 30;
  var PRESETS = [
    ['2D / Packaging', '#809BBC'], ['to.morrow', '#9693BB'], ['Virtual Cooking', '#9693BB'],
    ['Unify', '#B48A9F'], ['Cybercoffee', '#CF7275'], ['Mac-Lamp', '#E28C6A'], ['3D lamp room', '#B78E7A'],
    ['3D main', '#79A48C'], ['3D blue', '#728BAC'], ['3D brown', '#987A5B'], ['App pink', '#FF88C8'],
  ];

  // ── colour maths: sRGB <-> OKLCH, sRGB <-> HSL ─────────────────────────
  function toLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function toSrgb(c) { c = Math.max(0, Math.min(1, c)); return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055); }
  function rgbToOklch(r, g, b) {
    r = toLin(r); g = toLin(g); b = toLin(b);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    var h = Math.atan2(B, A) * 180 / Math.PI; if (h < 0) h += 360;
    return [L, Math.hypot(A, B), h];
  }
  function oklchToRgb(L, C, H) {
    var a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
    var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    var m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    var s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return [toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0, l = (mx + mn) / 2;
    var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
    return [h, s * 100, l * 100];
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; } else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; } else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  function hex(rgb) { return '#' + rgb.map(function (v) { return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'); }).join('').toUpperCase(); }
  function parseHex(h) {
    h = (h || '').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); });
  }
  function mix(a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); }

  // ── state ──────────────────────────────────────────────────────────────
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) {}
  var state = {
    base: parseHex(saved[PAGE] && saved[PAGE].base || original) || [128, 155, 188],
    grey: saved[PAGE] ? saved[PAGE].grey || 0 : 0,        // % mixed toward the page grey
    hover: saved[PAGE] ? saved[PAGE].hover || 30 : pageHover, // % of black in the logo's hover
  };
  var PAGE_GREY = [220, 220, 227];
  function finalRgb() { return mix(state.base, PAGE_GREY, state.grey / 100); }

  function apply() {
    var c = hex(finalRgb());
    root.style.setProperty('--accent-orange', c);
    if (getComputedStyle(root).getPropertyValue('--accent-ink')) root.style.setProperty('--accent-ink', c);
    var hov = 'color-mix(in oklch, ' + c + ', black ' + state.hover + '%)';
    var nav = document.getElementById('top-bar');
    try {
      var nr = nav && nav.contentDocument && nav.contentDocument.documentElement;
      if (nr) { nr.style.setProperty('--logo-color', c); nr.style.setProperty('--logo-hover', hov); }
    } catch (e) {}
    // Listed only once something was changed here: a page merely visited keeps
    // its own colour and stays out of "Copy all pages".
    if (c !== original.toUpperCase() || state.grey || state.hover !== pageHover) {
      saved[PAGE] = { color: c, base: hex(state.base), grey: state.grey, hover: state.hover };
    } else delete saved[PAGE];
    try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch (e) {}
    render();
  }
  // Re-apply once the nav iframe has loaded, so the logo follows from the start.
  var navEl = document.getElementById('top-bar');
  if (navEl) navEl.addEventListener('load', function () { apply(); });

  // ── panel ──────────────────────────────────────────────────────────────
  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483000;';
  var sh = host.attachShadow({ mode: 'open' });
  sh.innerHTML = '<style>' +
    ':host{all:initial}' +
    '.p{font:12px/1.35 system-ui,-apple-system,sans-serif;color:#1A1A1A;background:rgba(236,236,241,.97);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);width:360px;max-height:calc(100vh - 130px);overflow:auto;padding:12px 14px 14px;box-sizing:border-box}' +
    '.p.min .body{display:none}.top{display:flex;align-items:center;gap:8px}.sw{width:30px;height:30px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}' +
    '.t{font-weight:600;flex:1}.t small{display:block;font-weight:400;color:#8E8E93}' +
    'button{font:inherit;border:0;border-radius:8px;background:#DCDCE3;padding:5px 9px;cursor:pointer;color:#1A1A1A}button:hover{background:#cfcfd8}' +
    'h4{margin:12px 0 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8E8E93}' +
    '.row{display:grid;grid-template-columns:96px 1fr 62px;align-items:center;gap:8px;margin:3px 0}' +
    '.row label{color:#555}.row input[type=range]{width:100%;margin:0}.row input[type=number]{width:62px;box-sizing:border-box;font:inherit;padding:2px 4px;border:1px solid #c9c9d2;border-radius:6px;background:#fff}' +
    '.hexrow{display:flex;gap:6px;align-items:center;margin-top:4px}.hexrow input[type=text]{flex:1;font:13px ui-monospace,monospace;padding:5px 7px;border:1px solid #c9c9d2;border-radius:8px}' +
    '.hexrow input[type=color]{width:38px;height:30px;border:0;padding:0;background:none}' +
    '.pre{display:flex;flex-wrap:wrap;gap:6px}.pre button{display:flex;align-items:center;gap:5px;padding:4px 7px}.pre i{width:12px;height:12px;border-radius:50%;display:inline-block}' +
    '.prev{display:flex;gap:8px;align-items:center;margin-top:6px}.prev .b{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-weight:600}' +
    '.prev .lbl{font-weight:600;text-transform:uppercase;letter-spacing:.04em}' +
    'textarea{width:100%;box-sizing:border-box;height:84px;font:11px ui-monospace,monospace;border:1px solid #c9c9d2;border-radius:8px;padding:6px;margin-top:6px}' +
    '.acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ok{color:#2e7d4f;margin-left:4px}' +
    '@media (max-width:640px){.p{width:calc(100vw - 32px);max-height:60vh}}' +
    '</style><div class="p"></div>';
  var panel = sh.querySelector('.p');
  (document.body || document.documentElement).appendChild(host);

  var minimized = false;
  try { minimized = sessionStorage.getItem('accentTuner:min') === '1'; } catch (e) {}

  function slider(id, label, min, max, step, value) {
    return '<div class="row"><label for="' + id + '">' + label + '</label>' +
      '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">' +
      '<input type="number" data-for="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '"></div>';
  }
  var copyNote = '';
  // Built once; afterwards update() only writes values, so a slider being
  // dragged is never replaced under the pointer.
  function build() {
    panel.innerHTML =
      '<div class="top"><span class="sw"></span><div class="t">Accent · ' + PAGE + '<small id="sub"></small></div>' +
      '<button data-act="min" id="minbtn"></button><button data-act="close" title="Close the tuner">✕</button></div>' +
      '<div class="body">' +
      '<div class="hexrow"><input type="text" id="hex" spellcheck="false"><input type="color" id="pick"></div>' +
      '<h4>OKLCH (perceptual)</h4>' +
      slider('L', 'Lightness', 0, 1, 0.005, 0) + slider('C', 'Chroma', 0, 0.3, 0.001, 0) + slider('H', 'Hue', 0, 360, 0.5, 0) +
      '<h4>HSL</h4>' +
      slider('hh', 'Hue', 0, 360, 1, 0) + slider('hs', 'Saturation', 0, 100, 0.5, 0) + slider('hl', 'Lightness', 0, 100, 0.5, 0) +
      '<h4>RGB</h4>' +
      slider('r', 'Red', 0, 255, 1, 0) + slider('g', 'Green', 0, 255, 1, 0) + slider('b', 'Blue', 0, 255, 1, 0) +
      '<h4>Wash out &amp; hover</h4>' +
      slider('grey', 'Toward grey %', 0, 100, 1, 0) + slider('hover', 'Logo hover dark %', 0, 70, 1, 0) +
      '<h4>Preview</h4><div class="prev"><span class="b pv-bg">1</span><span class="lbl pv-fg">Zeitraum</span><span style="display:flex;gap:4px">' +
      [0, 1, 2, 3, 4].map(function () { return '<i class="pv-bg" style="width:5px;height:5px;border-radius:50%;display:inline-block"></i>'; }).join('') + '</span></div>' +
      '<h4>Presets (current site colours)</h4><div class="pre">' +
      PRESETS.map(function (p) { return '<button data-preset="' + p[1] + '"><i style="background:' + p[1] + '"></i>' + p[0] + '</button>'; }).join('') + '</div>' +
      '<div class="acts"><button data-act="reset">Reset this page</button><button data-act="copy">Copy all pages</button><button data-act="clear">Forget all</button><span class="ok" id="note"></span></div>' +
      '<textarea readonly></textarea></div>';
  }
  function setVal(id, v) {
    var r = sh.getElementById(id), n = sh.querySelector('[data-for="' + id + '"]');
    if (r && sh.activeElement !== r) r.value = v;
    if (n && sh.activeElement !== n) n.value = v;
  }
  function render() {
    var c = hex(finalRgb());
    var lch = rgbToOklch.apply(null, state.base), hsl = rgbToHsl.apply(null, state.base);
    panel.className = 'p' + (minimized ? ' min' : '');
    sh.querySelector('.sw').style.background = c;
    sh.getElementById('sub').textContent = c + (c !== original.toUpperCase() ? ' · page: ' + original.toUpperCase() : '');
    sh.getElementById('minbtn').textContent = minimized ? '▲' : '▼';
    var hx = sh.getElementById('hex'); if (sh.activeElement !== hx) hx.value = hex(state.base);
    sh.getElementById('pick').value = hex(state.base).toLowerCase();
    setVal('L', lch[0].toFixed(3)); setVal('C', lch[1].toFixed(3)); setVal('H', lch[2].toFixed(1));
    setVal('hh', hsl[0].toFixed(0)); setVal('hs', hsl[1].toFixed(1)); setVal('hl', hsl[2].toFixed(1));
    setVal('r', Math.round(state.base[0])); setVal('g', Math.round(state.base[1])); setVal('b', Math.round(state.base[2]));
    setVal('grey', state.grey); setVal('hover', state.hover);
    sh.querySelectorAll('.pv-bg').forEach(function (e) { e.style.background = c; });
    sh.querySelector('.pv-fg').style.color = c;
    sh.getElementById('note').textContent = copyNote;
    sh.querySelector('textarea').value = exportText();
  }
  function exportText() {
    var lines = ['Accent colours (accent tuner):'];
    Object.keys(saved).sort().forEach(function (k) { lines.push(k + ': ' + saved[k].color + '  (grey ' + saved[k].grey + '%, hover ' + saved[k].hover + '%)'); });
    return lines.join('\n');
  }

  function setFrom(id, v) {
    v = parseFloat(v); if (isNaN(v)) return;
    var lch = rgbToOklch.apply(null, state.base), hsl = rgbToHsl.apply(null, state.base);
    if (id === 'L') state.base = oklchToRgb(v, lch[1], lch[2]);
    else if (id === 'C') state.base = oklchToRgb(lch[0], v, lch[2]);
    else if (id === 'H') state.base = oklchToRgb(lch[0], lch[1], v);
    else if (id === 'hh') state.base = hslToRgb(v, hsl[1], hsl[2]);
    else if (id === 'hs') state.base = hslToRgb(hsl[0], v, hsl[2]);
    else if (id === 'hl') state.base = hslToRgb(hsl[0], hsl[1], v);
    else if (id === 'r') state.base = [v, state.base[1], state.base[2]];
    else if (id === 'g') state.base = [state.base[0], v, state.base[2]];
    else if (id === 'b') state.base = [state.base[0], state.base[1], v];
    else if (id === 'grey') state.grey = v;
    else if (id === 'hover') state.hover = v;
    apply();
  }
  sh.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'hex') { var p = parseHex(t.value); if (p) { state.base = p; apply(); } return; }
    if (t.id === 'pick') { state.base = parseHex(t.value); apply(); return; }
    setFrom(t.dataset.for || t.id, t.value);
  });
  sh.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.preset) { state.base = parseHex(b.dataset.preset); state.grey = 0; apply(); return; }
    var a = b.dataset.act;
    if (a === 'min') { minimized = !minimized; try { sessionStorage.setItem('accentTuner:min', minimized ? '1' : '0'); } catch (err) {} render(); }
    else if (a === 'close') {
      try { sessionStorage.removeItem('accentTuner'); } catch (err) {}
      root.style.removeProperty('--accent-orange'); root.style.removeProperty('--accent-ink');
      try { var nr = navEl.contentDocument.documentElement; nr.style.removeProperty('--logo-color'); nr.style.removeProperty('--logo-hover'); navEl.contentWindow.postMessage({ type: 'accent' }, '*'); } catch (err) {}
      host.remove();
    }
    else if (a === 'reset') { delete saved[PAGE]; try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch (err) {} state.base = parseHex(original) || state.base; state.grey = 0; state.hover = pageHover; apply(); }
    else if (a === 'clear') { saved = {}; try { localStorage.removeItem(STORE); } catch (err) {} state.base = parseHex(original) || state.base; state.grey = 0; state.hover = pageHover; apply(); }
    else if (a === 'copy') {
      var txt = exportText();
      var done = function () { copyNote = 'copied'; render(); setTimeout(function () { copyNote = ''; render(); }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { sh.querySelector('textarea').select(); });
      else { sh.querySelector('textarea').select(); }
    }
  });
  build();
  apply();
})();
