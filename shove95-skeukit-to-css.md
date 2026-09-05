# SkeuKit → CSS

How to rebuild shove.95's visual language in plain HTML/CSS for the portfolio
page. No Swift, no framework, no build step.

Every number here was read out of the app's source on 2026-09-05, not
eyeballed from a screenshot. The palettes were **computed** by reimplementing
the app's own derivation, so they match the running app exactly.

---

## 0. What you actually need this for

The case study page needs shove.95's chrome to appear *around* real
screenshots — section headings, a task-row mock, a tab bar, a swatch strip.
You do **not** need to rebuild the app. Build the pieces the page shows and
nothing else.

**The one rule that makes it look right:** depth comes from **light**, never
from texture. Every surface is the same material at a different brightness,
lit from above. There are exactly three treatments — **card** (raised),
**trough** (recessed), **glass** (a control floating on either). If you find
yourself reaching for a border to separate two things, you have left the
system.

---

## 1. Palettes

Four themes × light and dark. Slate is the default and the one to use unless
the page needs the swatch strip.

Cream is hand-authored; Slate, Moss and Rose are derived from a single seed
colour each — which is itself a point worth making in the case study.

### Slate (default)

```css
:root {
  --canvas:          #CACFD6;
  --material:        #D5D9E0;
  --material-top:    #E4E8EE;
  --material-bottom: #B5BAC1;
  --recess:          #9BA1AB;
  --recess-bottom:   #C9CED6;
  --edge-light:      #FFFFFF;
  --edge-shade:      #464B52;
  --seam:            #FAFCFF;
  --outline:         #7A7F87;
  --outline-bottom:  #DDE0E5;
  --outline-lit:     #F7F9FE;
  --ink:             #212224;
  --ink-muted:       #515357;
  --ink-faint:       #787B80;
  --ink-on-accent:   #F1F7FC;
  --accent:          #3F5670;
  --accent-top:      #4F6680;
  --accent-bottom:   #31465E;
  --positive:        #336B39;
  --caution:         #855E25;
  --critical:        #6B180D;
  --shadow:          #242629;
  --shadow-strength: 1.0;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --canvas:          #2C2D30;
    --material:        #2C2D30;
    --material-top:    #3C3F42;
    --material-bottom: #202124;
    --recess:          #191A1C;
    --recess-bottom:   #35373B;
    --edge-light:      #D6E5FF;
    --edge-shade:      #070708;
    --seam:            #57595C;
    --outline:         #141517;
    --outline-bottom:  #505357;
    --outline-lit:     #64676B;
    --ink:             #DCE5F5;
    --ink-muted:       #9FAABD;
    --ink-faint:       #707B8C;
    --ink-on-accent:   #E8F2FC;
    --accent:          #526D8C;
    --accent-top:      #6682A2;
    --accent-bottom:   #425A76;
    --positive:        #6AB872;
    --caution:         #DBA758;
    --critical:        #FF7866;
    --shadow:          #09090A;
    --shadow-strength: 0.9;
  }
}
```

### The other three

Same token names. Swap the values.

