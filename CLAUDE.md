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

**2D is the default (2026-08-13).** A guard script at the very top of `index.html`'s `<head>` forwards any direct/external visit to `/` on to `/2D.html` via `location.replace()` (so `/` never enters history). Only an explicit in-site switch to 3D lands on `/`: the nav's 3D toggle (`top_row_permanent_V3.html`) and every mobile menu's 3D button (all 8 2D pages) set `sessionStorage._enter3d` before navigating, and a same-origin `document.referrer` is accepted as fallback — covers the `?from=3d` Exit pill (a plain `<a href="/">`) and referrer-stripping/disabled-storage cases. Per-tab semantics: reload/back inside the tab stays 3D; a fresh tab defaults to 2D again. **Because `location.replace()` does not halt parsing, the intro-gate and loader scripts check `window._redirecting2d` and touch nothing during a redirect** — otherwise the once-per-tab `introSeen` flag would be burned by a visit that never showed the 3D page, and the first real 3D switch would silently skip the welcome/controls intro (the loader overlay is deliberately left up during the redirect so no 3D frame flashes). Verified over CDP (7 checks): direct `/` → `/2D.html` with no flags set; explicit switch → `/` with loader + controls intro; same-tab reload stays 3D with intro skipped; Exit-from-project reaches 3D via referrer; `/2D.html` itself never redirects.

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
| `public/top_row_permanent_V3.html` | Nav bar — loaded as an iframe on every 2D page |

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
- `mac-lamp/` — Mac-Lamp project images & diashow frames. Diashow items are `5.jpg`–`9.jpg` (converted from `.HEIC` this session — HEIC only renders in Safari, so gallery images must be JPG/PNG; the original `5.HEIC`–`8.HEIC` are still on disk but unused). Process-section stills: `1.png` (CAD render) + videos `2.MOV`/`3.MOV`/`4.MOV` in `videos/mac-lamp/`
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

38. **3D-linked project pages show a fixed "Exit" pill instead of the usual nav bar, positioned to never overlap the page frame's border.** The `?from=3d` query param added in item 37 is checked by a small script added to the end of all 5 project pages (`vaccine2d.html`, `mac-lamp2d.html`, `kaffeemaschine2d.html`, `unify2d.html`, `virtual_cooking2d.html`): if present, it hides `#top-bar` and injects a fixed pill linking back to `/`. Originally placed top-right, then moved to top-left per request, with a live-measured position: it sits `24px` from the viewport edge while there's room for the whole button in `.page-wrapper`'s outer margin, and switches to `wrapperLeft + 16px` (tucked just inside the frame) the moment the margin would shrink enough for the border to pass under it — matches this codebase's established pattern of measuring real geometry via `getBoundingClientRect()` rather than guessing a CSS breakpoint (see the dot-divider fix). Verified across four viewport widths (1920/1440/1000/700px): zero overlap with the border at any of them, confirmed both numerically and via screenshot.

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
- Triggered by **right-click OR middle-click** (`e.button === 2 || e.button === 1`) — see item 22 above; originally right-click only.
- `isLookDown` flag set true on `mousedown`, false on `mouseup`; while true, `mousemove` deltas drive `yaw`/`pitch` at `MOUSE_SENS = 0.003`.
- `contextmenu` is globally suppressed (`e.preventDefault()`) so right-click-drag doesn't pop the browser context menu; middle-click gets the same treatment via `auxclick` (middle-click otherwise triggers OS-level autoscroll).
- `pitch` is clamped to `±(π/2 − 0.01)` (`clampPitch()`) so you can't flip past straight up/down.

**Desktop — scroll wheel:** `wheel` event also nudges `yaw`/`pitch` (`SCROLL_SENS = 0.003`), independent of the click-drag path — lets you look around without holding a mouse button.

