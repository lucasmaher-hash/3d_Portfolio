# SkeuKit components, in CSS

Every other control in shove.95 — buttons, icons, the toggle panels, the
recessed text fields and the workspace toggle — in both typeface styles and
both palettes.

**Three files, and the CSS is a real stylesheet, not a code block:**

| File | Use |
|---|---|
| `shove95-components.css` | drop-in. Link it and use the classes. |
| `shove95-components-demo.html` | every component, light and dark, both typefaces |
| `W95FA.otf` + `W95FA-LICENSE.txt` | the pixel face. Keep them together. |
| this file | what each one is, the sizes, and the rules that are easy to break |

It sits beside two others: `shove95-skeukit-to-css.md` (palettes, geometry, the
depth primitives) and `shove95-live-button.md` (one control worked through in
full detail). **Read the palette section of the first one before this** — every
class here expects those custom properties.

This is a separate file rather than an addition to the live-button one on
purpose: that file is a deep-dive on a single control, and burying a component
library inside it would cost both. Where the two overlap, the live-button file
is the more detailed and the more correct.

Everything below was rendered and checked in both palettes before it was
written down.

---

## 0. Read this before you ship anything

**SF Symbols cannot be used on the web.** Apple licenses them for use in
software running on Apple platforms; a portfolio site is not that, and the
licence does not permit redrawing them closely either. So the app's vector
icons — gear, ✕, tick, ＋, pencil, chevron — are **redrawn from scratch** in
`shove95-components-demo.html` as plain SVG. They read as the same set at
button size. They are not the same paths, and they must not be.

The **pixel** glyphs have no such problem: they were drawn in-house for this
app, and the ones marked *(app)* below are transcribed cell-for-cell from
`Components/PixelGlyphs.swift`.

**W95FA** (Alina Sava, SIL OFL) may be self-hosted, and the attribution is a
licence condition rather than a courtesy. `W95FA.otf` ships here with
`W95FA-LICENSE.txt`; keep them together and credit the face on the page.

⚠️ **The licence file as shipped in the app is the blank OFL template** — the
`<dates>` / `<Copyright Holder>` / `<Reserved Font Name>` placeholders were
never filled in, and Alina Sava is not named anywhere in it. The OFL requires
the copyright notice to travel with the font. Worth fixing in the app bundle as
well as here; it is a small thing that is easy to correct and awkward to be
caught on.

---

## 1. Scale

Every component reads one variable:

```css
.sk { --z: 1; }        /* 1 = the app's own size; 1.35 in the demo */
```

Sizes below are the app's design-step figures in px; the CSS multiplies each by
`--z`. Set `--z` per section if a case-study page wants the controls larger than
life — which it usually does, because at `--z: 1` these are phone-sized and a
desktop reader will think they are icons.

| Component | Height | Other |
|---|---|---|
| Round button (gear, ✕) | 44.4 | icon 22.2 |
| Round button, small (＋, edit) | 37 | icon 18.5 |
| Checkbox | 33.3 | tick 11 |
| Action pill | 38 | padding-x 17.1, label 12.8 |
| Row button (Default/Delete/Add) | 34.6 | **fixed width 88** |
| Toggle panel (trough) | 51 | pad-x 8.2, gap 3 |
| Toggle option (inner pill) | 34.6 | pad-x 7.6, pad-y 8.2, label 16.4 |
| Text field | 51 | pad-x 16, label 12.8 |
| Workspace pill row | 40.6 | pad-x 14.8, gap 12.2, label 19.7 |

Three of these are the same number, and that is deliberate. **The input row is
the toggle, taken apart:** the field is the toggle's trough (51) and the button
beside it is the toggle's inner pill (34.6). A field row and an option row are
meant to be visibly the same construction. If you change one, change both.

The **88px row-button width is fixed, not intrinsic.** Default, Delete and Add
stack in one column down the settings sheet, and three different widths there
read as three different kinds of control. It is sized for "Default", the
longest word.

---

## 2. Glass — and the one rule people get wrong

Two states, and they are not "the same thing, fainter".

**Prominent** (`.sk-glass`) — the active control. Full rim, bottom glow, full
shadows, and on a light page an inward relief.

