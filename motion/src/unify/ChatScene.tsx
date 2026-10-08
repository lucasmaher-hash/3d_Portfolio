import React from 'react';
import {Easing} from 'remotion';
import {Img, staticFile} from 'remotion';
import {BFS, bubbleH, COL_PAD, COL_W, IMG_W, ImgId, imgH, Message, MGAP, NAME_H, Phone, PHONE_FRAME_SRC, PHONE_H, PHONE_W, phoneScreen} from './Chat';
import {clamp01, CSS, ease, lerp, mix, MSGPOP, rnd, W, H} from './lib';

/* ─────────────────────────────────────────────────────────────────────────
   Scene 1 — the group chat (the case-study page's Problem animation, made
   deterministic), the flood, and the hand-over to the shared timetable: the
   messages are pulled INTO the phone, its screen clears, and the screen
   itself splits into the timetable's three sections (Lucas, 2026-10-05: the
   spiral → pink blob → puff → circle-to-card morph read as busy and the
   circle never became the card; now one rounded rectangle becomes three).

   The column works like the page's: CENTRED on the screen, newest message at
   the bottom; each add re-lays the column rigidly (everything moves by half
   the newcomer, and by half of whatever leaves), the whole column glides
   from where it was to where it now is, the newcomer eases in once the glide
   is mostly done, and the oldest leaves — frozen where it stood, opacity
   only — once the stack passes 78% of the screen. Overlapping glides simply
   add up, so the pace can quicken without anything jumping.
   ───────────────────────────────────────────────────────────────────────── */

export const CHAT_C: [number, number] = [W / 2, H / 2];

type M = {who?: string; img?: ImgId; text: string; out?: boolean; right?: boolean; tw: number; lines?: number};
/* The page's MSGS, with each text's width measured in SF at BFS (Chrome). */
const MSGS: M[] = [
  {out: true, text: "when's your next break??", tw: 328},
  {who: 'Ben', img: 'tt-ben', text: 'idk, check mine', tw: 199},
  {who: 'Sophia', right: true, img: 'tt-sophia', text: 'mine, materials till 13:00 😑', tw: 348},
  {who: 'Anna', text: "which break tho 😅 can't read all of these", tw: 524},
  {out: true, text: 'so nobody 🙃 next week then', tw: 376},
  {who: 'Ben · next day', text: 'sorry just saw this — are you guys\nstill at the mensa?', tw: 452, lines: 2},
];
/* (Lucas, 2026-10-05) each message now stays twice as long, so the thread is cut to
   the six that carry the story: the question, two screenshots, the confusion, the
   give-up, the late reply. */
const LAST = MSGS.length - 1;
const msgH = (m: M) => (m.who ? NAME_H + MGAP : 0) + (m.img ? imgH(m.img) + MGAP : 0) + bubbleH(m.lines ?? 1);
const msgW = (m: M) => Math.max(m.img ? IMG_W : 0, m.tw + 1.6 * BFS);
const isRight = (m: M) => !!(m.out || m.right);

export const OPEN = 12; // the opener appears, once the screen has woken from black
const MOVE = 46; // ...and travels to its place as message 1 arrives
const MOVE_LEN = 21;
/* Every message arrives one STEP after the last and stays for WINDOW steps,
   so they come AND go in the same increments (Lucas, 2026-10-05: with the
   page's height cap, the second message left the moment the third came). */
const STEP = 48;
const WINDOW = 3;
const ADDS = Array.from({length: LAST}, (_, k) => MOVE + k * STEP); // messages 1..LAST
const GLIDE = 22;
const POP_DELAY = 17; // a newcomer eases in once the column has all but glided
const GAP = 1.45 * (IMG_W / 24.7); // TGAP
/* the flood keeps whatever is on screen and only adds — nothing leaves after this */
export const FLOOD0 = ADDS[LAST - 1] + 12;
export const FLOOD1 = FLOOD0 + 72; // 21 arrivals, 40% further apart than the 26 before
export const SUCK = {INHALE: FLOOD1 + 2, SUCK0: FLOOD1 + 10, LEN: 20, PUFF: FLOOD1 + 32};

