import React from 'react';
import {Img, staticFile} from 'remotion';
import {CREAM, DARK, NUNITO, PINK} from './lib';

/* ─────────────────────────────────────────────────────────────────────────
   The map screen's own chrome (map.html + map.css), drawn on the phone's
   glass at the film's end: the floor selector on top (1.F — the plan the film
   shows) and the collapsed bottom sheet — its peeking eyes, the Friends |
   Courses toggle (Courses, as the map is showing them) and the nav bar with
   the map tab active. In app px on the 402-wide screen; `h` is the screen's
   height in app px, so the sheet sits on the screen's own bottom edge.
   ───────────────────────────────────────────────────────────────────────── */

const u = (f: string) => staticFile(`unify/${f}`);
export const APP_W = 402;
const SEG = (320 - 2 * 8 - 2 * 4) / 3; // .map-floor-toggle__seg: three flex:1 in the padded pill

/* `look` moves the peek's pupils sideways (app px) */
export const MapAppUI: React.FC<{h: number; look?: number}> = ({h, look = 0}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: APP_W, height: h, fontFamily: NUNITO}}>
    {/* .map-floor-toggle */}
    <div style={{position: 'absolute', top: 73.5, left: 41, width: 320, height: 55, boxSizing: 'border-box', padding: 8, display: 'flex', gap: 4, alignItems: 'center', background: DARK, borderRadius: 30}}>
      <div style={{position: 'absolute', top: 8, bottom: 8, left: 8 + SEG + 4, width: SEG, background: PINK, borderRadius: 9999}} />
      {['GF', '1.F', '2.F'].map((l) => (
        <span key={l} style={{position: 'relative', flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: l === '1.F' ? '#000' : CREAM}}>
          {l}
        </span>
      ))}
    </div>

    {/* .map-sheet, collapsed: toggle + nav, 198 tall */}
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '19px 10px 15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, background: DARK, borderRadius: '44px 44px 0 0'}}>
      {/* .map-sheet__peek */}
      <div style={{position: 'absolute', top: -30, left: (APP_W - 119.7) / 2, width: 119.7, height: 38.92}}>
        <Img src={u('toggle_eyes_vector.svg')} style={{position: 'absolute', left: 0, top: 0, width: 119.7, height: 38.92, display: 'block'}} />
        <Img src={u('toggle_eyes_group.svg')} style={{position: 'absolute', left: 14.53, top: 6.21, width: 87.21, height: 30.28, display: 'block'}} />
        <Img src={u('toggle_eyes_pupil_l.svg')} style={{position: 'absolute', left: 32.71 + look, top: 20.75, width: 14.54, height: 13.32, display: 'block'}} />
        <Img src={u('toggle_eyes_pupil_r.svg')} style={{position: 'absolute', left: 71.46 + look, top: 20.75, width: 14.54, height: 13.32, display: 'block'}} />
      </div>
      {/* .map-sheet__toggle, Courses active: cream on the right, the ribbed edge's bumps poking left */}
      <div style={{position: 'relative', flex: 'none', display: 'flex', width: 362, boxSizing: 'border-box', border: `2px solid ${CREAM}`, borderRadius: 37, overflow: 'hidden'}}>
        <span style={{position: 'relative', zIndex: 2, flex: 1, padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, lineHeight: 1.364, color: CREAM}}>Friends</span>
        <span style={{position: 'relative', zIndex: 2, flex: 1, padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, lineHeight: 1.364, color: '#000', background: CREAM, borderRadius: '0 35px 35px 0'}}>Courses</span>
        <Img src={u('sheet_toggle_ribbed.svg')} style={{position: 'absolute', top: 0, zIndex: 1, height: '100%', width: 22, left: 'calc(50% - 9px)', display: 'block'}} />
      </div>
      {/* .map-sheet__nav: home, timetable, map (active, filled), settings */}
      <div style={{flex: 'none', width: 363, height: 92, boxSizing: 'border-box', padding: '4px 9px 5px 40px', display: 'flex', alignItems: 'center', gap: 40, background: DARK, borderRadius: 29.5}}>
        <Img src={u('icon_home_outline.svg')} style={{width: 38, height: 44, display: 'block', flex: 'none'}} />
        <Img src={u('icon_calendar.svg')} style={{width: 43, height: 46, display: 'block', flex: 'none'}} />
        <Img src={u('icon_pin_filled.svg')} style={{width: 37, height: 44, display: 'block', flex: 'none'}} />
        <Img src={u('icon_star.svg')} style={{width: 44, height: 49, display: 'block', flex: 'none'}} />
      </div>
    </div>
  </div>
);

/* Where the chrome leaves the map visible, in app px from the screen's top:
   under the floor selector, above the sheet's peeking eyes. */
export const MAP_WINDOW = {top: 73.5 + 55, bottom: (h: number) => h - 198 - 30};
