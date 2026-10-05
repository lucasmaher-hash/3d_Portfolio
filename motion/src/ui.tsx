import React from 'react';
import {getInputProps, Img, staticFile} from 'remotion';

/* ─────────────────────────────────────────────────────────────────────────
   SkeuKit, ported from the app's own SwiftUI source
   (to.morrow/shove95/shove95/SkeuKit — SkeuGlass, SkeuGlassBakery,
   SkeuTrough, SkeuSegmented, LiveGlyph, PinnedTaskLiveActivity) and checked
   against the simulator screenshots in AppStore_screenshots_Shove.95.

   Units: every component takes `z` = video pixels per app point, and is
   written in app points, so a figure here can be checked against the Swift.

   Two conversions recur:
   - SwiftUI `.shadow(radius: r)` ≈ CSS box-shadow blur 2r.
   - SwiftUI `.blur(radius: r)` ≈ CSS `filter: blur(r)` (both are a sigma).
   An inner shadow in the app is a stroke 2r wide round the edge, offset,
   blurred by r and masked to the shape — i.e. an inset box-shadow with
   spread r and blur 2r.
   ───────────────────────────────────────────────────────────────────────── */

type CSS = React.CSSProperties;

export type Pal = {
  dark: boolean;
  canvas: string;
  material: string;
  materialTop: string;
  materialBottom: string;
  recess: string;
  recessBottom: string;
  edgeLight: string;
  edgeShade: string;
  outline: string;
  outlineBottom: string;
  outlineLit: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  accent: string;
  critical: string;
  shadow: string;
  si: number; // shadowIntensity
};

/* Blue-intensity review switch (2026-10-04, Lucas: "intensify the blue").
   Render with --props='{"blue": k}': every palette colour keeps its luma and
   hue and has its chroma — its distance from grey — multiplied by k, so the
   slate's blue cast deepens in proportion and true greys stay grey. k = 1 (no
   prop) is now 4 — Lucas picked the ×4 review render (2026-10-04) as the
   site's colour; pass blue 1 for the original slate. Only the app's
   own colours follow; the phone frame and the Lock Screen wallpaper are
   pictures of the iPhone, not the app, and stay as they are. */
export const BLUE = Number((getInputProps() as {blue?: number}).blue ?? 4);
export function blueHex(h: string, k = BLUE): string {
  if (k === 1) return h;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(y + k * (v - y))));
  return '#' + [c(r), c(g), c(b)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
function bluePal(p: Pal): Pal {
  const out = {...p} as Record<string, unknown>;
  for (const [key, v] of Object.entries(p)) if (typeof v === 'string' && v.startsWith('#')) out[key] = blueHex(v);
  return out as Pal;
}

/* Slate — the default theme ("light blue" / "dark blue"). */
export const LIGHT: Pal = bluePal({
  dark: false,
  canvas: '#CACFD6',
  material: '#D5D9E0',
  materialTop: '#E4E8EE',
  materialBottom: '#B5BAC1',
  recess: '#9BA1AB',
  recessBottom: '#C9CED6',
  edgeLight: '#FFFFFF',
  edgeShade: '#464B52',
  outline: '#7A7F87',
  outlineBottom: '#DDE0E5',
  outlineLit: '#F7F9FE',
  ink: '#212224',
  inkMuted: '#515357',
  inkFaint: '#787B80',
  accent: '#3F5670',
  critical: '#6B180D',
  shadow: '#242629',
  si: 1.0,
});
export const DARK: Pal = bluePal({
  dark: true,
  canvas: '#2C2D30',
  material: '#2C2D30',
  materialTop: '#3C3F42',
  materialBottom: '#202124',
  recess: '#191A1C',
  recessBottom: '#35373B',
  edgeLight: '#D6E5FF',
  edgeShade: '#070708',
  outline: '#141517',
  outlineBottom: '#505357',
  outlineLit: '#64676B',
  ink: '#DCE5F5',
  inkMuted: '#9FAABD',
  inkFaint: '#707B8C',
  accent: '#526D8C',
  critical: '#FF7866',
  shadow: '#09090A',
  si: 0.9,
});

export const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';

/* The system face the way iOS sets it at a given POINT size: Text below 20pt,
   Display from 20pt up, with the size-specific tracking Core Text applies on
   its own (Chrome does not). Tracking measured off the simulator screenshots:
   16.4pt rows (incl. the app's own -0.02em) and the 22pt Live box. */
export const sf = (pt: number, z: number, weight = 400, extraEm = 0): CSS => {
  const display = pt >= 20;
  const trak = display ? 0.012 : pt >= 16 ? -0.03 : pt >= 14 ? -0.012 : 0;
  return {
    fontFamily: display ? '"SF Pro Display", -apple-system, sans-serif' : '"SF Pro Text", -apple-system, sans-serif',
    fontSize: pt * z,
    fontWeight: weight,
    letterSpacing: `${trak + extraEm}em`,
  };
};
export const PIXEL = '"W95FA", ui-monospace, monospace';

/* ─── Colour helpers ─────────────────────────────────────────────────── */
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rgba = (h: string, a: number) => {
  const [r, g, b] = hex(h);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
};
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};
export const mixHex = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

