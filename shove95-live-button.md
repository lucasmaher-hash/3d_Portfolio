# The Live button, in CSS

The round mark at the bottom-left of shove.95's tab bar — off, selected, and
on air, including the breath.

Companion to `shove95-skeukit-to-css.md`, which holds the palettes and the
three depth treatments. This file is one control in full: every layer, every
number, and why each is there.

**The CSS in section 9 has been rendered and checked** in both palettes and all
three states. It is not a transcription — it ran. Section 10 lists four things
that broke on the way, because each is a trap you would otherwise walk into.

Numbers come from `SkeuGlass.swift`, `SkeuGlassBakery.swift`, `SkeuPress.swift`,
`SkeuSegmented.swift` and `LiveGlyph.swift`.

---

## 1. What the button is saying

Three pieces of news, three signals, and **they must not move together** — the
decision worth writing up in the case study:

| Signal | Means | Layer |
|---|---|---|
| **Glass** under the mark | you are *on* the Live tab | selection |
| **Breath** on the mark | something is *on air* on the Lock Screen | state |
| **Swell** on press | you touched it | feedback |

An earlier build had the pulse riding a copy of the glyph that was only visible
once you were already on the Live tab — so the bar breathed exactly where the
news was least useful. The fix was to separate them: **the glass holds still,
the mark breathes.** Keep that separation on the web; it is the point of the
control.

---

## 2. Anatomy, outside in

```
  ┌─ bloom ────────────────┐   soft light leaking round the channel
  │ ┌─ trough ───────────┐ │   the channel, cut into the page
  │ │ · contour           │ │   the lip — a gradient ring, drawn LAST
  │ │  ┌─ glass ──────┐  │ │   ← SELECTED only
  │ │  │ lens stack   │  │ │     five 1%-white layers, group-blurred
  │ │  │ inner relief │  │ │     light mode only
  │ │  │ bottom glow  │  │ │     additive, centred BELOW the disc
  │ │  │ rim          │  │ │     gradient stroke: bright top and bottom
  │ │  │   ╭ mark ╮   │  │ │   ← ALWAYS
  │ │  │   │ ring │   │  │ │     stroked circle + core dot, breathing
  │ │  │   ╰──────╯   │  │ │
  │ │  └──────────────┘  │ │
  │ └────────────────────┘ │
  └────────────────────────┘
```

Six layers for one 35px button. That is the honest cost of the look — say so in
the write-up rather than hiding it.

**Layer order is source order.** No `z-index` anywhere, and deliberately so —
see §10.1.

---

## 3. Measurements

From the app at the design step (`chromeScale` 1.0):

```
tab bar height       51.0    SkeuToggle.height
vertical padding      8.2    SkeuToggle.padV
→ disc diameter      34.6    height − padV × 2
glyph diameter       17.3    disc × 0.5
ring stroke           1.7    LiveGlyph.lineWidth
core dot              0.42   of the glyph diameter
bloom overhang        5.3    SkeuToggle.bloomOverhang
bloom blur            1.85   SkeuToggle.bloomBlur — NOT scaled in the app
```

### Three scale factors, and they are not interchangeable

Different layers were authored against different reference sizes, so each gets
its own multiplier:

| Token | Divisor | Used by |
|---|---|---|
| `--k` | 104.54 | glass — lens, rim, relief, drop shadows |
| `--s` | 34.6 | bloom, glyph stroke |
| `--c` | 148.2 | trough — inner shadows and contour |

`--k` exists because the whole glass component was transcribed from a
221.31 × 104.54 reference button and every figure in it is in those units.
`--c` is the trough's own reference bar, 148.2 tall. Note it is **not** the
control height (51) — using that instead puts every trough figure out by ~2%,
which is small enough to look fine and still be wrong.

⚠️ **SwiftUI shadow `radius` ≈ half a CSS `blur-radius`** — all shadow blurs
below are already doubled. **This does NOT apply to `.blur()`**, which maps
about 1:1. Doubling the bloom's blur is the mistake that turned it into a
halo (§10.2).

---

## 4. The frame and the trough

