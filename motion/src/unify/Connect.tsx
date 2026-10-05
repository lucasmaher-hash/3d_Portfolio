import React from 'react';
import {Easing, Img, staticFile} from 'remotion';
import {Character} from './Character';
import {clamp01, CSS, DARK, NUNITO, PINK} from './lib';

/* ─────────────────────────────────────────────────────────────────────────
   "connect now" — the first card on the app's home screen (index.html +
   styles.css): a closed speech bubble that unfurls into the pink panel of
   friends on a break, each drifting on its own loop; tapping one opens the
   monster card ("break 11:15 - 12:45"). App px throughout.
   ───────────────────────────────────────────────────────────────────────── */

const u = (f: string) => staticFile(`unify/${f}`);

/* The drift loops from styles.css (@keyframes drift-*), as functions of time.
   Each segment is CSS `ease-in-out`; delays are the CSS ones (negative). */
type KF = [number, number, number, number][]; // [pct, x, y, scale]
const DRIFT: Record<string, {dur: number; delay: number; kf: KF}> = {
  Paul: {dur: 8, delay: -1.5, kf: [[0, 0, 0, 1], [33, 17, -13, 1.09], [66, -11, 11, 0.92], [100, 0, 0, 1]]},
  Nam: {dur: 9, delay: -6, kf: [[0, 0, 0, 1], [33, -6, 4, 1.05], [66, 4, -6, 0.95], [100, 0, 0, 1]]},
  Greg: {dur: 7.5, delay: -3, kf: [[0, 0, 0, 1], [33, 13, 10, 1.08], [66, -9, -7, 0.93], [100, 0, 0, 1]]},
  Yas: {dur: 8.5, delay: -9, kf: [[0, 0, 0, 1], [33, 6, -4, 0.95], [66, -4, 6, 1.05], [100, 0, 0, 1]]},
  Moritz: {dur: 8, delay: -4.5, kf: [[0, 0, 0, 1], [33, -13, -10, 1.08], [66, 9, 7, 0.93], [100, 0, 0, 1]]},
};
const cssEase = Easing.bezier(0.42, 0, 0.58, 1);
export const drift = (name: string, sec: number) => {
  const d = DRIFT[name];
  const t = ((((sec - d.delay) % d.dur) + d.dur) % d.dur) / d.dur * 100;
  for (let i = 0; i < d.kf.length - 1; i++) {
    const [a, ax, ay, as] = d.kf[i];
    const [b, bx, by, bs] = d.kf[i + 1];
    if (t >= a && t <= b) {
      const e = cssEase((t - a) / (b - a));
      return {x: ax + (bx - ax) * e, y: ay + (by - ay) * e, s: as + (bs - as) * e};
    }
  }
  return {x: 0, y: 0, s: 1};
};

/* index.html's five friends: box (left, top, w, h), figure size, name size */
export const FRIENDS5 = [
  {name: 'Paul', l: 14, t: 19, w: 66.6, h: 62.2, src: 'friend_paul.svg', fw: 46.8, fh: 29.3, fs: 17.8},
  {name: 'Nam', l: 128.75, t: 19, w: 94, h: 87.7, src: 'friend_nam.svg', fw: 66.6, fh: 49.6, fs: 25.1},
  {name: 'Greg', l: 51, t: 112, w: 66.6, h: 62.2, src: 'friend_greg.svg', fw: 47.2, fh: 30.7, fs: 17.8},
  {name: 'Yas', l: 193, t: 115, w: 89, h: 83, src: 'friend_yas.svg', fw: 55.2, fh: 50.8, fs: 23.7},
  {name: 'Moritz', l: 259, t: 57, w: 66.6, h: 62.2, src: 'friend_moritz.svg', fw: 43.5, fh: 32.6, fs: 17.8},
];

/* Panel metrics (styles.css .panel): padding 20/19/40, gap 12. The friends box
   starts below the header (49), the time row and two gaps. */
