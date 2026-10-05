import React from 'react';
import {Easing} from 'remotion';
import {Plan, PLAN_W, ROOMS} from './CampusMap';
import {Character, CharId, viewBox} from './Character';
import {SCREEN_H, SCREEN_W} from './Chat';
import {APP_W, MAP_WINDOW} from './MapUI';
import {BLEED, clamp01, CREAM, CSS, DARK, ease, ExtTop, fullBg, H, lerp, mix, NUNITO, PINK, rnd, sp, W, wordAnim} from './lib';

/* ─────────────────────────────────────────────────────────────────────────
   Scenes 5–6 — the burst onto the campus map.

   The customized character stays; every other character bursts out from
   behind it, then all of them settle onto the 1.F plan as the camera pulls
   out (log zoom, the character's own point gliding in a straight line), the
   pink drains to the plan's cream and the bodies turn from dark to the map's
   pink. Later they make way for the Courses tab's pink rooms.
   ───────────────────────────────────────────────────────────────────────── */

/* The map (Lucas, 2026-10-05): CLOSE — SPAN px per plan unit, about 2x the
   whole-plan fit — panning from the bottom-left (PAN0) up and across to the
   right (PAN1), eased in and out; then, as the courses finish, the camera pulls
   out to the whole floor (FULL). PAN_C is where the camera's centre point sits
   on screen while close. */
const SPAN = 0.9;
const PAN_C: [number, number] = [W / 2, 600];
const PAN0: [number, number] = [1550, 1330];
const PAN1: [number, number] = [2750, 1000]; // far enough up that the top room clears the caption
/* the whole floor: the drawn plan (x 314–4237, y 562–1849) 1720px wide, a little below the middle */
const FULL = {s: 1720 / (4237 - 314), c: [(314 + 4237) / 2, (562 + 1849) / 2] as [number, number], at: [W / 2, 612] as [number, number]};
/* As the phone closes round it, the floor glides up into the window the app's
   own chrome leaves on the screen (under the floor selector, above the sheet's
   eyes) — at k = 1 the screen is SCREEN_W x SCREEN_H about the frame's middle. */
const US = SCREEN_W / APP_W;
const IN_PHONE_Y = H / 2 - SCREEN_H / 2 + ((MAP_WINDOW.top + MAP_WINDOW.bottom(SCREEN_H / US)) / 2) * US;
const LEFT3 = W / 3;

/* the app's map marker, at video scale: figure contained in a 96x88 box, the
   name under it (map.css: Nunito 900, black) */
const BOX = {w: 96, h: 88};
const fitW = (id: CharId) => {
  const vb = viewBox(id);
  return Math.min(BOX.w, (BOX.h * vb[2]) / vb[3]);
};

/* Half as many characters as the first cut, each in a room. Every spot is the
   figure centre (plan units) where the whole marker — figure box AND name —
   clears the walls: measured off a raster of map_1f_walls.svg (distance
   transform, the marker's footprint min-filtered over it). */
const MAIN_U: [number, number] = [2330, 1104]; // the inner room of the U (1.045)
type Friend = {name: string; id: CharId; eyes: CharId; u: [number, number]};
const OTHERS: Friend[] = [
  {name: 'Emil', id: 'f1', eyes: 'f1', u: [2190, 741]}, // top room (1.102), as low as it clears
  {name: 'Ben', id: 'f7', eyes: 'f7', u: [588, 990]}, // far-left wing
  {name: 'Paul', id: 'f3', eyes: 'f3', u: [1924, 1650]}, // bottom row, left (1.052)
  {name: 'Theo', id: 'f6', eyes: 'f6', u: [2290, 1648]}, // bottom row, middle
  {name: 'Noah', id: 'f2', eyes: 'f1', u: [2734, 1313]}, // the corridor's right limb
  {name: 'Mila', id: 'f4', eyes: 'f4', u: [2830, 1632]}, // bottom row, right
  // (the far-right wing only comes into view once the friends have left, so nobody waits there)
  {name: 'Lena', id: 'm9', eyes: 'm9', u: [1652, 1480]}, // the narrow room left of the bottom row
];

