import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {BOX_NUDGE, CHECK_RING, DARK, Finger, Glass, GLYPH, LIGHT, mix, Pal, Phone, phoneScreen, Pixel, ROW, StatusBar, Trough, sf} from './ui';
import {AddRow, KNOB, LiveBox, LiveControls, LockCard, TabBar, TaskRow, TopBar} from './app';

/* ─────────────────────────────────────────────────────────────────────────
   to.morrow — 24 s promo loop, 1920x1080 @ 30 fps (720 frames).

   0     a caret; "to.morrow" is typed where a task's title sits
   60    the row it is builds round it: checkbox, slat, grip; a second task
         slides out from under it; the Tomorrow well is cut round both
   96    pull back. Only Tomorrow exists — Today and Soon are cut into the
         page as the first task is shoved at them
   152   to.morrow → Today · 236  Plan trip to Asia → Soon ·
   320   Pay semester fee → Today
   400   CUT — "Never forget a task again."
   462   CUT — two phones: type a task, Go, it goes live, lands on the Lock
         Screen, is ticked off there
   690   light floods out of the tick, back to frame 0 (the caret)

   Every component is the app's own construction at the app's own metrics —
   see ui.tsx / app.tsx, ported from the SwiftUI source and calibrated
   against the simulator screenshots (Lab.tsx).
   ───────────────────────────────────────────────────────────────────────── */

export const FPS = 30;
const W = 1920;
const H = 1080;
/* The website hero's TALL cut (2026-10-04, Lucas): the same film with EXT px of
   extra canvas above the frame, so on desktop the video can run up under the
   nav instead of leaving an empty band there. Nothing is placed in that band —
   the scene is unchanged and simply extends upward: every full-frame
   background (Canvas, the dark overlays, the root fill) reaches up by `ext`,
   and the camera views see that much more above. 0 = the normal 16:9 film. */
export const ExtTop = React.createContext(0);
/* 240 covers the phone layout (Lucas, 2026-10-04: no gap under the nav there
   either); desktop shows only the bottom 196 of it — see .hero-promo. */
export const EXT = 240; // video px; 1920 x 1320

/* The app's own springs (SwiftUI response/damping → stiffness/damping, m=1). */
const SPR = {
  press: {mass: 1, stiffness: 584, damping: 32.9}, // .26 / .68
  layout: {mass: 1, stiffness: 246.7, damping: 27.0}, // .40 / .86
  present: {mass: 1, stiffness: 146, damping: 20.3}, // .52 / .84
};
const sp = (f: number, start: number, k: keyof typeof SPR) => (f < start ? 0 : spring({frame: f - start, fps: FPS, config: SPR[k]}));
const swell = (f: number, down: number, up: number, amt = 0.115) => 1 + amt * (sp(f, down, 'press') - sp(f, up, 'press'));
const ease = (f: number, a: number, b: number, e: (t: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], {easing: e, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/* SkeuPulse: easeInOut 1.0s, autoreversing → a 2 s cycle. 0 = small end. */
const pulse = (f: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * f) / 60);
type P = [number, number];
const qbez = (p0: P, p1: P, p2: P, t: number): P => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
};

/* Marketing type: the system face, Display cut. */
const HEAD: React.CSSProperties = {...sf(60, 1, 650), letterSpacing: '-0.025em'};

const Canvas: React.FC<{p: Pal; children: React.ReactNode; flat?: boolean}> = ({p, children, flat}) => {
  const ext = React.useContext(ExtTop);
  const stops = p.dark ? '#36383C 0%, #2C2D30 52%, #242528 100%' : '#D7DBE1 0%, #CACFD6 52%, #C3C8D0 100%';
  if (!ext) {
    return (
      <AbsoluteFill style={{background: flat ? p.canvas : `radial-gradient(120% 100% at 82% -12%, ${stops})`, overflow: 'hidden'}}>
        {children}
      </AbsoluteFill>
    );
  }
  /* Tall cut: the same gradient written in px against the ORIGINAL 1920x1080
     frame (120% 100% at 82% -12%), so the frame itself is pixel-identical and
     the band above simply continues it; the scene keeps its 1080 box. */
  return (
    // AbsoluteFill is height: 100%, not bottom: 0 — the height has to be restated or the box just slides up
    <AbsoluteFill style={{top: -ext, height: H + ext, background: flat ? p.canvas : `radial-gradient(${W * 1.2}px ${H}px at ${W * 0.82}px ${ext - H * 0.12}px, ${stops})`, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: ext, width: W, height: H}}>{children}</div>
    </AbsoluteFill>
  );
};

/* Words rise into place on the app's `present` spring. */
const Rise: React.FC<{text: string; f: number; start: number; step?: number; style?: React.CSSProperties}> = ({text, f, start, step = 3, style}) => {
  const parts = text.split(/(\s+)/);
  let k = 0;
  return (
    <span style={{display: 'inline-flex', whiteSpace: 'pre', ...style}}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
        const s = sp(f, start + k++ * step, 'present');
        return (
          <span key={i} style={{display: 'inline-block', opacity: clamp01(s * 1.3), transform: `translateY(${(1 - s) * 40}px)`, filter: `blur(${(1 - clamp01(s)) * 8}px)`}}>
            {part}
          </span>
        );
      })}
    </span>
  );
};

/* iOS text caret. */
const Caret: React.FC<{z: number; color: string; on: boolean}> = ({z, color, on}) => (
  <span style={{display: 'inline-block', width: 2 * z, height: 21 * z, borderRadius: z, background: color, marginLeft: 1.5 * z, opacity: on ? 1 : 0}} />
);

const typedCount = (f: number, start: number, gaps: number[]) => {
  let t = start;
  let n = 0;
  for (const g of gaps) {
    t += g;
    if (f >= t) n++;
  }
  return n;
};

/* ═══ Scene 1 — Today | Tomorrow | Soon ════════════════════════════════
   Three wells cut into the page (the Live box's construction), each a list.
   World units are video px at the wide shot; PZ = px per app point.

   THREE VARIANTS of how the wells are named (Lucas is choosing, 2026-10-03):
     A  the name inside each well, top left
     B  the app's tab bar stretched under all three wells — one trough, a
        segment under each well, the glass pill on Tomorrow
     C  each well with its own small trough under it, the way the Live tab
        sits in its own trough beside the segmented bar in the app */
export type Variant = 'A' | 'B' | 'C';
/* Two ways into the Live section: a cut to "Never forget a task again.", or
   (D) the camera closes on Today, "go live" is typed as a new task, and
   everything but those words fades away before the cut to the phones. */
export type Transition = 'line' | 'golive' | 'golive2' | 'golive3';
/* golive2 (E): as golive, but the typed words ARE the button — they turn into
   the "Go Live" pill on the phone and the camera pulls back off it. */
const goLiveText = (tr: Transition) => (tr === 'golive2' ? 'Go Live' : 'go live');
/* The wells were shrunk by a fifth (Lucas, 2026-10-04) to give the headline
   room; the close-ups zoom in by the same fifth more, so on screen they are
   exactly as they were. */
const PZ = 1.6 * 0.8;
const CLOSE = (2.6 * 1.6) / PZ; // camera zoom of the close-ups (the typed name, "Go Live")
const OPEN = CLOSE * 1.4; // the opening: "to.morrow" typed 40% larger (Lucas, 2026-10-04)
const WELL_W = 340; // pt
const ROW_X = 8; // pt
const WELL_GAP = 38; // px
type Geo = {top: number; h: number; listTop: number; titles: boolean; camY: number; barTop: number};
const GEO: Record<Variant, Geo> = {
  A: {top: 340, h: 372, listTop: 62, titles: true, camY: H / 2, barTop: 0},
  B: {top: 330, h: 322, listTop: 14, titles: false, camY: H / 2, barTop: 330 + 322 * PZ + 22},
  C: {top: 330, h: 322, listTop: 14, titles: false, camY: H / 2, barTop: 330 + 322 * PZ + 22},
};
const wellX = (i: number) => (W - (3 * WELL_W * PZ + 2 * WELL_GAP)) / 2 + i * (WELL_W * PZ + WELL_GAP);
const wellCX = (i: number) => wellX(i) + (WELL_W * PZ) / 2;
const ROW_W = WELL_W - ROW_X * 2; // pt
const slotCY = (G: Geo, slot: number) => G.top + (G.listTop + slot * ROW.pitch + ROW.h / 2) * PZ;
const WELLS = ['Today', 'Tomorrow', 'Soon'];

