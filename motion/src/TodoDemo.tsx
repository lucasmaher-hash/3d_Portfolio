/* "Das Problem" motion graphic: 30 tasks glide into a Today list from the right.
   Plain rounded frame (the page rounds the video's corners), no phone. */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

export const TODO_W = 1440;
export const TODO_H = 900;
const TASKS = [
  'Mail an Frau Keller', 'Steuerunterlagen sortieren', 'Zahnarzt anrufen', 'Paket abholen', 'Wäsche waschen',
  'Geschenk für Mama', 'Präsentation fertigstellen', 'Miete überweisen', 'Milch und Brot kaufen', 'Kabel bestellen',
  'Fahrrad reparieren', 'Buch zurückbringen', 'Flug buchen', 'Stromrechnung prüfen', 'Lisa zurückrufen',
  'Wohnung putzen', 'Pflanzen gießen', 'Rezept einlösen', 'Fotos drucken', 'Passwort ändern',
  'Backup machen', 'Termin verschieben', 'Versicherung kündigen', 'Skript lesen', 'Sport einplanen',
  'Blumen kaufen', 'Mittagessen planen', 'Reisepass verlängern', 'Auto zur Inspektion', 'Zeitung abbestellen',
];
const N = TASKS.length;
const ADD = 270, HOLD = 48, FADE = 18, GAP = 12;
export const TODO_DURATION = ADD + HOLD + FADE + GAP;

const ROW = 84, HEAD = 190;
const COL = 640;                                     // list column width
const VIEW = TODO_H - HEAD;
const MID = VIEW * 0.5;
const SLIDE = Easing.bezier(0.22, 1, 0.36, 1);       // long, soft landing (sideways)
const RISE = Easing.bezier(0.16, 1, 0.3, 1);         // arrives earlier (from below), so the path bends in
const FILL = Easing.bezier(0.45, 0, 0.55, 1);        // gentle in/out for the arrival pace
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const PAGE = '#cdd0d9', PANEL = '#e3edfa', CARD = '#c9dcf3';

const Row: React.FC<{t: string; p: number}> = ({t, p}) => {
  const x = (1 - SLIDE(p)) * 620, y = (1 - RISE(p)) * 300;
  return (
    <div style={{height: ROW, padding: '6px 0', boxSizing: 'border-box', opacity: clamp01(p * 2.5), transform: `translate(${x}px, ${y}px)`}}>
      <div style={{height: '100%', background: CARD, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, fontSize: 32, position: 'relative'}}>
        <i style={{flex: 'none', width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(26,26,26,0.45)', boxSizing: 'border-box'}} />
        <span style={{whiteSpace: 'nowrap'}}>{t}</span>
        <div style={{position: 'absolute', left: '30%', right: '30%', bottom: 0, height: 1, background: 'rgba(26,26,26,0.12)'}} />
      </div>
    </div>
  );
};

const Shell: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: PAGE, fontFamily: '"SF Pro Text", -apple-system, "Helvetica Neue", sans-serif', color: '#1a1a1a', overflow: 'hidden'}}>
    {children}
  </AbsoluteFill>
);

const Title: React.FC = () => (
  <div style={{position: 'absolute', left: 0, right: 0, top: 56, textAlign: 'center', fontSize: 64, fontWeight: 600, letterSpacing: '-0.02em'}}>Today</div>
);

/* Version 1: the screen stays the same size and the list scrolls, keeping the newest row near the middle. */
export const TodoDemo: React.FC = () => {
  const f = useCurrentFrame();
  const count = N * FILL(clamp01(f / ADD));
  const w = ROW * 2.2;
  const y = ROW * count;
  const off = w * Math.log(1 + Math.exp((y - MID) / w)) - w * Math.log(1 + Math.exp((0 - MID) / w));
  const out = interpolate(f, [ADD + HOLD, ADD + HOLD + FADE], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Shell>
      <Title />
      <div style={{position: 'absolute', left: (TODO_W - COL - 60) / 2, width: COL + 60, top: HEAD - 20, height: VIEW + 20, background: PANEL, borderRadius: '32px 32px 0 0', opacity: out}} />
      <div style={{position: 'absolute', left: (TODO_W - COL) / 2, width: COL, top: HEAD, height: VIEW, clipPath: 'inset(0px -1000px 0px -1000px)', opacity: out}}>
        <div style={{transform: `translateY(${-off}px)`}}>
          {TASKS.map((t, i) => <Row key={i} t={t} p={clamp01(count - i)} />)}
        </div>
      </div>
      <div style={{position: 'absolute', left: (TODO_W - COL - 60) / 2, width: COL + 60, top: TODO_H - 110, height: 110, background: `linear-gradient(transparent, ${PAGE})`}} />
    </Shell>
  );
};

/* Version 2: the list only grows; the view zooms out so the whole list always fits and ends as a tall, narrow strip. */
export const TodoDemoZoom: React.FC = () => {
  const f = useCurrentFrame();
  const count = N * FILL(clamp01(f / ADD));
  const out = interpolate(f, [ADD + HOLD, ADD + HOLD + FADE], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const PADV = 24;
  const listH = ROW * Math.max(count, 2.2) + PADV * 2;     // grown height, at least a couple of rows
  const top = 40;
  const sc = Math.min(1.9, (TODO_H - top - 40) / listH);
  const panelH = ROW * count + PADV * 2;
  return (
    <Shell>
      <div style={{position: 'absolute', left: (TODO_W - COL - 60) / 2, top, width: COL + 60, transformOrigin: '50% 0', transform: `scale(${sc})`, opacity: out}}>
        <div style={{height: panelH, background: PANEL, borderRadius: 32, padding: `${PADV}px 30px`, boxSizing: 'border-box'}}>
          {TASKS.map((t, i) => <Row key={i} t={t} p={clamp01(count - i)} />)}
        </div>
      </div>
    </Shell>
  );
};
