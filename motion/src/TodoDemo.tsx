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
const N = 20;                                        // how many of TASKS are shown
const ADD = 190, HOLD = 48, FADE = 18, GAP = 12;
export const TODO_DURATION = ADD + HOLD + FADE + GAP;

const ROW = 84, HEAD = 190;
const COL = 640;                                     // list column width
const VIEW = TODO_H - HEAD;
const MID = VIEW * 0.5;
const SLIDE = Easing.bezier(0.3, 0.55, 0.25, 1);     // long, soft landing along the curve
const FILL = Easing.bezier(0.45, 0, 0.55, 1);        // gentle in/out for the arrival pace
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const HEADT = 120;                                   // height of the heading block inside the zoom version's panel
const INK = '#17233a', MUTED = 'rgba(23,35,58,0.45)';
const TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const FONT = '"SF Pro Text", -apple-system, "Helvetica Neue", sans-serif';

const Row: React.FC<{t: string; time: string; p: number}> = ({t, time, p: pu}) => {
  const p = clamp01(pu);
  const m0 = clamp01((pu - 0.85) / 1.5);                // once seated, the card melts into the panel
  const m = m0 * m0 * (3 - 2 * m0);
  // incoming: saturated blue with a lifted shadow; seated: a soft, translucent white card
  const bg = `rgba(${Math.round(lerp(118, 255, m))},${Math.round(lerp(163, 255, m))},${Math.round(lerp(232, 255, m))},${lerp(1, 0.5, m)})`;
  const shadow = `0 ${lerp(14, 4, m)}px ${lerp(30, 14, m)}px rgba(40,75,140,${lerp(0.28, 0.07, m)}), inset 0 1px 0 rgba(255,255,255,${lerp(0.35, 0.8, m)})`;
  // Quadratic Bezier (the envelope curve of the string-art picture): starts 300px below and 620px right,
  // rises vertically, bends through the corner at (620, 0) and docks moving horizontally.
  const u = SLIDE(p);
  const x = 620 * (1 - u * u), y = 300 * (1 - u) * (1 - u);
  return (
    <div style={{height: ROW, padding: '6px 0', boxSizing: 'border-box', opacity: clamp01(p * 2.5), transform: `translate(${x}px, ${y}px)`}}>
      <div style={{height: '100%', background: bg, boxShadow: shadow, borderRadius: 20, display: 'flex', alignItems: 'center', paddingLeft: 30, paddingRight: 30, gap: 22, fontSize: 31, color: INK}}>
        <i style={{flex: 'none', width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${m > 0.5 ? 'rgba(23,35,58,0.4)' : 'rgba(255,255,255,0.9)'}`, boxSizing: 'border-box'}} />
        <span style={{whiteSpace: 'nowrap', flex: 1}}>{t}</span>
        <span style={{fontSize: 22, color: m > 0.5 ? MUTED : 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em'}}>{time}</span>
      </div>
    </div>
  );
};

const Shell: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill
    style={{
      background: 'radial-gradient(900px 620px at 12% 8%, #e6ebf6 0%, transparent 62%), radial-gradient(900px 700px at 92% 104%, #b7c8e8 0%, transparent 62%), #ced5e3',
      fontFamily: FONT, color: INK, overflow: 'hidden',
    }}
  >
    {children}
  </AbsoluteFill>
);

const PANEL_BG = 'linear-gradient(180deg, #d3e3f9 0%, #bcd3f2 100%)';
const PANEL_SHADOW = '0 40px 90px rgba(45,80,150,0.22), 0 2px 0 rgba(255,255,255,0.6) inset';

/* "Today" on the left, a live counter pill on the right */
const Heading: React.FC<{count: number}> = ({count}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
    <div style={{fontSize: 64, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: '84px'}}>Today</div>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.55)', boxShadow: '0 4px 14px rgba(45,80,150,0.1)', fontSize: 24, color: MUTED}}>
      <span style={{fontSize: 34, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right'}}>{Math.floor(count + 0.001)}</span>
      tasks
    </div>
  </div>
);

/* Version 1: the screen stays the same size and the list scrolls, keeping the newest row near the middle. */
export const TodoDemo: React.FC = () => {
  const f = useCurrentFrame();
  const count = N * FILL(clamp01(f / ADD));
  const w = ROW * 2.2;
  const y = ROW * count;
  const off = w * Math.log(1 + Math.exp((y - MID) / w)) - w * Math.log(1 + Math.exp((0 - MID) / w));
  const out = interpolate(f, [ADD + HOLD, ADD + HOLD + FADE], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const PL = (TODO_W - COL - 60) / 2;
  return (
    <Shell>
      <div style={{position: 'absolute', left: PL, width: COL + 60, top: 40, height: TODO_H - 40, background: PANEL_BG, boxShadow: PANEL_SHADOW, borderRadius: '40px 40px 0 0', opacity: out}}>
        <div style={{position: 'absolute', left: 30, right: 30, top: 38}}><Heading count={count} /></div>
      </div>
      <div style={{position: 'absolute', left: (TODO_W - COL) / 2, width: COL, top: HEAD, height: VIEW, clipPath: 'inset(0px -1000px 0px -1000px)', opacity: out}}>
        <div style={{transform: `translateY(${-off}px)`}}>
          {TASKS.slice(0, N).map((t, i) => <Row key={i} t={t} time={TIMES[i]} p={count - i} />)}
        </div>
      </div>
    </Shell>
  );
};

/* Version 2: the list only grows; the view zooms out so the whole list always fits and ends as a tall, narrow strip. */
export const TodoDemoZoom: React.FC = () => {
  const f = useCurrentFrame();
  const count = N * FILL(clamp01(f / ADD));
  const out = interpolate(f, [ADD + HOLD, ADD + HOLD + FADE], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const PADV = 24;
  const listH = HEADT + ROW * Math.max(count, 2.2) + PADV * 2;     // grown height, at least a couple of rows
  const top = 40;
  const sc = Math.min(1.9, (TODO_H - top - 40) / listH);
  const content = HEADT + ROW * count + PADV * 2;
  const reach = (TODO_H - top) / sc + 120 * (1 - clamp01(count / N));   // starts past the bottom edge, ends flush with the content
  const panelH = Math.max(content, reach);
  return (
    <Shell>
      <div style={{position: 'absolute', left: (TODO_W - COL - 60) / 2, top, width: COL + 60, transformOrigin: '50% 0', transform: `scale(${sc})`, opacity: out}}>
        <div style={{height: panelH, background: PANEL_BG, boxShadow: PANEL_SHADOW, borderRadius: 40, padding: `${PADV}px 30px`, boxSizing: 'border-box'}}>
          <div style={{height: HEADT - PADV + 14}}><Heading count={count} /></div>
          {TASKS.slice(0, N).map((t, i) => <Row key={i} t={t} time={TIMES[i]} p={count - i} />)}
        </div>
      </div>
    </Shell>
  );
};