**Resting** (`.sk-glass .sk-glass--rest`) — used by exactly one thing, the
unchecked checkbox. Half-strength shadows, **no glow, no relief**, and on a
light page a completely different rim:

> On a light material the lit rim has nowhere brighter to go, so the contact
> shade is what separates an object from the page.

So a resting control on a **light** page gets a **contact edge** — dark along
the lower arc, gone by the top, where the page is already brighter than the
object. Not a dimmed white rim. A white rim on a near-white material is not an
edge, and at half strength with no glow underneath it disappeared completely;
that is what once made every unchecked circle unreadable in light mode.

That contact rim is **absolute, never scaled by strength**. It only ever runs at
rest, and halving it a second time was the original bug.

On a **dark** page the lit rim has all the room it needs, so resting there is
simply the lit rim at half strength. Four combinations, three different rims:

| | Prominent | Resting |
|---|---|---|
| **Light** | lit rim, top stop ×1.3, width ×1.35, + relief + glow | **contact edge**, absolute |
| **Dark** | lit rim, full | lit rim, ×0.5 |

### What I simplified

The app's glass carries a **five-layer lens stack** — five 1%-white layers,
group-blurred, accumulating toward the middle. `shove95-components.css` omits
it, because it is invisible below about 100px and nothing in this file is that
big. If you render a control large for a hero shot, take the lens from
`shove95-live-button.md`.

The bottom glow is a plain white radial here rather than the app's additive
`plus-lighter` blend. At these sizes the two are indistinguishable, and the
blend needs an isolation context that is easy to break inside a flex row.

---

## 2a. The bloom — a trough's outer bevel

A trough on its own is a channel with nothing around it. **The bloom is what
seats it in the ground**, so the bar sits in a shallow dish rather than on flat
paint. It is the outer highlight and shading — a bright band along the top
edge, a dark one along the bottom.

It is a gradient slab, one size larger than the trough, softly feathered:

```css
.sk-trough__bloom{
  position:absolute; inset:calc(-5.3px*var(--z)); border-radius:inherit;
  background:linear-gradient(to bottom, var(--material-top), var(--recess));
  filter:blur(calc(1.85px*var(--z)));
  z-index:-1; pointer-events:none;
}
```

**Light over dark — the opposite of the trough's own fill.** That inversion is
what makes it read as an outer bevel rather than a second shadow.

**The lit stop is `--material-top`, not `--recess-bottom`.** `recess-bottom` and
`canvas` sit at the same brightness, so a bloom starting there was drawn in
exactly the tone behind it: the outer top edge got no lift at all, only the dark
half showed, and it read as a shadow *under* the bar instead of a dish it sits
in.

**Overhang and feather are absolute** — 5.3 and 1.85 design px. They do not
scale with the control's height, only with `--z`. The feather is deliberately
tiny; this is a crisp bevel, not a halo. (In the app the blur is not even scaled
by chrome size.)

### Which troughs get one

| | Bloom? |
|---|---|
| Tab bar | **yes** |
| Every settings toggle | **yes** |
| The Live tab | **yes** |
| Text fields | **no** |

All segmented troughs share one component, so they all carry it. A text field is
a plain channel.

```html
<div class="sk-seg sk-trough">
  <span class="sk-trough__bloom"></span>   <!-- first child, always -->
  …
</div>
```

### How the layers stack

`.sk-trough` is **transparent**; its fill and inner shadows live on `::before`,
the contour on `::after`, and the bloom is a `z-index:-1` child. That ordering is
the only arrangement that works, and it is worth understanding rather than
copying:

- A child can never paint behind its parent's **background** — negative
  `z-index` children paint *above* it. So the fill cannot stay on the element.
- With the fill moved to `::before` (a positioned descendant), a `z-index:-1`
  child lands below it and above the element's own transparent background —
  exactly where a bloom belongs.
- `isolation: isolate` is required, or that negative layer escapes to the
  nearest ancestor stacking context and disappears behind the page background.

The live-button file lists `isolation` + `z-index:-1` as a trap; this is the
other half of it. It is a trap when the element paints its own background, and
the correct tool once the element is transparent.

---

## 3. Components

### Round glass button

```html
<button class="sk-round sk-glass sk-press" aria-label="Settings"> <!-- svg --> </button>
<button class="sk-round sk-round--sm sk-glass sk-press" aria-label="Add"> <!-- svg --> </button>
```

