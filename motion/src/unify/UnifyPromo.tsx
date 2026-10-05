import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {CampusMap} from './MapScene';
import {Character, CharId, viewBox} from './Character';
import {ChatScene, OPEN, SUCK} from './ChatScene';
import {ConnectCard, friendFigure, MC, MonsterCard, PANEL_H, PANEL_W} from './Connect';
import {APP, clamp01, CREAM, DARK, ease, ExtTop, fullBg, H, lerp, NUNITO, PINK, POPB, sp, W, wordAnim} from './lib';
import {PhoneFrameClose, SCREEN_H, SCREEN_W} from './Chat';
import {APP_W, MapAppUI} from './MapUI';
import {COURSE_H, DAYS_PAD, FRIENDS, FriendRow, PEOPLE_ROW_H, SearchBar, SharedTimetable, ttLayout} from './Timetable';
import CH from './chars.json';

/* ─────────────────────────────────────────────────────────────────────────
   Unify — promo loop, 1920x1080 @ 30 fps, on the app's dark ground.

   0     the HM Group chat on an iPhone: "when's your next break??", then the
         thread lifts off the phone and zig-zags around it (the case-study
         page's chat), one message every 0.8 s, each staying three beats
   250   new messages and timetable screenshots pile up around it
   324   everything is sucked into the middle, puffs, and the pink blob morphs
         into the app's shared timetable
   428   the camera goes in: the days (tap Tuesday, then Wednesday), down to
         the second course (who's in it bounces in), the break (who's on a
         break), the uni activity ("add uni activities to your timetable",
         two friends going), the friends list — in on Emil's green room
         number ("green means they're at uni") and back out — and Emil's
         timetable opens
   1028  "connect now" unfurls; tap Nam, back; tap Yas, back
   1204  the camera dives into Nam, everything else eases out to pink
   1236  "customize your character" — every 0.24 s a different body or eyes
   1331  the character bursts, the others burst out behind it and land in their
         rooms as the camera pulls out to a zoomed-in, slowly panning map —
         "locate your friends on campus"
   1431  the friends make way for the pink course rooms — "and your courses"
   1511  the phone frame closes round the map, with the app's own map chrome
         (floor selector, sheet, nav bar) on its glass; it holds, goes dark:
         frame 0
   ───────────────────────────────────────────────────────────────────────── */

