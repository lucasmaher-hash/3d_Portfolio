/* ── Light / dark toggle for the burger menu (2026-09-14) ─────────────────────
   The attribute itself is set BEFORE first paint by a two-line inline script at
   the top of every page's <head> — this file only has to keep the toggle's
   highlight in sync and flip the theme when a segment is tapped. It is loaded
   with `defer`, so the menu markup exists by the time it runs.

   Stored in localStorage.theme, the same way the language lives in
   localStorage.lang — so the choice survives reloads and carries across every
   page, and a change made in one tab reaches the others through the `storage`
   event.

   THREE states, not two: 'dark' and 'light' are explicit taps and always win,
   and the key being ABSENT means "decide by the clock" — dark from 20:00 to
   08:00 local, light through the day (2026-09-15). That is why tapping Hell now
   WRITES 'light' instead of removing the key: removing it would hand the page
   back to the clock, so a visitor choosing light at 21:00 would get dark again
   on the next load. The same rule runs in the pre-paint one-liner at the top of
   every page's <head> and in the nav's own copy (top_row_permanent_V3.html) —
   all three have to agree, so change them together.

   The clock is only read at load. A page left open across 20:00 does not flip
   under the reader; that would be a jarring, unrequested repaint mid-visit.

   The nav bar is its own document (an iframe) and follows the theme itself:
   it reads localStorage on load and listens for 'theme-change'. The message is
   posted here as well as the storage event firing, because the storage event
   is not delivered to the document that made the write — only to others. */
(function () {
  var KEY = 'theme';
  var root = document.documentElement;

  // Dark between DARK_FROM and DARK_UNTIL, by the visitor's own clock.
  var DARK_FROM = 20, DARK_UNTIL = 8;
  function byClock() {
    var h = new Date().getHours();
    return (h >= DARK_FROM || h < DARK_UNTIL) ? 'dark' : 'light';
  }

  function read() {
    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}
    if (stored === 'dark' || stored === 'light') return stored;
    return byClock();
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
    // Both choices are written, 'light' included — see the three-state note at
    // the top. Clearing the key would mean "follow the clock", not "stay light".
    try { localStorage.setItem(KEY, theme); } catch (err) {}
    apply(theme);
    tellNav(theme);
  });

  // The segments are pixel glyphs rather than words, so their accessible names
  // are set here in the page's language instead of through data-i18n (which
  // writes textContent and would wipe the SVG). The nav re-broadcasts
  // 'lang-change' to the page whenever the language is switched.
  var LABELS = { de: { light: 'Hell', dark: 'Dunkel' }, en: { light: 'Light', dark: 'Dark' } };
  function label(lang) {
    var l = LABELS[lang] || LABELS.de;
    var btns = document.querySelectorAll('[data-theme-choice]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-label', l[btns[i].getAttribute('data-theme-choice')]);
  }

  window.addEventListener('storage', function (e) {
    if (e.key === KEY || e.key === null) apply(read());
  });
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'lang-change') label(e.data.lang);
  });

  mark(read());
  try { label(localStorage.getItem('lang') || 'de'); } catch (e) { label('de'); }
})();
