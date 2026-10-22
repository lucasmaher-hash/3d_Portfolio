// Shared by the six project pages.

// 3D-scene entry point: ?from=3d (set by the click handler in src/main.js
// when a scene object navigates here) hides the usual nav bar and shows
// a fixed "Exit" pill (top-left) that returns to the 3D scene instead.
(function () {
  if (new URLSearchParams(location.search).get('from') !== '3d') return;
  var topBarEl = document.getElementById('top-bar');
  if (topBarEl) topBarEl.style.display = 'none';
  // A 3D-scene click is only meant to open this ONE project page — no
  // hopping to other projects from here — so the prev/next footer nav
  // is hidden too. Untouched when the page is opened normally from 2D.
  var projectNavEl = document.querySelector('.project-nav');
  if (projectNavEl) projectNavEl.style.display = 'none';
  var style = document.createElement('style');
  // Both shadows are gated on .is-raised — see updateExitShadow() below.
  // The transform lift is NOT gated: it works on any background.
  style.textContent = '.exit-3d-btn{position:fixed;top:24px;left:24px;z-index:10000;background:var(--bg-surface);border:none;border-radius:9999px;padding:10px 24px;font-family:"Roboto Flex UI","Roboto Flex",sans-serif;font-size-adjust:0.4;font-weight:500;font-size:16px;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-primary);box-shadow:none;cursor:pointer;text-decoration:none;transition:left 200ms ease, transform 150ms ease, box-shadow 260ms cubic-bezier(.2,.7,.2,1);}.exit-3d-btn.is-raised{box-shadow:var(--shadow-raised-sm);}.exit-3d-btn:hover{transform:translateY(-2px) scale(1.03);transition:left 200ms ease, transform 150ms ease, box-shadow 150ms ease;}.exit-3d-btn.is-raised:hover{box-shadow:11px 11px 24px rgba(174,174,192,0.9), -8px -8px 20px rgba(255,255,255,1);}';
  style.textContent += /* keyframes start AND end in the :hover pose: an animation replaces the
     whole transform, so plain scale(1) frames made the button first DROP
     out of its hover lift on click. The mouse is on the button when this
     runs, so the hover pose is the correct base in every frame. */
  '@keyframes exitPop{0%{transform:translateY(-2px) scale(1.03)}50%{transform:translateY(-2px) scale(1.15)}100%{transform:translateY(-2px) scale(1.03)}}';
  document.head.appendChild(style);
  var btn = document.createElement('a');
  // Each numbered iteration returns to its own scene; normal 3D uses the default.
  var sceneId = new URLSearchParams(location.search).get('scene');
  var sceneEntries = { 'gallery-1': '/gallery-1.html', 'gallery-4': '/gallery-4.html', 'gallery-baked': '/gallery-4.html' };
  btn.href = Object.prototype.hasOwnProperty.call(sceneEntries, sceneId) ? sceneEntries[sceneId] : '/';
  btn.className = 'exit-3d-btn';
  btn.textContent = 'Exit';
  document.body.appendChild(btn);

  // Same button-pop as the 3D scene objects: pulse ~0.28s, THEN navigate.
  // The deliberate delay is what makes the press visible before the page
  // leaves — without it the pulse would be cut off by the navigation.
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    if (btn.dataset.leaving) return;   // double-click guard
    btn.dataset.leaving = '1';
    btn.style.animation = 'exitPop 280ms ease';
    setTimeout(function () { window.location.href = btn.getAttribute('href'); }, 280);
  });

  // An iOS forward-swipe back into this page restores it from the
  // back-forward cache with `leaving` still set, which leaves the pill
  // permanently dead. Same latched-guard bug as the 3D scene's
  // popNavigating; `persisted` is the only signal a bfcache restore gives.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    delete btn.dataset.leaving;
    btn.style.animation = '';
  });

  // Keep the button clear of .page-wrapper's left border. It CENTRES in the
  // open margin between the viewport edge and that border, capped at
  // MARGIN_GAP so wide monitors don't push it far from the corner; if the
  // margin is too tight for the pill to breathe, it tucks just inside the
  // frame instead of letting the border cut across it.
  //
  // Centring rather than a fixed offset is what fixes MacBook widths: at
  // 1440–1512 the margin is 110px and the pill 76px, so a flat 34px put its
  // right edge at exactly 110 — touching the border, with the raised
  // shadow (5px offset + 12px blur ≈ 17px) spilling over it. Centring
  // leaves 17px either side, which is precisely the room that shadow needs.
  // Above ~1700px the cap takes over and the position is unchanged.
  function positionExitBtn() {
    var wrapper = document.querySelector('.page-wrapper');
    if (!wrapper) return;
    var wrapperLeft = wrapper.getBoundingClientRect().left;
    var btnWidth    = btn.offsetWidth;
    var MARGIN_GAP  = 34;   // cap: furthest from the viewport edge it may sit
    var INSET_GAP   = 26;   // fallback: tucked just inside the frame
    var MIN_SIDE    = 14;   // least breathing room wanted on each side
    var margin = wrapperLeft - btnWidth;   // free space beside the frame
    btn.style.left = (margin >= MIN_SIDE * 2)
      ? Math.min(MARGIN_GAP, margin / 2) + 'px'
      : (wrapperLeft + INSET_GAP) + 'px';
  }
  positionExitBtn();
  window.addEventListener('resize', positionExitBtn);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(positionExitBtn);

  // A neumorphic shadow only reads correctly over the page's own surface
  // colour — anywhere else the white highlight and grey shadow become a
  // glowing halo. So the pill drops both shadows whenever something other
  // than that surface is behind it.
  //
  // This asks what is ACTUALLY PAINTED behind the button rather than
  // intersecting rectangles with a list of selectors. Two earlier versions
  // failed because the list was never complete: a hero-only test left the
  // halo on over the process shots further down, and a '.hero, img, video'
  // test still missed Unify's colour-palette swatches, which are plain divs
  // with a background-colour — the button sat glowing on a hot pink square.
  // Hit-testing has no such list to keep up to date: an image, a video, a
  // dark hero container and a coloured div all register the same way.
  var EXIT_SAMPLES = 3;   // 3x3 grid. Coverage lands in ninths, which
                          // straddles the 50% threshold cleanly: 4/9 = 44%,
                          // 5/9 = 56%, so there is no exact-tie flicker.

  // What paints at this point, ignoring the button itself. Walks DOWN the
  // stack past anything transparent, because the surface-coloured section
  // wrappers are usually several levels below whatever sits on top.
  function exitPaintAt(x, y) {
    var stack = document.elementsFromPoint(x, y);
    for (var i = 0; i < stack.length; i++) {
      var el = stack[i];
      if (el === btn || btn.contains(el)) continue;
      var tag = el.tagName;
      if (tag === 'IMG' || tag === 'VIDEO' || tag === 'CANVAS') return 'media';
      var cs = getComputedStyle(el);
      // A real bitmap counts; a CSS gradient does not — the only gradients
      // here are the .dot-divider rules, which are decoration ON the surface.
      if (cs.backgroundImage.indexOf('url(') === 0) return 'media';
      var bg = cs.backgroundColor;
      if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') continue;
      return bg;
    }
    return null;   // nothing opaque found — the page background shows through
  }

  function updateExitShadow() {
    var b = btn.getBoundingClientRect();
    if (!b.width || !b.height) return;
    var surface = getComputedStyle(document.body).backgroundColor;
    var covered = 0, total = EXIT_SAMPLES * EXIT_SAMPLES;
    for (var iy = 0; iy < EXIT_SAMPLES; iy++) {
      for (var ix = 0; ix < EXIT_SAMPLES; ix++) {
        var paint = exitPaintAt(
          b.left + b.width  * (ix + 0.5) / EXIT_SAMPLES,
          b.top  + b.height * (iy + 0.5) / EXIT_SAMPLES
        );
        if (paint !== null && paint !== surface) covered++;
      }
    }
    btn.classList.toggle('is-raised', covered <= total * 0.5);
  }

  // rAF-throttled: nine hit tests plus a getComputedStyle walk per sample is
  // real work, so it must not run more than once per frame during a scroll.
  var exitTick = false;
  function requestExitShadow() {
    if (exitTick) return;
    exitTick = true;
    requestAnimationFrame(function () { exitTick = false; updateExitShadow(); });
  }
  window.addEventListener('scroll', requestExitShadow, { passive: true });
  window.addEventListener('resize', requestExitShadow, { passive: true });
  // Images that arrive late change what is behind the button without any
  // scroll happening, so re-check on load as well as on these timers.
  window.addEventListener('load', updateExitShadow);
  updateExitShadow();
  requestAnimationFrame(updateExitShadow);
  setTimeout(updateExitShadow, 120);
  setTimeout(updateExitShadow, 500);
})();