| Token | Cream L | Cream D | Moss L | Moss D | Rose L | Rose D |
|---|---|---|---|---|---|---|
| canvas | `#D6C3B2` | `#2E2119` | `#C9D5BD` | `#2B3027` | `#D6A3B2` | `#301C22` |
| material | `#E0CEBE` | `#2E2119` | `#D4DFC9` | `#2B3027` | `#E0B2C0` | `#301C22` |
| material-top | `#EDDED1` | `#3E2E24` | `#E3EDDB` | `#3C4237` | `#EEC7D3` | `#422A31` |
| material-bottom | `#C1AF9F` | `#241A13` | `#B4C0AA` | `#20241C` | `#C192A0` | `#241418` |
| recess | `#AB937E` | `#1A120D` | `#9BAA8D` | `#191C16` | `#AB6D7F` | `#1C0F13` |
| recess-bottom | `#D6C1AE` | `#362720` | `#C8D5BB` | `#353B30` | `#D69FAF` | `#3B242B` |
| edge-light | `#FFFFFF` | `#FFEEE0` | `#FFFFFF` | `#EAFFD6` | `#FFFFFF` | `#FFD6E2` |
| edge-shade | `#5E5145` | `#0A0705` | `#424D37` | `#070806` | `#592333` | `#080405` |
| seam | `#FFF8F2` | `#6F5B4C` | `#FAFFF6` | `#575C52` | `#FFECF2` | `#5C464D` |
| outline | `#877260` | `#1A130D` | `#79866D` | `#141711` | `#875261` | `#170B0F` |
| outline-bottom | `#E5D9CE` | `#5E4634` | `#DCE4D5` | `#50574A` | `#E5C5CE` | `#573D44` |
| outline-lit | `#FCF5EF` | `#6E5240` | `#F7FEF0` | `#646B5E` | `#FEE1E9` | `#6B4E57` |
| ink | `#241D17` | `#F2E7DC` | `#21241F` | `#E8F5DC` | `#24191C` | `#F5DCE4` |
| ink-muted | `#57493D` | `#BFAC9E` | `#51574C` | `#ADBD9F` | `#573F46` | `#BD9FA7` |
| ink-faint | `#806E5F` | `#8F7F72` | `#788071` | `#7E8C70` | `#80626A` | `#8C7078` |
| accent | `#9A6630` | `#C08C6C` | `#4E6B45` | `#638659` | `#9E3F5D` | `#C65578` |
| accent-top | `#B07A3F` | `#D4A587` | `#5D7A54` | `#779B6C` | `#B45573` | `#E57095` |
| accent-bottom | `#7E5223` | `#9C6B4E` | `#3F5A37` | `#527048` | `#852D49` | `#A64262` |
| critical | `#6B180D` | `#FF7866` | `#6B180D` | `#FF7866` | `#6B180D` | `#FF7866` |
| shadow | `#2E1F12` | `#080503` | `#24291F` | `#090A08` | `#29141A` | `#0A0507` |

`positive` and `caution` are identical across all four themes — `#336B39` /
`#855E25` light, `#6AB872` / `#DBA758` dark.

### How to use them

- **`--canvas` is the page.** Not white. The whole design assumes a mid-tone
  ground; on white, every shadow reads as dirt.
- **`--material` is any raised surface.** On Slate light it is barely lighter
  than the canvas — that is deliberate. The separation comes from the rim and
  the shadow, not from contrast.
- **`--outline` / `--outline-bottom`** are the trough's lip, never a border
  colour for anything else.
- **`--ink` / `--ink-muted` / `--ink-faint`** are the only three text colours.
  `ink-faint` is 3.4:1 — decorative labels only, never body copy.

---

## 2. Geometry

```css
:root {
  /* radii */
  --r-xs: 8px;  --r-sm: 12px; --r-md: 16px;
  --r-lg: 22px; --r-xl: 28px; --r-xxl: 40px;
  --r-pill: 999px;

  /* spacing */
  --s-xxs: 2px;  --s-xs: 4px;  --s-sm: 8px;   --s-md: 12px;
  --s-lg: 16px;  --s-xl: 20px; --s-xxl: 28px; --s-xxxl: 40px;

  /* control sizes */
  --control: 44.4px;      /* the round chrome buttons: gear, close, bin */
  --icon: 22.2px;
  --min-touch: 44px;
  --margin: 21.5px;       /* the page's single edge inset */

  --rim: 1px;             /* the hairline on every raised edge */
  --rim-thick: 1.5px;
}
```

The page uses **one margin on every side** — 21.5px. Not a grid, one number.

---

## 3. The three depth treatments

⚠️ **SwiftUI's shadow `radius` is roughly half a CSS `blur-radius`.** Every
value below is already converted. If you go back to the Swift source for
anything, double it.

### Card — a raised panel

