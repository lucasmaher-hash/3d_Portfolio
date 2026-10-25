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

const ROW = 76, HEAD = 190, PAD = 90;
const VIEW = TODO_H - HEAD;
const MID = VIEW * 0.5;
const SLIDE = Easing.bezier(0.22, 1, 0.36, 1);       // long, soft landing
const FILL = Easing.bezier(0.45, 0, 0.55, 1);        // gentle in/out for the arrival pace
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const TodoDemo: React.FC = () => {
  const f = useCurrentFrame();
  const count = N * FILL(clamp01(f / ADD));
  // The newest row sits at y = ROW*count. The list starts to scroll well before that
  // reaches the middle (softplus), then keeps the newest row at about half the screen.
  const w = ROW * 2.2;
  const y = ROW * count;
  const off = w * Math.log(1 + Math.exp((y - MID) / w)) - w * Math.log(1 + Math.exp((0 - MID) / w));
  const out = interpolate(f, [ADD + HOLD, ADD + HOLD + FADE], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#cdd0d9', fontFamily: '"SF Pro Text", -apple-system, "Helvetica Neue", sans-serif', color: '#1a1a1a', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: PAD, top: 64, fontSize: 72, fontWeight: 600, letterSpacing: '-0.02em'}}>Today</div>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: HEAD, height: VIEW, overflow: 'hidden', opacity: out,
          WebkitMaskImage: 'linear-gradient(#000 calc(100% - 90px), transparent)',
        }}
      >
        <div style={{transform: `translateY(${-off}px)`}}>
          {TASKS.map((t, i) => {
            const p = clamp01(count - i);
            const e = SLIDE(p);
            return (
              <div
                key={i}
                style={{
                  height: ROW, margin: `0 ${PAD}px`, display: 'flex', alignItems: 'center', gap: 28, fontSize: 32,
                  borderBottom: '1px solid rgba(26,26,26,0.09)',
                  opacity: clamp01(p * 2.5), transform: `translateX(${(1 - e) * 520}px)`,
                }}
              >
                <i style={{flex: 'none', width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(26,26,26,0.45)', boxSizing: 'border-box'}} />
                <span style={{whiteSpace: 'nowrap'}}>{t}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