The gear turns **half a turn on every press**, accumulated rather than toggled
so it keeps going one way:

```css
.gear { transition: transform 400ms cubic-bezier(.2,.8,.3,1); }
/* add 180deg per click in JS — never reset to 0 */
```

### Checkbox

```html
<button class="sk-check sk-glass sk-glass--rest" aria-label="Not completed"></button>
<button class="sk-check sk-glass" aria-label="Completed"> <!-- tick --> </button>
```

Empty when open — no outline, no placeholder mark. The glass *is* the control.
Ticking it moves it from resting to prominent, which is why the two states look
so different: the disc lights up, it does not merely gain a mark.

In the app the 33.3px disc sits inside a **44pt touch target**. Keep the click
handler on a wrapper, not on the disc.

### Pills

```html
<button class="sk-pill sk-glass sk-press">Done</button>
<button class="sk-rowbtn sk-glass sk-press">Default</button>
<button class="sk-rowbtn sk-glass sk-press sk-rowbtn--danger">Delete</button>
```

Delete is the one destructive word on the settings screen and takes `--critical`
— but it is still the same pill. The colour is the only difference.

### Toggle panel

```html
<div class="sk-seg sk-trough">
  <span class="sk-trough__bloom"></span>
  <button class="sk-seg__opt is-on">
    <span class="sk-seg__pill sk-glass"></span>
    <span class="sk-seg__label">Today</span>
  </button>
  <button class="sk-seg__opt"><span class="sk-seg__label">Tmw</span></button>
  …
</div>
```

**Every option is laid out identically whether or not it is selected** — same
font, same padding, same equal-width column — so no label can shift when the
selection moves. The glass is a *background* the selected column carries, and it
must sit under the label: put the pill first in the DOM.

In the **tab bar** these labels are chrome and go pixel under Retro; in
**settings** the same component's labels are content and do not. Same class,
different role — pass `sk-chrome` only in the tab-bar case.

The 3px gap between options is invisible on a row of labels, where only one
pill is ever drawn. It earns its keep on the theme row, where every option
carries a colour and butted-up capsules read as one striped bar rather than
four pills.

**The glide.** In the app the pill is a single matched-geometry element that
travels between columns and swells slightly on arrival — the glide alone read
as the whole event, so landing gives the journey an end. The demo here just
moves the pill between parents, which does not animate. For the real thing, use
**one** pill absolutely positioned in the trough and drive it with a transform:

```css
.sk-seg__pill { transition: transform 400ms cubic-bezier(.2,.8,.3,1),
                            width 400ms cubic-bezier(.2,.8,.3,1); }
```

### Theme swatch row

Same trough, but the choice **is** a colour, so it fills the pill rather than
sitting in it as a dot.

```html
<button class="sk-seg__opt is-on">
  <span class="sk-seg__swatch" style="background:linear-gradient(160deg,#B45573,#852D49)"></span>
  <span class="sk-seg__pill sk-glass"></span>
</button>
```

Three rules, each settled the hard way:

1. Unchosen swatches are **half as wide** — a stated half, not by feel.
2. **The column never moves.** Only the colour inside it changes width, so the
   row keeps its rhythm and every swatch keeps a full-width target to press.
3. The 5.5px inset is what leaves the selected swatch's glass rim showing
   **around** the colour rather than over it. The glass is a lens with no fill,
   so it goes over the swatch — as a background layer its rim would be hidden.

A swatch is a **gradient**, never a flat hex: silver at a neutral hue is just
grey. Use each palette's `accent-top → accent-bottom`.

### Indented text field

```html
<p class="sk-eyebrow">Workspace name</p>
<div class="fieldrow">
  <div class="sk-field sk-trough">
    <input class="sk-field__input" value="Personal">
  </div>
  <button class="sk-rowbtn sk-glass sk-press">Default</button>
</div>
```

**The trough must be a wrapper, never the `<input>` itself.** Replaced elements
generate no `::before`/`::after`, so an input styled directly as a trough
silently loses its fill and its contour — no error, it just comes out flat. The
input inside carries no chrome of its own, and needs `position: relative` or it
disappears behind the trough fill on `::before`.