/* Every move is first row → first row, so a task only ever travels along
   one straight horizontal line. */
type Move = {fromX: number; toX: number; well: number; appear: number; down: number; dragStart: number; release: number; push: number; land: number};
const mv = (from: number, well: number, at: number): Move => ({
  fromX: wellCX(from),
  toX: wellCX(well),
  well,
  appear: at,
  down: at + 8,
  dragStart: at + 10,
  release: at + 20,
  push: at + 22, // the moment it reaches its new list and shoves the rows there down
  land: at + 50,
});
const M1 = mv(1, 2, 160); // to.morrow → Soon (to the RIGHT — Lucas)
const M2 = mv(1, 0, 228); // Plan trip to Asia → Today
/* the list "Go Live" is typed into: Today, on the LEFT, under Plan trip to Asia
   (Lucas: to.morrow goes right, the close-up stays on the left as before) */
const GL_WELL = M2.well;
// (a third flick, Pay semester fee → Today, was cut — Lucas, 2026-10-04 — and
// the gap between the two that remain shortened by a fifth: 85 → 68 frames)
const MOVES = [M1, M2];
const SWIPE_END = M2.land + 30;
/* the "go live" close-up (D, E), timed off the last landing */
const GZ = M2.land + 10;
// a 0.4 s beat between tapping the add row and the first letter (Lucas)
const GOLIVE = {zoom: [GZ, GZ + 40] as [number, number], tap: GZ + 30, start: GZ + 50, gaps: [3, 3, 4, 3, 3, 3, 3], fade: [GZ + 82, GZ + 98] as [number, number]};
/* E: how long "Go Live" and its ring hang alone on the dark before the button
   builds round them (a second more — Lucas). The ring's two breaths are laid
   out inside this span, ending on the cut (CheckToLive). */
const E_CUT = GOLIVE.fade[1] + 74;
/* E: the Live mark's breath, on E's own frame clock, from the moment the page
   starts going dark — and it NEVER stops (Lucas): the same oscillation carries
   on through the cut, in the pill's glyph, and on into the Live state.
   The box's shrink to the ring's size (33.3 → 28pt) IS the first breath's way
   down: one eased move from box to smallest (run one after the other, the
   resize stopped dead and the breath then shrank it again — a shrink in two
   stages, Lucas). After that an endless cosine, every half eased in and out.
   Both lengths are 30% slower than the first version (Lucas): 30 → 39, 20 → 26. */
const E_BREATH = {down: 39, half: 26};
const eResize = (f: number) => ease(f, GOLIVE.fade[0], GOLIVE.fade[0] + E_BREATH.down, Easing.inOut(Easing.sin));
const eBreath = (f: number) => {
  const t = f - GOLIVE.fade[0] - E_BREATH.down;
  return t < 0 ? 1 - eResize(f) : 0.5 - 0.5 * Math.cos((Math.PI * t) / E_BREATH.half);
};

/* F — the alternate (2026-10-04): E with ONE beat inserted into its dark hold.
   "Go Live" stands alone for a second, " on important tasks" is typed onto it
   letter by letter, read, and taken back again, and then E carries on exactly
   as it was. Done as a TIME WARP of E: the scene is frozen at INS.at for
   INS.len frames (under the dark nothing moves anyway) and every later frame
   is E's frame minus INS.len, so no existing element is retimed or cut into.
   The ring's breath runs on REAL time throughout, so it never stalls. */
const INS_TEXT = ' on important tasks';
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const INS = (() => {
  const at = GOLIVE.fade[1] + 24; // "Go Live" alone on the dark for a moment first
  const type = [3, 2, 3, 2, 3, 2, 2, 3, 2, 3, 3, 2, 2, 3, 2, 2, 3, 2, 3]; // one per letter of INS_TEXT
  const typeEnd = at + sum(type);
  const delStart = typeEnd + 30; // read it
  const del = [4, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]; // backspace held: a beat, then a run
  const delEnd = delStart + sum(del);
  return {at, type, typeEnd, delStart, del, delEnd, len: delEnd + 8 - at};
})();
/* After the line is taken back, E's own hold is NOT replayed in full (Lucas:
   "Go Live" back to the button sooner): E resumes INS_SKIP frames further on,
   inside its still dark hold, so the button builds 12 frames after the last
   backspace instead of 58. */
const INS_SKIP = 46;
const insWarp = (f0: number) => (f0 < INS.at ? f0 : f0 < INS.at + INS.len ? INS.at : f0 - INS.len + INS_SKIP);
const insChars = (f0: number) =>
  f0 < INS.at || f0 >= INS.at + INS.len ? 0 : typedCount(f0, INS.at, INS.type) - typedCount(f0, INS.delStart, INS.del);
/* The line grows to the right, so the camera glides left with it until ring +
   full line sit centred in the frame (measured off a render of the full line:
   ring left 676 → text right 1622 unpanned, centre 1149), and glides back as
   the words are taken back. Screen px. */
const INS_PAN = -189;
const insPan = (f0: number) =>
  INS_PAN *
  (ease(f0, INS.at, INS.typeEnd + 8, Easing.inOut(Easing.cubic)) - ease(f0, INS.delStart - 2, INS.delEnd + 6, Easing.inOut(Easing.cubic)));
/* ...and how long the finished button sits before the phone comes in round it */
const E_SETTLE = 30;

/* The opening. */
const TYPE = {start: 8, gaps: [4, 3, 3, 4, 3, 3, 3, 4, 3]};
const BUILD = {check: 60, slat: 62, grip: 68, well: [62, 96] as [number, number]};
const ZOOM_OUT: [number, number] = [96, 142]; // cues for what appears during the pull-back
const CAM_MOVE: [number, number] = [66, 142]; // the pull-back itself, one continuous move
/* the rest of Tomorrow's list rises in, one under the other, as the camera pulls back */
const rowIn = (i: number, g: number) => sp(g, ZOOM_OUT[0] + 4 + i * 5, 'present');

/* The flick: pulled 140px, accelerating, let go — and from there an
   UNDERDAMPED spring carries it, starting at the speed the finger let go
   with, so it overshoots its slot and bounces back into place. */
const DRAG = 112; // px — scaled with the wells
const DRAG_FRAMES = 10;
const DRAG_EASE = Easing.in(Easing.cubic);
const BOUNCE = {response: 0.55, damping: 0.62};
const bounce = (t: number, v0: number) => {
  // progress 0 → 1 of a damped spring with initial velocity v0 (progress/s)
  const w0 = (2 * Math.PI) / BOUNCE.response;
  const zt = BOUNCE.damping;
  const wd = w0 * Math.sqrt(1 - zt * zt);
  const B = (v0 - zt * w0) / wd;
  return 1 + Math.exp(-zt * w0 * t) * (-Math.cos(wd * t) + B * Math.sin(wd * t));
};
const dirOf = (m: Move) => Math.sign(m.toX - m.fromX);
const moveX = (m: Move, g: number): number => {
  const dir = dirOf(m);
  if (g < m.release) return m.fromX + dir * DRAG * ease(g, m.dragStart, m.release, DRAG_EASE);
  const x0 = m.fromX + dir * DRAG;
  const dist = Math.abs(m.toX - x0);
  const v0 = (((3 * DRAG) / DRAG_FRAMES) * FPS) / dist; // the cubic ease-in ends at 3× its mean speed
  return x0 + (m.toX - x0) * bounce((g - m.release) / FPS, v0);
};
/* lifted while held and in flight; the slat clears once it is home (tint, 160ms) */
const liftOf = (m: Move, g: number) => clamp01(sp(g, m.down, 'press') - sp(g, m.push + 6, 'layout'));
const slatOf = (m: Move, g: number) => ease(g, m.down - 2, m.down + 3) * (1 - ease(g, m.land - 12, m.land - 6, Easing.out(Easing.quad)));
/* A list closing up behind a task that left, and one being shoved open by a
   task arriving — the second on a livelier spring, so it reads as a push. */
