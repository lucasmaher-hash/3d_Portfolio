// The 3D page's room colour, for the pages it shows in iframes (about3d, both
// controls overlays). src/main.js fades --accent-orange on index.html's root as
// you walk from room to room and posts { type: 'accent', color } to every
// iframe; this mirrors it onto the embedding page's own --accent-orange, so
// every accent element there (About's buttons, the controls' logo badge)
// follows. Reading the parent's value on load covers a frame opened mid-walk.
// Outside the 3D page there is nothing to read and the page keeps its own colour.
(function () {
  function apply(c) {
    if (c) document.documentElement.style.setProperty('--accent-orange', c);
  }
  try {
    if (window.parent !== window) {
      apply(window.parent.document.documentElement.style.getPropertyValue('--accent-orange').trim());
    }
  } catch (e) {}
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'accent') apply(e.data.color);
  });
})();