Inputs are recessed — the same channel everything else uses. **Nothing else goes
inside the trough.** The Default / Delete / Add buttons used to sit in there,
which put a control inside a container meant to read as a hole in the surface.
They stand beside it now.

A trough looks like a place text *lives*, not a place text is *changed* —
nothing about it says you may type here — so the rename row carries a round edit
button beside it. That button is sized to the **pill next to it, not to the
field**: a circle as tall as the trough towered over everything else on the row.

The field always holds the real current value at full strength. A greyed
placeholder showing the current name reads as empty.

### Workspace toggle

```html
<div class="sk-ws sk-glass">
  <div class="sk-ws__head">Personal <span class="sk-ws__chev"><!-- chevron --></span></div>
  <div class="sk-ws__list">
    <div class="sk-ws__item">Work</div>
    <div class="sk-ws__item">Studio</div>
  </div>
</div>
```

**Nothing detaches — the pill *is* the menu.** Opening grows the same glass
container downward; no dropdown, no popover, no shadow layer. The corner radius
stays at half the *row* height, so an open pill is a rounded rectangle rather
than a taller capsule.

The chevron is **two strokes, nothing else** — no circle, no glass of its own.
It rides inside the pill it controls, and it appears **only when there is
somewhere to go**. One workspace means nothing to pick, and an arrow onto an
empty list is a promise the interface cannot keep. The pill still swells when
pressed — it reads as a control that is simply already where it can be.

The name is **chrome**, not content: it is the app naming where you are, not
something you are reading. It carries `sk-chrome`, so under Retro it and every
name in the open list take the pixel face.

Long names shrink rather than wrap, with a ceiling — past the shrink floor the
text grows the pill again and carries the settings gear off the screen edge.

---

## 4. Icons

Eight marks, two styles each, in `shove95-components-demo.html`.

| Mark | Pixel grid | Source |
|---|---|---|
| gear | 12×12 | **app** — hollow ring, 4 teeth, 4 corner nubs |
| close ✕ | 8×8 | **app** |
| check | 12×12 | **app** |
| live ring | 11×11 | **app** — ring quantised from a circle, 3×3 core |
| plus | 12×12 | drawn to match |
| edit | 12×12 | drawn to match |
| grip | 12×12 | drawn to match |
| chevron | 12×7 | drawn to match |

The first four are transcribed cell-for-cell from the app. **The last four do
not exist in the app** — the app has no pixel version of them, because those
controls never appear in a pixel context. I drew them on the same grids so the
set is complete for a web page. Say so if the case study claims to show the
app's icon set; four of these are new.

**The gear is hollow on purpose.** A solid body turns to mush at 24pt — the hole
is what makes it read as a gear.

**Pixel glyphs need their own scale factor.** A bitmap glyph fills its box where
a vector one leaves optical margin, so matching the raw point size makes the
pixel version read as the larger of the two. The app's figures: **0.82** for the
gear and the ✕, **1.85** for the tick. One factor for all three left the tick a
speck inside its circle. `shove95-components.css` applies these already.

Always render pixel glyphs with `shape-rendering="crispEdges"` and at whole
multiples of the grid, or the cells land on fractional pixels and the whole
point is lost.

### Which style goes where

**Two faces, not three.** There was an all-pixel option and it was cut — a
blend is what almost everyone actually wants, and the third choice only made
the decision harder.

| Setting | In the app | What it does |
|---|---|---|
| **Modern** | `.sk` | system face everywhere |
| **Retro** | `.sk.retro` | pixel face on **chrome only** |

**Content is never pixel, in either face.** A task's title, a name someone
typed — those are the user's own words and are never sacrificed to costume.
This is the single most important rule in the type system and the easiest one
to get wrong: "Retro" does not mean "all pixel".

---

## 4a. Typography

```css
@font-face{ font-family:"W95FA"; src:url("W95FA.otf") format("opentype"); font-display:swap; }
.sk{ --fs:1 }
.retro .sk-chrome{ font-family:"W95FA",ui-monospace,monospace; --fs:1.22;
                   -webkit-font-smoothing:none; }
```

Mark furniture with **`.sk-chrome`**. Everything unmarked is content by
default, so a component that says nothing gets the readable face — the safe
direction to fail in.