const P = SUCK.PUFF;
export const T = {
  // timetable
  PUFF: P,
  CARD_IN0: P + 10,
  CARD_IN1: P + 24,
  SLIDE: [P + 28, P + 50] as const, // the timetable lands centred, then makes room for its caption
  CAP_TT: P + 40,
  // the overview holds 1 s more; each stop holds ~20% + 0.3 s longer than the
  // first cut, and a section only grows (its friends bounce in) once the camera is on it
  ZOOM_TOP: [P + 74, P + 96] as const,
  CUR_IN: P + 94,
  TAP_TUE: P + 116,
  TAP_WED: P + 164, // each picked day stays up twice as long as the first cut (Lucas)
  // down from the days to Wednesday's SECOND course, whose friends bounce in —
  // its own beat, apart from the day switching (Lucas, 2026-10-05); it leaves
  // 40 frames after the Wednesday tap — no idle second on the days any more
  ZOOM_COURSES: [P + 204, P + 226] as const,
  GROW_C: P + 226,
  PEOPLE_C: P + 234,
  ZOOM_BREAK: [P + 283, P + 305] as const,
  GROW_B: P + 305,
  PEOPLE_B: P + 313,
  // the uni activity (the cream socials block): its own short stop (Lucas, 2026-10-05)
  ZOOM_SOCIAL: [P + 362, P + 384] as const,
  GROW_M: P + 384,
  PEOPLE_M: P + 392,
  ZOOM_FRIENDS: [P + 441, P + 471] as const,
  // in on Emil's room number (green = at uni), held, and back out to the list (Lucas, 2026-10-05)
  ROOM_IN: [P + 481, P + 503] as const,
  ROOM_OUT: [P + 561, P + 585] as const,
  CUR2_IN: P + 581,
  TAP_EMIL: P + 605,
  TT_OUT: P + 660,
  // connect: the card simply opens (no unfold from the bubble any more)
  C_IN: P + 674,
  C_FRIENDS0: P + 690,
  CUR3_IN: P + 720,
  TAP_NAM: P + 740,
  CLOSE1: P + 770,
  TAP_YAS: P + 800,
  CLOSE2: P + 830,
  ZOOM0: P + 850,
  ZOOM1: P + 882,
  // customize
  CAP_CU: 0,
  CYCLE0: 0,
  STEP: 7.2, // 25% faster than the first cut's 9 (Lucas, 2026-10-05)
  // map
  BOOM: 0,
  COURSES: 0,
  LOOP0: 0,
  FRAME0: 0,
  FRAME1: 0,
  BLACK0: 0,
  BLACK1: 0,
  END: 0,
};
/* The customize cycle: [body, eyes]. Each holds STEP frames (0.24 s). */
export const CYCLE: [CharId, CharId][] = [
  ['f6', 'f6'], ['f6', 'f1'], ['f1', 'f1'], ['f1', 'f4'], ['f4', 'f4'], ['f4', 'f3'],
  ['f3', 'f3'], ['f7', 'f7'], ['f7', 'f2'], ['f2', 'f2'], ['m9', 'm9'], ['f5', 'f5'],
];
T.CAP_CU = T.ZOOM1 - 12;
T.CYCLE0 = T.ZOOM1 + 6;
/* the frame of the k-th swap (k >= 1), rounded so every pop starts on a whole frame */
const swapFrame = (k: number) => Math.round(T.CYCLE0 + (k - 1) * T.STEP);
T.BOOM = swapFrame(CYCLE.length) + 10;
T.COURSES = T.BOOM + 100;
T.FRAME0 = T.COURSES + 80; // after the pull-out to the whole floor, the phone frame closes in
T.FRAME1 = T.FRAME0 + 42;
T.BLACK0 = T.FRAME1 + 36; // the closed phone holds, showing the app's map screen, before going dark
T.BLACK1 = T.BLACK0 + 16;
T.LOOP0 = T.FRAME0; // (the map caption leaves as the frame starts closing)
T.END = T.BLACK1 + 8;
export const UNIFY_DURATION = T.END;
/* Every cut STARTS ON THE CHAT (Lucas, 2026-10-05), not on the black phone:
   the file's frame 0 is the film's frame FILM_START, the opener just in, and
   the film's own first frames — the black screen waking, the opener easing
   in — play at the END of the file, from where they loop straight into its
   start. The film's timeline (T) is unchanged; only where the file begins. */
export const FILM_START = OPEN + 14;
export const useFilmFrame = () => (useCurrentFrame() + FILM_START) % UNIFY_DURATION;

/* ── Layout ─────────────────────────────────────────────────────────────── */
export const LEFT3 = W / 3; // the connect card and the character sit on the left third line
export const CHAR_W = 520; // the customize character's width
const CAP_X = 1010; // captions start here (the timetable's sit further right: it is zoomed)