const close = (g: number, m: Move) => sp(g, m.release + 3, 'layout');
const pushed = (g: number, m: Move) => (g < m.push ? 0 : spring({frame: g - m.push, fps: FPS, config: {mass: 1, stiffness: 195, damping: 17}}));

type St = {x: number; y: number; lift: number; slat: number; content: number; opacity: number; scale: number};
type Task = {title: string; moves: Move[]; at: (g: number, G: Geo) => St};
const still = (x: number, y: number, rise: number): St => ({x, y: y + (1 - rise) * 18, lift: 0, slat: 0, content: 1, opacity: clamp01(rise * 1.4), scale: 1});
const moving = (m: Move, g: number, G: Geo): St => {
  const lift = liftOf(m, g);
  return {x: moveX(m, g), y: slotCY(G, 0), lift, slat: slatOf(m, g), content: 1, opacity: 1, scale: 1 + 0.03 * lift};
};

/* Tomorrow starts as one list: to.morrow, Plan trip to Asia, Pay semester
   fee, Call grandma, add. */
const TASKS: Task[] = [
  {title: 'Call grandma', moves: [], at: (g, G) => still(wellCX(1), slotCY(G, 3 - close(g, M1) - close(g, M2)), rowIn(2, g))},
  {title: 'Pay semester fee', moves: [], at: (g, G) => still(wellCX(1), slotCY(G, 2 - close(g, M1) - close(g, M2)), rowIn(1, g))},
  {
    title: 'Plan trip to Asia',
    moves: [M2],
    at: (g, G) => (g < M2.dragStart ? still(wellCX(1), slotCY(G, 1 - close(g, M1)), rowIn(0, g)) : moving(M2, g, G)),
  },
  {
    title: 'to.morrow',
    moves: [M1],
    at: (g, G) => {
      const lift = liftOf(M1, g);
      // no slat at rest — like every other row it only darkens once it is held (Lucas)
      return {x: moveX(M1, g), y: slotCY(G, 0), lift, slat: slatOf(M1, g), content: 1, opacity: 1, scale: 1 + 0.03 * lift};
    },
  },
];

/* "add" closes every list, and moves as the list grows or shrinks. */
const addSlot = (well: number, g: number) =>
  well === M1.well ? pushed(g, M1) : well === 1 ? 4 - close(g, M1) - close(g, M2) : pushed(g, M2);

/* when each well is cut into the page */
const wellDepth = (well: number, g: number) =>
  well === 1 ? ease(g, BUILD.well[0], BUILD.well[1]) : well === M1.well ? ease(g, M1.release - 6, M1.release + 14) : ease(g, M2.release - 6, M2.release + 14);

/* The landing: the app's own SkeuLanding — the tab a task arrives in swells. */
const landSwell = (well: number, g: number) => MOVES.filter((m) => m.well === well).reduce((acc, m) => acc * swell(g, m.push, m.push + 7), 1);

/* The tab label, in the app's Modern face at the app's tab size. */
const TabLabel: React.FC<{text: string; z: number; p: Pal; scale?: number}> = ({text, z, p, scale = 1}) => (
  <span
    style={{
      position: 'relative',
      ...sf(16.4, z, 400, -0.02),
      color: p.ink,
      lineHeight: 1,
      display: 'inline-block',
      transform: `scale(${scale})`,
    }}
  >
    {text}
  </span>
);

const TAB_H = 51; // pt — SkeuToggle.height
const PILL_PAD = 8.2; // pt — SkeuToggle.padV

/* B — one trough under all three wells. Each segment sits exactly under its
   own well; the glass pill marks the tab you are on (Tomorrow). */
const BarAll: React.FC<{f: number; G: Geo; p: Pal; z: number}> = ({f, G, p, z}) => {
  const left = wellX(0);
  const width = wellX(2) + WELL_W * z - left;
  return (
    <Trough z={z} p={p} refH={TAB_H} radius="pill" bloom depth={wellDepth(1, f)} style={{position: 'absolute', left, top: G.barTop, width, height: TAB_H * z}}>
      {WELLS.map((wl, i) => {
        const segL = wellX(i) - left + PILL_PAD * z;
        const segW = WELL_W * z - 2 * PILL_PAD * z;
        return (
          <div key={wl} style={{position: 'absolute', left: segL, width: segW, top: 0, bottom: 0, display: 'grid', placeItems: 'center', opacity: wellDepth(1, f)}}>
            {i === 1 ? <Glass h={TAB_H - 2 * PILL_PAD} z={z} p={p} style={{position: 'absolute', left: 0, right: 0, top: PILL_PAD * z, bottom: PILL_PAD * z}} /> : null}
            <TabLabel text={wl} z={z} p={p} scale={landSwell(i, f)} />
          </div>
        );
      })}
    </Trough>
  );
};

/* C — each well with a trough of its own under it, cut in with its well. */
const OWN_W = 220; // pt
const BarOwn: React.FC<{f: number; G: Geo; p: Pal; z: number}> = ({f, G, p, z}) => (
  <>
    {WELLS.map((wl, i) => {
      const depth = wellDepth(i, f);
      if (depth <= 0) return null;
      return (
        <Trough
          key={wl}
          z={z}
          p={p}
          refH={TAB_H}
          radius="pill"
          bloom
          depth={depth}
          style={{position: 'absolute', left: wellCX(i) - (OWN_W * z) / 2, top: G.barTop, width: OWN_W * z, height: TAB_H * z}}
        >
          <div style={{position: 'absolute', inset: PILL_PAD * z, display: 'grid', placeItems: 'center', opacity: depth}}>
            {i === 1 ? <Glass h={TAB_H - 2 * PILL_PAD} z={z} p={p} style={{position: 'absolute', inset: 0}} /> : null}
            <TabLabel text={wl} z={z} p={p} scale={landSwell(i, f)} />
          </div>
        </Trough>
      );
    })}
  </>
);

/* E: the new task's checkbox does not go dark with the page — it slides and
   shrinks onto the spot the Go Live pill's glyph will occupy, becomes the
   Live ring (ring + core), and breathes the app's SkeuPulse while the words
   hang on their own; the breath settles to rest just before the cut, so it
   hands over to the pill's own, still glyph without a jump. */
/* Sub-pixel corrections (world px) so the words and the ring sit on exactly
   the pixels the phone's pill renders them on after the cut. The pill is laid
   out inside the scaled phone, where the browser rounds to whole phone pixels
   (≈4 screen px at the cut); these were measured off rendered frames across
   the cut and are applied by transform, which is never rounded. */
const CUT_FIX = {textY: 0.72, ringX: 0.52, ringY: 0.18}; // textY refit after the pill label's 0.6pt drop: matches on 0.66–0.77

/* Ring + dot at breath b: full → faint and small. Its large end is the mark's
   own size (breathing past it read as big-small-big). Shared with the pill. */
const markBreath = (b: number) => ({opacity: 0.28 + 0.72 * b, scale: 0.815 + 0.185 * b});

