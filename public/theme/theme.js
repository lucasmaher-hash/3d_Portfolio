/* ── Light / dark toggle for the burger menu (2026-09-14) ─────────────────────
   The attribute itself is set BEFORE first paint by a two-line inline script at
   the top of every page's <head> — this file only has to keep the toggle's
   highlight in sync and flip the theme when a segment is tapped. It is loaded
   with `defer`, so the menu markup exists by the time it runs.

   Stored in localStorage.theme ('dark' or absent), the same way the language
   lives in localStorage.lang — so the choice survives reloads and carries
   across every page, and a change made in one tab reaches the others through
   the `storage` event.

   The nav bar is its own document (an iframe) and follows the theme itself:
   it reads localStorage on load and listens for 'theme-change'. The message is
   posted here as well as the storage event firing, because the storage event
   is not delivered to the document that made the write — only to others. */
(function () {
  var KEY = 'theme';
  var root = document.documentElement;

  function read() {
    try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; }
    catch (e) { return 'light'; }
  }

  function mark(theme) {
    var btns = document.querySelectorAll('[data-theme-choice]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('is-active', btns[i].getAttribute('data-theme-choice') === theme);
    }
  }

  function apply(theme) {
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    mark(theme);
  }

  // Every iframe, not only the nav: the landing page's hero blob is a frame too
  // and follows the theme. Frames that do not listen simply ignore the message.
  function tellNav(theme) {
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) {
      try { if (frames[i].contentWindow) frames[i].contentWindow.postMessage({ type: 'theme-change', theme: theme }, '*'); }
      catch (e) {}
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-theme-choice]');
    if (!btn) return;
    var theme = btn.getAttribute('data-theme-choice') === 'dark' ? 'dark' : 'light';
    try {
      if (theme === 'dark') localStorage.setItem(KEY, 'dark');
      else localStorage.removeItem(KEY);
    } catch (err) {}
    apply(theme);
    tellNav(theme);
  });

  window.addEventListener('storage', function (e) {
    if (e.key === KEY || e.key === null) apply(read());
  });

  mark(read());
})();
