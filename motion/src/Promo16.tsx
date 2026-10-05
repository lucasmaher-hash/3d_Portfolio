/* ═══ to.morrow promo — ALTERNATE: iPhone 16-class phones + a longer ending ═══
   A copy of Promo.tsx (landscape F, blue ×4) with:
   · the iPhone 12 mockups swapped for the modern frame in the project
     (public/images/unify/iphone-17-frame.png — the only Dynamic Island frame
     there; its screen is the 16 Pro's 402 x 874pt), and the app screen re-laid
     to the 16 Pro screenshot Lucas sent (status bar, top bar, Live box,
     controls, tab bar all measured off it at 3x);
   · a white Lock Screen and a white, minimal Home Screen;
   · a new ending: instead of ticking the task off on the Lock Screen, the
     phone is unlocked (swipe up from the bottom), the task sits in the
     Dynamic Island as a compact Live Activity, a tap expands the island (a
     damped spring with a small overshoot; the compact content blurs out as
     the expanded content blurs in), and the task is ticked off there. Then
     light floods out of the tick back to frame 0, as before. */
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {blueHex, BOX_NUDGE, CHECK_RING, DARK, Finger, Glass, GLYPH, LIGHT, LiveGlyph, mix, Pal, Pixel, ROW, Trough, sf} from './ui';
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
const ExtTop = React.createContext(0);
/* 240 covers the phone layout (Lucas, 2026-10-04: no gap under the nav there
   either); desktop shows only the bottom 196 of it — see .hero-promo. */


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
  const stops = (p.dark ? ['#36383C', '#2C2D30', '#242528'] : ['#D7DBE1', '#CACFD6', '#C3C8D0']).map((c, i) => `${blueHex(c)} ${[0, 52, 100][i]}%`).join(', ');
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
const CUT_FIX = {textY: 0.36, ringX: 0.44, ringY: 0.09}; // refit for the 16 Pro layout: text matches on 0.30–0.42, ring ≤0.1px

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
  const rgbOf = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r0, g0, b0] = rgbOf(CHECK_RING.color); // #464B52 — the open box's line
  const [r1, g1, b1] = rgbOf(DARK.ink); // #DCE5F5 — the Live ring's ink
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
/* iphone17-frame.png: 876 x 1808 px, screen hole x 36–839, y 30–1777 (804 x
   1748 = the 16 Pro's 402 x 874pt at 2px/pt), hole radius 128px; its own
   Dynamic Island: centre (201, 32.5)pt, 105.5 x 35.5pt. */
const FR = {w: 876, h: 1808, x: 36, y: 30, sw: 804, sh: 1748, r: 128};
const SCREEN_H = 874;
const PS = (() => {
  const k = PH / FR.h;
  return {W: FR.w * k, x: FR.x * k, y: FR.y * k, w: FR.sw * k, h: FR.sh * k, r: FR.r * k, z: (FR.sw * k) / 402};
})();
const PL_CX = 600;
const PR_CX = 1320;
const SCREEN_W = 402;
const toGlobal = (cx: number, x: number, y: number): P => [cx - PS.W / 2 + PS.x + x * PS.z, PTOP + PS.y + y * PS.z];

const TASK = 'Bring passport';
const LTYPE = {start: LIVE_CUT + 34, gaps: [3, 2, 3, 3, 2, 4, 3, 2, 3, 2, 3, 3, 2, 3]};
const LTYPE_END = LTYPE.start + LTYPE.gaps.reduce((a, b) => a + b, 0);
const GO = LIVE_CUT + 107; // tap "Go" — the task goes live (0.7 s after the last letter — Lucas)
const ARRIVE = GO + 40;
/* The new ending (Lucas): unlock, Dynamic Island, tick it off there. */
const UNLOCK = ARRIVE + 70; // finger lands on the bottom edge of the Lock Screen
const ISL_IN = UNLOCK + 24; // home screen settled — the island grows into the compact Live Activity
const ISL_TAP = ISL_IN + 82; // finger presses the island… (+1 s on the closed island — Lucas)
const ISL_EXP = ISL_TAP + 4; // …and on release it expands
const TICK = ISL_EXP + 44; // the task is ticked off inside the expanded island
const OFF_AIR = TICK + 26;