/* ── Captions: Nunito ExtraBold, the app's header voice, lowercase ───────── */
const Caption: React.FC<{lines: string[]; f: number; inAt: number; outAt?: number; color: string; x?: number; size?: number}> = ({lines, f, inAt, outAt, color, x = CAP_X, size = 100}) => {
  let k = 0;
  return (
    <div style={{position: 'absolute', left: x, top: H / 2, transform: 'translateY(-50%)', fontFamily: NUNITO, fontWeight: 800, fontSize: size, lineHeight: 0.92, letterSpacing: '-0.01em', color}}>
      {lines.map((line, li) => (
        <div key={li} style={{display: 'flex', whiteSpace: 'pre'}}>
          {line.split(/(\s+)/).map((w, i) => {
            if (/^\s+$/.test(w)) return <span key={i}>{w}</span>;
            const j = k++;
            return (
              <span key={i} style={{display: 'inline-block', ...wordAnim(f, inAt + j * 3, outAt === undefined ? undefined : outAt + j * 2)}}>
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* ── The app's cursor (cursor.js): 44px ring, black 20%, 40% while pressed ── */
const Cursor: React.FC<{x: number; y: number; o: number; down: number; scale: number}> = ({x, y, o, down, scale}) => {
  const d = 44 * scale * (1 - 0.12 * down);
  return (
    <div
      style={{
        position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: '50%', boxSizing: 'border-box',
        background: `rgba(0,0,0,${0.2 + 0.2 * down})`, border: `${2 * scale}px solid #fff`, opacity: o,
      }}
    />
  );
};
/* a press: 0 → 1 → 0 around frame `at` */
const press = (f: number, at: number) => ease(f, at - 3, at, Easing.out(Easing.quad)) * (1 - ease(f, at + 4, at + 9));
type Pt = [number, number];
/* a cursor path through timed waypoints [frame, point], eased between each */
const path = (f: number, pts: [number, Pt][]): Pt => {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, p0] = pts[i];
    const [b, p1] = pts[i + 1];
    if (f <= b) {
      const t = ease(f, a, b, Easing.inOut(Easing.cubic));
      return [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t)];
    }
  }
  return pts[pts.length - 1][1];
};

/* ═══ Timetable scene ═════════════════════════════════════════════════════
   The page (timetable, then the friends list) in app px; a camera of
   keyframes [frame, scale, page y at the frame's middle] walks down it. The
   timetable's centre line lands in the middle of the frame and then slides to
   x = TT_CX, making room for the caption. */
const TT_CX = 600;
export const ttCx = (f: number) => lerp(W / 2, TT_CX, ease(f, T.SLIDE[0], T.SLIDE[1], Easing.inOut(Easing.cubic)));
/* how far each section has grown (0 = no room for people yet) */
const GROW = 14;
const growC = (f: number) => ease(f, T.GROW_C, T.GROW_C + GROW, Easing.inOut(Easing.cubic));
const growB = (f: number) => ease(f, T.GROW_B, T.GROW_B + GROW, Easing.inOut(Easing.cubic));
const growM = (f: number) => ease(f, T.GROW_M, T.GROW_M + GROW, Easing.inOut(Easing.cubic));
/* Monday, Tuesday and Wednesday all have two pink courses, so the panel keeps its height */
const layoutAt = (f: number) => ttLayout(growC(f), growB(f), growM(f));
/* Wednesday's second course: below the days row and the first course */
const course2Mid = (f: number) => DAYS_PAD + 51.8 + 4 + COURSE_H + 4 + (COURSE_H + PEOPLE_ROW_H * growC(f)) / 2;
const emilTop = (f: number) => layoutAt(f).h + 34 + 52 + 22; // past the search bar
/* Emil's room number ("0.012", green: he is at uni) — its centre in the row */
const ROOM: Pt = [283, 36];
const ROOM_S = 3.2;
/* Camera keyframes [frame, scale, page y at the frame's middle, page x there
   (default: the timetable's centre line)]. Both are FUNCTIONS of the frame,
   read off the live layout, so the camera stays on its section while sections
   above it grow. */
type Key = [number, number, (f: number) => number, ((f: number) => number)?];
const MID_X = () => 377 / 2;
const TT_KEYS: Key[] = [
  [T.CARD_IN0, 1.25, (f) => layoutAt(f).h / 2], // the whole thing, as the blob lands
  [T.ZOOM_TOP[0], 1.25, (f) => layoutAt(f).h / 2],
  [T.ZOOM_TOP[1], 2.3, () => 148], // the days
  [T.ZOOM_COURSES[0], 2.3, () => 148],
  [T.ZOOM_COURSES[1], 2.3, (f) => course2Mid(f) + 20], // Wednesday's second course
  [T.ZOOM_BREAK[0], 2.3, (f) => course2Mid(f) + 20],
  [T.ZOOM_BREAK[1], 2.3, (f) => layoutAt(f).breakTop + layoutAt(f).breakH / 2], // the break
  [T.ZOOM_SOCIAL[0], 2.3, (f) => layoutAt(f).breakTop + layoutAt(f).breakH / 2],
  [T.ZOOM_SOCIAL[1], 2.3, (f) => layoutAt(f).creamTop + layoutAt(f).creamH / 2], // the uni activity
  [T.ZOOM_FRIENDS[0], 2.3, (f) => layoutAt(f).creamTop + layoutAt(f).creamH / 2],
  [T.ZOOM_FRIENDS[1], 1.8, (f) => emilTop(f) + 117], // the friends list
  [T.ROOM_IN[0], 1.8, (f) => emilTop(f) + 117],
  // Emil's room number, a little right of the timetable's line so his name stays in shot
  [T.ROOM_IN[1], ROOM_S, (f) => emilTop(f) + ROOM[1], () => ROOM[0] - 100 / ROOM_S],
  [T.ROOM_OUT[0], ROOM_S, (f) => emilTop(f) + ROOM[1], () => ROOM[0] - 100 / ROOM_S],
  [T.ROOM_OUT[1], 1.8, (f) => emilTop(f) + 117],
  [T.TAP_EMIL, 1.8, (f) => emilTop(f) + 117],
  [T.TAP_EMIL + 26, 1.8, (f) => emilTop(f) + 210], // ...following Emil's timetable down
];
const ttCam = (f: number) => {
  const X = (k: Key) => (k[3] ?? MID_X)(f);
  let k = TT_KEYS[0];
  for (let i = 0; i < TT_KEYS.length - 1; i++) {
    const A = TT_KEYS[i];
    const B = TT_KEYS[i + 1];
    const [a, sa, ya] = A;
    const [b, sb, yb] = B;
    if (f <= a) return {s: sa, y: ya(f), x: X(A)};
    if (f <= b) {
      const t = ease(f, a, b, Easing.inOut(Easing.cubic));
      const s = Math.exp(lerp(Math.log(sa), Math.log(sb), t));
      // zoom about the closer end's centre: its screen offset travels in a straight
      // line, so a push-in heads straight for its target instead of swinging past it
      // (with equal scales this is a plain lerp)
      const near = sb >= sa ? B : A;
      const ax = X(near);
      const ay = near[2](f);
      const ox = lerp((ax - X(A)) * sa, (ax - X(B)) * sb, t);
      const oy = lerp((ay - ya(f)) * sa, (ay - yb(f)) * sb, t);
      return {s, x: ax - ox / s, y: ay - oy / s};
    }
    k = B;
  }
  return {s: k[1], y: k[2](f), x: X(k)};
};
/* page point → screen */
const ttScreen = (f: number, px: number, py: number): Pt => {
  const c = ttCam(f);
  return [ttCx(f) + (px - c.x) * c.s, H / 2 + (py - c.y) * c.s];
};
/* the blob morphs into the pink panel at the overview (every section still closed) */
export const TT_SIL = (() => {
  const s = 1.25;
  const L = ttLayout(0, 0, 0);
  return {x: W / 2 - (377 / 2) * s, y: H / 2 - (L.h / 2) * s, w: 377 * s, h: L.pink * s, r: 22 * s};
})();

/* What the caption says at each stop */
export const TT_CAPS: {lines: string[]; inAt: number; outAt: number}[] = [
  {lines: ['your timetable,', "and everyone's"], inAt: T.CAP_TT, outAt: T.ZOOM_TOP[0]},
  {lines: ['all in', 'one place'], inAt: T.ZOOM_TOP[0] + 16, outAt: T.ZOOM_COURSES[0]},
  {lines: ["see who's in", 'your course'], inAt: T.ZOOM_COURSES[0] + 16, outAt: T.ZOOM_BREAK[0]},
  {lines: ["see who's on", 'a break'], inAt: T.ZOOM_BREAK[0] + 16, outAt: T.ZOOM_SOCIAL[0]},
  {lines: ['add uni activities', 'to your timetable'], inAt: T.ZOOM_SOCIAL[0] + 16, outAt: T.ZOOM_FRIENDS[0]},
  {lines: ['green means', "they're at uni"], inAt: T.ZOOM_FRIENDS[0] + 16, outAt: T.ROOM_OUT[0]},
  {lines: ["see your friends'", 'timetables'], inAt: T.ROOM_OUT[0] + 16, outAt: T.TT_OUT},
];

export const TimetableScene: React.FC<{f: number}> = ({f}) => {
  const cam = ttCam(f);
  const cardIn = ease(f, T.CARD_IN0, T.CARD_IN1, Easing.out(Easing.cubic));
  const out = ease(f, T.TT_OUT, T.TT_OUT + 14, Easing.in(Easing.cubic));
  // Monday → tap Tuesday → tap Wednesday
  const day = f < T.TAP_TUE + 1 ? 'montag' : f < T.TAP_WED + 1 ? 'dienstag' : 'mittwoch';
  const lastTap = f < T.TAP_WED + 1 ? T.TAP_TUE : T.TAP_WED;
  const slide = day === 'montag' ? 1 : ease(f, lastTap + 1, lastTap + 15, APP);
  const activeT = ease(f, lastTap, lastTap + 4);
  const [activeFrom, activeTo] = day === 'montag' ? [0, 0] : day === 'dienstag' ? [0, 1] : [1, 2];
  // friends bounce in only once the camera is on their section
  const personT = (course: string, i: number) => {
    const at = course === 'CAD Modeling' ? T.PEOPLE_C : course === 'break' ? T.PEOPLE_B : course === 'Book Club' ? T.PEOPLE_M : -1;
    return at < 0 ? 0 : sp(f, at + i * 5, 'bouncy');
  };
  const blockT = (i: number) => (i === 0 ? 1 : sp(f, T.CARD_IN0 + 4 + i * 6, 'soft'));
  const expandT = (course: string) => (course === 'CAD Modeling' ? growC(f) : course === 'break' ? growB(f) : course === 'Book Club' ? growM(f) : 0);
  const emilOpen = ease(f, T.TAP_EMIL + 1, T.TAP_EMIL + 12, Easing.inOut(Easing.quad));

  // cursor: the Tuesday disc, the Wednesday disc, then Emil's chevron
  const dDisc = ttScreen(f, 114.5, DAYS_PAD + 25.9); // Tuesday
  const wDisc = ttScreen(f, 114.5 + 74, DAYS_PAD + 25.9); // Wednesday
  const emilChev = ttScreen(f, 340, emilTop(f) + 35.5);
  const cur =
    f < T.TAP_WED + 12
      ? path(f, [[T.CUR_IN, [dDisc[0] + 320, dDisc[1] + 380]], [T.TAP_TUE - 4, dDisc], [T.TAP_TUE + 6, dDisc], [T.TAP_WED - 4, wDisc]])
      : path(f, [[T.CUR2_IN, [emilChev[0] + 260, emilChev[1] + 330]], [T.TAP_EMIL - 4, emilChev]]);
  const curO =
    ease(f, T.CUR_IN, T.CUR_IN + 8) * (1 - ease(f, T.TAP_WED + 10, T.TAP_WED + 18)) +
    ease(f, T.CUR2_IN, T.CUR2_IN + 8) * (1 - ease(f, T.TAP_EMIL + 12, T.TAP_EMIL + 20));
  const curDown = Math.max(press(f, T.TAP_TUE), press(f, T.TAP_WED), press(f, T.TAP_EMIL));

  const origin = ttScreen(f, 0, 0);
  return (
    <>
      <div
        style={{
          position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
          transform: `translate(${origin[0]}px, ${origin[1]}px) scale(${cam.s})`,
          opacity: cardIn * (1 - out),
        }}
      >
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, width: 377, transform: `scale(${1 - 0.05 * out})`, transformOrigin: `${cam.x}px ${cam.y}px`}}>
          <SharedTimetable day={day} slide={slide} activeFrom={activeFrom} activeTo={activeTo} activeT={day === 'montag' ? 1 : activeT} personT={personT} blockT={blockT} expandT={expandT} pinkH={layoutAt(f).pink} />
          {/* the friends list only comes up as the camera heads for it */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%', opacity: ease(f, T.ZOOM_FRIENDS[0] - 4, T.ZOOM_FRIENDS[0] + 12)}}>
            <SearchBar />
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%'}}>
              {FRIENDS.map((fr, i) => (
                <FriendRow key={fr.name} f={fr} open={i === 0 ? emilOpen : 0} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <Cursor x={cur[0]} y={cur[1]} o={curO} down={curDown} scale={cam.s} />
    </>
  );
};

/* ═══ Connect scene ════════════════════════════════════════════════════════
   The card pushes in slowly while its friends drift; two friends are opened
   and closed again; then, from the plain card, the camera dives into Nam. */
const SC0 = 1.6;
const SC1 = 1.82;
const CN_C: Pt = [LEFT3, H / 2]; // the card's centre
const scAt = (f: number) => lerp(SC0, SC1, ease(f, T.C_IN, T.ZOOM0, Easing.inOut(Easing.sin)));
const cnOrigin = (f: number): Pt => {
  const sc = scAt(f);
  return [CN_C[0] - (PANEL_W / 2) * sc, CN_C[1] - (PANEL_H / 2) * sc];
};
const friendScreen = (name: string, f: number): {p: Pt; w: number} => {
  const g = friendFigure(name, 1, f / 30);
  const o = cnOrigin(f);
  const sc = scAt(f);
  return {p: [o[0] + g.x * sc, o[1] + g.y * sc], w: g.fw * g.s * sc};
};
/* the dive: log zoom about Nam as he stood at ZOOM0, Nam's point gliding to the left third */
const NAM0 = friendScreen('Nam', T.ZOOM0);
const Z_END = CHAR_W / NAM0.w;
const diveCam = (f: number) => {
  const z = ease(f, T.ZOOM0, T.ZOOM1, Easing.inOut(Easing.cubic));
  const Z = Math.exp(Math.log(Z_END) * z);
  const A: Pt = [lerp(NAM0.p[0], LEFT3, z), lerp(NAM0.p[1], H / 2, z)];
  return {Z, A};
};

/* one friend's monster card, opened at `at`, closed at `close` */
const cardState = (f: number, at: number, close: number) => {
  const open = ease(f, at + 2, at + 10, POPB);
  const shut = ease(f, close + 1, close + 9, Easing.in(Easing.cubic));
  return {t: open * (1 - shut), dim: ease(f, at + 2, at + 10) * (1 - ease(f, close + 1, close + 9)), on: f >= at && f < close + 10};
};

export const ConnectScene: React.FC<{f: number}> = ({f}) => {
  const ext = React.useContext(ExtTop);
  const sec = f / 30;
  // a smooth open: the card fades up from a little smaller, eased out
  const inT = ease(f, T.C_IN, T.C_IN + 20, Easing.out(Easing.cubic));
  const friendT = (i: number) => sp(f, T.C_FRIENDS0 + [0, 3, 6, 9, 5][i] * 2, 'bouncy');
  const sc = scAt(f);
  const o = cnOrigin(f);
  const nam = cardState(f, T.TAP_NAM, T.CLOSE1);
  const yas = cardState(f, T.TAP_YAS, T.CLOSE2);
  const dim = Math.max(nam.dim, yas.dim);
  const {Z, A} = diveCam(f);
  const away = ease(f, T.ZOOM0, T.ZOOM0 + 18); // everything but Nam eases out
  const cam = `translate(${A[0]}px, ${A[1]}px) scale(${Z}) translate(${-NAM0.p[0]}px, ${-NAM0.p[1]}px)`;
  const mcPos: Pt = [CN_C[0] - (MC.w / 2) * sc, CN_C[1] - (MC.h / 2) * sc];

  // the cursor: Nam → tap outside → Yas → tap outside (both outside taps land below the card)
  const outside: Pt = [CN_C[0] + 120 * sc, CN_C[1] + 150 * sc];
  const namP = friendScreen('Nam', f).p;
  const yasP = friendScreen('Yas', f).p;
  const cur = path(f, [
    [T.CUR3_IN, [namP[0] + 260, namP[1] + 300]],
    [T.TAP_NAM - 4, namP],
    [T.CLOSE1 - 14, namP],
    [T.CLOSE1 - 4, outside],
    [T.TAP_YAS - 18, outside],
    [T.TAP_YAS - 4, yasP],
    [T.CLOSE2 - 14, yasP],
    [T.CLOSE2 - 4, outside],
  ]);
  const curO = ease(f, T.CUR3_IN, T.CUR3_IN + 8) * (1 - ease(f, T.CLOSE2 + 10, T.CLOSE2 + 18));
  const curDown = Math.max(press(f, T.TAP_NAM), press(f, T.CLOSE1), press(f, T.TAP_YAS), press(f, T.CLOSE2));

  return (
    <>
      <div style={{position: 'absolute', inset: 0, transform: f >= T.ZOOM0 ? cam : undefined, transformOrigin: '0 0'}}>
        <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${o[0]}px, ${o[1]}px) scale(${sc}) translate(${PANEL_W / 2}px, ${PANEL_H / 2}px) scale(${0.9 + 0.1 * inT}) translate(${-PANEL_W / 2}px, ${-PANEL_H / 2}px)`, opacity: inT}}>
          {/* the dive: the friends and text on the card ease out, the card itself stays and grows past the frame */}
          <ConnectCard open={1} friendT={friendT} sec={sec} hideNam={f >= T.ZOOM0} contentO={1 - away} />
        </div>
        <div style={fullBg(ext, {background: `rgba(41,41,37,${0.55 * dim})`})} />
        {[['Nam', nam], ['Yas', yas]].map(([name, st]) =>
          (st as ReturnType<typeof cardState>).on ? (
            <div key={name as string} style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${mcPos[0]}px, ${mcPos[1]}px) scale(${sc})`}}>
              <MonsterCard name={name as string} t={(st as ReturnType<typeof cardState>).t} />
            </div>
          ) : null,
        )}
      </div>
      {/* from the dive on, Nam is drawn in SCREEN space at the camera's own point:
          inside the scaled card, half a px of layout rounding becomes several px at 6x */}
      {f >= T.ZOOM0 ? <ScreenChar id="f6" eyes="f6" w={NAM0.w * Z} c={A} /> : null}
      <Cursor x={cur[0]} y={cur[1]} o={curO} down={curDown} scale={sc} />
    </>
  );
};

/* A character centred on a screen point, placed by transform only (no layout
   rounding), so hand-offs between scenes land on the same sub-pixel. */
export const ScreenChar: React.FC<{id: CharId; eyes: CharId; w: number; c: Pt; scale?: number; pupil?: Pt; body?: string}> = ({id, eyes, w, c, scale = 1, pupil, body}) => {
  const vb = viewBox(id);
  const h = (w * vb[3]) / vb[2];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${c[0]}px, ${c[1]}px) scale(${scale}) translate(${-w / 2}px, ${-h / 2}px)`}}>
      <Character id={id} eyes={eyes} width={w} pupil={pupil} body={body} />
    </div>
  );
};

/* ═══ Customize ═══════════════════════════════════════════════════════════ */
/* Every character is sized to the same visual weight (body-box area) as Nam
   at CHAR_W, so a swap changes the shape, not the size. */
const PX_PER_UNIT_NAM = CHAR_W / viewBox('f6')[2];
const charNorm = (id: CharId) => {
  const a = (k: CharId) => (CH as any)[k].body.bb[2] * (CH as any)[k].body.bb[3];
  return Math.sqrt(a('f6') / a(id));
};
export const charWidth = (id: CharId) => viewBox(id)[2] * PX_PER_UNIT_NAM * charNorm(id);
const cycleAt = (f: number) => {
  let k = 0;
  while (k < CYCLE.length - 1 && f >= swapFrame(k + 1)) k++;
  return k;
};
export const CustomizeChar: React.FC<{f: number}> = ({f}) => {
  const k = cycleAt(f);
  const [body, eyes] = CYCLE[k];
  const pop = k > 0 ? 1 + 0.09 * (1 - sp(f, swapFrame(k), 'snappy')) : 1;
  // the pupils glance over at the text once the dive has landed
  const glance = ease(f, T.ZOOM1 + 2, T.ZOOM1 + 12) * (1 - ease(f, T.BOOM - 14, T.BOOM - 4));
  return <ScreenChar id={body} eyes={eyes} w={charWidth(body)} c={[LEFT3, H / 2]} scale={pop} pupil={[2.2 * glance, -0.6 * glance]} />;
};
export const FINAL_CHAR = CYCLE[CYCLE.length - 1][0];

/* ═══ The film ═════════════════════════════════════════════════════════════ */
export const UnifyPromo: React.FC = () => {
  const f = useFilmFrame();
  const ext = React.useContext(ExtTop);
  const tile = React.useContext(TileCut);
  // the tile cut: the timetable scene eases left with its slide, which evens its margins there,
  // and the page (not its caption) moves right while the camera is in on Emil's room number,
  // in step with that zoom, so his name stays inside the narrower frame
  const ttDx = tile ? TILE.ttDx * ease(f, T.SLIDE[0], T.SLIDE[1], Easing.inOut(Easing.cubic)) : 0;
  const roomDx = tile ? TILE.roomDx * ease(f, T.ROOM_IN[0], T.ROOM_IN[1], Easing.inOut(Easing.cubic)) * (1 - ease(f, T.ROOM_OUT[0], T.ROOM_OUT[1], Easing.inOut(Easing.cubic))) : 0;

  // the ending: the phone FRAME closes in round the map (the map keeps its size; outside the
  // frame is the opening's dark), then its screen fades to black — and frame 0 wakes it again
  const k = Math.exp(Math.log(6) * (1 - ease(f, T.FRAME0, T.FRAME1, Easing.inOut(Easing.cubic))));
  const black = ease(f, T.BLACK0, T.BLACK1, Easing.inOut(Easing.quad));
  // the app's map chrome rides on the glass; while the phone holds, the sheet's eyes glance about
  const look = -3.5 * ease(f, T.FRAME1 - 6, T.FRAME1 + 4) + 7 * ease(f, T.FRAME1 + 14, T.FRAME1 + 24);
  const us = SCREEN_W / APP_W;
  const screenUI = (
    <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `scale(${us})`}}>
      <MapAppUI h={SCREEN_H / us} look={look} />
    </div>
  );

  return (
    <AbsoluteFill style={{background: DARK, overflow: tile ? 'visible' : 'hidden'}}>
      {/* the film's 1920x1080 frame; the tall cut adds `ext` of canvas above it */}
      <div style={{position: 'absolute', left: 0, top: ext, width: W, height: H}}>
        {/* after the dive the card's own pink has filled the frame; this takes over from it */}
        {f >= T.ZOOM1 && f < T.BOOM + 32 ? <div style={fullBg(ext, {background: PINK})} /> : null}

        {/* 1 — the chat, the flood, the suck, the puff and the morph */}
        {f < T.CARD_IN1 + 4 ? <ChatScene f={f} cardBox={TT_SIL} cardIn={[T.CARD_IN0, T.CARD_IN1]} /> : null}

        {/* 2 — the shared timetable */}
        <div style={{position: 'absolute', inset: 0, transform: ttDx + roomDx ? `translateX(${ttDx + roomDx}px)` : undefined}}>
          {f >= T.CARD_IN0 && f < T.TT_OUT + 16 ? <TimetableScene f={f} /> : null}
        </div>
        <div style={{position: 'absolute', inset: 0, transform: ttDx ? `translateX(${ttDx}px)` : undefined}}>
          {TT_CAPS.map((c, i) => (f >= c.inAt && f < c.outAt + 20 ? <Caption key={i} lines={c.lines} f={f} inAt={c.inAt} outAt={c.outAt} color={CREAM} x={1100} size={88} /> : null))}
        </div>

        {/* 3 — connect now, and the dive into Nam */}
        {f >= T.C_IN && f < T.ZOOM1 ? <ConnectScene f={f} /> : null}
        {f >= T.C_IN && f < T.ZOOM0 + 14 ? <Caption lines={['or view', 'at a glance']} f={f} inAt={T.C_IN + 6} outAt={T.ZOOM0} color={CREAM} x={1060} /> : null}

        {/* 4 — customize your character, on the app's pink */}
        {f >= T.ZOOM1 && f < T.BOOM ? <CustomizeChar f={f} /> : null}
        {f >= T.CAP_CU && f < T.BOOM + 14 ? <Caption lines={['customize', 'your character']} f={f} inAt={T.CAP_CU} outAt={T.BOOM} color={DARK} /> : null}

        {/* 5/6 — the burst onto the campus map, friends then courses */}
        {f >= T.BOOM ? <CampusMap f={f} T={T} charW={charWidth(FINAL_CHAR)} finalChar={FINAL_CHAR} finalEyes={CYCLE[CYCLE.length - 1][1]} /> : null}

        {/* 7 — the phone frame closes round the map, its screen goes black: frame 0 */}
        {f >= T.FRAME0 ? <PhoneFrameClose k={k} black={black} ground={DARK} screen={screenUI} /> : null}
      </div>
    </AbsoluteFill>
  );
};

/* The landing tile's cut (2D.html, Lucas 2026-10-05): 3:2 like the to.morrow
   tile, 1620x1080. A plain centre crop of the 16:9 film would cut the long
   timetable captions short (they run to x 1827), so this cut re-frames
   instead: the whole film at 0.9 about the frame's middle — the cameras see a
   little more on every side, full-frame grounds bleed to cover it (BLEED) —
   and the timetable scene eases 30px left with its slide, so its card and its
   captions sit ~65px from either edge; during the room-number zoom the page
   alone moves 60px right, keeping Emil's name in. */
export const TILE = {w: 1620, h: 1080, scale: 0.9, ttDx: -30, roomDx: 60};
const TileCut = React.createContext(false);
export const UnifyPromoTile: React.FC = () => (
  <AbsoluteFill style={{background: DARK, overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: (TILE.w - W) / 2, top: (TILE.h - H) / 2, width: W, height: H, transform: `scale(${TILE.scale})`, transformOrigin: '50% 50%'}}>
      <TileCut.Provider value={true}>
        <UnifyPromo />
      </TileCut.Provider>
    </div>
  </AbsoluteFill>
);

/* The page hero's tall cut: EXT px of canvas above the film (see ExtTop). */
export const UNIFY_EXT = 240;
export const UnifyPromoTall: React.FC = () => (
  <ExtTop.Provider value={UNIFY_EXT}>
    <UnifyPromo />
  </ExtTop.Provider>
);
