import React from 'react';
import {Easing} from 'remotion';
import {BFS, bubbleH, COL_PAD, COL_W, IMG_W, ImgId, imgH, Message, MGAP, NAME_H, Phone} from './Chat';
import {clamp01, CREAM, CSS, ease, H, lerp, MSGPOP, PINK, rnd, sp, W} from './lib';

/* ─────────────────────────────────────────────────────────────────────────
   Scene 1 — the group chat (the case-study page's Problem animation, made
   deterministic), the flood, and the suck into the shared timetable.

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
const FLOOD: FloodItem[] = (() => {
  // a 7 x 5 grid over the frame, minus the 3 x 3 cells the chat column sits in
  const cols = 7;
  const rows = 5;
  const cells = Array.from({length: cols * rows}, (_, i) => i).filter((c) => {
    const col = c % cols;
    const row = Math.floor(c / cols);
    return !(col >= 2 && col <= 4 && row >= 1 && row <= 3);
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
      x: (col + 0.5) * (W / cols) + (rnd(i * 31 + 2) - 0.5) * 90,
      y: (row + 0.5) * (H / rows) + (rnd(i * 17 + 5) - 0.5) * 60,
      rot: (rnd(i * 23 + 9) - 0.5) * (img ? 12 : 8),
      k: img ? 0.56 + 0.18 * rnd(i * 3 + 1) : 0.85 + 0.3 * rnd(i * 3 + 2),
      // one after the other, quickening only a little
      t: FLOOD0 + (FLOOD1 - FLOOD0 - 8) * Math.pow(i / N, 0.85),
      m,
    };
  });
})();

/* ── The suck: everything spirals into the middle ──────────────────────── */
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
  const th = Math.atan2(vy, vx) + 1.15 * p * p;
  const x = CHAT_C[0] + r * Math.cos(th);
  const y = CHAT_C[1] + r * Math.sin(th);
  const s = k0 * inh * Math.pow(1 - p, 1.25);
  return {
    p,
    style: {
      position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
      transform: `translate(${x}px, ${y}px) rotate(${r0 + 70 * p * p}deg) scale(${Math.max(0.001, s)}) translate(-50%, -50%)`,
      opacity: 1 - ease(p, 0.8, 1),
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

export const ChatScene: React.FC<{
  f: number;
  cardBox: {x: number; y: number; w: number; h: number; r: number};
  cardIn: [number, number];
}> = ({f, cardBox, cardIn}) => {
  const sucking = f >= SUCK.INHALE;
  const phone = sucked(f, CHAT_C, 0, 1, 999);
  const els: React.ReactNode[] = [];

  /* the column */
  MSGS.forEach((m, i) => {
    const right = isRight(m);
    if (i === 0 && f < MOVE) {
      // the opener alone: 3x, set as layout (not scaled), centred on the screen —
      // in the same right-aligned box the move below starts from, so nothing jumps
      if (f < OPEN) return;
      const k = 3;
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
      k = lerp(3, 1, t);
      const tail = BFS * 3 * 0.21 * -1;
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
  FLOOD.forEach((it, i) => {
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

  /* the blob, the puff, the morph into the card */
  const P = SUCK.PUFF;
  // the blob gathers as the chat arrives, then gives one fat pulse — the puff
  const bump = Math.sin(Math.PI * clamp01((f - P + 3) / 9));
  const R = 74 * ease(f, SUCK.SUCK0 + 12, P + 2, Easing.out(Easing.cubic)) * (1 + 0.32 * bump);
  const morph = f < P + 4 ? 0 : sp(f, P + 4, 'soft');
  // the silhouette holds until the card is mostly in, so the two never wash each other out
  const silhouetteO = 1 - ease(f, cardIn[0] + 6, cardIn[1] + 2);
  const blob: React.ReactNode[] = [];
  if (R > 0 && silhouetteO > 0) {
    if (morph <= 0) {
      const pts: string[] = [];
      for (let j = 0; j <= 48; j++) {
        const a = (j / 48) * Math.PI * 2;
        const rr = R * (1 + 0.07 * Math.sin(6 * a + f * 0.45) + 0.04 * Math.sin(3 * a - f * 0.3));
        pts.push(`${(CHAT_C[0] + rr * Math.cos(a)).toFixed(1)},${(CHAT_C[1] + rr * Math.sin(a)).toFixed(1)}`);
      }
      blob.push(
        <svg key="blob" width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <polygon points={pts.join(' ')} fill={PINK} />
        </svg>,
      );
    } else {
      const x = lerp(CHAT_C[0] - R, cardBox.x, morph);
      const y = lerp(CHAT_C[1] - R, cardBox.y, morph);
      const w = lerp(2 * R, cardBox.w, morph);
      const h = lerp(2 * R, cardBox.h, morph);
      const r = lerp(R, cardBox.r, clamp01(morph));
      blob.push(<div key="sil" style={{position: 'absolute', left: x, top: y, width: Math.max(0, w), height: Math.max(0, h), borderRadius: r, background: PINK, opacity: silhouetteO}} />);
    }
  }
  const puffT = ease(f, P, P + 18, Easing.out(Easing.cubic));
  if (f >= P && puffT < 1) {
    for (let j = 0; j < 16; j++) {
      const a = (j / 16) * Math.PI * 2 + rnd(j + 40) * 0.5;
      const dist = 60 + (190 + 140 * rnd(j + 50)) * puffT;
      const rr = (26 + 30 * rnd(j + 60)) * (1 - puffT) + 1;
      blob.push(
        <div
          key={`p${j}`}
          style={{
            position: 'absolute', left: CHAT_C[0] + dist * Math.cos(a) - rr, top: CHAT_C[1] + dist * Math.sin(a) - rr,
            width: rr * 2, height: rr * 2, borderRadius: '50%', background: j % 3 === 2 ? CREAM : PINK, opacity: 1 - puffT * puffT,
          }}
        />,
      );
    }
  }

  return (
    <>
      {phone.p < 1 ? (
        <div style={phone.style}>
          <Phone cx={0} cy={0} black={1 - ease(f, 0, 10, Easing.out(Easing.quad))} />
        </div>
      ) : null}
      {els}
      {blob}
    </>
  );
};