/* the app screen, 390pt wide */
// measured off the 16 Pro screenshot (1206 x 2622 → pt = px / 3)
const BOX = {x: 20.5, y: 290.3, w: 361, h: 257.7};
const CTRL_Y = 566; // top of the controls row (pill 566.8–610)
const CARD = {x: 12, y: 590, w: 378};
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
        <StatusBar16 color={p.ink} />
      </div>
      {/* pill 67.7–108.3pt, gear 68.6–110.4pt, both 22.7pt in from the edges */}
      <div style={{position: 'absolute', left: 22.7, top: 65.8, opacity: rv.ui}}>
        <TopBar w={SCREEN_W - 45.4} z={1} p={p} />
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
      <div style={{position: 'absolute', left: 21.8, top: SCREEN_H - 34 - 51, opacity: rv.ui}}>
        <TabBar w={SCREEN_W - 43.6} z={1} p={p} liveSelected pill={null} liveBreath={live ? breathOv ?? pulse(f - GO) : null} />
      </div>
    </div>
  );
};

/* ─── The 16 Pro's status bar, in its 402pt screen ──────────────────────
   Measured off Lucas's screenshot: time centred at x 63.7pt, the right-hand
   cluster centred at 326pt, both on the island's centre line (32.5pt). Same
   glyphs as the iPhone 12 bar in ui.tsx, minus the cellular bars. */
const arc16 = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
  const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
  return `M${p0[0]} ${p0[1]} A${r} ${r} 0 0 1 ${p1[0]} ${p1[1]}`;
};
const StatusBar16: React.FC<{color: string}> = ({color}) => {
  const cy = 32.5;
  const up0 = (-135 * Math.PI) / 180;
  const up1 = (-45 * Math.PI) / 180;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 56, color}}>
      <div style={{position: 'absolute', left: 63.7, top: cy, transform: 'translate(-50%, -50%)', fontFamily: '"SF Pro Text", -apple-system, sans-serif', fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1}}>
        09:41
      </div>
      <svg style={{position: 'absolute', left: 326, top: cy, transform: 'translate(-50%, -50%)', overflow: 'visible'}} width="68" height="12" viewBox="0 0 68 12">
        {/* no cellular bars (Lucas): beside the compact Live Activity they ran
            under the island's end — Wi-Fi and battery stay where they were */}
        <g fill="none" stroke={color} strokeWidth="1.9">
          <path d={arc16(29.5, 11.2, 9.6, up0, up1)} />
          <path d={arc16(29.5, 11.2, 6.1, up0, up1)} />
        </g>
        <path d={`M29.5 11.6 L${29.5 - 2.6} 8.9 A3.7 3.7 0 0 1 ${29.5 + 2.6} 8.9 Z`} fill={color} />
        <rect x="42.6" y="0.6" width="22.6" height="10.8" rx="3.2" fill="none" stroke={color} strokeOpacity=".4" strokeWidth="1" />
        <rect x="44.6" y="2.6" width="18.6" height="6.8" rx="1.6" fill={color} />
        <path d="M66.4 4.1v3.8c.8-.3 1.3-1 1.3-1.9s-.5-1.6-1.3-1.9z" fill={color} fillOpacity=".45" />
      </svg>
    </div>
  );
};

