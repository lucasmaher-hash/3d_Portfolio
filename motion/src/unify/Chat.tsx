import React from 'react';
import {Img, staticFile} from 'remotion';
import {CSS, SF} from './lib';

/* ─────────────────────────────────────────────────────────────────────────
   The group chat — ported from the case-study page's Problem section
   (public/unify2d1.html, .imsg-*): an empty iMessage thread on an iPhone 17,
   and the conversation lifted off it, wider than the phone. The page sizes
   the phone UI in cqi of the phone and the lifted messages in cqw of a 16:9
   stage; here both become px through the phone's own width.
   ───────────────────────────────────────────────────────────────────────── */

export const PHONE_H = 1000;
const FK = PHONE_H / 1808; // iphone-17-frame.png is 876 x 1808
export const PHONE_W = 876 * FK;
/* the screen hole, as a share of the frame (page: .phone-shot-screen) */
const SCR = {top: 0.015487, left: 0.038813, w: 0.922374, h: 0.969027};
export const SCREEN_H = PHONE_H * SCR.h;
export const SCREEN_W = PHONE_W * SCR.w;

/* One page "cqw" of the 16:9 stage, kept in proportion to the phone: the
   page's phone is 27cqw wide. */
export const CQW = PHONE_W / 27;

export const BUBBLE_IN = '#E9E9EB';
export const BUBBLE_OUT = '#0A7CFF';

export const BFS = 1.72 * CQW; // bubble font size
export const NFS = 1.24 * CQW; // sender name size
export const MGAP = 0.45 * CQW; // gap inside a message
export const TGAP = 1.45 * CQW; // gap between messages
export const IMG_W = 24.7 * CQW;
export const COL_W = 54 * CQW;
export const COL_PAD = 1.3 * CQW;
const LH = 1.3;
export const NAME_H = NFS * 1.2;
export const bubbleH = (lines: number) => BFS * LH * lines + BFS * 0.9;

export const IMGS = {
  'tt-ben': [1800, 848], 'tt-sophia': [1800, 864], 'tt-me': [1800, 960],
  // the flood's own screenshots (motion/unify-tt-source.html): every student's app is a different one
  'tt-flood-jonas': [1800, 1040], 'tt-flood-mila': [1800, 735], 'tt-flood-theo': [1800, 968], 'tt-flood-anna': [1800, 782],
  'tt-flood-paul': [1800, 866], 'tt-flood-emil': [1800, 888], 'tt-flood-nina': [1800, 718],
} as const;
export type ImgId = keyof typeof IMGS;
export const imgH = (id: ImgId, w = IMG_W) => (w * IMGS[id][1]) / IMGS[id][0];

/* The bubble tail: a mask in the bubble's own colour (page: .b.tail::before). */
const TAIL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M20 0C20 9 14 16 0 19.6C7 20.4 15 19.6 20 16Z'/%3E%3C/svg%3E")`;

export const Bubble: React.FC<{text: string; out?: boolean; right?: boolean; fs?: number; style?: CSS}> = ({text, out, right, fs = BFS, style}) => {
  const bg = out ? BUBBLE_OUT : BUBBLE_IN;
  const flip = out || right;
  return (
    <p
      style={{
        position: 'relative', margin: 0, width: 'max-content', whiteSpace: 'pre',
        padding: '.45em .8em', borderRadius: '1.1em', background: bg, color: out ? '#fff' : '#000',
        fontFamily: SF, fontSize: fs, lineHeight: LH, letterSpacing: '-.01em',
        boxShadow: `0 ${0.5 * CQW}px ${1.4 * CQW}px rgba(60,60,90,.16)`, ...style,
      }}
    >
      <span
        style={{
          position: 'absolute', bottom: 0, width: '1.15em', height: '1.25em', background: bg,
          WebkitMaskImage: TAIL, maskImage: TAIL, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat',
          ...(flip ? {right: '-.42em', transform: 'scaleX(-1)'} : {left: '-.42em'}),
        }}
      />
      {text}
    </p>
  );
};