/* Map caption: "locate your friends on campus" → "and your courses". "your"
   stays and slides; the rest fall out and rise in. Word widths are Nunito
   ExtraBold measured at 100px in Chrome. */
const CAP_FS = 84;
const CAP_Y = 178;
const SPACE = 27.86;
const WA = [['locate', 289.78], ['your', 211.22], ['friends', 330.88], ['on', 118.39], ['campus', 361.42]] as const;
const WB = [['and', 176.28], ['your', 211.22], ['courses', 358.63]] as const;
const layoutWords = (ws: readonly (readonly [string, number])[]) => {
  const k = CAP_FS / 100;
  const total = (ws.reduce((s, w) => s + w[1], 0) + SPACE * (ws.length - 1)) * k;
  let x = W / 2 - total / 2;
  return ws.map((w) => {
    const at = x;
    x += (w[1] + SPACE) * k;
    return at;
  });
};
const XA = layoutWords(WA);
const XB = layoutWords(WB);

/* The map's framing. The film's own (above); the VERTICAL cut's, in the same
   stage coordinates, for a stage the 1080 x 1350 frame sees at x 420–1500,
   y -135–1215: the camera's centre point lower (under the caption), a pan
   from the plan's lower left up to the right that keeps "you" in shot, a
   pull-out that fits the floor's width rather than the whole floor, the
   burst starting where the vertical customize puts the character, and the
   caption on two lines ("locate your friends" / "on campus"). */
type Pt = [number, number];
export type MapLayout = {panC: Pt; pan0: Pt; pan1: Pt; full: {s: number; c: Pt; at: Pt}; start: Pt; capY: number; xa: number[]; ya: number[]; xb: number[]};
const LAYOUT_H: MapLayout = {panC: PAN_C, pan0: PAN0, pan1: PAN1, full: FULL, start: [LEFT3, H / 2], capY: CAP_Y, xa: XA, ya: XA.map(() => CAP_Y), xb: XB};
const XA_V = [...layoutWords(WA.slice(0, 3)), ...layoutWords(WA.slice(3))];
const CAP_Y_V = -30;
export const MAP_V: MapLayout = {
  panC: [W / 2, 730],
  pan0: [2050, 1330],
  pan1: [2600, 1000],
  full: {s: 0.3, c: FULL.c, at: [W / 2, 735]},
  start: [W / 2, 645],
  capY: CAP_Y_V,
  xa: XA_V,
  ya: [CAP_Y_V, CAP_Y_V, CAP_Y_V, CAP_Y_V + CAP_FS * 1.05, CAP_Y_V + CAP_FS * 1.05],
  xb: XB,
};

type TL = {BOOM: number; COURSES: number; LOOP0: number; FRAME0: number; FRAME1: number; END: number};

