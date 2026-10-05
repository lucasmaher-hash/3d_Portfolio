import React from 'react';
import {Easing, interpolate, spring} from 'remotion';

/* ─────────────────────────────────────────────────────────────────────────
   Unify promo — shared tokens and timing helpers.

   Colours, type and every metric come from the vibe-coded app itself
   (~/TEMP/Unify/web: styles.css, stundenplan.css, map.css). App px are the
   app's own CSS px on its 402-wide screen; each scene scales them up.
   ───────────────────────────────────────────────────────────────────────── */

export const FPS = 30;
export const W = 1920;
export const H = 1080;

export const PINK = '#FF88C8';
export const DARK = '#292925';
export const CREAM = '#F9F2EB';
export const WALL = '#938E87';

export const NUNITO = '"Nunito", system-ui, sans-serif';
export const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export type CSS = React.CSSProperties;

/* The page hero's TALL cut (as the to.morrow film's): the same film with
   ExtTop px of canvas above the frame, so on the page it can run up under the
   nav. Nothing is placed there; every full-frame ground reaches up by it
   (fullBg) and the cameras simply see more above. 0 = the plain 16:9 film. */
export const ExtTop = React.createContext(0);
/* Full-frame grounds also overshoot the frame by BLEED on every side: the 3:2
   tile cut shows the film at 0.9 (UnifyPromoTile), so a little of the world
   past the 1920x1080 frame comes into view there. In the other cuts the
   overshoot lies outside the composition and is clipped. */
export const BLEED = 160;
export const fullBg = (ext: number, extra?: React.CSSProperties): React.CSSProperties => ({position: 'absolute', left: -BLEED, top: -ext - BLEED, width: 1920 + 2 * BLEED, height: 1080 + ext + 2 * BLEED, ...extra});

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* 0→1 between frames a and b, eased. */
export const ease = (f: number, a: number, b: number, e: (t: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], {easing: e, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/* The app's own curve: cubic-bezier(.4,0,.2,1) — every card open/close and
   day slide in styles.css / stundenplan.css runs on it. */
export const APP = Easing.bezier(0.4, 0, 0.2, 1);
/* The monster card's pop: cubic-bezier(.34,1.56,.64,1) (overshoots). */
export const POPB = Easing.bezier(0.34, 1.56, 0.64, 1);
/* The chat's message pop on the case-study page: cubic-bezier(.3,1.2,.5,1). */
export const MSGPOP = Easing.bezier(0.3, 1.2, 0.5, 1);

export const SPR = {
  snappy: {mass: 1, stiffness: 420, damping: 26},
  soft: {mass: 1, stiffness: 170, damping: 20},
  bouncy: {mass: 1, stiffness: 260, damping: 14},
  settle: {mass: 1, stiffness: 120, damping: 22},
};
export const sp = (f: number, start: number, k: keyof typeof SPR) => (f < start ? 0 : spring({frame: f - start, fps: FPS, config: SPR[k]}));

/* Hex colour mix, t = 0 → a, 1 → b. */
export const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp01(t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/* Deterministic pseudo-random in [0,1) from an integer seed. */
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* Words that rise into place (the to.morrow film's Rise, on Nunito). Words
   leave the same way they came, falling away blurred, when `out` is given. */
export const wordAnim = (f: number, start: number, out?: number) => {
  const s = sp(f, start, 'soft');
  const o = out === undefined ? 0 : ease(f, out, out + 10, Easing.in(Easing.cubic));
  return {
    opacity: clamp01(s * 1.3) * (1 - o),
    transform: `translateY(${(1 - s) * 44 - o * 30}px)`,
    filter: `blur(${(1 - clamp01(s)) * 8 + o * 6}px)`,
  } as CSS;
};
