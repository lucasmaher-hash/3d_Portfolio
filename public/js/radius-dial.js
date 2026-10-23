// Corner-curvature dial for the landing page and the six project pages (and the Unify
// app-home frames embedded in the Unify page). NOT the nav bar: its pills stay as designed.
// Lucas, 2026-10-23. A dev dial: nothing shows and nothing changes for visitors.
//
//   ?dial        turns it on in this browser (localStorage) and it stays on
//   ?dial=off    turns it off again and puts every corner back
//
// One multiplier (0-250%) scales every border-radius on the page: rules in the stylesheets
// (also inside @media/@supports) and inline style="" attributes, in px, %, cqw and em.
// Left alone on purpose: 0, circles/pills (50% and up, px >= PILL) and the phone-frame screen
// holes (.phone-shot*: their radius is the frame image's own geometry). Originals are
// remembered, so the dial is always relative to the authored design and 100% restores it.
//
// The panel lives in the top document only. The nav bar is an iframe of the same origin and
// follows through the `storage` event, so it needs no message passing. To keep a chosen value:
// read it off the panel and bake it into the CSS (or ask), then remove this script.
(function () {
  var KEY = 'radiusDial', ON = 'radiusDialOn', PILL = 99;
  var LONG = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];
  var q = /[?&]dial(?:=([^&]*))?/.exec(location.search);
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  if (q && window === window.top) {
    if (q[1] === 'off') { set(ON, null); set(KEY, null); set(KEY + 'Media', null); set(KEY + 'Open', null); } else set(ON, '1');
  }
  if (get(ON) !== '1') return;

  // ── collect every scalable radius once ──
  var items = [];           // { style, prop, orig, prio }
  var seen = new WeakSet();
  // A value that never scales: zero, a pill (px >= PILL) or a circle/half (% >= 50).
  function fixed(n, u) { return n === 0 || (u === 'px' && n >= PILL) || (u === '%' && n >= 50); }
  function grab(style) {
    if (seen.has(style)) return;
    seen.add(style);
    LONG.forEach(function (prop) {
      var v = style.getPropertyValue(prop);
      if (!v || /var\(|calc\(/.test(v)) return;
      var toks = v.trim().split(/\s+/);
      if (!toks.every(function (t) { return /^-?[\d.]+(px|%|cqw|cqi|em|rem)?$/.test(t); })) return;
      var nums = toks.map(parseFloat), units = toks.map(function (t) { return t.replace(/^-?[\d.]+/, '') || 'px'; });
      if (nums.every(function (n, i) { return fixed(n, units[i]); })) return;
      items.push({ style: style, prop: prop, nums: nums, units: units, prio: style.getPropertyPriority(prop) });
    });
  }
  function walk(rules) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.style && r.type === 1) { if (!/rdial|phone-shot|phone-frame/.test(r.selectorText)) grab(r.style); }
      else if (r.cssRules && r.type !== 7) walk(r.cssRules);   // @media, @supports (not @keyframes)
    }
  }
  function collect() {
    for (var i = 0; i < document.styleSheets.length; i++) {
      try { walk(document.styleSheets[i].cssRules); } catch (e) { /* cross-origin sheet (fonts) */ }
    }
    var inl = document.querySelectorAll('[style*="radius"]');
    for (var j = 0; j < inl.length; j++) grab(inl[j].style);
  }

  var k = parseFloat(get(KEY));
  if (!(k >= 0 && k <= 2.5)) k = 1;
  function apply(scale) {
    k = scale;
    items.forEach(function (it) {
      var out = it.nums.map(function (n, i) {
        return fixed(n, it.units[i]) ? n + it.units[i] : (Math.round(n * scale * 1000) / 1000) + it.units[i];
      }).join(' ');
      it.style.setProperty(it.prop, out, it.prio);
    });
  }
  function start() { collect(); apply(k); }
  if (document.readyState === 'complete') start();
  else { document.addEventListener('DOMContentLoaded', start); window.addEventListener('load', function () { collect(); apply(k); }); }

  // The nav iframe (and any other same-origin frame) follows the top document.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { var v = parseFloat(e.newValue); apply(v >= 0 && v <= 2.5 ? v : 1); }
    if (e.key === ON && e.newValue !== '1') apply(1);
  });
  if (window !== window.top) return;

  // ── the panel ──
  // Second slider: the photos, videos and screenshots on the project pages are square by
  // design (radius 0), so a multiplier cannot round them. "Images" is an absolute radius
  // in px put on exactly those media (not the full-bleed hero, phone frames, turntable or
  // device renders). 0 = no rule at all, i.e. the design as authored.
  var MEDIA = [
    '.guide-media', '.guide-media img', '.guide-media video', '.stagger-figure:not(.phone) img',
    '.result-image-pair img', '.process-video', '.process-video video',
    '.gallery-main img', '.gallery-main video', '.lamp-scrolly-vid video'
  ].join(',');
  var mstyle = document.createElement('style');
  document.head.appendChild(mstyle);
  var m = parseFloat(get(KEY + 'Media'));
  if (!(m >= 0 && m <= 80)) m = 0;
  function applyMedia(px) {
    m = px;
    mstyle.textContent = px > 0 ? MEDIA + '{border-radius:' + px + 'px !important;overflow:hidden}' : '';
  }
  applyMedia(m);

  var css = document.createElement('style');
  css.textContent =
    '#rdial{position:fixed;right:18px;bottom:18px;z-index:100000;font:500 12px/1.2 "Roboto Flex",system-ui,sans-serif;color:#1A1A1A;letter-spacing:.02em}' +
    '#rdial *{box-sizing:border-box;border-radius:0 !important}' +                 // the dial itself never moves
    '#rdial .box{display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:#DCDCE3;border-radius:14px !important;' +
      'box-shadow:5px 5px 12px rgba(40,40,90,.2),-5px -5px 12px rgba(255,255,255,.9)}' +
    '#rdial .row{display:flex;align-items:center;gap:10px}' +
    '#rdial .row.head{justify-content:flex-end;gap:2px}' +
    '#rdial label{color:#8E8E93;text-transform:uppercase;font-size:10px;letter-spacing:.08em;width:50px}' +
    '#rdial input[type=range]{width:150px;accent-color:#809BBC;margin:0}' +
    '#rdial output{min-width:42px;text-align:right;font-variant-numeric:tabular-nums}' +
    '#rdial button{all:unset;cursor:pointer;display:grid;place-items:center;width:24px;height:24px;color:#8E8E93;font-size:13px;border-radius:50% !important}' +
    '#rdial button:hover{color:#1A1A1A}' +
    '#rdial .dot{width:40px;height:40px;background:#DCDCE3;color:#1A1A1A;font-size:15px;border-radius:50% !important;' +
      'box-shadow:4px 4px 9px rgba(40,40,90,.2),-4px -4px 9px rgba(255,255,255,.9)}' +
    '#rdial[data-open="0"] .box{display:none}#rdial[data-open="1"] .dot{display:none}';
  document.head.appendChild(css);
  var el = document.createElement('div');
  el.id = 'rdial';
  el.setAttribute('data-open', get(KEY + 'Open') === '0' ? '0' : '1');
  el.innerHTML =
    '<div class="box">' +
    '<div class="row head"><button class="reset" title="Back to the design" aria-label="Reset">&#8634;</button>' +
    '<button class="hide" title="Hide into a button" aria-label="Hide">&#8211;</button></div>' +
    '<div class="row"><label for="rdial-r">Corners</label><input id="rdial-r" type="range" min="0" max="250" step="1" aria-label="Scale every existing corner radius"><output class="o1"></output></div>' +
    '<div class="row"><label for="rdial-m">Images</label><input id="rdial-m" type="range" min="0" max="80" step="1" aria-label="Corner radius on project images and videos"><output class="o2"></output></div>' +
    '</div>' +
    '<button class="dot" title="Corner dial" aria-label="Show the corner dial">&#9695;</button>';
  var range = el.querySelector('#rdial-r'), out = el.querySelector('.o1');
  var mrange = el.querySelector('#rdial-m'), mout = el.querySelector('.o2');
  function show() {
    range.value = Math.round(k * 100); out.textContent = Math.round(k * 100) + '%';
    mrange.value = Math.round(m); mout.textContent = Math.round(m) + 'px';
  }
  range.addEventListener('input', function () { apply(range.value / 100); set(KEY, String(k)); show(); });
  mrange.addEventListener('input', function () { applyMedia(+mrange.value); set(KEY + 'Media', String(m)); show(); });
  el.querySelector('.reset').addEventListener('click', function () {
    apply(1); set(KEY, '1'); applyMedia(0); set(KEY + 'Media', '0'); show();
  });
  function open(v) { el.setAttribute('data-open', v ? '1' : '0'); set(KEY + 'Open', v ? '1' : '0'); }
  el.querySelector('.hide').addEventListener('click', function () { open(false); });
  el.querySelector('.dot').addEventListener('click', function () { open(true); });
  show();
  document.body.appendChild(el);
})();