/* A whole message: sender, an optional timetable screenshot, the bubble. */
export const Message: React.FC<{who?: string; img?: ImgId; text: string; out?: boolean; right?: boolean; k?: number; imgW?: number}> = ({who, img, text, out, right, k = 1, imgW = IMG_W}) => {
  const side = out || right;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: side ? 'flex-end' : 'flex-start', gap: MGAP * k}}>
      {who ? (
        <span style={{fontFamily: SF, fontSize: NFS * k, lineHeight: 1.2, color: '#8E8E93', padding: side ? `0 .9em 0 0` : `0 0 0 .9em`, whiteSpace: 'nowrap'}}>{who}</span>
      ) : null}
      {img ? (
        <Img
          src={staticFile(`unify/${img}.webp`)}
          style={{display: 'block', width: imgW * k, height: imgH(img, imgW) * k, borderRadius: 1.8 * CQW * k, border: '1px solid rgba(0,0,0,.08)', boxShadow: `0 ${0.5 * CQW}px ${1.4 * CQW}px rgba(60,60,90,.16)`}}
        />
      ) : null}
      <Bubble text={text} out={out} right={right} fs={BFS * k} />
    </div>
  );
};

/* ── The phone: iPhone 17 frame over an empty "HM Group" thread ─────────── */
const StatusIcons: React.FC<{u: number}> = ({u}) => (
  <span style={{display: 'flex', alignItems: 'center', gap: 1.5 * u}}>
    <svg viewBox="0 0 18 12" style={{height: 3 * u, display: 'block', fill: 'currentColor'}}>
      <rect x="0" y="8.2" width="3.2" height="3.8" rx=".9" /><rect x="4.9" y="5.8" width="3.2" height="6.2" rx=".9" />
      <rect x="9.8" y="3.2" width="3.2" height="8.8" rx=".9" /><rect x="14.7" y="0" width="3.2" height="12" rx=".9" />
    </svg>
    <svg viewBox="-.5 -.5 17 13" stroke="currentColor" strokeWidth=".7" strokeLinejoin="round" style={{height: 3 * u, display: 'block', fill: 'currentColor'}}>
      <path d="M.22 3.72A11 11 0 0 1 15.78 3.72L13.94 5.56A8.4 8.4 0 0 0 2.06 5.56Z" />
      <path d="M3.05 6.55A7 7 0 0 1 12.95 6.55L11.11 8.39A4.4 4.4 0 0 0 4.89 8.39Z" />
      <path d="M8 11.5L5.88 9.38A3 3 0 0 1 10.12 9.38Z" />
    </svg>
    <svg viewBox="0 0 27 12" style={{height: 3.1 * u, display: 'block', fill: 'currentColor'}}>
      <rect x=".5" y=".5" width="23" height="11" rx="3.4" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <rect x="2.2" y="2.2" width="16.5" height="7.6" rx="2" />
      <path d="M25 4.1v3.8c.8-.3 1.3-1 1.3-1.9S25.8 4.4 25 4.1Z" fillOpacity=".4" />
    </svg>
  </span>
);

/* `black` darkens the screen (the film's last frames end on a black phone; the first wake it) */
/* The phone's screen hole as a box, for a phone centred on (cx, cy): r is its corner radius. */
export const phoneScreen = (cx: number, cy: number) => ({
  x: cx - PHONE_W / 2 + SCR.left * PHONE_W, y: cy - PHONE_H / 2 + SCR.top * PHONE_H,
  w: SCR.w * PHONE_W, h: SCR.h * PHONE_H, r: 0.160891 * SCR.w * PHONE_W,
});
export const PHONE_FRAME_SRC = 'unify/iphone-17-frame.png';