/* ─── The phone: the modern frame over a 402 x 874pt screen ──────────── */
const Phone16: React.FC<{left: number; top: number; H: number; frameOpacity?: number; style?: React.CSSProperties; children: React.ReactNode; over?: React.ReactNode}> = ({
  left,
  top,
  H: h,
  frameOpacity = 1,
  style,
  children,
  over,
}) => (
  <div style={{position: 'absolute', left, top, width: PS.W, height: h, ...style}}>
    {/* the screen box grown 2px all round so its edge sits under the frame's black border */}
    <div
      style={{
        position: 'absolute',
        left: PS.x - 2,
        top: PS.y - 2,
        width: PS.w + 4,
        height: PS.h + 4,
        borderRadius: PS.r + 2,
        overflow: 'hidden',
        boxShadow: `-26px 46px 70px rgba(9,9,10,${0.55 * frameOpacity}), -8px 14px 22px rgba(9,9,10,${0.35 * frameOpacity})`,
      }}
    >
      <div style={{position: 'absolute', left: 2, top: 2, width: SCREEN_W, height: SCREEN_H, transform: `scale(${PS.z})`, transformOrigin: '0 0'}}>{children}</div>
    </div>
    <Img src={staticFile('iphone17-frame.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: frameOpacity}} />
    {/* ABOVE the frame, in screen pt: the Dynamic Island. Under the frame the
        mockup's own island (lens, highlights) showed through ours as a second
        shape — "not flush" (Lucas); drawn over it, the island is one black. */}
    {over ? (
      <div style={{position: 'absolute', left: PS.x, top: PS.y, width: SCREEN_W, height: SCREEN_H, transform: `scale(${PS.z})`, transformOrigin: '0 0'}}>{over}</div>
    ) : null}
  </div>
);

/* A touch on a WHITE screen: the film's finger is a half-white disc, which
   vanishes on white, so this one is the same disc in a translucent grey. */
const FingerOnLight: React.FC<{x: number; y: number; d: number; opacity: number; scale: number; ripple?: number}> = ({x, y, d, opacity, scale, ripple = -1}) => (
  <>
    {ripple >= 0 && ripple <= 1 ? (
      <div style={{position: 'absolute', left: 0, top: 0, width: d, height: d, borderRadius: 999, border: '2px solid rgba(60,60,67,.45)', boxSizing: 'border-box', transform: `translate(${x - d / 2}px, ${y - d / 2}px) scale(${0.7 + ripple * 1.1})`, opacity: (1 - ripple) * 0.9}} />
    ) : null}
    <div style={{position: 'absolute', left: 0, top: 0, width: d, height: d, borderRadius: 999, background: 'rgba(60,60,67,.30)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.35)', opacity, transform: `translate(${x - d / 2}px, ${y - d / 2}px) scale(${scale})`}} />
  </>
);

/* ─── Timing of the ending, shared by the screens and the fingers ─────── */
const unlockU = (f: number) => ease(f, UNLOCK + 6, UNLOCK + 20, Easing.out(Easing.cubic)); // the Lock Screen slides away
const homeIn = (f: number) => ease(f, UNLOCK + 9, UNLOCK + 26, Easing.out(Easing.cubic)); // icons settle in

/* ─── Dynamic Island ──────────────────────────────────────────────────
   Three footprints, all centred on the frame's own island (x 201pt, top
   14.75pt) and growing DOWN and out from it: bare (the hardware, 105.5 x
   35.5), compact Live Activity (190 x 36: the task's Live ring leading, the
   title's first three letters trailing — Lucas: "only type out first 3
   letters", clear of the hardware cutout and not flush to the edge) and expanded (374 x 84, radius
   40: title left, tick button right — his expanded shot). Every change of
   footprint is a damped spring, the way iOS moves the island: growth on
   response .45 / damping .75 (a small overshoot that settles), the collapse
   firmer (.40 / .90, barely past its target). A press squishes it 4% first.
   Content never scales with the shape: the old content blurs (≤6px) and fades
   out as the new content blurs and fades in a beat later, and the island
   clips both — see the research notes in CLAUDE.md. */
const ISL = {cx: 201, top: 14.75, bare: {w: 105.5, h: 35.5}, compact: {w: 190, h: 36}, expanded: {w: 374, h: 84, r: 40}};
const springOf = (response: number, damping: number) => ({mass: 1, stiffness: Math.pow((2 * Math.PI) / response, 2), damping: (4 * Math.PI * damping) / response});
const SPR_GROW = springOf(0.45, 0.75);
const SPR_SHUT = springOf(0.4, 0.9);
const springAt = (f: number, start: number, config: {mass: number; stiffness: number; damping: number}) => (f < start ? 0 : spring({frame: f - start, fps: FPS, config}));
const ISL_CHECK: P = [349.7, 65.8]; // the expanded island's tick button, screen pt
const ISL_DONE = TICK + 22; // ticked off — the activity ends, the island shuts

const Island16: React.FC<{f: number}> = ({f}) => {
  const cIn = springAt(f, ISL_IN, SPR_GROW);
  const eIn = springAt(f, ISL_EXP, SPR_GROW);
  const shut = springAt(f, ISL_DONE, SPR_SHUT);
  if (f < ISL_IN) return null;
  const B = ISL.bare;
  const C = ISL.compact;
  const X = ISL.expanded;
  const w = lerp(lerp(lerp(B.w, C.w, cIn), X.w, eIn), B.w, shut);
  const h = lerp(lerp(lerp(B.h, C.h, cIn), X.h, eIn), B.h, shut);
  const r = Math.min(h / 2, lerp(h / 2, X.r, clamp01(eIn) * (1 - clamp01(shut))));
  const press = 1 - 0.04 * (sp(f, ISL_TAP, 'press') - sp(f, ISL_EXP, 'press'));
  const left = ISL.cx - w / 2;
  // content: compact fades/blurs out on the press, expanded in a beat after the release
  const cOp = clamp01(cIn * 1.4) * (1 - ease(f, ISL_EXP - 1, ISL_EXP + 5));
  const xOp = ease(f, ISL_EXP + 4, ISL_EXP + 14) * (1 - ease(f, ISL_DONE, ISL_DONE + 6));
  const blurC = (1 - cOp) * 6;
  const blurX = (1 - xOp) * 6;
  const done = ease(f, TICK + 1, TICK + 6);
  const strike = ease(f, TICK + 4, TICK + 16);
  /* The tick button SPRINGS (Lucas): squashed to 78% under the finger, then
     released on an underdamped spring (response .38, damping .42 — about
     23% overshoot) that throws it past full size and lets it settle. */
  const tickSquash = ease(f, TICK - 1, TICK + 2, Easing.out(Easing.quad));
  const tickPop = springAt(f, TICK + 3, springOf(0.38, 0.42));
  const tickSwell = f < TICK + 3 ? lerp(1, 0.78, tickSquash) : lerp(0.78, 1, tickPop);
  const ink = DARK.ink;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: ISL.top,
        width: w,
        height: h,
        borderRadius: r,
        background: '#000',
        overflow: 'hidden',
        transform: `scale(${press})`,
        transformOrigin: '50% 0%',
      }}
    >
      {/* children in SCREEN coordinates — the island only clips them */}
      <div style={{position: 'absolute', left: -left, top: -ISL.top, width: SCREEN_W, height: SCREEN_H}}>
        {cOp > 0.001 ? (
          <div style={{position: 'absolute', inset: 0, opacity: cOp, filter: blurC > 0.05 ? `blur(${blurC}px)` : undefined}}>
            <div style={{position: 'absolute', left: ISL.cx - C.w / 2 + 18.5, top: 32.5, transform: 'translate(-50%, -50%)'}}>
              <LiveGlyph d={20} color={ink} line={1.9} />
            </div>
            {/* right-aligned 14pt in from the island's end: "Bri" sits at ~265–282pt,
                12pt clear of the hardware cutout (148.5–253.5pt) */}
            <div
              style={{
                position: 'absolute',
                right: SCREEN_W - (ISL.cx + C.w / 2 - 14),
                top: 32.5,
                transform: 'translateY(-50%)',
                ...sf(13, 1, 600),
                color: DARK.inkMuted,
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
            >
              {TASK.slice(0, 3)}
            </div>
          </div>
        ) : null}
        {xOp > 0.001 ? (
          <div style={{position: 'absolute', inset: 0, opacity: xOp, filter: blurX > 0.05 ? `blur(${blurX}px)` : undefined, transform: `scale(${0.96 + 0.04 * xOp})`, transformOrigin: `${ISL.cx}px ${ISL.top}px`}}>
            <div style={{position: 'absolute', left: 36, top: ISL_CHECK[1], transform: 'translateY(-50%)', ...sf(17, 1, 500), color: mix(ink, DARK.inkMuted, done), lineHeight: 1.2, whiteSpace: 'nowrap'}}>
              <span style={{position: 'relative'}}>
                {TASK}
                <span style={{position: 'absolute', left: -2, top: '55%', height: 1.4, width: `calc(${strike * 100}% + 4px)`, background: DARK.inkMuted, opacity: strike > 0 ? 1 : 0}} />
              </span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: ISL_CHECK[0] - 13,
                top: ISL_CHECK[1] - 13,
                width: 26,
                height: 26,
                borderRadius: 999,
                background: mix('#3A3A3C', DARK.accent, done),
                boxShadow: 'inset 0 0 0 0.75px rgba(255,255,255,.18)',
                display: 'grid',
                placeItems: 'center',
                transform: `scale(${tickSwell})`,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24">
                <path d="M2.6 13.2l6.4 7L21.6 3.6" fill="none" stroke={ink} strokeOpacity={0.55 + 0.45 * done} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/* ─── Home Screen: white and nearly empty (Lucas) ───────────────────────
   One row of four apps and the dock, on the 16 Pro grid measured off his
   screenshot (columns at 63 / 155 / 248 / 340pt, 63pt icons; dock 17.5–
   384.5 x 754–855pt). The icons are generic drawings, not Apple artwork,
   apart from to.morrow's own. */
const ICON = 63;
const squircle = (bg: string): React.CSSProperties => ({width: ICON, height: ICON, borderRadius: ICON * 0.225, background: bg, position: 'relative', overflow: 'hidden', boxShadow: '0 0.5px 1.5px rgba(0,0,0,.12)'});
const AppIcon: React.FC<{kind: string}> = ({kind}) => {
  if (kind === 'tomorrow') return <Img src={staticFile('tomorrow-icon.webp')} style={{width: ICON, height: ICON, borderRadius: ICON * 0.225, display: 'block'}} />;
  if (kind === 'calendar')
    return (
      <div style={squircle('#FFFFFF')}>
        <div style={{position: 'absolute', top: 7, width: '100%', textAlign: 'center', ...sf(10, 1, 600), color: '#FF3B30', letterSpacing: '0.02em'}}>FRIDAY</div>
        <div style={{position: 'absolute', top: 17, width: '100%', textAlign: 'center', fontFamily: '"SF Pro Display", -apple-system, sans-serif', fontSize: 36, fontWeight: 300, color: '#1C1C1E', lineHeight: 1}}>4</div>
      </div>
    );
  if (kind === 'notes')
    return (
      <div style={squircle('#FFFFFF')}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 15, background: 'linear-gradient(#FFD84A, #F7C800)'}} />
        {[27, 37, 47].map((y) => (
          <div key={y} style={{position: 'absolute', left: 9, right: 9, top: y, height: 1.2, background: '#D1D1D6'}} />
        ))}
      </div>
    );
  if (kind === 'photos')
    return (
      <div style={squircle('#FFFFFF')}>
        <svg width={ICON} height={ICON} viewBox="0 0 63 63" style={{position: 'absolute', inset: 0}}>
          {['#FFB800', '#FF8A00', '#FF3D5A', '#C64BD8', '#5E5CE6', '#2D9CFF', '#2ECC71', '#B4D234'].map((c, i) => (
            <ellipse key={c} cx="31.5" cy="19.5" rx="6.6" ry="11.5" fill={c} fillOpacity=".86" transform={`rotate(${i * 45} 31.5 31.5)`} />
          ))}
        </svg>
      </div>
    );
  if (kind === 'phone')
    return (
      <div style={squircle('linear-gradient(#5BF675, #0CBD2A)')}>
        <svg width={ICON} height={ICON} viewBox="0 0 63 63" style={{position: 'absolute', inset: 0}}>
          <path d="M22.3 15.5c1.4-.4 2.9.3 3.5 1.6l2.6 5.6c.5 1.2.2 2.6-.8 3.4l-2.7 2.2c1.9 4 5 7.2 9 9.2l2.3-2.6c.9-1 2.3-1.3 3.5-.7l5.5 2.7c1.3.6 1.9 2.1 1.5 3.5l-1 3.4c-.5 1.6-2 2.7-3.7 2.6-12.9-.8-23.2-11.2-24-24.1-.1-1.7 1-3.2 2.6-3.7z" fill="#FFF" />
        </svg>
      </div>
    );
  if (kind === 'messages')
    return (
      <div style={squircle('linear-gradient(#5BF675, #0CBD2A)')}>
        <svg width={ICON} height={ICON} viewBox="0 0 63 63" style={{position: 'absolute', inset: 0}}>
          <ellipse cx="31.5" cy="29.5" rx="20" ry="16.5" fill="#FFF" />
          <path d="M17.5 38.5c-.6 3.6-2.7 6.4-4.9 7.6 4.6.4 8.7-1.1 11-3.3z" fill="#FFF" />
        </svg>
      </div>
    );
  if (kind === 'safari')
    return (
      <div style={squircle('#FFFFFF')}>
        <svg width={ICON} height={ICON} viewBox="0 0 63 63" style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="saf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1FC4FF" />
              <stop offset="1" stopColor="#1A6BFF" />
            </linearGradient>
          </defs>
          <circle cx="31.5" cy="31.5" r="25" fill="url(#saf)" />
          <path d="M40 23 L34.2 34.2 L23 40 L28.8 28.8 Z" fill="#FFF" />
          <path d="M40 23 L34.2 34.2 L28.8 28.8 Z" fill="#FF3B30" />
        </svg>
      </div>
    );
  // music
  return (
    <div style={squircle('linear-gradient(#FF6A80, #FA2D48)')}>
      <svg width={ICON} height={ICON} viewBox="0 0 63 63" style={{position: 'absolute', inset: 0}}>
        <path d="M25 18.5l18-4v22.2c0 2.9-2.6 5-5.4 4.7-2.3-.3-3.9-2.3-3.6-4.5.3-2 2.1-3.5 4.1-3.6l1.9-.1V22.4l-11.9 2.7v15.6c0 2.9-2.6 5-5.4 4.7-2.3-.3-3.9-2.3-3.6-4.5.3-2 2.1-3.5 4.1-3.6l1.9-.1z" fill="#FFF" />
      </svg>
    </div>
  );
};
const HOME_COLS = [63, 155, 248, 340];
const DOCK_COLS = [68.6, 156, 245, 333];
const HomeScreen16: React.FC<{f: number}> = ({f}) => {
  const k = homeIn(f);
  const sc = lerp(1.12, 1, k); // iOS: the icons fly in from slightly too large
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FFFFFF'}}>
      <div style={{position: 'absolute', inset: 0, opacity: k, transform: `scale(${sc})`, transformOrigin: '50% 45%'}}>
        {['tomorrow', 'calendar', 'notes', 'photos'].map((kind, i) => (
          <div key={kind} style={{position: 'absolute', left: HOME_COLS[i] - ICON / 2, top: 118, width: ICON, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
            <AppIcon kind={kind} />
            <div style={{...sf(12, 1, 500), color: '#1C1C1E', whiteSpace: 'nowrap', lineHeight: 1}}>{['to.morrow', 'Calendar', 'Notes', 'Photos'][i]}</div>
          </div>
        ))}
        {/* search pill */}
        <div style={{position: 'absolute', left: 201 - 42, top: 704, width: 84, height: 28, borderRadius: 14, background: 'rgba(118,118,128,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, ...sf(14, 1, 500), color: '#6C6C70'}}>
          <svg width="12" height="12" viewBox="0 0 24 24">
            <circle cx="10" cy="10" r="7" fill="none" stroke="#6C6C70" strokeWidth="2.8" />
            <path d="M15.2 15.2l6 6" stroke="#6C6C70" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
          Search
        </div>
        {/* dock */}
        <div style={{position: 'absolute', left: 17.5, top: 754, width: 367, height: 101, borderRadius: 38, background: 'rgba(118,118,128,.12)'}} />
        {['phone', 'messages', 'safari', 'music'].map((kind, i) => (
          <div key={kind} style={{position: 'absolute', left: DOCK_COLS[i] - ICON / 2, top: 804.5 - ICON / 2}}>
            <AppIcon kind={kind} />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Lock Screen: white (Lucas) ─────────────────────────────────────── */
const LockLayer16: React.FC<{f: number}> = ({f}) => {
  const p = DARK;
  const nIn = sp(f, ARRIVE, 'present');
  const u = unlockU(f);
  if (u >= 1) return null;
  const lift = -u * 150; // the whole Lock Screen rides up with the swipe…
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FFFFFF', opacity: 1 - u}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${lift}px)`}}>
        <div style={{position: 'absolute', top: 96, width: '100%', textAlign: 'center', ...sf(19, 1, 600), color: 'rgba(28,28,30,.72)'}}>Friday 4 September</div>
        <div
          style={{
            position: 'absolute',
            top: 113,
            width: '100%',
            textAlign: 'center',
            fontFamily: '"SF Pro Rounded", -apple-system, sans-serif',
            fontSize: 108,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'rgba(28,28,30,.88)',
          }}
        >
          16:39
        </div>
        <div
          style={{
            position: 'absolute',
            left: CARD.x,
            top: CARD.y,
            opacity: clamp01(nIn * 1.5),
            transform: `translateY(${(1 - nIn) * 44}px) scale(${0.9 + 0.1 * nIn})`,
          }}
        >
          <LockCard w={CARD.w} z={1} p={p} title={TASK} done={0} strike={0} />
        </div>
        {/* torch and camera, in the light-wallpaper style */}
        {[46, SCREEN_W - 46 - 50].map((x, i) => (
          <div key={x} style={{position: 'absolute', left: x, top: 770, width: 50, height: 50, borderRadius: 999, background: 'rgba(118,118,128,.16)', display: 'grid', placeItems: 'center'}}>
            {i === 0 ? (
              <svg width="13" height="24" viewBox="0 0 13 24">
                <path d="M1.2 0.8h10.6c.4 0 .7.3.7.7v3.1c0 .3-.1.6-.3.8L10 7.9c-.2.3-.3.6-.3.9v13.4c0 .9-.7 1.6-1.6 1.6H4.9c-.9 0-1.6-.7-1.6-1.6V8.8c0-.3-.1-.6-.3-.9L.8 5.4C.6 5.2.5 4.9.5 4.6V1.5c0-.4.3-.7.7-.7z M6.5 11.6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3z" fill="#1C1C1E" fillRule="evenodd" />
              </svg>
            ) : (
              <svg width="26" height="20" viewBox="0 0 26 20">
                <path d="M8.9 1.2h8.2c.8 0 1.5.4 1.9 1.1l1 1.7h2.7c1.6 0 2.8 1.3 2.8 2.8v9.6c0 1.6-1.3 2.8-2.8 2.8H3.3C1.7 19.2.5 17.9.5 16.4V6.8C.5 5.3 1.7 4 3.3 4H6l1-1.7c.4-.7 1.1-1.1 1.9-1.1z M13 6.4a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 1 0 0-10.4z M13 8.4a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 1 1 0-6.4z" fill="#1C1C1E" fillRule="evenodd" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* The right-hand phone: Lock Screen over Home Screen, the island over both. */
const RightScreen16: React.FC<{f: number}> = ({f}) => {
  const wake = ease(f, ARRIVE - 6, ARRIVE + 6);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FFFFFF'}}>
      {f >= UNLOCK + 6 ? <HomeScreen16 f={f} /> : null}
      <LockLayer16 f={f} />
      <StatusBar16 color="#1C1C1E" />
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
/* In on the Dynamic Island for the new ending: 2.18x puts the expanded
   island at ~750px wide; the focus sits 200pt down the screen so the island
   lands in the upper third with the home row under it. */
const CAM_I: Cam = {s: 2.18, fx: PR_CX, fy: PTOP + PS.y + 200 * PS.z};
const CAM_KEYS: Array<[number, Cam]> = [
  [LIVE_CUT + 12, CAM_WIDE],
  [LIVE_CUT + 38, CAM_L],
  [GO + 4, CAM_L],
  [GO + 30, CAM_WIDE],
  [ARRIVE + 2, CAM_WIDE],
  [ARRIVE + 28, CAM_R],
  [UNLOCK + 22, CAM_R],
  [ISL_IN + 44, CAM_I], // the push ends where it did; the extra second is held, not stretched
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
  // the ending's touch points, on the right-hand phone
  const unlockA = toGlobal(PR_CX, SCREEN_W / 2, SCREEN_H - 14);
  const unlockB = toGlobal(PR_CX, SCREEN_W / 2, SCREEN_H - 330);
  const islandG = toGlobal(PR_CX, ISL.cx + 30, ISL.top + 18);
  const islCheckG = toGlobal(PR_CX, ISL_CHECK[0], ISL_CHECK[1]);

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
        <Phone16 left={PL_CX - PS.W / 2} top={PTOP} H={PH} frameOpacity={rv.frame}>
          <AppScreen f={f} rv={rv} forceGo={forceGo} breathOv={breathOv} />
        </Phone16>
        <Phone16 left={PR_CX - PS.W / 2} top={PTOP} H={PH} frameOpacity={rv.frame} style={{opacity: rv.frame}} over={<Island16 f={f} />}>
          <RightScreen16 f={f} />
        </Phone16>
        {rings(ctrlG, GO + 1, 120)}
        {dots}
        {f >= TA && f <= TB ? (
          <div style={{position: 'absolute', left: px, top: py, transform: `translate(-50%, -50%) scale(${pk})`, filter: 'drop-shadow(0 0 14px rgba(214,229,255,.6))'}}>
            <Pixel g={GLYPH.live} cell={5} color="#E8F2FC" />
          </div>
        ) : null}
        {rings(cardG, ARRIVE - 1, 240, 2)}
        {fingerAt(ctrlG, GO)}
        {/* unlock: up from the bottom edge, fast, like a real swipe home */}
        {f >= UNLOCK - 4 && f <= UNLOCK + 22 ? (
          <FingerOnLight
            x={unlockA[0]}
            y={lerp(unlockA[1], unlockB[1], ease(f, UNLOCK + 6, UNLOCK + 15, Easing.in(Easing.quad)))}
            d={60}
            opacity={ease(f, UNLOCK - 4, UNLOCK + 2) * (1 - ease(f, UNLOCK + 13, UNLOCK + 20))}
            scale={1 - 0.08 * sp(f, UNLOCK + 2, 'press')}
          />
        ) : null}
        {/* press the island, then the tick inside it */}
        {[
          [islandG, ISL_TAP],
          [islCheckG, TICK],
        ].map(([c, down]) => {
          const [x, y] = c as P;
          const d0 = down as number;
          if (f < d0 - 12 || f > d0 + 14) return null;
          return (
            <FingerOnLight
              key={d0}
              x={x + lerp(40, 0, ease(f, d0 - 12, d0 - 1))}
              y={y + lerp(46, 0, ease(f, d0 - 12, d0 - 1))}
              d={30}
              opacity={ease(f, d0 - 12, d0 - 7) * (1 - ease(f, d0 + 6, d0 + 14))}
              scale={(1 - 0.08 * sp(f, d0, 'press')) * lerp(1, 1.15, ease(f, d0 + 6, d0 + 14))}
              ripple={f >= d0 && f <= d0 + 16 ? (f - d0) / 16 : -1}
            />
          );
        })}
      </AbsoluteFill>
      <Caption lines={['One task,', 'always in view.']} f={f} start={LIVE_CUT + 34} out={GO + 4} x={W / 2 - (PS.W * CAM_L.s) / 2 - 70} align="right" mul={capMul} />
      <Caption lines={['Right on your', 'Lock Screen.']} f={f} start={ARRIVE + 22} out={UNLOCK + 4} x={W / 2 + (PS.W * CAM_R.s) / 2 + 70} align="left" />
      <Caption lines={['And in the', 'Dynamic Island.']} f={f} start={ISL_IN + 14} x={W / 2 + (PS.w * CAM_I.s) / 2 + 70} align="left" />
    </Canvas>
  );
};

/* ─── Back to the start: light floods out of the tick into frame 0 ──── */
const FLOOD = {start: TICK + 28, end: TICK + 56};
const FLOOD_R = 2300;
const checkScreen = toScreen(toGlobal(PR_CX, ISL_CHECK[0], ISL_CHECK[1]), camAt(FLOOD.start));

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
export const Promo16: React.FC<{variant: Variant; transition?: Transition}> = ({variant, transition = 'line'}) => {
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