export const PANEL_W = 377;
export const PANEL_H = 347; // padding included; no face below it any more
const TIME_ROW_H = 26;
export const FRIENDS_TOP = 20 + 49 + 12 + TIME_ROW_H + 12;
export const FRIENDS_LEFT = 19; // the panel's own left padding

/* `open` 0→1: the app's own unfurl (.9s, cubic-bezier(.4,0,.2,1)) — the closed
   bubble folds away as the panel grows down out of it. `friendT(i)` 0→1 pops
   each friend in; `sec` drives the drift loops. `namHidden` hides the Nam in
   the panel (the camera follows the one in the monster card). */
export const ConnectCard: React.FC<{open: number; friendT: (i: number) => number; sec: number; hideNam?: boolean; contentO?: number; style?: CSS}> = ({open, friendT, sec, hideNam, contentO = 1, style}) => {
  const closedT = open; // 0 = closed visible
  return (
    <div style={{position: 'relative', width: PANEL_W, height: 72 + (PANEL_H - 72) * open, ...style}}>
      {/* closed: the speech bubble + label */}
      <div style={{position: 'absolute', top: 0, left: 0, width: PANEL_W, transformOrigin: 'top center', opacity: 1 - closedT, transform: `scaleY(${1 - 0.25 * closedT}) translateY(${-6 * closedT}px)`}}>
        {/* the app's card_bubble_pink.svg is this pill PLUS the lip bottom-right; the lip is left out (Lucas) */}
        <div style={{position: 'absolute', top: 0, left: 0, width: 377, height: 72, borderRadius: 36, background: PINK}} />
        <p style={{position: 'absolute', margin: 0, left: 15, top: 11, fontFamily: NUNITO, fontWeight: 800, fontSize: 48, lineHeight: '40px', color: DARK, whiteSpace: 'nowrap'}}>connect now</p>
      </div>
      {/* open: the panel */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, width: PANEL_W, boxSizing: 'border-box', padding: '20px 19px 40px',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, borderRadius: 43, background: PINK,
          transformOrigin: 'top center', opacity: open, transform: `scaleY(${0.75 + 0.25 * open}) translateY(${-6 * (1 - open)}px)`,
        }}
      >
        {/* contentO fades everything ON the panel while the panel itself stays (the dive) */}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, width: '100%', opacity: contentO}}>
          <p style={{margin: 0, fontFamily: NUNITO, fontWeight: 800, fontSize: 48, lineHeight: '40px', color: DARK}}>connect now</p>
          <div style={{width: '100%', height: 3, borderRadius: 1.5, background: DARK}} />
        </div>
        <div style={{display: 'flex', alignItems: 'center', width: '100%', height: TIME_ROW_H, opacity: contentO}}>
          <p style={{margin: 0, fontFamily: NUNITO, fontWeight: 800, fontSize: 19, color: DARK, whiteSpace: 'nowrap'}}>11:30 until 12:00</p>
        </div>
        <div style={{position: 'relative', width: '100%', height: 188, opacity: contentO}}>
          {FRIENDS5.map((f, i) => {
            const g = friendGeom(f, friendT(i), sec);
            return (
              <div key={f.name} style={{position: 'absolute', left: f.l, top: f.t, width: f.w, height: f.h, transform: g.transform, opacity: g.opacity}}>
                <div style={{position: 'absolute', left: (f.w - f.fw) / 2, top: g.figTop}}>
                  {f.name === 'Nam' ? (
                    hideNam ? null : <Character id="f6" width={f.fw} />
                  ) : (
                    <Img src={u(f.src)} style={{display: 'block', width: f.fw, height: f.fh}} />
                  )}
                </div>
                <p style={{position: 'absolute', left: -20, right: -20, bottom: 0, margin: 0, textAlign: 'center', fontFamily: NUNITO, fontWeight: 400, fontSize: f.fs, lineHeight: NAME_LH, color: DARK, whiteSpace: 'nowrap'}}>{f.name}</p>
              </div>
            );
          })}
        </div>
        {/* (the face — lip + arrow button poking out bottom-right — is left out, Lucas 2026-10-05) */}
      </div>
    </div>
  );
};

