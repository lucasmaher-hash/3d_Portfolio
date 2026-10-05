import React from 'react';
import CHARS from './chars.json';
import {CSS, DARK} from './lib';

/* The app's monster characters ("figur" in the Figma file), drawn from their
   own SVG geometry: one body path plus an eye group ("Augen") of whites and
   pupils. Extracted from ~/TEMP/Unify/web/assets/figur_*.svg and
   friend_monster_9.svg (see chars.json).

   `eyes` swaps in ANOTHER character's eye group, fitted to this body's own eye
   box (same width, same centre) — that is what the customize beat cycles. */

type Part = {tag: string; role: 'white' | 'pupil'; fill: string; [k: string]: string};
type Char = {src: string; vb: number[]; body: {d: string; bb: number[]}; eyes: {bb: number[]; parts: Part[]}};
const DATA = CHARS as unknown as Record<string, Char>;
export type CharId = keyof typeof CHARS;
export const CHAR_IDS = Object.keys(DATA) as CharId[];

const ATTRS = ['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'd', 'transform'];

const Eyes: React.FC<{c: Char; pupil: [number, number]}> = ({c, pupil}) => (
  <>
    {c.eyes.parts.map((p, i) => {
      const props: Record<string, string | number> = {fill: p.fill};
      for (const a of ATTRS) if (p[a] !== undefined) props[a] = p[a];
      if (p.role === 'pupil') props.transform = `translate(${pupil[0]} ${pupil[1]})`;
      return React.createElement(p.tag, {key: i, ...props});
    })}
  </>
);

/* `width` is the rendered width of the character's viewBox in px. `pupil` moves
   the pupils by that many viewBox units (a glance). */
export const Character: React.FC<{
  id: CharId;
  width: number;
  body?: string;
  eyes?: CharId;
  pupil?: [number, number];
  style?: CSS;
}> = ({id, width, body = DARK, eyes, pupil = [0, 0], style}) => {
  const c = DATA[id];
  const [, , vw, vh] = c.vb;
  let eyeNode: React.ReactNode = <Eyes c={c} pupil={pupil} />;
  if (eyes && eyes !== id) {
    const e = DATA[eyes];
    const [tx, ty, tw, th] = c.eyes.bb;
    const [sx, sy, sw, sh] = e.eyes.bb;
    const k = tw / sw;
    // centre the borrowed eye box on this body's own eye box
    const dx = tx + tw / 2 - (sx + sw / 2) * k;
    const dy = ty + th / 2 - (sy + sh / 2) * k;
    eyeNode = (
      <g transform={`translate(${dx} ${dy}) scale(${k})`}>
        <Eyes c={e} pupil={[pupil[0] / k, pupil[1] / k]} />
      </g>
    );
  }
  return (
    <svg width={width} height={(width * vh) / vw} viewBox={c.vb.join(' ')} style={{display: 'block', overflow: 'visible', ...style}}>
      <path d={c.body.d} fill={body} />
      {eyeNode}
    </svg>
  );
};

/* Size helpers: how wide a character renders when its BODY should be `w` px. */
export const charAspect = (id: CharId) => DATA[id].vb[3] / DATA[id].vb[2];
export const bodyBox = (id: CharId) => DATA[id].body.bb;
export const viewBox = (id: CharId) => DATA[id].vb;
