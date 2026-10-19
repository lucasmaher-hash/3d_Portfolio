// Shared by every 2D page. Loaded right after the #scroll-track markup, which the
// scroll dots need to exist; the other two only register listeners.

// ── Scroll dots: position the thumb, and drag/click it like a scrollbar ──
(function () {
  var thumb = document.getElementById('scroll-thumb');
  var track = document.getElementById('scroll-track');
  var ticking = false;
  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }
  function travel() { return track.offsetHeight - thumb.offsetHeight; }

  /* Following the scroll (2026-10-19, Lucas: jumpy and low frame rate when
     scrolling fast). It used to set `top` from a scroll handler, measuring the
     page every frame: a layout per frame, and on a phone, where the page
     scrolls on its own thread, a step behind the page that jumped when the
     scroll was fast. Now the dots move by transform only, the two lengths are
     measured once (again on resize or when the page grows), and where the
     browser has scroll timelines (Chrome, Safari 26) the movement is a
     scroll-driven animation the compositor runs in step with the scroll, with
     no script per frame at all. Older browsers keep a rAF fallback. */
  var travelPx = 0, maxPx = 0, anim = null;
  var hasTimeline = typeof window.ScrollTimeline === 'function';
  function place(progress) {
    thumb.style.transform = 'translate(-50%, ' + (progress * travelPx) + 'px)';
  }
  function update() {
    var progress = maxPx > 0 ? Math.max(0, Math.min(1, window.scrollY / maxPx)) : 0;
    place(progress);
    ticking = false;
  }
  function measure() {
    maxPx = maxScroll();
    travelPx = travel();
    if (hasTimeline) {
      if (anim) anim.cancel();
      try {
        anim = thumb.animate(
          [{ transform: 'translate(-50%, 0px)' }, { transform: 'translate(-50%, ' + travelPx + 'px)' }],
          { fill: 'both', easing: 'linear',
            timeline: new ScrollTimeline({ source: document.documentElement, axis: 'block' }) });
        return;
      } catch (e) { hasTimeline = false; anim = null; }
    }
    update();
  }
  window.addEventListener('scroll', function () {
    if (hasTimeline || ticking) return;
    requestAnimationFrame(update); ticking = true;
  }, { passive: true });
  var mRaf;
  function scheduleMeasure() { cancelAnimationFrame(mRaf); mRaf = requestAnimationFrame(measure); }
  window.addEventListener('resize', scheduleMeasure);
  window.addEventListener('load', scheduleMeasure);
  // The page grows as images and videos arrive; that changes how far it scrolls.
  if (window.ResizeObserver) new ResizeObserver(scheduleMeasure).observe(document.body);
  measure();

  /* ── Draggable, macOS-style ───────────────────────────────────────
     Drag the dot column to scrub, or click the bare strip to jump there.
     Desktop only, enforced in CSS rather than here: the base rule leaves
     pointer-events off and only the (hover: hover) and (pointer: fine)
     block turns it on, so on a phone these listeners can never fire and
     cannot swallow a swipe.
     Pointer capture is what makes the drag survive the pointer leaving the
     20px strip — without it, moving sideways mid-drag would drop it. */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var grabOffset = 0;   // where inside the thumb it was grabbed, so it doesn't jump on grab
  var dragging = false;

  function scrollToThumbTop(top, smooth) {
    var t = travel();
    var progress = t > 0 ? Math.max(0, Math.min(1, top / t)) : 0;
    window.scrollTo({ top: progress * maxScroll(), behavior: smooth ? 'smooth' : 'auto' });
  }

  track.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    if (thumb.contains(e.target)) {
      grabOffset = e.clientY - thumb.getBoundingClientRect().top;
    } else {
      // Bare strip: centre the thumb on the pointer and go there, matching
      // macOS's "jump to the spot that's clicked".
      grabOffset = thumb.offsetHeight / 2;
      scrollToThumbTop(e.clientY - track.getBoundingClientRect().top - grabOffset, !reduceMotion);
    }
    dragging = true;
    track.classList.add('is-dragging');
    track.setPointerCapture(e.pointerId);
    e.preventDefault();   // no text selection while dragging
  });

  track.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    // Never smooth here: the scroll must track the pointer 1:1, and a
    // queued smooth scroll would lag a frame behind every move.
    scrollToThumbTop(e.clientY - track.getBoundingClientRect().top - grabOffset, false);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    try { track.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
})();