const CheckToLive: React.FC<{f: number; bf?: number; p: Pal; z: number; addX: number; addY: number}> = ({f, bf, p, z, addX, addY}) => {
  const t0 = GOLIVE.fade[1];
  const cut = E_CUT;
  const F0 = GOLIVE.fade[0];
  // the checkbox's grey line turns into the Live ring's light ink as the page goes dark
  const m = ease(f, F0, t0 + 12, Easing.inOut(Easing.cubic));
  const rowLeft = wellCX(GL_WELL) - (ROW_W * z) / 2;
  const cx = rowLeft + (ROW.touch / 2 + BOX_NUDGE) * z; // = addX − (KNOB.gap + KNOB.d / 2)·z — never moves
  void addX;
  /* Everything is drawn in ONE box of fixed size and position, and only
     scaled or redrawn inside it. Resizing the element frame by frame let the
     browser snap its edges to whole pixels, and the circle's centre wandered
     by up to 2px — the jitter Lucas saw. */
  const D0 = ROW.check * z;
  const dotIn = sp(f, t0 - 2, 'layout');
  /* Ring and dot breathe TOGETHER (Lucas), as the app's whole Live mark does —
     see eBreath; the pill's glyph picks the same breath up at the cut. */
  void cut;
  const d = lerp(ROW.check, KNOB.d, eResize(f)) * z;
  const {opacity: op, scale: sc} = markBreath(eBreath(bf ?? f));
  const line = KNOB.line * z;
  const a0 = CHECK_RING.alpha;
  const [r0, g0, b0] = [0x46, 0x4b, 0x52];
  const [r1, g1, b1] = [0xdc, 0xe5, 0xf5];
  const ringCol = `rgba(${Math.round(lerp(r0, r1, m))},${Math.round(lerp(g0, g1, m))},${Math.round(lerp(b0, b1, m))},${lerp(a0, 1, m)})`;
  return (
    // placed by TRANSFORM, not left/top: layout offsets are snapped to whole px in
    // world space, which the close-up's zoom then magnifies into visible jumps
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: D0,
        height: D0,
        transform: `translate(${cx - D0 / 2 + CUT_FIX.ringX}px, ${addY - D0 / 2 + CUT_FIX.ringY}px)`,
      }}
    >
      <svg width={D0} height={D0} viewBox={`0 0 ${D0} ${D0}`} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: op, transform: `scale(${sc})`}}>
        <circle cx={D0 / 2} cy={D0 / 2} r={(d - line) / 2} fill="none" stroke={ringCol} strokeWidth={line} />
        <circle cx={D0 / 2} cy={D0 / 2} r={d * 0.21 * dotIn} fill={DARK.ink} />
      </svg>
    </div>
  );
};

/* `ext` (F only): extra letters on the words over the dark, a camera glide for
   that layer, and the real-time clock the ring breathes on. */