export const CampusMap: React.FC<{f: number; T: TL; charW: number; finalChar: CharId; finalEyes: CharId; layout?: MapLayout}> = ({f, T, charW, finalChar, finalEyes, layout = LAYOUT_H}) => {
  const {panC: PAN_C, pan0: PAN0, pan1: PAN1, full: FULL} = layout;
  // camera, part 1 — the burst: from the customize framing (character at the
  // left third, charW wide) out to the close map at PAN0
  const Z0 = charW / fitW(finalChar);
  const c = ease(f, T.BOOM + 2, T.BOOM + 42, Easing.inOut(Easing.cubic));
  const Z = Math.exp(Math.log(Z0) * (1 - c));
  const mainLand: [number, number] = [PAN_C[0] + (MAIN_U[0] - PAN0[0]) * SPAN, PAN_C[1] + (MAIN_U[1] - PAN0[1]) * SPAN];
  const sMain: [number, number] = [lerp(layout.start[0], mainLand[0], c), lerp(layout.start[1], mainLand[1], c)];
  let scale = SPAN * Z;
  let origin: [number, number] = [sMain[0] - MAIN_U[0] * scale, sMain[1] - MAIN_U[1] * scale];
  // part 2 — the pan, eased in and out; part 3 — out to the whole floor
  if (f > T.BOOM + 42) {
    const pan = ease(f, T.BOOM + 42, T.COURSES + 34, Easing.inOut(Easing.cubic));
    const out = ease(f, T.COURSES + 36, T.COURSES + 70, Easing.inOut(Easing.cubic));
    const C: [number, number] = [lerp(lerp(PAN0[0], PAN1[0], pan), FULL.c[0], out), lerp(lerp(PAN0[1], PAN1[1], pan), FULL.c[1], out)];
    const settle = ease(f, T.FRAME0, T.FRAME1, Easing.inOut(Easing.cubic));
    const at: [number, number] = [lerp(PAN_C[0], FULL.at[0], out), lerp(PAN_C[1], lerp(FULL.at[1], IN_PHONE_Y, settle), out)];
    scale = Math.exp(lerp(Math.log(SPAN), Math.log(FULL.s), out));
    origin = [at[0] - C[0] * scale, at[1] - C[1] * scale];
  }
  const toScreen = (u: [number, number]): [number, number] => [origin[0] + u[0] * scale, origin[1] + u[1] * scale];

  const walls = ease(f, T.BOOM + 16, T.BOOM + 38);
  // the map no longer fades for the loop: the phone frame closes round it (UnifyPromo)
  const loopOut = 0;
  const ext = React.useContext(ExtTop);
  const roomT = (i: number) => {
    const order = [4, 0, 9, 2, 5, 7, 1, 6, 8, 3][i];
    return f < T.COURSES + 6 ? 0 : sp(f, T.COURSES + 8 + order * 3, 'bouncy');
  };
  // characters leave for the rooms, staggered across the plan left to right
  const gone = (u: [number, number]) => ease(f, T.COURSES + (u[0] / PLAN_W) * 12, T.COURSES + (u[0] / PLAN_W) * 12 + 10, Easing.in(Easing.cubic));

  const burst = ease(f, T.BOOM, T.BOOM + 14, Easing.out(Easing.cubic));
  const swell = 1 + 0.12 * Math.sin(clamp01((f - T.BOOM) / 8) * Math.PI);

  const marker = (key: string, id: CharId, eyes: CharId, pos: [number, number], w: number, body: string, nameO: number, rot: number, o: number, sq: number, name: string): React.ReactNode => {
    const vb = viewBox(id);
    const h = (w * vb[3]) / vb[2];
    return (
      <div key={key} style={{position: 'absolute', left: 0, top: 0, transform: `translate(${pos[0]}px, ${pos[1]}px)`, opacity: o}}>
        <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${-w / 2}px, ${-h / 2}px) rotate(${rot}deg) scale(${1 / sq}, ${sq})`, transformOrigin: `${w / 2}px ${h}px`}}>
          <Character id={id} eyes={eyes} width={w} body={body} />
        </div>
        <p
          style={{
            position: 'absolute', left: -90, width: 180, top: BOX.h / 2 + 6, margin: 0, textAlign: 'center',
            fontFamily: NUNITO, fontWeight: 900, fontSize: 26, lineHeight: 1, color: '#000', opacity: nameO, transform: `translateY(${(1 - nameO) * 6}px)`,
          }}
        >
          {name}
        </p>
      </div>
    );
  };

  const nodes: React.ReactNode[] = [];
  OTHERS.forEach((fr, i) => {
    const a = (i / OTHERS.length) * Math.PI * 2 + (rnd(i + 70) - 0.5) * 0.5;
    const r = 330 + 300 * rnd(i + 80);
    const E: [number, number] = [sMain[0] + Math.cos(a) * r * burst, sMain[1] + Math.sin(a) * r * burst * 0.82];
    const d = 6 * rnd(i + 90);
    const s = ease(f, T.BOOM + 10 + d, T.BOOM + 40 + d, Easing.inOut(Easing.cubic));
    const M = toScreen(fr.u);
    const pos: [number, number] = [lerp(E[0], M[0], s), lerp(E[1], M[1], s)];
    const sizeE = charW * (0.6 - 0.22 * burst);
    const w = lerp(sizeE, fitW(fr.id), s) * (f < T.BOOM + 1 ? 0 : 1);
    const land = T.BOOM + 40 + d;
    const sq = f < land ? 1 : 1 + 0.16 * Math.exp(-(f - land) / 4) * Math.sin(((f - land) / 7) * Math.PI);
    const rot = (rnd(i + 100) - 0.5) * 50 * burst * (1 - s);
    const nameO = ease(f, land + 2, land + 10);
    const o = clamp01(burst * 3) * (1 - gone(fr.u)) * (1 - loopOut);
    nodes.push(marker(fr.name, fr.id, fr.eyes, pos, w, mix(DARK, PINK, s), nameO, rot, o, sq, fr.name));
  });
  // the customized one, in front
  const mainW = fitW(finalChar) * Z * swell;
  nodes.push(marker('you', finalChar, finalEyes, toScreen(MAIN_U), mainW, mix(DARK, PINK, ease(f, T.BOOM + 12, T.BOOM + 36)), ease(f, T.BOOM + 44, T.BOOM + 52), 0, (1 - gone(MAIN_U)) * (1 - loopOut), 1, 'you'));

  // caption
  const capIn = T.BOOM + 24;
  const morph = T.COURSES + 2;
  const {xa: XA, ya: YA, xb: XB, capY} = layout;
  const yourX = lerp(XA[1], XB[1], ease(f, morph + 6, morph + 24, Easing.inOut(Easing.cubic)));
  const capOut = T.LOOP0;
  const word = (w: string, x: number, style: CSS, key: string, y = capY) => (
    <span key={key} style={{position: 'absolute', left: x, top: y, display: 'inline-block', whiteSpace: 'pre', ...style}}>
      {w}
    </span>
  );

  return (
    <>
      {/* the plan's cream comes up over the pink as the camera pulls out */}
      <div style={fullBg(ext, {background: CREAM, opacity: ease(f, T.BOOM + 8, T.BOOM + 30)})} />
      <div style={{position: 'absolute', inset: 0, opacity: 1 - loopOut, transform: `scale(${1 - 0.03 * loopOut})`, transformOrigin: '50% 50%'}}>
        <div style={{position: 'absolute', left: origin[0], top: origin[1]}}>
          <Plan scale={scale} walls={walls} rooms={roomT} />
        </div>
      </div>
      {nodes}
      {/* a cream wash at the top keeps the caption clear of the map passing under it
          (gone once the caption is: inside the phone it would fade the top room) */}
      <div style={{position: 'absolute', left: -BLEED, right: -BLEED, top: -ext - BLEED, height: 330 + ext + BLEED, background: `linear-gradient(${CREAM} ${ext + BLEED + 150}px, rgba(249,242,235,0))`, opacity: ease(f, T.BOOM + 20, T.BOOM + 34) * (1 - ease(f, T.FRAME0, T.FRAME0 + 24))}} />
      <div style={{position: 'absolute', inset: 0, fontFamily: NUNITO, fontWeight: 800, fontSize: CAP_FS, lineHeight: 1, letterSpacing: 0, color: DARK}}>
        {f < morph + 12 ? word('locate', XA[0], wordAnim(f, capIn, morph), 'a0') : null}
        {word('your', yourX, wordAnim(f, capIn + 3, capOut + 2), 'your')}
        {f < morph + 16 ? word('friends', XA[2], wordAnim(f, capIn + 6, morph + 2), 'a2') : null}
        {f < morph + 16 ? word('on', XA[3], wordAnim(f, capIn + 9, morph + 4), 'a3', YA[3]) : null}
        {f < morph + 18 ? word('campus', XA[4], wordAnim(f, capIn + 12, morph + 6), 'a4', YA[4]) : null}
        {f >= morph + 10 ? word('and', XB[0], wordAnim(f, morph + 12, capOut), 'b0') : null}
        {f >= morph + 10 ? word('courses', XB[2], wordAnim(f, morph + 16, capOut + 4), 'b2') : null}
      </div>
    </>
  );
};

export {ROOMS};
