// Corner-curvature dial for the landing page, the six project pages and the nav bar.
// Lucas, 2026-10-23. A dev dial: nothing shows and nothing changes for visitors.
//
//   ?dial        turns it on in this browser (localStorage) and it stays on
//   ?dial=off    turns it off again and puts every corner back
//
// One multiplier (0-250%) scales every fixed-px border-radius on the page: rules in the
// stylesheets (also inside @media/@supports) and inline style="" attributes. Left alone on
// purpose: 0, %, cqw/em radii (circles, and the picture-like scenes that scale as one image)
// and anything >= PILL px (the 9999px / 999px pill shapes). Originals are remembered, so the
// dial is always relative to the authored design and 100% restores it exactly.
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
    if (q[1] === 'off') { set(ON, null); set(KEY, null); } else set(ON, '1');
  }
  if (get(ON) !== '1') return;

  // ── collect every scalable radius once ──
  var items = [];           // { style, prop, orig, prio }
  var seen = new WeakSet();
  function grab(style) {
    if (seen.has(style)) return;
    seen.add(style);
    LONG.forEach(function (prop) {
      var v = style.getPropertyValue(prop);
      if (!v || /var\(|calc\(|%|cqw|em|rem|vw|vh/.test(v)) return;
      var toks = v.trim().split(/\s+/);
      if (!toks.every(function (t) { return /^-?[\d.]+(px)?$/.test(t); })) return;
      var nums = toks.map(parseFloat);
      if (nums.every(function (n) { return n === 0 || n >= PILL; })) return;
      items.push({ style: style, prop: prop, nums: nums, prio: style.getPropertyPriority(prop) });
    });
  }
  function walk(rules) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.style && r.type === 1) { if (!/rdial/.test(r.selectorText)) grab(r.style); }
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
      var out = it.nums.map(function (n) {
        return (n === 0 || n >= PILL) ? n + 'px' : (Math.round(n * scale * 100) / 100) + 'px';
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
  var css = document.createElement('style');
  css.textContent =
    '#rdial{position:fixed;right:18px;bottom:18px;z-index:100000;font:500 12px/1.2 "Roboto Flex",system-ui,sans-serif;color:#1A1A1A;letter-spacing:.02em}' +
    '#rdial *{box-sizing:border-box;border-radius:0 !important}' +                 // the dial itself never moves
    '#rdial .box{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#DCDCE3;border-radius:14px !important;' +
      'box-shadow:5px 5px 12px rgba(40,40,90,.2),-5px -5px 12px rgba(255,255,255,.9)}' +
    '#rdial .box>*{border-radius:0}' +
    '#rdial label{color:#8E8E93;text-transform:uppercase;font-size:10px;letter-spacing:.08em}' +
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
    '<div class="box"><label for="rdial-r">Corners</label>' +
    '<input id="rdial-r" type="range" min="0" max="250" step="1" aria-label="Corner curvature">' +
    '<output></output><button class="reset" title="Back to the design (100%)" aria-label="Reset">&#8634;</button>' +
    '<button class="hide" title="Hide into a button" aria-label="Hide">&#8211;</button></div>' +
    '<button class="dot" title="Corner dial" aria-label="Show the corner dial">&#9695;</button>';
  var range = el.querySelector('input'), out = el.querySelector('output');
  function show(scale) { range.value = Math.round(scale * 100); out.textContent = Math.round(scale * 100) + '%'; }
  function commit(scale) { apply(scale); show(scale); set(KEY, String(scale)); }
  range.addEventListener('input', function () { commit(range.value / 100); });
  el.querySelector('.reset').addEventListener('click', function () { commit(1); });
  function open(v) { el.setAttribute('data-open', v ? '1' : '0'); set(KEY + 'Open', v ? '1' : '0'); }
  el.querySelector('.hide').addEventListener('click', function () { open(false); });
  el.querySelector('.dot').addEventListener('click', function () { open(true); });
  show(k);
  document.body.appendChild(el);
})();