type Ext = {chars: number; pan: number; bf: number};
const SwipeScene: React.FC<{f: number; v: Variant; tr?: Transition; ext?: Ext}> = ({f, v, tr = 'line', ext: insExt}) => {
  const ext = React.useContext(ExtTop);
  const p = LIGHT;
  const z = PZ;
  const G = GEO[v];

  // camera: close on the typed name; while the row builds it eases off the
  // name onto the whole row (the name never moves inside its row — the frame
  // moves round it); then back to the wide shot
  // ONE move, not a pan and then a zoom (Lucas): from the typed name straight
  // out to the wide shot, zoom on a log scale so it feels even throughout
  const out = ease(f, CAM_MOVE[0], CAM_MOVE[1], Easing.bezier(0.45, 0, 0.2, 1));
  const textCX = wellX(1) + (ROW_X + ROW.touch + ROW.gap + 33) * z; // centre of the typed name
  // D: back in, onto Today's "add" row, where "go live" will be typed
  const goLive = tr === 'golive' || tr === 'golive2';
  const inT = goLive ? ease(f, GOLIVE.zoom[0], GOLIVE.zoom[1], Easing.bezier(0.6, 0, 0.25, 1)) : 0;
  // D drifts in a little while the page goes dark; E holds dead still — the words
  // may move only once the pull-back starts (Lucas)
  const push = tr === 'golive' ? 1 + 0.07 * ease(f, GOLIVE.fade[0] - 4, GOLIVE.fade[1] + 2, Easing.in(Easing.quad)) : 1;
  const addX = wellCX(GL_WELL) - (ROW_W * z) / 2 + (ROW.touch + ROW.gap) * z; // where a new task's text starts
  const addY = slotCY(G, 1); // Today: Plan trip to Asia, then add
  const s = lerp(Math.exp(lerp(Math.log(OPEN), 0, out)), CLOSE, inT) * push;
  const fx = lerp(lerp(textCX, W / 2, out), addX + 26 * z, inT);
  const fy = lerp(lerp(slotCY(G, 0), G.camY, out), addY, inT);
  const camT = `translate(${W / 2 - fx * s}px, ${H / 2 - fy * s}px) scale(${s})`;
  const gl = goLiveText(tr).slice(0, typedCount(f, GOLIVE.start, GOLIVE.gaps));
  const glCaret = f >= GOLIVE.tap + 2 && f < GOLIVE.fade[0] && (f < GOLIVE.start + 26 || Math.floor(f / 15) % 2 === 0);
  const fadeOut = goLive ? ease(f, GOLIVE.fade[0], GOLIVE.fade[1]) : 0;

  const typed = 'to.morrow'.slice(0, typedCount(f, TYPE.start, TYPE.gaps));

  const active = MOVES.filter((m) => f >= m.appear && f <= m.land + 10).pop();
  const order = [...TASKS].sort((a, b) => Number(active ? a.moves.includes(active) : 0) - Number(active ? b.moves.includes(active) : 0));

  return (
    <Canvas p={p}>
      <AbsoluteFill style={{transformOrigin: '0 0', transform: camT}}>
        {WELLS.map((wl, i) => {
          const depth = wellDepth(i, f);
          if (depth <= 0) return null;
          const catchSwell = MOVES.filter((m) => m.well === i).reduce((acc, m) => acc * swell(f, m.push, m.push + 7, 0.014), 1);
          const labelIn = i === 1 ? ease(f, ZOOM_OUT[0] + 10, ZOOM_OUT[1]) : depth;
          return (
            <Trough
              key={wl}
              z={z}
              p={p}
              refH={64}
              radius={22}
              fillStop={0.18}
              shadeScale={0.65}
              fillLift={0.55}
              depth={depth}
              style={{
                position: 'absolute',
                left: wellX(i),
                top: G.top,
                width: WELL_W * z,
                height: G.h * z,
                transform: `scale(${(0.97 + 0.03 * depth) * catchSwell})`,
              }}
            >
              {G.titles ? <div style={{position: 'absolute', left: 22 * z, top: 20 * z, opacity: labelIn, ...sf(22, z, 600), color: p.ink, lineHeight: 1.15}}>{wl}</div> : null}
            </Trough>
          );
        })}

        {v === 'B' ? <BarAll f={f} G={G} p={p} z={z} /> : null}
        {v === 'C' ? <BarOwn f={f} G={G} p={p} z={z} /> : null}

        {/* each list's closing "add" row */}
        {[0, 1, 2].map((i) => {
          const op = i === 1 ? clamp01(rowIn(3, f) * 1.4) : wellDepth(i, f);
          if (op <= 0) return null;
          return (
            <div key={i} style={{position: 'absolute', left: wellCX(i) - (ROW_W * z) / 2, top: slotCY(G, addSlot(i, f)) - (ROW.h * z) / 2, opacity: op}}>
              <AddRow
                w={ROW_W}
                z={z}
                p={p}
                text={
                  goLive && i === GL_WELL && f >= GOLIVE.tap + 2 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        // E: the same sub-pixel lift as the words over the dark (CUT_FIX)
                        transform: tr === 'golive2' ? `translateY(${CUT_FIX.textY}px)` : undefined,
                      }}
                    >
                      {gl}
                      <Caret z={z} color={p.accent} on={glCaret} />
                    </span>
                  ) : undefined
                }
              />
            </div>
          );
        })}

        {order.map((t) => {
          const st = t.at(f, G);
          const isLogo = t.title === 'to.morrow';
          const building = isLogo && f < BUILD.grip + 12;
          return (
            <div
              key={t.title}
              style={{
                position: 'absolute',
                left: st.x - (ROW_W * z) / 2,
                top: st.y - (ROW.h * z) / 2,
                opacity: st.opacity,
                transform: `scale(${st.scale})`,
                filter: st.lift > 0.01 ? `drop-shadow(${-3 * z * st.lift}px ${8 * z * st.lift}px ${10 * z * st.lift}px rgba(36,38,41,${0.16 * st.lift}))` : undefined,
              }}
            >
              <TaskRow
                title={t.title}
                w={ROW_W}
                z={z}
                p={p}
                slat={st.slat}
                titleOpacity={st.content}
                check={isLogo ? 1 : st.content}
                // the first box is DRAWN on, its line running round from the top (Lucas)
                checkDraw={isLogo ? ease(f, BUILD.check, BUILD.check + 20, Easing.inOut(Easing.cubic)) : undefined}
                grip={isLogo ? ease(f, BUILD.grip, BUILD.grip + 8) : st.content}
                titleNode={
                  building ? (
                    <span style={{display: 'inline-flex', alignItems: 'center'}}>{typed}</span>
                  ) : undefined
                }
              />
            </div>
          );
        })}

        {/* the finger on each flick */}
        {MOVES.map((m, i) => {
          if (f < m.appear || f > m.release + 10) return null;
          const x = moveX(m, Math.min(f, m.release));
          const show = ease(f, m.appear, m.appear + 6) * (1 - ease(f, m.release, m.release + 9));
          const sc = lerp(1.3, 1, sp(f, m.appear, 'layout')) * (1 - 0.08 * sp(f, m.down, 'press')) * lerp(1, 1.15, ease(f, m.release, m.release + 9));
          const ripple = f >= m.down && f <= m.down + 16 ? (f - m.down) / 16 : -1;
          return <Finger key={i} x={x - dirOf(m) * 120} y={slotCY(G, 0)} d={56} opacity={show} scale={sc} p={p} ripple={ripple} />;
        })}
      </AbsoluteFill>

      <div style={{position: 'absolute', left: 0, right: 0, top: 168, display: 'flex', justifyContent: 'center', opacity: goLive ? 1 - ease(f, GOLIVE.zoom[0], GOLIVE.zoom[0] + 12) : 1}}>
        <Rise text="Swipe to reschedule tasks." f={f} start={ZOOM_OUT[0] + 26} step={4} style={{...HEAD, color: p.ink}} />
      </div>

      {goLive && f >= GOLIVE.tap - 12 && f <= GOLIVE.tap + 14 ? (
        <AbsoluteFill style={{transformOrigin: '0 0', transform: camT}}>
          <Finger
            x={addX + 20 * z + lerp(40, 0, ease(f, GOLIVE.tap - 12, GOLIVE.tap - 1)) / s}
            y={addY + lerp(46, 0, ease(f, GOLIVE.tap - 12, GOLIVE.tap - 1)) / s}
            d={70 / CLOSE}
            opacity={ease(f, GOLIVE.tap - 12, GOLIVE.tap - 7) * (1 - ease(f, GOLIVE.tap + 6, GOLIVE.tap + 14))}
            scale={(1 - 0.08 * sp(f, GOLIVE.tap, 'press')) * lerp(1, 1.15, ease(f, GOLIVE.tap + 6, GOLIVE.tap + 14))}
            p={p}
            ripple={f >= GOLIVE.tap && f <= GOLIVE.tap + 16 ? (f - GOLIVE.tap) / 16 : -1}
          />
        </AbsoluteFill>
      ) : null}

      {fadeOut > 0 ? (
        <>
          {/* everything goes to the Live section's dark ground — except the words */}
          <AbsoluteFill style={{background: DARK.canvas, opacity: fadeOut, top: -ext, height: H + ext}} />
          <AbsoluteFill style={{transformOrigin: '0 0', transform: insExt ? `translateX(${insExt.pan}px) ${camT}` : camT}}>
            <div
              style={{
                position: 'absolute',
                left: addX,
                top: addY,
                transform: tr === 'golive2' ? `translateY(calc(-50% + ${CUT_FIX.textY}px))` : 'translateY(-50%)',
                /* E: the light words fade in over the dark ones, set identically
                   (row setting) so the hand-over is a pure colour change */
                ...sf(ROW.label, z, 400, -0.02),
                ...(tr === 'golive2' ? {opacity: fadeOut} : {}),
                lineHeight: 1.19,
                whiteSpace: 'nowrap',
                color: tr === 'golive2' ? DARK.ink : mix(p.ink, DARK.ink, fadeOut),
              }}
            >
              {goLiveText(tr)}
              {insExt ? INS_TEXT.slice(0, insExt.chars) : null}
            </div>
            {tr === 'golive2' ? <CheckToLive f={f} bf={insExt?.bf} p={p} z={z} addX={addX} addY={addY} /> : null}
          </AbsoluteFill>
        </>
      ) : null}
    </Canvas>
  );
};

/* ═══ Scene 2 — the line ═══════════════════════════════════════════════ */
const TEXT_IN = SWIPE_END;
const TEXT_END = TEXT_IN + 60;
const TextScene: React.FC<{f: number}> = ({f}) => (
  <Canvas p={DARK} flat>
    <AbsoluteFill style={{display: 'grid', placeItems: 'center', transform: `scale(${lerp(1, 1.035, ease(f, TEXT_IN, TEXT_END, Easing.linear))})`}}>
      <Rise text="Never forget a task again." f={f} start={TEXT_IN + 2} step={4} style={{...sf(96, 1, 650), letterSpacing: '-0.03em', color: DARK.ink}} />
    </AbsoluteFill>
  </Canvas>
);

/* ═══ Scene 3 — live ═══════════════════════════════════════════════════ */
const LIVE_CUT = TEXT_END;
const PH = 830;
const PTOP = (H - PH) / 2;
const PS = phoneScreen(PH);
const PL_CX = 600;
const PR_CX = 1320;
const SCREEN_W = 390;
const toGlobal = (cx: number, x: number, y: number): P => [cx - PS.W / 2 + PS.x + x * PS.z, PTOP + PS.y + y * PS.z];

const TASK = 'Bring passport';
const LTYPE = {start: LIVE_CUT + 34, gaps: [3, 2, 3, 3, 2, 4, 3, 2, 3, 2, 3, 3, 2, 3]};
const LTYPE_END = LTYPE.start + LTYPE.gaps.reduce((a, b) => a + b, 0);
const GO = LIVE_CUT + 107; // tap "Go" — the task goes live (0.7 s after the last letter — Lucas)
const ARRIVE = GO + 40;
const TICK = ARRIVE + 81; // ticked off on the Lock Screen (0.5 s later than at first — Lucas)
const OFF_AIR = TICK + 26;

/* the app screen, 390pt wide */
const BOX = {x: 20, y: 262, w: 350, h: 252};
const CTRL_Y = BOX.y + BOX.h + 16; // top of the controls row
const CARD = {x: 12, y: 560, w: 366};
const CHECK_C: P = [CARD.x + CARD.w - 8 - 18 - 22, CARD.y + 8 + 18 + 22];

/* How much of the phone exists yet — only E's transition uses less than all of it. */
type Reveal = {pill: number; glyph: number; ui: number; frame: number};
const FULL: Reveal = {pill: 1, glyph: 1, ui: 1, frame: 1};