/* ── The column, precomputed: each event's layout and its rigid shift ───── */
type Layout = Map<number, number>; // message → top y
const EV: {t: number; g: number; D: number; L: Layout}[] = [];
const DROP = new Map<number, number>(); // message → event index it left at
(() => {
  let vis = [0];
  let prev: Layout | null = null;
  for (let k = 1; k <= LAST; k++) {
    vis.push(k);
    const total = (v: number[]) => v.reduce((s, i) => s + msgH(MSGS[i]), 0) + GAP * (v.length - 1);
    if (vis.length > WINDOW && ADDS[k - 1] < FLOOD0) {
      DROP.set(vis[0], k);
      vis = vis.slice(1);
    }
    const L: Layout = new Map();
    let y = CHAT_C[1] - total(vis) / 2;
    for (const i of vis) {
      L.set(i, y);
      y += msgH(MSGS[i]) + GAP;
    }
    let D = 0;
    if (prev) {
      const j = vis.find((i) => prev!.has(i) && i !== k);
      if (j !== undefined) D = prev.get(j)! - L.get(j)!;
    }
    EV[k] = {t: ADDS[k - 1], g: k === 1 ? MOVE_LEN : GLIDE, D, L};
    prev = L;
  }
})();
const glideE = Easing.bezier(0.45, 0, 0.2, 1);

/* the message's top y at frame f (alive messages), or null */
const colY = (i: number, f: number): number | null => {
  const a = Math.max(1, i); // the event it joined at (the opener joins at 1)
  if (f < EV[a].t) return null;
  let K = a;
  for (let k = a; k <= LAST; k++) if (EV[k].t <= f) K = k;
  const d = DROP.get(i);
  if (d !== undefined && f >= EV[d].t) K = d - 1; // frozen where it stood
  const at = d !== undefined && f >= EV[d].t ? EV[d].t : f;
  let y = EV[K].L.get(i)!;
  for (let k = a; k <= K; k++) y += EV[k].D * (1 - glideE(clamp01((at - EV[k].t) / EV[k].g)));
  return y;
};
const COL_L = CHAT_C[0] - COL_W / 2 + COL_PAD;
const COL_R = CHAT_C[0] + COL_W / 2 - COL_PAD;
const colX = (m: M) => (isRight(m) ? COL_R - msgW(m) / 2 : COL_L + msgW(m) / 2);

/* ── The flood: new messages pile up AROUND the chat that is still there ── */
const FLOOD_TEXT = [
  "who's free at 12??", 'mensa?', "can't read these", 'wait which week', "i'm free 14:00–14:30", 'lunch??', 'anyone?',
  "my break's at 11", 'what about 15:30?', "i'm in class till 1", 'send yours again', 'which room?', 'where are you guys',
  'ok nvm', 'is it A or B week', '😩', 'free after 4', 'wait what', 'can we just pick a time', 'ben??', 'tomorrow?',
  "i'm at the library", "who's still on campus", 'zoom in pls', 'hold on', "can't, lab till 3",
];
const WHO = ['Ben', 'Anna', 'Sophia', 'Jonas', 'Mila', 'Theo'];
// a different screenshot every time — no repeats
const IMGS: ImgId[] = ['tt-flood-jonas', 'tt-flood-mila', 'tt-flood-theo', 'tt-flood-anna', 'tt-flood-paul', 'tt-flood-emil', 'tt-flood-nina'];
type FloodItem = {x: number; y: number; rot: number; k: number; t: number; m: M};
/* Where the flood lands: a grid over a region of the stage, minus the cells the
   chat column sits in. The film's own frame: 7 x 5 over 1920 x 1080, the
   middle 3 x 3 out. The VERTICAL cut sees only stage x 420–1500, y -135–1215
   (its 1080 x 1350 frame), where the column spans nearly the whole width: 4 x 7
   there, the middle 2 x 3 out, so the pile-up fills above and below the chat. */