```css
.live {
  --n: 34.6;                       /* disc diameter, UNITLESS — see §10.3 */
  --disc: calc(var(--n) * 1px);
  --k: calc(var(--n) / 104.54);
  --s: calc(var(--n) / 34.6);
  --c: calc(var(--n) * 1.474 / 148.2);
  --pad: calc(var(--disc) * 0.237);

  position: relative;
  display: grid;
  place-items: center;
  flex: none;                       /* or a flex row squashes it to an oval */
  width:  calc(var(--disc) + var(--pad) * 2);
  height: calc(var(--disc) + var(--pad) * 2);
  border: 0; padding: 0; background: none;
  cursor: pointer;
}

/* Bloom — light leaking round the OUTSIDE of the channel. Not a glow on the
   button: an oversized gradient slab with a small feather, behind everything.
   It is what stops the trough reading as a hole punched in the page. */
.live__bloom {
  position: absolute;
  inset: calc(-5.3px * var(--s));
  border-radius: 999px;
  background: linear-gradient(to bottom, var(--material-top), var(--recess));
  filter: blur(calc(1.85px * var(--s)));
  pointer-events: none;
}

/* Trough — the channel. Four inset shadows: the lip casting down, the far wall
   throwing shade back up from the floor, and two diagonals that round the
   corners. Dropping the diagonals flattens it immediately. */
.live__trough {
  position: absolute; inset: 0;
  border-radius: 999px;
  background: linear-gradient(to bottom, var(--recess), var(--recess-bottom));
  box-shadow:
    inset 0 calc(17.828px * var(--c)) calc(23.77px * var(--c))
      color-mix(in srgb, var(--shadow) 22%, transparent),
    inset 0 calc(-11.885px * var(--c)) calc(32px * var(--c))
      color-mix(in srgb, var(--shadow) 19%, transparent),
    inset calc(8.217px * var(--c)) calc(12.326px * var(--c)) calc(16.434px * var(--c))
      color-mix(in srgb, var(--shadow) 20%, transparent),
    inset calc(-8.247px * var(--c)) calc(-2.062px * var(--c)) calc(16.494px * var(--c))
      color-mix(in srgb, var(--shadow) 20%, transparent);
  pointer-events: none;
}
```

### The contour — the lip

**This is the ring the button looks wrong without.** It sits just inside the
raised edge, and its absence is the difference between a channel cut into the
material and a disc floating in a soft dent.

It is a **gradient**, not a flat colour: `outline` held dark through the top
half, then ramping to `outline-bottom` at the base — dark at the near lip, lit
at the far one. Figma's export flattens gradient strokes to a single averaged
hex, and taken at face value that average reads as an outline drawn *on* the
surface instead of an edge cut *into* it. Hold the dark through 45% rather than
ramping evenly from 0, or the highlight spreads up the sides and the lit lip
stops reading as a lip.

It is drawn **last, over the inner shadows**. Under them the lip loses its edge.

```css
.live__contour {
  position: absolute; inset: 0;
  border-radius: 999px;
  padding: max(1px, calc(7px * var(--c)));
  background: linear-gradient(to bottom,
    var(--outline) 0%, var(--outline) 45%, var(--outline-bottom) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
}
```

`max(1px, …)` is the app's own floor — the lip never thins to nothing at small
sizes. At the design size the ring is 2.4px; at `--n: 190` it is 13px.

Needs two more palette tokens: `--outline` and `--outline-bottom`
(Slate light `#7A7F87` / `#DDE0E5`, dark `#141517` / `#505357`).

---

## 5. The glass disc — selection only

```css
.live__glass {
  position: absolute; inset: var(--pad);
  border-radius: 999px;
  opacity: 0;
  transition: opacity 160ms ease-out;     /* SkeuMotion.tint */
  pointer-events: none;
  isolation: isolate;                     /* contains the glow's blend */
  box-shadow:
    0 calc(29.9px * var(--k)) calc(35.0px * var(--k))
      color-mix(in srgb, var(--shadow) 5%,  transparent),
    0 calc(13.4px * var(--k)) calc(26.8px * var(--k))
      color-mix(in srgb, var(--shadow) 9%,  transparent),
    0 calc(3.09px * var(--k)) calc(14.4px * var(--k))
      color-mix(in srgb, var(--shadow) 10%, transparent);
}
.live[aria-selected="true"] .live__glass { opacity: 1; }
```