**Mobile — steering model (REBUILT 2026-08-13; replaces the old strafe-joystick + persistent swipe-look + inertia).** On touch devices (`isMobile`) the camera is composed **per frame** in `animate()`: `yaw = headingYaw`, `pitch = headingPitch + peekPitch`. Nothing on mobile writes `yaw`/`pitch` directly anymore — the big comment block above `syncSteeringToView()` in `src/main.js` is the reference. The parts:
- **Joystick steers, it does not strafe.** Grabbing the stick captures `stickRefYaw = headingYaw`; the thumb's direction then defines a TARGET heading relative to that reference (up = straight on, left = +90°, straight back = 180° about-turn — `atan2(-x, -y)`, matching yaw's left-positive sense). Each frame `headingYaw` **eases** toward the target (`STEER_EASE = 8`/s exponential, framerate-independent), with the per-frame step **capped at `STEER_MAX_RATE = 4.2` rad/s** — added per Lucas because the pure exponential made a 180° flip nearly as quick as a small nudge, which read as a jump-cut (dialed in on-device across four steps: 2.4 → 3.2 → 3.7 → 4.2). With the cap, turn duration grows with turn size (≈0.7s for an about-turn, ≈0.4s for 90°, under ~30° never hits the cap and stays snappy); the ease diff goes through `wrapAngle()` so a 180° flip takes the short arc. The cap applies only to eased joystick turns — a swipe rotates the frame 1:1 with the finger, never rate-limited. You always **walk along `headingYaw`** (not the camera's composed forward), at constant `SPEED` once past `STICK_DEADZONE = 0.25` (below it the stick neither walks nor steers — the angle is pure noise near the centre). **Releasing freezes the turn where it is** (`targetHeadingYaw = headingYaw` in the joystick `touchend`) — view and position stay put, thumb snaps home.
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

### Background removal — `clip-path`, not re-encoding

Every `.mov` has `#D8D7DC` (RGB 216,215,220) baked in as the app-UI background, filling the thin margin and the four corners around the phone. **The files are untouched.** The grey is hidden by clipping each `<video>` to the phone's rounded bezel in CSS:

```css
.feature-media video,
.scrolly-vid video {
  clip-path: inset(1.01% 1.79% 0.72% 1.79% round 15.8% / 7.7%);
}
```

Per-file overrides, because the phone sits slightly differently in each recording:

| Video | Selector | `clip-path: inset(...)` |
|---|---|---|
| default (timetable, socials, map-friends) | `.feature-media video, .scrolly-vid video` | `1.01% 1.79% 0.72% 1.79% round 15.8% / 7.7%` |
| homepage | `video[data-vid="homepage"]` | `0.50% 1.46% 0.29% 1.75% round 15.9% / 7.8%` |
| settings | `video[data-vid="settings"]` | `0.44% 1.79% 0.44% 1.79% round 15.8% / 7.7%` |
| map-courses | `#nav-friends-scrolly .scrolly-vid[data-step="courses"] video` | `1.04% 1.95% 0.30% 2.44% round 16.3% / 8.0%` |

The two standalone videos carry `data-vid="homepage"` / `data-vid="settings"` attributes purely so they can be targeted individually.

**Two-value radius is required.** `round 15.8% / 7.7%` states the same pixel radius twice — once against width, once against height. A single percentage resolves horizontally against width and vertically against height, which on a tall phone stretches the corners into ellipses. If you re-measure, recompute both.

**Re-measuring:** `qlmanage -t -s 1400 -o . <file>.mov` produces a PNG frame; find the first non-background pixel along the middle row/column for the insets, and the row where the left edge reaches its final x for the corner radius.

**Superseded:** `map-courses.mov` previously used `clip-path: inset(0 0 3px 0)` to crop an unwanted bottom line. That crop is now folded into its full inset above — don't re-add it.

### Mobile sizing: `--phone-h` / `--phone-w`

All six mockups take their height from **one** custom property, `--phone-h`, set in the last
`@media (max-width: 640px)` block (it must stay last — the height is also declared earlier for
`.feature-media video` and `.scrolly-vid video`, and this wins on source order). Currently
`clamp(445px, 83.5vh, 640px)`, which is the original `clamp(416px, 78vh, 598px)` with **+7% on all
three stops**, so the short-phone floor, the vh tracking and the tall-phone ceiling keep the same
relationship.

Captions attached to a video (`.feature-copy`, `.scrolly-panel` — *not* other paragraphs) are
constrained to `--phone-w` and centred, matching the reference where the text spans the phone.

**`--phone-w` is derived from the VISIBLE phone, not the element box.** Because every video is
clip-path'd to the bezel, ~3.6% of the element is cropped away and the box stays wider than what
you see. Per video that is `height × aspect × (1 − horizontal insets)`:

| video | ratio |
|---|---|
| homepage | 0.4736 |
| settings | 0.4730 |
| timetable / socials / map-friends | 0.4688 |
| map-courses | 0.4696 |

One shared `0.47` rather than four rules: at the 640px ceiling those span 300.0–303.1px, so it
lands within **2.3px worst case** of every one — below the threshold where an edge misalignment is
visible. If the clip-paths are ever re-measured, redo this table.

**Testing gotcha:** Chrome collapses `inset()` shorthand in `getComputedStyle().clipPath` when
sides are equal, so a naive parser reads a corner radius as an inset. Split on `round` and drop
the radii before parsing, or the measured "visible width" will be badly wrong.

**Transparent video files are NOT worth it for this site.** `.mov`/H.264 can't carry an alpha channel; real transparency needs WebM/VP9 (Chrome/Firefox) *plus* HEVC-with-alpha (Safari) — 12 files to replace 6, with quality loss. Only go there if the videos are needed outside the website. Requires `ffmpeg`, which is **not installed** on this machine.

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