**The 1.22× is not optional.** W95FA's glyphs fill their em box, so matching the
raw point size makes the system face look oversized in the same layout. Every
font-size in `shove95-components.css` already carries it as `var(--fs)`; if you
add a component, do the same rather than hard-coding a second size.

Always pair the pixel face with `-webkit-font-smoothing: none`, and place text
at whole pixel sizes where you can.

### Which components are chrome

| Component | Role | Pixel under Retro? |
|---|---|---|
| Tab bar labels | chrome | **yes** |
| Workspace name and its list | chrome | **yes** |
| Eyebrow / section headings | chrome | **yes** |
| Screen titles | chrome | **yes** |
| Settings toggle options | **content** | no |
| Action pills, row buttons | **content** | no |
| Text field values and placeholders | **content** | no |
| Task titles | **content** | no |

Two of those rows surprise people, so they are worth stating plainly.

**The settings toggle options are content — selected or not.** They were pixel
for one round and the founder reversed it: in settings only the *headings*
carry the face, so the options read as a row of equals and **the choice is
marked by the glass, not by the type**. The tab bar is the opposite case: it is
furniture end to end, so all four labels stay pixel.

**The pills are content too.** `Done`, `Default`, `Delete`, `Add` all go through
the default `.content` role in the app, so they stay in the system face in both
settings. The demo shows a third row — *Retro · forced pixel* — because a
portfolio page may well want them pixel for a hero shot. Use it if you like, but
it is a deviation from the app, and the case study should not present it as the
app's behaviour.

To force it: add `sk-chrome` to the pill.

---

## 5. Dark mode

`shove95-components.css` switches on a `.dark` class rather than
`prefers-color-scheme`, so a case-study page can show both at once — which it
will want to. Wire it to the media query too if the page has a single mode.

What actually changes, beyond the palette:

- **No inward relief.** It exists only to solve the light-mode problem of a
  white rim on a near-white material.
- **A thinner rim** — no 1.35× width and no 1.3× boost on the top stop.
- **Resting glass keeps a lit rim** at half strength, instead of switching to a
  contact edge.
- Shadow intensity drops to **0.9**.

---

## 6. Press and motion

Everything that can be pressed carries `.sk-press`: a swell to **1.115** on a
260ms overshooting curve. It swells, it does not depress — pushing a soft object
makes it bulge, and the app is consistent about that everywhere.

**Scale the mark, never the channel it sits in.** A press wrapped around a
finished control grows the trough too, and next to a tab bar whose pills grow
inside a channel that stays put, one bar ends up with two different reactions.

`.sk-press` already honours `prefers-reduced-motion`. Keep it that way.

---

## 7. Three traps

Each of these fails **silently** — no error, no warning, just a component that
comes out subtly wrong.

**7.1 — `font: <size>/<lh> inherit` is invalid CSS.** `inherit` is not a legal
family inside the `font` shorthand, so the whole declaration is dropped and the
element quietly inherits its parent's size. Every component here was rendering
at 16.4px instead of its own size until this was caught with
`getComputedStyle`. Use longhands: `font-family: inherit; font-size: …;
font-weight: …`.

**7.2 — a positioned pseudo-element paints over in-flow content.** `::before`
carries the trough fill and is a positioned descendant, so an unpositioned input
inside it vanishes. Give the content `position: relative`. The segment options
escape this only because they are already `position: relative` for their pills.

**7.3 — an `<input>` cannot be a trough.** See §3. If a trough looks flat, check
first whether it is a replaced element.

Verify sizes with `getComputedStyle` rather than by eye. Two of these three were
invisible in a screenshot and obvious in one line of console.

---

## 8. What not to do

- **Never put a task row in a card.** Rows are text on the ground; only the
  checkbox is an object. Troughs are reserved for chrome — bars, inputs, panels.
- **Never put a button inside a trough.** A trough reads as a hole in the
  surface. Controls stand beside it.
- **Never use a flat colour where the app uses a gradient** — swatches, the
  trough contour, the rim. Flat is the failure mode of every one of them.
- **Never let a rim be the only thing separating an object from a light page.**
  That is what the contact edge is for.
- **Don't put a bloom on a text field.** It is what marks a *bar* as furniture
  seated in the page; on an input it just makes the field look raised.
- **Don't reach for SF Symbols.** See §0.