export const Phone: React.FC<{cx: number; cy: number; black?: number; style?: CSS; noFrame?: boolean}> = ({cx, cy, black = 0, style, noFrame}) => {
  const u = PHONE_W / 100;
  const bar = '#F7F7F8';
  return (
    <div style={{position: 'absolute', left: cx - PHONE_W / 2, top: cy - PHONE_H / 2, width: PHONE_W, height: PHONE_H, ...style}}>
      <div style={{position: 'absolute', top: `${SCR.top * 100}%`, left: `${SCR.left * 100}%`, width: `${SCR.w * 100}%`, height: `${SCR.h * 100}%`, borderRadius: '16.0891% / 7.4201%', overflow: 'hidden', isolation: 'isolate'}}>
        <div style={{position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: SF, color: '#000'}}>
          <div style={{flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${4.4 * u}px ${7.5 * u}px 0 ${11.5 * u}px`, height: 11.5 * u, background: bar, fontSize: 4.3 * u, fontWeight: 600, letterSpacing: '-.01em', boxSizing: 'content-box'}}>
            <span>9:12</span>
            <StatusIcons u={u} />
          </div>
          <div style={{flex: 'none', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: `${1 * u}px 0 ${2.6 * u}px`, background: bar, borderBottom: `${0.3 * u}px solid rgba(0,0,0,.1)`}}>
            <span style={{position: 'absolute', left: 4 * u, top: 2 * u, fontSize: 10 * u, lineHeight: 1, color: BUBBLE_OUT, fontWeight: 300}}>‹</span>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.9 * u}}>
              <div style={{display: 'flex'}}>
                {['B', 'A', 'S'].map((l, i) => (
                  <span
                    key={l}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 9 * u, height: 9 * u, borderRadius: '50%',
                      border: `${0.5 * u}px solid ${bar}`, background: 'linear-gradient(#A5ABB8, #848993)', color: '#fff', fontSize: 4 * u, fontWeight: 600,
                      marginLeft: i ? -3 * u : 0, boxSizing: 'content-box',
                    }}
                  >
                    {l}
                  </span>
                ))}
              </div>
              <span style={{fontSize: 3.3 * u}}>HM Group ›</span>
            </div>
          </div>
          <div style={{flex: '1 1 0', position: 'relative'}}>
            <div style={{position: 'absolute', top: 4 * u, left: 0, right: 0, textAlign: 'center', fontSize: 2.9 * u, color: '#8A8A8E'}}>
              <b style={{fontWeight: 600}}>Today</b> 09:12
            </div>
          </div>
          <div style={{flex: 'none', display: 'flex', alignItems: 'center', gap: 2.4 * u, padding: `${2 * u}px ${4 * u}px ${9 * u}px`}}>
            <span style={{flex: 'none', width: 8 * u, height: 8 * u, borderRadius: '50%', background: BUBBLE_IN, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C7C80'}}>
              <svg viewBox="0 0 12 12" style={{width: 4.2 * u, height: 4.2 * u, display: 'block'}}>
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span style={{flex: 1, border: `${0.3 * u}px solid #D1D1D6`, borderRadius: 99, padding: `${1.6 * u}px ${3.4 * u}px`, fontSize: 3.9 * u, color: '#B6B6BB'}}>iMessage</span>
          </div>
        </div>
      </div>
      {black > 0 ? <ScreenHole style={{background: '#000', opacity: black}} /> : null}
      {noFrame ? null : <Img src={staticFile(PHONE_FRAME_SRC)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />}
    </div>
  );
};

/* The phone's screen hole, as a box in the phone's own frame. */
const ScreenHole: React.FC<{style?: CSS; children?: React.ReactNode}> = ({style, children}) => (
  <div style={{position: 'absolute', top: `${SCR.top * 100}%`, left: `${SCR.left * 100}%`, width: `${SCR.w * 100}%`, height: `${SCR.h * 100}%`, borderRadius: '16.0891% / 7.4201%', ...style}}>
    {children}
  </div>
);

/* The ending: the same phone FRAME, scaled `k` times about the frame's middle,
   with the dark ground everywhere outside its screen hole — whatever is behind
   (the map) shows only through the hole. At k = 1 it is exactly the opening
   phone. `screen` is drawn ON the glass (SCREEN_W x SCREEN_H px, clipped to
   the hole), so it scales with the frame. `black` fades the hole to black. */
export const PhoneFrameClose: React.FC<{k: number; black: number; ground: string; screen?: React.ReactNode}> = ({k, black, ground, screen}) => (
  <div style={{position: 'absolute', left: 1920 / 2 - PHONE_W / 2, top: 1080 / 2 - PHONE_H / 2, width: PHONE_W, height: PHONE_H, transform: `scale(${k})`, transformOrigin: '50% 50%'}}>
    <ScreenHole style={{boxShadow: `0 0 0 3000px ${ground}`}} />
    {screen ? <ScreenHole style={{overflow: 'hidden'}}>{screen}</ScreenHole> : null}
    {black > 0 ? <ScreenHole style={{background: '#000', opacity: black}} /> : null}
    <Img src={staticFile('unify/iphone-17-frame.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
  </div>
);