**Lens stack.** Five concentric `rgba(255,255,255,0.01)` layers, each inset
further than the last, the *group* blurred. Alphas accumulate toward the
**middle** — ~5% at the centre, 1% at the rim. Thickness, not a highlight.

> Getting this backwards is the classic failure. A rim-weighted gradient —
> brightest at the edge — reads as a chrome ring, not as glass.

```css
.live__lens { position: absolute; inset: 0; filter: blur(calc(3.281px * var(--k))); }
.live__lens i { position: absolute; border-radius: 999px; background: rgba(255,255,255,.01); }
.live__lens i:nth-child(1) { inset: 0; }
.live__lens i:nth-child(2) { inset: calc(2.46px * var(--k))  calc(1.70px * var(--k)); }
.live__lens i:nth-child(3) { inset: calc(7.39px * var(--k))  calc(5.09px * var(--k)); }
.live__lens i:nth-child(4) { inset: calc(15.59px * var(--k)) calc(10.74px * var(--k)); }
.live__lens i:nth-child(5) { inset: calc(31.99px * var(--k)) calc(22.03px * var(--k)); }
```

At 34.6px these insets are sub-pixel and the stack contributes almost nothing.
**Render at 3× or more for the case study** and it appears. Worth stating: the
app carries a lens nobody can see at tab size.

**Inner relief — light mode only.** On a dark page a lit rim has all the room it
needs; on a light page it has none, because the material already sits near the
top of the range, and a white edge on a near-white surface is not an edge. The
relief supplies a lit band at the top, a shade rising to the bottom, and a soft
draw-in at the sides.

```css
.live__relief {
  position: absolute; inset: 0; border-radius: 999px;
  background: linear-gradient(to bottom,
    color-mix(in srgb, var(--edge-light) 39.2%, transparent) 0%,
    color-mix(in srgb, var(--edge-light) 12.3%, transparent) 14%,
    transparent 34%, transparent 60%,
    color-mix(in srgb, var(--edge-shade) 10.2%, transparent) 80%,
    color-mix(in srgb, var(--edge-shade) 24%,   transparent) 100%);
}
/* the sides, drawn in: a thick blurred ring masked to left and right only */
.live__relief::after {
  content: ""; position: absolute; inset: 0; border-radius: 999px;
  border: calc(13px * var(--k)) solid
          color-mix(in srgb, var(--edge-shade) 12.8%, transparent);
  filter: blur(calc(9px * var(--k)));
  -webkit-mask-image: linear-gradient(to right, #000 0%, transparent 30%, transparent 70%, #000 100%);
          mask-image: linear-gradient(to right, #000 0%, transparent 30%, transparent 70%, #000 100%);
}
.dark .live__relief { display: none; }
```

**Bottom glow.** An elliptical white gradient centred *below* the disc
(y = 1.20), blended additively so it lifts the material without tinting it.

```css
.live__glow {
  position: absolute; inset: 0; border-radius: 999px;
  background: radial-gradient(ellipse 62% 62% at 50% 120%,
              rgba(255,255,255,.5) 0%, rgba(255,255,255,0) 100%);
  mix-blend-mode: plus-lighter;
}
```

**Rim.** Bright along the top and bottom, all but gone across the middle of the
sides — only surfaces facing the key light catch it. A flat even stroke turns
the lens into a ring. Light mode gets a 1.35× thicker rim and its top stop
lifted 30%, because with the relief shading inward the rim is the only thing
left saying where the light comes from.