```css
.skeu-card {
  background: linear-gradient(135deg,
    var(--material-top) 0%, var(--material) 50%, var(--material-bottom) 100%);
  border-radius: 30px;
  border: 3px solid transparent;
  border-image: linear-gradient(to bottom,
    var(--outline-lit) 0%, var(--outline) 55%, var(--outline) 100%) 1;
  box-shadow:
    -13px 21px 54px color-mix(in srgb, var(--shadow) 19%, transparent),
    -51px 84px 98px color-mix(in srgb, var(--shadow) 16%, transparent);
}
```

**Note the shadows fall down-and-LEFT** (negative x). That is the system's
light direction — top-right. Keep it consistent or objects stop agreeing about
where the sun is.

### Trough — a channel cut into the page

The tab bar, the settings wells, the archive rows. Recessed, so the shadows are
**inset**. Set `--c: calc(<control height> / 148.2)` — the trough's figures are
authored against a 148.2px reference bar, not against the control.

```css
.skeu-trough {
  --c: calc(51 / 148.2);            /* 51 = this control's height */
  position: relative;
  background: linear-gradient(to bottom, var(--recess), var(--recess-bottom));
  border-radius: var(--r-pill);
  box-shadow:
    inset 0 calc(17.828px * var(--c)) calc(23.77px * var(--c))
      color-mix(in srgb, var(--shadow) 22%, transparent),
    inset 0 calc(-11.885px * var(--c)) calc(32px * var(--c))
      color-mix(in srgb, var(--shadow) 19%, transparent),
    inset calc(8.217px * var(--c)) calc(12.326px * var(--c)) calc(16.434px * var(--c))
      color-mix(in srgb, var(--shadow) 20%, transparent),
    inset calc(-8.247px * var(--c)) calc(-2.062px * var(--c)) calc(16.494px * var(--c))
      color-mix(in srgb, var(--shadow) 20%, transparent);
}

/* The contour — the lip. Drawn LAST, over the inner shadows. */
.skeu-trough::after {
  content: "";
  position: absolute; inset: 0;
  border-radius: inherit;
  padding: max(1px, calc(7px * var(--c)));
  background: linear-gradient(to bottom,
    var(--outline) 0%, var(--outline) 45%, var(--outline-bottom) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
}
```

Those four inset shadows are, in order: **the lip casting down**, **the far
wall throwing shade back up from the floor**, and **two diagonals that round
the corners**. Dropping the diagonals flattens it immediately.

**The contour is not optional, and it is not a flat border.** It is a gradient
— `outline` held dark through the top half, then ramping to `outline-bottom` at
the base: dark at the near lip, lit at the far one. Figma's export flattens
gradient strokes to one averaged hex, and taken at face value that average
reads as an outline drawn *on* the surface instead of an edge cut *into* it.
The dark is **held to 45%** rather than ramped from 0, or the highlight spreads
up the sides and the lit lip stops reading as a lip. It must sit **over** the
inner shadows, or the lip loses its edge.

See `shove95-live-button.md` for this construction worked through end to end on
one control, with rendered proof.

### Glass — a control floating on either

Every button, the selected tab pill, the checkbox, the workspace pill.

```css
.skeu-glass {
  background: color-mix(in srgb, var(--canvas) 55%, transparent);
  border-radius: var(--r-pill);
  border: 1px solid transparent;
  border-image: linear-gradient(to bottom,
    color-mix(in srgb, var(--edge-light) 55%, transparent) 0%,
    color-mix(in srgb, var(--edge-light) 5%,  transparent) 50%,
    color-mix(in srgb, var(--edge-light) 60%, transparent) 100%) 1;
  box-shadow:
    0 60px 35px color-mix(in srgb, var(--shadow) 5%,  transparent),
    0 27px 27px color-mix(in srgb, var(--shadow) 9%,  transparent),
    0 6px  14px color-mix(in srgb, var(--shadow) 10%, transparent);
}
```

In dark mode raise the fill to 62% and the top rim stop to ~72% — a rim that
works on a light material disappears on a dark one.

**The rim is the whole trick.** Bright at the top, nearly nothing at the middle,
bright again at the bottom — light catching the top edge and bouncing off the
bottom one. A flat 1px border will not read as glass.