type FloodGrid = {x0: number; y0: number; w: number; h: number; cols: number; rows: number; hole: [number, number, number, number]};
const GRID_H: FloodGrid = {x0: 0, y0: 0, w: W, h: H, cols: 7, rows: 5, hole: [2, 4, 1, 3]};
const GRID_V: FloodGrid = {x0: 420, y0: -135, w: 1080, h: 1350, cols: 4, rows: 7, hole: [1, 2, 2, 4]};
const makeFlood = (g: FloodGrid): FloodItem[] => {
  const {cols, rows} = g;
  const [c0, c1, r0, r1] = g.hole;
  const cells = Array.from({length: cols * rows}, (_, i) => i).filter((c) => {
    const col = c % cols;
    const row = Math.floor(c / cols);
    return !(col >= c0 && col <= c1 && row >= r0 && row <= r1);
  });
  cells.sort((a, b) => rnd(a * 7 + 3) - rnd(b * 7 + 3)); // a fixed shuffle
  const N = 21; // a fifth fewer than the 26 cells
  return cells.slice(0, N).map((c, i) => {
    const col = c % cols;
    const row = Math.floor(c / cols);
    const img = i % 3 === 1;
    const txt = FLOOD_TEXT[i % FLOOD_TEXT.length];
    const out = !img && rnd(i * 13 + 1) < 0.3;
    const m: M = img
      ? {img: IMGS[Math.floor(i / 3) % IMGS.length], text: ['look', 'mine', 'this one'][i % 3], tw: [62, 66, 108][i % 3], who: WHO[i % WHO.length], right: rnd(i) < 0.5}
      : {text: txt, tw: txt.length * 15.2, out, who: out ? undefined : rnd(i * 5) < 0.6 ? WHO[(i * 3) % WHO.length] : undefined, right: !out && rnd(i * 9) < 0.35};
    return {
      x: g.x0 + (col + 0.5) * (g.w / cols) + (rnd(i * 31 + 2) - 0.5) * 90,
      y: g.y0 + (row + 0.5) * (g.h / rows) + (rnd(i * 17 + 5) - 0.5) * 60,
      rot: (rnd(i * 23 + 9) - 0.5) * (img ? 12 : 8),
      k: img ? 0.56 + 0.18 * rnd(i * 3 + 1) : 0.85 + 0.3 * rnd(i * 3 + 2),
      // one after the other, quickening only a little
      t: FLOOD0 + (FLOOD1 - FLOOD0 - 8) * Math.pow(i / N, 0.85),
      m,
    };
  });
};
const FLOOD = makeFlood(GRID_H);
const FLOOD_V = makeFlood(GRID_V);

/* ── The pull: everything is drawn into the phone's screen ──────────────── */
const suckP = (f: number, seed: number) => {
  const d = 4 * rnd(seed * 11 + 7);
  return ease(f, SUCK.SUCK0 + d, SUCK.SUCK0 + d + SUCK.LEN, Easing.in(Easing.cubic));
};
const inhale = (f: number) => 0.035 * ease(f, SUCK.INHALE, SUCK.SUCK0, Easing.out(Easing.quad));
/* transform for an element centred at c0 (rotation r0°, scale k0) */
const sucked = (f: number, c0: [number, number], r0: number, k0: number, seed: number): {style: CSS; p: number} => {
  const p = suckP(f, seed);
  const inh = 1 + inhale(f);
  const vx = (c0[0] - CHAT_C[0]) * inh;
  const vy = (c0[1] - CHAT_C[1]) * inh;
  const r = Math.hypot(vx, vy) * (1 - p);
  const th = Math.atan2(vy, vx) + 0.35 * p * p; // a slight curve in, not a spiral
  const x = CHAT_C[0] + r * Math.cos(th);
  const y = CHAT_C[1] + r * Math.sin(th);
  const s = k0 * inh * Math.pow(1 - p, 1.25);
  return {
    p,
    style: {
      position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
      transform: `translate(${x}px, ${y}px) rotate(${r0 * (1 - p)}deg) scale(${Math.max(0.001, s)}) translate(-50%, -50%)`,
      opacity: 1 - ease(p, 0.5, 0.9), // gone before the screen starts to turn
    },
  };
};

/* a message's pop as it arrives (page: POP 560ms, cubic-bezier(.3,1.2,.5,1)) */
const popIn = (f: number, at: number, right: boolean): CSS => {
  const t = ease(f, at, at + 17, MSGPOP);
  return {
    opacity: clamp01(ease(f, at, at + 10)),
    transform: `translateY(${(1 - t) * 8}px) scale(${0.92 + 0.08 * t})`,
    transformOrigin: right ? '100% 100%' : '0 100%',
  };
};

export const chatElements = () => FLOOD.length;

/* A timetable section the phone's screen becomes, in this scene's coordinates. */
export type Block = {x: number; y: number; w: number; h: number; r: number; color: string};
/* the hand-over: the screen clears over CLEAR frames before MORPH0, splits and
   settles by MORPH1; the shapes stay until `until`, when the card covers them */
