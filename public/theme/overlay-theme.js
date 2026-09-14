/* ── Dark mode for the 3D view's overlay pages (2026-09-14) ───────────────────
   about3d / contact3d / craft3d / controls_open3d / controls_fullscreen3d are
   iframes inside index.html. They cannot use the 2D pages' approach — a
   `@media (max-width: 640px)` block keyed on <html data-theme> — because a
   media query in a frame measures the FRAME, and these windows are ~330px wide
   on a phone and still under 640px on plenty of desktop windows.

   So the parent decides: dark only while index.html itself is dark AND its own
   viewport is at phone width, exactly the condition dark-mobile.css uses. The
   answer lands on this document as <html data-theme-dark>, and
   /theme/dark-3d-overlays.css keys on that attribute with no media query.

   Loaded synchronously in <head>, after the parent's own pre-paint script has
   run, so the frame's first paint is already the right theme. Re-checked when
   the menu's toggle posts 'theme-change', when another tab changes
   localStorage.theme, and when the parent crosses 640px (a rotated phone). */
(function () {
  var root = document.documentElement;
  var parentWin = null;
  try { if (window.parent && window.parent !== window) parentWin = window.parent; } catch (e) {}

  function sync() {
    var dark = false;
    try {
      dark = !!parentWin &&
        parentWin.document.documentElement.getAttribute('data-theme') === 'dark' &&
        parentWin.matchMedia('(max-width: 640px)').matches;
    } catch (e) {}
    if (dark) root.setAttribute('data-theme-dark', '');
    else root.removeAttribute('data-theme-dark');
  }

  sync();
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'theme-change') sync();
  });
  // The storage event can arrive here before the parent's own listener has
  // flipped its attribute, so read the parent a tick later.
  window.addEventListener('storage', function (e) {
    if (e.key === 'theme' || e.key === null) setTimeout(sync, 0);
  });
  try {
    var mq = parentWin && parentWin.matchMedia('(max-width: 640px)');
    if (mq && mq.addEventListener) mq.addEventListener('change', sync);
  } catch (e) {}
})();
