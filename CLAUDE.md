# CLAUDE.md

Lucas Maher's portfolio website — vanilla JS + Vite, neumorphic design system, Three.js 3D mode.

## Quick Start

```bash
# Install dependencies (first time only)
npm install

# Start dev server (local testing)
npm run dev
# Opens at http://localhost:5173 — hot-reload enabled

# Build for production
npm run build

# Preview production build locally
npm run preview
```

**No test runner or linter is configured.** All testing is manual.

## Session Startup Checklist

When resuming work in a new session:
1. `npm run dev` — start the dev server
2. Open http://localhost:5173 in browser
3. Test both 2D and 3D modes (toggle in nav or mobile menu); in 3D, confirm both right-click-drag and middle-click-drag orbit the camera
4. Verify video playback on Unify page (steps 2–6 have portrait phone videos)
5. Check nav dropdown doesn't clip content on any page (iframe z-index and `.page-wrapper overflow` issues)
6. Inspect hero blob on Unify page — pupils should track cursor; blob should sit above header dotted line
7. Test mobile responsiveness at 860px breakpoint (scrollytelling switches from sticky pin to static layout)
8. **When testing mobile over CDP, always enable touch emulation.** Without it headless Chrome
   matches `pointer: fine` and triggers the desktop shrink cap (`html, body { min-width: 860px }`),
   so every measurement below 860px is silently taken against an 860px layout. Check a desktop
   width in the same run as a control — several bugs this session were only distinguishable from
   pre-existing ones that way.
9. **Mobile widths worth checking:** 390 and 430 (phones), **744/768/844** (the 641–860px band —
   iPad portrait *and* landscape phones, where two separate bugs hid this session), 859/861
   (either side of the breakpoint), 1440 (desktop control).

## Architecture

**Vanilla JS, no framework.** Vite bundles `src/main.js` and `src/style.css`. Everything else lives in `public/` as static assets.

**Two modes:**
- **3D mode** — Three.js scene (`src/main.js` → `index.html`). 3D pages: `public/*3d.html`
- **2D mode** — Neumorphic flat design. All 2D pages: `public/*2d.html`. Landing: `public/2D.html`

**2D is the default (2026-08-13).** A guard script at the very top of `index.html`'s `<head>` forwards any direct/external visit to `/` on to `/2D.html` via `location.replace()` (so `/` never enters history). Only an explicit in-site switch to 3D lands on `/`: the nav's 3D toggle (`top_row_permanent_V3.html`) and every mobile menu's 3D button (all 8 2D pages) set `sessionStorage._enter3d` before navigating, and a same-origin `document.referrer` is accepted as fallback — covers the `?from=3d` Exit pill (a plain `<a href="/">`) and referrer-stripping/disabled-storage cases. Per-tab semantics: reload/back inside the tab stays 3D; a fresh tab defaults to 2D again. **Because `location.replace()` does not halt parsing, the intro-gate and loader scripts check `window._redirecting2d` and touch nothing during a redirect** — otherwise the once-per-tab `introSeen` flag would be burned by a visit that never showed the 3D page, and the first real 3D switch would silently skip the welcome/controls intro (the loader overlay is deliberately left up during the redirect so no 3D frame flashes). Verified over CDP (7 checks): direct `/` → `/2D.html` with no flags set; explicit switch → `/` with the intro; same-tab reload stays 3D with intro skipped; Exit-from-project reaches 3D via referrer; `/2D.html` itself never redirects.

**The orange liquid loading ball is the SITE's entrance animation, not the 3D world's (2026-08-14).** It moved from `index.html` to `2D.html`: markup + self-contained script sit first in `<body>` (so it covers the very first paint), CSS near the end of `<style>` (z-index **10001** — above both the nav iframe at 9999 and `.mobile-menu` at 10000). It plays once per tab on the landing page (`sessionStorage.siteLoaderSeen`, set immediately on load so a mid-fill reload counts as seen) as a pure **3s timed fill + 1.2s fade** — there is no byte progress to track on the 2D page, unlike the old GLB-driven version. `index.html` has **no loader at all** anymore: its first-3D-entry-per-tab intro (`introSeen`) now shows only the welcome/controls screen, whose iframe **reveals itself on its own `load` event** (the old loader used to call `_showIntroControls()` when its fill finished; posting the `intro-controls-show` message before the child's listener exists would silently drop it, so the reveal waits for `load`). `src/main.js` still calls `window._loader` defensively — with no loader defined those are deliberate no-ops; if a 3D-side loader is ever wanted again, defining `window._loader` re-arms them. Verified over CDP (7 checks): fresh visit shows the ball on 2D (count climbing, gone after ~4.2s), reload shows nothing, 3D entry shows the intro with no ball, dismiss works, 3D reload shows neither.

**The loader's liquid is TWO crossing sine surfaces (2026-09-11).** `#load-liquid` is a
`<canvas>`. It used to be a div whose height was the fill level, with the wave faked by a big
rotating rounded square (`::before` + `@keyframes loadWave`/`loadBobA`, all removed) — one
RIGID shape, so it had a single crest profile that came round again every revolution.

The model is taken from **[js-fluid-meter](https://github.com/aarcoraci/javascript-fluid-meter)
by Angel Arcoraci (MIT)**, which is written for exactly this shape — a percentage as liquid in
a circle. Two sine surfaces travel in **opposite directions** at different amplitudes, speeds
and frequencies, one drawn over the other; neither is liquid alone, what reads as liquid is
where they cross, because that meeting point never repeats. Each layer's amplitude is itself a
sine of its own angle (`amp = maxAmp * sin(angle)`), so crests grow and flatten as they travel
instead of marching past at a fixed height. **The library's rising bubbles were built and then
removed at Lucas's request (2026-09-11)** — the surface is the whole effect here; with them
gone the draw is two fills and nothing else, no clip and no strokes.

**What is deliberately NOT taken from it:** it draws its own circle, ring border, background
disc and percentage text, and hard-codes every pixel around a 300px meter. This ball already
has the neumorphic pressed shell and the VT323 counter as real DOM, so only the fluid is drawn,
into the circle that exists, and **every constant is derived from the measured ball size** —
`maxAmp` `H*0.055`/`H*0.042`, `freq` `H*0.155`/`H*0.19`, `speed` `∓H*0.62`/`H*0.78`.

Four things that will bite again if touched:
- **Nothing can be measured synchronously in that inline script.** It sits at the top of
  `<body>`, and the page pulls Google Fonts stylesheets — with a render-blocking stylesheet
  pending, Chrome has no layout to give and `getBoundingClientRect()` returns **zeros** rather
  than forcing a wait. The canvas came out 0 wide and every draw threw `IndexSizeError`. The old
  div loader never hit this because it only set `style.height` in percent and measured nothing.
  `resize()` returns a boolean, a `ResizeObserver` watches, and the frame loop retries until a
  real size arrives — resetting `t0` so the dead time does not count as fill.
- **The wave amplitude ramps in over the first ~9% (`ampScale`).** At full amplitude a trough on
  a nearly-empty ball dips below the floor, and the fill polygon has nothing to enclose there —
  a notch of bare ball at the very bottom. Measured after the ramp: deepest trough sits 0.06px
  *above* the floor across the whole run.
- **The two angular speeds must differ** (100 and 73). Equal, both layers reach their flat
  moment together and the whole surface goes still for an instant once a cycle.
- The back layer is the **same orange at 0.42 alpha**, not a second hue — two colours in a 192px
  ball reads as a graphic, and the layer's job is to be glimpsed through the front one.

`dt` is clamped to 50ms so a backgrounded tab cannot jump the wave a screen sideways, and
`prefers-reduced-motion` passes `dt = 0` so the layers never step and both surfaces stay flat
while the ball still fills. Verified in Chrome (fill 103 → 0px, wave 4–10px on a 129px ball, no
JS errors, overlay removed) and in a Node simulation with a stubbed canvas (384×384 backing
store at dpr 2, zero draws while layout was blocked, amplitude breathing across a 3.7–20.8px
range at 192px, the two layers separated in every sample).

**Two abandoned versions, both only in git history now:** the original CSS one (a div whose
height was the fill, with the wave faked by a rotating rounded square — one rigid shape, so one
repeating crest) is reachable with `git checkout loader-css-v1 -- public/2D.html`, and a
spring-surface version (fluid.js, MIT) sat between the two and was rejected on the look.

**Navigation:**
- Every 2D page embeds nav as a fixed iframe (`#top-bar` → `/top_row_permanent_V3.html`)
- Iframe height: **140px** default/collapsed, expands to **400px** when Craft dropdown opens (via `postMessage`)
- Always `z-index: 9999` to sit above all page content
- **Critical:** Host page `.page-wrapper` must have `overflow: visible` (not `hidden`), else dropdown gets clipped
- **Dropdown expand height:** Increased from 280px to 400px to ensure full dropdown visibility without clipping
- **Collapse height must match the default (140px), not shrink to 90px.** See "Nav bar iframe" below — this was a live bug (nav bottom shadow got clipped after the Craft dropdown closed) fixed this session.

## Page map

| File | What it is |
|---|---|
| `index.html` | 3D entry point (Three.js scene) |
| `public/2D.html` | 2D landing page — project grid (5 projects) |
| `public/about2d.html` | About page |
| `public/contact2d.html` | Contact page |
| `public/unify2d.html` | Project page — Unify (01) |
| `public/virtual_cooking2d.html` | Project page — Virtual Cooking (02) |
| `public/kaffeemaschine2d.html` | Project page — Cybercoffee (03) |
| `public/mac-lamp2d.html` | Project page — Mac-Lamp (04) |
| `public/vaccine2d.html` | Project page — Double Packaging (05) |
| `public/to-shove2d.html` | Project page — morrow (the iOS app). See "morrow page" below. |
| `public/unify2d1.html` | **Unlinked draft** of the Unify case-study rebuild (see below) |
| `public/top_row_permanent_V3.html` | Nav bar — loaded as an iframe on every 2D page |

## Unify case-study draft (`public/unify2d1.html`, 2026-09-18)

The rebuild of the Unify page from `unify-casestudy-plan.md` happens in a **separate, unlinked
file** so it can be committed and deployed without anyone reaching it: Lucas views it at
`lucasmaher.com/unify2d1.html`. **Nothing on the site may link to it** (no Craft dropdown entry, no
landing tile, no prev/next) and it carries `<meta name="robots" content="noindex, nofollow">`. (A
fixed "Draft · not linked" pill used to mark it; removed 2026-10-05 at Lucas's request.) **The live
`unify2d.html` is not touched until the draft is finished** — then the draft is copied over it and
the `noindex` removed.

It is a copy of `unify2d.html` (same head, nav, hero blob, scripts), so every Unify gotcha below
still applies. **Exception, 2026-10-05:** the promo film hero (`.unify-film`) was put on the live page
ahead of the rest of the draft (Lucas: the video is ready to ship) — see "Unify promo loop".

**The hero's blob is reused at the end of the draft** (Lucas, 2026-10-05): `#learned-blob`, upside
down, half the hero's size (`--bh: clamp(220px, 25vw, 340px)`, the hero clamp halved) but 20% taller
— the phone hero's LONG body (`.blob-long` path), cut at y -104, so it stands taller at the same
scale and width (Lucas: "taller without making him bigger") — bottom-right
of "What we learned", its head sunk into the line above the next-project panel so it pokes up out
of it; the paragraphs make room on its left, and below 640px it gets its own space under the text.
Same Figma paths as the hero; an inner `<g>` rotates it 180° about (370, 328), which maps the box
x -10–750, y -104–760 onto itself, so that box is the viewBox (x to 750 because the right eye bulges
past the body). The pupil script drives both blobs from one set of listeners, each through its own
coordinate space (the hero's `<svg>`, the rotated `<g>` — its `getScreenCTM` includes the turn).
The whole character is also saved as `public/images/unify/unify-blob.svg` for reuse. The nav iframe recognises it because its checks are substring matches on
`unify2d`. Differences: the middle follows plan §2 (Problem → Research → Idea → Pivot → Timetable
→ Supporting features → Privacy → Results → Learned, step badges 1–9, anchors for the page map);
new CSS lives in the `Case-study rebuild` block at the end of `<style>` (`.ph` placeholder wells,
`.fact-bar`, `.cs-caption`, `.pivot-compare`, `.variant`, `.cs-table`); the one remaining scrolly
is `#support-scrolly` (socials + friends map; it took over the mirrored-layout CSS of
`#timetable-socials-scrolly`). **New copy is English-only and has NO `data-i18n`** on purpose — a
key would let the old `TRANSLATIONS` value overwrite the draft text (the Role tile especially).
Every `[ bracketed ]` value is a placeholder; plan numbers are examples, not results.

**v1 screens (pivot section)**: all five v1 Figma exports (1608px wide = iPhone 17 at 4x) in the
same `.phone-shot` iPhone frame as the final design, in a looping **carousel**
(`.v1-carousel`, from Lucas's reference): five slots, the middle phone largest, neighbours at 0.84,
the outer pair at 0.68 tucked BEHIND the neighbours. It autoplays one slot to the RIGHT per turn,
so the next screen in order (home → timetable → building → friends → open) arrives from the left.
A turn is 3s for a still; for home and timetable it is their whole scroll (0.5s, 5.2s eased down,
1.2s hold) — **they only scroll while they are the middle phone** (Web Animations API, started
when they arrive, glided back to the top as they leave), so each one starts at its top when it
opens. A phone passing an edge shrinks and fades as if stepping back (a third of a slot sideways),
then grows and fades in on the other side. **Clicking** a phone brings it to the middle and stops
the autoplay (a centred home/timetable scrolls down once and stays). **It folds and unfolds with
the page scroll** (`.is-folded`, in the markup so it starts folded): all five stack behind the
middle phone until the carousel's middle comes up past the window bottom, then fan out, both sides
at once, in 450ms (half a carousel step; a left-to-right stagger was tried and dropped); once its middle goes out past the top it folds again (same
rule as the to.morrow fan). Folding resets the park, so every unfold autoplays again. Clicks do
nothing while folded.
A **sideways trackpad scroll** (only when |deltaX| > |deltaY|, so vertical page scrolling is never
blocked) or a **swipe** steps one slot and also stops the autoplay. Geometry is CSS per
`data-slot` (offsets in phone widths via `translateX(%)`); the script pauses off-screen and in a
hidden tab; under `prefers-reduced-motion` it stays unfolded and still. Below 640px the carousel bleeds to the
screen edges and the outer pair sits off screen.

The three building screens are single stills (`.v1-still`). Home and timetable are split into the
page (`v1-<name>.webp`) and its tab bar (`v1-<name>-bar.webp`, the bottom 321px of the export), so
the bar stays fixed while the page scrolls under it. The scroll travel is `calc(-100% + 100cqh)`
against the `.v1-window` size container, so it ends exactly on the last row at any size. Content
runs up under the frame's island (per Lucas), with two per-screen edits: the **timetable** has a
10%-of-width black band on top (`.v1-clear-island`) so its buttons clear the island, and the
**home** export's white card was extended to the very top with square corners (its rounded top
and a stray blue line above it were painted over before export; the Desktop original is unedited).

**Problem section = the group chat "lifted off" an empty iMessage thread** (`.imsg-stage`, after
Lucas's WhatsApp-mockup reference): one iPhone 17 frame showing an EMPTY "HM Group" thread (status
bar, header, input — no messages on the screen), and over it `.imsg-lifted`, a column wider than
the phone (54cqw vs 27cqw; 92cqw on a phone; each message capped at 35cqw / 70cqw so a wider column spreads them outward instead of widening them) so incoming bubbles hang off the phone's left edge and Lucas's off the
right. The conversation (Ben / Anna / Sophia / me, English, written by Claude from the real
WhatsApp chats — the caption no longer says so (Lucas removed it 2026-09-25), so nothing on the page
marks the chat as a recreation) plays in it. **Rebuilt 2026-09-25 to Lucas's
brief, after three earlier attempts** (top-anchored column, masked top edge, floating bubbles
around the phone — all rejected):
- **Centred on the screen** (2026-09-25, after a bottom-anchored round Lucas rejected as sitting
  too low): `.imsg-lifted` is `top: 50%; transform: translate(-50%, -50%)` with NO height, so the
  column grows half a new message upward and half downward and the stack's centre stays on the
  phone's middle, while messages still arrive at its bottom edge. Measured: centre at exactly 50%
  of the screen in every at-rest sample, at 1440 and 390.
- **Every run OPENS on the first message alone** (2026-09-25): Lucas's own blue "when's your next
  break??", 3x size, centred on the phone's screen, held 2s, then it travels to its own place in
  the column (right, small) and the rest follow below it. One WAAPI keyframe list does in–hold–move.
  **It is big by LAYOUT, not by transform** (Lucas: "a bit low rez"): a `scale(3)` on a bubble
  blows its raster up threefold and reads soft, so the bubble's and the name's `font-size` are
  multiplied instead (padding and radius are in em and follow), `max-width` is lifted, and one
  translate centres it. The move back is a FLIP with the SECOND message already in place (added
  invisible first), so the opener shrinks and rides up in one move — making the room it is about
  to hand over — instead of shrinking in the middle and moving up a beat later: measure where it
  is, drop the big font, add message two, measure again, animate from the one to the other — so the type is only ever scaled WHILE it moves, never
  while it is read. Measure the BUBBLE, not the message box: the box is a flex item and stretches
  to the whole column, so its centre is already the screen's and the move would come out as zero. The factor is
  `min(3, stageWidth*.92 / bubbleWidth)` — on a phone the bubble is already most of the width, so
  it lands near 1.9x. A tail hangs .42em past the bubble, so half of that is added back to centre
  the shape optically. Measured: bubble centre exactly on the screen centre at 1440 and 390.
- **Any start is a start from the top.** Scrolling the stage out of view, or leaving the tab, calls
  `stop()`, which clears the column; coming back plays the run again from the opener. Safari stops
  firing timers for an occluded window, so a tab left for VS Code used to come back frozen on a
  frame — `visibilitychange`, `pageshow` and a `focus` listener all restart it rather than resume.
- **A leaving message is pinned where it stood BEFORE the new message was appended.** The append
  re-lays the centred column (everything jumps half a message up), so a rect read after it gave the
  leaving message that jump while the others glided — the small upward twitch each image made
  before fading. `add()` snapshots every rect first and `dropOldest(at)` uses the snapshot.
- **The run ends with a WIPE.** Once every message has had its turn the whole stack fades out
  together (520ms, 70ms apart), the column empties, and after a beat the chat starts again from
  the first message and builds back up. `tick()` is a self-scheduling `setTimeout`, not an
  interval, so the wipe can take its own time; `wipedAt` keeps it from wiping twice at one index.
- **A leaving message fades on OPACITY ONLY, in a box fixed to its measured size.** Scaling it out
  re-rasterises whatever it holds every frame, and a timetable is an 1800px bitmap — that was the
  stutter each image made as it closed.
- **The glide distance is MEASURED, not derived.** `add()` notes where the last existing message
  is, appends, drops whatever passed the cap, then reads it again — that difference is the jump the
  glide undoes. A centred column moves by half the new message and by half of whatever left in the
  same step, so computing it would be error-prone; measuring survives any combination.
- **A leaving message is handed to the STAGE**, not left in the column: absolutely positioned at
  the spot it occupies, then faded. Inside the column every later add/drop would shift its box
  (both edges move when a centred column changes height), and a message on its way out should
  stand still.
- **~70% of the screen, soft cap.** `TARGET = .70` is what the opening fill reaches; the oldest
  only leaves past `HARD = .78` (Lucas: a soft cap, don't drop a message early). Both are shares
  of `.phone-shot-screen`'s measured height, so they follow the phone at any size.
- **Every step:** append at the bottom → the track glides up by exactly that message's height
  (`translateY(h)` → 0, 1.1s) → anything past the cap leaves → the new one eases in at `GLIDE*.78`,
  i.e. only once the glide has all but finished, or it is seen sitting low over the input field.
- **A message is never half-anything at rest** (Lucas's main complaint): no mask, no clipping, no
  partial fades; it eases in whole (0.56s) and out whole (0.45s). Verified over 54 samples at 1440
  and 390: zero elements between 2% and 98% opacity in any at-rest frame.
- `stackHeight()` measures first-child-top to last-child-bottom from the RECTS, so the glide's
  transform (which moves them all alike) cancels out and a leaving message does not count.

**Sides ALTERNATE down the column** (`.imsg-msg.right`): Lucas and Sophia on the right, Ben and
Anna on the left, so it zig-zags instead of stacking on one side — the message after the blue
opener comes from the left. Only `.out` (Lucas) is blue; Sophia's right-hand bubbles are the same
grey as everyone else's, with the side, the name label and the tail flipped.** (`.imsg-msg.right` — same grey bubble as any incoming one, only the side, the name label
and the tail flip; only `.out` is blue). A timetable image is always grouped with its sender's text in one message.

**The three timetables are DRAWN, not screenshots** (2026-09-25). They were crops of the edited
WhatsApp shots, which were three views of the same real timetable, one of them with a dark
gradient corner from its photo bubble. They are now built in
`timetable-source.html` (repo root, not deployed — only `public/` is) → captured with CDP at 4x → `public/images/unify/problem/tt-ben|tt-sophia|tt-me.webp`
(1800px wide, ~2x of their display size). **One style per person**, after Lucas's own app
screenshots (`~/Downloads/nw1.jpg`, `nw2.jpg`): Ben a dark list with slate rows, Sophia light
cards in amber/blue, Lucas a grey grid with a time rail and pastel blocks. All three are a SINGLE
DAY (Mon 28 Sept), which is what makes them readable at ~260px wide, and **their hours carry the
story**: Ben 09:45–12:15 + 13:00–16:15 (free 12:15–13:00), Sophia 10:00–13:00 (in class exactly
then), Lucas free 11:45–13:30 — so two of the three overlap but never all three. If the copy or
the times change, change both together. Re-render by screenshotting each card from that file; the
`SIZE` table in the page script carries each file's pixel size and must follow.
Bubble tails are a mask in the bubble's own colour (the two-pseudo cut-out showed grey patches over
the phone). The column refills only when the stage WIDTH changes — a phone's URL bar fires
`resize` on every scroll, and refilling on that would restart the chat constantly (it also bit the
headless screenshots: `captureBeyondViewport` fires a resize). Runs only while on screen; under
`prefers-reduced-motion` it shows the first messages, still. Below 640px: 3:4 stage, 54cqw phone,
86cqw column.

**No privacy section** (dropped 2026-09-25, Lucas: "the users were my friends"). The plan's §2
had one, and the invented willingness-to-share numbers were exactly the kind of claim a reader
would ask for evidence of — a pilot of five friend groups cannot support it. Gone with it: the
stacked precision chart, the `.stack` rule, the location line in the pivot copy, the
guarded–trusted pair in the semantic differential (now generic–ours), and the "would not share
their location" learning. The settings recording survives as one `.feature-row` at the end of
Supporting features, with the room finder, per the plan's "shrink to one line". Sections
renumbered: Results is 7, What we learned is 8.

> ⚠ **EVERY FIGURE ON THE DRAFT PAGE IS INVENTED** (2026-09-25). Lucas asked for it filled in so he
> could judge the finished layout, so the placeholders were replaced with plausible stand-ins —
> 23 min, 41/26/17, 58 %, n=28, 14.2/11.5/4.1 s, 71 %, 1.4 → 3.1, SUS 71 → 83, the task table, the
> quadrant's "7 of 12". The full list is in an HTML comment at the top of `unify2d1.html`. **None
> of it may survive into `unify2d.html`**: every number is either replaced with a real result or
> the section it sits in goes. The page is unlinked and carries the DRAFT pill for exactly this.

**The accent on the draft page is the app's pink, not the site orange** — `--accent-orange` is
overridden to `#FF88C8` (the hero character) at the top of the case-study block, with
`--accent-ink`, now the same #FF88C8 (a darker #D24C92 was tried and dropped — Lucas wants the light pink) for ALL pink TYPE — meta labels, the fact numbers, chart values, captions,
the page map arrows — since #FF88C8 on the page grey is too pale to
read small. The fact bar is bare numbers on the page: no card, no raised shadow (Lucas).

**One more visual is markup**: `.tv` (the three merged-timetable variants — A columns, B overlay,
C the shared lane that won, drawn rather than screenshotted). The only `.ph` placeholders left are
the sketch collage and the before/after shot, which both need real assets.

**Research went through two rebuilds on 2026-09-26, and the first is now only in git history.**
Attempt one replaced the original one-pole-per-axis 2×2 with a properly four-poled version
(`.quad-ypoles`/`.quad-xpoles`, both ends of both axes named directly on the diagram instead of in
a paragraph above it) plus a kicker+headline opener matching Problem's shape. **Lucas rejected the
whole approach on sight** — a positioning quadrant read as generic-deck, out of step with a page
that deals everywhere else in real chat messages and real quotes — so all `.quad*` CSS and markup
is gone, not just patched.

**What replaced it: three product requirements, not a user-positioning model.** Same kicker
("Synthesis · survey + diary study") and headline opener as before, but the body is `.req-card` —
one pressed neumorphic card holding three hairline-separated rows (the same idiom the mobile meta
grid already uses for label/value rows), each an OCR-A-BT index (01/02/03), a bold claim stating
what the research proved the app had to do, and one line of evidence underneath. **No card** (Lucas, follow-up:
"cut the separate frame") — `.req-card`'s background/shadow/padding are gone; the hairlines between
rows (`.req-row + .req-row`) are what separates the three now, sitting as plain text on the page
like everything else. The headline was also renamed from "Three things the research made
non-negotiable" to **"What it had to do"** — shorter, and a first-person-adjacent phrase rather
than a labelled list (Lucas floated "Requirements" as a plain label; that read too close to the
generic-deck tone the quadrant was rejected for, so the declarative-sentence voice the rest of the
page's headlines use — "Why the 68% stopped trying," etc. — won instead). The evidence
deliberately reuses numbers and a quote ALREADY on the page — 68% (Problem's headline stat) and the
"forty minutes" interview line — so Research reads as reasoning FROM Problem's findings rather than
a fresh, disconnected dataset; only the 64%-other-faculties figure is new here (labelled `Survey ·
n=120`, distinct from Problem's own 120-student survey questions). Chosen from four sketched
options (a single sharper stat; a narrated diagnosis walking one stalled meetup using the chat's
own Ben/Anna/Sophia; a workarounds-vs-reality comparison) — Lucas picked the requirements list.
Verified at 1440 and 390: no overflow, hairlines and index numbers hold at both widths. **The
section's own h2/nav name changed too** — "Research" → "Requirements" (both the `.section-title`
and the sidebar link text; `id="research"` was left alone, it's just a URL slug). Lucas's first ask
("what would be a more suitable header") meant the h3 sub-headline, which became "What it had to
do"; this second ask was the SECTION title itself — and "Requirements" fits there because
section-titles across the page are short nouns already ("The idea", "Supporting features"), unlike
sub-headlines, which are full declarative sentences. Different element, different rule. **Renamed again 2026-09-27, this time for good** — Lucas reached for
the German word Rahmenbedingungen (boundary/framework conditions) to describe the section, and it
is a better fit than "Requirements" ever was: these are conditions the RESEARCH imposed, that the
design then had to satisfy — not a feature spec the designer wrote. `h2` is now "The constraints",
matching the "The X" pattern every sibling section already uses (Problem/Idea/Pivot) and that
"Requirements" and "Research" before it had both broken; the sidebar link is the short form
"Constraints" (no "The"), same as the other five links. The intro line and all three leads were
reframed from "does X" to "had to X" — "Based on the research, I set three requirements" became
"Before I designed anything, the research set three constraints the app had to work inside" — so
the voice matches: these were found, not decided. **The whole block
(kicker → headline → req-card) is wrapped in `.stat-block`** — the same reusable inset Problem's own
finding/interviews use — rather than sitting flush at the section's own padding like the header row
does; Lucas caught that Requirements' content wasn't matching Problem's extra 80px inset above it.
Verified: both sections' content now start at the identical x-offset (271px at 1440), no overflow
at 390.

**Then a fourth pass threw out the kicker/headline/card entirely — this is what's LIVE now.** Lucas:
plain text, uniform size, no pink, "just 4 sections for the short text and then each requirement."
`#research` is now `<h2>` + badge + divider, then four plain `.guide-text` paragraphs and nothing
else — no `.stat-block`, `.stat-kicker` or `.stat-head` in this section any more (those classes are
still defined and still used elsewhere, just not here). The intro line ("Based on the research, I
set three requirements for what the app had to do.") is its own paragraph; each requirement is one
paragraph with its claim picked out via the SAME inline `<b>` the interview quotes above it already
use — `.guide-text b` is colour/weight only, never a size change, which is exactly what keeps every
line of the section visually identical. All the `.req-*` CSS from the card attempt is deleted, not
just unused. **Padding note:** with no `.stat-block` wrapper, the paragraphs sit at the section's
plain default padding (191px at 1440) rather than Problem's extra-inset 271px — and that turns out
to be the CORRECT match now, not a regression: `#problem`'s own first paragraph (before its
stat-block starts) is also at 191px, so Requirements now lines up with how every other plain-text
section on the page behaves, not with Problem's specially-inset finding block.

**The Problem section's evidence is one bar, after Jessica Im's tax case study** (2026-09-26,
Lucas's reference): a VT323 kicker, a headline that STATES the finding with its number in it, then `.statbar` — its labels and the brace text set at the HEADLINE’s own ramp, `clamp(22px, 2.5vw, 32px)` (Lucas asked twice; caption-sized numbers read as a footnote) — a single track split into the share who
coordinate by texting (pink) and the share who have stopped trying (empty), with a thick black `.statbar-brace`
under everything that came to nothing — the failed texting AND the ones who never tried — carrying
the headline's figure, nothing else. **There is no paragraph between the
headline and the bar** (Lucas: "do you even need it") — it only repeated what the bar already
says; the sentence that briefly moved into the brace was cut too — the label is just the number. `--from`/`--to` place the
brace in percent of the whole bar, so it can name any span. Under it, the interviews with the people who
stopped trying, as PROSE with the key phrases in `<b>` (three quote cards were tried and dropped —
per Lucas it reads like the rest of the site this way). The headline and its line run the full
content width. The
numbers chain — 62 % text, 73 % of those never met (45 % of everyone), plus the 38 % who never
tried = the 83 % in the headline. **This replaced the earlier four-row bar chart and the
attempts/agreed/met funnel**, both dropped.

**The three pink stats moved out of the hero too** (2026-09-26, same session as the sidebar
move — Lucas: proof belongs later, not up front). `.fact-bar` is unchanged CSS, just relocated:
`.pilot-stats` wraps it with the same kicker/heading pair as the Problem statbar (`.stat-kicker` +
`.stat-head`), and sits in "The idea" section right after the "who's free now" showcase and before
"How the overlap is found" — the numbers next to the feature they are evidence for, not before it.
The hero (`#top`) now carries only the lead line. **The three numbers themselves changed too**,
since this is no longer a before/after (Problem) vs after (Results) split but one PILOT-only
snapshot: 2.2× more meetups/week, 68% less time spent arranging one, 20 students across 5 friend
groups. Chain them if the real pilot numbers ever land: 1.4 → 3.1 meetups already matches
Supporting features' caption, and 23 → 7 min matches the Problem section's 23 min baseline. **The
`.fact-src` line under each of the three was dropped** (Lucas) — the SUS box in Results still has
one (`System Usability Scale`), so `.fact-src` itself stays; only the three pilot stats lost theirs.

**`.pilot-stats` was removed from Idea entirely on 2026-09-27** (Lucas, after I flagged it myself
on request — "honest opinion, isn't this too early"). Two real problems, not just pacing: (1) a
two-week PILOT can only exist once the finished app has already been built and shipped, so results
data sitting under "the idea" — before Pivot, before the timetable design, before anything about
HOW it was built — read chronologically backwards; (2) its headline number, 2.2x, was a second
form of the SAME fact Supporting Features already states as "1.4 to 3.1 meetups" — an actual
duplicate, not just a redundant feel. The block, its `.fact-bar` instance, and the now-orphaned
`.pilot-stats` CSS are gone. Nothing replaced it — see the next note for what's going into the
space instead.

**The polished "who's free now" screen recording in Idea is gone, replaced with v1 stills — done
2026-09-27.** Same mirror-image reason as the pilot-stats removal above: the recording was the
FINISHED, final, character-based UI, shown before Pivot has told the reader that design was ever
anything else — which flattened Pivot's whole "I designed the first version: blue, technical, cold"
reveal, since the reader had already seen the "after". A fresh low-fidelity wireframe was floated
as the replacement but dropped in favour of the v1 screens that already exist (see "v1 screens
(pivot section)" above) — inventing a sixth set of screens just for Idea would have meant explaining
two different "early" versions before Pivot ever shows the real one. **"Who's free now" now pairs
with `v1-home`, "How the overlap is found" pairs with `v1-timetable`** — the two `.feature-row`
blocks that used to hold the recording and the bare diagram now each carry a `.phone-shot` built
from the same `.v1-screen`/`.v1-window`/`.v1-bar` markup the carousel uses for those two screens,
just outside `.v1-carousel` so nothing scrolls: **static by omission**, not a separate flag — only
the carousel's own script (`document.querySelector('.v1-carousel')`, singular) drives the WAAPI
scroll on `.v1-window img`, so a copy of the same markup sitting outside that one `.v1-carousel`
element is simply never touched by it and renders as a plain top-cropped still. The two rows
alternate sides (`.feature-row` then `.feature-row.reverse`), matching the rhythm of every other
feature pairing on the page. **The section now closes with the full five-screen `.v1-carousel`**
(moved here from Pivot — see the note below), introduced by "The whole first version, working": home,
timetable, and the three building-map stills, autoplaying and folding exactly as documented above.
This is also what finally fills the old `Visual 08 · Sketches` placeholder — real v1 screens instead
of invented wireframes, and it means every v1 asset used in Idea is one already built for the
carousel, not a new set of screens to design and explain.

**Pivot's v1 comparison shrank from the full five-screen carousel to a plain static three-screen
row, 1:1 with the final row — done 2026-09-27, same pass as the Idea change above.** With the
carousel now living in Idea as "the whole first version, working", Pivot no longer needed to also
carry all five v1 screens — its own job is narrower: a side-by-side of v1 vs. final on the SAME
screens, and a 5-vs-3 mismatch undercut that "same screens" claim on sight. Pivot's v1 `.pivot-row`
now uses `.pivot-screens` (the same grid the final row already used) holding exactly three
`.phone-shot`s — `v1-home`, `v1-timetable`, `v1-building-friends` — chosen to match the final row's
home / timetable / map-with-friends triplet one for one. `v1-building-friends` (the friends list
open over the floor plan) was picked over the plain `v1-building`/`v1-building-open` stills
specifically because the final row's third screen is the map-with-friends view (`data-vid="map-
friends"`), and the comparison only works if both sides are showing the same screen. The home and
timetable v1 stills reuse the exact same `.v1-screen` markup as Idea's — static outside the
carousel, same reasoning as above.

**Idea/Pivot/design-system were fighting each other — resolved 2026-09-27 by giving each section
exactly one job, researched against how well-regarded UX case studies actually sequence this
(problem → process/pivot → final solution → results, with no standalone "design system" beat in
that canon, and a rejected v1 shown once as a comparison device, not toured on its own).** Lucas's
own complaint: three sections were all effectively re-showing the same screens from different
angles — Idea's v1 stills + closing carousel, Pivot's v1-vs-final comparison, and a color/
typography/character deep-dive also inside Pivot. The fix was a real cut, not a reshuffle:
- **Idea lost ALL its real screens** (superseded a few hours later the same day — see
  "`.wf-frame`: two constructed wireframes" below, which put a visual back under "Who's free now",
  just not a real v1 screenshot). The two `.feature-row`s that showed `v1-home`/`v1-timetable`
  stills, and the closing `.v1-carousel` ("the whole first version, working"), are gone. Both
  points ("Who's free now", "How the overlap is found") were, briefly, plain `.cs-sub` +
  `.guide-text`, identical in treatment to "The constraints" a section above. The `.ovl` overlap
  diagram is still Idea's proof of the mechanism; Idea's job is "does the logic work", not "here's
  an early build of it", which is Pivot's job and was the exact duplication Lucas flagged (the
  same `v1-home`/`v1-timetable` images were appearing twice, a few hundred px of scroll apart).
- **Pivot's color/typography/character exhibit — three swatch cards, three typography specimen
  pills, three illustrated character rows (`.color-grid`, `.typography-grid`, `.character-list`)
  — collapsed into one `.guide-text` paragraph** under "What replaced it", with two small
  `.inline-swatch` chips (14px rounded squares, `vertical-align: middle`, inline in the sentence)
  standing in for the pink and off-white. The facts survive (pink, off-white, Nunito, characters
  reused across the UI, structure untouched) but now read as the RATIONALE for the pivot — the
  reason the look changed — rather than as an independent design-system specimen sheet competing
  with Supporting Features' own final-app showcase. This is the piece the case-study research
  flagged hardest: no standard case-study structure gives a colors/type/illustration breakdown its
  own section unless the design system IS the deliverable being pitched, which Unify's isn't.
- **`.v1-carousel` and `.color-grid`/`.typography-grid`/`.character-list` (plus their character
  float keyframes and mobile overrides) are UNUSED but NOT deleted** — every relevant block is
  commented `/* UNUSED as of 2026-09-27, see CLAUDE.md */` at its definition (CSS) or top of its
  IIFE (the carousel's JS — its `document.querySelector('.v1-carousel')` now always returns null
  and the function returns immediately; verified zero console errors). Kept rather than removed
  because both are real, finished engineering (the carousel especially — fold/unfold, autoplay,
  swipe, WAAPI scroll) that may be wanted again if a future pass decides a design-system section
  does earn its place after all; deleting and later rebuilding would cost more than the dead
  weight costs now. If a future session is certain neither is coming back, they're safe to remove
  — search for the `UNUSED as of 2026-09-27` comments to find every piece.
- **What each section's job is now, post-cut:** Idea → does the concept/logic work (diagram only).
  Pivot → why did the look change (v1-vs-final comparison + preference-test data + the rationale
  paragraph, screens shown exactly once). Supporting Features → does the finished app work, shown
  in full (untouched by this pass — it was never part of the redundancy, since it's the only
  section showing the final app's actual feature set rather than re-litigating why it looks the
  way it does).
- Verified over CDP at 1440 and 390 (with touch emulation on mobile — see the CDP testing note
  under "3D Mode: Camera Controls" for why that matters): no overflow either width, inline swatches
  render correctly against the page's grey background, zero console errors from the now-dormant
  carousel script, div/section tag counts balanced.

**`.wf-frame`: two CONSTRUCTED wireframes under "Who's free now", built the same day as the cut
above, after Lucas pointed at a Jessica Im case-study screenshot as the exact reference** (two
screens sharing one dotted-grid canvas, one arrow between them, no side text — his instruction was
literally "two screens on one shared frame, one arrow inbetween, header and text below"). This is
NOT a reversal of the "Idea lost all its screens" cut above — the two `.feature-row`s and the
`.v1-carousel` that came back out were real v1 SCREENSHOTS, which is what made them duplicate
Pivot. `.wf-frame`'s two panels are hand-built markup recreating two v1 screens ("Connect now" and
the Stundenplan/timetable list) from Lucas's own screenshots of them, not the screenshot files
themselves — same colours and shapes as v1 (see the second rebuild note below), existing only to
explain why the app has two views. Nothing here appears again in Pivot, so the duplication problem
doesn't recur.
- **Copy above it was rewritten to state the reason for two views directly** ("I wanted two ways
  into the same overlap, not one screen doing both jobs...") rather than describing only the first
  view, since the wireframes now do double duty as evidence for both halves of that sentence.
- **`.wf-frame`**: a `role="img"` wrapper (same idiom as `.ovl`/`.tv`/`.diff` elsewhere on this
  page) holding a dot-grid canvas (`radial-gradient(circle, rgba(0,0,0,.08) 1px, transparent
  1.5px) 0 0 / 16px 16px` over `var(--bg-surface)`, inside a pressed neumorphic well) — the same
  "graph paper" cue the Jessica Im reference uses to signal *sketch*, not *screenshot*. Two
  `.wf-screen` cards (`#fff` background, thin `var(--border-color)` border, no phone bezel — these
  are wireframes of screens, not device mockups) sit in a flex row with an SVG arrow between,
  `align-items: flex-end` on the row so the arrow's height matches the "open Calendar" button's
  position at the bottom of the first card rather than sitting mid-height. Below 640px the row
  becomes a column and the arrow rotates 90° to point down.
- **Content is real, not abstracted to grey bars** — "Connect now" keeps its actual v1 copy (Zoe /
  Paul / Luis / Tom bubbles, the 11:30–12:00 range, "open Calendar"), and the Stundenplan panel
  keeps its actual tabs/day-selector/row structure ("Interface Design", times, room numbers).
  Matches how the Jessica Im reference itself works — real simplified copy, not Balsamiq-style
  placeholder bars.
- **Rebuilt a second time the same day, from a grey/pink abstraction to the ACTUAL v1 colours —
  Lucas: "the wireframes are totally off, not accurate", then "use the design from the actual v1
  blue version".** The first pass had used a monochrome grey wireframe idiom with a pink accent
  thread (matching this page's `.ovl`/`.tv`/`.diff` diagrams), which was the wrong call here: those
  diagrams are ABSTRACTIONS the page invents to explain data, but these two panels are supposed to
  read as "this is what v1 looked like", so they need v1's own colours, not the page's diagram
  language. Fixed by sampling the real files rather than eyeballing: opened
  `public/images/unify/v1/v1-home.webp` in PIL, scanned pixels on the "Zoe" bubble's fill and on
  the "Connect now" letterforms, and got a consistent `rgb(32, 16, 255)` both places —
  `--v1-blue: #2010FF`, declared once on `.wf-frame` so every child inherits it. Every shape was
  corrected to match too, cross-checked with side-by-side crops of the real exports next to
  screenshots of the rebuild: the thick **black card border** (`5px solid #000`, not a thin grey
  outline — real v1 screens are framed this way), solid `--v1-blue` FILL on the bubbles and the
  active tab/day/row (not outline-only), and the Stundenplan's last row bleeding edge-to-edge solid
  blue with rounded bottom corners matching the card's own radius (`.wf-sp-rows` gives back its
  own side padding as a negative margin so only that one row can reach it — see the CSS comment).
  `.wf-connect-title` and every other label now uses OCR-A-BT throughout (v1's own typewriter
  face), not just the one heading. **This also incidentally fixed the dark-mode contrast bug from
  the first pass** — see below.
- **Hardcoding white/black/`--v1-blue` rather than the page's `--text-*`/`--border-color` tokens
  is deliberate, and doubles as the dark-mode fix flagged (and left unfixed) after the first pass.**
  These panels must always render as the literal light v1 UI regardless of theme — same reasoning
  as "SkeuKit exhibits keep their own light material" in the dark-mode section above — and unlike
  the first pass, nothing in this version references `var(--text-primary)`/`--text-secondary`/
  `--border-color`, the three tokens `dark-mobile.css` swaps to light greys below 640px. So the
  mobile-dark-mode readability bug the first pass had (light grey text going near-invisible on the
  hardcoded white card) cannot recur here — verify this holds if the wireframe is ever extended
  with a new element, by grepping the new CSS for `var(--text-` or `var(--border-color)` before
  shipping it.
- **Bubble stacking order needed an explicit fix**: the small "Paul" bubble at the top visually
  overlapped the big central "Zoe" circle, and because DOM/paint order put `--zoe` after
  `--paul1`, Zoe painted over Paul's text. Fixed with `z-index: 1` on `--zoe` and `z-index: 2` on
  the four smaller bubbles — simpler than reordering the markup, and it generalizes if a bubble's
  position is nudged later.
- Verified on desktop (1440) over CDP against side-by-side crops of the real
  `v1-home.webp`/`v1-timetable.webp` exports: colour (`#2010FF` sampled both places), card border,
  bubble fills, tab/day/row shapes and the full-bleed last row all match; bubble stacking fixed,
  arrow aligns with the open-Calendar button's height, zero console errors. Mobile not re-verified
  this pass, per Lucas ("ignore mobile for now") — but per the point above, the specific bug found
  there earlier no longer has a mechanism to occur.

**"How the overlap is found" — its own `h3`, paragraph and the `.ovl` diagram — is gone, folded
into one plain paragraph right under the wireframes (2026-09-27, same day as the wireframe rebuild
above).** Lucas: fold the mechanism explanation into the "Who's free now" text rather than giving
it a separate heading and diagram. The two original sentences became one, opening with a bold lead
— `<p class="guide-text"><b>The overlap is found by</b> reading the gaps…</p>` — same `.guide-text`
size as the paragraph above the wireframes, no size step-down; `<b>` inside `.guide-text` already
renders as the page's established "picked-out phrase" style (`font-weight: 500`, primary-ink
colour — see the `.guide-text b` rule), so no new CSS was needed for the "thicker font" lead-in.
Section now runs: heading → intro paragraph → wireframes → mechanism paragraph → straight into
Pivot, with no diagram at all in Idea any more. `.ovl`'s CSS is marked `/* UNUSED as of
2026-09-27, see CLAUDE.md */` at its definition and left in place (same convention as
`.v1-carousel`/`.color-grid` etc. above) rather than deleted, in case a future pass wants a diagram
back for this or another section. Verified over CDP: div/section tags balanced, zero console
errors, section flows directly from the wireframe frame into "The pivot" with no leftover gap.

**Pivot's v1-vs-final comparison row, its caption, and the `.diff` semantic-differential chart
("the sliders") are gone — first step of a larger rebuild, done narrow on purpose (2026-09-27).**
Lucas is happy with Idea end to end (see above) but not with how Pivot visualizes the old design —
he wants something closer to a Jessica Im "audit" reference he shared: a non-linear collage of the
actual v1 screens (no phone frame this time, real image crops scattered across a shared canvas),
followed by a plain heading + paragraph stating the decision to pivot. That collage is NOT built
yet — **this commit is only the deletion**, explicitly scoped down by Lucas mid-conversation
("doesn't mean you have to redo everything below it... for now just delete the three final
character based screens and the sliders below") after he'd already answered planning questions for
the fuller rebuild (no per-screen annotation labels; drop the preference-test numbers/chart
entirely rather than keep them; use all 5 v1 exports, one crop each, for the eventual collage).
Removed: the `.pivot-row` holding the three final-design videos (`homepage_screen.mov` /
`timetable_screen.mov` / `map-friends_screen.mov`), the `<p class="cs-caption">` describing that
comparison ("Same screens, same data... 24 of 28..."), and the whole `.diff` chart block. **Left
untouched, deliberately** (nothing "under it" was redone): the intro paragraph above (still
carries the "28 students / 2.1 vs 5.8 / 24 of 28" stats — those numbers are Lucas's call to drop
when the fuller rebuild happens, not assumed here), the v1 `.pivot-row` (still 3 static screens in
`.pivot-screens`), and "What replaced it" below. `.diff`/`.diff-row`/`.diff-dot`/`.diff-end`/
`.chart-legend` are marked `/* UNUSED as of 2026-09-27, see CLAUDE.md */` and kept, not deleted —
same convention as every other dormant block tracked in this file. **`.chart-row`/`.chart-key`/
`.chart-track`/`.chart-fill`/`.chart-val` are NOT unused** — those shared classes are also used by
"Testing and results" further down the page, so don't mark them dormant if touching this area
again. Verified over CDP: div/section tags balanced, zero console errors, Pivot now runs heading →
intro → v1 row → "What replaced it" with no orphaned caption or empty gap where the deleted content
was.

**The scattered v1 collage was then built — `.v1-collage`, replacing the old phone-framed v1 row
entirely (2026-09-27, same session, Lucas: "do the collage").** Pivot now runs: intro paragraph
(trimmed — the preference-test numbers came out here, per Lucas's earlier answer to drop them) →
`.v1-collage` (all 5 v1 screens, scattered, no phone bezel) → `h3` "It felt like a tool" + paragraph
(the decision to pivot, qualitative only) → "What replaced it" (untouched). The old
`.pivot-compare`/`.pivot-row`/`.pivot-label`/`.pivot-screens` grid and the whole "v1 screens in an
iPhone frame" system (`.v1-screen`/`.v1-still`/`.v1-window`/`.v1-bar`/`.v1-carousel`) have no
markup referencing them any more — marked `UNUSED as of 2026-09-27` at their definitions and kept,
not deleted, same convention as every other dormant block in this file.
- **`.v1-collage`**: a `role="img"` dot-grid canvas (same idiom as `.wf-frame`) holding five
  `.v1-collage-card`s in a `flex-wrap: wrap` row — NOT absolute positioning. Each card is a plain
  `<img>` in a `3/4`-aspect-ratio box (`object-fit: cover`), no iPhone frame, with a
  `rotate(±2–4deg)` + `translateY` transform per `nth-child` for the "scattered photos on a table"
  look, and the centre card (3rd) sized larger with `z-index: 2` so it reads as sitting on top of
  the others. Flex-wrap (rather than fixed absolute coordinates) was the deliberate choice for
  responsiveness: it reflows to fewer per row on narrow screens for free, instead of needing a
  second, hand-tuned mobile layout with new coordinates.
- **No per-screen annotation labels** (Lucas's answer to the planning question) — plain screens
  only, the heading + paragraph below do the explaining.
- **The three "building" screens needed `object-position: center`, not the default `top`, and this
  cost a real debugging pass.** `v1-building.webp`/`v1-building-friends.webp`/
  `v1-building-open.webp` are screen RECORDINGS (not scrolling web exports like home/timetable) and
  carry black letterbox bars top and bottom, with the actual floor-plan/friends-list content sitting
  vertically centred in the frame, not at the top. `object-position: top` (the default used for
  home/timetable, where it's correct — those really do start at the screen's top) cropped straight
  into the dead letterbox space instead, rendering as a near-solid black or near-solid blue card
  with only a sliver of real content peeking in at the bottom. Diagnosed by opening the raw
  `.webp` files directly in PIL and looking at where the actual UI sits within the 720×1565 frame
  (content roughly y 330–1010 of 1565, i.e. genuinely centred, not top-anchored) — fixed by
  overriding `object-position: center` via `:nth-child(3) img, :nth-child(4) img, :nth-child(5) img`
  rather than changing the shared rule, since home/timetable still need `top`. **Rule going
  forward: `object-position` for a cropped screen asset depends on whether the source is a
  scrolling export (content starts at true screen top) or a screen recording with letterboxing
  (content sits centred) — check which before assuming `top` is correct.**
- **Mobile wrapped to ONE card per row instead of two, and the cause was a 2px arithmetic miss, not
  a real layout bug.** First mobile pass sized cards at `clamp(108px, 38vw, 150px)` with a 20px gap
  inside 18px side padding; at 390px viewport, `.v1-collage`'s own `clientWidth` (measured via CDP,
  not assumed) came out to 350px, minus 18+18 padding = 314px of real inner width, while two
  148px-ish cards plus the 20px gap needed 316px — 2px over, so `flex-wrap` dutifully wrapped every
  single card to its own line instead of pairing them. **Diagnosed by measuring, not guessing**:
  `getBoundingClientRect()` on the rotated cards initially looked like ~160–170px wide, which read
  as "close to the 150px cap, so sizing must be fine" — the real trap is that a CSS `transform:
  rotate()` inflates an element's *axis-aligned bounding box* well past its actual CSS width, so
  bounding-rect measurements on a rotated element are the wrong signal for "is this the size I set."
  `getComputedStyle(el).width` on the same elements confirmed the true values (148.188px, matching
  the clamp exactly) — that's when the 2px gap in the arithmetic, not the CSS itself, turned out to
  be the actual bug. Fixed with real margin rather than shaving the exact edge: mobile cards are now
  `clamp(100px, 32vw, 136px)` (centre card `clamp(112px, 36vw, 154px)`), gap `16px`, padding
  `24px 16px`. **Rule going forward: never measure a rotated element's size via
  `getBoundingClientRect()` — read `getComputedStyle().width` instead, and when sizing anything
  meant to fit N-per-row, measure the actual container `clientWidth` rather than assuming it equals
  the viewport width minus a remembered padding figure.**
- Verified over CDP at 1440 and 390 (touch-emulated): collage renders with all 5 screens showing
  real content (not letterbox), 2 cards per row on mobile with visible margin to spare, zero console
  errors, section flows intro → collage → "It felt like a tool" → "What replaced it" with no gaps.

**"Designing the merged timetable" and "Supporting features" — two separate sections — were merged
into one, "The final design", and the usage-share data moved into "Testing and results" as a pie
chart (2026-09-28, Lucas).** Lucas's own diagnosis: he liked the *idea* of "designing the merged
timetable" (pick one hard decision, go deep) but not the execution — an abstract `.cs-grid-3` of
three `.tv` diagrams (Columns / Overlay / Shared lane) with invented usability numbers, none of
which showed the actual app. His fix, after a short back-and-forth on scope: drop the A/B/C
comparison entirely and go straight to the real screens, in the order people actually used them,
folding in what used to be the separate "Supporting features" section (which duplicated some of
that same "here's the finished app" job) rather than keeping two sections that both show final
screens. Two explicit decisions from him going in: **no annotation labels** anywhere in this
section (kept to the wireframe/collage precedent from earlier in the page — plain screens, the
prose does the explaining) was not asked here, but **the live page's actual scroll-driven
sticky-pin mechanism should be rebuilt**, not faked with a static side-by-side, when I offered both
options and recommended static for consistency with the rest of this draft — he wanted the real
interaction. And the “which features got used most” data was moved to **Testing and results as a
pie chart**, replacing its old bar-chart form, because "which features got used" reads as a results
question, not a walkthrough one.

**"The final design" (`id="features"`, reused from the old "Supporting features" section — see
below for why the id didn't change) now runs: intro paragraph → Home/"Who's free now" (a
`.feature-row` using `homepage_freenow.mov`, the same "who's free now" cut used on the live
homepage hero) → Timetable+Socialplan (scroll-driven, mirrored: text left, videos right) → a map
spotlight placeholder (angle explicitly not decided — see below) → Friends+Courses (scroll-driven,
NOT mirrored: videos left, text right, matching the live page's own alternation) → Settings
(`.feature-row.reverse`).**
- **Timetable+Socialplan and Friends+Courses both reuse `.scrolly`/`initScrolly` as-is — zero JS
  changes.** `initScrolly` was already generic (`document.querySelectorAll('.scrolly').forEach
  (initScrolly)`, each instance's DOM queries scoped to that instance's own element), so adding a
  SECOND `.scrolly` section on the page needed only markup. The one thing that had to move: the
  mirror-layout rule that used to be scoped to `#support-scrolly` (Socials+Friends, the section
  being replaced) is now scoped to `#timetable-socials-scrolly` instead — both the desktop rule and
  its ≤860px restatement (see the "source order beats specificity" comment right above it, which
  now names the new ids). `#friends-courses-scrolly` gets no such rule, same as its predecessor
  `#nav-friends-scrolly` on the live page — that pairing was never mirrored.
- **`map-courses_screen.mov`** (on disk, previously unused in this draft) is the "Courses" video —
  the room finder, the same floor-plan feature pointed at your next class instead of a friend. Its
  `.phone-shot-video[data-vid="map-courses"]` placement rule already existed from the Video Details
  spec table earlier in this file, so no new CSS was needed for it either.
- **The Timetable panel's copy was rewritten, not reused**, because the old "The chosen design" text
  explicitly referenced the now-deleted A/B/C test ("C's lane", "the second column shows") — keeping
  it verbatim would have left a dangling reference to a comparison the reader never sees any more. It
  now describes the shipped design on its own terms.
- **Socials and Friends-indoors copy is reused verbatim** from the old Supporting Features
  scrolly — neither referenced the removed content, so there was nothing to fix.
- **Settings' copy was trimmed** — it used to also cover the room finder ("took 1% of pilot time")
  in one line; that line is gone now that Room finder/Courses has its own paired video above.
- **The map spotlight is a deliberate placeholder**, in the established `.ph` idiom
  (`<div class="ph ph--chart"><span class="ph-tag">Map spotlight · TBD</span>...`), not throwaway
  copy — Lucas's angle for it ("why is indoor navigation actually hard") is still undecided as of
  this note; he said "we'll talk about that later." Don't write speculative content into this slot;
  wait for the actual brief.
- **The id stayed `#features` on purpose**, even though the section's job and title both changed —
  reusing it kept the sidebar (`.cs-map`, dynamically built off `<a href>`s, no hardcoded id list —
  see its script) to a one-line edit (swap the `<a href="#timetable">Timetable</a>` link for
  `<a href="#features">Design</a>`) instead of also hunting down every other anchor into the old
  section. `id="timetable"` no longer exists anywhere on the page.

**Testing and results gained a pie chart, first thing in the section, before the existing task
table and SUS box — then revised twice more the same session (colour, size/layout, animation),
all per Lucas.** `.pie-chart` is pure CSS — a `conic-gradient` on a circular div, with hardcoded
cumulative-degree stops (`deg = cumulative% × 3.6`) rather than custom-property-driven ones, since
this is a one-off single-instance chart, not a reusable component like `.chart`/`.ovl`/`.tv` — the
extra indirection those use had nothing to buy here. A `.pie-legend` list carries the
labels/percentages next to it, since the three smallest slices (6%, 4%, 1%) are too thin to label
inside the pie itself.
- **Colour — the app's own palette, not this page's usual chart convention.** The first version
  used the generic "one accent, grey for the rest" rule every other chart on the page follows
  (`var(--accent-ink)` + descending-opacity greys). Lucas asked instead for "the colors of the app —
  pink, dark grey, creme etc.", so the five slices are now literal app colours in legend order:
  `#FF88C8` pink (71%, Who's free now), `#1A1A1A` near-black (18%, Timetable), `#8E8E93` mid grey
  (6%, Socials), `#F9F2EB` cream (4%, Friends map), `#C7C7CC` light grey (1%, Room finder) — pink and
  cream from the app's actual palette (`--accent-ink`/the "What replaced it" swatches), the two greys
  filling in for the slices too small to read in a single hue. This is a deliberate one-off exception
  to the page's chart convention, not a new rule to reuse elsewhere.
- **Size and layout.** `.pie-chart` is +35% over its first size (`clamp(140px,16vw,200px)` →
  `clamp(189px, 21.6vw, 270px)`). The whole thing — chart, legend, and a new plain-text takeaway
  paragraph below it — is wrapped in `.pie-block` (`flex-direction: column; align-items: center;
  text-align: center; max-width: 560px; margin: 0 auto`), replacing the old left-aligned
  `.pie-chart-wrap` sitting flush with the rest of the section's body text. The takeaway paragraph
  (`.pie-note`) is deliberately plain `.guide-text` — Lucas: "no fancy design" — not a `.cs-caption`
  (which is VT323, small, and reads as decorative furniture elsewhere on the page); it replaced the
  old `.cs-caption` that used to sit under the chart.
- **The sweep-in animation.** Lucas: the pie should start empty and the segments should "expand out
  ... opening up from one side going one direction" rather than fading or popping in — a classic
  pie-fill reveal. Built with a registered custom property, `@property --reveal { syntax:
  '<number>'; inherits: false; initial-value: 0; }`, which is what lets a browser interpolate a
  bare number smoothly instead of snapping (an un-registered custom property cannot be transitioned
  at all — the browser treats every value change as instant). `--reveal` (0–100) feeds a `mask:
  conic-gradient(#000 calc(var(--reveal) * 3.6deg), transparent 0deg)` on the SAME element as the
  colour conic-gradient — the mask's angle formula is identical to the chart's own slice-angle
  formula (`deg = percent × 3.6`), so the reveal sweeps clockwise from 12 o'clock and uncovers real
  colour as it goes, rather than crossfading over an already-visible pie. `.pie-chart.is-visible`
  sets `--reveal: 100`; a small `IntersectionObserver` (threshold 0.4) adds that class the first
  time the chart scrolls into view and immediately disconnects — a fill-in that replayed on every
  scroll past would read as a glitch, not an entrance. `transition: --reveal 1.6s cubic-bezier(.4,
  0, .2, 1)` is the "easing in and out" Lucas asked for. Browsers without `@property` support (rare,
  pre-2023 engines) simply see the pie at full colour immediately — the transition can't run, but
  nothing breaks. `prefers-reduced-motion` forces `--reveal: 100 !important` and `transition: none
  !important` directly on `.pie-chart`, so the finished pie shows regardless of whether JS ever adds
  `.is-visible`.
- Verified over CDP: a mid-animation screenshot (captured immediately after scroll-into-view) shows
  a partial pink wedge mid-sweep exactly as designed; a screenshot taken 2.5s later (past the 1.6s
  transition) shows the complete five-slice pie at full colour. Zero console errors either way.

> ⚠ **Mobile was explicitly paused for this whole 2026-09-28 session** (Lucas: "stop doing mobile
> for this session entirely, we'll focus on that later"). Everything from "The final design" merge
> through the pie chart rebuild and the header/toggle follow-up below — the two new `.scrolly`
> sections, `.pie-block`, the sweep animation, the header toggle — was verified on desktop (1440)
> only. **None of it has been checked at 390/touch yet**, including whether `.pie-chart` overflows
> at narrow widths, whether `.pie-header-toggle`'s two buttons wrap awkwardly, or whether the
> mobile `.scrolly` stacked-fallback (see `initScrolly`'s `stacked` branch) still shows both
> videos/panels correctly for the two new pairings. Do a full mobile pass before calling this
> restructure done.

**Same session, follow-up pass on the pie: a `.cs-sub` heading replaced the plain intro paragraph,
and the block's alignment went through a compare-and-pick round (left-aligned, then a toggle, then
centred for good — see the two notes below for where it landed).**
- **Heading, not paragraph.** "Five friend groups — 20 people — used the coded prototype for two
  weeks. This is where the time went." (the plain intro line) is gone; `<h3 class="cs-sub">Where
  the time went</h3>` takes its place, same treatment as "It felt like a tool" / "What replaced it"
  elsewhere in the case study. The methodology half of that old sentence ("Five friend groups — 20
  people...") wasn't dropped — it moved into `.pie-note` below, which is why that paragraph's
  `max-width` had already gone to 64ch (room for the extra sentence) and `.pie-block` to 720px.
- **Centred block, left-aligned text — these are two different things, and conflating them was the
  bug in the previous pass.** `.pie-block` still sits centred ON THE PAGE (`max-width: 720px;
  margin: 0 auto`), but the heading and `.pie-note` paragraph now read left-aligned, not centred
  text, because centred multi-line prose is harder to read. The fix was `align-items: center;
  text-align: center;` → deleted from `.pie-block` entirely (falling back to the flex default,
  `align-items: stretch`, and the site's normal left `text-align`). This is what makes it work
  without extra CSS on the children: a stretched flex item that hits its own `max-width` (true of
  `.pie-note`, capped at 64ch) stays flush at the cross-start edge rather than centring in the
  leftover space — so it reads flush-left inside the 720px block for free. `.pie-chart-wrap` keeps
  its own internal `justify-content: center`, so the chart+legend pairing still visually centres as
  a unit even though its container is no longer itself centring things.
- **A `.pie-header-toggle` was added to compare heading-above vs. heading-below, and later a second
  group for centred vs. left text. Both are GONE as of 2026-09-29** — Lucas picked **centred text,
  heading above**, and asked for the scaffolding removed. Nothing of it survives: the CSS block, the
  markup, the `<script>`, the `.is-header-below`/`.is-left` rules and the `order: 1/2/3`
  declarations that existed only so the toggle could renumber the heading without moving DOM nodes.
  Worth knowing as precedent, though: a throwaway comparison toggle like this costs about 20 lines
  when every piece is tagged `TEMPORARY` in its own comment, and grepping that one word found all
  of them at removal time.

**Third pass on the pie, 2026-09-29: Socials dropped from the data, the legend block replaced by
labels attached to each slice with leader lines, the pie centred, and left-alignment demoted from
default to a second toggle.**
- **Socials is gone from the chart — data only, not the feature.** Lucas: "it wasn't used in the
  prototype." It was 6%, so the remaining four were renormalised back to 100: 71/18/4/1 of 94 →
  **76/19/4/1**. The Socials FEATURE still appears everywhere else (its screen recording is half of
  the Timetable+Socials pairing in "The final design"), and `.pie-note`'s list of "everything else"
  dropped its mention to match. ⚠ **Open question flagged to Lucas, not yet answered:** a reader
  meets Socials as a shipped feature and then doesn't find it in the usage chart. Whether the page
  should say why (one clause — "Socials wasn't in the pilot build") or stay silent is his call; no
  claim was invented either way.
- **The legend list became per-slice labels with leader lines** (`.pie-label` + a `.pie-lines`
  SVG), replacing `.pie-legend`, which was deleted rather than marked dormant — it was a handful of
  lines written the same session and directly superseded, not an established component worth
  keeping on the pile. The pie is now what's centred on the page; the labels hang off its right
  side, outside `.pie-stage`'s box (`overflow: visible`), so they don't shift the circle off-centre.
- **`from 106.4deg` on the conic-gradient is load-bearing geometry, not styling.** The three small
  slices (19/4/1%) are adjacent, so wherever their combined 24% arc sits, their labels stack on top
  of each other. Rotating the gradient so that arc spans absolute 20°→106.4° puts all three on the
  RIGHT of the circle, *and* leaves the big pink slice's arc (106.4°→380°) crossing the lower right
  as well — so all four labels sit on the right, no crossings, no collisions. **The mask that drives
  the sweep animation had to take the same `from 106.4deg`**, or the reveal starts mid-slice instead
  of on a boundary. If that start angle is ever changed, the mask AND every leader-line coordinate
  move with it.
- **Leader-line coordinates are derived, not eyeballed.** The SVG uses `viewBox="0 0 100 100"`
  mapped onto the circle's own box, so every coordinate is a percentage of the pie and the geometry
  is just `x = 50 + 50·sin θ`, `y = 50 − 50·cos θ` (θ clockwise from 12 o'clock — the same
  convention `conic-gradient` uses). Each polyline is three points: a point on that slice's arc → a
  short radial step outward (r = 59 instead of 50) → horizontal to the labels' shared left edge at
  x = 118. Each `.pie-label`'s inline `top` is the y of its own line's horizontal segment, so label
  and line always line up. `vector-effect: non-scaling-stroke` keeps the hairline at 1px whatever
  size the pie renders. **Connection points don't have to be slice midpoints** — that's what makes
  this work: the pink slice is connected at 130°, well off its midpoint, purely because that's where
  there was room on the right.
- **Labels and lines fade in with the sweep** (opacity, 0.5s, 0.9s delay, via
  `.pie-chart.is-visible ~ .pie-lines` / `~ .pie-label`) — without it they sit pointing at an empty
  circle for the animation's full 1.6s, which reads as a half-finished render rather than an
  entrance. Reduced-motion forces them visible with no transition, same as the chart itself.
- **Left-alignment went from default back to a toggle, and then away entirely** — Lucas reverted the
  "links bündig" default and, after comparing, settled on **centred**. `.pie-block` is
  `align-items: center; text-align: center`, and `.pie-stage` carries `align-self: center` so the
  circle stays centred regardless of what the block does with its other children.
- **3x more air above and below the block** (Lucas, at the same time as removing the toggles):
  `.pie-block`'s `margin-top` is `clamp(60px, 9vw, 84px)` — 3x its own internal `gap` — and the
  "The one nobody could find" heading under it went from `clamp(28px, 5vw, 48px)` to
  `clamp(84px, 15vw, 144px)`. The two halves of that spacing live in different places (one a block
  margin, one an inline style on the next heading) because there's no single wrapper around both.
- Verified over CDP at 1440: all four labels land on the right with clean spacing and no crossings,
  pie centre sits dead centre of the page, mid-sweep frame shows
  the wedge growing with labels still hidden, settled frame shows all four slices and labels, zero
  console errors. Mobile still untouched this session (see the warning above).

**Testing and results was restructured around ONE stated cohort, 2026-09-29 (Lucas: the section
should open by saying the prototype was used by 20 people for three weeks and that the findings
come from that plus interviews, "so you don't need to restate the user amount each time").**
- **The cohort was being stated three different ways.** `.pie-note` said "Five friend groups — 20
  people — two weeks"; "The final design"'s intro said the same thing again a section earlier; and
  the task-table paragraph opened "A moderated test with **12 participants**" — a fourth number
  implying a second study that never existed. Now it's stated **once**, in a `.guide-text`
  paragraph directly under the section's divider, and everything below belongs to it. Both
  duplicates were cut: `.pie-note` opens straight on its finding, and "The final design"'s intro
  now just points forward ("the numbers behind that order are in Testing and results").
- **Three weeks, not two** — Lucas's number, changed everywhere it appeared.
- **The task table was reattributed to the same cohort, not a separate moderated test.** Its
  paragraph now reads "Five tasks, run in the first week and again in the last, with one change in
  between", and the column headers changed **Before/After → Week 1/Week 3** so the table itself
  carries that framing instead of relying on the prose. The SUS box's caption was cut down to
  "Measured at the start of the three weeks and again at the end, either side of that one change"
  — it used to repeat the 42%→92% figure that the table already shows two columns of.
- **A `.cs-sub` heading was added over the second half** ("The one nobody could find"), because
  every other block of that size on the page has one and this one was running headless straight out
  of the pie. It names the finding rather than the method, matching "It felt like a tool" / "Why the
  68% stopped trying".
- **One invented interview quote was added** — "I assumed that lived on the person, not in a menu."
  — in the `<b>` inline style the Problem section's interviews already use. Rationale: the new
  framing names interviews as a source, but nothing in the section actually drew on them. ⚠ Like
  every other figure on this page it is a **placeholder**, covered by the blanket invented-data
  warning at the top of the file.
- **"What we learned" got a consistency fix**: "Four fifths of the pilot's time" → "Three-quarters",
  since dropping Socials moved the home-screen share from 71% to 76%.
- ⚠ **Still a placeholder**: the `.ph` before/after well at the end of the section, now labelled
  "The settings screen and the friend's profile, side by side" — it wants two real screenshots of
  the iteration the whole second half is about.
- Verified over CDP at 1440: section reads framing → pie → heading → paragraph → table/SUS →
  placeholder, no duplicated cohort claims anywhere on the page, zero console errors.

**Then the second half was rebuilt to mirror the first, same day — the section is now two matched
movements instead of a centred chart followed by a full-width two-column grid.** Lucas: "restructure
/ reimagine it so it fits the new layout and rest of page."
- **One shared block shape, used twice: `.res-block`** (renamed from `.pie-block`, which was doing
  the job already but under a pie-specific name). Both halves are now **heading → the evidence →
  a plain note under it**, centred in a 720px column: `Where the time went` → pie → note, and
  `The one nobody could find` → task table → note. `.pie-note` was renamed `.res-note` for the same
  reason. The explanatory paragraph for the table used to sit ABOVE it; it moved below so both
  halves read the same way round.
- **The `.sus` card is gone and its number folded into prose.** It was the last raised neumorphic
  panel in the section and the obvious odd one out once everything else went flat and centred — and
  it was a *second* before/after (71 → 83) sitting beside a table that already had before/after
  columns. `71 to 83` is now a `<b>` figure in the note under the table, alongside `42 % to 92 %`.
  `.cs-grid-2`'s only instance went with it.
- **The task table was kept, deliberately, unlike the A/B/C variant grid cut earlier.** Four of its
  five rows show a task that barely moved, which is the same "grid where only one row carries the
  finding" shape that got the `.tv` variants cut — but this table already resolves that the way the
  page's own chart convention says to: `.is-highlight` on the failing row renders its result in the
  accent while the rest stay grey. It's the page's "one accent, grey for the rest" rule applied to a
  table, so it stays.
- **`.cs-table td` needed an explicit `text-align: left`.** Inside `.res-block` the cells inherited
  the block's `text-align: center`, so task names centred in their column while the `th` above them
  stayed left — which reads as a broken column, not a styled one. The `.num` cells still override to
  right. **Worth remembering generally: moving a table into a centred container silently re-aligns
  every cell that doesn't set its own alignment.**
- **Now dormant, marked `UNUSED` and kept per the usual convention**: `.sus`, and the whole
  `.fact-bar`/`.fact`/`.fact-num`/`.fact-label`/`.fact-src` group — the latter had outlived the
  removal of the pilot stats from "The idea" only because the SUS card borrowed three of its
  classes.
- Verified over CDP at 1440: both halves render as matched heading/evidence/note blocks, table
  columns align correctly, zero console errors.
- ⚠ Still unresolved in this section: the `.ph` before/after well at the end (wants two real
  screenshots of the settings → profile change), and whether the page should explain why Socials is
  absent from the usage chart.

**"What we learned"'s opening paragraph was reworded, not left alone, and its badge and the
Results/Learned badges all shifted down by one** (Results 7→6, Learned 8→7 — Pivot stays 4, "The
final design" is the new 5). The paragraph used to say "ordering THIS PAGE by measured use... was
the most uncomfortable decision in it" — a claim that stopped being quite true the moment the map
spotlight was added, since that spotlight is an explicit, deliberate EXCEPTION to strict usage-order
(a 1%-of-pilot-time feature getting a dedicated deep dive because it's the hardest thing built, not
because people used it). Reworded to "walking the app in that order, and making one deliberate
exception for the part worth a closer look anyway, was the most uncomfortable call" — true either
way the spotlight's eventual content lands, and it doesn't pre-empt what that content will argue
(still TBD).

**Marked UNUSED, not deleted, same convention as every other dormant block in this file**: the
whole A/B/C comparison system — `.variant`/`.variant-name`/`.variant-metrics`/`.variant.is-winner`
and `.tv`/`.tv-cols`/`.tv-col`/`.tv-stack`/`.tv-lane`/`.tv-slot` — and the old usage-share bar chart
— `.chart`/`.chart-row`/`.chart-key`/`.chart-track`/`.chart-fill`/`.chart-val`. **Correction to an
earlier note in this file**: a previous entry (from the `.diff`-removal pass) claimed
`.chart-row`/etc. were "also used by Testing and results further down the page" and therefore not
safe to mark unused — that was wrong even at the time it was written (grepped now to confirm: the
bar chart's only markup instance was always the one in the old Supporting Features section, never
in Results). Results has never contained a `.chart-row` — the pie chart is genuinely new there, not
a restoration of something already present. `.cs-grid-3` (the 3-column grid the A/B/C cards sat in)
was left unmarked — it's a one-line generic layout utility, not worth tracking as dormant
infrastructure the way the more specific `.variant`/`.tv` systems are.

Verified over CDP at 1440 and 390: both new `.scrolly` sections swap correctly on scroll (mirrored
and non-mirrored), pie chart renders with correct proportions and legend, sidebar nav's "Design"
link scrolls to and highlights the merged section, badges read 1/2/3/4/5/6/7 in order down the
page, zero console errors, div/section/ul tag counts balanced.

**The page map moved out of the hero into a fixed sidebar** (2026-09-26, after Jessica Im's
reference; the plan flagged this as a "if the page has room" option). It was `.cs-map`, inline
under the lead line, six words and five arrows competing with the fact bar right under it. Same
class, new job: `.cs-map` is now `position: fixed`, bottom-left, with a "↑ Unify" back link above
the six section links. Hidden (`opacity/pointer-events`) until the hero (`#top`) has scrolled out
of view — `hero.getBoundingClientRect().bottom < 80` on scroll — so it never competes with the
hero it exists to declutter. The active link is whichever section's top has most recently crossed
35% down the viewport (a reading-position line, not "biggest on screen"), rAF-throttled. **Desktop
only** (`display: none` below 1080px) — six lines plus a back link is exactly the clutter a phone's
`.mobile-menu` already exists to avoid. **Hidden wherever it would crowd the page's border line**
(2026-10-05, Lucas): a resize/fonts-ready check measures the longest link ("CONSTRAINTS") against
`.page-wrapper`'s left edge and adds `.is-cramped` (visibility: hidden — so it stays measurable)
when it comes within 24px. Measured: hidden at 1280/1440/1512 (MacBook widths, where it ran into
the border — visible once the hero film made that ground dark), shown from 1728 up.

**Four gaps were widened individually, by name, not by touching a shared rule** (Lucas: 80% above
"Why the 68% stopped trying" and above Research, 300% above "How the overlap is found"). Each is an
inline `style="margin-top: …"` / `padding-top: …"` on that one element, because the class it would
otherwise inherit from is shared with something that must NOT move: `.stat-head.is-section` is also
"What using it actually did" a few sections down, `.cs-sub` is also "What replaced it" in the Pivot
section, and `.cs-section + .cs-section` is the shared gap between every pair of top-level sections.
Values are the base clamp scaled by the requested factor — e.g. Research's `padding-top` is the
default `clamp(16px, 3vw, 32px)` × 1.8 = `clamp(28.8px, 5.4vw, 57.6px)`.

**No pixel font inside a statistic** (Lucas, 2026-09-26): VT323 stays on the page's furniture —
breadcrumb, meta labels, step badges, captions — but every chart's own keys, values, legends and
labels are Roboto Flex at ~0.76 of their VT323 size. A number is read, not decorated.

**Charts are MARKUP, not images** (2026-09-25, the first of the plan's visuals to be built):
`.chart` (horizontal bars — Problem's "how students coordinate" and the pilot's share of time),
`.funnel` (attempts → agreed → met), `.chart.stack` (willingness by precision) and `.diff` (the
semantic differential, one dot per design per word pair). VT323 keys, pressed neumorphic troughs,
**one orange row per chart — the one carrying the finding — and grey for the rest**. Every value
lives in exactly one place, `--v` (0–100) on its row, with the label beside it as `[ 00 % ]`, so
filling in a study is a number swap and never a rebuild.

**The overlap diagram (`.ovl`) is the plan's Study 6**, and needs no study: seven rows on one
08:00–18:00 scale — Ben, Sophia and Lucas's days, then their gaps in three lanes, the overlap, the
minimum-length filter (the 15-minute sliver greys out) and the walk taken off both ends, leaving
17:10–17:50. Blocks are placed by two custom properties in hours (`--s`, `--e`), so editing the
timetables means editing numbers. **It has to agree with the drawn timetables** — same hours.

**The hero loop** `public/videos/unify/homepage_freenow.mov` is the plan's 5–8s "who's free now"
cut: 10.6s → 16.6s of `homepage_screen.mov` (231 KB against 1.6 MB), those two endpoints chosen by
measurement — mean per-pixel difference 3.8 of 255 between the first and last frame, so the loop seam does
not read. Same dimensions as the source, so the `data-vid="homepage"` placement rules still apply.

## to.morrow promo loop (`motion/`, Remotion)

A silent, seamlessly looping motion graphic — **the hero of the to.morrow page and its tile on
the landing page since 2026-10-04** — **29.5 s, 30 fps**, built in **Remotion 4** in its own
folder `motion/` (own `package.json`, outside `public/`, so nothing in it deploys).
`cd motion && npm run studio` to preview.

**The site's version is `TomorrowPromoF`** (Lucas, 2026-10-04), in two cuts:
- `TomorrowPromoF` — 1920×1080 → `public/videos/to.morrow/tomorrow-promo.mp4` (landing tile),
  poster `promo-poster.webp`; also the review copy `~/Downloads/tomorrow-promo-F-important-tasks.mp4`.
- `TomorrowPromoFTall` — the same film with **`EXT` = 240px of empty canvas on top**, 1920×1320 →
  `tomorrow-promo-hero.mp4` (the page hero), poster `promo-poster-hero.webp`. See "Tall cut" below.
Render each (`npx remotion render <id> out/<name>.mp4 --crf=16`), web-encode with
`ffmpeg -i <master> -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -movflags +faststart -an`,
and **re-make both posters (first frame) after every re-render**. (zsh does not word-split a
`$VAR` holding those flags — write them out.)

**F = E plus one beat in the dark hold**: "Go Live" alone for a moment, then " on important
tasks" typed onto it letter by letter, read (1 s), backspaced away. Built as a **time warp of E**
(`INS`, `insWarp` in Promo.tsx): the scene is frozen at `INS.at` for `INS.len` frames (under the
dark nothing moves); afterwards E resumes **`INS_SKIP` = 46 frames further on** inside its own
still dark hold, so the button builds 12 frames after the last backspace instead of 58 (Lucas:
smoother). The ring breathes on REAL time (`ext.bf`) so it never stalls. While the line is long
the dark layer glides left (`INS_PAN` −189px, measured so ring + full line sit centred) and back.

**Retimed and re-set 2026-10-04 (all in E's shared code, so E and F both carry it):**
- `GO` = `LIVE_CUT + 107` (was +86): 0.7 s more between "Bring passport" and the tap.
- `TICK` = `ARRIVE + 81` (was +66): the Lock Screen tick comes 0.5 s later.
- `OPEN` = `CLOSE × 1.4`: the opening's typed "to.morrow" is 40% larger; the Go Live close-up
  keeps `CLOSE`.
- **No pixel type in the film**: the workspace pill and the tab labels are SF now, as in the
  app's Modern face (`SkeuFont.at(label)`: 19.7 / 16.4pt regular, −0.02 tracking).
- **Button labels re-centred** (Lucas: "sits a bit too high"). Measured in the film (`LabPhone`,
  the phone exactly as rendered with the camera parked at 4 px/pt, plus a 4× still of a film
  frame): "Personal" sat ~0.45pt and "Go Live" ~0.4–0.9pt above their pills' centres; "Live" and
  the tab labels were centred. Both are lowered by a transform (not `top`, which re-rounds in phone
  px): Personal +0.45pt, Go Live +0.6pt — and because "Go Live" must land on the typed words at
  the cut, the words on the swipe side moved with it: **`CUT_FIX.textY` 0.72** (matches on
  0.66–0.77; text snaps to whole px, so it is a plateau, not a point). Re-measured across the cut:
  text identical in y, 0.25px in x; ring ≤0.3px.
- `LabButtons` / `LabPhone` are dev-only compositions for exactly this kind of measuring.

**Tall cut (`PromoTall`, `ExtTop`, `EXT`).** The hero runs up under the nav, so the film needs
canvas above its frame. Nothing is placed there: the scene keeps its 1920×1080 box, placed `EXT`
down, and every full-frame background reaches up by `EXT` itself — `Canvas` (its gradient
rewritten in px against the ORIGINAL frame so the frame is pixel-identical, mean diff <0.1/255 vs
the 16:9 cut), the dark overlay of the dark hold and `rv.frame`'s overlay. **Remotion's
`AbsoluteFill` is `height: 100%`, not `bottom: 0`** — `top: -ext` alone just slid each box up and
left a light strip at the bottom; the height has to be restated (`H + ext`). The cameras simply
see more above, so during the pull-back from the pill the phone's top (status bar, "Personal")
passes through the band for ~0.8 s; at rest it is background only.

**Vertical cut — `TomorrowPromoV` (`motion/src/PromoV.tsx`), 2026-10-04 — what PHONES get (≤640px).**
A phone version of F at **4:5, 1080×1350**, 29.5 s, same story and timing. Chosen over 9:16
because the page does not need the whole screen (4:5 is the tallest feed format that still leaves
room around it) and 1080 wide keeps the UI's own pixels. `PromoV.tsx` is a **copy** of Promo.tsx
with the layout rebuilt, so the landscape film is untouched — changes to the story must be made in
both. What differs: lists 13% larger (`PZ` 1.45), so only two fit — the wide shot frames the PAIR a
task moves between (`panX`: Tomorrow+Soon for the first flick, Today+Tomorrow for the second, one
eased move each, tied to the flick); the headline is stacked in two lines above the lists;
captions sit centred ABOVE their phone (`CAM_L/R` put the phone low, `PHONE_S` 1.1), never beside
it; the Go Live close-up is 3.9 px/pt with the camera centred on ring + words (`CL_OFF` 5) and
the long line centred (`INS_PAN` −259); its own `CUT_FIX` {textY 0.42, ringX 0.59} — measured
across its cut: text identical in y, 0.23px in x, ring ≤0.1px. Copy at
`~/Desktop/tomorrow-promo-vertical-4x5.mp4`. Two web files, encoded like the landscape ones:
- `TomorrowPromoV` (1080×1350) → `public/videos/to.morrow/tomorrow-promo-mobile.mp4` — the
  landing tile on a phone, shown at exactly 4:5.
- `TomorrowPromoVTall` (`PromoVTall`, `EXT_V` = 180px of empty canvas on top, 1080×1530) →
  `tomorrow-promo-mobile-hero.mp4` — the to.morrow page's phone hero, so it runs up under the nav
  while the film's own captions (from 122px down its frame) stay clear: at 390 wide the band is
  ~65px and the first caption starts ~109px down, under a nav pill that ends at ~77px.
Both pages pick the file with `<source media="(min-width: 641px)">` + a plain `<source>`: the
LANDSCAPE source comes first, so a browser that ignores `media` (pre-2023 Chrome) falls back to
it everywhere instead of putting the portrait film on a desktop. The pick happens once, at load.
The posters stay the landscape ones (frame 0 is an empty canvas in both cuts). Verified over CDP:
390 touch → `tomorrow-promo-mobile-hero.mp4` in a 390×553 box from y=1, and
`tomorrow-promo-mobile.mp4` in a 350×438 (0.800) tile; 1440 → the landscape files as before;
all playing, no overflow, no console errors.

**The site's colour is blue ×4 (2026-10-04, Lucas picked review render 4).** `BLUE` now defaults
to 4 in `ui.tsx`, and all four site files (landscape, landscape tall, vertical, vertical tall) and
both posters were re-rendered with it; pass `"blue": 1` for the original slate.

**Alternate — `TomorrowPromo16` (`motion/src/Promo16.tsx`), review only, NOT on the site.** A
copy of the landscape F (blue ×4) with modern phones and a longer ending (33.3 s):
- **Frame**: no iPhone 16 mockup exists in the project, so it uses the only Dynamic-Island one,
  `public/images/unify/iphone-17-frame.png` (copied to `motion/public/iphone17-frame.png`) —
  its screen is the 16 Pro's 402×874pt (804×1748px at 2px/pt, hole radius 128px; its own island
  at (201, 32.5)pt, 105.5×35.5).
- **App screen re-laid** off Lucas's 16 Pro screenshot (1206×2622 → pt = px/3): status bar time
  at x 63.7 / cluster at 326 on y 32.5; top bar row at 65.8; Live box (20.5, 290.3, 361×257.7);
  controls at 566; tab bar at 874 − 34 − 51. `CUT_FIX` refit for it {textY 0.36, ringX 0.44,
  ringY 0.09}: text matches in y, 0.39px in x; ring ≤0.1px.
- **White Lock Screen** (dark text, light-style torch/camera discs; the Live Activity card keeps
  the app's dark material) and a **white, minimal Home Screen** (one row: to.morrow — its real
  icon, `motion/public/tomorrow-icon.webp` — Calendar, Notes, Photos; Search pill; dock with
  Phone, Messages, Safari, Music; all generic drawings, not Apple artwork).
- **New ending** (instead of the tick on the Lock Screen): swipe up from the bottom to unlock
  (`UNLOCK`; the Lock Screen rides up and fades, the icons fly in from 1.12×), the island grows
  into the compact Live Activity (`ISL_IN`; 190pt wide, Live ring leading, the title's first three
  letters "Bri" trailing, right-aligned 14pt in so it clears the hardware cutout — Lucas), the camera pushes in
  (`CAM_I`, 2.18×), the closed island is held ~2.7 s (1 s more than at first — Lucas), a press
  squishes the island 4% (`ISL_TAP` = `ISL_IN` + 82) and on release it expands to
  374×84pt, radius 40 (`ISL_EXP`), the task is ticked off on its right-hand button (`TICK`), the
  island shuts (`ISL_DONE`) and light floods out of the tick to frame 0 as before. A third caption,
  "And in the / Dynamic Island.", replaces "Right on your Lock Screen." for that part.
- **Island motion** (researched — the morph-physics write-ups of community Dynamic Island
  rebuilds): every footprint change is a damped spring, growth response .45 / damping .75 (a small
  overshoot), collapse .40 / .90 (firmer); the island never scales its content — it clips it, the
  old content blurring (≤6px) and fading out as the new content blurs and fades in a beat later.
- **The island is drawn ABOVE the frame image** (`Phone16`'s `over` slot): beneath it, the
  mockup's own island (a lens and highlights up to luminance 166) showed through ours as a second
  shape. Over it, compact and expanded are one black. The status bar on these phones has no
  cellular bars (they ran under the compact island's end — Lucas); Wi-Fi and battery stay put.
- **The tick button springs** when pressed: squashed to 78% under the finger, then released on an
  underdamped spring (response .38, damping .42, ~23% overshoot).
- Touches on the white screens use a grey finger (`FingerOnLight`) — the film's half-white disc
  vanishes on white.
- **Render it through `src/tomorrow-entry.tsx`** (`npx remotion render src/tomorrow-entry.tsx
  <id> out/<file>.mp4`): an entry with only the to.morrow compositions, so they render even while
  `Root.tsx` carries unfinished work from elsewhere (the Unify promo imports modules that did not
  exist yet on 2026-10-04 and broke the default bundle).
- Review copy: `~/Downloads/tomorrow-promo-iphone16-island.mp4`.

**Blue-intensity switch (review only, 2026-10-04).** `--props='{"variant":"A","transition":"golive3","blue":k}'`
on any composition scales the chroma of every palette colour (`LIGHT`/`DARK`, `CHECK_RING`, the
`Canvas` gradient stops, the box→ring colour) by k around its own luma — the slate's blue deepens,
greys stay grey; the phone frame and Lock Screen wallpaper are untouched. No prop = k 1 = the
site's videos exactly (`blueHex` returns its input). Four review renders of F at k 1.75 / 2.5 /
3.25 / 4.0 are in `~/Downloads/tomorrow-promo-blue-1…4-x<k>.mp4` (light canvas 199,204,212 →
197,204,218 / 191,204,223 / 188,204,229 / 186,206,236).

**Only F is the site's version.** The A–D compositions were removed from `Root.tsx` and their
renders deleted; E stays registered (F is built on it). Their branches (`variant` B/C, the `line`
and `golive` transitions, `TextScene`) are still inside `Promo.tsx`, unused. The variant notes
below are history.

**Ground truth is the app's own source, not the `shove95-*.md` CSS ports.** The SwiftUI project
lives at `~/Documents/creative-work/finished/GitHub:Claude:AI/to.morrow/` (SkeuKit/,
Screens/Skeu/, ShoveWidgets/PinnedTaskLiveActivity.swift) with real simulator screenshots in
`AppStore_screenshots_Shove.95/screenshots/`. The third pass (2026-10-03) rebuilt every component
from that source — `motion/src/ui.tsx` (Glass, Trough, glyphs) and `motion/src/app.tsx` (task
row, tab bar, top bar, Live box, Live switch / Go pill / bin, Lock Screen card) — and calibrated
them against the screenshots with the `Lab` / `LabBox` compositions in `motion/src/Lab.tsx`
(components at 3× laid over the same pixel positions as screenshot crops; `out/cmp.py` builds the
side-by-sides). Things that comparison caught, all of which the md ports had wrong:
- **Glass shadows must be `filter: drop-shadow`, not `box-shadow`.** SwiftUI shadows what a view
  actually draws, and glass draws almost nothing (a rim, a 1% lens, a glow), so a resting checkbox
  has essentially no shadow. A box-shadow cast from the whole disc put a dark pool under every one.
- **The lens stack is back** (five 1%-white layers, inset, group-blurred) and the glow is
  `plus-lighter`. At video scale both are visible.
- **App inner shadows = inset box-shadow with spread r AND blur 2r** (the app strokes 2r round the
  edge and blurs by r). Spread 0 made troughs too shallow.
- **Type is SF Pro Text below 20pt and SF Pro Display from 20pt**, with Core Text's size tracking
  added by hand (Chrome applies none): the 16.4pt row label measures −0.05em total including the
  app's own −0.02em; the 22pt Live box +0.012em. `-apple-system` at video pixel sizes picks the
  Display cut and comes out ~7% too narrow. Both cuts are installed in /Library/Fonts. Global
  `-webkit-font-smoothing: antialiased` — iOS is grayscale-AA.
- Grip = three 1.5pt bars, 18.7pt wide, 4.1pt pitch, inkFaint (SF `line.3.horizontal`, redrawn).
  Row metrics are SkeuTaskRow's: 44pt touch square, 33.3 circle, 10.2 gap, 56.3 row, 58.9 pitch.
- **Open checkboxes are a plain SVG ring** (`CheckRing`: one perfectly round 1.8pt line,
  `#464B52` at 40%, nothing inside) — Lucas: the app's resting glass (a rim fading out toward the
  top + a faint lens) never read as a clean circle at video size; prominent glass was tried and
  rejected too. The E transition is then one ring whose colour and radius interpolate.
- **The finger is a plain half-transparent white disc** (no glass), placed by transform.
- **The wells were shrunk 20% (`PZ` 1.6 → 1.28, gap 48 → 38px, drag 140 → 112px)** to give the
  headline room; the two close-ups (typed name, "Go Live") zoom in by `CLOSE` = 2.6 × 1.6 / PZ so
  they are unchanged on screen. All three variants now sit wells-top 330–340px with `camY` = H/2.
- `LiveGlyph` is SVG: as a CSS-bordered div with a centred child the border snapped to whole
  pixels and the core did not, so the dot sat visibly off-centre at button size.
- The Live box is a **trough** (recessed, `refH 64, fillStop .26, shadeScale .65, fillLift .55`),
  not a raised card; the pill reads **"Go"** while typing, then **"Live"** with the accent glyph
  and the whole content pulsing (SkeuPulse); since 2026-10-04 ALL phone UI type is system (SF) —
  the tab labels and workspace pill used to be W95FA.
- *(History — W95FA has since left the film.)* **W95FA was rendered WITH antialiasing** (Lucas: "the pixel
  font isn't quite right"). It used to carry `WebkitFontSmoothing: 'none'`, which looks crisp at
  3× but at the video's ~1.15 px/pt rounds every font-pixel to 1 or 2 px, so "Personal" and the
  tab labels came out visibly bold and lumpy. iOS draws this face grayscale-antialiased like any
  other; with AA on, the Lab crop at 3× matches the simulator shot pixel for pixel and the
  video-scale crop matches a downscaled screenshot in weight. Same file as the app (md5-identical
  `W95FA.otf`), same ink (`220,229,245`).

**Story (v3):** "to.morrow" is typed where a task title sits — no caret (Lucas) — with the camera
close on it, no slide, and **no slat behind it at rest** — like every row it darkens only once
held (Lucas); the camera then leaves it in **one continuous move** (focus and log-scale
zoom on a single ease, `CAM_MOVE` 66–142) — an earlier pan-then-zoom read as two steps;
the row builds round the name (checkbox pops, the held-row slat grows out of the text, grip)
while the **Tomorrow well is cut into the page** (wells use the Live box's trough construction;
titles only, no date line). Tomorrow is ONE vertical list — to.morrow, Plan trip to Asia, Pay
semester fee, Call grandma, add — the rest rising in under it as the camera pulls back (an earlier
pass stacked the second task under the first like a card deck; Lucas: they are list rows, one
under the other). Only Tomorrow exists at first — **Today and Soon are cut in as the first task is
flicked at each**. **Two** flicks (to.morrow → Soon, i.e. to the RIGHT, then Plan trip to Asia →
Today — swapped 2026-10-04, Lucas; `M1`/`M2` in Promo.tsx. The Go Live close-up STAYS on the
left, in Today, now under Plan trip to Asia (`GL_WELL` = `M2.well`); a third, Pay
semester fee → Today, was cut 2026-10-04 and the gap between flicks shortened 85 → 68 frames —
every later timing is now relative to `M2.land`, so A/B/C run 618 frames, D 667, E 639). Each
flick goes first row → first row so a task only ever
travels on **one straight horizontal line** (no arc, no tilt — Lucas: "shouldn't hop"): the finger
pulls 140px on a cubic ease-in, lets go, and an **underdamped spring started at the release
velocity** (`bounce()`, response .55 / damping .62) carries it ~40px past its slot and back — the
"push/bounce into place". The destination list is shoved open on a livelier spring the moment the
task reaches it; the source list closes up on the layout spring; every list ends in an "add" row. Hard cut to a plain dark frame, "Never forget a task again."; hard cut to
two phones, each close-up **centring its phone** with the caption in the empty half beside it;
type "Bring passport", tap Go, the Live ring travels to the Lock Screen, it is ticked off there;
light floods out of the tick back to frame 0 (seam: mean pixel diff 0.06/255). Headlines and
captions are system type — Lucas does not want pixel type outside the app chrome.

- **Three naming variants (2026-10-03; A was kept, as E's base)** — one prop, three compositions
  (`TomorrowPromo` = A, `TomorrowPromoB`, `TomorrowPromoC`; `npx remotion render <id> …`):
  **A** the name inside each well; **B** the app's tab bar stretched under all three wells (one
  trough, a segment under each well, the glass pill on Tomorrow); **C** each well with its own
  small trough under it, like the Live tab's own trough in the app. B and C drop the in-well title
  and use shorter wells (`GEO` in Promo.tsx). The tab a task lands in swells (the app's
  SkeuLanding). Review copies: `~/Downloads/tomorrow-promo-{A,B,C}-….mp4`. Once one is chosen,
  delete the other two variants rather than keeping the switch.
- **A fourth composition, `TomorrowPromoD`, swaps the transition into the Live section**
  (`transition: 'golive'`, built on A): instead of the cut to "Never forget a task again.", the
  camera closes back in on Today's "add" row, a finger taps it, "go live" is typed as a new task,
  then everything but those two words fades to the Live section's dark ground (the words turn
  from light ink to dark-mode ink in place) and it cuts to the phones. "go live" stays up 48
  frames after it is typed, then ~1.4 s alone on dark (Lucas, twice), so D is **765 frames
  (25.5 s)**: the Live section
  runs on a clock offset by `GOLIVE_HOLD` (45) rather than having its own timings. `GOLIVE` in
  Promo.tsx holds the close-up's timings.
- **`TomorrowPromoE`** (`transition: 'golive2'`, built on A, 737 frames / 24.6 s) — the typed
  words become the button: "Go Live" is typed in Today's add row, the page goes dark around it,
  and at the cut the Live section opens with its camera so far in on the phone's Go Live pill
  that the pill's label lands on the exact pixels the typed words occupied (measured: within 1px;
  `camButton()` solves the camera from the label's position, `LABEL_W` = 55.7pt measured off SF
  Pro Text Medium). During the fade the words cross-fade into the label's own setting (medium,
  −0.03em) so the cut cannot be seen. Then the pill, glyph, screen and phone build round the
  label while the camera pulls back to the centred phone — solved AROUND THE LABEL (`camE`):
  log-scale zoom, and the label's screen position glides in a straight line. (Blending two cameras'
  focus points under a log zoom made the button swing sideways mid-move, and handing back to the
  Live section's camera while its clock sat mid-way through its own zoom-in jumped — both read as
  "a stutter"; the override now holds CAM_L until that camera reaches CAM_L itself.) The Live section's
  clock is held during that with the Live box still EMPTY (the pill is forced to its "Go Live"
  state meanwhile, `forceGo`) and resumes into typing "Bring passport" (Lucas). There is a 0.4 s
  beat between tapping the add row and the first letter of "Go Live". The new task's
  **checkbox does not fade with the page** (`CheckToLive`): its resting rim becomes the Live ring.
  In E the Go Live pill's glyph is the app's ring + dot (NOT glass — a glass knob was tried and
  rejected) at 28pt, its CENTRE placed exactly where the open box's centre sits relative to its
  title (32.2pt left of the text), so the transition ONLY shrinks the circle 33.3 → 28pt, never
  slides it (Lucas). Every circle — box rims and the ring — shares one line weight,
  `CIRCLE_LINE` = 1.8pt (the box rim was 0.95, the ring 2.55; Lucas wanted them unified). The dot
  pops in; ring AND dot breathe together (Lucas — a dot-only breath was tried and rejected), the
  large end always the mark's own size (breathing past it from a ramping envelope read as
  big-small-big; dark hold `E_CUT` = fade end + 74, ~2.5 s). **The breath never stops** (Lucas):
  `eBreath(f0)` runs on E's own frame clock and is handed to the pill's knob after the cut
  (`breathOv` → `knobBreath`) and on into the Live state, replacing `pulse(f - GO)` there, so
  nothing resets at the cut or at the tap. **The box's 33.3 → 28pt resize IS the first breath's
  way down** — one eased move from box to smallest (`E_BREATH.down` 39 frames), then an endless
  cosine with 26-frame halves (both 30% slower than the first pass, Lucas). Run as
  resize-then-breath, the resize stopped dead and the breath shrank it again, which Lucas saw as a
  shrink in two stages. Measured: the ring's radius falls monotonically to its minimum; across the
  cut radius/brightness are continuous (44.6/53 → 44.5/52) and the centroid holds to 0.2px.
- **Open checkboxes sit 3pt right of centre in their touch square** (`BOX_NUDGE` / `BOX_LEFT` in
  ui.tsx, Lucas): more air on their left, less before the title; row, title and wells unmoved.
  The E pill's ring follows INSIDE the pill — `KNOB.pad` +3, `KNOB.gap` −3 — so the pill's size,
  its label and `labelAnchor`/the camera are untouched. Re-measured across the cut afterwards:
  ring 0.1px, text 0.25px; `CUT_FIX` did not need refitting.
- **The opening checkbox is DRAWN on** (Lucas): `CheckRing`'s `draw` prop strokes the line
  clockwise from 12 o'clock over 20 frames (`checkDraw` on the logo row), round caps, instead of
  the old scale/fade pop. After the pill
  has formed, the button sits alone for `E_SETTLE` = 30 frames (1 s, Lucas) before the phone
  builds round it and the camera pulls back. E's close-up
  has **no push-in** (D keeps its 7% drift): the words stay dead still until the pull-back.
  "Go Live" is set like every task title (SF Pro Text Regular, −0.05em) — in the row, over the
  dark, AND as E's pill label (the app's pill label is medium; Lucas wanted one weight).
  **Measured across the cut: text ≤0.4px, ring ≤0.1px.** What it took — worth knowing before
  touching any of it:
  - **Layout offsets are rounded to whole CSS px BEFORE the camera transform magnifies them.** In
    the close-up 1 world px ≈ 3.25 screen px, and inside the phone 1 phone px ≈ 4.2 screen px — so
    `left/top` and flex positions jump in 3–4px steps on screen. Anything that must land precisely
    is placed by `transform` (never rounded): `CheckToLive` sits in ONE fixed-size box positioned
    by translate and only scales/redraws inside it (resizing the element each frame let its edges
    snap and the circle's centre wandered ±2px — the "jitter").
  - The pill's own layout can't be made exact that way, so its errors are measured off rendered
    frames and absorbed on the swipe side: `CUT_FIX` (text −0.31 / ring +0.52,+0.18 world px,
    applied by transform to the typed words, the words over the dark, and the ring), plus
    `LABEL_W` 52.9pt, a −0.36pt `KNOB.gap` trim and a −0.54pt label nudge in the pill. Re-measure
    with `out/cutcheck.sh` (or centroid-track frames cut−2…cut+4) after ANY change to the pill,
    the row metrics, `PZ` or `CLOSE`. "Go Live" is typed in the
  label's own setting (medium, −0.03em) so the fade to the light words is a pure colour change.
  The pill reads
  **"Go Live"** in every version from here on (Lucas) — the app's own code says "Go".
- Phone status bar is placed against the frame's measured notch (88–302pt wide, 30.5pt deep):
  time centred in the left ear, signal/Wi-Fi/battery in the right, centre line 22pt. The Lock
  Screen has no home-indicator bar (Lucas); torch and camera are filled glyphs on 50pt dark discs.
- Springs are the app's own, converted from SwiftUI response/damping:
  `k = (2π/response)²`, `c = 4π·damping/response` (press .26/.68, layout .40/.86, present .52/.84).
- **Nothing may animate via CSS transitions/keyframes** — Remotion renders frames independently,
  so every moving value is computed from the frame number in `Promo.tsx`.
- English copy only.

## Unify promo loop (`motion/src/unify/`, Remotion, 2026-10-04, second pass 2026-10-05)

A silent 53.8 s loop (1613 frames, 30 fps, **1920×1080, desktop only** — no vertical cut yet),
composition **`UnifyPromo`**, in the same Remotion project as the to.morrow film. Review master:
`motion/out/unify-promo.mp4`, copied over `~/Desktop/unify-promo.mp4` after every render (numbered
`-vN` copies only when Lucas asks for one).

**SHIPPED 2026-10-05 (Lucas: "ready to ship")** — it is the desktop hero of BOTH the live
`unify2d.html` and the draft `unify2d1.html` (the same `.unify-film` block, CSS and markup, in
each), and the Unify tile on `2D.html`. The heroes use the **tall cut** `UnifyPromoTall` (1920×1320: `UNIFY_EXT` = 240px of canvas above the frame;
every full-frame ground reaches up through `ExtTop`/`fullBg` in `lib.ts`, the cameras just see
more above). Web file `public/videos/unify/unify-promo-hero.mp4` (x264 crf 22, faststart, no
audio), poster `public/images/unify/promo-poster-hero.webp` (frame 0). On the page `.unify-film`
copies the to.morrow hero exactly: flush between the frame's borders, `object-fit: cover` +
bottom, `aspect-ratio: 1920/1276` from 861px (196px of band up under the nav), 16:9 with
nav-clearing padding at 641–860px; the blob hero is hidden there and the title follows the film.
**Phones get the VERTICAL cut** (2026-10-05, see below): the hero's second `<source>` (no
`media`, after the landscape one) is `unify-promo-mobile-hero.mp4`, shown at `aspect-ratio:
1080/1530` from the very top (390x553 at 390 wide, under the nav pill, like to.morrow's phone
hero); the blob hero is hidden at every width now, and a last-in-sheet 640px rule drops
`.hero-top`'s blob-sized min-height so the title sits right under the film. The landing tile
(`.unify-video-tile` on `2D.html`) is **3:2 like the to.morrow tile** (Lucas), at every width (no
vertical cut exists to give phones the to.morrow tile's 4:5), flat, no raised plate. It plays its
OWN cut, **`UnifyPromoTile`** (1620x1080) → `public/videos/unify/unify-promo-tile.mp4`, poster
`promo-poster-tile.webp` — not a crop: the 16:9 film's timetable captions run to x 1827, so a
centre crop (150px a side) cut them. The tile cut re-frames instead: the whole film at 0.9 about
the frame's middle (`TileCut` context; the cameras see a little more on every side, and every
full-frame ground overshoots the frame by `BLEED` = 160 in `lib.ts` to cover it — so must any new
one), the timetable scene eases 30px left with its slide (card and captions ~65px from either
edge), and during the room-number zoom the page alone moves 60px right so Emil's name stays in.
Its `<video>` is overscanned 1px past every edge (clipped by the tile): Safari painted the frame a
hair short of the fractional box and the element's dark background showed as a hairline along the
top and right over the pink/cream scenes. Below 640px the tile plays the vertical cut
(`unify-promo-mobile.mp4`) at 4:5, exactly like the to.morrow tile.

**Vertical cut — `UnifyPromoV` (`motion/src/unify/UnifyPromoV.tsx`), 1080x1350 (4:5), and
`UnifyPromoVTall` (+`UNIFY_EXT_V` = 180px on top, 1080x1530) for the phone hero.** Same story,
timings and scene components — every scene RE-FRAMED, not cropped (the standard advice for taking
landscape motion vertical, and what to.morrow's PromoV does): each scene still draws in the
landscape 1920x1080 stage coordinates, and a `Stage` offsets that stage so its subject sits
centred, a little below the middle, with `ExtTop` raised by the offset so full-frame grounds still
reach the top. Captions (`CaptionV`) are centred ABOVE the subject (they sat to its right); the
timetable gets a dark wash under its captions (the page runs on above the camera's point), its
landscape slide is undone so the card stays centred, its overview is shown 1.3x larger (`BOOST`,
easing back to the landscape camera over the first zoom — the chat blob's landing box scales with
it), and the page moves 80px right during the room-number zoom. The chat's flood has its own grid
for the tall frame (`ChatScene vertical`, 4x7 minus the column), the map its own framing
(`MAP_V`: pan path keeping "you" in shot, pull-out at 0.3 px/unit, burst starting where the
vertical customize puts the character, caption on two lines "locate your friends" / "on campus").
Hand-offs agree by construction: connect card → dive → customize character → burst all at frame
(540, 780); chat phone and the closing phone at (540, 675). The 3x opener is capped at 90% of the
frame's width (`ChatScene maxW`, the page's own min(3, width/bubble) rule) — at 3x it was 1131px
in a 1080 frame. The washes under the captions (dark on the timetable, cream on the map) are
solid only at the frame's very top and fade out by 420 / 540px, so the captions sit IN the fade
(Lucas: under the text darkened, more solid toward the top) and the timetable's wash is gone
before the overview card's days row. Each is a `Wash` {start, end, top, curve} in frame px
(`TT_WASH` in UnifyPromoV.tsx, `MAP_WASH_V` in MapScene.tsx), drawn by `washStops()` in lib.ts:
alpha `top` above `start`, then `top·(1−t)^curve` to 0 at `end`. Lucas's values from the tuner:
timetable {start 270, end 525, top 0.93, curve 0.85} (an even 0.93 under the caption), map {0, 540,
1, 0.7}. The timetable wash would reach the card's days row at the overview and at the days stop,
so it only fades in with the move to the course stop (`ttWash`, over ZOOM_COURSES) — before that
nothing runs up under the caption. The detail stops sit a tenth of the frame (135px, `TT_NUDGE`)
higher than the overview (Lucas: less gap between a caption and what it describes), easing up over
the first zoom. On the first appearance all three timetable sections fade in together with the
card (`blockT` = 1; they used to slide in one after another) — in every cut. **Tune them with `wash-tuner/`** (repo root — the Vite dev server serves it at
`/wash-tuner/`, the build never ships it): real frames of the vertical cut rendered with no wash
and no captions (`npx remotion still UnifyPromoV wash-tuner/f<N>.png --frame=<N>
--props='{"tune":true}'`, then JPEG), the same gradient and captions drawn live over them,
sliders per scene, and a "copy settings" line whose numbers drop straight into TT_WASH /
MAP_WASH_V.

**Every cut starts on the chat** (Lucas, 2026-10-05): `useFilmFrame()` maps the file's frame to
the film's `(f + FILM_START) % duration`, `FILM_START` = the opener just in (frame 26), so the
black-screen wake plays at the END of each file and loops straight into its start; T is
unchanged. The posters are that frame 0 (the opener on the phone); phones get the vertical cut's
own first frame as poster (`promo-poster-mobile.webp` / `-mobile-hero.webp`, swapped in by a
two-line script after each `<video>`), since the landscape one cover-cropped would cut the
bubble.

**Every new version goes onto all of them** (Lucas): render `UnifyPromo` (review copy),
`UnifyPromoTall`, `UnifyPromoTile`, `UnifyPromoV` and `UnifyPromoVTall`; re-encode the last four
(`unify-promo-hero.mp4`, `unify-promo-tile.mp4`, `unify-promo-mobile.mp4`,
`unify-promo-mobile-hero.mp4`); re-make all four posters from each file's frame 0 (`promo-poster-hero`, `-tile`, `-mobile`,
`-mobile-hero`).
**Then bump the `?v=` version on every one of those URLs** (the `<source>`s, `poster`s and the
phone-poster scripts in `2D.html`, `unify2d.html`, `unify2d1.html` — one regex). The files keep
their names, GitHub Pages serves them with `max-age=600`, and iOS Safari holds video longer than
that: without a new query the live phone page kept playing the previous cut after a deploy.

**Ground truth is the final pink app's own code, `~/TEMP/Unify/web/`** (static HTML/CSS/JS,
Nunito, `--pink #FF88C8 / --dark #292925 / --cream #F9F2EB`; design notes in
`~/TEMP/Unify/.claude/skills/unify.md`). Not `~/Documents/.../socialplan/` — that React app is the
rejected blue v1. Components are hand-ported with the app's own CSS numbers, in app px, and the
scenes scale them:
- `Timetable.tsx` — `SpCard` is the app's `.sp-card` 1:1 (diffed against a CDP screenshot of the
  real card: identical bar sub-pixel offsets; `UnifyLab` composition is that check).
  **`SharedTimetable` is what the film shows** (Lucas, 2026-10-05): no tab header, no week row —
  it starts at the day discs, with `DAYS_PAD` (8px) of air above them — and a **break** block ("break
  12:00-12:45", no room line, three of the home screen's friends on a break) between the courses and the
  socials, rounded, with a 16px gap either side. **The break is a COMPACT row, 30% shorter than a
  course** (Lucas: too much air above and below its friends, and too tall even closed): no room
  line, person boxes cut to their own figure + name (58px, not 81), 6/15px around the people row,
  and an always-explicit height (`BREAK_ROW` 64 + `COMPACT_GROW` 61 × expand) so `ttLayout` is exact
  — block 80px closed (was 114), 141 open (was 202). **The uni activity (the cream block) uses the
  same compact row** (Lucas), keeping its room line: `SOCIAL_ROW` 81, block 97 closed / 158 open. Movie Night shows the Socials tab's own
  19:00-21:30 (the timetable's back-to-back scheduler put it at 12:00, colliding with the break).
  **Every people row starts collapsed** (a plain 98px course) and only grows — 88px, then its
  friends bounce in — once the camera reaches that section, so no section shows empty space;
  `ttLayout(eCourse, eBreak, eSocial)` gives the heights, and the camera's keyframes are
  functions of the frame read off that live layout, so it stays on its section while sections
  above it grow. Each stop has its own caption ("all in one place" — Lucas, was "your week, day by
  day"; the camera leaves the days 40 frames after the Wednesday tap, no idle second / "see who's in your
  course" / "see who's on a break" / "add uni activities to your timetable" / "green means
  they're at uni" / "see your friends' timetables", `TT_CAPS`). Friends per row (Lucas): four in
  the course, three on the break, two at the uni activity (Book Club, the cream block). Camera keys carry an optional page-x too (default the card's centre
  line), and **a zoom segment interpolates about its more-zoomed end** — that end's screen offset
  travels in a straight line — so a push-in heads straight for its target; with equal scales it is
  a plain lerp, as before. The friends
  list fades in only as the camera heads for it. Friends rows expand via
  `grid-template-rows: <p>fr`, which gives p × the content height.
- `Connect.tsx` — the home card: closed bubble → open panel (the app's .9 s unfurl), the five
  friends on their `drift-*` keyframes as functions of time, the monster card for any friend.
  **No face/arrow lip** on the open panel, and the closed bubble is a plain 377×72 pill — the
  app's `card_bubble_pink.svg` carries the same lip, which showed during the unfurl (Lucas). The film no longer unfolds the card from the bubble at
  all: it fades up from 90% size, eased out. Friend boxes are laid out explicitly (name line box at Nunito's
  own 1.364em) so `friendFigure()` knows each figure's exact centre — the dive starts from it.
- `Character.tsx` + `chars.json` — the monsters as body path + eye group, extracted from
  `figur_1–7.svg` and `friend_monster_9.svg` (getBBox over CDP). `eyes=` fits ANOTHER character's
  eye group into this body's eye box; that is what "customize" cycles — a swap every `STEP` = 7.2
  frames (25% faster than the first cut's 9, Lucas), each swap rounded to a whole frame
  (`swapFrame`) so its pop spring starts at 0.
- `MapUI.tsx` — the map screen's own chrome from `map.html`/`map.css`, 1:1 in app px: the
  GF / 1.F / 2.F floor selector (1.F active), the collapsed bottom sheet (peeking eyes from
  `toggle_eyes_*.svg`, the Friends | Courses toggle with Courses active and the ribbed edge, the
  nav bar with the map pin filled). It rides on the ending phone's GLASS (`PhoneFrameClose`'s
  `screen` slot, clipped to the screen hole), so it scales in with the frame while the map
  behind keeps its size; meanwhile the floor glides up into the window the chrome leaves
  (`IN_PHONE_Y` in `MapScene.tsx`), and the caption's cream wash fades so the top room is not
  washed out inside the phone.
- `CampusMap.tsx` / `MapScene.tsx` — the 1.F plan from `map.html` (`#mapBg1FCourses`): walls as
  `public/unify/map_1f_walls.svg` (pink rects and `vector-effect` stripped, `#938E87`), the ten
  course rooms as separate pink divs UNDER the walls. **Eight characters, each placed where its
  whole marker (figure box + name) clears the walls** — found by rasterising the walls SVG,
  distance-transforming the free space and min-filtering the marker footprint over it (scipy);
  a room's feasible box can be tiny (the U's inner room: 10 plan units of vertical play). The map
  is shown **close (0.9 px/unit, markers 96×88) and panning** from the bottom-left up and across
  (eased in and out), then **pulls out to the whole floor** as the courses finish. Nothing sits
  in the far-right wing (the camera never gets there while the friends are up); a cream wash at
  the top keeps the caption readable over the map passing under it.
- `Chat.tsx` / `ChatScene.tsx` — the case-study page's Problem chat (same messages, same
  proportions), on the app's dark. **Even beats** (Lucas): a message every 48 frames, each staying
  three beats, so they arrive AND leave in the same increments (the page's height cap made the
  second message leave the moment the third arrived). Only six of the page's ten messages — the
  beats were doubled and the thread cut to keep the length. From the flood on nothing leaves; 21
  messages/screenshots are added around the column (never in its 3×3 grid cells), one after
  another over 72 frames. **Its seven screenshots are all different** — each a different
  student's different app, built in `motion/unify-tt-source.html` and captured over CDP at 2x
  into `public/unify/tt-flood-*.webp` (sizes in `Chat.tsx`'s `IMGS`).

Story: chat → flood around it → everything spirals into the centre, a pink blob puffs and morphs
into the timetable, landing centred, which then slides to the left third as its caption rises
→ the camera goes in: days (tap Tuesday, then Wednesday — the film's Wednesday is Ergonomics plus
the app's own Wednesday course CAD Modeling under it) → the camera scrolls DOWN to CAD Modeling
and only its friends bounce in (Lucas: the course-overlap beat must read apart from the day
switching, so it gets its own scroll) → the break (its friends bounce in) → a short stop on the
uni activity, the cream socials block ("add uni activities to your timetable", two friends
bounce in) → the friends list →
the camera pushes in on Emil's green room number ("green means they're at uni"), holds ~2 s,
pulls back out → Emil's timetable opens as before → "connect now" unfurls and slowly pushes in; tap Nam, tap outside; tap Yas, tap outside →
from the plain card the camera dives into Nam (the friends and text on the card ease out and
the card's own pink grows past the frame — no separate wipe shape) → "customize your
character", body or eyes swap every 7.2 frames → the others burst out from behind, land in their
rooms as the camera pulls out to the panning map → "locate your friends on campus" → they leave,
the rooms grow → "your" slides into "and your courses" → the camera
pulls out to the whole floor → a phone FRAME, six times too big, closes in round the map until it
is the opening phone exactly (the map keeps its size; outside the frame is the opening's dark),
the app's own map chrome on its glass (Lucas) → it holds 1.2 s as the app's map screen, the
sheet's eyes glancing about → its screen fades to black, and frame 0 wakes the black screen into the chat (seam: 0.04/255
mean diff to frame 0). Each day tapped in the timetable stays up twice as long as the first cut. Captions for the timetable ("your timetable, and
everyone's") and connect ("or view at a glance" — Lucas's wording, 2026-10-05; it was "who's free right
now") beats were added beyond the brief — cut freely.

Two things that will bite again:
- **Characters handed between scenes are placed by `transform`, never `left/top`** (`ScreenChar`,
  the map markers). Inside a card scaled ×1.45 and then zoomed ×6, half a px of layout rounding
  became a visible 4 px jump at the dive's hand-off. Measured after: centroid identical across
  both hand-offs (dive → customize, customize → burst).
- Nunito is a local OFL file (`public/unify/Nunito.ttf`, loaded in `Root.tsx` behind
  `delayRender`), so renders never depend on Google Fonts. Word widths for the map caption's
  "your" slide are Nunito 800 measured at 100 px in Chrome (in `MapScene.tsx`).

## to.morrow page (`public/to-shove2d.html`)

**The project is called `to.morrow`, not `morrow` (2026-09-08).** Every user-visible name
changed — the `<h1>`, `2D.html`'s landing tile, the Craft dropdown, the two neighbouring
project pages' prev/next titles, every `aria-label`, and the German copy in `glance-lead` and
`problem-4` (markup AND the `TRANSLATIONS` values). The asset folders moved with it:
`public/images/to.morrow/` and `public/videos/to.morrow/`. **The CSS class and keyframe names
did NOT change** (`.morrow-shove`, `.morrow-devices`, `.morrow-icon-tile` — the last since removed,
`@keyframes morrow-shove`; the shove itself was removed 2026-10-04) — a dot needs escaping in a
selector, and they are internal. The
rename was `perl -pi -e 's/\bmorrow\b(?!-)/to.morrow/g'`: the `(?!-)` is what spares those
class names, and `\b` is what spares the word "tomorrow".


The newest project page (the iOS app), German copy, built after the five older project
pages and therefore **not** covered by most of the layout-pattern notes above. Assets live
in `/public/images/morrow/`; it self-hosts W95FA (`/fonts/W95FA.otf`, SIL OFL — the
attribution in the caption under the icon block is a licence CONDITION, not a courtesy) and
carries a trimmed copy of the SkeuKit component CSS inline rather than linking it.

**Two scroll blocks, both TRIGGERED rather than scrubbed** (`.fan-scrolly` = the colour
screens, `.ic-scrolly` = the icon comparison). The scroll handler only picks a state and
writes a custom property — `--pe` 0 or 1 for the fan — and a CSS transition does the rest,
so the motion keeps running while the reader sits still.

**The fan is not pinned at any width (2026-09-07).** It used to be a tall spacer with a
sticky child (the kaffeemaschine turntable idiom) on desktop, opening and closing on where
the block's *centre* sat in the viewport — which needed the spacer, because a block near the
end of the page could not otherwise travel far enough to fold shut. Both are gone:
`.fan-scrolly` is now content-height, `.fan-sticky` is a plain centring wrapper (the name is
historical), and one test runs at every width — open once half the block has come up from
the bottom, fold once half of it has left past the top. Measured after the change: it opens
and closes correctly at 1440 and at 390, in both scroll directions, and still reaches the
fold-shut threshold before the document bottom (62px of margin at 1440, 31px at 390 — if a
lot of content below the fan is ever removed, re-check that).

**The icon block is a 2x2 STAGGER on desktop** (2026-09-07, from Lucas's sketch): copy left /
retro cluster right, then modern cluster left / copy right — the same rhythm as the
`.stagger-row` blocks earlier on the page, instead of the old single row of two clusters with
their captions somewhere else. It is a **grid**, not two flex rows, so the clusters share a
column axis and cannot drift out of line; cells are assigned explicitly
(`.ic-side--left` → 1/2, `.ic-copy--retro` → 1/1, `.ic-side--right` → 2/1,
`.ic-copy--modern` → 2/2) so the DOM order can stay cluster-then-its-copy, which is both the
screen-reader order and the phone stacking order. `--ic-w` is therefore sized against ONE
grid cell now (`clamp(240px, 34vw, 470px)`, ~500px cell at 1440), not against the pair.
**The phone layout restates `display: flex`** — the base rule is a grid, and the mobile
block's `flex-direction: column` would do nothing without it, and `.ic-copy--retro` takes
`order: -1` there so the section's heading leads the block instead of turning up under the
first cluster.

**The section's heading and copy live INSIDE the grid**, not stacked above it: `icons-title`
plus the first half of `icons-text` sit beside the retro cluster, the second half
(`icons-text-2`, a new key) beside the modern one. The paragraph was split at its own
sentence boundary and **no new claims were written** — it is the existing wording
rearranged, so the half describing the pixel set sits with the pixel set. The old
"Links … rechts …" phrasing had to go regardless: this layout puts retro top-right and
modern bottom-left, so it reads "Oben … darunter …" now.

**Each icon cluster is driven INDEPENDENTLY, by its own box** (2026-09-08). `.icons-compare`
carries two flags, `data-retro` and `data-modern`, and each is set from that side's own
geometry by one rule — the same rule for both, in `sideWantsOpen()`: **open while the
cluster's CENTRE is inside a window two thirds of the viewport tall**, widened 10% around its
own midpoint by `OPEN_SPAN = 1.10` (so 5% at each end) and slid **down the page** by
`OPEN_LATE = 0.12` of the viewport height (2026-09-08, Lucas: it opened a touch early and
folded a touch soon). Both ends move by that same amount, so the open window is exactly as
long as it was — the cluster simply has to travel further up before either end fires. The
centre coordinate counts DOWN from the viewport top as the reader scrolls, so **a later
trigger is a smaller threshold, i.e. a subtraction**. On a 900px window the open window is
now centre 822 → 162 (it was 933 → 267): a ~480px cluster opens with ~320px of itself on
screen instead of ~200px, and folds while its lower half is still up there to be seen.
Measured over a scroll sweep at 1440×900, both clusters are open together across ~200px of
scroll. **When measuring this over CDP, wait ~400ms after each `scrollTo`** — at 90ms the
state read lags the rect read and every threshold looks ~370px late. Centre, not top edge: a cluster is ~480px tall, so a
top-edge test fires while it still fills the screen. The stagger between the two is
**geometric** — modern sits ~490px below retro and so reaches every threshold later — and
there is no `transition-delay` anywhere.

**That replaced a shared state (`data-ic` 0/1/2/3) plus a 450ms delay on the modern half,
and the coupling is what broke it:** the shared close fired on whichever cluster hit the top
third first (always retro, being above), and **a delayed transition whose state is pulled
back before the delay elapses never starts at all** — so the modern cluster silently skipped
its opening. If a stagger is ever wanted again, offset the *trigger*, not the transition.
Gone with it: the `--push` sideways shove of the closed side (meaningful side by side,
meaningless in the 2x2 stagger). Clicking a label toggles **its own half only** and locks it
until that side scrolls out of its own window (`retroLock` / `modernLock`).

**The caption beside each cluster is STATIC (2026-09-08).** It used to sit inboard while its
cluster was closed and travel back out as it opened. Per Lucas the text should simply stand
still and only the bubbles should open, so it is parked at **half** the old
`--ic-copy-shift` — the midpoint of the travel it used to make — with no transition and no
`will-change`. Still zeroed below 640px, where the caption is under its cluster.

**The modern half sits 120px closer to the retro one** (2026-09-08, `--ic-row-pull: 120px` on
`.icons-compare`). It cannot come out of `row-gap` — that is ~20px at 1440 and there is no
negative gap.

**A negative margin on the inside edge of each row was tried first and is the wrong tool
here.** It moved the CLUSTERS by 40px but the CAPTIONS by only 20: the copy is centred in its
row area (`align-items: center`), so shrinking a row by 20 moves its own copy up by 10, and
the two rows' errors partly cancel. Lucas reported the gap as unchanged, which it nearly was
where he was looking. **Negative margins and centre alignment do not compose — do not go back
to them.**

What works is a **relative offset**: `position: relative; top: -40px` on `.ic-side--right`
and `.ic-copy--modern`. It moves them visually and changes no layout, so both travel by
exactly the number written and the retro half cannot shift by a fraction of it. `.ic-side` is
already `position: relative` for its orbit, which is `inset: 0` against the padding box and
rides along. `.icons-compare` then gives back the 40px it no longer uses with
`margin-bottom: calc(var(--ic-row-pull) * -1)`, or everything below would sit 40px further
from the modern half than it does now. Measured at 1440: retro bubble and caption unmoved at
6488 / 6459, modern bubble and caption both up exactly 40 (6978 → 6938, 6998 → 6958).

**A cluster only ever grows outward from its own centre**, and two separate things had to be
fixed to make that true. `.icons-compare` was **shrink-to-fit** (a grid with `width: auto`
inside the centring flex box `.ic-sticky`), so an opening cluster made the whole block wider
and re-centred it; and its tracks were a bare `1fr 1fr`, which floors at the track's AUTO
minimum, so once a cluster was wider than half the block the two columns stopped being equal.
Now `width: 100%` and `minmax(0, 1fr) minmax(0, 1fr)`. Measured at 1440 before the fix, each
cluster's centre travelled 50px outward and the retro caption 100px; after it, cluster centres
and caption positions are **identical** in the open and closed states at 1440 / 900 / 390. On
a phone both clusters are `align-self: center` with no margin — they used to hang off opposite
edges, which is the same sideways push in a column.


**One easing system for the whole block, symmetric in and out, no ease-out anywhere, and
ONE speed in both directions.** The sides and their orbits run **900ms
`cubic-bezier(.65, 0, .35, 1)` opening and closing alike** (2026-09-08). The fold used to
take 1300ms on a gentler easeInOutSine, on the theory that the return happens while the
reader is already scrolling away — per Lucas it simply read as slow next to the opening, so
it was sped up to match. The hover swell on the icons and the labels is in the same family.
The old `cubic-bezier(.2, .8, .3, 1)` threw everything open at full speed and let it drift
into place, which is what read as a bounce.

**A transition uses the properties of the state it moves INTO**, so the pair lives on the
base (closed) rules — `.icons-compare .ic-side` and `.ic-orbitwrap` — and the
`[data-retro]` / `[data-modern]` rules **no longer restate it at all**; they carry only the
open geometry. If the two directions are ever split again, set them with **longhands**
(`transition-duration` / `-timing-function`), never the `transition` shorthand, which resets
`transition-delay` and the property list from higher specificity.

The captions do not animate any more — see the static-caption note above.

**On a phone the two halves are a single INTERLEAVED column** (2026-09-08, superseding the
beside-the-cluster layout that briefly ran at this width): heading, retro cluster, its text,
modern cluster, its text. The heading lives INSIDE `.ic-copy--retro`, so that wrapper is
dissolved with `display: contents` and all five items carry an explicit `order` — the
default 0 would tie them and DOM order puts both clusters ahead of their text. The clusters
alternate edges instead of centring (`align-self: flex-end` / `flex-start`), which is the
desktop stagger read down one column, and they are **60% bigger**: `--ic-w:
clamp(192px, 67.2vw, 304px)` **and** `--z: 1.368` (0.855 x 1.6) — `--ic-w` sizes the frame
and the orbit radius while `--z` sizes the bubble and the icons, so scaling one without the
other spreads the icons apart without growing them. `--ic-row-pull` is zeroed here: it lifts
the modern half into the retro half's ROW on desktop, and in a column it just drags it up
into the paragraph above. The caption's inboard travel is off again (nothing to travel
toward when the text is above or below its cluster).

**`--ic-w` is `clamp(240px, 34vw, 470px)` on desktop** — sized against one grid cell of the
2x2, not against a side-by-side pair. Verified over CDP at 1440 and 390: each half opens and closes on
its own centre, both are open together through the overlap, the click toggles each half
alone, and no horizontal overflow at either width.

**The fan's geometry is data, not code.** Each card is a `<span class="color-slot">` (holds
the fan transform) wrapping an `<img class="color-card">` (holds the idle sway) — two
elements because one element cannot carry two competing transforms. Desktop reads five
inline variables per card (`--slot --rot --sc --dy --lag`); **mobile has its own layout and
its own variables** (`--m-x --m-y --m-rot --m-sc`, distances in multiples of `--card-w`,
assigned per `:nth-child` in the ≤640px block) plus `--m-x0`/`--m-y0` for where the closed
stack sits. Mobile deliberately uses *different* variable names rather than `!important`
overrides: the desktop values are inline styles, which a stylesheet can only beat with
`!important`, and a second transform rule reading different names is cleaner.

Mobile (2026-09-07) is the scattered five-phone cluster from Lucas's reference, not a wide
row: one large centre card with four around it, `--card-w: min(36.4vw, 168px)`, the group
96vw across and 4.26 card-widths tall. **The fifth card is a decorative repeat** of an
existing theme (`.color-slot--extra`, `aria-hidden`, empty `alt`) — `display: none` above
640px, so the desktop fan is still the four themes the `aria-label` names.

**Hero: the promo loop (2026-10-04).** `.morrow-devices` holds one `<video class="hero-promo">`
(autoplay, muted, loop, playsinline, poster = the loop's first frame) of the TALL cut,
`/videos/to.morrow/tomorrow-promo-hero.mp4` (1920×1320: the film plus 240px of empty canvas on
top — see "to.morrow promo loop" above). It replaced the app icon that shoved across the column,
and **the title's shove went with it**: `.morrow-shove`, `@keyframes morrow-shove`, the
`--shove-x`/icon-width script, `.app-icon` / `.app-icon-dark` / `@keyframes icon-fade` and their
reduced-motion lines are all deleted; the title is a plain `.title-row` like every other project
page. **Flush and full frame** (Lucas — a rounded, raised card was tried first and rejected): no
horizontal padding, edge to edge between the page-wrapper's border lines (111 → 1329 at 1440) and
of the screen below 860px. Always `object-fit: cover; object-position: 50% 100%` — every width
shows the file's bottom edge and picks how much band and side by the BOX's shape:
- **≥861px**: `aspect-ratio: 1920/1276`, `padding-top: 0` — the video starts at the card's top
  border and 196px of band sit under the nav (box wider than the file → cover crops the top 44
  rows). The film itself only rose ~25px at 1440.
- **641–860px**: `16/9` with the old nav-clearing top padding — exactly the plain film.
- **≤640px**: a different file — the VERTICAL tall cut (`tomorrow-promo-mobile-hero.mp4`, see
  "Vertical cut" above) at its own shape, `aspect-ratio: 1080/1530`, `padding-top: 0`. (Before the
  vertical cut existed, phones got the landscape tall cut with 10% cropped off each side.)
**Still not a `.hero`**: the nav must keep its raised shadow from the first frame. Playback is
handed to the page's play-while-on-screen observer. Verified over CDP at 1440 (1218×809 from y=13)
and 390 touch (390×335 from y=1): playing, looping, no overflow, no console errors.

**The page's accent is NOT orange** (Lucas, 2026-10-04): `--accent-orange` is redefined on this
page to **`#7A92B0`**, a mid-light greyish blue in the family of the app's Slate accents
(`#3F5670` / `#526D8C`) — step badges, meta labels, the glance dots, the scroll dots, the mobile
menu's selected 2D/3D segment (whose inset shadow pair was re-derived from the blue, as it had been
from the orange). The token keeps its site-wide name so every rule follows; the nav iframe is a
separate document and is untouched.

**The landing tile on `2D.html` is the same loop** (the 16:9 cut, `tomorrow-promo.mp4`), replacing
the app icon there too: `.project-tile.morrow-video-tile`, **flat** (Lucas: no raised plate —
`box-shadow: none`; the other tiles' 16px corners stay), the `<video>` absolutely filling it with
`object-fit: cover`. The film is 16:9 and the tiles are 680/560, which would cut ~16% a side and
clip the outer wells and the Live caption, so this tile is **3:2** (~8% a side — nothing the loop
shows sits in that margin: wells at 14–86% of the width, captions from 15%) and a little shorter
than its neighbours (334 vs 413px at 1440). Below 640px it plays the VERTICAL cut
(`tomorrow-promo-mobile.mp4`) at exactly **4/5**, restated in that file's last 640px block because
the base rule is (0,2,0). With that,
`.app-icon` / `.morrow-icon-tile` / `icon-swap` are gone site-wide (their two dark-mode selectors
in `dark-mobile.css` too), and `/images/to.morrow/app-icon-light|dark.webp` are **orphaned on
disk**. `/images/morrow/screen1–3.webp` were already orphaned.

**App Store badges.** The **icon beside the App Store badge at the foot of the page is gone** —
so `.appstore-row` is the badge alone. A **second copy of the badge sits above At a
Glance**, docked left by `.appstore-row--top` so it lines up with the heading instead of
centring, and scaled to **72% of the foot badge** by overriding `--appstore-h` (the token is
declared on `.appstore-row`, so the smaller one is `calc(<the same clamp> * 0.72)` and the
two cannot drift apart; it started at 0.6 and went back up 20%). **Both badges pulsate** —
`badge-pulse`, a 2.6s scale to 1.04 and back. It sits on the `<img class="appstore-badge">`,
NOT on the `<a>`: the link owns a `:hover` transform, and an animation on the same element
outranks it and suppresses its transition in Safari (the `animation`-vs-`:hover` trap in
"Known Patterns & Gotchas"). Turned off under `prefers-reduced-motion`.

**The gap between the hero and the title is `.header-section`**, a class on the header
`.section` — `padding-top: clamp(10px, 1.4vw, 20px)`, about a third of `.section`'s own
padding, because this block follows a picture of the thing the title names rather than a
divider. It is **restated inside the LAST `@media (max-width: 640px)` block**, the one
holding `.section { padding: 32px 20px }`: an earlier mobile block sets `.section` padding
too, and the first attempt at this override sat before that later rule and lost on source
order — measured 32px where it had asked for 10. Same trap as the one below.

**No breadcrumb on this page** (dropped 2026-09-07), unlike the other five project pages:
with the hero directly above it, the `PORTFOLIO / PROJEKTE / MORROW` trail sat between the
hero and the title and held the two apart. The element, its `.breadcrumb` rules and both
`breadcrumb` translation keys are gone.

**"Drei Formen" (`.dna-row`) is a centred column: heading, copy, then the three demos in a
ROW under it** (2026-09-07; it was copy-left / three-demos-stacked-right before). Source
order is the visual order — the demos sat between heading and copy via `order` for one round
and that was dropped again, so text-above-media now matches the Farbe block below it. The
block is
`width: min(700px, 100%); margin-inline: auto` — deliberately narrower than the content
column, and the copy and the demo row share the same two edges because they are siblings in
it. It started at 820 with the controls at 75% of their stage, which left the demos visibly
narrower than the text; they met in the middle instead — the block came in to 700, the
controls went to **100%** of their stage, and every demo scales up by **1.18** to match that
same ratio so they grow in proportion rather than stretching. That scale is why the stages
carry TWO variables: `--z0` is the authored size (inline, per stage) and `--z` is what the
SkeuKit metrics read (`calc(var(--z0) * 1.18)` in the row layout, plain `var(--z0)` again
below 640px, where the stack is vertical and each demo already has the column to itself).
Gap between the three is `clamp(8px, 1.1vw, 16px)` — it was wider than the gaps inside the
controls before. **Desktop adds 20px of air on each side of the middle demo** by taking it
out of the two OUTER controls' width (`width: calc(100% - 20px)`) and docking them outward
(`justify-items: start` / `end`), so all of it lands in the two gaps rather than half of it
leaking to the block's edges; the row, the heights and the type are untouched. Those rules
sit in a `@media (min-width: 641px)` block so they cannot reach the phone row.

**The three demos stand side by side on a phone too** (2026-09-08). They stacked before, on
the arithmetic that a third of 350px is ~110px. What makes three fit is that these controls
are mostly padding, and **the padding is now the only thing that shrinks** — height, type
size and the authored `--z` are all untouched. `--seg-pad` (the segmented trough's inset),
`--opt-pad-x` (its options' horizontal padding) and `--ws-pad-x` / `--ws-gap` (the pill's)
exist for exactly this; **`.dna-segpill`'s own geometry is written against `--seg-pad`**, so
the sliding pill follows the slimmer trough without a second edit. Phone values: 3px / 1px /
7px / 5px, against 8.2 / 7.6 / 22 / 10.

**The middle demo is the app's live control, not a workspace pill** (2026-09-08): the
ring-and-core mark (`.dna-ws__mark`, the same construction as `.live__mark` — a stroked
circle with a core at 42% of its diameter) plus the label **"Off air"**, measured off a frame
of `live-pair.mp4` where the app draws exactly that inside one glass pill. It was
"Personal". The middle demo's `--z0` is **1.001, the same as the segmented control on
its right**, so both troughs are 60px: at 1.229 it matched the seg's height *including*
`.sk-trough__bloom`, the outer bevel that sits ~6px proud top and bottom — shading, not
control, so it does not count. `.dna-row`
had to be **removed from the ≤860px rule** that flips the
stagger rows back to `flex-direction: row` — it is a column at every width now. Below 640px
the demos go back to a vertical stack (three across a phone column would be ~100px each),
which also restores the definite width to `.dna-stack`. **The definite-width chain is
load-bearing either way**: in the row layout the stages are `flex: 1 1 0` — basis ZERO, not
auto — so each resolves from `.dna-stack`'s definite width and the troughs' percentage
widths have something to size against; with `auto` the chain is circular and the troughs
silently collapse.

**The three primitives are ordered trough / raised button / segmented trough** (2026-09-08).
The small `.dna-ws` button led the row before, which stepped the block up in size from left to
right; in the middle the row reads balanced, and because source order IS the visual order at
every width, that one swap also puts the small one in the middle of the phone stack.
**Below 640px the demos sit BETWEEN the two paragraphs** rather than after both: `.dna-body`
becomes `display: contents` so its two `<p>`s are direct children of `.dna-row`'s flex column,
and all four items then need an explicit `order` (1/2/3/4) — the default 0 would tie the
heading and the stack. The gap between the paragraphs becomes `.dna-row`'s own 18px.

**Lesson from the removed title shove, still worth keeping:** a POSITIVE `animation-delay` on
an animation whose keyframes start with a hold is invisible (a hold looks like a wait) — a
NEGATIVE delay is how you start such a loop part-way in. And during a positive delay the element
renders in its own **base style, not the first keyframe**, which flashed the hidden dark icon
for 0.7s. **Rule: any animation with a POSITIVE `delay` needs `backwards` unless its 0%
keyframe is already the element's resting style.**

**`live-pair.mp4` loops SHORT of its own end** (`data-loop-end="13.3"`, 2026-09-11). The clip is
14s and ends with **both phones dimming out**, the way a screen recording does when the display
sleeps — so looping the whole thing flashed a dark frame at the seam, which is what read as
"the beginning and the end look slightly different".

Measured frame by frame: the right phone holds a mean luminance of **212.1 to 13.50s**, steps to
202.2 at **13.55**, then falls off a cliff (172 at 13.70, 72 by 13.90); the left follows from
13.70. **Nothing else is wrong with the clip** — the lock screen is pixel-identical to its own
first frame from **11.4s** onward (0.07% of sampled pixels differ inside the notification band,
0.02% outside), and the notification appears at **4.9s** and is gone by **11.15s**. So "appears,
then disappears, and the rest of the time looks the same" is already what the footage does.

**An overlay patch was NOT needed and would not have worked.** The idea on the table was to
cover the notification with a background-coloured rectangle during the frames that should not
show it — but the frames that should not show it already exist and are already clean; the
defect was the whole screen dimming, which no rectangle over the notification can hide.

The wrap is a generic `video[data-loop-end]` handler at the bottom of the file, driven by
**`requestVideoFrameCallback`** (per-frame, Safari included) with a `timeupdate` fallback. **13.3
rather than 13.5** because `timeupdate` fires only ~4×/s, so the fallback path can overshoot by
250ms and must not land in the fade. It only seeks a video that is actually playing — a seek on
one the IntersectionObserver has paused off screen would restart it. **`loop` stays on the
element** as the no-JS fallback. Verified in Chrome: `maxTime 13.286`, one wrap, no JS errors.

**Phone frames: the recording sits UNDER a transparent frame image** (2026-09-14, asset replaced same
day). All four clips were exported with the phone mockup and the light page grey `rgb(219,220,227)`
baked in — invisible on the light page, a pale box on dark, and impossible to clip exactly because the
bezel edge in the video is compressed and anti-aliased against that grey. So the frame is its own asset,
`/images/to.morrow/phone-frame.png` (792×1600): metal rim, black border and notch opaque; screen and
surroundings transparent.

**The first version of that asset (median of nine of Lucas's own recording frames, edge alpha
un-mixed from the grey) left a hairline gap on-device** — not reproducible headless, so it went
unnoticed until Lucas saw it on his phone. Replaced with a real transparent iPhone-12 mockup already in
his own asset library (`mockup-apple-iphone-12-pro-transparent.png`, 396×800), upscaled 2× with Lanczos
to match.

**The video crop and the frame image are two independent measurements, and conflating them broke
this once already.** The frame's own screen-hole geometry (measured off its alpha channel: x 44–746,
y 120–1484, corner radius 76 at 792×1600 — short of where the notch cuts a further-up "ear" on each
side) has nothing to do with where the VIDEO's own baked-in content sits, because the two are
unrelated assets that merely need to agree approximately. Recomputing the video's `clip-path` from
the frame's numbers (tried first) shrank the visible window well inside the video's real content —
empty grey bars appeared above/below the app UI, on-device only, not reproducible headless. The
correct source is the VIDEO: decode a frame, find the dark-navy bezel band the recording already has
baked in (vs. the light screen content), per row/column. That measurement is unchanged from before
this session and is **independent of which frame PNG sits on top** — see the numbers below.

Each video is wrapped in `.phone-shot`, a one-cell grid holding the `<video>` and the frame `<img>` in
the same cell, so they size identically from the existing rules with no absolute positioning (the
mobile `.stagger-figure.phone video` rule now also names `.phone-frame`). The video is **clipped to a
rounded rectangle that lies INSIDE the frame's black border** — 14px outside the screen on every
side, which leaves at least 20px of solid frame on either side of the cut — so the cut is always
hidden under the frame and its precision no longer matters. Measured on the 792x1600 video content:
screen x 43-748, y 37-1562, corner radius 87. Clip = that box grown 14px, radius 101 →
`clip-path: inset(1.4375% 3.662% round 12.753% / 6.3125%)`.
`live-pair.mp4` stays ONE file (the lock screen must not drift from the app): two frames at `48.411%`
width docked to either edge (right phone is 844px over in the 1636px file), video masked to the two
inner rects with an SVG `mask` — **that mask's own rect coordinates were not re-derived for the new
asset** (still the original hand-measured ones) and were only checked visually, not pixel-measured;
revisit if a gap is ever reported there specifically. The frame ignores the pointer, so tap-to-restart
and the press swell — which targets the video's parent, now `.phone-shot` — still work, and scale frame
and video together. The video files are untouched. Verified at 390/1440, light/dark: no visible seam at
either top corner or the left button edge, where the old asset's gap showed.

**Videos play only while on screen** (2026-09-08). One `IntersectionObserver` at the bottom of
the file turns `video.autoplay` **off**, pauses everything once, then plays/pauses on
visibility (`rootMargin: '10% 0px'`). The `autoplay` ATTRIBUTE stays in the markup on purpose
— it is the no-JS fallback, and the observer only overrides it where it exists. `play()`
rejects if the element is paused again before the promise settles (scrolling quickly past),
hence the empty catch.


**Mobile can have its own, shorter copy: a `'<key>@m'` twin (2026-09-08).** `applyLang` on
this page runs every key through `pick()`, which prefers `key + '@m'` below 640px and falls
back to the desktop value when there is no twin — so adding one is a single line and most
keys have none. Two variants for forty characters is not worth keeping in sync; only the
eight longest blocks carry one (`glance-lead`, `problem-2`, `f1-text`, `f2b-text`, `f3-text`,
`pivot-1`, `dna-forms`, `conclusion-4`), in both languages. **The `matchMedia` listener that
re-applies on a breakpoint change is load-bearing** — without it a rotated phone keeps the
variant it loaded with until the language is switched. This is the only page with the
mechanism; the other five have the plain two-line `applyLang`.

**All copy was rewritten 2026-09-08 to Lucas's brief.** Voice is "ich" for decisions and "du"
for what the app does; blocks run 174–345 characters (they were 201–515). `<b class="kw">`
keywords are used like every other page — and note what that actually does: **`b.kw` is inert
on desktop** (`font-weight: inherit; color: inherit`) and only turns to darker grey ink
`#4a4a52` below 640px, so it is a mobile skim aid, not a visible desktop highlight.
`.glance-lead` deliberately carries none, on every page. Two structural changes came with the
rewrite: `pivot-3` (cutting Windows 95 for SkeuKit, so the TestFlight paragraph can stand on
its own) and `conclusion-4` (the outlook, so the three learnings each get a paragraph). The
old `problem-3` "n=1" disclaimer is gone — the honesty moved to the TestFlight paragraph.

**Two small mobile rules that are easy to lose:** `.centered-note` (the "Verschieben statt
verwalten" block) is `text-align: left` below 640px — centred text under a left-docked
heading has no edge to line up with in a 350px column — and on `2D.html` the to.morrow tile
is the promo video at 16/10, restated **in the last 640px block of that file** (see "Hero: the
promo loop" above; it used to be the app icon at `width: 202px`).

**A closing "Fazit und Ausblick" section** sits between the colour screens and the App Store
badge (2026-09-07): three paragraphs at the section's own full width (**no `.media-copy`** —
they line up with the heading and its divider rather than being inset 84.5%),
`section-conclusion` / `conclusion-1..3` in `TRANSLATIONS`, and **step badge 4** (after
Problem / App / Design-Prozess). It went in badgeless first, on the stylesheet's reflection
convention; per Lucas the orange circle belongs beside every heading on this page. The copy is a first
draft written to Lucas's brief (reflection on the pivot and on cutting scope, then widgets
first and a desktop version after) and is his to rewrite.

**The Live mark on a phone** (the CSS-built Live button under "Die App") is `--n: 71` in the
≤640px block, 25% up from 57, with 70px of air above it and under its paragraph (also 25%
up, from 56). `--n` must stay a bare **number**: as a length the factors derived from it
become px², which is invalid, and the whole layer vanishes with no error. The gap under the
text is set with a sibling selector (`.stagger-figure:not(.phone):not(.duo) + .stagger-body`)
rather than `:has()`, and lives in the LAST mobile block that touches `.stagger-figure` so
nothing later overrides it.

Two traps this page has already sprung, both also in "Known Patterns & Gotchas": source
**order beats specificity** — the file has several `@media (max-width: 640px)` blocks at
different points, so a mobile rule of equal specificity placed before the base rule loses
silently; and `.color-fan` measures **0 wide** because it is a flex item whose children are
all absolutely positioned. That is harmless here (everything positions from `left: 50%`,
and the flex centring still puts that at the container centre) but do not measure the group
off it.

## Dark mode — mobile only (2026-09-14)

**Palette "Slate"** (`#1C1C22`, the literal inversion of `#DCDCE3`, keeping its blue-violet
cast), picked by Lucas from six candidates. Text `#E8E8E9` / `#99999C`, border `#404045`. The
neumorphic pair is DERIVED from the surface: shadow = surface × 0.42 → `rgb(12,12,14)`,
highlight = surface mixed 10% to white → `rgb(51,51,56)` at ~0.5 alpha. **Do not reuse the light
theme's pure-white highlight on a dark surface** — it reads as a glowing halo, not a raised edge.

**Scope: `(max-width: 640px)` only, on the 8 2D pages + the nav iframe + the landing hero blob.**
Everything lives in `public/theme/dark-mobile.css` and `public/theme/theme.js` — shared files,
not the usual copy-the-block convention, because it is one palette across nine documents.
A desktop window, or a phone rotated past 640px, renders light even with dark stored. `index.html`
and the 3D overlays are untouched.

- **Switching:** an inline one-liner right after `<meta charset>` in every page sets
  `<html data-theme="dark">` from `localStorage.theme` **before first paint**; the CSS `<link>` and
  `theme.js` (`defer`) sit at the end of `<head>`, AFTER each page's `<style>`, and every dark
  selector carries one extra attribute, so it wins on specificity and source order both.
- **Toggle:** the burger menu's `.mobile-theme-toggle`, directly under the language toggle, built
  from the same `.mobile-view-toggle` / `.mobile-mode-btn` classes with `data-theme-choice`
  (`light`/`dark`). **The segments are 13×13 pixel-art glyphs (outline sun / filled moon), not
  text** — inline SVG `rect`s with `shape-rendering: crispEdges`, sized to **exactly 26px** (2px per
  cell; a fractional cell size rounds some rows fat and some thin), with `4.6px` vertical margins so
  the track stays the language toggle's height (both measure 67.19px). They carry **no `data-i18n`**
  — that writes `textContent` and would wipe the SVG — so `theme.js` sets the `aria-label`
  (Hell/Dunkel, Light/Dark) from `localStorage.lang` and on every `lang-change` message. The dark "selected well" rule is `:not([data-mode])` so it cannot
  take the orange off the 2D/3D toggle it ties with.
- **Iframes follow on their own:** `theme.js` posts `theme-change` to every iframe. The nav links the
  same CSS and has a listener. **The hero blob (`blob_morph_bouncy.html`) must NOT use its own media
  query** — the frame is a few hundred px wide even on desktop, so `(max-width: 640px)` would match
  there; it asks the PARENT instead (`parent` has `data-theme="dark"` AND
  `parent.matchMedia('(max-width: 640px)')`) and sets `data-theme-dark` on itself.
- **No `color-scheme: dark` anywhere, deliberately.** When an iframe document's colour scheme
  differs from its `<iframe>` element's in the parent, browsers paint an OPAQUE backdrop behind
  the frame — the transparent nav bar would turn into a solid strip.
- **Literal-colour rules that needed their own override** (everything else follows the tokens):
  menu text `#555`, the menu/lang/tag/pill-seg inset wells, about/contact neumorphic rows
  (including their stuck-on-touch `:hover`), `b.kw` (darkens on light → lightens on dark), the
  spec-list hairline, mac-lamp gallery dots, the Cybercoffee click veil, the LM logo PNG
  (`invert(1)`), the Unify `#1A1A1A` swatch (hairline so it does not vanish), and two SkeuKit
  pieces on to.morrow. **SkeuKit exhibits keep their own light material** (scoped tokens on `.sk`)
  and read as light app UI on the dark page; the two that are pure translucent glass — the
  Drei Formen "Off air" lip and the icon-cluster rounds — had borrowed the light page as their base
  and became dark holes, so they get an opaque `var(--material)` base like the retro/modern labels.
- **to.morrow's screen recordings are framed by a separate image, not by the video** — see
  "Phone frames" in the to.morrow section. Nothing theme-specific is needed for them any more.
- **Sticky `:hover` on touch:** the nav's `.logo` / `.pill` / `.hamburger` hover lifts use a
  literal white highlight, and a phone keeps `:hover` on the last-tapped element — so after opening
  the menu the hamburger glowed as if lit. Overridden with the Slate pair (reported by Lucas on
  device; the same trap applies to any future hover lift).
- Verified over CDP at 390 with touch emulation: all 9 pages paint `rgb(28,28,34)` with the nav
  dark and no JS errors; tap Dunkel → page, nav and blob all flip and `localStorage.theme` is
  `dark`; tap Hell → all back and the key is removed; reload keeps it; **1440 desktop control with
  dark stored stays light** (`rgb(220,220,227)`, blob light).
- **The 3D view is dark too (2026-09-14).** `index.html` has the same pre-paint head script, links
  `dark-mobile.css` + `theme.js`, and carries the sun/moon toggle under its language toggle.
  `dark-mobile.css` darkens the frosted joystick and the overlay veils; `#help-fab` is built
  from tokens and follows on its own. **The overlay pages (`about3d`, `contact3d`, `craft3d`,
  `controls_open3d`, `controls_fullscreen3d`) cannot use a width query** — they are ~330px
  frames — so `/theme/overlay-theme.js` (sync, in their `<head>`) asks the PARENT: dark only while
  `index.html` is `data-theme="dark"` AND the parent matches `(max-width: 640px)`. It sets
  `<html data-theme-dark>`, which `/theme/dark-3d-overlays.css` keys on with no media query; it
  re-syncs on `theme-change`, `storage` and the parent's 640px `change`.
- **Burger menu pills are 43px on every page, 2D and 3D alike** (80% of the 3D menu's old 54px;
  the 2D menus were 67px because their body line-height is 1.6). `/theme/mobile-menu.css`, linked
  after `dark-mobile.css` on all 10 menu pages, pins the text box to 22px: nav button 10.5+22+10.5,
  toggle 5 track + 5.5+22+5.5 + 5, sun/moon glyph `margin: -2px auto`. Change the height there,
  not in the pages.
- `2D.html`'s Virtual Cooking tile has an inline `box-shadow: none` (desktop's cut-out render);
  its mobile kitchen photo gets `--shadow-raised` in the file's last 640px block, like every tile.
- **The Cybercoffee landing tile has a real SECOND recording for dark mode**, not a filter — a
  brightness/invert trick on the light clip would also hit the physical machine body, which has to
  stay the same light plastic in both themes. `.cc-vid-light` / `.cc-vid-dark`, two full `<video>`s
  in the tile; `dark-mobile.css` toggles which one is `display` (both `!important` — each video
  carries an inline `style="display:…"` of its own, which only `!important` can beat) below 640px,
  and a small script at the bottom of `2D.html` pauses/plays them to match (both would otherwise
  keep decoding since both carry `autoplay`/`loop`). No colour grading needed — the recording's own
  background is `#1A1A1E`, imperceptibly close to the page's `#1C1C22`.
  `coffeemachine_interface_video_dark.mov` is a `crop`ped-then-reverted, then keyed, source: the
  raw recording had the site's OWN `#FF5C00` scroll-dots bleed into the bottom-right corner (the
  page's own UI, captured by the screen recording, not part of the machine). **A width crop was
  tried first and reverted** — it removed real footage. The actual fix: `ffmpeg`'s `colorkey` on
  the DOT colour (not the background) does nothing when composited back onto a duplicate of the
  same source frame — `[0:v]split[base][fg];[fg]colorkey=…[k];[base][k]overlay` is a no-op, since
  transparent pixels in the overlay just reveal the identical pixel underneath. **The dots were
  actually removed by a `drawbox` fill over their known fixed screen position** (a static site UI
  element, same spot every frame) — colorkey contributed nothing and was dropped. A hard-edged
  `drawbox` alone left a visible seam once through H.264 (CRF 26): a perfectly flat region reads
  differently than the surrounding compression grain even at a near-identical colour. Fixed with a
  **tight, small-radius blur** (`gblur=sigma=4` over a crop just ~20px larger than the box) —
  a first attempt used `sigma=22` over a much bigger crop, which was wide enough to pull the
  nearby light egg body's brightness into the average, visibly lightening the patch (reported as
  "too light"); the small sigma/tight crop keeps the blur's reach inside pure background. Even
  then CRF 26 consistently lifted the patch **+13 per channel** versus its true neighbours (a
  flat, noise-free region gets quantized differently than the grainy real footage around it) —
  fixed by pre-darkening the fill colour by that same offset (`0x0D0D11` instead of the sampled
  `0x1A1A1E`) so the POST-COMPRESSION result lands on the real value. **Verify any future edit to
  this file by decoding a frame back out and sampling it** — the lossless source PNG can look
  perfect while the actual shipped `.mov` still shows a seam.

## Nav bar iframe

Every 2D page embeds the nav as a fixed iframe:

```html
<iframe id="top-bar" src="/top_row_permanent_V3.html" allowtransparency="true" scrolling="no"></iframe>
```

**`scrolling="no"` is required on every host page, including `index.html`.** The nav document's
`body` carries `padding-top: 130px`, but `.top-row` inside is `position: fixed` — so that padding
contributes *height without content*. On the 2D pages the frame is 140px and absorbs it; on
`index.html` the frame is only **100px**, leaving 30px of overflow, and that page was the only one
missing the attribute — so it drew a **15px scrollbar down the right edge, over the 3D scene**
(measured: inner `clientWidth` 1425 vs a 1440 frame; 1440 vs 1440 after). Nothing is down there to
scroll to. If a new host page is added, copy the attribute with the iframe.

CSS on the host page:
```css
#top-bar {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 140px;   /* default — enough to hold the nav pill's bottom shadow uncropped */
  border: none; z-index: 9999;
  background: transparent; overflow: visible;
  transition: transform 300ms ease;
}
#top-bar.hide { transform: translateY(-220px); }
```

**Why 140px default / 400px on dropdown open:**
The iframe blocks pointer events across its full height. The nav pill itself sits ~24px down and is ~64px tall, but its neumorphic box-shadow needs roughly another 17px of room below it — 140px is the smallest height that doesn't crop that shadow. When the Craft dropdown opens, the nav sends a `postMessage` and the parent expands the iframe to 400px to give the dropdown room:

```js
// In top_row_permanent_V3.html (show/hide functions):
window.parent.postMessage({ type: 'nav-expand' }, '*');
window.parent.postMessage({ type: 'nav-collapse' }, '*');

// In every host page:
window.addEventListener('message', function(e) {
  if (e.data.type === 'nav-expand') topBar.style.height = '400px';
  if (e.data.type === 'nav-collapse') topBar.style.height = '140px';   // must match the default, NOT 90px
});
```

**Bug fixed this session:** `nav-collapse` used to shrink the iframe to 90px (a stale value from an older, shorter iframe convention). At 90px the nav pill's bottom shadow gets clipped by the iframe's own bounding box — so the shadow looked fine on page load, then visibly lost its bottom edge the first time you hovered Craft and moved away. Fixed on all 9 host pages (`2D.html`, `about2d.html`, `contact2d.html`, `kaffeemaschine2d.html`, `mac-lamp2d.html`, `portfolio2d.html`, `vaccine2d.html`, `unify2d.html`, `virtual_cooking2d.html`) by changing the `nav-collapse` handler's target height from `90px` to `140px`.

The Craft dropdown items in the nav link to all 4 project pages via `window.top.location.href`.

Pages with content that starts near the top (`contact2d`, `about2d`, `2D.html`) have `padding-top: 90px` on `.page-wrapper` to clear the nav.

### The 2D-mode raised shadow, and why it is NOT gated on `readyState === 'complete'`

`.nav-island.is-2d-mode` is what turns on the nav's raised neumorphic shadow. `updateNavShadow()`
in `top_row_permanent_V3.html` decides per page:
- a full-bleed `.hero` **with layout** → toggle the shadow on only once scrolled past it
  (`scrollY > hero.offsetHeight - 60`), so the nav sits transparent over the hero image;
- **no `.hero` at all** and the parent DOM is parsed → shadow always on;
- a `.hero` that exists but has **zero height** → stay undecided and let a later call settle it.
  Deliberately *not* treated as "no hero": adding the shadow here would flash it on over a hero
  image and then toggle it back off.

**Only the four project pages have a `.hero`** (`vaccine2d`, `mac-lamp2d`, `kaffeemaschine2d`,
`virtual_cooking2d`). `2D.html`, `about2d`, `contact2d` and `unify2d` have **none**, so for them the
"no hero → always on" branch is the *only* path to a shadow.

That branch used to be gated on `doc.readyState === 'complete'`, which waits for every image,
video and iframe on the parent to finish downloading — and the hero-less pages are exactly the
media-heavy ones. The homepage alone pulls **~16 MB** (3 videos + 2 large images: 5.3 MB
`vaccine_render_V1.mov`, 4.9 MB `side_v1_final_V1.png`, 3.0 MB `homepage.mov`, 1.6 MB
`coffeemachine_interface_video.mov`, 1.5 MB `IMG_3729_Snapseed.jpeg`). So the nav sat flat for
several seconds on lucasmaher.com and then appeared to "fade in" — the fade being the existing
`transition: box-shadow 260ms` finally running. **Localhost hid the bug completely** by serving it
all off disk instantly.

Now gated on **`readyState !== 'loading'`** (i.e. `interactive` *or* `complete`): knowing whether a
static `.hero` exists only requires the DOM to be **parsed**, not its subresources loaded. Measured
under 2 Mbps emulation, where the homepage's `load` event had still not fired after 20s: shadow on
at **1.24s** (bounded only by the nav iframe's own load), and `vaccine2d.html` stayed correctly
unshaded across all 188 samples at scroll 0.

**Lesson:** a production-only timing bug that localhost cannot reproduce. `readyState` waits are a
prime suspect whenever "it works locally but is slow/wrong on the live domain".

### Mobile 3D nav no longer collapses

The nav used to collapse behind the LM logo on touch devices in 3D (`.top-row.is-collapsible` /
`.nav-island.is-collapsible` + `.is-open`, a `max-width: 60px → 100vw` slide), tapping the logo to
open it. **All of that was removed** — the bar now stays fully open on mobile 3D like everywhere
else. Gone: the `@media (pointer: coarse)` collapse CSS block, the logo-tap `.is-open` toggle, and
the init that added the classes. Desktop was never affected (every removed piece was behind
`@media (pointer: coarse)` or `navigator.maxTouchPoints > 0`).

Side effect: tapping the logo on mobile 3D now falls through to the same branch desktop 3D uses —
`window.resetScene()` — instead of toggling the bar. Historical references to
`.nav-island.is-collapsible` further down this file (e.g. the `is-3d-view` item) describe a rule
that **no longer exists**.

## Design system (neumorphic)

Surface colour: `#DCDCE3`

```css
:root {
  --bg-surface:     #DCDCE3;
  --text-primary:   #1A1A1A;
  --text-secondary: #8E8E93;
  --text-tertiary:  #c7c7cc;
  --accent-orange:  #FF5C00;
  --border-color:   #6f6f6f;

  --shadow-raised-sm: 5px 5px 12px rgba(174,174,192,0.65), -5px -5px 12px rgba(255,255,255,1);
  --shadow-raised:    8px 8px 18px rgba(174,174,192,0.65), -8px -8px 18px rgba(255,255,255,1);
  --shadow-pressed:   inset 5px 5px 10px rgba(174,174,192,0.6), inset -5px -5px 10px rgba(255,255,255,1);
}
```

Raised shadow = element pops out. Pressed/inset shadow = element pushed in (used for text insets, active states).

**Mobile (≤640px): all three shadow tokens are redefined ×0.65** — offsets and blur reduced 35%, colors/alphas unchanged: raised-sm `3.25/7.8`, raised `5.2/11.7`, pressed `inset 3.25/6.5` — extending the nav toggle segment's already-reduced pressed inset (Lucas's reference) to the whole mobile experience (2026-08-13). The override is a `@media (max-width: 640px) { :root { … } }` block appended at the **end** of every token-defining file (the 8 2D pages, `top_row_permanent_V3.html`, `index.html`); everything using `var(--shadow-*)` inherits it automatically, desktop values above are untouched. Hardcoded (non-token) neumorphic shadows got individual ×0.65 mobile overrides in the same appended blocks: `about2d`/`contact2d` item shadows (≤640px), and the five 3D overlay pages (`about3d`, `contact3d`, `craft3d`, `controls_open3d`, `controls_fullscreen3d`) plus `src/style.css`'s `.overlay-close`/`.overlay-back` under **`pointer: coarse`, not a width query** — those pages render inside iframes whose box width lies about the device. Hover-only shadows (the `11px` lift) were deliberately not reduced — hover isn't a designed state on touch. Verified over CDP both ways: mobile emulation computes the reduced values (tile `5.2/11.7`, nav island `3.25/7.8`, items `3.25/7.8`), desktop computes the originals. **A new 2D page bootstrapped from an existing one must keep the appended mobile token block**, same as the other copy-the-whole-style-block conventions in this file.

## Fonts

- `OCR-A-BT` (local TTF at `/OCR-A-BT.ttf`) — headings / project titles
- `VT323` (Google Fonts) — labels, breadcrumbs, meta text, monospace UI elements
- `Roboto Flex` (Google Fonts) — body text
- `Roboto` (Google Fonts) — Unify typography-card labels
- `Nunito` (Google Fonts, weights 300/500/700/800) — Unify Typography-section preview text (the app's own typeface); imported on `unify2d.html`

## Languages / i18n

**Site is EN + DE only. French was removed entirely** (this was done deliberately):
- Nav (`top_row_permanent_V3.html`): `fr` button removed; `fr` dropped from `NAV_LANG`; any old stored `localStorage.lang === 'fr'` is coerced back to `'en'`.
- Every page's `TRANSLATIONS` object had its `fr:` block removed; `2D.html` also lost its `fr` `TITLES_BY_LANG` array.
- `applyLang` falls back to English for any unknown language, so nothing breaks. **Do NOT add French going forward.**
- New placeholder sections on Unify (color palette, typography, characters) and the whole rebuilt Virtual Cooking middle are **English-only, not yet wired into `TRANSLATIONS`** — wire them up when copy is finalized.

### Mobile: the language toggle lives in the hamburger menu

Below 640px the nav bar's `de / en` pair is **hidden, not removed** (`.lang-toggle { display:
none }`) — those `.lang-btn` elements are still what the nav's language IIFE reads and marks
active, and desktop (>640px) shows and uses them unchanged. The mobile control is a segmented
toggle at the bottom of the menu, under Contact, on all 9 menus (8 2D pages + `index.html`).

**It reuses `.mobile-view-toggle` / `.mobile-mode-btn` verbatim** — the same two classes as the
2D/3D toggle above it, with no styling of its own — so the pair can never drift apart. Only the
`[data-mode]` variant is orange; `[data-lang]` keeps the grey neumorphic well.

**The menu button does NOT translate its page.** It writes `localStorage.lang`, marks its own
highlight, and posts `lang-change` into the nav iframe, which stays the single owner of language:
the nav applies its own labels and **re-broadcasts to the parent**, where every page's existing
`lang-change` handler does the actual translation. One path in, so nothing desyncs, and
`index.html` needs no access to its i18n IIFE's private `apply()`. No loop — the parent handlers
only apply, they never post back. Writing localStorage also fires a `storage` event inside the
3D overlay iframes, which is how they already re-translate.

Two notes for anyone extending this: the nav's language IIFE gained a `message` listener (it
previously only *sent* `lang-change`), and the highlight is seeded synchronously from
localStorage because the nav's own broadcast lands ~100ms after the iframe loads.

## Cybercoffee project (`kaffeemaschine2d.html`)

The interactive coffee machine is a self-contained mini-app:
- Lives in `public/kaffeemaschine/kaffeemaschine.html` with its own assets (images, cursor)
- Embedded as an iframe inside `.machine-frame-wrap` on `kaffeemaschine2d.html`
- The machine's own CSS caps its width: `width: min(504px, 96vw)` — changing the wrapper size alone won't resize the egg; both files need updating
- An overlay (`#machine-overlay`) grays out the machine on load with a bouncing "[ click me ]" prompt; clicking dismisses it via JS

### Mobile: the egg fills the phone, and the 641–860px band was broken

**A media query inside `kaffeemaschine.html` resolves against the IFRAME's box, not the device.**
That box (`.machine-frame-wrap`) is **exactly 480px at every viewport from 481px up, desktop
included**, and only ever narrower on a phone — so `@media (max-width: 479px)` in the machine app
is a clean split that provably cannot fire on desktop. It drops `body { padding-top: 20px }` and
sets `.machine { width: 100vw }`. Dropping the padding is what makes the full width *fit*:
`.machine-frame-wrap` is an exact `969/1344` box, so a full-width egg is already exactly as tall
as the frame and 20px of padding would push its base out of view.

On the page side, `.result-egg` breaks out of `.section`'s 20px gutter with negative margins
(rather than removing the gutter, so every other block keeps its alignment) and
`.machine-frame-wrap` becomes `min(480px, 100%)`. The 480px cap is the desktop wrap width —
without it a 640px viewport would make the egg *larger* on "mobile" than on desktop, and it also
keeps the iframe's own width query on the correct side.

**Pre-existing bug fixed: the egg rendered 0×0 across the whole 641–860px band** — iPad portrait
and every landscape phone. `justify-items: center` in the ≤860px block makes `.result-egg`
shrink-to-fit, and its child's `width: min(480px, 100%)` percentage then resolves against a parent
whose width depends on the child. That's circular, so browsers resolve it to **0** and the frame
collapses. Verified at HEAD before the fix: 0×0 at 641/744/768/844/860, fine at 390 (the old
override there used `vw`, not `%`) and fine at 1440 (two-column grid → definite track). Fixed with
`.result-egg { justify-self: stretch }`. **Rule: a percentage width inside a shrink-to-fit parent
is circular and silently resolves to zero — give the parent a definite width.**

### Mobile hero: portrait crop, NOT the old letterbox band

`02_straight_on_widescreen.png` is 3556×2000 (16:9) — a desktop banner shape. Letterboxed into a
phone-width strip the machine came out ~117px wide, a thumbnail of the page's own subject. The
mobile hero is now `aspect-ratio: 4 / 5` and lets the base rule's `object-fit: cover` crop **55%
off the sides** while showing the full height, which is where all the subject is.

Measured off the source, the machine body sits at x `0.352 → 0.650` (width 0.298, centre 0.501 —
already dead centre, so **no `object-position` shift is needed**) and y `0.284 → 0.810`. Under
full-height cover its rendered width is `0.298 × (16/9) / hero-aspect` of the hero width, so
**4/5 puts it at 0.663**; 5/6 or 27/32 would leave it at 0.63–0.64. Result at 390px: hero 390×488,
machine 259×257px — 2.2× its previous size.

**This replaced the earlier "+30% taller with a dark band above" treatment** (`aspect-ratio:
160/117`, image pinned to the bottom at `76.9231%` height, `#141B30` band). That band existed
specifically to add height *without* re-cropping; here re-cropping is the point, so the image
fills the frame and the band never shows. The background colour stays — it's sampled from the
render's own top row `(20,27,48)`, so it covers the frame with the right tone while the 4.9 MB PNG
loads instead of flashing white. The mobile `.hero img` override is gone entirely: the base rule's
`-1px` / `calc(100% + 2px)` overscan and centre-centre cover are already exactly right.

### Sticky scroll-spin (`#spin-scrolly`, in the Design-process section)

A scroll-driven 360° turntable of the finished machine, built from a **56-frame WebP sequence**
(`/images/cybercoffee/spin/frame_001.webp` … `frame_056.webp`, ~1.4 MB total, all preloaded in a
loop on init). Driven by `initSpin()` at the bottom of `kaffeemaschine2d.html`.

Structure: `.spin-scrolly` is a tall spacer (**240vh**) whose only child `.spin-sticky` is
`position: sticky; top: 0; height: 100vh`, so it pins while the spacer scrolls past. Progress
`p` = `-scrolly.getBoundingClientRect().top / (offsetHeight - innerHeight)`, 0 → 1.

**Desktop** splits the pinned scroll into three phases: `[0 – SPIN_END 0.55]` the machine spins a
full turn, centred; `[SLIDE_START 0.55 – 1]` it slides centre → right; `[TEXT_START 0.82 – 1]` the
caption fades in on the left. End state = machine right, text left.

**Mobile (≤860px)** keeps the **pin** but goes stacked (machine above caption) and skips the
slide/fade. The pin used to be switched *off* here (`height: auto` + `position: static`), which
meant the frames still advanced but the section scrolled past mid-spin. Two things make it work:
- `.spin-scrolly` deliberately does **not** get `height: auto` in the ≤860px block — it inherits
  the 240vh spacer that gives the pin its scroll room.
- `spinEnd` becomes **1** on narrow screens, so the spin uses the *whole* pinned range. Left at
  0.55 it would finish at 55% and then hold you for another 45% on a motionless machine.
- `.spin-sticky` uses `min-height: 100svh` (with a `100vh` fallback), not a hard `height`: the
  stacked block is content-sized, so this centres it when it fits and grows if it doesn't instead
  of overflowing on a short phone. `svh` so a collapsing mobile browser toolbar can't make it jump.

**`prefers-reduced-motion`** collapses the whole thing to a static stacked block (`height: auto`,
`position: static`, single frame, no spin/slide/fade). That media block sits **after** the ≤860px
block in source order, so it still wins for a reduced-motion mobile user — keep that ordering.

**Whitespace limit on mobile (open issue).** A full-viewport pin leaves visible dead space because
the frames are **640 × 619** — essentially square — so on a 390px-wide phone the machine's *height*
is capped by the screen's *width*. At `96%` stage width it is ~325px tall; plus the 136px caption
that is ~473px of content in an 844px viewport, i.e. ~186px empty above **and** below. Total blank
is fixed at `viewport − content`; you can only choose where it sits. **Shrinking `.spin-sticky`
backfires** — it is the only child of the 240vh spacer, so any height it gives up shows as blank
spacer *below* it during the pin, making the gap under the caption bigger. The only real levers are
a bigger machine, or top-aligning the content so the gap moves below where the next section slides
up into it (which also needs the progress formula adjusted, since it assumes a viewport-tall
sticky box).

Static renders for this page live alongside the frames: `01_hero_3q_duo.png`,
`02_straight_on_widescreen.png`, `03_low_hero_egg_focus.png`, `07_custom_view.png`.

## Media pipeline: what compresses and what does not

**`ffmpeg`, `ffprobe`, `jpegtran` and `avconvert` are all installed.**

**Video (2026-09-08).** 13 of the 17 clips were re-encoded to x264 `-crf 26 -preset slow
-pix_fmt yuv420p -movflags +faststart -an`, keeping every filename, container, dimension and
frame rate — so nothing in the markup changed. `public/videos/` went 39 MB → 27 MB. Two
things worth repeating:
- **Pick the CRF by measuring, not by eye.** Every file was encoded at CRF 23/26/29 and
  scored against its own source with `ffmpeg -i orig -i new -lavfi "[0:v][1:v]ssim" -f null -`
  (note: that summary is printed at INFO level — with `-v error` it is silent, which is why an
  earlier pass came back with an empty SSIM column). Shipped set: **SSIM 0.975–0.997**.
- **A lower CRF is not automatically smaller.** These files were already compressed once, so
  CRF 20 came out BIGGER than the source on 14 of 17. The four `to.morrow` clips gained only
  1–3% even at CRF 26 and were deliberately left alone rather than spent on another
  generation of re-encode. The three Mac-Lamp clips use **CRF 23**: 60fps handheld grain is
  what costs the bits there, and 26 started eating it (SSIM 0.975 vs 0.985).
- Side effect worth knowing: `kaffeemaschine/coffeemachine_interface_video.mov` was **HEVC**,
  which Firefox and older Chrome cannot decode at all. It is H.264 now.

**A lossless JPEG rotation leaves a wrapped strip unless the dimensions are multiples of 16.**
Mac-Lamp's `5/6/7.jpg` each carried a 10px band along the bottom and an 8px band down the
right that were **copies of their own top and left edges**, with a hard step where the real
picture ended (measured: row-to-row difference 80/90/52 at the seam against ~3 in the
interior). 1482 mod 16 = **10**, 1976 mod 16 = **8** — the partial-MCU remainder a
`jpegtran -rotate 180` leaves behind without `-trim`. It is baked into the files; no CSS
change can hide it. Fixed by cropping the bands off **from the top-left origin**
(`jpegtran -copy all -crop 1968x1472+0+0`), which keeps the DCT grid aligned so the crop is
lossless — sizes moved less than 1%. The pixels under the bands were destroyed by the
original rotation and cannot be recovered. **Diagnostic:** compare each edge strip against
the opposite edge; if they match and there is a hard step behind them, it is this.

## 2D page layout patterns

**Standard pattern** (kaffeemaschine — vaccine and mac-lamp have since diverged, see below; portfolio2d.html, the page this pattern was originally shared with, was removed — see "Recent Changes"):
1. **Hero** — full-width image or split layout
2. **Header section** — breadcrumb, OCR-A-BT title, blinking orange dot, dotted divider
3. **Meta grid** — 4 neumorphic tiles (Timeline, Team, Role, Tools)
4. **Overview / Concept** — multi-column section with image + text
5. **Process** — step tiles (numbered cards with images/text)
6. **Project nav** — bottom bar linking to next project

**The current shared pattern** (mac-lamp, vaccine, virtual-cooking all follow this now; Unify is a variant of it):
1. Hero
2. Header (breadcrumb, title, dotted divider)
3. **At a Glance** — `.guide-section` with heading + `.glance-lead` paragraph, no bottom border, sits directly above the meta grid
4. Meta grid
5. Overview/Concept and/or Process — built from a shared set of ported classes: `.guide-section` (padded/bordered wrapper), `.guide-text` (plain paragraph), `.guide-media` (image/video card), `.stagger-row` / `.stagger-row.right` (portrait or near-square figure + text beside, alternating sides), `.process-shot.shift-right` / `.shift-left` (landscape still, caption above, alternating horizontal offset). A `.process-steps` / `.stagger-list` wrapper applies fluid-width centering (`width: calc(520px + 40vw); max-width: 100%; margin: auto`) so alternating blocks stay pulled together on ultra-wide monitors instead of sprawling to opposite edges.
6. Project nav

**Mac-Lamp (04)** — rebuilt this session (see "Recent Changes"):
1. Hero (image)
2. Header
3. At a Glance (placeholder)
4. Meta grid
5. **Process** (badge 0) — `1.png` + `2.MOV` as alternating `.process-shot` blocks, then `3.MOV`/`4.MOV` as a **scroll-driven dual-video pair** (`.lamp-scrolly*`, ported from Unify's `.scrolly` mechanism — sticky pin, scroll/click swaps active video, mirrored text-left/videos-right layout)
6. **Overview / Concept** (badge 1) — heading + real copy, then the full-width photo diashow/gallery (`5.jpg`–`9.jpg`, `aspect-ratio: 4/3`, `object-fit: contain`)
7. Project nav

**Double Packaging (05)** — rebuilt this session (see "Recent Changes"):
1. Hero (video)
2. Header
3. At a Glance (placeholder)
4. Meta grid
5. **Overview / Concept** (badge 0) — real copy, plain `.guide-text`
6. **Process** (no badge, `.process-sub` meta "5 Steps · Modeling → Render") — 5 alternating blocks in original order, natural image aspect ratios, no per-step badges
7. Project nav (no "next" — this is the last project in the list; see item 24 in "Recent Changes" for the current project order)

**Virtual Cooking (02)** — REBUILT (this session) from a new Figma reference. Middle sections were torn out and rebuilt; hero, header and project nav were kept. Text is all `[ Placeholder ]` pending real copy (English only, not yet in `TRANSLATIONS`).
1. **Hero** — full-width 16:10 image, now `side_v1_final_V1.png` (also used for the VC card on `2D.html`)
2. **Header** — breadcrumb + OCR-A-BT title + dotted divider
3. **At a Glance** — heading + big light lead paragraph (`.glance-lead`), sits ABOVE the meta grid
4. **Meta grid** — Timeline (May 2026 → Jul 2026), Team (Just Me), Role (Idea & Concept Designer), Tools (Blender / Three.js / HTML-CSS-JS / Vibe Coding)
5. **Identifying the problem** (step 0) — heading + dotted divider + 2 paragraphs
6. **Design process** (step 1) — `.stagger-list` of 3 transparent silver-panel renders (`Panel_Left.png` / `Panel_Right.png` / `Stopwatch.png`) in a STAGGERED layout (`.stagger-row` / `.right` / `.indent`, text beside each), then two `.process-shot` screenshots (`blender-modeling.png` shift-right, `app-preview.png` shift-left — caption ABOVE image, constrained width, staggered offsets)
7. **Final result** — heading + `5 STEPS · MODELING → RENDER` meta + dotted divider; two demo subheads (`.result-subhead`): "Instruction manual" (`manual_click_V2.mov` + caption), then "Timer & ingredients" in the order **heading → `.result-image-pair` (`back_final_V2.jpg`, `timer_click_V1.jpg`) → caption → `timer_V1.mov`**. The image pair sits directly under the *Timer & ingredients* heading, not under the Instruction-manual video where it originally lived.
8. **Project nav** — Unify (prev) / Cybercoffee (next)

Note: the old "single-track centered" VC layout (glance bullets, Overview/Concept, reflection sections, breakout image) no longer exists. Leftover unused CSS remains (`.breakout-media`, `.glance-list`).

**Unify (01)** — Extended blob hero + design-story sections + scroll-driven dual-video sections. **All copy is now filled (EN+DE for meta/overview/features; English-only for the new design-story sections).**
1. **Hero blob** (CUSTOM) — Large pink blob; pupils track cursor; sits above dotted divider (z-index: 3). Now horizontally centered at the 2/3 mark (`left: 66.667%; transform: translateX(-50%)`), drops in with a bounce on load (`blobDrop` keyframes), and scales 35% larger on true widescreen.
2. **Header + breadcrumb** — bottom-left of hero + dotted divider
3. **At a Glance** — overview paragraph (the app's origin/concept)
4. **Meta grid** — Timeline (Feb 2025 / Jun 2025), Team (Me / Sophie Meyer / Moritz Ackermann), Role (Concept, design, prototyping & vibe coding), Skills (Figma / UX research / Vibe coding). Multi-line values use `<br>` via `data-i18n-html`.
5. **Design story sections** (NEW this session, between meta and features):
   - **Design Process** — "Choosing the right colorpalette" + 3 color boxes (FF88C8 / F9F2EB / 1A1A1A, hex inside box)
   - **Typography** — 3 fully-rounded pills; preview text in **Nunito** (Header/Body/Info weights), left label+spec on one line with `·`
   - **Character based design** — 3 characters (`/images/unify/characters/char-arch.svg`, `char-bird.svg`, `char-mountain.svg` — flattened Figma exports) in a STAGGERED layout with an organic idle float animation; fluid centering (see gotchas)
   - **Final Product** header — has a `border-top` divider above it
6. **Feature 1: Home** — single video + text
7. **Features (scrolly A) — Timetable + Socials** (`#timetable-socials-scrolly`): text LEFT, videos RIGHT
8. **Features (scrolly B) — Friends + Navigation** (`#nav-friends-scrolly`): videos LEFT, text RIGHT
9. **Feature 6: Settings** — single video + text (reversed grid)
10. **Project nav** — (no "previous" — this is the first project in the list) / Virtual Cooking (next)

**Feature numbering / data-key mismatch (IMPORTANT):** displayed scroll order is 1 Home, 2 Timetable, 3 Socials, 4 Friends, 5 Navigation, 6 Settings. But internal i18n keys keep old names: display **3 Socials** = key `feat-socials-*`, **4 Friends** = key `feat-friends-*`, **5 Navigation** = key `feat-courses-*`. In `#nav-friends-scrolly` the **Friends** video/panel is now FIRST (is-active) and **Navigation** second, so scroll order reads 4→5. Titles: Home="Your Day at a Glance", Timetable="Your Timetable, and Everyone's", Socials="Beyond the Group Chat", Friends="Find Your Friends Indoors", Navigation="Find the Right Room", Settings="Profile & Friends".

**Page background colors**:
- **All 2D pages, Unify included: `#DCDCE3` (`--bg-surface`).**
- Unify used to be `#D8D7DC`, matched to the grey baked into the phone videos so no seam showed at the video edges. That constraint is **gone** — the videos are now clipped to the phone bezel with `clip-path` (see "Unify Page: Video Details"), so the page background is free to be any colour.

## Assets

Organized by project for clarity:

**Images** (`/public/images/`):
- `about/` — About page hero
- `cybercoffee/` — Cybercoffee renders: `01_hero_3q_duo.png`, `02_straight_on_widescreen.png`, `03_low_hero_egg_focus.png`, `07_custom_view.png`, plus `spin/frame_001.webp`–`frame_056.webp` (~1.4 MB), the 56-frame turntable driving the sticky scroll-spin — see "Cybercoffee project". Frames are **640 × 619**, i.e. nearly square, which is what limits how large the machine can render on a phone.
- `mac-lamp/` — Mac-Lamp project images & diashow frames. Diashow items are `5.jpg`–`9.jpg` (converted from `.HEIC` this session — HEIC only renders in Safari, so gallery images must be JPG/PNG; the original `5.HEIC`–`8.HEIC` are still on disk but unused). **5/6/7.jpg are 1968×1472, the other two 1976×1482/1535** — see the wrap-strip note below. Process-section stills: `1.png` (CAD render) + videos `2.MOV`/`3.MOV`/`4.MOV` in `videos/mac-lamp/`
- `portfolio/` — **orphaned.** Was "This Website" project screenshots; the page (`portfolio2d.html`) was removed this session (see "Recent Changes"). The image files are still on disk but nothing references them — safe to delete, left in place in case any of the removal was meant to be revisited.
- `vaccine/` — Double Packaging renders & process steps
- `vr-cookbook/` — Virtual Cooking assets: `side_v1_final_V1.png` (hero + card), `back_final_V2.jpg`, `timer_click_V1.jpg`, silver panel renders `Panel_Left.png` / `Panel_Right.png` / `Stopwatch.png` (transparent bg), and process screenshots `blender-modeling.png` + `app-preview.png` (⚠️ renamed from Figma exports that had spaces in the filename — keep filenames URL-safe)
- `unify/characters/` — `char-arch.svg`, `char-bird.svg`, `char-mountain.svg` (flattened, transparent-bg character exports)
- `site/` — favicon and shared UI assets. **Favicon:** orange (`#FF5C00`) circle with the site's actual logo mark (white, recolored from `logo-lm.png`) centered — `favicon.svg` (primary, self-contained: embeds a base64 PNG raster of the circle badge rather than a hand-drawn vector path, since the logo mark itself is raster art, not a traced shape) plus baked PNG fallbacks `favicon-16/32/48/512.png` and a legacy `/public/favicon.ico` (16/32/48 multi-size). **Originally (superseded, see "Recent Changes") the mark was a typed white "LM" monogram in a bold system sans-serif** (VT323 was tried first and blurred into illegibility at 16px) — replaced once the real Figma logo asset existed, so the favicon now matches the nav logo instead of approximating it with text. All PNG sizes are generated in Python/Pillow by supersampling a 2048px canvas (circle + centered white mark) and downsampling with LANCZOS per target size, rather than rendering the SVG in headless Chrome — simpler once the source mark is already a raster PNG. Linked via 3 tags in every page's `<head>` (right after `<meta charset>`): `<link rel="icon" type="image/svg+xml" href="/images/site/favicon.svg">`, a 32×32 PNG fallback, and `apple-touch-icon` (180×180) for iOS/bookmarks. Wired into `index.html` + all 13 real site pages (`2D.html`, `about2d/3d.html`, `contact2d/3d.html`, `controls_open3d.html`, `craft3d.html`, `kaffeemaschine2d.html`, `mac-lamp2d.html`, `unify2d.html`, `vaccine2d/3d.html`, `virtual_cooking2d.html`). Skipped `top_row_permanent_V3.html` (loaded only as an iframe, never gets its own browser tab) and the two standalone dev/experiment files `Questionmark_Button3d.html` / `blob_morph_bouncy.html` (not part of site navigation). **`favicon-180.png` / `favicon-192.png` are NOT the same transparent-circle design as the rest — they're a solid opaque orange square (no circle mask, no transparency) with the same white logo mark.** Root cause: `apple-touch-icon` (used by iOS Home Screen, Safari Favorites/Start Page tiles, and macOS "Add to Dock") ignores/fills transparency rather than respecting it — Apple's own icon convention always imposes a rounded-square mask on `apple-touch-icon` regardless of the source shape, so a transparent-cornered circle there rendered as "circle floating inside a visible square" once iOS/Safari filled the transparent corners with its own backdrop. Making that specific asset a full-bleed opaque orange square (not the circle used everywhere else) means the corners iOS reveals are already the brand orange, so the square mask reads as seamless instead of visibly framing the icon. The regular browser-tab favicon (`favicon.svg`, `favicon-16/32/48.png`, `favicon.ico`) is unaffected — those keep the genuine edge-to-edge circle since normal tab rendering respects transparency correctly. **If regenerating: `favicon-16/32/48/512.png` + `.ico` should stay the transparent-circle render; `favicon-180.png`/`favicon-192.png` should stay the separate opaque-square render — don't collapse them back into one asset.**

**Videos** (`/public/videos/`):
- `kaffeemaschine/` — Cybercoffee interface demo
- `mac-lamp/` — Mac-Lamp diashow video clips
- `vaccine/` — Double Packaging render video
- `vr-cookbook/` — Virtual Cooking demo clips (swipe, click, timer)
- `unify/` — Unify app screen recordings (portrait phone videos; each still has `#D8D7DC` baked in around the phone — the files are untouched, the grey is hidden with CSS `clip-path`, not removed)

**Other**:
- `/public/kaffeemaschine/kaffeemaschine.html` — Interactive coffee machine app, plus its assets (`beans.png`, `logo.png`, `milk.png`, `screen.png`, `size.png`, `cursor.png`, `cursor@2x.png`) — all must sit beside the HTML
- `/public/current🟢.glb` — 3D model used in the Three.js scene, loaded in `src/main.js`. **Renamed by the user from `portfolio_scene.glb`** (historical "Recent Changes" items below still refer to it by that name, and briefly as `portfolio_scene🔴.glb`); note the emoji in the filename is an exception to the "URL-safe filenames" rule — browsers percent-encode it automatically, but keep emoji out of any future asset names. `severance_V23.glb` has been deleted from disk.
- `/public/OCR-A-BT.ttf` — custom monospace font

## Current Status & Missing / TBD

**Unify page (01):**
- ✅ Hero blob (pupil tracking, 2/3 centering, bounce-in, widescreen scaling)
- ✅ Scroll-driven dual-video scrollytelling; mobile fallback at ≤860px
- ✅ NEW design-story sections (Design Process/colors, Typography, Character design, Final Product)
- ✅ Meta tiles filled (Timeline/Team/Role/Skills)
- ✅ All 6 feature copy filled (EN+DE). **The 6 `feat-*-title` keys were missing from `TRANSLATIONS` entirely until 2026-07-30** — they had `data-i18n` in the markup but no entry in either language block, so German visitors always saw the English heading. The translated orange kicker above them partly masked it; removing the kickers exposed it. Now present in both blocks (55 keys each, verified symmetric).
- ✅ Design-story section copy (colors/typography/characters/Final Product heading) now wired into `TRANSLATIONS` with German (was English-only); also caught and fixed 3 pre-existing German blocks (`overview-text`, `feat-timetable-text`, `feat-socials-text`) that were translated but overflowed their English line count by 1–3 lines undetected until this pass

**Virtual Cooking (02):**
- ✅ Rebuilt middle from new Figma (see layout above)
- ⏳ All body text is `[ Placeholder ]` — real copy + DE translations pending
- Leftover unused CSS: `.breakout-media`, `.glance-list`

**Kaffeemaschine app** (`public/kaffeemaschine/kaffeemaschine.html`):
- ✅ **Restored and committed.** Copied from `~/Documents/creative-work/ongoing/GitHub/kaffeemaschine_external_copy/` (the 5 Jul version) and verified working in the iframe on `kaffeemaschine2d.html`.
- It had never been tracked by git in this repo, which is why it went missing with no way to recover it here. It **is** tracked now — keep it that way.

**Mac-Lamp (04):**
- ✅ Rebuilt this session — At a Glance, fixed gallery cropping, HEIC→JPG, new Process section with scrolly mechanism (see layout above)
- ⏳ At a Glance lead is `[ Placeholder ]`, not yet in `TRANSLATIONS` (EN+DE keys exist — `section-glance`/`glance-lead` — but text itself is placeholder)

**Double Packaging (05):**
- ✅ Rebuilt this session to match the shared pattern (see layout above); all real copy preserved
- ⏳ At a Glance lead is `[ Placeholder ]`; same `section-glance`/`glance-lead` keys pattern

**Mobile (2D):**
- ✅ Reviewed and rebuilt end-to-end on 2026-07-31 — menu, type scale, hero, project cards, meta
  tiles, Unify layout, Cybercoffee hero + egg, 3D overlays, language toggle. See "Recent Changes
  (2026-07-31) — Session A".
- ⏳ **Not yet reviewed on a real device by Claude** — everything was verified over CDP at
  390/430/744/768/859px plus a desktop control. **The device is the source of truth**: an earlier
  video-colour "fix" was reverted based on a headless measurement and turned out to have been
  working on Lucas's phone. Colour-management questions in particular cannot be settled headless.

**3D mode:**
- ✅ Camera look-around triggers on right-click **or middle-click**; arrow keys now alias WASD —
  see "3D Mode: Camera Controls"
- ✅ YellowRoom relit with downward spots; floor pool + Blender-baked wall gradient
- ✅ **BlueRoom is lit again** — one invisible `RectAreaLight` filling the ceiling, plus an
  up-facing `bounce` twin so the ceiling itself isn't black. Its panels stay non-emissive (the
  tile gradient needs them off). See "3D Mode: Lighting"
- ⏳ `nav-out.json` at the repo root is an orphaned debug dump — safe to delete

**Deployment:**
- ✅ Live at `https://lucasmaher.com` (custom domain, HTTPS working) and `https://lucasmaher-hash.github.io/3d-Portfolio-current/` — see "Deployment" section below

## Recent Changes (2026-08-28)

One long 3D session (code + live Blender over MCP). The .blend (`severance_V25.blend`) was
saved at end of day; scene backups from every step live in `glb-backups/`.

1. **Pixel-font room titles above each door** — VT323 (`public/VT323-Regular.ttf`, parsed at
   runtime by three's TTFLoader — no typeface.json), bent onto the wall cylinder, dark grey
   `0x1e1e1e`. Driven by `ROOM_TITLES` in `src/main.js`: unify / interfaces / packaging /
   mac-lamp. Same system renders the smaller "contact"/"about" captions via `wallLabel()`.
2. **Click-pop on every clickable project object** — sine scale pulse (~0.28s) about the
   union bbox centre (bottom-anchored for podium/table objects), navigation deferred until
   the pulse ends. `POP_ENABLED` / `resolvePopTargets` in `src/main.js`. Unify's overhead
   arrow was removed (`PROJECT_ARROWS`); the blob itself is the landmark.
3. **Mobile:** swipe release now glides out (`FLING_*` consts — deliberately subtle, NOT the
   old rejected inertia); `PITCH_LIMIT` 0.20 → 0.32.
4. **Wall plaques between the mac-lamp and packaging doors** — `WallIcon_Mail` +
   `WallIcon_Logo` (Blender objects, material `Icon_Chrome`, dark grey), curved to the wall
   (radius shell 9.535–9.59), each centred in one rail panel, clickable via `CONTENT`
   `action:` entries → the in-scene contact/about overlays, with the click-pop.
   **Placement trap: the wall rails sit ~6° rotated at RUNTIME vs their Blender-world
   angles, and unparented objects don't inherit that** — panel angles must be measured in
   the live scene (`Wall_Rails` vertices), not in Blender. Doors at runtime: 87.6°
   (packaging) / 177.6° (mac-lamp) / 267.6° (interfaces) / 357.6° (unify).
5. **Brown-room entrance** rebuilt several times; final state is Lucas's own manual Blender
   fix (`BlueRoom_Tunnel.002` + a denser `Wall_Cylinder` that also closes the old
   wall-to-ceiling-rim gap). Lesson that cost a day of holes: **zero-thickness single-sided
   liner quads leak sightlines into the void between rooms — door framing must be a closed
   solid wider than both wall cuts.** Also: that tunnel object carries a ~94° baked
   rotation — build its mesh in world coords and bake `matrix_world.inverted()` in, or the
   geometry lands rotated off the doorway.
6. **Scene GLB churn:** model now includes the `_staging` duplicates + `dome-lattice`
   (bbox-centre unchanged — always verify delta `[0,0,0]` before deploying, plus node
   names, material list, per-mesh tri counts). Export = visible objects only,
   `export_apply=True`, subsurf viewport levels pinned to render levels.
7. **Testing:** headless CDP tooling lives in the session scratchpad (`shot3d.mjs` etc.,
   raw-WebSocket CDP, SwiftShader flags). SwiftShader parks rAF when idle — animations
   freeze mid-pulse unless you dispatch pointer nudges; close overlays via a real Escape
   (stripping the CSS class leaves `isOverlayOpen` latched). Session hit the API image cap,
   so all visual verification was done by pixel analysis of PNGs; Lucas's screenshots are
   at `~/Desktop/Screenshot *.png` when chat images fail.

## Recent Changes (2026-07-31)

Two Claude sessions ran in parallel on this day and both are folded in below. **Scope note:** the
3D/Blender items were reconstructed from the committed code and its comments, not from that
session's own transcript — the code comments in `src/main.js` are the authority if anything here
disagrees.

### Session A — mobile 2D (this session's focus)

Standing constraint for the whole session: **mobile only, desktop is finished and must not
change.** Every item below is inside `@media (max-width: 640px)` (or `pointer: coarse`) unless
stated, and each was verified at 390/430px with a desktop control run in the same pass.

1. **Unify's mobile layout was substantially broken; four separate causes.** See the new
   "Unify page — mobile" subsection under "Unify Page: Scroll-Driven Dual-Video Sections".
   - Colour swatches rendered **75×58px, right-aligned**: `.color-grid` is a row with
     `align-items: flex-end`, and the ≤860px block flips it to a column where `align-items`
     controls the *cross* axis — `flex-end` silently became "right" and each box collapsed to
     content width. Restored as a row of three square swatches.
   - `.character-copy` measured **367px inside a 350px column**: the paragraphs carry inline
     `margin-left/right: -15px` to tuck against the figure in the desktop ROW; in a column they
     just pull text off the page. Zeroed (needs `!important` — inline styles).
   - **`#timetable-socials-scrolly` did not stack at all** — copy and both panels at **zero
     width**, videos 46px off the left edge, section 2917px tall. Specificity, not a missing
     rule: the fallback sets `.scrolly-sticky { flex-direction: column }` (0,1,0) but the
     mirrored layout is `#timetable-socials-scrolly .scrolly-sticky` (1,0,1). Sibling
     `#nav-friends-scrolly` has no ID-level direction rule, which is why only one broke. Fixed
     in the **860px** block, not 640 — a landscape phone lands in that band too.
   - The colour-palette heading carries an inline `margin-top: 190px` (deliberate air at 1440px,
     **26% of the whole section** at 390px) → 40px on mobile.
2. **Both Unify scrolly sections got a real phone layout, and a frozen-video bug was fixed.**
   The ≤860px fallback stands the two phones side by side and dumps both captions underneath —
   ~175px per phone at 390px, and each caption divorced from its screenshot. Now each video is
   paired with its own caption via `display: contents` on `.scrolly-media`/`.scrolly-copy` plus
   `order` — no markup change, desktop's mirrored row untouched. Separately, `initScrolly`
   paused whichever step wasn't active, but below 860px **both are on screen**, so one phone sat
   on a dead frame; and with `.scrolly` at `height: auto` the progress fraction divides by the
   `max(…, 1)` floor and snapped 0→1 in one scroll step. Guarded with
   `matchMedia('(max-width: 860px)')`.
3. **Phone mockups +7%, captions matched to the mockup width** (Unify). One `--phone-h` custom
   property replaces the same clamp declared in two places; `--phone-w` derives the caption
   width. The width is the **visible phone, not the element box** — see the derivation in
   "Unify Page: Video Details".
4. **Language toggle moved into the mobile menu** on all 9 menus; the nav bar's `de / en` is
   hidden below 640px. See "Languages / i18n".
5. **Cybercoffee hero re-cropped to portrait on mobile**, machine 2.2× bigger. This **replaces**
   the "+30% taller with a dark band above" treatment. See "Cybercoffee project".
6. **Cybercoffee egg fills the phone edge to edge**, and a pre-existing bug where it rendered
   **0×0 across the entire 641–860px band** (iPad portrait, every landscape phone) was fixed.
   See "Cybercoffee project".
7. **Meta tiles → a pressed spec-list** on all 5 project pages, values comma-joined on one line
   by a small DOM script (three CSS-only attempts failed — see the gotcha).
8. **3D overlay pages** (`about3d`/`contact3d`/`craft3d`/`controls_open3d`) restructured for
   phones: topbars removed, frames shrunk to their content, first-paint heights set in
   `src/style.css` to kill an open-flicker. **A `display: none` iframe performs no layout, so it
   cannot self-measure until visible — CSS first-paint heights are the only fix.**
9. **Assorted mobile fixes:** liquid-glass removed from the menu; nav `?` button given its own
   VT323 declaration; scroll dots moved to `right: 6px`; `2D.html` hero fills the screen
   (`100svh − 91px`); project cards reordered (title above image, pills below, "Project 0X"
   kicker dropped); Unify/Cybercoffee landing tiles filled with their video; a readable type
   scale (16px body / 15px meta / 16px VT323 UI); 3D vertical look range cut to
   `PITCH_LIMIT = 0.20` with `TOUCH_SENS_PITCH = 0.0012`; toggle inset spread reduced 35%;
   About/Contact accordions fixed (an `.item.closing` rule that lost to a later `.item.open`).
10. **The landing page no longer opens with Projekte pre-pressed** — `2D.html`'s mobile menu had
    `is-active` hardcoded on Craft. `about2d`/`contact2d` keep theirs (correct "you are here");
    the landing page is not the Craft page. The nav bar's own marker is an underline, not a
    press, and was never involved.
11. **The 3D nav iframe was the only one missing `scrolling="no"`** — see "Nav bar iframe".

### Session B — 3D scene, lighting and Blender (reconstructed from code + commits)

1. **New `VERTEX_GRADIENTS` system in `src/main.js`** — load-time COLOR_0 baking with three
   modes (vertical / `radial` / `tiles`). This is the runtime counterpart to the Blender bake
   recipe and needs no GLB re-export. See the new "Load-time vertex gradients" subsection under
   "3D Mode: Colour gradients on geometry".
2. **YellowRoom relit.** The two ceiling panels (`YellowRoom_Ceiling` + `.001`) became
   **SpotLights aimed straight down** (`angle 0.62`, `intensity 42`, `fill 14`, `distance 12`,
   `0xffebc7`), replacing omnidirectional PointLights at 45 that lit floor, walls and ceiling
   equally and read as a flat gold wash. **A 2×3 grid per panel was tried and REVERTED** —
   more uniform but it flattened the room's character; per the code comment, *don't bring it
   back without asking*. Floor darkened via `MATERIAL_FIXUPS` (`YellowRoom_Floor_DarkBrown` →
   `0x6a523e`; an earlier `0x453020` read as near-black) and given a **radial pool** gradient
   (centre ×2.4 → rim ×0.45).
3. **YellowRoom's wall gradient moved from runtime to a Blender bake** as an end-to-end pipeline
   test: material split to `Velvet_WallGrad` (the coffee table keeps plain `Velvet` — the recipe
   sets Base Color to white, which would have turned the shared table white) with a `WallGrad`
   FLOAT_COLOR attribute at index 0 carrying ×0.10 → ×3.5, a deliberate 35× spread.
   **A runtime `Velvet` entry must not be re-added — it would overwrite the baked COLOR_0.**
4. **BlueRoom is being rebuilt as a curved cove.** Its `FIXTURE_LIGHTS` entry is **commented out,
   not deleted**, and its panels are no longer emissive, so *the room has no light of its own* —
   only the global fill (Ambient 0.08 + Hemi 0.18 + Dir 0.12 + environment 0.175). It is expected
   to read dark. Its tiles use `mode: 'tiles'` on all five `BlueRoom_EmissivePanel` meshes.
5. **`BLUEROOM_Z_LIMIT = 36.4` — a hard movement clamp, because collision cannot help here.**
   The cove is built from loose, unwelded tile quads that don't close around the curve, and
   raycast collision tests that same geometry — *the holes are the gaps*. The clamp sits at the
   cove's tangent line (back plane z ≈ 39.05, radius 2.505 → 36.55), is scoped to BlueRoom's
   measured footprint, and is applied **after** the move + slide so it clamps the final position
   rather than fighting the collision solver.
6. **Vaccine label: `emissiveMap: '@map'`.** A flat emissive lift washed the print out — emissive
   is added after shading, so a constant 0.35 lifted the dark type by exactly as much as the
   white paper. Pointing `emissiveMap` at the material's own texture modulates the glow by the
   image. `'@map'` is a sentinel resolved in the applier.
7. **Mac-Lamp materials:** `Lamp_Orange` → `emissive: 0xc65808`; `Lamp_Grey` →
   `color: 0x8e9296` + `roughness: 0.4` + `emissive: 0x9a9ea2`. Both are **black base at
   metalness 1**, so everything visible is the emissive — "darker orange" means a darker
   *emissive*, not a darker base colour, which would change nothing. The grey entry also gives
   the metal a non-black base so it finally has something to tint its reflections with.
8. **`CONTENT['Pivot_MacLamp_Table']` removed and replaced with six per-mesh keys**
   (`Base_Orange_Table`, `VerticalPlate_Orange_Table`, `KB_Grey_Panel_Table`,
   `Back_Grey_Panel_Table`, `Trackpad_Back_Grey_Table`, `Trackpad_Front_Grey_Table`). The
   exporter collapses that empty and parents the meshes straight to `SpinPivot`, so the old key
   matched nothing — which is why the table lamp had silently stopped being clickable. This was
   listed as a "known pre-existing dead key" in the GLB export section; it is now fixed.
9. **Arrow keys are full WASD aliases**, with `preventDefault` under `{ passive: false }` (a
   passive listener silently ignores it) or holding one both walks the camera and scrolls the
   document. Safe for the overlays: a keydown inside an iframe doesn't bubble to the parent.
   **The bug worth remembering:** `keys` has *three* states — `undefined` (never pressed),
   `true`, `false` — so `keys['KeyA'] !== keys['KeyD']` was true after merely releasing a key
   (`false !== undefined`) and walked the camera forever. Use truthiness (`||`), not `!==`.
   Pure WASD hid it, because pressing those keys once makes both sides real booleans.
10. **Temporary BlueRoom-doorway spawn** (used while iterating on the tile gradient) has been
    **reverted to the real spawn** `(2.2970, -0.7653, 9.6615)`, yaw 2.34, pitch 0.054.
11. **`nav-out.json` (repo root, 769 bytes)** was committed in `9a64481` — a debug dump, nothing
    references it. Safe to delete.

### Session C — PinkRoom: wall regression reverted, centre column joined to floor + ceiling

1. **The PinkRoom wall's rib shading broke, and the cause was a stale `.blend`, not a bad edit.**
   Reported as "the darkened grills/indentations are way way darker all of a sudden." Root cause:
   when the texture-based rib approach was rejected earlier ("delete this version and bring back
   the one with the baked geometry"), **only `public/current🟢.glb` was restored from backup — the
   `.blend` was left in the experiment's state.** It sat there harmlessly until a *different*
   Claude session re-exported for unrelated BlueRoom work and shipped the regression. Two distinct
   faults, both in the `.blend`:
   - `PinkRoom_Gradient_Wall`'s Principled **Base Color was wired to `RibRampTex`** (the rejected
     image-texture node) instead of the `Attribute` node reading `RibGrad`. The exporter can't
     follow that node chain, so it fell back to `baseColorFactor [1,1,1,1]` **plus a synthetic
     all-white `COLOR_0`** — i.e. the wall shipped with *no* colour data at all, and its pink came
     purely from the pink lights hitting a white surface. That is why it read as high-contrast and
     near-black in the grooves rather than simply flat. **The `RibGrad` bake was never lost** — it
     was still on the mesh (R 0.6751–0.8700), just unplugged.
   - The wall had **also silently lost a subdivision level**: 57,716 → 14,494 triangles, exactly
     4×. This is the half that produced the "low poly / hard edged" look. Restored with a
     `SIMPLE` (not Catmull-Clark) subsurf named `RibSubdiv` at level 1 — simple keeps the rib
     silhouette and only adds resolution for the per-vertex gradient. Verified: bbox identical,
     `COLOR_0` back to float32 R 0.6751–0.8700, wall back to 58,164 tris.
   **Diagnostic that found it:** compare per-mesh triangle counts and `COLOR_0` min/max between a
   fresh export and a known-good backup. A 4× triangle drop = a lost subdivision; `COLOR_0` pinned
   at 1.0 = a material link that no longer exports. Both are invisible in Blender's viewport.

2. **`PinkRoom_CentralColumn` now includes the floor and the ceiling; `PinkRoom_Floor` and
   `PinkRoom_Ceiling` no longer exist.** Fixes a visible "colour cut" ring where the centre dome
   met the ceiling and the stump met the floor. It was never a colour problem — all three objects
   already shared material `PinkRoom_Gradient` with identical `baseColorFactor` 0.87/0.48/0.56 and
   no `COLOR_0`. It was **shading**: the column's outermost ring sat at normal `(0, 0.958, 0)`
   (~17° off the plane) while the planes were exactly `(0, ±1, 0)`, and being separate meshes they
   could not average normals across the boundary — so the normal jumped 17° instantaneously. The
   planes also sat 5 mm inside the column's rim (floor z 0.005 / ceiling z 4.995 vs the column's
   0 → 5), so the two surfaces **intersected** rather than joined; the seam traced that
   intersection circle.
   **Method — reuse the rim, don't bridge.** The floor and ceiling were already annuli (inner
   r 2.66, outer r 9.15, 128 segments). Rather than bridge two loops with mismatched vertex counts
   (96 vs 128, which would have produced a degenerate ~35 mm band), the column's own 96-vertex rim
   loops were moved onto the plane heights and **extruded straight out to r 9.15**, generating the
   floor and ceiling as part of the column mesh. Because the rim vertices are *reused* as the
   inner ring, it is watertight by construction — no bridging, no merge-by-distance, no threshold
   to tune. Then `recalc_face_normals` (the three meshes had inconsistent winding — floor faced
   down, ceiling and column faced up — and welding them without this would have averaged normals
   to near-zero) and smooth shading on every face. Result: the vertex normal at the old junction
   is now `(-0.136, 0, 0.991)`, a continuous average, instead of a 17° step.
   **Accepted side effect:** the merged object is 18.3 units wide, past `SHADOW_CASTER_MAX_SIZE = 6`,
   so the column **no longer casts its contact shadow** from the entrance spot. Lucas judged the
   room better with the seam gone; the stale claim was corrected in `src/main.js`'s comment.
   No code depended on the two deleted object names.

3. **Two Claude sessions on one Blender instance is a real hazard, and item 1 is what it looks
   like.** The MCP drives a single shared process — geometry edits land in the scene the other
   session is looking at, `bpy.ops` reads global selection/mode state, and the undo stack is
   shared. `public/current🟢.glb` is likewise one file with two writers. Before touching Blender,
   check `bpy.data.filepath`, `bpy.data.is_dirty` and `bpy.context.mode`, and back up the `.blend`
   **and** the GLB. Prefer the `bmesh`/data API over `bpy.ops` — it doesn't depend on ambient
   selection, so a concurrent session can't break it mid-script.

## Recent Changes (2026-07-30)

Detail for each of these lives in the structural sections above — "3D Mode: Lighting", "3D Mode:
Colour gradients on geometry", "GLB export recipe", "Nav bar iframe", "Cybercoffee project". This
list is the index; those sections are the reference.

1. **3D lighting: every fixture light was 16.6 units out of place.** `Box3.setFromObject(child)`
   reuses the parent's stale `matrixWorld`, so bboxes came back in model-local space and each room's
   light landed outside the room. Fixed with `.add(model.position)` on both the centre *and* the
   `pos.y` line — **not** `model.updateMatrixWorld(true)`, which also moves the spawn floor-probe
   and ejects the camera from the scene.
2. **`scene.environment` was the real cause of "splotchy" walls.** RoomEnvironment is not the
   uniform flood an old comment claimed — it supplied ~55% of NewRoom's wall light and 100% of its
   unevenness. Replaced with a genuinely uniform environment (`uniformEnvironment()`, built via
   `fromScene`, not `fromEquirectangular`); intensity calibrated by measurement to **0.175**.
   Horizontal spread on the reference wall: **24.4% → 2.7% of mean**, brightness held.
3. **MainRoom's light `distance` 15 → 11.5**, after it was measured reaching 3.3 units past
   NewRoom's near wall (walls block nothing without a shadow map).
4. **NewRoom's fixture is now a plain PointLight, not the spot it specified.** The spot never lit
   the room (it was one of the displaced lights), so its pool-on-the-podium look has never been on
   the site, and an even wall was what was wanted.
5. **Brown-room walls got a vertical floor→ceiling gradient** baked into a `WallGrad` colour
   attribute as `COLOR_0`. Bottom stays the wall's original brown `(0.73, 0.45, 0.23)`; top travels
   90% toward the ceiling colour → `(0.235, 0.135, 0.068)`, a 3.11× spread. **Live.**
6. **`MATERIAL_FIXUPS` added** — per-material overrides keyed on material name, next to
   `EMISSIVE_CLAMP`. Fixed the vaccine bottle's `label` (`metalness: 1.0 → 0`; a paper label is a
   dielectric and a fully metallic surface has no diffuse term), then brightened label and lid via
   `emissive`. Found along the way that **`envMapIntensity` does nothing here** (1.0 vs 6.0 →
   byte-identical frames), so it is deliberately not used.
7. **`grid: { x, z }` option for fixture lights.** BlueRoom's ceiling is a full-room emissive panel
   but was lit by a single point, making one hotspot per side wall that read as two light sources.
   Now 3×3 at `distance: 8`, total intensity conserved.
8. **Mobile 3D nav no longer collapses** behind the logo — the `.is-collapsible` / `.is-open`
   mechanism is gone entirely. Desktop untouched.
9. **Homepage nav shadow was missing for seconds in production.** The "no `.hero` → shadow on"
   branch was gated on `readyState === 'complete'`, which waits for the homepage's ~16 MB of media.
   Now `readyState !== 'loading'`. A production-only bug localhost cannot reproduce.
10. **Cybercoffee sticky scroll-spin now pins on mobile.** The ≤860px block was switching the pin
    off, so the frames advanced but the section scrolled past mid-spin. Pin restored, and `spinEnd`
    becomes 1 on narrow screens so the spin uses the whole pinned range. Verified: frames 1 → 56
    across the pin, pin offset held at 0 throughout. Machine widened `78% → 96%`.
    **Open:** ~186px of dead space above and below on a 390×844 phone — see "Cybercoffee project"
    for why that is a geometric floor and what the remaining options are.
11. **Blender file is now `severance_V21.blend`** (was `V18`). Lucas bumps the version as he works —
    confirm with `bpy.data.filepath` rather than assuming.
12. **Tried and reverted:** the same wall gradient on MainRoom's `Wall_Cylinder`. It exported
    cleanly but triggered the centre-tower flicker; GLB restored from backup and the Blender bake
    removed. Also recorded: the tower's emissive is pinned at exactly `EMISSIVE_CLAMP`, so raising
    it in Blender alone does nothing.
13. **Open / not done:** BlueRoom's two podium objects still read under-lit (cause diagnosed, fix
    not applied — see end of "3D Mode: Lighting"); a horizontal-FOV fix for the 3D camera's fisheye
    distortion was scoped but not implemented (vertical FOV 90 → **121° horizontal** at 16:9, where
    >110° reads as fisheye).

## Earlier Session Changes

Kept for reference. Older work (French removal, Unify design-story sections, hero blob, Virtual
Cooking rebuild, nav dropdown, `2D.html` divider fix) is folded into the structural sections above
rather than listed here — see "Languages / i18n," "Unify Page: Hero Blob Implementation," and the
layout-pattern entries.

> **Note:** a few items below describe code that no longer exists — most notably
> `.nav-island.is-collapsible` (removed, see "Nav bar iframe") and `scene.environmentIntensity = 0.22`
> with `RoomEnvironment` (replaced, see "3D Mode: Lighting").

1. **Virtual Cooking — Final result reordered.** `.result-image-pair` moved out from under "Instruction manual" to sit directly beneath the "Timer & ingredients" heading; that block now reads heading → images → caption → video.

2. **Unify — video backgrounds clipped away.** All 6 phone videos clipped to the phone bezel via per-file `clip-path` (see "Unify Page: Video Details"). Files unchanged; render-time only. Removed the constraint that the page background had to match the videos' baked-in grey.

3. **Unify — page background unified** to `var(--bg-surface)` (`#DCDCE3`), same as every other 2D page. Only possible because of change 2.

4. **`2D.html` landing card (Project 06 / Unify)** — `homepage.mov` clipped to the same phone-bezel `clip-path` used on `unify2d.html`; tile background dropped from `#D8D7DC` to `transparent` (no longer needed once the video is clipped).

5. **Kaffeemaschine app restored.** It had never been tracked by git in this repo — root cause was `public/kaffeemaschine/` being explicitly excluded in `.gitignore`. Removed that rule, copied the app (HTML + 7 assets) in from a working backup copy on disk, committed. See "Current Status" and "Assets" for details.

6. **Mac-Lamp (02) — substantially rebuilt.** No longer matches the generic "Standard pattern" below:
   - New "At a Glance" section added (placeholder copy, EN+DE) above the meta grid
   - Overview/Concept's side-by-side text panel removed; the diashow/gallery is now full-width
   - Gallery cropping bug fixed: frame was forced to a wide box with `object-fit: cover`, cutting the top/bottom off the photos' actual ~4:3 aspect. Now `aspect-ratio: 4/3` + `object-fit: contain`, frame capped at `min(988px, 100%)`, docked left (not centered); thumbnail row left-aligned under it
   - Gallery images 5–8 converted **HEIC → JPG** — HEIC only renders in Safari; Chrome/Firefox showed them blank. Files `5.jpg`–`8.jpg` added, `ITEMS` array updated, `.HEIC` originals left on disk unused
   - First 4 diashow items (`1.png` CAD render, `2.MOV` 3D-printing, `3.MOV` bandsaw, `4.MOV` sanding) pulled out of the gallery into a new **Process** section, ordered before Overview/Concept (badges renumbered: Process=0, Overview/Concept=1)
   - `1.png`/`2.MOV` laid out as alternating `.process-shot` blocks (caption above image, natural aspect ratio); `1.png` centered on the right-third line, `2.MOV` on the left-third line
   - `3.MOV`/`4.MOV` (the two portrait videos) rebuilt into a full **scroll-driven dual-video mechanism ported from Unify's `.scrolly`** — sticky-pinned pair, scroll-past-midpoint or click swaps which video is full-size, mirrored layout (text left, videos right). Namespaced `.lamp-scrolly*` to avoid colliding with Unify's own classes. Centered on the right-third line via `position: absolute; left: 66.667%; transform: translateX(-50%)` — chosen over a fixed margin-% because the pair's rendered width changes as the active/inactive video swap, and `translateX(-50%)` self-centers regardless of width
   - Hit the **sticky-positioning trap twice on one page**: both `html,body { overflow-x: hidden }` and `.page-wrapper { overflow: hidden }` were silently breaking `position: sticky` on the new scrolly section. Both changed to `overflow: clip`. See gotchas — this is a recurring trap because new 2D pages get bootstrapped from an older page's `<style>` block that predates the `clip` fix.
   - `.process-steps` (mac-lamp) / `.stagger-list` wrapper uses the same fluid-width centering formula as Unify's `.character-list` (`width: calc(520px + 40vw); max-width: 100%; margin: auto`) so alternating blocks don't sprawl apart on ultra-wide monitors

7. **Double Packaging (01) — rebuilt to match Mac-Lamp/Unify/Virtual Cooking structure.** Previously used a bespoke `specs-row`/`frame2`/`stack`/`step-tile` grid with forced-crop image cells; that system is fully removed.
   - New "At a Glance" placeholder section added (EN+DE)
   - Overview/Concept's boxed, shadowed `.overview-text` card converted to a plain `.guide-text` paragraph — same treatment as the other three pages; real copy (EN+DE) unchanged
   - Process section rebuilt as **5 alternating `.stagger-row`/`.process-shot` blocks**, same document order and exact real copy/headings as before (all i18n keys reused, nothing rewritten), each image at its **natural aspect ratio** (no crop): Modeling (portrait, stagger-row/left) → Topology (landscape, process-shot/right) → Vacuum Sim (near-square, stagger-row/left) → Shading (landscape, process-shot/right) → Final Render (landscape, process-shot/left)
   - Per user decision: individual per-step numbered badges (1–5) dropped; the "5 Steps · Modeling → Render" meta line next to the Process heading was kept
   - `.process-steps` wrapper uses the same fluid-width centering as Unify/Mac-Lamp

8. **GitHub Pages deployment configured** — see new "Deployment" section below for the full setup (workflow, custom domain, DNS).

9. **Homepage footer polish (`2D.html`).** Removed the "Built with care and way too much coffee" `.footer-note` line entirely (deleted the markup, its CSS rule, and both `footer-note` EN/DE translation keys). The `.copyright` line ("© Lucas Maher. All Rights Reserved.") was nudged up **13px total** (`transform: translateY(-13px)` on `.copyright`, applied in two passes — 8px then another 5px) so it sits level with the "top" scroll button beside it. Year updated **2025 → 2026** in all three places it lives: the HTML default text, `TRANSLATIONS.en['footer-copyright']`, and `TRANSLATIONS.de['footer-copyright']` (it renders via `data-i18n`, so editing just the HTML default isn't enough). The `.footer-logo` "top" button already had a hover lift matching the nav (see item 12); left as-is.

10. **Nav bar bottom-shadow-cropped-on-dropdown-close bug fixed.** Root cause: the `nav-collapse` `postMessage` handler on every host page was shrinking the `#top-bar` iframe to `90px` — a stale value that predates the current 140px-default nav sizing. At 90px the iframe's own bounding box clips the nav pill's neumorphic bottom shadow, so the shadow looked correct on first load (iframe starts at 140px) but visibly lost its bottom edge the moment you hovered the Craft dropdown and it closed again. Fixed by changing the `nav-collapse` target height from `90px` to `140px` (matching the default) on all 9 host pages. See "Nav bar iframe" above for the full before/after.

11. **Nav bar narrowed 10px per side on MacBook aspect ratios only** (`top_row_permanent_V3.html`). Two independent constraints needed updating because different screen sizes hit different ones: `.top-row` padding (`--island-edge-x`) is what actually constrains the pill on 13"/14" MacBooks, so it became `calc(var(--island-edge-x) + 10px)`; `.nav-island`'s `max-width` is what constrains it on 16" MacBooks, so that dropped `1306px → 1286px`. The existing `@media (min-aspect-ratio: 17/10)` rule still forces `max-width: 1330px` on true widescreen monitors, which has enough headroom that the extra padding never engages there — so wide-aspect nav width is untouched, exactly as requested.

12. **Dotted-divider half-cut-dot bug fixed at the root cause, site-wide.** Every `.dot-divider` (breadcrumb dividers under page headers) is a `radial-gradient` dot pattern tiled via `background-size: 10px 4px` + `background-repeat: repeat-x`. Because a divider's rendered width is essentially never an exact multiple of 10px, `repeat-x` was clipping the **final partial tile** — producing a half-rendered dot at the line's end, and only *sometimes*, depending on where the container's width landed relative to the 10px tile boundary (this is why it looked randomly broken rather than consistently). Root-cause fix: switched every instance to `background-repeat: space no-repeat`, which per spec tiles "as much as possible without clipping" — whole dots are pinned to both ends and the leftover space is absorbed into the gaps between dots. Applied across all 13 files with a `.dot-divider` (see "Known Patterns & Gotchas" below for the full file list and the rule to follow for any new divider).

13. **Hover-lift strength unified across the entire site.** Audited every `:hover` rule with a `transform`/`box-shadow` lift and found two inconsistent groups: neumorphic pills (`.contact-item` on the Contact page, `.item` accordion rows on the About page) were using a shallower `6px 6px 18px` shadow than the nav/footer's `11px 11px 24px`; and several scale-only elements (`.btn-view-work`, `.project-nav-item` on 6 project pages, `.gallery-thumb` on Mac-Lamp) used `scale(1.04)` or `translateY(-3px)` instead of the nav's `translateY(-2px) scale(1.03)`. Normalized everything to the nav's values — see "Known Patterns & Gotchas" below for the exact convention to follow on any new hoverable element.

14. **Copyright moved up another 5px, year corrected to 2026.** Item 9's `translateY(-8px)` on `.copyright` (`2D.html`) became `translateY(-13px)` after a follow-up nudge (later nudged again — see item 21 for the final value). "© 2026 Lucas Maher..." — the copyright text specifically; the *project* year tags on the landing grid (unrelated `2025` strings) were left untouched.

15. **Nav bar narrowed on MacBook aspect only (round 2 — 10px tighter per side, on top of item 11's earlier pass).** Same two-constraint pattern as before: `.top-row` padding (`--island-edge-x`) governs 13"/14" MacBooks, `.nav-island`'s `max-width` governs 16" — both nudged another 10px per side. The `min-aspect-ratio: 17/10` widescreen override (`max-width: 1330px`) still has enough headroom that neither change reaches wide-aspect monitors, so that tier is still untouched.

16. **Dotted-divider half-cut-dot bug — the real fix, superseding item 12's `background-repeat: space` attempt.** Item 12's CSS-only fix tested correctly in Chrome but the user reported the bug persisted live — root cause turned out to be a Safari/WebKit bug where `background-repeat: space` doesn't reliably avoid clipping on gradient-image backgrounds (confirmed via an isolated Chrome-only test: `space` rendered perfectly there, so the remaining failure had to be engine-specific). Replaced with a JS-computed exact-divisor fix — see the corrected "Dotted dividers" entry under "Known Patterns & Gotchas" for the full mechanism and the `<script>` snippet to reuse. **Lesson: a CSS spec behavior "should" work isn't the same as it working in every engine — verify the actual fix in the browser the bug was reported in (this site's real-world testing browser is Safari, per the existing `min-aspect-ratio` decimal gotcha), not just Chrome headless.**

17. **Favicon replaced.** Old icon was an unrelated purple abstract-blob SVG that only `index.html` linked to — every other page had no favicon at all. New icon is an orange (`#FF5C00`) circle with a white "LM" monogram, matching the nav's own "LM" badge initials and the site's accent color. See the "Assets" section above for the full file list, why VT323 was swapped for a bold system sans in the icon text (illegible at 16px), and which pages were deliberately skipped.

18. **`apple-touch-icon` fixed to be a solid orange square, not a transparent circle.** The circle-on-transparent design from item 17 is correct for the regular browser-tab favicon, but iOS/Safari doesn't respect transparency on `apple-touch-icon` (used for Home Screen, Safari Favorites/Start Page tiles, and macOS "Add to Dock") — it always imposes its own rounded-square mask and fills any transparent area with its own backdrop, so the transparent-cornered circle rendered as "circle floating inside a visible square." Regenerated `favicon-180.png`/`favicon-192.png` specifically as a full-bleed opaque orange square (same white "LM" mark, no circle mask) so the corners iOS reveals are already brand orange — see the corrected "Assets" entry for the full explanation and which files must stay circular vs square if regenerating.

19. **Hero image sub-pixel gap fixed on all 4 image-based project heroes** (`kaffeemaschine2d.html`, `mac-lamp2d.html`, `portfolio2d.html`, `virtual_cooking2d.html`). Root cause: `.hero` sizes itself via `aspect-ratio`, and the `<img>` inside was `width:100%; height:100%; object-fit:cover` — ordinary in-flow sizing. `aspect-ratio` can compute a non-integer container height, and the container's own border-box edge vs. the image's box edge can independently round to different device pixels, leaving up to a ~1px gap at an edge (most visible at the bottom, right above the `border-bottom` divider) where the page's own background shows through as a thin seam. Fix: overscan the image 1px past every edge of `.hero` (`position: relative; overflow: hidden;`) so the excess gets silently clipped and no rounding direction can leave a visible gap. **Correct CSS — `width`/`height` must be explicit, `inset` alone is not enough:**
    ```css
    .hero img {
      position: absolute;
      top: -1px; left: -1px;
      width: calc(100% + 2px);
      height: calc(100% + 2px);
      object-fit: cover;
      object-position: center center;
      display: block;
    }
    ```
    **First attempt used `inset: -1px;` with no explicit width/height and briefly shipped broken — every hero rendered zoomed in to a tiny crop.** Cause: an absolutely positioned *replaced* element (`<img>`, `<video>`) with `width`/`height` left at `auto` does **not** stretch to satisfy `inset`/`top`+`bottom`+`left`+`right` constraints the way a non-replaced `<div>` would — replaced elements fall back to their own intrinsic (natural pixel) size instead, per the CSS2.1 replaced-element sizing rules. So each image collapsed to its native dimensions, and `object-fit: cover` then cropped that already-tiny box down further. **Lesson: absolutely positioned images/videos always need explicit `width`/`height` (or `calc(100% + Npx)`) — never rely on `inset` alone to size them, only to position them.** `vaccine2d.html`'s hero is a different, intentional design (a letterboxed video with visible black bars via `object-fit: contain` at 88% height) and isn't subject to the original gap bug, so it was left as-is; `unify2d.html`'s custom blob hero doesn't use the `.hero`/`.hero img` pattern at all, also left alone.

20. **Project-nav footer divider — reported "cut off"/"doesn't go all the way down" on two separate occasions (Cybercoffee, then Virtual Cooking); fixed for real on the second pass, on all 6 pages that have one** (`kaffeemaschine2d.html`, `portfolio2d.html`, `mac-lamp2d.html`, `vaccine2d.html`, `virtual_cooking2d.html`, `unify2d.html`). Original implementation: an absolutely-positioned `.project-nav::after` pseudo-element with `top: 0; bottom: -13px;` — a negative overshoot meant to bleed 13px past `.project-nav`'s own box so the line would visually touch `.page-wrapper`'s outer border (13px ≈ the wrapper's 12px `padding-bottom` + 1px border), relying on the ancestor's `overflow: hidden`/`clip` to trim it flush at the right spot. **First fix attempt** (`bottom: -13px` → `bottom: 0`) removed the overflow-dependence but only made the divider span exactly `.project-nav`'s own content box — the user reported it still didn't reach the true bottom (visible as a gap below the line, above the outer card border) on Virtual Cooking. **Actual fix: stopped using a pseudo-element entirely.** Replaced it with a real `border-left: 1px solid var(--border-color)` on the second flex item, via `.project-nav-item + .project-nav-item` — a border on a flex item always spans that item's exact rendered height automatically, with zero positioning math and zero overflow-clipping dependency, so there's no possible browser inconsistency left to trigger. Paired with `margin-bottom: -12px` on `.project-nav` itself (canceling `.page-wrapper`'s `padding-bottom: 12px`, confirmed identical across all 6 pages) so the nav's own box — and therefore the new real border — now sits flush against the wrapper's inner border edge (verified via direct DOM measurement over CDP: 1px gap remaining, which is exactly the wrapper's own border stroke, i.e. correctly flush). **Lesson, now proven twice on this divider alone: don't reach for an absolutely-positioned pseudo-element + negative-offset-under-overflow-clip to make a line "reach" a container edge — use a real border on an already-correctly-sized box instead, whenever the geometry allows it (flexbox stretch, in this case).** Any new footer-style divider should follow this pattern, not the old pseudo-element one.

21. **Copyright nudged up a third time — final value.** `.copyright` (`2D.html`) `transform: translateY(...)` went `-8px` (item 9) → `-13px` (item 14) → **`-18px` (current/final)**. If it ever needs adjusting again, this is the single line to edit — search `2D.html` for `.copyright {`.

22. **3D mode — middle mouse button now also orbits the camera, not just right-click.** `src/main.js` gated the look-around drag on `e.button === 2` (right button) only. Generalized: the tracking flag was renamed `isRightDown` → `isLookDown`, and the `mousedown`/`mouseup` handlers now trigger on `e.button === 2 || e.button === 1` (right or middle). Middle-mouse-down also calls `e.preventDefault()` (suppresses the browser's default autoscroll-icon behavior) and a new `auxclick` listener guards against the same for good measure. See "3D Mode: Camera Controls" below for the full mechanism.

23. **About + Contact page hover effects rebuilt; root cause of the "flicker" was `animation-fill-mode: forwards`, not the hover values.** The hover lift on `.item` (About accordion rows) and `.contact-item` (Contact Email/LinkedIn/Instagram buttons) appeared to flicker rather than lift. The values were already correct — the real cause was that both elements also carry the `.anim` staggered fade-in class, whose `forwards` fill permanently re-asserts `transform: translateY(0)` at animation priority, outranking `:hover { transform }` in the cascade. See the `animation-fill-mode` entry under "Known Patterns & Gotchas" for the full mechanism and the verification. Fixed by switching `.anim` to `backwards` + dropping its base `opacity: 0` on both pages (entrance animation unchanged), then rebuilding both hover rules with the homepage **"top" button** (`.footer-logo:hover` in `2D.html`) as the size/shadow reference — `transform: translateY(-2px) scale(1.03)` + `box-shadow: 11px 11px 24px rgba(174,174,192,0.9), -8px -8px 20px rgba(255,255,255,1)`. Also removed the now-redundant `overflow: hidden` from `.contact-item` (nothing overflows it, and rounded-clip + scale is a secondary repaint hazard); **kept** it on About's `.item`, where it's required to clip the accordion body during the `max-height` collapse.
    **`backwards` was NOT sufficient — three passes were needed, and only the third actually worked.** Passes 1–2 (switching `.anim` to `backwards`; then adding `will-change`/`backface-visibility` + symmetric easing) tested clean in headless Chrome but the user still reported "flickers, and definitely doesn't ease out." **Root cause of the remainder: in Safari a finished CSS animation stays attached to the element and keeps suppressing `transition` on the property it animated.** So `transform` had no transition at all — it snapped instantly — while `box-shadow` (never in the keyframes) eased over 260ms. An instant geometry snap next to a 260ms shadow fade *is* the "flicker," and it's also literally "doesn't ease out." `animation-fill-mode` can't fix this, because the problem is the animation *existing on the element*, not what it fills with.
    **Actual fix — separate the two concerns structurally: the `.anim` fade-in now lives on a WRAPPER `<div>`, never on the hover target.** `contact2d.html`'s three `<a class="contact-item anim anim-N">` became `<div class="anim anim-N"><a class="contact-item">…</a></div>`; same for About's three `.item` rows. The hover element now reports `animationName: "none"` and zero attached animations, so nothing can contest its `transform` in any engine. With the conflict gone, the compositing hints were unnecessary and were removed, and the transitions were restored to **byte-for-byte match `.footer-logo`**: base `transform 260ms cubic-bezier(.2,.7,.2,1), box-shadow 260ms cubic-bezier(.2,.7,.2,1)` (the ease-out on leave) plus `:hover { transition: transform 150ms ease, box-shadow 150ms ease; }` (the enter). Verified over CDP: real intermediate matrices in **both** directions, staggered entrance unchanged (wrapper is `opacity: 0; translateY(10px)` at 120ms → `opacity: 1; transform: none` by 1.5s), all 3 contact `href`s intact, About's accordion still expands (276px), and `<div>`/`</div>` counts balanced on both pages.
    **Rule going forward: never put an entrance animation that touches `transform` on the same element as a `:hover { transform }`.** Put the animation on a wrapper. Cascade tricks (`fill-mode`) only mask it in Chrome.

24. **Project order changed site-wide; "This Website" (`portfolio2d.html`) removed entirely.** New order: **01 Unify → 02 Virtual Cooking → 03 Cybercoffee → 04 Mac-Lamp → 05 Double Packaging** (previously 01 Double Packaging → 02 Mac-Lamp → 03 This Website → 04 Cybercoffee → 05 Virtual Cooking → 06 Unify). Every place the project order/list is duplicated across the codebase had to be updated by hand — there is no single source of truth for it:
    - **`portfolio2d.html` deleted** (`git rm`). No `portfolio3d.html` ever existed, so no 3D-mode counterpart to remove.
    - **`2D.html` landing grid** — the "This Website" `.project-section` block removed outright; the remaining 5 rebuilt in new order with renumbered `Project 0X` labels. Re-established a clean alternating left/right layout (`.reverse` class on positions 2 and 4) — the pre-existing grid had **three different DOM-wrapping patterns** for the image tile across projects (tile-div-is-direct-grid-child vs. `<a>`-wraps-tile-div), and critically, `.project-section.reverse .project-tile { grid-column: 1 }` only takes effect when `.project-tile` is a **direct** grid child — for the `<a>`-wraps-tile pattern (Cybercoffee/Virtual Cooking/Unify's own asset markup) the `reverse` class silently no-ops and the visual side is actually determined by plain DOM auto-placement instead. Controlled every row's side via **DOM child order** (content-first vs. tile-first), not the `reverse` class alone, since that's the mechanism that's reliable across all three wrapping patterns; kept the `reverse` class present on rows where it happens to also apply correctly, purely for stylistic consistency with the rest of the file.
    - **Craft dropdown** (`top_row_permanent_V3.html`) — the "This Website" `<span>` removed, remaining 5 reordered. Its `data-nav="this-website"` translation wiring removed from the language-toggle IIFE (`NAV_LANG.thisWebsite` key + the `[data-nav="this-website"]` lookup, both en/de). Also found and cleaned **four separate, independent** inline `parentPath.includes('portfolio2d')` checks scattered across different IIFEs in this file (mobile-collapse detection, nav-shadow detection, help-button visibility, Craft-dropdown-init guard, logo-button click handler) — this file does not centralize its "which 2D page am I on" logic, so any future page addition/removal needs a manual sweep of all `is2DView`/`isXxx2D` blocks, not just one.
    - **Every remaining project page's `.project-nav`** (prev/next links, `.project-nav-number`, title text, `data-i18n` keys) rewired to the new chain. First project (Unify) now has **no previous** (empty `<div class="project-nav-item">` placeholder, first slot); last project (Double Packaging) now has **no next** (empty placeholder, second slot) — a deliberate change from the *previous* inconsistent state where Unify's "next" silently wrapped around to Double Packaging (01) while Double Packaging itself had no "previous," i.e. a one-directional, asymmetric loop that was never actually documented as intentional. Resolved it into a clean non-cyclic start/end, matching the one behavior that *was* documented (item 7 above: "no previous — this is Project 01, the first").
    - **i18n cleanup, per page:** removed now-dead `data-i18n` keys from each page's `TRANSLATIONS` object (en+de) wherever the corresponding `nav-*` span was removed/replaced — `nav-this-website` (mac-lamp2d.html, kaffeemaschine2d.html), `nav-prev`+`nav-double-packaging` (unify2d.html, no longer has a "previous" item), and an already-dead unused `nav-double-packaging` key on virtual_cooking2d.html that predated this change. Added a fresh `nav-prev` key (en `'<< PREVIOUS'` / de `'<< ZURÜCK'`, matching the site-wide convention) to vaccine2d.html, which never needed one before since it used to be the first project. **Not every neighboring project title has a translated `data-i18n` key on every page** — some pages only ever localized the specific neighbor they happened to link to (an existing site-wide inconsistency, not something this reorder fixed) — where a page's new neighbor has no existing translation, the title was left as plain English text rather than inventing a new key, matching how the site already handles several such cases (e.g. vaccine2d.html's "Mac-Lamp" project-nav title has never been localized).
    - **`portfolio/` image folder now orphaned** — files left on disk, nothing references them (see "Assets").
    - **Vite dev-server quirk, not a bug:** `curl localhost:5173/portfolio2d.html` still returns `200` with `index.html`'s content after deletion — this is Vite's default `appType: 'spa'` fallback (serves `index.html` for any unmatched route) with no `vite.config.js` present to override it. GitHub Pages has no such fallback, so the deleted page correctly 404s in production. Don't mistake this local-only 200 for the removal having failed.

25. **New responsive tier: below-MacBook shrink with a gradual padding fade, synced border removal, and a desktop-only shrink cap — site-wide, all 8 non-3D pages.** Third layout tier alongside the existing MacBook/wide-screen work (see "Widescreen-only tweaks" and the new "Below-MacBook shrink" entry under "Known Patterns & Gotchas" for the full mechanism and formula derivation). Summary: outer padding now fades linearly from `55px` at `1440px` viewport width to exactly `0px` at `860px` (previously floored at a hard `20px` and then jump-snapped to `0` at the unrelated `640px` mobile breakpoint); `.page-wrapper`'s border/margin are removed in a new `@media (max-width: 860px)` rule timed to land exactly where the fade reaches zero, so there's no visible pop; and a `@media (hover: hover) and (pointer: fine) { html, body { min-width: 860px; } }` rule caps how far **real desktop/laptop** browser windows can keep shrinking — narrower than that, the page content stays pinned at 860px and the excess is clipped (relying on the already-present root `overflow-x: clip`) rather than reflowing into the mobile layout or exposing a horizontal scrollbar. `pointer: fine`/`hover: hover` deliberately excludes touch devices, so real phones/tablets are untouched and keep reflowing all the way to their actual widths via the pre-existing `@media (max-width: 640px)` rules. Along the way, standardized `overflow-x` to `clip` on the 2 pages that had `hidden` (`vaccine2d.html`, `virtual_cooking2d.html`) and the 3 that had none at all (`2D.html`, `about2d.html`, `contact2d.html`) — required for the shrink cap's clipping to actually work, and consistent with the existing `overflow-x: clip`-not-`hidden` sticky-positioning rule elsewhere in this doc. Verified numerically via CDP (not just visually): padding at the exact midpoint (1150px) computed to `27.5px`, precisely half of `55px`; `body.scrollWidth` stayed pinned at `860` for a desktop/`pointer:fine` viewport narrowed to 600px, but correctly tracked the real `600` for an emulated touch/`pointer:coarse` viewport at the same width.

26. **Nav logo swapped from "LM" text to an exported Figma asset.** Pulled the logo frame from Figma (`s3BSUt18g4pL15dYCYknz4`, node `515-152`) — it turned out to be a raster photo export, not a vector, so the highest-res PNG (10736×7128) was processed in Python/PIL with a luminance-based alpha mask (`new_alpha = 255 - luminance`, forced output color pure black) to turn its white background into a smoothly anti-aliased transparent one, then cropped to content and resized to 400px wide → `public/images/site/logo-lm.png`. In `top_row_permanent_V3.html` the `<a class="logo" id="logo-btn">LM</a>` text became `<img src="/images/site/logo-lm.png" alt="" class="logo-mark" />`, with a new `.logo-mark` rule (`height: auto; display: block; pointer-events: none`) and the now-irrelevant font properties stripped from `.logo`. Per two follow-up "increase the size another 20%" requests, `.logo-mark`'s `width` was bumped **24px → 28.8px → 34.56px** (each pass a +20% compound increase) — the 44px circular `.logo` button itself was left untouched both times, only the image inside it grew.

27. **Cybercoffee's "Design process" intro paragraph — text-align fix.** `process-intro` on `kaffeemaschine2d.html` had shipped with `text-align: center; max-width: 720px; margin: 0 auto;` inline, centering it against the left-docked convention every other `.guide-text` paragraph on the site follows. Removed all three properties so it renders as a plain left-aligned `.guide-text` block like the rest of the page.

28. **Double Packaging — Final Render caption removed, video nudged up 20px.** The paragraph under the "Final Render" process step (`final-render-text`) was deleted from the markup entirely, and the now-unused `final-render-text` key removed from both `en`/`de` in `vaccine2d.html`'s `TRANSLATIONS`. `.process-video`'s `margin-top` changed from its normal `clamp(44px, 9vw, 100px)` to an inline `clamp(44px, calc(9vw - 20px), 100px)` so the video sits 20px higher without touching the shared class rule other steps still use.

29. **German translations added/resynced across all four pages that got new or enriched English copy this session** (`virtual_cooking2d.html`, `kaffeemaschine2d.html`, `mac-lamp2d.html`; `vaccine2d.html` spot-checked). Virtual Cooking's `TRANSLATIONS` object still held ~20 dead keys from an earlier page layout (`section-overview`, `section-instructions`, `section-controllers`, `reflection-tag-1/2`, etc.) with no matching markup anywhere — all removed, replaced with the 16 keys the current HTML actually uses (`glance-lead`, `section-problem`, `problem-text-1/2/3`, `section-process`, `process-intro`, `panel-manual-text`, `panel-ingredients-text`, `panel-timer-text`, `process-blender-text`, `process-vscode-text`, `section-result`, `result-manual-heading`, `result-manual-text`, `result-timer-heading`, `result-timer-text`), each with a fresh German translation. Cybercoffee and Mac-Lamp's EN copy already existed but their German values were stale/placeholder (`hero-desc` in particular had completely different content — an old "why" paragraph vs. the current "how to use it" walkthrough) or, for Mac-Lamp's `result-text`, missing the DE key outright — all rewritten to match current EN.
    **Verification method, per explicit user instruction ("double check the translation roughly takes up the same size... before moving on to another section"):** rather than eyeballing character counts, drove headless Chrome over CDP (`Runtime.evaluate`), called `applyLang('de')` on the live dev-server page, and measured each translated element's real rendered `getBoundingClientRect().height` against its English counterpart, dividing by `getComputedStyle().lineHeight` to get an exact line-wrap count for both languages. Any German block that wrapped to more lines than its English counterpart was rewritten shorter (content trimmed, not just reworded) and re-measured until it matched — iterated live against the actual page rather than a static string-length guess, since font metrics/kerning make character-count parity an unreliable proxy for wrap-line parity. Caught and fixed 8 overflowing blocks this way across the four pages (Virtual Cooking: `glance-lead`, `problem-text-1`, `process-intro`, `panel-manual-text`, `panel-timer-text`; Cybercoffee: `glance-lead`, `process-1`, `hero-desc`; Mac-Lamp: `glance-lead`; Double Packaging: `process-intro`, `step1-text` — the latter two had been left as pre-existing stale German from before this pass and hadn't actually been checked against the current English length). Every element across all four pages now matches its English line count exactly (or comes in shorter, never longer).

30. **Unify — design-story sections wired into `TRANSLATIONS`; 3 pre-existing overflowing German blocks fixed.** The user reported "many text blocks on unify page are not translated to german." Investigation found two distinct causes: (a) the Design Process/colors, Typography, Character-design, and Final Product sections (added in an earlier session, see "Unify page (01)" status list) had never been wired to i18n at all — no `data-i18n` attributes, plain hardcoded English in the markup — so switching to German silently left them in English, matching the exact symptom reported. Added `data-i18n` to all 19 text nodes across these sections (`section-design-process`, `colors-title`, `colors-text`, `typography-title`, `typography-text`, 3× typography-card label/spec/preview triplets, `characters-title`, `characters-text-1/2/3`, `section-final-product`) and wrote fresh German for each. (b) Separately, three *already-wired* keys (`overview-text`, `feat-timetable-text`, `feat-socials-text`) had German translations from an earlier session that had never been checked against rendered line count — they overflowed their English counterpart by 1, 3, and 2 lines respectively (`feat-timetable-text` was the worst: 318px vs English's 245px). All shortened and re-measured via the same CDP line-height method as the other four pages (see item 29) until every block matched or came in under its English height — `characters-text-1/2/3` land 2px over (an imperceptible sub-pixel difference from kerning, not an extra wrapped line) and were accepted as-is; everything else is an exact or better match.

31. **3D-only fix: nav bar hover shadows no longer bleed past the bar's rounded edge.** In `top_row_permanent_V3.html`, `.pill:hover`/`.logo:hover` apply a large neumorphic box-shadow (`11px 11px 24px` + `-8px -8px 20px` blur) that always extends visibly past the hovered element's own box — that's true in both 2D and 3D, but only showed as a bug in 3D. Root cause: `.nav-island` (the outer rounded bar containing the logo, view toggle, and Craft/About/Contact links) has `overflow: visible` and its own solid `background: var(--bg-surface)`, identical to the flat page background on every 2D page — so the shadow bleed was always happening, it just blended invisibly into the matching-colour page background there. In 3D, the page behind the nav is the Three.js canvas, not a flat matching colour, so the same bleed appeared as a visible glowing smudge past the bar's rounded silhouette. Fixed by adding a 3D-only class: the existing `is2DView` path-detection IIFE (already computing this per page, see the "four separate checks" gotcha above) now also does `if (!is2DView) navIsland.classList.add('is-3d-view')`, paired with a new CSS rule `.nav-island.is-3d-view { overflow: hidden; }`. 2D pages are completely untouched (verified: `.nav-island` there still reports `overflow: visible` and only the pre-existing `is-2d-mode` class). Verified the fix itself by loading the nav standalone in headless Chrome, dispatching a real CDP mouse-move (not a synthetic `:hover` — that doesn't trigger real `:hover` styling) onto the Craft/About/Contact pill, and pixel-diffing a screenshot with the clip on vs. off: before, hovering "About" produced a bright halo bleeding past the bar's top-right corner; after, the same hover state clips cleanly at the bar's own rounded edge. `overflow: hidden` on `.nav-island` was already a safe, precedented pattern in this file — the existing mobile-3D `.nav-island.is-collapsible` rule (used for the collapse-behind-the-logo animation) already does the same thing without issue, and since nothing inside `.nav-island` uses `position: fixed` relying on it as a containing block (the Craft dropdown is `position: fixed` directly off the viewport, unaffected by a non-transformed ancestor's `overflow`), there was no risk to the dropdown or other nav features.

32. **About/Contact page hover — replaced with the working 3D-page version, after the earlier `.anim`-conflict fix (item 23) still didn't feel right to the user.** Item 23's fix was structurally correct (moved `.anim` off the hover element onto a wrapper, eliminating the flicker) but kept the hover shadow byte-for-byte matched to the homepage's `.footer-logo` "top" button — a dramatic, large lift (`11px 11px 24px` / `-8px -8px 20px`). The user pointed out `about3d.html`/`contact3d.html` (the 3D-mode equivalents of these pages, small standalone overlay files, not iframe-loaded) already had correct-feeling hover on their own `.item`/`.contact-item`, and asked to replace the 2D versions' buttons with the 3D ones rather than iterate further. Root cause of the feel difference: 3D's hover is a much subtler, proportional deepening of the *resting* shadow (`-6px -6px 18px @ white` / `6px 6px 18px @ 0.8`, scaled up only slightly from the resting `-5/-5/12` / `5/5/12`), with `transition: box-shadow 300ms ease-out, transform 300ms ease-out` as the base and `150ms ease` on hover — completely different in character from the "big lift" convention item 13 had unified the rest of the site onto. Ported `.item` (`about2d.html`) and `.contact-item` (`contact2d.html`) CSS to match `about3d.html`/`contact3d.html` exactly (box-shadow values, transition timing, and — a detail the earlier fix had deliberately removed — `overflow: hidden` back onto `.contact-item`, since the 3D version has it and it's harmless there). Confirmed zero leftover references to the old `11px 11px 24px` / `260ms cubic-bezier(.2,.7,.2,1)` values in either file. Per the user's explicit instruction, the *size* wasn't touched — `.item-label`/`.contact-label` font-size and `.btn` dimensions stay the 2D page's own fixed values (`20px` / `38×37px`), not adopted from the 3D pages' `clamp()`-based responsive versions (though these are numerically almost identical anyway at desktop widths). The `.anim`-on-a-wrapper structure from item 23 is unchanged and still required — 3D pages have no entrance animation at all so this conflict never existed there, but 2D pages still stagger-fade in on load, so the wrapper split still matters. Verified via CDP: dispatched a real mouse-move (not a synthetic `:hover`) onto `.item`/`.contact-item` on both pages and read back `getComputedStyle` — box-shadow and transform now match the 3D pages' hover state exactly; also confirmed the accordion still opens/closes, German translations still apply, and all three contact `href`s are intact.

33. **Favicon mark swapped from typed "LM" text to the real logo asset.** Once `logo-lm.png` (the Figma-exported logo mark, see item 26) existed, the favicon's monogram — previously a bold-sans "LM" string baked into `favicon.svg` — no longer needed to approximate the logo with text. Recolored `logo-lm.png`'s black shape to pure white (RGB→255 with the original alpha preserved), then composited it onto the existing orange (`#FF5C00`) circle badge at a 2048px supersampled resolution and downsampled per target size (16/32/48/512 + `favicon.ico`) via Pillow/LANCZOS for anti-aliased edges at every size — same orange-circle brand language as before, just the real mark instead of typed text. `favicon.svg` was rebuilt to embed a base64 raster of the circle badge (the mark itself is raster art with no traced vector path, so a hand-written `<circle>`+`<text>` SVG, as before, is no longer possible — self-contained embedded-image SVG is the closest equivalent). `favicon-180.png`/`favicon-192.png` regenerated the same way but onto the existing opaque full-bleed orange square (no circle mask), preserving the iOS-transparency fix from item 18. Verified all 8 regenerated files still serve `200` from the dev server and the SVG renders correctly via a CDP screenshot.

34. **3D scene model swapped: `severance_V23.glb` → `portfolio_scene.glb`.** In `src/main.js`, the `GLTFLoader.load()` path changed to the new file (user-provided, dropped into `public/`). The scene-loading code is fully data-driven off the model's own node names/bounding box — collision filtering uses relative size thresholds computed from the model's own dimensions, and interactive objects are matched via the `CONTENT` dictionary (`node name → overlay content`), not hardcoded coordinates — so most of it required no code changes. One key had to be updated: `'YellowRoom_CoffeeTable001'` → `'YellowRoom_CoffeeTable'`, matching the new model's node name for the same coffee-table object (the old model had a `001` suffix, the new one doesn't). `'NewRoom_Podium'` (→ `/vaccine3d.html`) needed no change — the node name is identical in both files. Verified via headless Chrome with SwiftShader software WebGL (`--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader` — plain `--disable-gpu` headless has no WebGL at all and silently fails to render): model loads with no errors, `Clickables gefunden: 2` (matches the 2 `CONTENT` keys), collision filtering runs cleanly across all 164 nodes with no crashes, and the spawn-point probe finds a valid floor position (screenshot confirmed: camera spawns facing the vaccine-bottle podium, nav bar renders correctly on top).
    **Important — the new model is much richer than the old one, and most of it isn't wired up yet.** Inspecting the glTF JSON directly (`portfolio_scene.glb` is a single self-contained binary glTF, no external textures) shows named node groups matching *every* project on the site, not just Vaccine: `Pivot_MacLamp`/`Pivot_MacLamp_Table` (two Mac-Lamp instances), `Pivot_Kaffeemaschine` (the Cybercoffee egg — `egg-body`, `display-screen`, `btn-L1..3`/`btn-R1..3`, `chev-L1..3`/`chev-R1..3`), `Pivot_UNify` (the Unify blob character — `Figur_Body/EyeL/EyeR/PupilL/PupilR`), `Pivot_VRPanel` (Virtual Cooking's silver panel — `Left_Card`/`Left_Glyph`/`Left_Heading`/`Left_Strip*`), and a second bottle instance `Pivot_Bottle` (separate from the podium's `Pivot_Bottle_Podest`). There are also two creature/character props (`PinkRoom_Creature_*`, `Monster2_*`) that don't obviously map to any project. **None of these are in the `CONTENT` dictionary yet** — only the pre-existing `NewRoom_Podium` (Vaccine) and `YellowRoom_CoffeeTable` (placeholder) are clickable; every other named group currently just renders as scenery. Wiring the rest up (which pivot → which project page, and what should happen to the two ambiguous creature props and the second bottle instance) needs the user's input on the intended mapping before guessing — flagged to the user as a natural follow-up, not done this session.

35. **Root cause found: the camera's eye-height constant was left over from the old (now-replaced) 3D model and put the viewer underground in the new one.** After the item-34 scene swap, the user asked twice to "increase the eye level by 30%" — each time `playerHeight` (added to the spawn-probe's `floorY` to get `camera.position.y`) was reduced in magnitude by 30% (`-1.3601 → -0.9521 → -0.6664`, since it's negative and the existing R/F debug-key comment confirms less-negative = higher). Both passes were verified via headless-Chrome screenshots that did show the camera moving — but the user reported neither was perceptible. Root-caused by parsing `portfolio_scene.glb`'s node transforms directly (walking the glTF node hierarchy, reading each mesh's accessor `min`/`max` to get world-space bounding boxes): the spawn probe's `floorY` (≈0.018) lands on `MainRoom_Floor`'s top surface, and `NewRoom_Podium` is a real 0.5-unit pedestal with the room's ceiling starting ~5 units up — confirming this scene is roughly 1 unit ≈ 1 meter. Against that, `playerHeight = -1.3601` put the camera **1.36 units *below* the floor**, not above it — a magic constant hand-tuned for `severance_V23.glb`'s entirely different coordinate scale that nobody re-tuned when item 34 swapped the model. Both 30%-reduction passes only made the underground offset smaller (1.36 → 0.95 → 0.67 units under the floor) — the camera was underground the entire time, which is why no amount of relative adjustment read as "higher": it never crossed back above ground. Fix: replaced the stale negative constant with a real positive standing eye-height, `playerHeight = 1.6` (a normal adult eye height at the scene's ~1-unit-per-meter scale, with headroom to spare under the ~5-unit ceiling). Verified via headless Chrome + SwiftShader: camera now sits at `floorY + 1.6 ≈ 1.62`, correctly above `MainRoom_Floor`, and the rendered screenshot shows a completely different, correctly-elevated standing perspective (not the marginal shift the two prior "30%" passes produced). **Lesson: a hand-tuned magic constant carried over from a replaced asset is a prime root-cause suspect once relative (percentage-based) tweaks to it visibly do nothing — verify the constant's sign/magnitude against the new asset's actual geometry (via glTF node/bbox inspection) rather than continuing to scale it.**
    After this fix, the user kept iterating on eye height with further relative "increase/decrease by N%" requests (all applied the same way: shrink/grow the signed `playerHeight`'s magnitude by N%, since less-negative/more-positive = higher). One request — "revert to original position, then move up 20%" — was ambiguous between the known-broken `-1.3601` and the fixed `1.6`; asked the user directly via `AskUserQuestion` rather than guessing, since reverting to the broken constant would silently reintroduce the underground bug just explained. The user explicitly chose the literal original (`-1.3601`), so subsequent "+20%" requests were applied to that broken baseline as asked (now `-1.3601 × 0.8 × 0.8 × 0.9`, still underground, just less deep each time) — complied with the explicit choice rather than re-litigating it, but the in-code comment and every reply flagged that it's still underground so the user always knows the current state.

36. **New debug key: `P` dumps the live camera position/angle as a ready-to-paste spawn override, and the site now opens on a fixed user-chosen spawn point instead of the auto-detected one.** The user wanted the page to always open at one specific, exact spot/angle in `portfolio_scene.glb` (a framed view of the green central-column pillar with doors either side) — impossible to reproduce precisely from a screenshot alone (especially the look direction), so a new debug key was added alongside the existing R/F height keys in `src/main.js`: pressing `P` logs and copies to the clipboard a snippet (`spawnPos = new THREE.Vector3(x,y,z); spawnYaw = …; spawnPitch = …;`) built from the live `camera.position`/`yaw`/`pitch`. The user pressed it in their own Safari tab at the desired spot and pasted the result back. That exact position/rotation is now hardcoded right after the existing floor-probe spawn logic in the `GLTFLoader.load()` callback: `camera.position.set(2.2970, -0.7653, 9.6615); yaw = 2.3400; pitch = 0.0540; applyRotation();`, then `spawnPos`/`spawnYaw`/`spawnPitch` are re-captured from those values (so the reset-view behavior returns here too). **Important subtlety this relied on:** `yaw`/`pitch` alone do nothing to the camera until `applyRotation()` (`camera.rotation.y = yaw; camera.rotation.x = pitch`) is actually called — the pre-existing floor-probe spawn code only ever *stored* `spawnYaw`/`spawnPitch` for later, it never called `applyRotation()` at spawn (which is why every previous spawn always faced the default yaw=0/pitch=0 direction regardless of the probed position). The floor-probe/collision-detection code above the override is deliberately left untouched — `floorY`, `collidables`, and `clickables` from that pass are still needed for live movement collision and the per-frame `floorY + playerHeight + bob` height system; only the *final* camera position/rotation gets overridden. Verified via headless Chrome: console log confirms `Kamerastart: x=2.30 y=-0.77 z=9.66`, and a screenshot comparison shows the same pillar/doors/ceiling framing as the user's reference screenshot.

37. **`vaccine3d.html` deleted; clicking a 3D-scene object now navigates directly to its 2D page instead of opening an overlay, and 4 more project objects got wired up.** Previously only the Vaccine podium was interactive, and clicking it opened `#project-overlay` (a scaled-iframe popup embedding `vaccine3d.html`, a standalone Blender-viewport-style page). All of that — `vaccine3d.html`, `#project-overlay`/`#project-wrapper`/`#project-frame` markup in `index.html`, matching CSS in `src/style.css`, and the whole overlay apparatus in `src/main.js` (`scaleProjectFrame`, `VACCINE_NATIVE_W`, its resize/click/escape/close-button listeners) — was removed. The click handler now does `window._nav(data.url + '?from=3d', 'left')` (the same slide-transition helper the site already uses for 2D↔3D navigation) instead of opening an overlay. The podium mesh itself (`NewRoom_Podium`) was deliberately dropped from `CONTENT` — clicking the pedestal now does nothing, only the bottle sitting on it navigates. Four more project pivots got wired to their pages in `CONTENT`: `Pivot_MacLamp`/`Pivot_MacLamp_Table` → `/mac-lamp2d.html`, `egg-rig` → `/kaffeemaschine2d.html`, `Pivot_UNify` → `/unify2d.html`, `Pivot_VRPanel` → `/virtual_cooking2d.html` (plus the existing bottle → `/vaccine2d.html`). Verified by dumping the live `clickables` array's mesh names from the running scene.

38. **3D-linked project pages show a fixed "Exit" pill instead of the usual nav bar, positioned to never overlap the page frame's border.** The `?from=3d` query param added in item 37 is checked by a small script added to the end of all 5 project pages (`vaccine2d.html`, `mac-lamp2d.html`, `kaffeemaschine2d.html`, `unify2d.html`, `virtual_cooking2d.html`): if present, it hides `#top-bar` and injects a fixed pill linking back to `/`. Originally placed top-right, then moved to top-left per request, with a live-measured position — matching this codebase's established pattern of measuring real geometry via `getBoundingClientRect()` rather than guessing a CSS breakpoint (see the dot-divider fix).
    **`positionExitBtn()` CENTRES the pill in the margin between the viewport edge and the frame border** (`Math.min(MARGIN_GAP 34, margin / 2)`), falling back to `wrapperLeft + INSET_GAP 26` — tucked inside the frame — when that margin is under `MIN_SIDE 14` per side. **This replaced a flat `34px` offset that was wrong on exactly one band: MacBook widths.** A fixed offset only checks that the button *box* fits, and at 1440–1512 the margin is 110px against a 76px pill, so 34px put its right edge at **exactly 110 — flush against the border, gap 0** — and the raised shadow (5px offset + 12px blur ≈ 17px of spill) ran straight over the frame line. Centring gives 17px either side, which is precisely the room that shadow needs, so the geometry now derives from the shadow instead of a hand-tuned nudge. **The lesson: a fixed offset that clears the element's box can still fail once its shadow is counted — size the gap from the shadow's reach.** Above ~1700px the `MARGIN_GAP` cap takes over and nothing changed; narrow widths keep the inset branch. Verified numerically across 1280/1440/1470/1512/1728/1920/2560 and on all 5 pages (gap `0 → 17px` on the MacBook band, identical elsewhere), plus a screenshot of the corner.

39. **Root-caused "the other 3D objects don't open their project pages" — two separate bugs, one already fixed in Blender, one a false alarm.** The user reported the Unify figure, Cybercoffee egg, and VR panel weren't clickable even standing right in front of them. Investigation initially misfired twice: a first click-simulation test used stale camera matrices (calling `project()` before `updateMatrixWorld()`, giving nonsense NDC coordinates for 2 of 6 objects) and a second aimed at `egg-body`'s own transform pivot, which — as later confirmed by inspecting its world-space bounding box — sits outside its own visible geometry, so "aim exactly at the object's position" missed the mesh entirely; both were artifacts of the *test method*, not real bugs (a grid of clicks across the actual visible mesh area hit reliably everywhere). The user separately had another Claude instance investigate on the **Blender** side and found the real cause: earlier in-session Blender work had merged/reparented the egg and VR-panel meshes and duplicated the Unify creature, which silently renamed the *reachable* in-room copies away from the names `CONTENT` matches on (`egg-rig`, `Pivot_VRPanel`, `Pivot_UNify`) — those names still existed, but only on unreachable staging duplicates parked off in the portfolio row (~y 38–55) that a player can never walk to. Fixed with **Blender renames only, no code change**: the reachable objects were renamed back to `egg-rig`/`Pivot_VRPanel`/`Pivot_UNify` (the staging duplicates renamed to `*_staging` first so Blender didn't collide/append `.001`), then `portfolio_scene.glb` was re-exported. Verified after re-export: live `clickables` array grew from 8 to 32 meshes across all 7 `CONTENT` keys, and a full click-simulation pass confirmed all 5 project objects now correctly fire `window._nav()` with the right URL. **Separately flagged, and disproven:** the Blender-side investigation, parsing the raw GLB file, found the bottle's node name has a literal space (`"bottle body_Podest"`) versus `CONTENT`'s underscore key (`'bottle_body_Podest'`) and suspected this as a live bug. Checking the *loaded* Three.js scene (not the raw file) showed the object's actual runtime `.name` is `"bottle_body_Podest"` — Three.js's GLTFLoader normalizes the space to an underscore on import, so this never manifested as a real mismatch; no fix was needed. **Lesson: when a "found via static file inspection" bug report and "found via live browser testing" disagree, trust the live runtime — the loader can normalize things the raw file's bytes don't show.**

40. **Clicking a 3D-scene object and then hitting "Exit" now returns to the exact spot/angle you clicked from, instead of resetting to the fixed spawn.** Since item 37 replaced the old overlay with a real page navigation, the round trip is a full reload of `index.html` — the entire Three.js scene tears down and reinitializes, so there's no in-memory state to fall back on. Fixed with `sessionStorage` (the same mechanism the page-slide transition already uses for its own direction flag): right before `window._nav()` fires in the click handler, `{x, y, z, yaw, pitch}` is saved to `sessionStorage['_3dReturnState']`. In the `GLTFLoader.load()` callback, right where the fixed-spawn override (item 36) used to unconditionally set `camera.position`/`yaw`/`pitch`, it now first checks for this saved state — if present, it's read, parsed, applied, and **immediately removed from `sessionStorage`**, and the fixed spawn is skipped entirely; if absent (a fresh visit — direct link, bookmark, or the nav bar's own 2D→3D toggle), the fixed spawn runs exactly as before. Consuming (not just reading) the saved state on every load is what keeps this safe: a subsequent fresh visit after a restore has nothing left to accidentally reuse. Verified with a full round-trip test in a single tab (sessionStorage doesn't survive across tabs, only within one, so this only works right for real users clicking through in the same tab — matches how they'd actually use it): moved the camera to an arbitrary test position/angle near the bottle, dispatched a real click (not a direct `window._nav()` call, so the actual save-on-click code path ran), confirmed `vaccine2d.html?from=3d` loaded with the exact position saved in `sessionStorage`, then navigated back to `/` (simulating the Exit button) and confirmed the camera landed back at that exact position/angle rather than the fixed spawn — and confirmed `sessionStorage['_3dReturnState']` was `null` afterward, proving the consume-once behavior. Works for the Exit button (a plain `<a href="/">`) and the browser's native back button equally, since both are just navigations to `/` in the same tab and `sessionStorage` doesn't care which one triggered it.

41. **3D-linked project pages also hide the `.project-nav` prev/next footer, not just the top nav bar.** A 3D-scene click is meant to open exactly one project page with no way to hop sideways to a different project — the prev/next footer (e.g. "01 << PREVIOUS UNIFY" / "NEXT >> 03 CYBERCOFFEE") let you do exactly that, so it defeats the point of the `?from=3d` mode. Same `?from=3d` script block added in item 38 (all 5 project pages) now also does `document.querySelector('.project-nav').style.display = 'none'` right alongside hiding `#top-bar`. Normal 2D access (no query param) is completely unaffected — the footer and its working prev/next links stay exactly as they were. Verified across all 5 pages in both states: `.project-nav` computes to `display: flex` with no Exit button present under normal access, and `display: none` with the Exit button present under `?from=3d`.

42. **`about3d.html`'s content scrolled with a visible native scrollbar inside the 3D scene's About overlay.** Unlike `contact3d.html` (`html, body { overflow: hidden }`), `about3d.html` never set an `overflow` rule on `html, body` — its accordion + photo content is legitimately taller than the fixed `#about-wrapper` box it's embedded in via iframe, so the iframe's own document scrolled natively and showed a scrollbar down its right edge. Clipping it outright (`overflow: hidden`, matching Contact) wasn't the right fix here, since About's content is genuinely taller than the box and needs to stay reachable — the fix instead was to keep it scrollable but hide the scrollbar chrome, reusing the exact `scrollbar-width: none` / `::-webkit-scrollbar { display: none }` pattern already used site-wide on the 2D pages for their own custom `#scroll-track` UI. Verified: `getComputedStyle(document.documentElement).scrollbarWidth` now reports `"none"` while `scrollHeight` (890px) still exceeds `clientHeight` (600px) — content stays fully scrollable, just without the visible scrollbar.
    `severance_V23.glb` has since been deleted by the user (see item 43).

43. **This session (loading screen, controls intro, i18n sweep, GLB rename).**
    - **Loading screen on `index.html`:** full-screen page-colored overlay, centered neumorphic circle (pressed inset shadow, max 192px) filling bottom-up with orange liquid (rotating-wave surface) and a VT323 0→100% counter. Driven by real GLTF download progress (`loader.load` onProgress in `src/main.js`) with easing; a **3-second minimum fill time** caps the target at `elapsed/3000` so fast loads still animate. On 100% it fades (1.2s) and removes itself; also dismisses on load error. **Gated to once per tab** — see "Intro gate" below.
    - **Fullscreen controls intro (`public/controls_fullscreen3d.html`):** shown automatically beneath the fading loader via a hidden fixed iframe in `index.html` (`z-index: 9999`, transparent background). Content panel matches the windowed controls overlay's size (66.66vw × 66.66vh, opaque `--bg-base` inside its thin border); the area outside is a translucent `rgba(220,220,227,0.85)` veil over the scene. Any click/key posts `intro-controls-dismiss` → parent fades (700ms) and removes the iframe. The old first-visit auto-open of the windowed controls overlay (`localStorage._seenIntro` in `src/main.js`) was **removed** — this intro replaces it; the "?" button still opens the windowed overlay.
    - **Intro gate (`window._introGate`, `index.html`):** one small script above `#load-overlay` decides ONCE per page load whether *both* the loading screen and the controls intro run, and stores the answer on `window._introGate.show`. Each of the two blocks checks it and, if false, removes its own element and returns early — the loader additionally never defines `window._loader`, which is the whole opt-out since `src/main.js` only ever calls it behind `if (window._loader)`. The `#intro-controls` iframe deliberately has **no `src` in the markup**; it's assigned from JS only when the intro will actually show, so a gated reload doesn't fetch `controls_fullscreen3d.html` at all (still early enough to preload during the 3s minimum fill).
      **The store is `sessionStorage.introSeen`, and that choice is the whole behaviour:** sessionStorage survives reloads within a tab but the browser wipes it when the tab closes — so the intro is skipped on every reload (including a hard reload) *and* on returning from a 2D project page in the same tab, but plays again in a genuinely fresh tab. **`localStorage` would be wrong** (shows once ever, then never again). The flag is set immediately on load rather than when the loader finishes, so reloading part-way through still counts as seen. Wrapped in `try/catch` so private mode / disabled storage falls back to showing rather than throwing.
      Deliberate edge cases: session restore (Cmd+Shift+T, "reopen windows from last time") and tab duplication both carry sessionStorage over, so the intro stays skipped there. Verified over CDP across fresh-tab / reload / reload-again / new-tab. **When testing this, wait for a real `Page.loadEventFired` before probing** — a fixed delay can read the pre-reload document and make a correctly-gated reload look like it still showed the intro.
    - **i18n sweep — every remaining untranslated element wired for EN+DE:** the five 3D overlay pages (`about3d`, `contact3d`, `craft3d`, `controls_open3d`, `controls_fullscreen3d`) had **no i18n at all** — each now has a small self-contained script (inline `T = {de:…, en:…}`, `data-i18n`/`data-i18n-html` attributes) that reads `localStorage.lang` on load (default `'de'`) and re-applies on the `storage` event, so switching language in the nav updates already-open overlays. about3d's German copy is 1:1 from about2d's TRANSLATIONS (its accordion `max-height: 700px` has headroom for the longer German). Also wired: breadcrumbs on kaffeemaschine/mac-lamp/vaccine (`Portfolio / Projekte / …`); `2D.html` "Project 01–05"→"Projekt", "top"→"oben", tags Industrial→Industrie / Fabrication→Fertigung / Lighting→Beleuchtung / Texturing→Texturierung; the **mobile hamburger menu** (Craft/About/Contact → Projekte/Über mich/Kontakt) on all 8 2D pages + `index.html` (which got its own mini i18n block listening for the nav's `lang-change` postMessage); contact Email→E-Mail (2D+3D); Cybercoffee "[ click me ]"→"[ klick mich ]". Proper nouns (project names, Blender/Figma/LinkedIn, Campus/Studio/Mobile/Prototyping) deliberately left untranslated. Controls DE: STEUERUNG / BEWEGEN / KAMERA / ANSEHEN / RESET.
    - **GLB renamed + cleanup (user-driven):** the scene model is now `public/current🟢.glb` (was `portfolio_scene.glb`, briefly `portfolio_scene🔴.glb`); `src/main.js` loads `/current🟢.glb`. `severance_V23.glb` deleted from disk.

44. **This session (3D lighting rebuilt around the ceiling fixtures; intro gated to once per tab; 3D-page slide-in removed).**
    - **Lighting rebuilt — see "3D Mode: Lighting" below for the full mechanism.** Short version: the rooms were flat because 2.0 of the 2.5 total light intensity was direction-less fill (`AmbientLight 0.6` + `HemisphereLight 1.4`), and a third uncounted flood — `scene.environment` from `RoomEnvironment`, added so metals aren't black — was lighting every PBR material at full strength. Fill cut to `0.08`/`0.18`/`0.12`, `scene.environmentIntensity = 0.22` added, `toneMappingExposure` `0.3 → 0.55`, and 5 real `PointLight`s now sit at the emissive ceiling fixtures. **Three.js has no global illumination, so an emissive material glows but casts zero light** — this is why the "lit by its ceiling panels" look could never come from Blender alone.
    - **NewRoom (brown podium room) is a `SpotLight`** — `angle 0.5` rad, `penumbra 0.55`, `intensity 70`, plus a co-located `PointLight` at `16` as fill so the walls keep a warm gradient (that fill is the "make it less drastic" dial). Only small props cast shadows (`SHADOW_CASTER_MAX_SIZE = 6`) so walls/ceilings don't dump the room's own shell into the shadow map. `dirLight.castShadow` was turned **off**: it had been `true` but inert (nothing had `receiveShadow`), and enabling receivers would have switched it on with its default ±5-unit shadow camera, clipping into a hard visible edge across MainRoom.
    - **PinkRoom has no emissive ceiling fixture at all**, so it gets no fixture light and reads darker than the others. Needs an emissive ceiling material in Blender plus a `FIXTURE_LIGHTS` entry if that's unwanted.
    - **Intro gate** — loading screen + controls intro now run once per tab via `sessionStorage.introSeen`. See the "Intro gate" bullet under item 43.
    - **3D-page horizontal slide-in REMOVED** (`index.html`). Arriving at the 3D page used to hold the entire `<html>` element off-screen at `translateX(±100%)` with `overflow: hidden`, then animate it in over 380ms via injected `_sR`/`_sL` keyframes, with `#top-bar` counter-animated in the opposite direction so the nav appeared stationary. All of it deleted along with its now-unused `KF`/`DUR`/`EASE`/`OPP` locals — the scene just appears, and the orange-bubble loader covers any wait. **`sessionStorage.removeItem('_sv')` is still called on load and must stay:** a 2D page sets `_sv` on its way out, and without the 3D page consuming it the flag would linger and fire a stray slide on whatever page was visited next. **The 2D pages still slide in** — that is a separate implementation living in each 2D page's own script (each animates a wrapper element, guards on `prefers-reduced-motion`, and defines its own `_sR`/`_sL` keyframes), so nothing was shared with the 3D page and nothing there was touched. Verified over CDP: 14 samples across the load window show zero transform/animation on `<html>` or `#top-bar`.

## Mobile: meta tiles render as a pressed spec-list (all 5 project pages)

The 2×2 tile grid struggles on a phone: every tile is locked to `height: 155px` so a one-word
value leaves most of its inset empty; a raised tile wrapping a pressed inset puts two opposing
shadow systems inside a ~170px box, which reads as noise; and two columns leave each value ~150px
wide so dates wrap mid-phrase. Below 640px it becomes **one pressed card holding four label/value
rows**, hairline-separated — same tokens (VT323 orange labels, `--text-secondary` values), no
nesting, height driven by content. The block is appended LAST so it beats the earlier mobile rules
(`grid-template-columns`, `height: 155px`) on source order; deleting it restores the old design
exactly, with no markup or `data-i18n` changes involved.

**Multi-line values are joined onto one line with a real DOM node, not CSS.** The values use
`<br>` for desktop's stacked layout, and **three CSS-only approaches were measured and all fail in
Blink**: `br { display: none }` and `display: contents` merge the runs with no separator
("FigmaPrototypingClaude Code"); `br::after { content: ", " }` adds **0px** (generated content on
`<br>` does not render); and flex blockification does not neutralise the line break either. So a
small script before `</body>` inserts a `<span class="meta-sep">` before each `<br>`, hidden by
default and shown only under the media query — which is what makes resizing across 640px work in
both directions. It is context-aware: a value already ending in `— – , ; : /` gets a plain space
instead of a comma, otherwise you get "Mai 2026 —, Jun. 2026". A `MutationObserver` re-runs it
because `applyLang` replaces the values on language change.

## Project-page section sub-headings (`.feature-title`)

Sub-headings inside a project section, above a per-item image/video. **OCR-A-BT only — there is no orange kicker.** Unify originally had a `.feature-kicker` (small orange VT323 label like `03 — SOZIALES`) above each title; that pattern was extended to Virtual Cooking and Mac-Lamp and then **removed everywhere on 2026-07-30 per Lucas — the orange label didn't work for him. Do not reintroduce it.** Zero `feature-kicker` references remain site-wide.

```css
.feature-title {
  font-family: 'OCR-A-BT', monospace;
  font-size: clamp(20px, 2.6vw, 26px);   /* NOT Unify's clamp(22px, 3vw, 34px) */
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
```

**Size matters:** on Virtual Cooking / Mac-Lamp these are sub-items inside a section that already has a `.section-title` at `clamp(28px, 4vw, 44px)`, so they use the smaller ramp (matching `.result-subhead`) to stay below it. Unify's are top-level per-feature headings and keep the larger ramp.

**Where they are, and where they deliberately are NOT.** Only content that is genuinely *one discrete named item per visual* gets a heading:
- **Unify** — 6 feature panels (`feat-home/timetable/socials/friends/courses/settings-title`)
- **Virtual Cooking** — the 3 `.stagger-row` panel blocks in "Design process" (`panel-manual/ingredients/timer-title`)
- **Mac-Lamp** — the 4 Process stages (`process-cad/print/cut/sand-title`)
- **Cybercoffee** — none, by explicit decision
- **Double Packaging** — not done yet
- **Skipped on every page:** At a Glance, meta grids, `.section-title`s (they already carry the shared OCR-A-BT + dotted-divider rhythm), multi-paragraph prose sections (kickers/headings fragment a single continuous argument), and "Final result" demo blocks.

**Two retrofit gotchas, both hit in practice:**
1. `.stagger-copy` (Virtual Cooking) and `.lamp-scrolly-panel` (Mac-Lamp) were `<p>` elements — they cannot hold a heading. Each needed a container. For **`.lamp-scrolly-panel` the class and its `data-step` must stay on the container**: the scrolly JS toggles `.is-active` by matching `p.dataset.step`, and the CSS positions/fades that element. The body copy moves to an inner `<p class="guide-text">`.
2. Moving a `max-width` off the old paragraph onto the new wrapper means **every responsive override of that width must move too** — Virtual Cooking's `@media (min-width:1600px) and (min-aspect-ratio:17/10)` had to split into separate `.stagger-body` and `.stagger-copy` rules, or the text column silently loses its constraint on wide monitors.

**`data-i18n` is applied with `textContent`, not `innerHTML`** — so a translation value must contain a real `&`, never `&amp;`, or the entity renders literally as "Profil &amp; Freunde". Use `data-i18n-html` if a value genuinely needs markup.

## 3D Mode: Startup — deferred reveal + compileAsync

The first frame rendered after `scene.add(model)` used to compile EVERY shader program
synchronously — a multi-hundred-ms (seconds on slow GPUs) main-thread freeze that also hung the
welcome panel, since the intro iframe shares the thread. That freeze is what read as "the 3D start
hangs / gets stuck". Fixed at the end of the GLB `onLoad` (2026-08-28): the model and the project
arrows are added **invisible**, `renderer.compileAsync(scene, camera)` compiles all programs in
parallel (`KHR_parallel_shader_compile`), and only then does the reveal flip everything visible —
logged as `Szene sichtbar — Shader kompiliert nach Xms`. Raycasts ignore visibility (verified
against three r184), so ALL the bbox/collision/spawn/click setup runs unchanged while hidden — do
not reorder that setup around the reveal (stale-matrix minefield). Belt-and-braces: the promise's
rejection path AND a 4s timeout both reveal anyway, so no driver quirk can leave the scene
invisible. `compile()`/`compileAsync()` use `scene.traverse`, not `traverseVisible`, which is why
compiling invisible objects works. Related: per-mesh load logging (~400 console calls with
JSON.stringify) is now behind `DEBUG_SCENE_LOGS = false` (top of `src/main.js`) — flip it on when
verifying CONTENT keys or collision filtering after a GLB re-export; the one-line summaries always
log.

## 3D Mode: Project arrows (floating chrome "clickable" markers)

`PROJECT_ARROWS` + `addProjectArrows(model)` in `src/main.js` (right after `addFixtureLights`). A
procedurally built chrome arrow (extruded 2D shape with a bevel — no Blender, no GLB re-export)
floats above each configured project object, bobbing (`ARROW_BOB_*`) and slowly spinning
(`ARROW_SPIN`) in `animate()`. **All 7 project objects have one**: Mac-Lamp ×2, both bottles, the
Cybercoffee egg, the Unify figure, the VR panel. The `byKey(name)` helper matches exactly the way
the click handler resolves `CONTENT` keys (mesh name OR direct-parent name — multi-primitive glTF
nodes load as a group of that name with generated child names, which is why `bottle_body_Podest`
[3 meshes] and `egg-rig` [4] work via the parent branch). **To add a project: one `PROJECT_ARROWS`
row** (`title`, `url`, `match(mesh)` predicate) — the arrow hovers over the matched meshes' union
bbox, gets a runtime `CONTENT` entry + `clickables.push`, so clicking it runs the full existing
pipeline (return-state save, `?from=3d`, analytics, left-drag slop).

**Click-pop (bounce)** — `POP_*` block directly above `animate()` (it MUST stay above: `animate()`
is first CALLED during module evaluation, and the pop state being declared after that call was a
real first-frame TDZ ReferenceError that black-screened the whole scene). Every project object and
every arrow pops on click (~0.28s sine pulse to 1.15×, navigation deferred until it ends;
`popNavigating` guards double-clicks). `resolvePopTargets(obj)` mirrors the CONTENT resolution:
names in `POP_ENABLED` and `ProjectArrow_*` pop as themselves. **The table lamp is the special
case: its six meshes sit DIRECTLY under `SpinPivot`, and `SpinPivot` is the ENTIRE scene** — never
escalate a pop (or any group operation) to it, or every room pulses. The lamp pops as a composite:
`MACLAMP_TABLE_MESHES` are scaled together about their shared union-bbox centre (`startPop` takes
an array of targets for exactly this). Pop scaling happens about the world-bbox centre, not the
transform origin — several pivots (egg notably) have origins outside their own geometry.
`POP_BOTTOM_ANCHORED` (currently `Pivot_MacLamp`, `bottle_body_Podest`, and `MACLAMP_TABLE` — the
synthetic key for the table lamp's six-mesh composite) switches the scale centre
to the bbox's BOTTOM centre: objects sitting on a podium grow upward with their base planted,
instead of a centre-scale pushing their underside through the podium mesh mid-pulse. Add a
resolved name to the set to give another sitting object the same treatment.
**The Exit pill on the `?from=3d` project pages pops too** (all 5 pages, in the same injected
script as `positionExitBtn`): click → `exitPop` keyframe pulse (280ms; frames start AND end in the :hover pose — an animation
replaces the whole transform, so plain scale(1) frames made the button visibly drop out of its
hover lift on click) →
navigation deferred by the same 280ms so the press is visible before the page leaves;
`btn.dataset.leaving` guards double-clicks.

Three things future edits must preserve:
- **The union bbox is MODEL-LOCAL** — position needs `.add(model.position)`, the same stale-matrix
  correction as the fixture lights, and the same prohibition on `model.updateMatrixWorld(true)`.
- **The arrow material carries its OWN `envMap`** (PMREM of `RoomEnvironment`, imported solely for
  this). `scene.environment` is deliberately uniform white; metalness-1 chrome reflecting it renders
  as a flat grey blob. A per-material envMap overrides the scene env for that material only, so the
  splotchy-walls fix stays intact — and `envMapIntensity` DOES work on it (the documented no-op is
  only for materials inheriting `scene.environment`).
- Arrows are direct scene children — never collidables (walk under them freely), `castShadow` off.

## 3D Mode: Lighting

All illumination is created in `src/main.js` — **the Blender scene contains zero light objects.** Do lighting work in the code, not Blender: Three.js has no global illumination, so emissive materials glow without casting light, and iterating in Blender would cost a full GLB re-export per tweak. Only the fixture's *appearance* (its emissive material) belongs in Blender.

**Knobs, in the order to reach for them:**
1. `renderer.toneMappingExposure` (currently `0.55`) — overall brightness.
2. `scene.environmentIntensity` (currently `0.175`) — the global IBL level. See "the environment must be UNIFORM" below; this is also the **only** dial that moves env-lit (metallic/transmissive) surfaces, because per-material `envMapIntensity` was measured to do nothing here.
3. Per-room `intensity` / `color` / `distance` / `grid` / `spot` in the `FIXTURE_LIGHTS` table.
4. Per-material `MATERIAL_FIXUPS` for a single object that reads wrong.

**`scene.environment` must be UNIFORM — do not use `RoomEnvironment`.** It used to be
`PMREMGenerator.fromScene(new RoomEnvironment())`, described in an old comment as "a perfectly
uniform, direction-less flood". **That was wrong and cost a long debugging session.**
RoomEnvironment is a studio-lit *box with bright emissive panels on particular faces*, so as an
IBL its contribution tracks surface normal. On these curved walls the normal sweeps across those
panels and paints broad bright/dim patches that track the camera and match no light in the scene.
Measured on NewRoom's wall: it supplied **~55% of the total illumination and 100% of the
left-to-right unevenness** (horizontal spread 24.4% of mean with it, 3.0% without).

Replaced by `uniformEnvironment(0xffffff)` — a flat colour in every direction, so metals still
have something to reflect. **Build it with `pmrem.fromScene()` on an inside-out box, NOT
`pmrem.fromEquirectangular()` on a small `DataTexture`:** PMREM sizes its output from the source,
so an 8×4 equirect produced a degenerate 336×8 cubeUV that emitted no light at all and silently
made `environmentIntensity` a **no-op**. A working PMREM here is 768×1024. A flat white shell is
also much dimmer per unit intensity than RoomEnvironment's emissive panels, so the intensity is
**not** the old 0.22 — measured sweep 0.14/0.18/0.30/0.60/0.90 → wall mean 57.3/63.5/80.4/113.7/137.8,
and **0.175** reproduces the original 62.8.

**Diagnostic rule:** when a surface looks unevenly lit and no light explains it, set
`scene.environmentIntensity = 0` first — it is the largest and least obvious contributor. Measure
a horizontal luminance band profile rather than eyeballing screenshots.

**`FIXTURE_LIGHTS` matches on the EMISSIVE MATERIAL name, never the mesh name.** Two hard-won reasons:
- A Blender object with two materials (base + emissive) exports as one glTF node with two primitives, which `GLTFLoader` splits into a `Group` whose child meshes are named after Blender's **mesh-data** name plus an index — unrelated to the object name and effectively unpredictable. Measured: object `Ceiling_Cassettes` arrives as **`Ceiling004_1`**, and `NewRoom_Ceiling` arrives as **`MainRoom_Ceiling_Mesh_1`**. Exact object-name matching silently found neither.
- Where a material is reused on non-ceiling geometry (`BlueRoom_EmissivePanel` is also on the front wall, floor and podium tops), add a mesh-name guard. Without it that one room would light itself from five places at once.

**Position from the geometry bounding box, not `getWorldPosition()`.** `getWorldPosition()` returns the transform *origin*, which in this scene is frequently left at the world origin while the geometry sits tens of units away — `NewRoom_Ceiling`'s origin is `(0,0,0)` but its geometry is at `(−19.5, −1.2, 5.25)`, so using the origin drops NewRoom's light into MainRoom. Also drop the light below `box.min.y`, not below the centre (unless `atCentre`): the fixture slab has thickness, so centre-minus-a-nudge is still *inside* the mesh — invisible for a shadowless `PointLight`, but it makes a spot's own fixture geometry occlude its entire beam.

**...and that bbox is in MODEL-LOCAL space, so `.add(model.position)` is load-bearing.**
`addFixtureLights()` runs *after* `model.position.sub(center)`, but assigning `.position` does not
recompute `model.matrixWorld`, and `Box3.setFromObject(child)` calls
`updateWorldMatrix(false, true)` — note `updateParents = false`, so it happily reuses the
parent's **stale** matrix. Without the offset every fixture light sat **16.6 units** from where it
belonged (off by exactly `center` = `(4.36, 2.72, −15.81)`), outside its own room, leaving each
room lit by whichever neighbour's displaced light happened to be in range. That read as uneven
"splotchy" wall lighting coming from nowhere.

**Do NOT "fix" that with `model.updateMatrixWorld(true)`.** The spawn floor-probe further down
raycasts the same geometry and has *always* run against those same un-refreshed matrices — that
is where `floorY = 0.018`, and hence the hand-tuned eye height, comes from. Refreshing the
matrices corrects the lights and simultaneously moves the probe's answer, **ejecting the camera
from the rooms.** This was tried; Lucas reported being outside the scene immediately.
Gotcha within the gotcha: the `pos.y = box.min.y …` line needs `+ model.position.y` too. Missing
it left every light 2.72 units *above* its own ceiling and the rooms dark — which reads as
"everything got darker", not as a positioning bug.

**`distance` is the containment knob.** Walls block nothing without a shadow map, so a too-large
`distance` floods the neighbouring room. MainRoom went `15 → 11.5` (its own radius is ~10.6, so
it still covers itself) after it was found reaching 3.3 units past NewRoom's near wall.

**`grid: { x, z }` spreads one fixture's light across the anchor mesh's own footprint** — for
fixtures that are a large emissive PANEL rather than a lamp. A single point 5 units under
BlueRoom's 10.5 × 11.6 ceiling made one hotspot per side wall, which on those dark blue walls
read as **two separate light sources**. Total intensity is conserved (split evenly), so room
brightness is unchanged and only the distribution evens out; lights sit at each cell's centre
(`(i + 0.5) / n`), which also insets them from the panel edge so none lands jammed against a wall.
**Pair a grid with a smaller `distance`** than the single-point version, since spreading moves the
outermost lights closer to the room boundary — BlueRoom's 3×3 at `distance: 8` reaches z 21.5 /
x 6.4 versus the old single light's 21.4 / 6.9, i.e. slightly *less* far in every direction.

**`atCentre` / `offset` / `aimAt`** (used by the PinkRoom lights): `atCentre` keeps the light at the
bbox centre instead of dropping it to the underside — right for a free-floating body like the
PinkRoom creature, where the underside would park the light under its feet. `offset` moves a light
off its anchor mesh room-relative, for a light with no source geometry of its own. `aimAt` is a
**direction, not a target point**, so it survives the model recentre; default `[0,-1,0]`
(straight down), and PinkRoom's entrance spot uses `[1,0,0]` for a dead-horizontal wall wash.

**`EMISSIVE_CLAMP = 2.0`.** Fixtures are authored in Blender at wildly inconsistent emission strengths (`NewRoom_CeilingLight_Warm` = 60, `Ceiling_Light` = 25, YellowRoom `Ceiling` = 5.5, `BlueRoom_EmissivePanel` = 1.5). Blender exports these via `KHR_materials_emissive_strength` and Three.js applies them as `material.emissiveIntensity`, so at 60 the fixture is ~18× over pure white after tone mapping and **hard-clips to a flat white disc, losing its colour entirely.** Clamping restores a bright-but-tinted glow. Small accent emissives (`Lamp_*` at 1.0, `M_Purple` at 0.18) are below the clamp and untouched.

**The clamp exempts any `MATERIAL_FIXUPS` entry that sets its own `emissiveIntensity`** — and the
exemption lives *inside* the clamp condition, not in call ordering: materials are shared across
meshes (the centre tower alone has 3) and the clamp runs per mesh, so otherwise the next mesh
visited would silently re-cap the fixup's value.

**Centre-tower flicker — the one measure that has held.** `Tower_Upper` / `Tower_Lower` panels sit
only **0.022** units inside their grid lattices (measured), which is the depth knife-edge the
`camera.near` comment at the top of `main.js` describes; raising `near` 0.01 → 0.1 mitigated it
without removing it. Per Lucas, depth-side fixes have been tried and **did not work** — what holds
is the tower emitting its own light. But `Tower_Upper_Panel` is authored in Blender at
`emissiveStrength 2.0`, which is **exactly** `EMISSIVE_CLAMP`, so it has **zero headroom** and any
Blender-side increase is silently clamped straight back to 2.0. To give it more light, add a
`'Tower_Upper_Panel': { emissiveIntensity: N }` entry to `MATERIAL_FIXUPS`. Raising it in Blender
alone does nothing. Note also that the flicker can be *triggered* by unrelated material changes:
giving a mesh vertex colours compiles a different shader program, which reshuffles Three.js's
opaque draw order, and with the default `depthFunc: LessEqualDepth` whichever depth-tied surface
draws later wins — so a stable tie can flip to a flickering one.

**`MATERIAL_FIXUPS` — per-material overrides, keyed on MATERIAL name.** For one object that reads
wrong without touching lights or the room. Current entries fix the vaccine bottle:
- `label` — **`metalness: 1.0` is an authoring slip in the `.blend`**; a paper label is a
  dielectric. A fully metallic surface has **no diffuse term at all**, only specular reflection of
  the environment, so at metal 1 / rough 1 it is physically a dark rough metal — which is exactly
  how it rendered. `metalness: 0` lifted the bottle region's mean luminance 63.8 → 73.2, p95
  84 → 105, with zero clipped pixels. Same root cause as the cap (`blue metal`, metalness 1.0).
- **`envMapIntensity` is deliberately NOT set.** It looks like the obvious lever for the
  transmissive glass and the metal cap, but it was measured to do **nothing** in this scene:
  `1.0` vs `6.0` rendered *byte-identical* frames, apparently because these materials have no
  `envMap` of their own and inherit `scene.environment`, whose contribution is scaled by
  `scene.environmentIntensity` instead.
- The applier must **not** use `Object.assign`: `color` and `emissive` are `THREE.Color`
  instances, and overwriting one with a hex number silently breaks the material. Colour-valued
  keys go through `.set()`.
- A `Material-Fixups:` console line logs every patch (matching the existing `Fixture-Lichter` /
  `Clickables gefunden` style) so a silently-unmatched material name is visible rather than
  mysterious. That log is what caught the `envMapIntensity` no-op.

**The vaccine label's UVs are rotated — currently patched in CODE, not in the `.blend`.**
The label is the scene's **only texture** (`vaccine_label_fixed`, a 736×736 JPEG; everything else
is flat colours or vertex colours). The band is ~6.31 around × ~2.0 tall, aspect ~3.15:1, so a
correct wrap on a square texture needs `u` spanning 1.0 (around the bottle) and `v` spanning
1/3.15 ≈ 0.32 (up it). The authored UVs are exactly the opposite — `u 0..0.32, v 0..1` — i.e. the
right aspect assigned to the wrong axes, so the print rendered rotated 90°. **The texture image
itself is stored upright; only the mapping is wrong.**

`addFixtureLights()` rotates the UVs at load as a stopgap, keyed on the material name `label`.
It must be a proper rotation `(u, v) → (1 - v, u)`, **not** the bare swap `(u, v) → (v, u)`: a
swap is a transpose, i.e. a reflection with determinant −1, which lands the text horizontal but
**mirrored** ("Menu" renders as "unǝM"). That was tried and is exactly what happened.
The guard flag lives on the **geometry**, not the mesh, since both bottle instances can share a
buffer and rotating twice would undo it.

**If the UV map is ever fixed in Blender, DELETE that block** — otherwise the load-time rotation
applies on top of a now-correct map and the label goes sideways again.

**YellowRoom is lit by two downward SPOTS, and the 2×3 grid experiment was REVERTED.** Its two
ceiling panels (`YellowRoom_Ceiling` + `.001` — the grid bars use material `Grid`, so they are
excluded by the material match alone) are spots at `angle 0.62` / `intensity 42` / `distance 12`
/ `0xffebc7`, each with a co-located `fill: 14` PointLight at the panel centre. That replaced
omnidirectional points at 45, which lit floor, walls and ceiling equally and read as a flat gold
wash. A 2×3 grid per panel was then tried for evenness and **rolled back at Lucas's request** —
technically more uniform, but it flattened the room's character. **Don't reintroduce it without
asking.** The lighter wall *tops* come from the baked vertex gradient, not from these lights.

**BlueRoom is lit by an invisible AREA light filling its ceiling — the only one in the scene.**
Its old gridded PointLight entry is still commented out below the live one (kept for reference);
its panels remain non-emissive because the tile gradient needs them off.

`area: { inset, bounce }` on a `FIXTURE_LIGHTS` entry builds a `THREE.RectAreaLight` sized to the
anchor mesh's own footprint (here 9.9 × 10.4, inset 0.25 so the emitter stops short of the side
walls — flush against one puts a bright band down it that reads as a seam). A RectAreaLight has
**no renderable geometry**, so nothing new appears in the room; it only changes the lighting. This
is what a ceiling light panel physically is, and it beats the old 3×3 PointLight grid, which still
produced a hotspot under each lamp and read as several separate sources on the dark blue walls.

**`bounce` is not optional decoration — without it the ceiling renders black.** A RectAreaLight is
**single-sided** (Three.js has no two-sided option), and the ceiling's visible face is its
*underside*, whose normal points straight down, away from a downward-emitting panel. So `bounce`
adds a second, UP-facing panel co-located with the first; the pair behaves as one double-sided
emitter. In a real room that light is the floor bouncing it back up, and Three.js has no GI to
produce it. It emits strictly upward, so it cannot uplight the podiums or props.

**Moving the panel above the ceiling does NOT fix that**, which is the intuitive thing to try: an
area light casts no shadow, so its light still reaches the floor straight through the slab, but the
underside's normal still faces away from it and stays unlit. The light has to come from below.

**The main emitter sits WELL ABOVE the ceiling (`box.max.y + lift`), and OVERHANGS the room
(negative `inset`).** Both exist to kill hard seams, and each fixes a different one. This took
three passes to get right; the underlying rule is that **a RectAreaLight has two hard boundaries —
its plane and its four edges — and neither may fall on a surface the player can see.**

*The plane.* A point just below the emitter sees the full rectangle; a point just above it is
behind the emitter and receives **exactly zero**, with nothing in between. Any surface crossing
that height gets a seam. BlueRoom's cove sweeps continuously from wall to ceiling, so it crossed
the plane and drew a line right around the room at the top of the walls. Sitting the emitter flush
on the slab top was **not** enough, because the cove's own curve reaches that same height — hence
`lift`, which puts the plane above everything visible so the cutoff has nothing to land on.

*The edges.* The rectangle's perimeter is a falloff boundary too, so an emitter that stops at the
walls lays its edge gradient on surfaces you are looking at. A negative `inset` pushes the edges
out past the walls, keeping only the flat middle of the light's field inside the room. Spill
outside costs nothing — there is nothing out there to see, and no shadows to compute.

There was also an earlier, distinct artifact: a bright **stripe** at the top of the walls when the
emitter sat at the ceiling's *underside*. An area light obeys Lambert's cosine law about its own
normal, so a wall point level with the panel sees it edge-on (cos ≈ 0) and gets nothing, while one
just below catches the panel edge at near-zero range — a near-field spike. Raising the emitter
fixed that too, for the same reason.

`lift` also softens the gradient generally (the near-field falloff spreads over a longer run) at
the cost of brightness, roughly 1/d² — which is why `intensity` is tuned upward alongside it.
Passing light down through the slab costs nothing, since an area light casts no shadow.

**`bounce` is currently 0 — off, and that is the settled state.** The mechanism still exists: it
adds a second, UP-facing panel co-located with the first (a RectAreaLight is single-sided, so the
pair acts as one double-sided emitter), which is the only way to light the ceiling's *underside* —
its normal points down, away from a downward emitter, and Three.js has no GI to bounce floor light
back up.

It had to be switched off because **its own plane sat just under the ceiling, exactly at the top of
the walls**, and a point below an up-facing emitter receives exactly zero from it. That cutoff drew
a hard line right around the room at the top of every wall. This took three passes to find, because
raising the *main* panel (`lift`) can never move it — the two emitters have independent planes.
**Diagnosis worth reusing:** the line did not shift when `lift` changed by 1.4, was absent with the
light fully off, and vanished at `bounce: 0`. A shading artifact that ignores a light's position
but disappears with its intensity belongs to a *different* light.

**Accepted consequence:** the ceiling is no longer separately lit and reads darker than the floor.
Lucas judged clean walls worth more than a bright ceiling — *"not exactly what I wanted but I
prefer this way."* Do NOT re-enable `bounce` to brighten the ceiling without first solving the
plane cutoff; the line comes straight back. Three constraints if reusing `area` elsewhere: `RectAreaLightUniformsLib.init()` must have
run (done once at renderer setup — without it the light silently emits **nothing**); it lights
`MeshStandardMaterial`/`MeshPhysicalMaterial` only; and it cannot cast shadows and has no
`distance` cutoff, so containment comes from `intensity` and the gap to the next room rather than
from a hard radius the way PointLight `distance` works.

**`BLUEROOM_Z_LIMIT = 36.4` is a movement clamp, and collision genuinely cannot replace it.** The
cove is built from loose, unwelded tile quads that don't close up around the curve, and raycast
collision tests that same geometry — *the holes are the gaps*, so you walk straight through. The
constant sits at the cove's tangent line (back plane z ≈ 39.05, radius 2.505 → 36.55), is scoped
to BlueRoom's measured footprint (x −10.34..0.14, z 27.58..39.26), and is applied **after** the
move + slide so it clamps the final position instead of fighting the collision solver.

**Known-dark, not yet fixed:** BlueRoom's two podium objects. They are *not* short of light —
measured illuminance 3.29 vs the brown-room bottle's 1.75, nearly 2×. The causes are
`M_Silver_Egg` / `M_Silver_Panel` at **metalness 0.65** (little diffuse response), both objects
being thin and vertical under a top-down light (grazing incidence), and the emissive floor
(`BlueRoom_Floor_Panels`, strength 1.5) glowing brightly while contributing **zero** bounce
because Three.js has no GI.

**A `SpotLight` needs its `target` positioned AND added to the scene** — it defaults to the world origin, so miss either step and the cone aims sideways across the whole building with no error. Spots are the affordable way to get shadows here: one 2D shadow map versus a shadow-casting `PointLight`'s 6 cube faces. Shadows are desktop-only (`renderer.shadowMap.enabled = !isMobile`), so on phones a spot degrades to cone falloff with no contact shadow.

## 3D Mode: Colour gradients on geometry (Blender → GLB)

**The GLB has ZERO textures** (`images: 0, textures: 0`) — every surface is either a flat
`baseColorFactor` or a vertex colour. So any gradient that must appear in the browser has to be
**baked into a mesh colour attribute**. Procedural Blender node chains
(`Texture Coordinate → Separate XYZ → Color Ramp`, `Noise`, `Voronoi`) render in Blender and export
as **nothing**. `NewRoom_Wall_Gradient` had exactly such a chain sitting orphaned — built, never
connected to Base Color, and unable to export even if it had been.

Working recipe (used for the brown room's floor→ceiling wall gradient, live on the site):
1. Create the colour attribute **first in `mesh.color_attributes` order** — Three.js's
   `GLTFLoader` only reads `COLOR_0`, which is colour-attribute index 0. Existing attributes (these
   meshes all carry a `Bleed` attribute) must be snapshotted with `foreach_get`, removed, and
   recreated *after* the new one so they land in `COLOR_1`. Verify the restore is byte-exact.
2. Use `type='FLOAT_COLOR'` — linear scene-referred, matching glTF's linear `COLOR_0`, so values
   round-trip exactly. `BYTE_COLOR` is sRGB-encoded and gets converted on export.
3. Link the Principled **Base Color** to a `ShaderNodeAttribute` reading it, and set Base Color's
   `default_value` to **white**. The exporter then writes `baseColorFactor [1,1,1,1]` and `COLOR_0`
   is authoritative. (White is belt-and-braces: if the node tree ever becomes something the
   exporter can't follow, it falls back to `default_value`, and a stale coloured default would
   silently double-darken the surface.)
4. **Verify by test-exporting the single object** with `use_selection=True` to a **temp** path and
   reading back `baseColorFactor` + `COLOR_0` — never by exporting over `public/current🟢.glb`.

**Abandoning one of these experiments means reverting the `.blend`, NOT just the GLB.** Restoring
`public/current🟢.glb` from a backup makes the site look correct immediately, which is exactly the
trap: the `.blend` still holds the rejected material wiring, and the site stays correct only until
*someone* re-exports. This has already shipped a regression once — a rejected texture approach left
`PinkRoom_Gradient_Wall`'s Base Color on an image-texture node and the wall un-subdivided; a
different Claude session re-exported hours later for unrelated work and the wall lost all its
colour data (see "Session C" under Recent Changes 2026-07-31). **Two symptoms to look for when
diffing a fresh export against a known-good backup:** `COLOR_0` pinned at a uniform 1.0 means the
Base Color link no longer exports and the exporter emitted a synthetic white attribute; a per-mesh
triangle count that dropped by exactly 4× means a lost subdivision level. Neither is visible in
Blender's viewport.

**Values above 1.0 survive export.** Confirmed: `COLOR_0` comes out as float32 and a baked 1.196
was preserved un-clamped. That matters when the base colour is already bright and the gradient must
go *brighter* (e.g. `Wall_White` at 0.92). Strictly the glTF spec says `COLOR_0` *should* sit in
[0,1], so a pedantic validator may warn; Three.js renders it correctly.

**Only a straight line is representable.** These wall meshes have just **3 vertex rings** — measured
`NewRoom_Walls` at z 0 / 3.01 / 5.0 and `Wall_Cylinder` at z 0 / 3.0 / 5.0 — so a per-vertex ramp
interpolates linearly no matter what curve is baked. Easing would need the wall subdivided
vertically (a geometry edit).

**Aside:** the exporter emits a synthetic **white** `COLOR_0` for meshes whose material uses no
colour attribute, so untouched objects export identically before and after this kind of change. A
white `COLOR_0` is a no-op, not a tint.

**Tried and reverted: the same gradient on MainRoom's `Wall_Cylinder`.** It worked and exported
cleanly, but it triggered the centre-tower flicker (see "3D Mode: Lighting") and was rolled back at
Lucas's request — GLB restored from backup, the Blender bake removed, Base Color relinked to its
authored `(0.92, 0.92, 0.90)`. If revisiting, deal with the tower's 0.022 depth knife-edge first.

### Load-time vertex gradients (`VERTEX_GRADIENTS` in `src/main.js`)

The runtime counterpart to the Blender bake above: it rewrites a mesh's `COLOR_0` at load, so it
needs **no GLB re-export** and can be iterated on in the browser. Three modes:

- **vertical** (default) — `bottom` → `top` ramp over the mesh's height. `1.0` = the authored
  colour unchanged; values above 1.0 brighten.
- **`radial`** — ramps by horizontal distance from the mesh centre (`centre` → `rim`). Used for
  YellowRoom's floor pool.
- **`tiles`** — **every tile gets its own** gradient, dark in its middle and bright toward its
  edges. Not to be confused with `radial`, which stretches ONE gradient across the whole mesh;
  that was tried on BlueRoom's floor first and read as a single dark patch in the middle of the
  room.

Matching is on **material name**, plus optional `mesh` name and a **minimum bbox height**. The
height guard is what keeps a gradient off small props sharing a material — `Velvet` is also the
YellowRoom coffee table (0.8 units) versus 5.9-unit walls. Ramps use each vertex's **world-space**
height, not local Y: `YellowRoom_Sofa` is rotated and its mirror copy has **negative scale**
(−2.37), so local Y runs upside down on one of them and a local ramp would invert.

**Why this is safe against the centre-tower flicker** (unlike the Blender route, which triggered
it — see "Colour gradients on geometry"): meshes that already arrive with a `COLOR_0` are already
compiled with vertex colours, so replacing the attribute's *values* changes no shader program and
cannot reshuffle draw order. For a mesh with no `COLOR_0` (YellowRoom's floor), applying one does
recompile — but the renderer's opaque sort keys on `material.id`, and a load-time recompile keeps
the **same material instance and id**. The Blender route reshuffled ids because the GLB's material
creation *order* changed, which is what moved the draw order.

Two implementation details that are easy to get wrong:
- **Keep the existing attribute's `itemSize`** (4 = RGBA on these meshes). The `USE_COLOR_ALPHA`
  shader define depends on it, and changing it compiles a new program — the exact thing this
  approach exists to avoid.
- Write **float32**. The authored attribute is normalised uint8, which cannot exceed 1.0, i.e.
  cannot brighten.

Use `clone` when the material is shared and the changes must not leak (BlueRoom's
`BlueRoom_EmissivePanel` is on five meshes), and `emissive: 0x000000` when the surface is authored
emissive: emission is added after shading and **cannot vary per-fragment from a colour map**, so
leaving it on flattens the ramp — the same failure mode as the flat emissive that washed out the
bottle label. A `Vertex-Gradients:` console line logs every mesh it touched.

## GLB export recipe (two non-obvious flags)

```python
bpy.ops.export_scene.gltf(filepath=dest, export_format='GLB',
                          use_selection=True,      # everything except Tower_*_NEWBUILD
                          export_apply=True)       # <-- NOT the operator default
```

**`export_apply=True` is mandatory and is NOT the default.** 31 objects carry modifiers
(`SUBSURF` ×4, `LATTICE` ×17, `BEVEL` ×7, `NODES` ×8). Exporting without it silently drops
**36,992 triangles** — the vaccine bottle/lid lose their subdivision, the VR-panel
`Left_StripSeg_*` lose bevel + geometry nodes, `YellowRoom_CoffeeTable` loses its geometry nodes,
`logo-RLB` loses its lattice deform. Nothing errors; the file just comes out ~2 MB smaller. This
shipped broken once before being caught by comparing per-mesh triangle counts against the backup.

**Before exporting, pin each `SUBSURF` modifier's viewport `levels` to its `render_levels`, then
restore.** The four bottle/lid subsurfs sit at viewport **6** / render **2**, and `export_apply`
evaluates the *viewport* depsgraph — so exporting as-is would balloon them from ~13 k to ~1.7 M
triangles each. Level 2 is what the known-good GLB contains.

**Exclude `Tower_Lower_NEWBUILD` / `Tower_Upper_NEWBUILD`** (x ≈ 80). They were added after the last
good export, and `src/main.js` does `model.position.sub(center)`, so including them shifts the whole
world and invalidates the hardcoded spawn.

**Always verify against a backup** (kept in `~/TEMP/glb-backups/`, **outside `public/`** — anything
in `public/` is copied into `dist/` and deployed). With the flags above a re-export reproduces the
previous GLB exactly: **280,139 triangles, 258,951 vertices, bbox-centre delta `[0,0,0]`** — that
last one is the check that proves the spawn point survived. Also confirm the `CONTENT` keys still
resolve. Known pre-existing dead key: `CONTENT['Pivot_MacLamp_Table']` matches no node, because the
exporter collapses that empty and parents its six `*_Table` meshes straight to `SpinPivot`.

The MCP call **times out** on a full-scene export while Blender is busy; the export still completes.
Poll the output file's size/mtime from the shell instead of re-invoking, and do restore work in a
`finally` block so it runs even when the caller has given up.

## 3D Mode: Camera Controls

Look-around (yaw/pitch) is hand-rolled in `src/main.js` — no OrbitControls/Three.js addon, just raw pointer/wheel events driving `camera.rotation` directly (`camera.rotation.order = 'YXZ'` so yaw/pitch don't fight each other).

**Desktop — click-drag to look:**
- Triggered by **ALL THREE buttons — left, middle or right** (`e.button === 0 || 1 || 2`). History: right-only → +middle (item 22) → +left (2026-08-22).
- **Left-drag shares the button with object-picking, and the two are separated by MOVEMENT, not by button.** `mousedown` records the press point and clears `lookMoved`; `mousemove` sets `lookMoved = true` once travel exceeds `DRAG_SLOP = 5` px; the canvas `click` handler (the raycast picker, far down the file) returns early when `lookMoved` is set. So a stationary press opens the project and a drag orbits — and the slop is what lets a shaky-handed click still count as a click. **Rotation itself starts at pixel one, not after the slop** — deferring it would make left-drag feel laggy versus the other two buttons, and a sub-5px rotation is imperceptible. `mouseup` compares against the stored `lookButton` so a second button pressed mid-drag can't end it early.
- The `.looking` grab cursor is added **immediately for middle/right but only past the slop for left**, so hovering an object and clicking it never flashes a grab cursor.
- `mousedown` calls `preventDefault()` for every button: left would otherwise start a text/image selection drag on the canvas, middle pops the OS autoscroll widget. Neither suppresses the later `click` event, which is what picking relies on.
- `isLookDown` flag set true on `mousedown`, false on `mouseup`; while true, `mousemove` deltas drive `yaw`/`pitch` at `MOUSE_SENS = 0.003`.
- `contextmenu` is globally suppressed (`e.preventDefault()`) so right-click-drag doesn't pop the browser context menu; middle-click gets the same treatment via `auxclick` (middle-click otherwise triggers OS-level autoscroll).
- `pitch` is clamped to `±(π/2 − 0.01)` (`clampPitch()`) so you can't flip past straight up/down.

**Desktop — scroll wheel:** `wheel` event also nudges `yaw`/`pitch` (`SCROLL_SENS = 0.003`), independent of the click-drag path — lets you look around without holding a mouse button.

**Mobile — steering model (REBUILT 2026-08-13; replaces the old strafe-joystick + persistent swipe-look + inertia).** On touch devices (`isMobile`) the camera is composed **per frame** in `animate()`: `yaw = headingYaw`, `pitch = headingPitch + peekPitch`. Nothing on mobile writes `yaw`/`pitch` directly anymore — the big comment block above `syncSteeringToView()` in `src/main.js` is the reference. The parts:
- **Joystick steers, it does not strafe.** Grabbing the stick captures `stickRefYaw = headingYaw`; the thumb's direction then defines a TARGET heading relative to that reference (up = straight on, left = +90°, straight back = 180° about-turn — `atan2(-x, -y)`, matching yaw's left-positive sense). Each frame `headingYaw` **eases** toward the target (`STEER_EASE = 8`/s exponential, framerate-independent), with the per-frame step **capped at `STEER_MAX_RATE = 4.2` rad/s** — added per Lucas because the pure exponential made a 180° flip nearly as quick as a small nudge, which read as a jump-cut (dialed in on-device across four steps: 2.4 → 3.2 → 3.7 → 4.2). With the cap, turn duration grows with turn size (≈0.7s for an about-turn, ≈0.4s for 90°, under ~30° never hits the cap and stays snappy); the ease diff goes through `wrapAngle()` so a 180° flip takes the short arc. The cap applies only to eased joystick turns — a swipe rotates the frame 1:1 with the finger, never rate-limited. **A steer larger than `TURN_HOLD_ANGLE` (2.094 rad ≈ 120°) also pauses WALKING for the duration of the swing** (`bigTurnHold` → `walkFactor` eases to 0 at `WALK_EASE_OUT = 14`/s): you turn on the spot rather than arcing across the room, and movement eases back in (`WALK_EASE_IN = 5`/s, ≈0.6s) only once the remaining angle drops under `TURN_RESUME_ANGLE` (0.30 rad ≈ 17°) — "ganz kurz bevor die Drehung fertig ist", so it glides rather than lurching. The two thresholds are deliberate **hysteresis**: a single threshold would flicker the hold on/off as the remaining angle hovers near it. `walkFactor` scales `SPEED` at all three movement sites (direct move + both collision slides) and is only ever written inside the `isMobile` block, so **desktop keys are untouched by construction**. Verified over CDP: a 90° steer keeps walking (0.78 units through the swing), a 180° flip drifts only 0.09 units mid-swing and then resumes (0.71 units after settling). You always **walk along `headingYaw`** (not the camera's composed forward), at constant `SPEED` once past `STICK_DEADZONE = 0.25` (below it the stick neither walks nor steers — the angle is pure noise near the centre). **Releasing freezes the turn where it is** (`targetHeadingYaw = headingYaw` in the joystick `touchend`) — view and position stay put, thumb snaps home.
- **Horizontal swipe = rotate the whole steering frame, live (final model after two on-device iterations).** A canvas drag's yaw delta (`TOUCH_SENS = 0.004`) is applied to `headingYaw`, `targetHeadingYaw` AND `stickRefYaw` **together in the `touchmove` handler** — swiping re-aims "forward" in real time, standing still or mid-walk. With the stick held, the thumb keeps its physical deflection but its angle is now measured against the swiped frame: thumb still pushed "up", but "up" means the new direction, and the walking path curves with the finger. Shifting all three by the same amount is what preserves an in-flight steering ease (the ease diff is unchanged) and means nothing can snap back on release — there is nothing left to snap to. **Two earlier models were built and rejected on Lucas's phone:** (1) peek-that-always-returns (both axes eased home on release — rejected: sideways look must stay); (2) fold-on-release, stick owns the heading while held (`headingYaw += peekYaw` only at `touchend`; with the stick held the next frame re-targeted from the un-shifted `stickRefYaw` and eased the view back — rejected: swiping while walking snapped back). Don't reintroduce either. **Vertical look stays temporary:** `peekPitch` (`TOUCH_SENS_PITCH = 0.0012`) follows the finger, then eases back to the ~level `headingPitch` on release, clamped **at accumulate time** against `±PITCH_LIMIT − headingPitch` so surplus can't build up invisibly past the stop and stall the return. The old `INERTIA_DECAY` coasting is **gone**.
- **`syncSteeringToView()` must run after ANY code that writes `yaw`/`pitch` directly** (spawn, sessionStorage restore, `resetScene`) — it re-seats heading/target/peek on the current view; miss it and the next frame visibly snaps the camera back to a stale heading. Desktop (`isMobile` false) skips the whole composition and the mouse/wheel handlers work exactly as before; those handlers carry a small `isMobile` branch routing their deltas through the heading, which exists **only** for touchscreen laptops (where `maxTouchPoints > 0` makes the composition run and it would otherwise overwrite mouse look every frame).
- **`delta` is clamped to 0.1s in `animate()`** (`Math.min(clock.getDelta(), 0.1)`). After any rAF stall — backgrounded tab, notification shade, OS throttling — the first frame back otherwise reports the whole gap as one delta: `SPEED×gap` teleports the player far past the 0.4-unit collision probe (i.e. through walls) and snaps every exponential ease straight to its target. Found when the headless test env paused rAF and one resumed frame moved the player ~5 units. Both the look and joystick touches also register **`touchcancel`** alongside `touchend` — an OS-stolen touch otherwise leaves `cameraTouchId`/`joystickTouchId` stuck forever (look blocked / camera walking with no finger down).
- Verified over CDP (touch emulation + desktop control run, 25 checks): eased 90°/180° turns settle exactly, stick release freezes view+position+thumb, a standing swipe persists, pitch eases home, **swipe-while-walking re-aims with no snap-back and the walk follows the new forward with the thumb untouched** (the F tests — the case Lucas reported), desktop right-drag look unchanged and persistent. CDP testing notes, all learned the hard way: put small sleeps between dispatched input events (back-to-back events coalesce and the gesture silently drops); `Input.dispatchTouchEvent`'s `touchEnd` takes the points being *released* (empty array = release all); SwiftShader headless pauses rAF while no touch is active and crawls at ~4fps at 390×844@2x — test at 360×640@1x and keep a 1px-wiggling finger down through any window where an ease must visibly progress; the desktop run's tab can spontaneously reload mid-test (retry a read that returns the impossible yaw=0/pitch=0); read camera state via the `P` debug key's console log.

**Mobile — vertical range is deliberately tiny.** `PITCH_LIMIT` is `isMobile ? 0.20 : Math.PI/2 − 0.01`, and vertical peek has its own sensitivity, `TOUCH_SENS_PITCH = 0.0012` (30% of the horizontal `TOUCH_SENS`). Sideways looking is unchanged; up/down is a subtle nudge.

**Movement — arrow keys are full WASD aliases**, feeding the same two axes, so diagonals and mixed WASD/arrow presses behave identically. Two things to preserve:
- `preventDefault()` on the four arrows under `{ passive: false }` — a passive listener silently ignores it, and without it holding an arrow both walks the camera *and* scrolls the document. Safe for the overlays: a keydown inside an iframe doesn't bubble to the parent, so this never blocks arrow-scrolling their content.
- **Combine the two keys with `||` (truthiness), never `!==`.** The `keys` map has *three* states — `undefined` (never pressed), `true` (down), `false` (released) — so `keys['KeyA'] !== keys['KeyD']` is TRUE after merely releasing one (`false !== undefined`), which left the branch permanently satisfied and walked the camera forever. Pure WASD hid the bug, because pressing those keys once makes both sides real booleans.

**If adding a new input method (e.g. two-finger drag, a dedicated look-joystick):** `applyRotation()` stays the single place that writes `camera.rotation`, but the two platforms feed it differently — on desktop hook into `yaw`/`pitch` + `clampPitch(); applyRotation();` as before; on mobile write into the steering model instead (shift `headingYaw` + `targetHeadingYaw` + `stickRefYaw` together for facing changes, `peekPitch` for temporary vertical look), because the per-frame composition in `animate()` overwrites any direct `yaw`/`pitch` write on the next frame.

## Tips for Next Session

- **Always test the dropdown** before claiming work is done. Open 2D.html, hover Craft, check that project titles aren't cut off.
- **Check both desktop and mobile** (860px breakpoint). Scrollytelling has different behavior on each.
- **Video playback:** If videos don't autoplay, check browser autoplay policies. Muted + playsinline should bypass restrictions.
- **Color sampling:** Use Digital Color Meter (macOS, Apple App Store) in sRGB mode to sample exact colors if you need to match video backgrounds or adjust shadows. Note that matching the page to the Unify video grey is **no longer necessary** — see the `clip-path` approach in "Unify Page: Video Details".
- **SVG coordinates:** The blob's pupil positions come from Figma. If you re-export the blob, update: eye centers (ex, ey), pupil rest positions (rx, ry), and MAX travel distance in the tracking JS.
- **Sticky positioning fragile:** Root-level `overflow-x: hidden` breaks sticky pins. Use `clip` instead. Page-wrapper `overflow: visible` needed for dropdown; use `clip-path` on child sections for shadow boundaries.
- **i18n:** All text strings on Unify are in the `TRANSLATIONS` object (bottom of `unify2d.html`). Add new keys there; reference via `data-i18n` or `data-i18n-html` attributes in HTML.

## Unify Page: Hero Blob Implementation

**SVG Blob** (exported from Figma, sits in `<div class="hero-blob">` inside `.hero-top`):
- Large pink shape (#FF88C8) with two white circles (eyes) and two dark pupils
- SVG viewBox: `"-10 -65 760 830"` — allows head to bleed off top edge
- Positioned absolute: `top: clamp(-85px, -6vw, -50px); right: clamp(-10px, 2vw, 48px);`
- Height: `clamp(440px, 50vw, 680px)`; width: `auto` (maintains aspect ratio)
- **Z-index: 3** — sits above header (z-index: 2) so blob appears above dotted divider line

**Pupil Tracking** (JavaScript at bottom of `unify2d.html`):
- Listens for `pointermove` events; converts client coords to SVG space via `getScreenCTM()`
- Each pupil (id: `unify-pupil-l` / `unify-pupil-r`) constrained within its eye circle
- Max travel: 108px from eye center (prevents pupils escaping white areas)
- Smooth follow: 0.18 easing factor per frame (requestAnimationFrame loop)
- **Edge case:** When pointer leaves window, pupils ease back to rest position

**Hero Section CSS:**
```css
.hero-top {
  position: relative;
  padding: 0 clamp(40px, 8vw, 80px);
  min-height: clamp(400px, 44vw, 620px);
  display: flex;
  align-items: flex-end;
}

.page-wrapper {
  overflow: visible;  /* CRITICAL: allows blob to bleed past top border */
}

/* At root level: */
html { overflow-x: clip; }  /* Not 'hidden' — clip allows sticky positioning */
```

## Unify Page: Scroll-Driven Dual-Video Sections (Scrollytelling)

**HTML Structure** (two sections with identical pattern):
```html
<section class="scrolly" id="timetable-socials-scrolly">  <!-- Steps 2 & 5 -->
  <div class="scrolly-sticky">
    <div class="scrolly-media">
      <div class="scrolly-vid is-active" data-step="timetable"> ... </div>
      <div class="scrolly-vid" data-step="socials"> ... </div>
    </div>
    <div class="scrolly-copy">
      <div class="scrolly-panel is-active" data-step="timetable"> ... </div>
      <div class="scrolly-panel" data-step="socials"> ... </div>
    </div>
  </div>
</section>

<section class="scrolly" id="nav-friends-scrolly">  <!-- Steps 3 & 4 -->
  <!-- Same structure, different data-step values: "courses" / "friends" -->
</section>
```

**CSS Details:**
```css
.scrolly {
  position: relative;
  height: 175vh;  /* Tall spacer: allows ~75vh of scroll "room" before/after sticky pin */
}

.scrolly-sticky {
  position: sticky;
  top: 12vh;  /* Sits 12vh from top; leaves room for nav + breathing space */
  height: 76vh;
  display: flex;
  align-items: center;
  gap: clamp(28px, 5vw, 64px);
  padding: 0 clamp(40px, 8vw, 80px);
}

/* Only #timetable-socials-scrolly mirrors layout (text LEFT, videos RIGHT) */
#timetable-socials-scrolly .scrolly-sticky {
  flex-direction: row-reverse;
}
#timetable-socials-scrolly .scrolly-media {
  margin-right: 50px;  /* Nudge videos toward center from the right */
}

/* #nav-friends-scrolly keeps original order (videos LEFT, text RIGHT) */
#nav-friends-scrolly .scrolly-media {
  margin-left: 50px;  /* Nudge videos toward center from the left */
}

.scrolly-vid video {
  height: calc(clamp(442px, 62.4vh, 676px) * 0.6);  /* Inactive: 40% smaller */
  transition: height 480ms cubic-bezier(0.4, 0, 0.2, 1);
}
.scrolly-vid.is-active video {
  height: clamp(442px, 62.4vh, 676px);  /* Active: full size, matches other videos */
}

.scrolly-copy {
  flex: 1 1 auto;
  align-self: center;
}

.scrolly-panel {
  position: absolute;
  top: 50%;
  left: 0; right: 0;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 350ms ease;
  pointer-events: none;
}
.scrolly-panel.is-active {
  opacity: 1;
  pointer-events: auto;
}
```

**JavaScript Behavior** (`initScrolly()` function runs on both `.scrolly` sections):
1. Measures scroll progress as fraction of section height (0 to 1)
2. At midpoint (0.5), toggles active video/panel to the second step
3. Only active video plays; inactive pauses (prevents audio overlap)
4. Click a video → smooth scroll to position (0.15 or 0.85 of section) that triggers the toggle
5. Throttled with `requestAnimationFrame` to avoid excessive updates

**Mobile fallback** (≤860px breakpoint):
- `.scrolly` height → `auto` (no tall spacer)
- `.scrolly-sticky` → `position: static` (no sticky pin); `flex-direction: column` (stack vertically)
- Both videos same height; both panels visible; no toggle behavior
- Useful on small screens where scroll range is too small to trigger transitions
- **`#timetable-socials-scrolly` needs its column direction restated at ID strength here.**
  The mirrored desktop layout is `#timetable-socials-scrolly .scrolly-sticky` (specificity 1,0,1)
  and beats the fallback's plain `.scrolly-sticky` (0,1,0), so this one section stayed
  `row-reverse` for the whole band — squeezing `.scrolly-copy` and both panels to **zero width**
  and pushing the videos off the left edge. `#nav-friends-scrolly` has no ID-level direction rule,
  which is exactly why only one of the two ever broke.
- **`initScrolly` must not run its scroll logic here.** Both videos are on screen, so there is no
  "active" step to swap to: the pause-the-inactive-one branch left one phone on a frozen frame,
  and with `.scrolly` at `height: auto` the progress fraction divides by the `max(…, 1)` floor and
  snaps 0→1 in a single scroll step. Guarded with `matchMedia('(max-width: 860px)')`, which shows
  and plays both; desktop cannot reach that branch.

### Unify page — mobile (≤640px)

**Each video is paired with its own caption**, instead of two phones side by side followed by both
captions. Done with `display: contents` on `.scrolly-media`/`.scrolly-copy` — which dissolves them
so their children become direct flex items of the column — plus `order` to interleave. No markup
change, so desktop's mirrored row is untouched. Consequences worth knowing:
- `.scrolly-copy` reports **zero width** by design (it has no box). Measure the panels, not it.
- `.scrolly-panel` is a **flex** item here while `.feature-copy` is a **grid** item, so anything
  sizing both must use auto margins rather than `justify-self`/`align-self`.

**Colour palette** (`.color-grid`) must stay a **row** at this width. It is a row with
`align-items: flex-end` to bottom-align swatches; the ≤860px block flips it to a column, where
`align-items` controls the *cross* axis — `flex-end` stops meaning "bottom" and starts meaning
"right", and each box shrinks to content width. That is what produced 75×58px right-aligned
swatches. Three square swatches side by side is also simply the better read for a palette.

**Character figures** are 150px and keep the desktop stagger alive by alternating which edge each
one hangs off (left / right / centre via `align-self`), since a single column has no room for
horizontal offsets. Their paragraphs' inline `margin-left/right: -15px` must be zeroed with
`!important` — those tuck the text against the figure in the desktop ROW and pull it off the page
in a column.

**The colour-palette heading's inline `margin-top: 190px`** is deliberate air at 1440px but ~26%
of the whole section's height at 390px, landing as an empty hole under the dotted divider. Cut to
40px via `.process-section .dot-divider + .process-title` (structural, not the i18n key — it is
the only `.process-title` directly following a divider) with `!important`, since 190px is inline.

## Unify Page: Video Details

**Video files** (all in `/public/videos/unify/`):
- `homepage.mov` — Feature 1 (Home)
- `timetable.mov` — Feature 2 (Timetable, scrolly section)
- `map-courses.mov` — Feature 3 (Navigation, scrolly section)
- `map-friends.mov` — Feature 4 (Friends, scrolly section)
- `socials.mov` — Feature 5 (Socials, scrolly section)
- `settings.mov` — Feature 6 (Settings)

**Critical:** All video filenames use hyphens (not spaces). `<source>` URLs break with spaces.

**Source dimensions** (portrait; `mdls` prints Height before Width — easy to misread as landscape):

| File | Size |
|---|---|
| `homepage.mov` | 685 × 1400 |
| `timetable.mov` / `socials.mov` / `map-friends.mov` | 672 × 1382 |
| `settings.mov` | 672 × 1370 |
| `map-courses.mov` | 614 × 1250 (framed tighter than the rest) |

### Background removal — a transparent frame OVER the recording (2026-09-15)

Every `.mov` has `#D8D7DC` (216,215,220) baked in as the app-UI background, around a phone
mockup that is part of the footage. **The files are untouched.** They used to be hidden with a
per-file `clip-path` measured to the phone's bezel; that is **gone**, on this page and on
`2D.html`'s Unify tile, because it could never cut cleanly — each recording's screen corners are
ROUNDED and baked in, so clipping a rectangular element to a rounded rect always left bezel
wedges in the corners.

Now a stock transparent iPhone 17 mockup (`/images/unify/iphone-17-frame.png`, 876x1808, a real
alpha channel, screen hole and surroundings transparent) sits OVER each recording, and a box
shaped like that frame's screen hole does the clipping — so the corner is the frame's own curve
by construction. Three boxes per phone:

- `.phone-shot` — the frame's pixel ratio (`aspect-ratio: 876/1808`), sized by height wherever
  the bare `<video>` used to be.
- `.phone-shot-screen` — the frame's screen hole (**x 36-839, y 30-1777**, i.e. 804x1748 with an
  even 36/30 margin), **grown 2px on every side** so its edge hides under the frame. Sized to the
  hole exactly, a hairline of page background showed all the way round: the boundary is
  anti-aliased and an inclusive bbox is a pixel wider than `x1-x0`. Outside the hole is covered by
  the frame, so overhanging is free; falling short is a visible seam. `overflow: hidden`.
- `.phone-shot-video` — the recording, absolutely positioned, `object-fit: fill`.

**Two measurements that must be made the right way:**

1. **The corner radius is 128px, and it has to be found by FITTING A CIRCLE to the hole's corner
   arc** (all four corners agree to within half a pixel). Reading it off the point where the edge
   stops moving gives ~145 — the arc meets the straight edge tangentially, so its last pixels run
   almost parallel to it and anti-aliasing hides where they end. 13% too round is plainly visible
   as corners that do not sit in the cutout. Stated against the hole's own width/height
   (`16.0891% / 7.4201%`) so it survives any rendered size.
2. **Each video is placed by matching its DYNAMIC ISLAND to the frame's**, not by matching screen
   edges. Both assets draw an island — the frame paints its own over the video — so if they do not
   coincide you see a doubled, offset pill. They are the same shape but sit at slightly different
   fractions of their own screen, because the recordings are different iPhone generations.
   **Find each island by taking a pixelwise MAX over ~60 frames**: the screen is lit at some point,
   the island never is, so it falls out as a dark hole. (The same max-image gives the screen bounds
   wherever the app lights them; a permanently dark bottom is recovered from the mockup's own
   symmetry — bottom margin equals top margin.)

**The crop lands INSIDE each recording's own black bezel** (`ffmpeg crop`, files named
`<name>_screen.mov`). At island-locked scale the recording's screen stops ~4px short of the clip
box, so whatever the crop includes at its edge is what fills that sliver. A looser crop carries the
recording's OWN SILVER RIM in, which draws a pale hairline between the frame's black border and the
screen — reported as "a thin gap between frame and recording". Black bezel there is invisible;
silver is not. Crop tighter than the screen and there is nothing to fill it with at all.

**The ~1% zoom that closes the side seam is HORIZONTAL ONLY.** Vertical scale keeps the
recording's pixels square. Zooming both ways about the island (tried) visibly ate the bottom of the
app's nav row: the island sits near the top, so a scale about it barely moves the top edge but
swings the bottom hard — it took one video's bottom overhang from 14px to 40px to buy 1px at the
top. The ~1-2px the top edge is left short is black bezel under the frame's own rim, where it
cannot be seen.

Per-file placement lives in one block of `.phone-shot-video[data-vid="..."]` rules. **They are not
interchangeable between files.** Measured geometry, for re-deriving:

| file | size | screen | island | crop |
|---|---|---|---|---|
| homepage | 688x1406 | 35-655, 29-1377 | 249-440, 52-106 | `634:1374:28:22` |
| timetable / socials / map-friends | 672x1382 | 34-637, 35-1351 | 243-428, 58-110 | `612:1324:30:31` |
| settings | 672x1370 | 34-637, 27-1336 | 243-428, 50-102 | `612:1322:30:23` |
| map-courses | 614x1250 | 35-581, 32-1229 | 224-392, 53-100 | `554:1206:31:28` |

The originals (`homepage.mov` etc.) are **still on disk but no longer referenced** — kept in case
the crops need re-deriving.

**The press swell targets `.phone-shot`, not the video's parent** — its parent is now the clipping
screen box, and scaling that reads as the screen zooming inside a static frame.

Verified over CDP at 1440 and 390, light and dark: all six frames coincide with their box, the
video covers the screen box in every case, every edge reads rail → black border → screen with no
pale pixel between, captions match the phone width exactly, and no console errors.

### Mobile sizing: `--phone-h` / `--phone-w`

All six mockups take their height from **one** custom property, `--phone-h`, set in the last
`@media (max-width: 640px)` block (it must stay last — the height is also declared earlier for
`.feature-media .phone-shot` and `.scrolly-vid .phone-shot`, and this wins on source order).
Currently `clamp(445px, 83.5vh, 640px)`, which is the original `clamp(416px, 78vh, 598px)` with
**+7% on all three stops**, so the short-phone floor, the vh tracking and the tall-phone ceiling
keep the same relationship. **The height goes on `.phone-shot`, never on the `<video>`** — the
video is positioned inside the frame now, and sizing it directly would break that placement.

Captions attached to a video (`.feature-copy`, `.scrolly-panel` — *not* other paragraphs) are
constrained to `--phone-w` and centred, matching the reference where the text spans the phone.

**`--phone-w` is `calc(var(--phone-h) * 0.4845)`** — simply the frame image's aspect ratio
(876/1808), because the mockup IS the frame now. It replaced a four-row table of per-file ratios
(0.4688–0.4736) averaged to one shared `0.47`, which was the best the old clip-path approach could
do: each video's visible phone was its element box minus that file's own insets, so no single
number was exact and 0.47 landed within ~2.3px of each. One frame for all six makes it exact.

**Testing gotcha (historical, for the clip-path era):** Chrome collapses `inset()` shorthand in
`getComputedStyle().clipPath` when sides are equal, so a naive parser reads a corner radius as an
inset. No `clip-path` remains on this page, but the same trap applies anywhere one is measured.

**Transparent video files are NOT worth it for this site.** `.mov`/H.264 can't carry an alpha channel; real transparency needs WebM/VP9 (Chrome/Firefox) *plus* HEVC-with-alpha (Safari) — 12 files to replace 6, with quality loss. Only go there if the videos are needed outside the website.

**`ffmpeg` IS installed** (`/opt/homebrew/bin/ffmpeg`, plus `ffprobe`, `jpegtran` and
`avconvert`) — an older note here said it was not.

## Deployment

**Live at:** `https://lucasmaher.com` (custom domain) and `https://lucasmaher-hash.github.io/3d-Portfolio-current/` (GitHub Pages default URL, still works).

**Repo:** `github.com/lucasmaher-hash/3d-Portfolio-current` — public (required for free-tier GitHub Pages on a private repo you'd need a paid plan). Was renamed from `first_3d_web_draft-main`; GitHub auto-redirects the old remote URL, but the local `origin` was updated to the new one directly.

**How it deploys:** `.github/workflows/deploy.yml` — GitHub Actions builds with `npm ci && npm run build` and deploys `dist/` via `actions/deploy-pages`, triggered on every push to `main` (or manually via "Run workflow" in the Actions tab). Nothing manual needed for routine updates — commit, push, done. Pages source is set to **"GitHub Actions"** in Settings → Pages (not "Deploy from a branch").

**Custom domain wiring:**
- `public/CNAME` contains `lucasmaher.com` — lives in `public/` specifically so Vite copies it into `dist/` on every build (a repo-root-only `CNAME` would NOT reach the deployed site, since GitHub Actions deploys `dist/`, not the raw repo)
- Domain also saved under Settings → Pages → Custom domain on GitHub's side (this is what actually triggers Let's Encrypt certificate issuance — the file alone isn't enough)
- Domain registered via **Cloudflare Registrar** (`lucasmaher.com`)
- DNS records at Cloudflare: 4 **A** records on `@` → GitHub Pages' IPs (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`), plus 1 **CNAME** on `www` → `lucasmaher-hash.github.io`
- **All records set to "DNS only" (grey cloud), not "Proxied" (orange cloud).** Cloudflare's proxy sits in front of the domain and can block GitHub from validating ownership to issue the HTTPS certificate. Can revisit proxying later once HTTPS is confirmed stable — not attempted yet.
- HTTPS certificate issued and confirmed working same-day; propagation + cert issuance together took under an hour

**If the site ever needs to move off this domain/repo:** update `public/CNAME`, the Settings → Pages custom domain field, and the DNS records together — they're three independent places holding the same domain name, and Pages will misbehave if only some of them are updated.

## Known Patterns & Gotchas

- **`clip-path: inset(0 0 -1px 0)` on `.project-section`** in `2D.html` — clips top/left/right to contain the neumorphic tile shadows, but the bottom edge is relaxed by 1px so the `border-bottom` divider is never clipped off at fractional device-pixel heights (was `inset(0)`, which intermittently ate the dividers)
- **Widescreen-only tweaks — use the fraction ratio syntax:** `@media (min-width: 1600px) and (min-aspect-ratio: 17/10)`. **`min-aspect-ratio: 1.7` (decimal) is silently ignored by Safari** — always write it as `17/10` (or `16/10`). MacBook screens are ~1.54 aspect, so `17/10` (1.7) targets 16:9 monitors; `16/10` (1.6) also catches 16:10 monitors. For "center on wide, unchanged on MacBook" prefer a **fluid `calc()` width** over a breakpoint (see Unify `.character-list`) — it needs no media query and can't mis-match.
- **Below-MacBook shrink (site-wide, all 8 non-3D pages): outer padding fades to 0 gradually between 1440px→860px, borders vanish exactly at 860px, and desktop windows are capped from shrinking further.** Previously the outer padding used `clamp(20px, 3.9vw, 55px)` (floor 20px, never 0) and a separate `@media (max-width: 640px)` rule hard-snapped padding/margin/border to 0 — a visible jump rather than a fade, and it happened at 640px (where the nav *also* switches to its hamburger), not the wider point the design called for. Fixed with three pieces, present on every page's `html, body` rule:
  1. **Fluid padding, exact zero at 860px:** `padding: 0 clamp(0px, calc(9.483vw - 81.552px), 55px);`. This is a straight-line interpolation between `(1440px → 55px)` and `(860px → 0px)` expressed in `vw` — solve `55px = m·1440px + b` and `0 = m·860px + b` and the coefficients fall out (`m = 55/(1440-860) = 9.483vw`, `b = -m·860px = -81.552px`). The outer `clamp(0px, …, 55px)` just holds the two ends flat past their target widths, so behavior above 1440px and below 860px is unchanged from before. Verified via CDP at 1150px (exact midpoint) → `27.5px`, precisely half of 55px.
  2. **Border/margin removal, synced to the same 860px point:** a border can't fade sub-pixel, so it's cut outright — `@media (max-width: 860px) { html, body { padding: 0; } .page-wrapper { margin: 0; border-left: none; border-right: none; } }`. Because the padding formula already reaches exactly 0 at that width, there's no visible jump. The *existing* `@media (max-width: 640px)` block still exists for the real mobile layout (hamburger nav, stacked grids, etc.) — it just had its padding/margin/border lines **removed** (now redundant, handled by the 860px rule) and everything else left untouched.
  3. **Desktop-only shrink cap:** `@media (hover: hover) and (pointer: fine) { html, body { min-width: 860px; } }`. Below 860px, a real desktop/laptop (mouse or trackpad) stops reflowing further — the browser window can keep narrowing, but the page content stays pinned at 860px and the excess is silently clipped by the existing root `overflow-x: clip` (no horizontal scrollbar ever appears; vertical scroll is untouched). `pointer: fine` + `hover: hover` specifically targets non-touch input, so **real phones/tablets are unaffected** and keep reflowing all the way down to their actual widths via the normal 640px mobile rules — verified via CDP touch emulation (`pointer: coarse`): at 600px viewport, `body.scrollWidth` correctly tracked the real 600px, not the 860px desktop pin.
  **Two pages (`vaccine2d.html`, `virtual_cooking2d.html`) had `overflow-x: hidden` instead of `clip`** — changed to `clip` for consistency and because `hidden` would turn `html`/`body` into a scroll container, breaking `position: sticky` if either page ever grows a sticky section (see the `overflow-x: clip` gotcha above). **Two pages (`2D.html`, `about2d.html`, `contact2d.html`) had no `overflow-x` at all** (default `visible`) — added `clip`, required for the min-width cap's overflow to actually stay hidden instead of showing a scrollbar. **If a new 2D page is ever added, copy all three pieces from any existing page's `html, body` block — don't just copy the old `clamp(20px, 3.9vw, 55px)` pattern.**
- **`minmax(0, 1fr)` in CSS grid** — required when a column holds long OCR-A-BT titles; otherwise title overflows and crushes the other column
- **`position: fixed` inside iframes clipped to iframe viewport** — why Craft dropdown uses `postMessage` to expand iframe instead of relying on `overflow: visible` alone
- **Scroll-hide nav** — every 2D page adds/removes `.hide` on `#top-bar` based on scroll direction (250px down threshold / 180px up threshold)
- **The orange scroll dots are a working scrollbar on desktop (2026-08-22).** `#scroll-track` / `#scroll-thumb` / `.scroll-dot` used to be a pure indicator (`pointer-events: none`). A `@media (hover: hover) and (pointer: fine)` block now turns pointer events on and widens the strip `6px → 20px` for a grabbable target — **the dots do not move**, because the extra width is added on the left and `right` shrinks by the same amount (`16 + 6/2 = 19` centre; `19 − 20/2 = 9`). Drag the dots to scrub (`grabOffset` remembers where inside the thumb you grabbed, so it never jumps on grab) or click the bare strip to centre the thumb there and jump — macOS's "jump to the spot that's clicked". Pointer **capture** is what keeps a drag alive when the pointer wanders off the 20px strip. Drag scrolls are always `behavior: 'auto'` (a queued smooth scroll would lag a frame behind every move); only the click-jump uses `smooth`, and that respects `prefers-reduced-motion`. **Touch deliberately keeps the base `pointer-events: none`** — a live 20px strip down the screen edge would swallow swipe-scrolling — and the desktop-only gating lives in the CSS, so the JS listeners simply never fire on a phone. The hover affordance scales the dots via `transform` only, so the thumb's `offsetHeight` (which the scroll maths reads) never changes. Both blocks are duplicated verbatim across the **8 pages that render a `.dot-divider`-style scroll track** — same copy-the-block convention as the dot dividers; a new 2D page needs both.
- **Video filenames must be URL-safe** — no spaces; use hyphens (e.g., `map-courses.mov` not `map courses.mov`)
- **Z-index stack** (top to bottom):
  - `z-index: 10000` — `.mobile-menu` on `2D.html` + `unify2d.html` **only** — it has to beat those two pages' `9999` nav. See the `.mobile-menu` note below.
  - `z-index: 9999` — #top-bar, but **only on `2D.html` and `unify2d.html`**. The other six 2D pages use `10`, and the 3D page uses `10` (from `src/style.css`). This drift is real and was a live bug: `.mobile-menu` at `200` sat *below* the `9999` nav, so opening the mobile hamburger menu darkened the whole page **except** the nav pill, which stayed bright. Fixed by raising `.mobile-menu` to `10000` on those two pages rather than lowering the nav — the menu is `opacity: 0; pointer-events: none` unless `.open` and is never `.open` at desktop widths, so raising it cannot affect desktop, whereas lowering the nav would change desktop stacking. **If you bootstrap a new 2D page from `2D.html` or `unify2d.html`, you inherit both the `9999` nav and the need for the `10000` menu — keep them together.** Verified over CDP: at 390×844 with the menu open, `document.elementFromPoint()` at the nav centre returns `mobile-menu` (was `top-bar`); at 1440 the nav is still topmost and the menu is still `opacity: 0`.
  - `z-index: 3` — .hero-blob (sits above header/divider on Unify)
  - `z-index: 2` — .hero-header (breadcrumb, title, divider on Unify)
  - `z-index: 200` — .mobile-menu (mobile overlay)
  - `z-index: auto` (0) — page content, project grid
- **Overflow handling:**
  - `.page-wrapper` must be `overflow: visible` (not `hidden`) so nav dropdown doesn't get clipped — EXCEPT pages using sticky scroll sections, where `.page-wrapper` needs `overflow: clip` instead (see below)
  - Root `html`/`body` must be `overflow-x: clip` (not `hidden`) so sticky positioning doesn't break
  - `.project-section` uses `clip-path: inset(0)` to prevent shadow bleed without breaking stickiness
  - **This trap recurs on every new page that adds a sticky/scrolly section**, because new 2D pages get bootstrapped by copying an older page's `<style>` block, and older pages predate the `clip` fix — they still have `overflow-x: hidden` on `html, body` and/or `overflow: hidden` on `.page-wrapper`. Both silently kill `position: sticky` for every descendant with zero console error; the symptom is a sticky element rendering static plus a mysterious empty gap where the pin should have held it in view. Hit this on Unify originally and again on Mac-Lamp's Process section this session. **Always check both `html,body` and `.page-wrapper` for stray `overflow: hidden` before debugging a sticky element any other way.**
- **i18n on Unify:** Meta tiles + feature copy are filled (EN+DE) in the `TRANSLATIONS` object at the bottom of `unify2d.html`. The newer design-story sections (colors/typography/characters) are plain English in the HTML, not yet keyed into `TRANSLATIONS`. **EN + DE only — no French.**
- **Virtual Cooking layout:** rebuilt (this session) — At a Glance lead + meta grid + Identifying the problem + Design process (staggered `.stagger-*` panels + `.process-shot` screenshots) + Final result. All text is `[ Placeholder ]`. Reuses `.guide-section` / `.guide-media` classes.
- **Dotted dividers (`.dot-divider`) — the fix is JS-computed exact tiling, NOT a CSS `background-repeat` value.** The pattern is a `radial-gradient(circle, ... 1.5px, transparent 1.5px)` background tiled at `background-size: 10px 4px`. With `repeat-x`, a container width that isn't an exact multiple of 10px leaves a **partial last tile that gets clipped** — a half-cut dot at the end of the line, and *intermittent* (whether you see it depends on where `width mod 10px` falls). **First attempt this session — switching to `background-repeat: space` — looked correct in Chrome (confirmed via isolated test) but did NOT fix it in Safari:** WebKit has a longstanding bug where `space` doesn't reliably avoid clipping on gradient-image backgrounds, so the half-dot persisted for the user even after that change shipped. **Actual fix:** a small inline `<script>` at the bottom of each page (right before `</body>`) that, on `DOMContentLoaded`/`load`/`resize`, measures every `.dot-divider`'s real `offsetWidth` and sets `background-size` to `width / Math.round(width / 10)` (min 2 dots) with plain `background-repeat: repeat-x`. Because that tile size is an *exact* integer divisor of the measured width, there is no remainder pixel left for any browser's tiling engine to mis-handle — this sidesteps the Safari bug entirely rather than depending on a spec behavior WebKit doesn't honor correctly. Added to the 8 pages that actually render a `.dot-divider` in markup (`about2d.html`, `contact2d.html`, `kaffeemaschine2d.html`, `mac-lamp2d.html`, `portfolio2d.html`, `unify2d.html`, `vaccine2d.html`, `virtual_cooking2d.html` — `2D.html` and the `*3d.html` pages carry the CSS rule but never actually use the class, so they were skipped). **If a new dotted divider is added anywhere, it needs this same JS snippet, not just the CSS class** — copy the `<script>` block verbatim from any of the 8 pages above.
- **Standard hover-lift strength (site-wide convention, unified this session):** every interactive lift-on-hover element — nav `.logo`/`.pill` (`top_row_permanent_V3.html`), footer `.footer-logo` "top" button, contact page `.contact-item` (Email/LinkedIn/Instagram), about page's `.item` accordion rows, `.btn-view-work`, and every project page's `.project-nav-item` / `.gallery-thumb` — now uses the **same** transform, `translateY(-2px) scale(1.03)`, over `transition: transform 150ms ease` (box-shadow pairs with `box-shadow 150ms ease` where the element has a neumorphic base shadow). Neumorphic pill elements (raised dual-shadow base — nav, footer top button, contact buttons, about accordion) deepen to the same shadow on hover: `box-shadow: 11px 11px 24px rgba(174,174,192,0.9), -8px -8px 20px rgba(255,255,255,1)`. Before this session `.contact-item`/`.item` used a shallower `6px 6px 18px` shadow and several `.project-nav-item`/`.btn-view-work` instances used `scale(1.04)` or `translateY(-3px)` — all now normalized to the values above. **When adding any new hoverable element, match these exact values** rather than inventing a new lift strength.
- **Absolutely positioned `<img>`/`<video>` needs explicit `width`/`height` — `inset` alone will NOT size it.** A replaced element (`img`, `video`) with `position: absolute` and `width`/`height` left at `auto` ignores `inset`/`top`+`bottom`+`left`+`right` for sizing and falls back to its own intrinsic pixel dimensions instead (CSS2.1 replaced-element rules) — this shipped visibly broken once this session (every project hero rendered zoomed into a tiny crop; see item 19 in "Recent Changes"). Always pair `inset: -Npx` (or `top`/`left`) with explicit `width: calc(100% + 2×Npx); height: calc(100% + 2×Npx);` when overscanning a replaced element to hide a sub-pixel gap.
- **NEVER put an entrance animation that touches `transform` on the same element as a `:hover { transform }` — move the animation to a wrapper `<div>`.** This cost three debugging passes on `about2d.html` (`.item` accordion rows) and `contact2d.html` (`.contact-item` buttons), where the hover targets also carried the `.anim` staggered fade-in (`@keyframes fadeUp` animates `opacity` **and** `transform: translateY`). Two separate failure modes stack up:
  1. **With `animation-fill-mode: forwards`,** the animation keeps asserting its final keyframe (`transform: translateY(0)`) forever after finishing, and **CSS animations outrank normal author declarations in the cascade**, so it beats `:hover { transform }` outright — the lift never applies.
  2. **Even after switching to `backwards`,** Safari keeps a *finished* animation attached to the element and lets it **suppress the `transition`** on the property it animated. So `transform` jumped with no easing while `box-shadow` (absent from the keyframes) eased normally.
  Both modes present the same misleading symptom: **a "flicker"** — a shadow changing with either no movement at all, or with movement that snaps instantly. It looks like a value/duration problem and it is not; **tuning values or easing curves cannot fix it, and `fill-mode` only masks mode 1 in Chrome.** The only robust fix is structural — keep the animation and the hover on **different elements**:
  ```html
  <!-- animation on the wrapper, hover on the inner element -->
  <div class="anim anim-2">
    <a class="contact-item">…</a>
  </div>
  ```
  Confirm the fix by checking the hover target reports `getComputedStyle(el).animationName === "none"` and `el.getAnimations().length === 0`. **These were the only two pages with `.anim` on a hoverable element** (all others checked), which is exactly why the nav and the homepage "top" button never exhibited it. **Diagnostic rule: if a hover transform does nothing, or flickers, or won't ease — look for a competing `animation` on that element before touching a single value.**
- **A percentage width inside a shrink-to-fit parent is circular, and browsers silently resolve it to ZERO.** Cost a "the egg doesn't render at all" bug across the whole 641–860px band on `kaffeemaschine2d.html` (see "Cybercoffee project"). `justify-items: center` on a grid makes the item shrink-to-fit; its child's `width: min(480px, 100%)` then depends on a parent whose width depends on the child, so the whole subtree collapses to 0×0 with no error. Same trap applies to `align-items: center/start/end` on a flex container. **Fix: give the parent a definite width (`justify-self: stretch` / `align-self: stretch`), not the child.** Symptom to recognise: an element measures `0x0` at some widths but is fine at both narrower and wider ones.
- **A media query inside an iframe resolves against the IFRAME's box, not the device.** This is usable as a *feature* — `kaffeemaschine.html` uses `@media (max-width: 479px)` to detect "I'm embedded at phone size", which provably can't fire on desktop because its host box is exactly 480px at every viewport ≥481px. But it is also the trap recorded in memory as the nav's orientation bug: an `orientation` query inside the 140px-tall nav iframe reports *landscape* on a portrait phone. **Width-based queries inside an iframe are safe and predictable; orientation/aspect ones are not.**
- **A `display: none` iframe performs no layout, so it cannot self-measure.** Any postMessage/ResizeObserver auto-height scheme reports nothing until the frame is visible, which is why the 3D overlays flashed at their previous size on open. First-paint heights have to be set in CSS (`src/style.css`, under `@media (pointer: coarse)`); measuring after reveal is always one frame too late.
- **`inset()` shorthand is collapsed in `getComputedStyle().clipPath`** when opposing sides are equal, so a naive whitespace parser reads a corner radius as an inset and reports a wildly wrong crop. Split on `round` and discard the radii first. (Cost one bogus measurement pass on the Unify caption widths.)
- **A real CSS border beats an absolutely-positioned pseudo-element for "draw a line spanning this box."** Twice this session (see item 20 in "Recent Changes"), a divider built as `::after { position: absolute; top: 0; bottom: <value>; }` failed to reliably reach the container's true edge — first because a negative `bottom` value depended on how an ancestor's `overflow: hidden`/`clip` trimmed it (inconsistent, Safari especially), then because `bottom: 0` only matched the *pseudo-element's own* containing block, not the visual edge the user actually wanted. The fix that actually held up: a real `border-left`/`border-top` etc. on an already-correctly-sized flexbox/grid item — borders automatically span the box's full rendered dimension with zero positioning math and zero overflow-dependence. **Prefer a real border over an absolutely-positioned divider whenever the layout (flex/grid stretch) already gives the element the right size.**