/* A ring: a gradient painted only in a band `w` px wide along the edge.
   (`border-image` ignores border-radius, so this is the way to do it.) */
const ring = (w: number, background: string, radius: number | string): CSS => ({
  position: 'absolute',
  inset: 0,
  borderRadius: radius,
  padding: w,
  background,
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  maskComposite: 'exclude',
  pointerEvents: 'none',
});

/* ─── Glass (SkeuGlass + SkeuGlassBackground) ───────────────────────────
   No fill of its own. Outside in: three drop shadows falling straight down,
   the lens stack (five 1%-white layers, inset further each time, the group
   blurred — alphas pile up toward the MIDDLE), on prominent pieces an
   additive glow centred below the bottom edge, on prominent pieces in light
   mode the inner relief, and the rim on top of everything. */
const LENSES: Array<[number, number]> = [
  [0, 0],
  [2.46, 1.7],
  [7.39, 5.09],
  [15.59, 10.74],
  [31.99, 22.03],
];

export const Glass: React.FC<{
  h: number; // the piece's height in pt — every figure scales from it
  z: number;
  p: Pal;
  prominent?: boolean;
  radius?: number | 'pill'; // pt; 'pill' = capsule/circle
  tint?: string; // an opaque base (the Live Activity check button has one)
  bodyOpacity?: number; // fades the glass itself but not what sits in it (a transition)
  rimPt?: number; // overrides the rim width (pt) — the checkboxes share one line weight with the Live ring
  style?: CSS;
  children?: React.ReactNode;
}> = ({h, z, p, prominent = true, radius = 'pill', tint, bodyOpacity = 1, rimPt, style, children}) => {
  const k = h / 104.54;
  const str = prominent ? 1 : 0.5;
  const r: number | string = radius === 'pill' ? 9999 : radius * z;
  const shadesInward = !p.dark && prominent;
  const rimW = (rimPt ?? Math.max(0.8, 2.971 * k * (shadesInward ? 1.35 : 1))) * z;
  const rim = shadesInward
    ? `linear-gradient(to bottom, ${rgba(p.edgeLight, 0.55 * 1.3)} 0%, ${rgba(p.edgeLight, 0.05)} 50%, ${rgba(p.edgeLight, 0.6)} 100%)`
    : p.dark || prominent
      ? `linear-gradient(to bottom, ${rgba(p.edgeLight, 0.55 * str)} 0%, ${rgba(p.edgeLight, 0.05 * str)} 50%, ${rgba(p.edgeLight, 0.6 * str)} 100%)`
      : // a resting piece on a light page gets a CONTACT edge, not a lit one
        `linear-gradient(to bottom, ${rgba(p.edgeShade, 0)} 0%, ${rgba(p.edgeShade, 0.14)} 45%, ${rgba(p.edgeShade, 0.42)} 100%)`;
  const drop = (a: number) => rgba(p.shadow, a * p.si * str * bodyOpacity);
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: r,
        overflow: 'hidden',
        isolation: 'isolate',
        background: tint,
        /* drop-shadow, NOT box-shadow: SwiftUI casts a shadow from what the
           view actually draws, and glass draws almost nothing — a rim, a 1%
           lens, a glow. A box-shadow would cast from the whole disc and put
           a dark pool under every resting checkbox the app does not have. */
        filter: [
          `drop-shadow(0 ${29.895 * k * z}px ${17.525 * k * z}px ${drop(0.05)})`,
          `drop-shadow(0 ${13.401 * k * z}px ${13.4 * k * z}px ${drop(0.09)})`,
          `drop-shadow(0 ${3.093 * k * z}px ${7.216 * k * z}px ${drop(0.1)})`,
        ].join(' '),
        ...style,
      }}
    >
      <div style={{position: 'absolute', inset: 0, opacity: bodyOpacity}}>
      <div style={{position: 'absolute', inset: 0, filter: `blur(${3.281 * k * z}px)`}}>
        {LENSES.map(([v, hh], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: v * k * z,
              bottom: v * k * z,
              left: hh * k * z,
              right: hh * k * z,
              borderRadius: r,
              background: 'rgba(255,255,255,0.01)',
            }}
          />
        ))}
      </div>
      {prominent ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 62% 62% at 50% 120%, rgba(255,255,255,.5) 0%, rgba(255,255,255,0) 100%)',
            mixBlendMode: 'plus-lighter',
          }}
        />
      ) : null}
      {shadesInward ? (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to bottom, ${rgba(p.edgeLight, 0.392)} 0%, ${rgba(p.edgeLight, 0.123)} 14%, transparent 34%, transparent 60%, ${rgba(p.edgeShade, 0.102)} 80%, ${rgba(p.edgeShade, 0.24)} 100%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: r,
              border: `${13 * k * z}px solid ${rgba(p.edgeShade, 0.128)}`,
              filter: `blur(${9 * k * z}px)`,
              WebkitMaskImage: 'linear-gradient(to right, #000 0%, transparent 30%, transparent 70%, #000 100%)',
              maskImage: 'linear-gradient(to right, #000 0%, transparent 30%, transparent 70%, #000 100%)',
            }}
          />
        </>
      ) : null}
      </div>
      {children}
      <div style={{...ring(rimW, rim, r), opacity: bodyOpacity}} />
    </div>
  );
};