// Dot-divider exact-tiling fix: background-repeat:space is unreliable on
// gradient backgrounds in Safari (last dot can render half-clipped even
// though space is supposed to guarantee whole tiles). Root-cause fix:
// measure each divider's real width in JS and set background-size to an
// EXACT integer divisor of it, so there is no remainder tile left for
// any browser's tiling engine to mishandle.
(function () {
  function fixDotDividers() {
    document.querySelectorAll('.dot-divider').forEach(function (el) {
      var w = el.offsetWidth;
      if (!w) return;
      var count = Math.max(2, Math.round(w / 10));
      var tile = w / count;
      el.style.backgroundSize = tile + 'px 4px';
      el.style.backgroundRepeat = 'repeat-x';
    });
  }
  var raf;
  function scheduleFix() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fixDotDividers);
  }
  document.addEventListener('DOMContentLoaded', scheduleFix);
  window.addEventListener('load', scheduleFix);
  window.addEventListener('resize', scheduleFix);
})();

// Mobile only: pixel-snap the card's BOTTOM border.
//
// .page-wrapper's border-bottom is the last painted row of the entire document, and
// the document does not end on a whole pixel. Measured on a 390px phone: the
// wrapper's border-box bottom sits at y = 5585.078 while documentElement.scrollHeight
// is 5585 — so the final 0.078px of that 1px border falls outside the scrollable
// area. .project-nav's border-top, the line at the TOP of the same section, has
// ordinary content above and below it and sits at no boundary at all. That asymmetry
// is why only the bottom line reads as thin/clipped. Blink happens to snap both to a
// clean 3 device rows (verified at DPR 3: identical ink, 328.5 each), so this does
// NOT reproduce in Chrome — WebKit is under no obligation to make the same choice.
//
// Fix: measure the real fractional bottom and grow padding-bottom by exactly enough
// to land it on a whole CSS pixel, so the border fills an exact device-pixel band
// with nothing hanging past the end of the document. Same measure-then-set approach
// as the dot-divider fix above, and for the same reason: a static CSS value cannot
// know where the box happens to land. The added padding is always < 1px, and it sits
// below .project-nav (whose -12px margin cancels the base 12px), so nothing moves
// visibly.
//
// Desktop is untouched — outside the mobile query the inline value is cleared and
// the stylesheet's own padding-bottom applies.
(function () {
  var wrap = document.querySelector('.page-wrapper');
  if (!wrap) return;
  var mq = window.matchMedia('(max-width: 640px)');
  function snap() {
    wrap.style.paddingBottom = '';        // always measure against the CSS value
    if (!mq.matches) return;              // desktop: leave the stylesheet alone
    var bottom = wrap.getBoundingClientRect().bottom + window.pageYOffset;
    var delta = Math.ceil(bottom) - bottom;
    if (delta > 0.002) {
      var base = parseFloat(getComputedStyle(wrap).paddingBottom) || 0;
      wrap.style.paddingBottom = (base + delta).toFixed(3) + 'px';
    }
  }
  var raf;
  function scheduleSnap() { cancelAnimationFrame(raf); raf = requestAnimationFrame(snap); }
  document.addEventListener('DOMContentLoaded', scheduleSnap);
  window.addEventListener('load', scheduleSnap);
  window.addEventListener('resize', scheduleSnap);
  if (mq.addEventListener) mq.addEventListener('change', scheduleSnap);
})();