/* Each friend box is a flex column in the app (figure over name, pinned to the
   bottom); laid out explicitly here, with the name's line box at Nunito's own
   "normal" (ascender + descender = 1.364em), so the figure's centre is known
   exactly — the camera dives into Nam from it. */
const NAME_LH = 1.364;
type F5 = (typeof FRIENDS5)[number];
const friendGeom = (f: F5, t: number, sec: number) => {
  const d = drift(f.name, sec);
  const s = d.s * (0.6 + 0.4 * t);
  return {
    s, d,
    figTop: f.h - f.fs * NAME_LH - f.fh,
    transform: `translate(${d.x}px, ${d.y}px) scale(${s})`,
    opacity: clamp01(t * 1.5),
  };
};
/* where a friend's figure centre sits in panel px (drift and pop included), and its scale */
export const friendFigure = (name: string, t: number, sec: number) => {
  const f = FRIENDS5.find((x) => x.name === name)!;
  const g = friendGeom(f, t, sec);
  const cx = f.w / 2;
  const cy = g.figTop + f.fh / 2;
  // the box scales about its own centre, then the drift moves it
  return {
    x: FRIENDS_LEFT + f.l + f.w / 2 + (cx - f.w / 2) * g.s + g.d.x,
    y: FRIENDS_TOP + f.t + f.h / 2 + (cy - f.h / 2) * g.s + g.d.y,
    s: g.s,
    fw: f.fw,
  };
};

/* The monster card a friend opens (styles.css .home-monster-card): pink pill,
   figure + name | divider | "break" + their break. Fixed layout so the camera
   can find the figure: figure box at (13,16), 61 x 46. */
export const MC = {w: 322, h: 138, figX: 13, figY: 16, figW: 61, figH: 46};
/* index.html's data-break per friend */
export const BREAKS: Record<string, string> = {Paul: '11:00 - 12:30', Nam: '11:15 - 12:45', Greg: '11:30 - 13:00', Yas: '11:00 - 12:15', Moritz: '11:45 - 13:00'};
export const MonsterCard: React.FC<{name: string; t: number; fade?: number; style?: CSS}> = ({name, t, fade = 1, style}) => {
  const f = FRIENDS5.find((x) => x.name === name)!;
  // the figure is contained in the card's 61 x 46 box (object-fit: contain)
  const k = Math.min(MC.figW / f.fw, MC.figH / f.fh);
  return (
    <div
      style={{
        position: 'relative', width: MC.w, height: MC.h, borderRadius: 31, boxSizing: 'border-box',
        opacity: clamp01(t * 1.6), transform: `scale(${0.85 + 0.15 * t})`, ...style,
      }}
    >
      <div style={{position: 'absolute', inset: 0, borderRadius: 31, background: PINK, opacity: fade}} />
      <div style={{position: 'absolute', left: MC.figX, top: MC.figY, width: MC.figW, height: MC.figH, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: fade}}>
        {name === 'Nam' ? <Character id="f6" width={f.fw * k} /> : <Img src={u(f.src)} style={{display: 'block', width: f.fw * k, height: f.fh * k}} />}
      </div>
      <p style={{position: 'absolute', left: MC.figX, top: MC.figY + MC.figH + 8, margin: 0, fontFamily: NUNITO, fontWeight: 800, fontSize: 28, color: DARK, opacity: fade}}>{name}</p>
      <div style={{position: 'absolute', left: 13 + 61 + 19, top: 16, width: 4, height: MC.h - 32, borderRadius: 2, background: DARK, opacity: fade}} />
      <p style={{position: 'absolute', left: 13 + 61 + 19 + 4 + 19, top: 0, height: MC.h, margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: NUNITO, fontWeight: 700, fontSize: 24, lineHeight: 1.35, color: DARK, opacity: fade}}>
        <span>break</span>
        <span>{BREAKS[name]}</span>
      </p>
    </div>
  );
};