/* `breathOv` (E): the Live mark's breath handed over from the swipe side, so the
   pill's glyph — and then the Live state — keeps the same pulse going. */
const AppScreen: React.FC<{f: number; rv?: Reveal; forceGo?: boolean; breathOv?: number}> = ({f, rv = FULL, forceGo = false, breathOv}) => {
  const p = DARK;
  const n = typedCount(f, LTYPE.start, LTYPE.gaps);
  const typing = f >= LTYPE.start && f < LTYPE_END + 4;
  const caretOn = rv.ui >= 1 && f < GO && (typing || Math.floor(f / 15) % 2 === 0);
  const clear = ease(f, OFF_AIR + 4, OFF_AIR + 14);
  // E keeps the Go Live pill it was handed even while the box is still empty
  const mode: 'off' | 'go' | 'live' =
    forceGo && n === 0 && f < GO ? 'go' : n === 0 || f >= OFF_AIR + 8 ? 'off' : f < GO ? 'go' : 'live';
  const live = f >= GO && f < OFF_AIR + 8;
  return (
    <div style={{position: 'absolute', inset: 0, background: p.canvas}}>
      <div style={{position: 'absolute', inset: 0, opacity: rv.ui}}>
        <StatusBar color={p.ink} />
      </div>
      <div style={{position: 'absolute', left: 21.5, top: 54, opacity: rv.ui}}>
        <TopBar w={SCREEN_W - 43} z={1} p={p} />
      </div>
      <div style={{position: 'absolute', left: BOX.x, top: BOX.y, opacity: rv.ui}}>
        <LiveBox w={BOX.w} h={BOX.h} z={1} p={p}>
          {n === 0 || clear > 0.5 ? (
            <span style={{color: p.inkFaint, opacity: n === 0 ? 1 : clear * 2 - 1, display: 'inline-flex', alignItems: 'center'}}>
              {n === 0 && f < GO ? <Caret z={1} color={p.accent} on={caretOn && f >= LIVE_CUT + 20} /> : null}
              What are you doing?
            </span>
          ) : (
            <span style={{opacity: 1 - clear * 2, display: 'inline-flex', alignItems: 'center'}}>
              {TASK.slice(0, n)}
              {f < GO ? <Caret z={1} color={p.edgeLight} on={caretOn} /> : null}
            </span>
          )}
        </LiveBox>
      </div>
      <div style={{position: 'absolute', left: (SCREEN_W - SCREEN_W * 0.68) / 2, top: CTRL_Y}}>
        <LiveControls
          screenW={SCREEN_W}
          z={1}
          p={p}
          mode={mode}
          breath={live ? breathOv ?? pulse(f - GO) : null}
          knobBreath={breathOv === undefined ? undefined : markBreath(breathOv)}
          hasText={n > 0 && clear < 0.5}
          swell={swell(f, GO, GO + 7)}
          reveal={{pill: rv.pill, glyph: rv.glyph, bin: rv.ui}}
          knob={forceGo}
        />
      </div>
      <div style={{position: 'absolute', left: 21.5, top: 844 - 34 - 51, opacity: rv.ui}}>
        <TabBar w={SCREEN_W - 43} z={1} p={p} liveSelected pill={null} liveBreath={live ? breathOv ?? pulse(f - GO) : null} />
      </div>
    </div>
  );
};

const LockScreen: React.FC<{f: number}> = ({f}) => {
  const p = DARK;
  const wake = ease(f, ARRIVE - 6, ARRIVE + 6);
  const nIn = sp(f, ARRIVE, 'present');
  const done = ease(f, TICK + 1, TICK + 6);
  const strike = ease(f, TICK + 4, TICK + 16);
  const gone = sp(f, TICK + 22, 'layout');
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(172deg, #425A76 0%, #31465E 28%, #23262B 66%, #1A1B1E 100%)'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(90% 55% at 78% 8%, rgba(102,130,162,.5) 0%, rgba(102,130,162,0) 70%)'}} />
      <StatusBar color={p.ink} />
      <div style={{position: 'absolute', top: 86, width: '100%', textAlign: 'center', ...sf(19, 1, 600), color: 'rgba(220,229,245,.88)'}}>Friday 4 September</div>
      <div
        style={{
          position: 'absolute',
          top: 104,
          width: '100%',
          textAlign: 'center',
          fontFamily: '"SF Pro Rounded", -apple-system, sans-serif',
          fontSize: 104,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'rgba(220,229,245,.92)',
        }}
      >
        16:39
      </div>
      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.y,
          opacity: clamp01(nIn * 1.5) * (1 - gone),
          transform: `translateY(${(1 - nIn) * 44 - gone * 14}px) scale(${(0.9 + 0.1 * nIn) * (1 - 0.06 * gone)})`,
        }}
      >
        <LockCard w={CARD.w} z={1} p={p} title={TASK} done={done} strike={strike} checkSwell={swell(f, TICK, TICK + 7)} />
      </div>
      {/* torch and camera — iOS's two Lock Screen quick actions */}
      {[46, SCREEN_W - 46 - 50].map((x, i) => (
        <div
          key={x}
          style={{
            position: 'absolute',
            left: x,
            top: 740,
            width: 50,
            height: 50,
            borderRadius: 999,
            background: 'rgba(18,19,22,.42)',
            boxShadow: 'inset 0 0 0 0.5px rgba(214,229,255,.10)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {i === 0 ? (
            <svg width="13" height="24" viewBox="0 0 13 24">
              <path
                d="M1.2 0.8h10.6c.4 0 .7.3.7.7v3.1c0 .3-.1.6-.3.8L10 7.9c-.2.3-.3.6-.3.9v13.4c0 .9-.7 1.6-1.6 1.6H4.9c-.9 0-1.6-.7-1.6-1.6V8.8c0-.3-.1-.6-.3-.9L.8 5.4C.6 5.2.5 4.9.5 4.6V1.5c0-.4.3-.7.7-.7z M6.5 11.6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3z"
                fill={p.ink}
                fillRule="evenodd"
              />
            </svg>
          ) : (
            <svg width="26" height="20" viewBox="0 0 26 20">
              <path
                d="M8.9 1.2h8.2c.8 0 1.5.4 1.9 1.1l1 1.7h2.7c1.6 0 2.8 1.3 2.8 2.8v9.6c0 1.6-1.3 2.8-2.8 2.8H3.3C1.7 19.2.5 17.9.5 16.4V6.8C.5 5.3 1.7 4 3.3 4H6l1-1.7c.4-.7 1.1-1.1 1.9-1.1z M13 6.4a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 1 0 0-10.4z M13 8.4a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 1 1 0-6.4z"
                fill={p.ink}
                fillRule="evenodd"
              />
            </svg>
          )}
        </div>
      ))}
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: 1 - wake}} />
    </div>
  );
};

/* Camera: s = zoom, (fx, fy) = the point at frame centre. Each close-up
   centres its phone; the caption sits in the empty half beside it. */
type Cam = {s: number; fx: number; fy: number};
const CAM_WIDE: Cam = {s: 1, fx: W / 2, fy: H / 2};
const CAM_L: Cam = {s: 1.28, fx: PL_CX, fy: H / 2};
const CAM_R: Cam = {s: 1.28, fx: PR_CX, fy: H / 2};
const CAM_KEYS: Array<[number, Cam]> = [
  [LIVE_CUT + 12, CAM_WIDE],
  [LIVE_CUT + 38, CAM_L],
  [GO + 4, CAM_L],
  [GO + 30, CAM_WIDE],
  [ARRIVE + 2, CAM_WIDE],
  [ARRIVE + 28, CAM_R],
];
const camAt = (f: number): Cam => {
  if (f <= CAM_KEYS[0][0]) return CAM_KEYS[0][1];
  for (let i = 0; i < CAM_KEYS.length - 1; i++) {
    const [a, ca] = CAM_KEYS[i];
    const [b, cb] = CAM_KEYS[i + 1];
    if (f <= b) {
      const t = ease(f, a, b, Easing.inOut(Easing.cubic));
      return {s: lerp(ca.s, cb.s, t), fx: lerp(ca.fx, cb.fx, t), fy: lerp(ca.fy, cb.fy, t)};
    }
  }
  return CAM_KEYS[CAM_KEYS.length - 1][1];
};
const toScreen = (pt: P, c: Cam): P => [(pt[0] - c.fx) * c.s + W / 2, (pt[1] - c.fy) * c.s + H / 2];

