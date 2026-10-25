/* "Das Problem" motion graphic: tasks glide into a Today list from the right.
   Plain rounded frame (the page rounds the video's corners), no phone. */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

export const TODO_W = 1440;
export const TODO_H = 900;
const TASKS = [
  'Email Ms. Keller', 'Sort tax documents', 'Call the dentist', 'Pick up parcel', 'Do laundry',
  'Gift for Mom', 'Finish presentation', 'Pay rent', 'Buy milk and bread', 'Order cables',
  'Fix bike', 'Return library book', 'Book flight', 'Check electricity bill', 'Call Lisa back',
  'Clean apartment', 'Water plants', 'Pick up prescription', 'Print photos', 'Change password',
  'Back up laptop', 'Reschedule appointment', 'Cancel insurance', 'Read script', 'Plan workout',
  'Buy flowers', 'Plan lunch', 'Renew passport', 'Car inspection', 'Cancel newspaper',
];
const N = 20;                                        // how many of TASKS are shown
const SPAN = 2.6;                                    // a card is in flight while the list advances this many rows, so the next one is already on its way
const ADD = 215, HOLD = 48, FADE = 18, GAP = 12;
export const TODO_DURATION = ADD + HOLD + FADE + GAP;

const ROW = 84, HEAD = 190;
const COL = 640;                                     // list column width
const VIEW = TODO_H - HEAD;
const MID = VIEW * 0.58;                       // the newest row docks around the lower third of the frame
const SLIDE = Easing.bezier(0.3, 0.55, 0.25, 1);     // long, soft landing along the curve
const FILL = Easing.bezier(0.45, 0, 0.55, 1);        // gentle in/out for the arrival pace
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const HEADT = 120;                                   // height of the heading block inside the zoom version's panel
const INK = '#17233a', MUTED = 'rgba(23,35,58,0.45)';
const TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const FONT = '"SF Pro Text", -apple-system, "Helvetica Neue", sans-serif';

const Row: React.FC<{t: string; time: string; p: number}> = ({t, time, p: pu}) => {
  const p = clamp01(pu / SPAN);
  const bg = 'linear-gradient(180deg, #d9e7fa, #cadcf6)';   // one card colour from takeoff to landing
  const shadow = '0 8px 20px rgba(35,70,140,0.14), inset 0 1px 0 rgba(255,255,255,0.7)';
  // Quadratic Bezier with the control point in the lower-left corner (Lucas's curve): the card starts
  // 560px right and 400px below its place, travels left almost level, then bends up and docks moving vertically.
  const u = SLIDE(p);
  const x = 500 * (1 - u) * (1 - u), y = 260 * (1 - u * u);
  return (
    <div style={{height: ROW, padding: '6px 0', boxSizing: 'border-box', opacity: clamp01(p * 2.5), transform: `translate(${x}px, ${y}px)`}}>
      <div style={{height: '100%', background: bg, boxShadow: shadow, borderRadius: 20, display: 'flex', alignItems: 'center', paddingLeft: 30, paddingRight: 30, gap: 22, fontSize: 31, color: INK}}>
        <i style={{flex: 'none', width: 32, height: 32, borderRadius: '50%', border: '2.5px solid rgba(23,35,58,0.4)', boxSizing: 'border-box'}} />
        <span style={{whiteSpace: 'nowrap'}}>{t}</span>
      </div>
    </div>
  );
};

const Shell: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill
    style={{
      background: '#9aa0ad',
      fontFamily: FONT, color: INK, overflow: 'hidden',
    }}
  >
    {children}
  </AbsoluteFill>
);

const PANEL_BG = 'linear-gradient(180deg, #b4cdf0 0%, #9dbde8 100%)';
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
  const raw = (N + SPAN) * FILL(clamp01(f / ADD));   // rows are released at raw = i and land at raw = i + SPAN
  const count = Math.min(raw, N);
  const w = ROW * 2.2;
  const y = ROW * count;
  const off = w * Math.log(1 + Math.exp((y - MID) / w)) - w * Math.log(1 + Math.exp((0 - MID) / w));
  const out = interpolate(f, [ADD + HOLD, ADD + HOLD + FADE], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const PL = (TODO_W - COL - 60) / 2;
  return (
    <Shell>
      <div style={{position: 'absolute', left: PL, width: COL + 60, top: 40, height: TODO_H - 40, background: PANEL_BG, boxShadow: PANEL_SHADOW, borderRadius: '40px 40px 0 0', opacity: out}}>
        <div style={{position: 'absolute', left: 30, right: 30, top: 38}}><Heading count={Math.min(N, raw + 1)} /></div>
      </div>
      <div style={{position: 'absolute', left: (TODO_W - COL) / 2, width: COL, top: HEAD, height: VIEW, clipPath: 'inset(0px -1000px 0px -1000px)', opacity: out}}>
        <div style={{transform: `translateY(${-off}px)`}}>
          {TASKS.slice(0, N).map((t, i) => <Row key={i} t={t} time={TIMES[i]} p={raw - i} />)}
        </div>
      </div>
    </Shell>
  );
};

/* Version 2: the list only grows; the view zooms out so the whole list always fits and ends as a tall, narrow strip. */
export const TodoDemoZoom: React.FC = () => {
  const f = useCurrentFrame();
  const raw = (N + SPAN) * FILL(clamp01(f / ADD));   // rows are released at raw = i and land at raw = i + SPAN
  const count = Math.min(raw, N);
  const out = interpolate(f, [ADD + HOLD, ADD + HOLD + FADE], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const PADV = 24;
  const listH = HEADT + ROW * Math.max(count, 2.2) + PADV * 2;     // grown height, at least a couple of rows
  const top = 40;
  const sc = Math.min(1.9, (TODO_H - top - 40) / listH);
  const content = HEADT + ROW * count + PADV * 2;
  const prog = clamp01(count / N);
  const settle = SLIDE(clamp01((raw - N) / SPAN));          // only once the last card is landing does the panel pull in to equal gaps
  const edge = (TODO_H - top) / sc + 120 * (1 - prog);       // while the list grows it runs to / past the bottom edge
  const reach = edge * (1 - settle) + content * settle;
  const panelH = Math.max(content, reach);
  return (
    <Shell>
      <div style={{position: 'absolute', left: (TODO_W - COL - 60) / 2, top, width: COL + 60, transformOrigin: '50% 0', transform: `scale(${sc})`, opacity: out}}>
        <div style={{height: panelH, background: PANEL_BG, boxShadow: PANEL_SHADOW, borderRadius: 40, padding: `${PADV}px 30px`, boxSizing: 'border-box'}}>
          <div style={{height: HEADT - PADV + 14}}><Heading count={Math.min(N, raw + 1)} /></div>
          {TASKS.slice(0, N).map((t, i) => <Row key={i} t={t} time={TIMES[i]} p={raw - i} />)}
        </div>
      </div>
    </Shell>
  );
};