```css
.live__rim {
  position: absolute; inset: 0; border-radius: 999px;
  padding: calc(2.971px * var(--k) * 1.35);
  background: linear-gradient(to bottom,
    color-mix(in srgb, var(--edge-light) 71.5%, transparent) 0%,   /* 0.55 × 1.3 */
    color-mix(in srgb, var(--edge-light) 5%,    transparent) 50%,
    color-mix(in srgb, var(--edge-light) 60%,   transparent) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
.dark .live__rim {
  padding: calc(2.971px * var(--k));
  background: linear-gradient(to bottom,
    color-mix(in srgb, var(--edge-light) 55%, transparent) 0%,
    color-mix(in srgb, var(--edge-light) 5%,  transparent) 50%,
    color-mix(in srgb, var(--edge-light) 60%, transparent) 100%);
}
```

The `padding` + double-mask + `mask-composite: exclude` pattern is how you get a
**gradient border on a circle**. `border-image` ignores `border-radius`, so it
is not an option.

---

## 6. The mark

A stroked circle with a core at 0.42 of the diameter. Below 0.42 the core reads
as a speck in an empty ring; above it the gap closes and the two merge into a
blob at tab size.

```css
.live__mark {
  --core: var(--ink);               /* set here, per theme — see §10.4 */
  position: relative;
  width:  calc(var(--disc) * .5);
  height: calc(var(--disc) * .5);
  border-radius: 999px;
  border: calc(1.7px * var(--s)) solid var(--ink);
  box-sizing: border-box;
  transition: transform 260ms cubic-bezier(.34, 1.56, .64, 1);
}
.live__mark::after {
  content: ""; position: absolute; inset: 0; margin: auto;
  width: 42%; height: 42%;
  border-radius: 999px;
  background: var(--core);
}
```

---

## 7. The breath

Slow and shallow on purpose. A list is somewhere people read, and a fast or wide
pulse in the corner of the eye is the kind of motion people end up covering with
a thumb.

**One rule, both looks:**

- **small end** — low opacity, barely there
- **large end** — full opacity, pushed *away from the page*: darker on a light
  page, brighter on a dark one

Growing and becoming visible are the same motion. Only the direction of "away
from the page" depends on the mode. Three earlier partial fixes each broke it
somewhere else before it was stated this simply.

```
small:  opacity 0.28   scale 0.88   ink unshifted
large:  opacity 1.00   scale 1.08   ink pushed away from the page
        1.0s ease-in-out, autoreversing → a 2s cycle
```

The push is SwiftUI's additive `.brightness(±0.33)`. On Slate the arithmetic
clamps at both ends — light ink `#212224 − 87`, dark ink `#DCE5F5 + 82` — so in
practice the large end is **pure black in light, pure white in dark**. That
holds for all four palettes; the inks sit close enough to the ends of the range.

```css
@property --core { syntax: "<color>"; inherits: true; initial-value: #212224; }

@keyframes breathe-light {
  from { opacity: .28; transform: scale(.88); border-color: #212224; --core: #212224; }
  to   { opacity:  1;  transform: scale(1.08); border-color: #000;    --core: #000; }
}
@keyframes breathe-dark {
  from { opacity: .28; transform: scale(.88); border-color: #DCE5F5; --core: #DCE5F5; }
  to   { opacity:  1;  transform: scale(1.08); border-color: #fff;    --core: #fff; }
}
.live[data-onair="true"] .live__mark { animation: breathe-light 1s ease-in-out infinite alternate; }
.dark .live[data-onair="true"] .live__mark { animation-name: breathe-dark; }
```

`@property` is what lets `--core` interpolate — an unregistered custom property
animates in discrete steps and the dot jumps rather than fades. Two named
keyframe sets, switched with `animation-name`, because **`@keyframes` cannot be
nested inside a selector**; only the property may be overridden per theme.

---

## 8. Press, motion, accessibility

Every control in the app **swells** when touched — it does not depress. Worth a
line in the case study: pushing a soft object makes it bulge, and the app is
consistent about that everywhere.

```css
.live:active .live__mark { transform: scale(1.115); }
```

`1.115` is the app's figure; the `cubic-bezier(.34,1.56,.64,1)` on `.live__mark`
overshoots the way the spring does (response 0.36, damping 0.60 — deliberately
underdamped).

**The swell rides the mark, never the trough.** This was a real bug: the press
was wrapped around the finished control — trough, bloom and all — so pressing
Live grew the whole channel, while every tab beside it grew only its pill inside
a channel that never moved. One bar, two reactions.