/* ─── Trough (SkeuTrough) ───────────────────────────────────────────────
   A channel cut THROUGH the material. Fill dark at the lip, the ground tone
   at the floor; four inner shadows (lip down, floor up, two diagonals that
   round the corners); the contour drawn last — dark held through the top
   half, lit at the far lip. `refH` is the height the app hands the modifier
   to scale its shadows (64 for the tall Live box, the real height for bars). */
export const Trough: React.FC<{
  z: number;
  p: Pal;
  refH: number;
  radius: number | 'pill';
  fillStop?: number;
  shadeScale?: number;
  fillLift?: number;
  bloom?: boolean;
  depth?: number; // 0..1 — how far the channel has been cut (for its entrance)
  style?: CSS;
  children?: React.ReactNode;
}> = ({z, p, refH, radius, fillStop = 1, shadeScale = 1, fillLift = 0, bloom = false, depth = 1, style, children}) => {
  const k = refH / 148.2;
  const r: number | string = radius === 'pill' ? 9999 : radius * z;
  const sh = (a: number) => rgba(p.shadow, a * p.si * shadeScale);
  const inset = (a: number, rad: number, dx: number, dy: number) =>
    `inset ${dx * z}px ${dy * z}px ${2 * rad * z}px ${rad * z}px ${sh(a)}`;
  return (
    <div style={{position: 'relative', borderRadius: r, ...style}}>
      {bloom ? (
        <div
          style={{
            position: 'absolute',
            inset: -5.3 * z,
            borderRadius: r,
            background: `linear-gradient(to bottom, ${p.materialTop}, ${p.recess})`,
            filter: `blur(${1.85 * z}px)`,
            opacity: depth,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: r,
          overflow: 'hidden',
          opacity: depth,
          background: `linear-gradient(to bottom, ${mix(p.recess, p.recessBottom, fillLift)} 0%, ${p.recessBottom} ${Math.max(1, fillStop * 100)}%)`,
          boxShadow: [
            inset(0.22, 11.885 * k, 0, 17.828 * k),
            inset(0.19, 16 * k, 0, -11.885 * k),
            inset(0.2, 8.217 * k, 8.217 * k, 12.326 * k),
            inset(0.2, 8.247 * k, -8.247 * k, -2.062 * k),
          ].join(', '),
        }}
      >
        <div
          style={{
            ...ring(
              Math.max(1, 7 * k) * z,
              `linear-gradient(to bottom, ${p.outline} 0%, ${p.outline} 45%, ${p.outlineBottom} 100%)`,
              r,
            ),
          }}
        />
      </div>
      {children}
    </div>
  );
};

/* ─── Glyphs ─────────────────────────────────────────────────────────── */
/* LiveGlyph: a ring stroked inside its frame, with a core at 0.42. */
/* Drawn as SVG, not as a bordered div with a centred child: the browser
   snaps a CSS border to whole device pixels but places the core at a
   fractional offset, so at button size the dot sat visibly off-centre. */
export const LiveGlyph: React.FC<{d: number; color: string; line: number; style?: CSS}> = ({d, color, line, style}) => (
  <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} style={{display: 'block', flex: 'none', overflow: 'visible', ...style}}>
    <circle cx={d / 2} cy={d / 2} r={(d - line) / 2} fill="none" stroke={color} strokeWidth={line} />
    <circle cx={d / 2} cy={d / 2} r={d * 0.21} fill={color} />
  </svg>
);

type Cells = Array<[number, number]>;
const rows = (r: Record<number, number[]>): Cells =>
  Object.entries(r).flatMap(([y, xs]) => xs.map((x) => [x, Number(y)] as [number, number]));
const span = (a: number, b: number) => Array.from({length: b - a + 1}, (_, i) => a + i);

/* Transcribed cell for cell from the app (PixelGlyphs / PixelLiveGlyph). */
export const GLYPH = {
  live: (() => {
    const c: Cells = [];
    for (let y = 0; y <= 10; y++)
      for (let x = 0; x <= 10; x++) {
        const d = Math.hypot(x - 5, y - 5);
        if ((d > 3.6 && d < 5.2) || d < 1.6) c.push([x, y]);
      }
    return {w: 11, h: 11, cells: c};
  })(),
  check: {w: 12, h: 12, cells: rows({3: [8], 4: [7, 8], 5: [2, 6, 7], 6: [2, 3, 5, 6], 7: [3, 4, 5], 8: [4]})},
  gear: {
    w: 12,
    h: 12,
    cells: [
      ...rows({2: span(2, 9), 3: span(2, 9), 8: span(2, 9), 9: span(2, 9)}),
      ...rows({4: [2, 3, 8, 9], 5: [2, 3, 8, 9], 6: [2, 3, 8, 9], 7: [2, 3, 8, 9]}),
      ...rows({0: [5, 6], 1: [5, 6], 10: [5, 6], 11: [5, 6]}),
      ...rows({5: [0, 1, 10, 11], 6: [0, 1, 10, 11]}),
      ...rows({1: [1, 10], 10: [1, 10]}),
    ] as Cells,
  },
};

export const Pixel: React.FC<{g: {w: number; h: number; cells: Cells}; cell: number; color: string; style?: CSS}> = ({g, cell, color, style}) => (
  <svg width={g.w * cell} height={g.h * cell} viewBox={`0 0 ${g.w} ${g.h}`} shapeRendering="crispEdges" style={{display: 'block', flex: 'none', ...style}}>
    {g.cells.map(([x, y]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
    ))}
  </svg>
);

/* The reorder grip — three rounded bars, measured off the simulator
   screenshot (18.7pt wide, 1.5pt bars, 4.1pt pitch, inkFaint). */
export const Grip: React.FC<{z: number; color: string; style?: CSS}> = ({z, color, style}) => (
  <svg width={18.7 * z} height={10 * z} viewBox="0 0 18.7 10" style={{display: 'block', flex: 'none', ...style}}>
    {[0.9, 5, 9.1].map((y) => (
      <line key={y} x1={0.75} x2={17.95} y1={y} y2={y} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    ))}
  </svg>
);

/* ─── A task row, at the app's own metrics (SkeuTaskRow.mainLine) ──────
   [44pt touch square holding the 33.3pt glass circle] [10.2 gap] [title,
   16.4pt, -0.02em] … [44pt grip column] [3.1 trailing]. No surface: a task
   is text on the ground — only while it is being slid does it wear a slat
   (--recess at 0.6 inside a well). */
export const ROW = {h: 56.3, pitch: 58.9, touch: 44, check: 33.3, gap: 10.2, label: 16.4, trail: 3.1};
/* The open checkbox sits 3pt right of centre in its touch square (Lucas, for
   the video): more air on its left, less between it and the title. The row,
   the title and the well do not move. The E pill's ring follows (KNOB). */
export const BOX_NUDGE = 3; // pt
export const BOX_LEFT = (ROW.touch - ROW.check) / 2 + BOX_NUDGE; // pt, from the row's leading edge
/* One line weight for every circle in the video — the open checkboxes' rim
   and the Live ring (Lucas: the box's 0.95pt rim was too thin next to the
   ring, the ring too heavy next to the boxes). */
export const CIRCLE_LINE = 1.8; // pt
/* The open checkbox, rebuilt as what it reads as: ONE perfectly round line,
   of one weight and one colour, nothing inside (Lucas). The app's resting
   glass — a rim that fades out toward the top, plus a faint lens — never
   read as a clean circle at video size. Colour = the old rim's foot. */
export const CHECK_RING = {color: blueHex('#464B52'), alpha: 0.4};
/* `draw` (0..1): only that much of the line, running clockwise from 12 o'clock
   — the ring being drawn on. Round caps so the moving end reads as a pen tip;
   it is one path, so the caps never double the alpha where they meet. */
export const CheckRing: React.FC<{d: number; z: number; color?: string; draw?: number; style?: CSS}> = ({d, z, color, draw, style}) => {
  const D = d * z;
  const line = CIRCLE_LINE * z;
  const r = (D - line) / 2;
  const C = 2 * Math.PI * r;
  const partial = draw !== undefined && draw < 1;
  if (partial && draw <= 0) return null;
  return (
    <svg width={D} height={D} viewBox={`0 0 ${D} ${D}`} style={{display: 'block', overflow: 'visible', ...style}}>
      <circle
        cx={D / 2}
        cy={D / 2}
        r={r}
        fill="none"
        stroke={color ?? rgba(CHECK_RING.color, CHECK_RING.alpha)}
        strokeWidth={line}
        {...(partial
          ? {strokeDasharray: `${C * draw} ${C}`, strokeLinecap: 'round' as const, transform: `rotate(-90 ${D / 2} ${D / 2})`}
          : {})}
      />
    </svg>
  );
};
export const rowTitleX = ROW.touch + ROW.gap; // where the title starts, from the row's leading edge

/* ─── Finger: a glass disc ───────────────────────────────────────────── */
export const Finger: React.FC<{x: number; y: number; d: number; opacity: number; scale: number; p: Pal; ripple?: number}> = ({
  x,
  y,
  d,
  opacity,
  scale,
  ripple = -1,
}) => (
  <>
    {/* a plain half-transparent white disc — no glass (Lucas) */}
    {ripple >= 0 && ripple <= 1 ? (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: d,
          height: d,
          borderRadius: 999,
          border: '2px solid rgba(255,255,255,.7)',
          boxSizing: 'border-box',
          transform: `translate(${x - d / 2}px, ${y - d / 2}px) scale(${0.7 + ripple * 1.1})`,
          opacity: (1 - ripple) * 0.9,
        }}
      />
    ) : null}
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: d,
        height: d,
        borderRadius: 999,
        background: 'rgba(255,255,255,.5)',
        opacity,
        transform: `translate(${x - d / 2}px, ${y - d / 2}px) scale(${scale})`,
      }}
    />
  </>
);