---

## 4. Typography

Two faces, and the rule between them matters more than either.

**The Blend rule:** pixel type on **chrome** (tab labels, the workspace name,
section headings, buttons), system type on **content** (task text, body copy).
The app never sets a paragraph in the pixel face — it is furniture, not reading
matter.

```css
@font-face {
  font-family: "W95FA";
  src: url("/fonts/W95FA.otf") format("opentype");
  font-display: swap;
}
```

The file is at `shove-95/shove95/shove95/Resources/W95FA.otf`. **W95FA by Alina
Sava, SIL Open Font License 1.1** — redistribution is permitted and the
attribution is a licence condition, not a courtesy. Ship
`W95FA-LICENSE.txt` alongside it and credit it on the page.

**Optical size:** W95FA runs small. The app sets it at **1.22× the system
size** to keep the two faces level. Do the same or the pixel type looks timid.

```css
.chrome { font-family: "W95FA", ui-monospace, monospace; font-size: 1.22em; }
.content { font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif; }
```

Task text carries **-0.02em tracking**. Important tasks are `--critical`
**and semibold** — colour is never the only signal.

---

## 5. Motion

The app uses springs. CSS approximations, close enough for a web page:

| App token | Spring | CSS |
|---|---|---|
| `press` | response .26, damping .68 | `260ms cubic-bezier(.34,1.56,.64,1)` — overshoots |
| `layout` | response .40, damping .86 | `400ms cubic-bezier(.2,.8,.3,1)` |
| `present` | response .52, damping .84 | `520ms cubic-bezier(.2,.8,.3,1)` |
| `tint` | easeOut .16 | `160ms ease-out` |

**The press.** Every control in the app swells when tapped — it does not depress.

```css
.skeu-press:active { transform: scale(1.115); transition: transform 260ms cubic-bezier(.34,1.56,.64,1); }
@media (prefers-reduced-motion: reduce) { .skeu-press:active { transform: none; } }
```

`1.115` and that curve are the app's real values. Honour reduced motion — the
app does, everywhere.

---

## 6. Component recipes

### Task row

Plain text on the ground. **No card, no border, no background** — this is the
most-copied mistake. Only the checkbox is an object.

```
[ glass circle 33px ]  Task title            [ Tue ]  [ ≡ ]
```

- Row min-height **56px**, gap **10px**
- Checkbox: 33px `.skeu-glass` circle, empty when open
- Title: content face, `--ink`; completed = `--ink-muted` + strikethrough
- Day chip and grip: `--ink-faint`, right-aligned
- Held or swiped, the row lifts: a `--r-md` rectangle of `--material-top` (dark)
  or `--recess` (light) at 55% / 35% opacity behind it

### Tab bar

A `.skeu-trough` pill containing three labels; the selected one wears a
`.skeu-glass` pill that slides between them.

### Workspace pill

`.skeu-glass`, chrome face, a small chevron. Opening it grows the same pill
downward into a list — nothing detaches, the pill *is* the menu.

### Section heading

Uppercase, `--ink-faint`, `0.8px` letter-spacing, small. On the How-to-use
screen they are larger, bold and `--ink`.

---

## 7. What not to do

- **Do not put this on a white page.** `--canvas` is the ground. On white the
  whole system reads as grubby.
- **Do not add borders to separate things.** Depth does that. A border means
  the light has failed.
- **Do not use texture, noise or gradients-as-decoration.** Gradients here are
  always describing a light source.
- **Do not mix the two typefaces within one element.** Chrome or content.
- **Do not invent colours.** If a value is not in section 1, it is not in the
  system.
- **Do not use `backdrop-filter`.** The glass is fake — fills and rims. Real
  blur looks like iOS, not like this.

---

## 8. If you only build one thing

A **task row on the canvas, with a tab bar beneath it**. That is the app's
entire visual argument in two elements: content sits directly on the ground,
chrome is cut into it or floats on it, and light does all the separating.