export const MORPH0 = SUCK.SUCK0 + 18;
export const MORPH1 = SUCK.PUFF + 18;
const CLEAR = 8;
/* The VERTICAL cut (Lucas, 2026-10-08): the phone's screen collapses into the
   sections in PARALLEL with the messages being pulled in, instead of after they
   are gone, and it lands on a damped spring — it overshoots the final shape once
   and recoils instead of just easing in. Same end frame (MORPH1) as the
   landscape cut, so every later timing is shared. */
export const MORPH0_V = SUCK.SUCK0 + 2;
/* damped spring from rest, 0 -> 1 over [0,1], first peak at ~60% of the span */
const SPRING_Z = 0.5;
const SPRING_W = Math.PI / (0.6 * Math.sqrt(1 - SPRING_Z * SPRING_Z)); // peak at u = 0.6
const springOut = (u: number) => {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const wd = SPRING_W * Math.sqrt(1 - SPRING_Z * SPRING_Z);
  return 1 - Math.exp(-SPRING_Z * SPRING_W * u) * (Math.cos(wd * u) + ((SPRING_Z * SPRING_W) / wd) * Math.sin(wd * u));
};

export const ChatScene: React.FC<{
  f: number;
  blocks: Block[];
  until: number;
  vertical?: boolean;
  /* the widest the 3x opener may be: the vertical frame is narrower than it */
  maxW?: number;
}> = ({f, blocks, until, vertical, maxW = Infinity}) => {
  const sucking = f >= SUCK.INHALE;
  const M0 = vertical ? MORPH0_V : MORPH0;
  const els: React.ReactNode[] = [];

  /* the opener's size: 3x, or as much as fits (the page's rule: min(3, width * .92 / bubble)) */
  const K0 = Math.min(3, maxW / msgW(MSGS[0]));
  /* the column */
  MSGS.forEach((m, i) => {
    const right = isRight(m);
    if (i === 0 && f < MOVE) {
      // the opener alone: 3x, set as layout (not scaled), centred on the screen —
      // in the same right-aligned box the move below starts from, so nothing jumps
      if (f < OPEN) return;
      const k = K0;
      const t = ease(f, OPEN, OPEN + 14, Easing.bezier(0.2, 0.9, 0.3, 1));
      els.push(
        <div key="m0" style={{position: 'absolute', left: CHAT_C[0] - BFS * k * 0.21, top: CHAT_C[1], transform: 'translate(-50%, -50%)'}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: msgW(m) * k, opacity: clamp01(t * 1.2), transform: `scale(${0.92 + 0.08 * t})`}}>
            <Message {...m} k={k} />
          </div>
        </div>,
      );
      return;
    }
    let y = colY(i, f);
    if (y === null) return;
    const h = msgH(m);
    let cx = colX(m);
    let k = 1;
    let cy = y + h / 2;
    if (i === 0 && f < MOVE + MOVE_LEN) {
      // FLIP: from the big centred bubble to its own place, type set at every size
      const t = ease(f, MOVE, MOVE + MOVE_LEN, Easing.bezier(0.5, 0, 0.2, 1));
      k = lerp(K0, 1, t);
      const tail = BFS * K0 * 0.21 * -1;
      cx = lerp(CHAT_C[0] + tail, cx, t);
      cy = lerp(CHAT_C[1], cy, t);
    }
    const d = DROP.get(i);
    const leaving = d !== undefined && f >= EV[d].t ? 1 - ease(f, EV[d].t, EV[d].t + 13, Easing.bezier(0.4, 0, 0.7, 1)) : 1;
    if (leaving <= 0) return;
    const a = Math.max(1, i);
    const popAt = i === 0 ? -1 : EV[a].t + POP_DELAY; // the same beat for every message
    const pop = popAt >= 0 ? popIn(f, popAt, right) : {};
    const s = sucking ? sucked(f, [cx, cy], 0, 1, i) : null;
    els.push(
      <div key={`m${i}`} style={s ? s.style : {position: 'absolute', left: cx, top: cy, transform: 'translate(-50%, -50%)'}}>
        <div style={{opacity: leaving, display: 'flex', flexDirection: 'column', alignItems: right ? 'flex-end' : 'flex-start', width: msgW(m) * k}}>
          <div style={pop}>
            <Message {...m} k={k} />
          </div>
        </div>
      </div>,
    );
  });

  /* the flood */
  (vertical ? FLOOD_V : FLOOD).forEach((it, i) => {
    if (f < it.t) return;
    const right = isRight(it.m);
    const t = ease(f, it.t, it.t + 12, MSGPOP);
    const s = sucking ? sucked(f, [it.x, it.y], it.rot, it.k, 100 + i) : null;
    els.push(
      <div key={`f${i}`} style={s ? s.style : {position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${it.x}px, ${it.y}px) rotate(${it.rot}deg) scale(${it.k}) translate(-50%, -50%)`}}>
        <div style={{opacity: clamp01(ease(f, it.t, it.t + 6)), transform: `scale(${0.8 + 0.2 * t})`, display: 'flex', flexDirection: 'column', alignItems: right ? 'flex-end' : 'flex-start'}}>
          <Message {...it.m} imgW={it.m.img ? IMG_W : undefined} />
        </div>
      </div>,
    );
  });

  /* the phone: a small gulp as the chat goes in, its screen clears, then the
     screen splits into the timetable's sections while the frame dissolves */
  const gulp = 1 + 0.03 * Math.sin(Math.PI * clamp01((f - SUCK.SUCK0 - 2) / 10));
  const scr = phoneScreen(CHAT_C[0], CHAT_C[1]);
  const clear = ease(f, M0 - CLEAR, M0, Easing.inOut(Easing.quad));
  const frameO = 1 - ease(f, M0, M0 + 12, Easing.in(Easing.quad));
  const frameS = 1 + 0.06 * ease(f, M0, M0 + 12, Easing.out(Easing.quad));
  const phoneBox: CSS = {position: 'absolute', left: CHAT_C[0] - PHONE_W / 2, top: CHAT_C[1] - PHONE_H / 2, width: PHONE_W, height: PHONE_H};
  // shape: a smooth ease, no overshoot (vertical: a spring that recoils once); colour: white to the sections' own by 60% of the move
  const mt = vertical ? springOut((f - M0) / (MORPH1 - M0)) : ease(f, MORPH0, MORPH1, Easing.bezier(0.65, 0, 0.35, 1));
  const ct = ease(f, M0, M0 + (MORPH1 - M0) * 0.6, Easing.inOut(Easing.quad));
  const total = blocks.reduce((a, b) => a + b.h, 0);
  let acc = 0;
  const parts = blocks.map((b, i) => {
    // at the start the sections tile the screen top to bottom (heights in proportion);
    // only the outer corners carry the screen's radius
    const h0 = (scr.h * b.h) / total;
    const y0 = scr.y + (scr.h * acc) / total;
    acc += b.h;
    const rt = Math.max(0, lerp(i === 0 ? scr.r : 0, b.r, mt));
    const rb = Math.max(0, lerp(i === blocks.length - 1 ? scr.r : 0, b.r, mt));
    return (
      <div
        key={`part${i}`}
        style={{
          position: 'absolute', left: lerp(scr.x, b.x, mt), top: lerp(y0, b.y, mt), width: lerp(scr.w, b.w, mt), height: lerp(h0, b.h, mt),
          borderRadius: `${rt}px ${rt}px ${rb}px ${rb}px`, background: mix('#FFFFFF', b.color, ct),
        }}
      />
    );
  });

  return (
    <>
      {f < M0 ? (
        <div style={{position: 'absolute', inset: 0, transform: `scale(${gulp})`, transformOrigin: `${CHAT_C[0]}px ${CHAT_C[1]}px`}}>
          <Phone cx={CHAT_C[0]} cy={CHAT_C[1]} black={1 - ease(f, 0, 10, Easing.out(Easing.quad))} noFrame />
          {clear > 0 ? <div style={{position: 'absolute', left: scr.x, top: scr.y, width: scr.w, height: scr.h, borderRadius: scr.r, background: '#fff', opacity: clear}} /> : null}
        </div>
      ) : null}
      {f >= M0 && f <= until ? parts : null}
      {frameO > 0 ? (
        <div style={{...phoneBox, transform: `scale(${(f < M0 ? gulp : 1) * frameS})`, opacity: frameO}}>
          <Img src={staticFile(PHONE_FRAME_SRC)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
        </div>
      ) : null}
      {els}
    </>
  );
};