/* ─── Phone: the to.morrow page's own transparent frame over a screen ── */
export const PHONE_RATIO = 792 / 1600;
export const phoneScreen = (H: number) => {
  const W = H * PHONE_RATIO;
  return {W, x: (W * 44) / 792, y: (H * 38) / 1600, w: (W * 704) / 792, h: (H * 1524) / 1600, r: (W * 84) / 792, z: (W * 704) / 792 / 390};
};

export const Phone: React.FC<{left: number; top: number; H: number; frameOpacity?: number; style?: CSS; children: React.ReactNode}> = ({
  left,
  top,
  H,
  frameOpacity = 1,
  style,
  children,
}) => {
  const s = phoneScreen(H);
  return (
    <div style={{position: 'absolute', left, top, width: s.W, height: H, ...style}}>
      <div
        style={{
          position: 'absolute',
          left: s.x - 2,
          top: s.y - 2,
          width: s.w + 4,
          height: s.h + 4,
          borderRadius: s.r + 2,
          overflow: 'hidden',
          boxShadow: `-26px 46px 70px rgba(9,9,10,${0.55 * frameOpacity}), -8px 14px 22px rgba(9,9,10,${0.35 * frameOpacity})`,
        }}
      >
        <div style={{position: 'absolute', left: 2, top: 2, width: 390, height: 844, transform: `scale(${s.z})`, transformOrigin: '0 0'}}>{children}</div>
      </div>
      <Img src={staticFile('phone-frame.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: frameOpacity}} />
    </div>
  );
};

/* ─── iOS status bar, in the screen's 390pt space ──────────────────────
   Placed against the phone frame's own notch (measured off phone-frame.png:
   notch spans 88–302pt, 30.5pt deep): the time is centred in the left ear,
   the signal / Wi-Fi / battery cluster in the right one, both on the same
   centre line a little above the notch's foot, as on an iPhone 12. */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
  const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
  return `M${p0[0]} ${p0[1]} A${r} ${r} 0 0 1 ${p1[0]} ${p1[1]}`;
};
export const StatusBar: React.FC<{color: string}> = ({color}) => {
  const cy = 22;
  const up0 = (-135 * Math.PI) / 180;
  const up1 = (-45 * Math.PI) / 180;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 47, color}}>
      <div
        style={{
          position: 'absolute',
          left: 54,
          top: cy,
          transform: 'translate(-50%, -50%)',
          fontFamily: '"SF Pro Text", -apple-system, sans-serif',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        09:41
      </div>
      <svg style={{position: 'absolute', left: 336, top: cy, transform: 'translate(-50%, -50%)', overflow: 'visible'}} width="68" height="12" viewBox="0 0 68 12">
        {/* signal */}
        {[4.2, 6.3, 8.6, 11].map((h, i) => (
          <rect key={i} x={i * 4.6} y={11.6 - h} width="3.1" height={h} rx="0.9" fill={color} />
        ))}
        {/* wi-fi: three arcs and the point they radiate from */}
        <g fill="none" stroke={color} strokeWidth="1.9">
          <path d={arc(29.5, 11.2, 9.6, up0, up1)} />
          <path d={arc(29.5, 11.2, 6.1, up0, up1)} />
        </g>
        <path d={`M29.5 11.6 L${29.5 - 2.6} 8.9 A3.7 3.7 0 0 1 ${29.5 + 2.6} 8.9 Z`} fill={color} />
        {/* battery */}
        <rect x="42.6" y="0.6" width="22.6" height="10.8" rx="3.2" fill="none" stroke={color} strokeOpacity=".4" strokeWidth="1" />
        <rect x="44.6" y="2.6" width="18.6" height="6.8" rx="1.6" fill={color} />
        <path d="M66.4 4.1v3.8c.8-.3 1.3-1 1.3-1.9s-.5-1.6-1.3-1.9z" fill={color} fillOpacity=".45" />
      </svg>
    </div>
  );
};