```css
@media (prefers-reduced-motion: reduce) {
  .live[data-onair="true"] .live__mark { animation: none; opacity: 1; transform: scale(1.08); }
  .live:active .live__mark { transform: none; }
  .live__glass { transition: none; }
}
```

The breath is the only indicator that something is on the Lock Screen, so with
motion off the mark settles at the **large, fully-opaque end** — never the faint
one. Removing motion must not remove information.

```html
<button class="live" aria-selected="true" data-onair="true" aria-label="Live">
```

- `aria-label="Live"` — the mark has no text and none would fit
- `aria-selected` carries selection, so it does not depend on seeing glass
- the breath is decorative; if a task is on air, say so in text elsewhere
- **hit target:** the app's minimum is 44pt. The disc is 34.6 — the trough
  padding is what makes the target legal, which is why the click handler sits on
  the **outer** element. Do not move it inward when you move the scale inward.

---

## 9. Complete and working

Verified rendering in both palettes, all three states.

```html
<div class="stage">          <!-- add class="dark" for the dark palette -->
  <button class="live" aria-selected="false" data-onair="false" aria-label="Live">
    <span class="live__bloom"></span>
    <span class="live__trough"></span>
    <span class="live__contour"></span>
    <span class="live__glass">
      <span class="live__lens"><i></i><i></i><i></i><i></i><i></i></span>
      <span class="live__relief"></span>
      <span class="live__glow"></span>
      <span class="live__rim"></span>
    </span>
    <span class="live__mark"></span>
  </button>
</div>
```

```css
.stage { background: var(--canvas); display: flex; gap: 54px;
         align-items: center; justify-content: center; padding: 38px; }
.live { --n: 104; }        /* 3× the design size — where the lens appears */
```

Palette tokens come from the companion file. The minimum this button needs:
`--canvas --material-top --recess --recess-bottom --outline --outline-bottom
--edge-light --edge-shade --ink --shadow`.

---

## 10. Four traps

Every one of these was hit while building it, and none is obvious from reading.

**10.1 — `isolation: isolate` + `z-index: -1` hides the bloom's own parent.**
Inside a stacking context, a negative-`z-index` child paints *above* the
element's background — so a bloom pseudo-element covered the trough entirely and
the channel vanished. Fix: no `z-index` at all. Make bloom and trough real
sibling elements and let source order do the work.

**10.2 — the halve-the-blur rule is for shadows only.** SwiftUI shadow `radius`
≈ half a CSS `blur-radius`, but `.blur(radius:)` maps about 1:1. Doubling the
bloom's 1.85pt feather turned a crisp soft edge into a wide white halo that
swallowed the whole control.

**10.3 — keep the size token unitless.** With `--disc: 118px`, a factor like
`calc(var(--disc) / 34.6)` is a *length*, so `5.3px * var(--s)` is px² —
invalid, and the declaration is silently dropped. Nothing errors; the layer just
disappears. Store the number (`--n: 118`) and multiply by `1px` where a length
is actually needed.

**10.4 — a registered `@property` initial value beats `var()`'s fallback.**
`var(--core, var(--ink))` never reaches the fallback once `--core` is registered
with `initial-value: #212224`, so the core dot rendered near-black on the dark
palette and looked like it had gone missing. Set `--core: var(--ink)` explicitly
on the element instead of leaning on the fallback.

Also, minor but wasteful: give `.live` **`flex: none`**. In a flex row it will
otherwise shrink and the circle becomes an oval.

---

## 11. If you cut anything, cut in this order

Rendered small, several layers cost more than they return:

1. **the lens stack** — invisible below ~100px; keep it for the hero shot only
2. **the inner relief** — only does work on a light page
3. **the bloom** — the trough survives without it, just flatter
4. **the glow** — subtle, but it is what makes the disc look lit from beneath

Never cut **the contour**, **the rim**, **the trough**, or **the breath**.
Those four are the button; the rest is refinement on top of them. The contour
especially — it is one gradient ring and it carries more of the look than any
of the four layers above.