const Caption: React.FC<{lines: string[]; f: number; start: number; x: number; align: 'left' | 'right'; out?: number; mul?: number}> = ({
  lines,
  f,
  start,
  x,
  align,
  out = 99999,
  mul = 1,
}) => {
  const fade = (1 - ease(f, out, out + 8)) * mul;
  if (f < start || fade <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: H / 2,
        ...(align === 'left' ? {left: x} : {right: W - x}),
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'left' ? 'flex-start' : 'flex-end',
        opacity: fade,
      }}
    >
      {lines.map((line, i) => (
        <Rise key={line} text={line} f={f} start={start + i * 5} step={3} style={{...sf(54, 1, 650), letterSpacing: '-0.025em', lineHeight: 1.12, color: DARK.ink}} />
      ))}
    </div>
  );
};

const LiveScene: React.FC<{f: number; camOv?: Cam; rv?: Reveal; capMul?: number; forceGo?: boolean; breathOv?: number}> = ({
  f,
  camOv,
  rv = FULL,
  capMul = 1,
  forceGo = false,
  breathOv,
}) => {
  const extTop = React.useContext(ExtTop);
  const p = DARK;
  const cam = camOv ?? camAt(f);
  // the Go pill / Live switch sits left of centre in its row (the bin is on its right)
  const ctrlG = toGlobal(PL_CX, SCREEN_W / 2 - (12 + 44.4) / 2, CTRL_Y + 22.2);
  const cardG = toGlobal(PR_CX, CARD.x + CARD.w / 2, CARD.y + 48);
  const checkG = toGlobal(PR_CX, CHECK_C[0], CHECK_C[1]);

  // the Live ring travelling from the switch to the Lock Screen
  const P0: P = [ctrlG[0] - 40, ctrlG[1] - 10];
  const P2: P = [cardG[0] - 80, cardG[1]];
  const P1: P = [(P0[0] + P2[0]) / 2, Math.min(P0[1], P2[1]) - 360];
  const TA = GO + 6;
  const TB = ARRIVE - 2;
  const tNow = ease(f, TA, TB, Easing.inOut(Easing.sin));
  const CELL = 8;
  const dots: React.ReactNode[] = [];
  if (f >= TA && f <= TB + 24) {
    for (let i = 1; i < 46; i++) {
      const ti = i / 46;
      if (ti > tNow) break;
      const laid = lerp(TA, TB, Math.asin(2 * ti - 1) / Math.PI + 0.5);
      const op = clamp01(1 - (f - laid) / 16);
      if (op <= 0) continue;
      const [x, y] = qbez(P0, P1, P2, ti);
      dots.push(<div key={i} style={{position: 'absolute', left: Math.round(x / CELL) * CELL - CELL / 2, top: Math.round(y / CELL) * CELL - CELL / 2, width: CELL, height: CELL, background: p.edgeLight, opacity: op * 0.85}} />);
    }
  }
  const [px, py] = qbez(P0, P1, P2, tNow);
  const pk = interpolate(f, [TA, TA + 6, TB - 4, TB], [0.4, 1, 1, 0.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rings = (c: P, start: number, maxR: number, count = 3) =>
    Array.from({length: count}, (_, i) => {
      const t = (f - start - i * 5) / 26;
      if (t < 0 || t > 1) return null;
      const r = lerp(14, maxR, Easing.out(Easing.cubic)(t));
      return <div key={`${start}-${i}`} style={{position: 'absolute', left: c[0] - r, top: c[1] - r, width: r * 2, height: r * 2, borderRadius: 999, border: `2px solid ${p.edgeLight}`, boxSizing: 'border-box', opacity: (1 - t) * 0.5}} />;
    });
  const fingerAt = (c: P, down: number) =>
    f >= down - 12 && f <= down + 14 ? (
      <Finger
        x={c[0] + lerp(40, 0, ease(f, down - 12, down - 1))}
        y={c[1] + lerp(46, 0, ease(f, down - 12, down - 1))}
        d={60}
        opacity={ease(f, down - 12, down - 7) * (1 - ease(f, down + 6, down + 14))}
        scale={(1 - 0.08 * sp(f, down, 'press')) * lerp(1, 1.15, ease(f, down + 6, down + 14))}
        p={p}
        ripple={f >= down && f <= down + 16 ? (f - down) / 16 : -1}
      />
    ) : null;

  return (
    <Canvas p={p}>
      {rv.frame < 1 ? <AbsoluteFill style={{background: p.canvas, opacity: 1 - rv.frame, top: -extTop, height: H + extTop}} /> : null}
      <AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${W / 2 - cam.fx * cam.s}px, ${H / 2 - cam.fy * cam.s}px) scale(${cam.s})`}}>
        <Phone left={PL_CX - PS.W / 2} top={PTOP} H={PH} frameOpacity={rv.frame}>
          <AppScreen f={f} rv={rv} forceGo={forceGo} breathOv={breathOv} />
        </Phone>
        <Phone left={PR_CX - PS.W / 2} top={PTOP} H={PH} frameOpacity={rv.frame} style={{opacity: rv.frame}}>
          <LockScreen f={f} />
        </Phone>
        {rings(ctrlG, GO + 1, 120)}
        {dots}
        {f >= TA && f <= TB ? (
          <div style={{position: 'absolute', left: px, top: py, transform: `translate(-50%, -50%) scale(${pk})`, filter: 'drop-shadow(0 0 14px rgba(214,229,255,.6))'}}>
            <Pixel g={GLYPH.live} cell={5} color="#E8F2FC" />
          </div>
        ) : null}
        {rings(cardG, ARRIVE - 1, 240, 2)}
        {fingerAt(ctrlG, GO)}
        {fingerAt(checkG, TICK)}
      </AbsoluteFill>
      <Caption lines={['One task,', 'always in view.']} f={f} start={LIVE_CUT + 34} out={GO + 4} x={W / 2 - (PS.W * CAM_L.s) / 2 - 70} align="right" mul={capMul} />
      <Caption lines={['Right on your', 'Lock Screen.']} f={f} start={ARRIVE + 22} x={W / 2 + (PS.W * CAM_R.s) / 2 + 70} align="left" />
    </Canvas>
  );
};

/* ─── Back to the start: light floods out of the tick into frame 0 ──── */
const FLOOD = {start: TICK + 28, end: TICK + 56};
const FLOOD_R = 2300;
const checkScreen = toScreen(toGlobal(PR_CX, CHECK_C[0], CHECK_C[1]), camAt(FLOOD.start));

/* ─── E: the typed "Go Live" becomes the button ─────────────────────────
   At the cut the Live section opens with its camera so far in on the Go
   Live pill that the pill's label sits exactly where the typed words were,
   at the same size; around the label the pill, then the screen, then the
   phone come in while the camera pulls back to the whole phone. The Live
   section's own clock is held while that happens, picking up with the
   typing already done. */
// clock0: the Live box is still EMPTY when the phone is revealed — "Bring passport" is typed after (Lucas)
const E = {cut: E_CUT, hold: 60 + E_SETTLE, clock0: LIVE_CUT + 30, zoom: [8 + E_SETTLE, 56 + E_SETTLE] as [number, number]};
export const DURATION_E = FLOOD.end - E.clock0 + E.cut + E.hold + 1;
export const DURATION_F = DURATION_E + INS.len - INS_SKIP;
const eClock = (f0: number) => E.clock0 + Math.max(0, f0 - E.cut - E.hold);
const LABEL_W = 52.9; // pt — "Go Live" in the ROW setting (SF Pro Text Regular 16.4pt, −0.05em); refit off the rendered cut
/* The anchor: the left edge of the pill's label, in world px. */
const labelAnchor = (): P => {
  const lead = KNOB.pad + KNOB.d + KNOB.gap; // pill's left end → label
  const pillW = lead + LABEL_W + 20;
  const rowLeft = (SCREEN_W - SCREEN_W * 0.68) / 2;
  const contentLeft = rowLeft + (SCREEN_W * 0.68 - (pillW + 12 + 44.4)) / 2;
  return toGlobal(PL_CX, contentLeft + lead, CTRL_Y + 22.2);
};
const camButton = (): Cam => {
  // where SwipeScene leaves the words on screen (its final close-up)
  const sSw = CLOSE; // E's close-up never pushes in
  const xSw = W / 2 - 26 * PZ * sSw; // left edge of the words
  const ySw = H / 2; // their centre line (the camera sits on it)
  const s = (16.4 * PZ * sSw) / (16.4 * PS.z);
  const [lx, ly] = labelAnchor();
  return {s, fx: lx - (xSw - W / 2) / s, fy: ly - (ySw - H / 2) / s};
};
/* The pull-back is solved around the label, not by blending two cameras:
   zoom runs on a log scale, and the label glides in a straight line from
   where the words were to where the button sits in the centred phone.
   Lerping the two cameras' focus points while the zoom ran on a different
   curve made the button swing sideways and back mid-move (Lucas: "a weird
   stutter"). */
const camE = (f0: number): Cam => {
  const a = camButton();
  const A = labelAnchor();
  const t = ease(f0, E.cut + E.zoom[0], E.cut + E.zoom[1], Easing.inOut(Easing.cubic));
  const s = Math.exp(lerp(Math.log(a.s), Math.log(CAM_L.s), t));
  const s0: P = [(A[0] - a.fx) * a.s + W / 2, (A[1] - a.fy) * a.s + H / 2];
  const s1: P = [(A[0] - CAM_L.fx) * CAM_L.s + W / 2, (A[1] - CAM_L.fy) * CAM_L.s + H / 2];
  const sx = lerp(s0[0], s1[0], t);
  const sy = lerp(s0[1], s1[1], t);
  return {s, fx: A[0] - (sx - W / 2) / s, fy: A[1] - (sy - H / 2) / s};
};
const PromoE: React.FC<{variant: Variant; f0: number; ins?: boolean}> = ({variant, f0: fReal, ins = false}) => {
  // F runs E on a warped clock (see INS); E's own clock is the real one
  const f0 = ins ? insWarp(fReal) : fReal;
  const f = eClock(f0);
  const r = FLOOD_R * ease(f, FLOOD.start, FLOOD.end, Easing.bezier(0.55, 0, 0.25, 1));
  const c = E.cut;
  const rv: Reveal = {
    pill: ease(f0, c + 2, c + 14),
    glyph: 1, // already there: the checkbox became it before the cut
    ui: ease(f0, c + 12 + E_SETTLE, c + 40 + E_SETTLE),
    frame: ease(f0, c + 18 + E_SETTLE, c + 48 + E_SETTLE),
  };
  return (
    <AbsoluteFill style={{background: LIGHT.canvas}}>
      {f0 < c ? (
        <SwipeScene f={f0} v={variant} tr="golive2" ext={ins ? {chars: insChars(fReal), pan: insPan(fReal), bf: fReal} : undefined} />
      ) : null}
      {f0 >= c && f < FLOOD.end + 1 ? (
        <LiveScene
          f={f}
          // after the pull-back, hold the centred phone until the Live section's own
          // camera reaches it too — its clock resumes mid-way through its own zoom-in
          camOv={f0 < c + E.zoom[1] ? camE(f0) : f < CAM_KEYS[1][0] ? CAM_L : undefined}
          rv={rv}
          capMul={ease(f0, c + 40 + E_SETTLE, c + 56 + E_SETTLE)}
          forceGo
          breathOv={eBreath(fReal)}
        />
      ) : null}
      {f >= FLOOD.start ? (
        <AbsoluteFill style={{clipPath: f >= FLOOD.end ? undefined : `circle(${r}px at ${checkScreen[0]}px ${checkScreen[1]}px)`}}>
          <SwipeScene f={0} v={variant} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

/* D holds "go live" twice as long as the text card's slot allows, so its
   Live section runs that much later and the composition is that much longer. */
const GOLIVE_CUT_D = GOLIVE.fade[1] + 43; // ~1.4 s alone on dark (Lucas)
export const GOLIVE_HOLD = GOLIVE_CUT_D - LIVE_CUT; // D's Live section runs this much later
export const DURATION = FLOOD.end + 2;
export const Promo: React.FC<{variant: Variant; transition?: Transition}> = ({variant, transition = 'line'}) => {
  const f0 = useCurrentFrame();
  if (transition === 'golive2' || transition === 'golive3') return <PromoE variant={variant} f0={f0} ins={transition === 'golive3'} />;
  const off = transition === 'golive' ? GOLIVE_HOLD : 0;
  const f = f0 - off; // the Live section's clock
  const r = FLOOD_R * ease(f, FLOOD.start, FLOOD.end, Easing.bezier(0.55, 0, 0.25, 1));
  return (
    <AbsoluteFill style={{background: LIGHT.canvas}}>
      {f0 < (transition === 'golive' ? GOLIVE_CUT_D : SWIPE_END) ? <SwipeScene f={f0} v={variant} tr={transition} /> : null}
      {transition === 'line' && f >= TEXT_IN && f < TEXT_END ? <TextScene f={f} /> : null}
      {f >= LIVE_CUT && f < FLOOD.end + 1 ? <LiveScene f={f} /> : null}
      {f >= FLOOD.start ? (
        <AbsoluteFill style={{clipPath: f >= FLOOD.end ? undefined : `circle(${r}px at ${checkScreen[0]}px ${checkScreen[1]}px)`}}>
          <SwipeScene f={0} v={variant} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

/* The tall cut for the website hero: the same film, EXT px of canvas added on
   top. The scene keeps its 1920x1080 box, placed EXT down; the backgrounds
   reach up into the band themselves (see ExtTop). */
export const PromoTall: React.FC<{variant: Variant; transition?: Transition}> = (props) => (
  <ExtTop.Provider value={EXT}>
    <AbsoluteFill style={{background: LIGHT.canvas}}>
      <div style={{position: 'absolute', left: 0, top: EXT, width: W, height: H}}>
        <Promo {...props} />
      </div>
    </AbsoluteFill>
  </ExtTop.Provider>
);

/* Dev only (not in the film): the Live section's phone exactly as the film
   renders it, with the camera parked on one control at 4 screen px per pt —
   for measuring how the labels sit in their buttons. */
export const LabPhone: React.FC<{at: 'top' | 'pill' | 'tab'; live?: boolean}> = ({at, live = false}) => {
  const y = at === 'top' ? 54 + 44.4 / 2 : at === 'pill' ? CTRL_Y + 44.4 / 2 : 844 - 34 - 51 / 2;
  const x = at === 'top' ? 90 : SCREEN_W / 2;
  const g = toGlobal(PL_CX, x, y);
  // clear of the finger (go) and of the go-live ripples (live)
  return <LiveScene f={live ? GO + 125 : GO - 30} camOv={{s: 4 / PS.z, fx: g[0], fy: g[1]}} forceGo={!live} />;
};
