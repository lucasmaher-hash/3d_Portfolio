import React from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {PhoneFrameClose, SCREEN_H, SCREEN_W} from './Chat';
import {ChatScene} from './ChatScene';
import {CampusMap, MAP_V} from './MapScene';
import {APP_W, MapAppUI} from './MapUI';
import {CREAM, DARK, ease, ExtTop, H, NUNITO, PINK, W, wordAnim} from './lib';
import {charWidth, ConnectScene, CustomizeChar, CYCLE, FINAL_CHAR, LEFT3, T, TimetableScene, TT_CAPS, TT_SIL, ttCx, useFilmFrame} from './UnifyPromo';

/* ─────────────────────────────────────────────────────────────────────────
   Unify — the VERTICAL cut, 1080x1350 (4:5) @ 30 fps, what phones get (the
   landing tile below 640px, and with VTall the project page's phone hero).

   Same story, same timings, same scene components as the landscape film —
   each scene is RE-FRAMED for the tall frame rather than cropped (the usual
   advice for taking a landscape motion piece vertical, and what the to.morrow
   vertical cut does): every scene still draws in the landscape film's
   1920x1080 stage coordinates, and a Stage places that stage so the scene's
   subject sits centred, a little below the middle; captions are set centred
   ABOVE the subject instead of beside it (they used to sit to its right); the
   chat's flood is laid out for the tall frame (ChatScene `vertical`), and the
   map has its own framing (MapScene MAP_V: pan path, pull-out, two-line
   caption). Stage offsets that hand a subject from scene to scene (the
   connect card's dive → the customize character → the burst onto the map,
   the chat's blob → the timetable card) all agree on where it lands.
   ───────────────────────────────────────────────────────────────────────── */

export const VW = 1080;
export const VH = 1350;
/* the vertical tall cut: canvas above the frame, as the to.morrow phone hero's */
export const UNIFY_EXT_V = 180;

/* Where each stage sits in the frame: the subject's stage point → its frame point. */
const CHAT = {dx: VW / 2 - W / 2, dy: 675 - H / 2}; // the phone centred
const TT_DY = 800 - H / 2; // the timetable's focus point, under its caption
const CN = {dx: VW / 2 - LEFT3, dy: 780 - H / 2}; // the connect card, then the customize character
const MAP = {dx: VW / 2 - W / 2, dy: 675 - H / 2}; // the map, and the phone that closes round it (= the chat's phone)

/* A scene in the landscape film's coordinates, placed in the vertical frame.
   ExtTop is raised by the offset so every full-frame ground in it still
   reaches the top of the composition. */
const Stage: React.FC<{dx: number; dy: number; children: React.ReactNode}> = ({dx, dy, children}) => {
  const ext = React.useContext(ExtTop);
  return (
    <ExtTop.Provider value={dy + ext}>
      <div style={{position: 'absolute', left: dx, top: dy, width: W, height: H}}>{children}</div>
    </ExtTop.Provider>
  );
};

/* Captions, centred above the subject; the film's own word rise. */
const CaptionV: React.FC<{lines: string[]; f: number; inAt: number; outAt?: number; color: string; y: number; size: number}> = ({lines, f, inAt, outAt, color, y, size}) => {
  let k = 0;
  return (
    <div style={{position: 'absolute', left: 0, width: VW, top: y, transform: 'translateY(-50%)', fontFamily: NUNITO, fontWeight: 800, fontSize: size, lineHeight: 0.92, letterSpacing: '-0.01em', color}}>
      {lines.map((line, li) => (
        <div key={li} style={{display: 'flex', justifyContent: 'center', whiteSpace: 'pre'}}>
          {line.split(/(\s+)/).map((w, i) => {
            if (/^\s+$/.test(w)) return <span key={i}>{w}</span>;
            const j = k++;
            return (
              <span key={i} style={{display: 'inline-block', ...wordAnim(f, inAt + j * 3, outAt === undefined ? undefined : outAt + j * 2)}}>
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const CAP_TT_Y = 230;
const CAP_Y = 300;
/* The wash under the timetable's captions (Lucas, 2026-10-05): solid only at
   the very top and fading over WASH_END px — three times the first version's
   fade, starting at the frame's top instead of under the text, so the text
   sits IN the fade (the page under it only a little darkened) and the wash is
   gone before the card's days row at the overview (its top is at ~416).
   Eased stops, so it thins out softly. `ext` is the tall cut's band above,
   kept solid. */
export const WASH_END = 420;
export const washGradient = (rgb: string, ext: number) =>
  `linear-gradient(rgba(${rgb},1) ${ext}px, rgba(${rgb},.62) ${ext + WASH_END * 0.3}px, rgba(${rgb},.27) ${ext + WASH_END * 0.62}px, rgba(${rgb},0) ${ext + WASH_END}px)`;
/* The timetable's overview is small in the tall frame at the landscape's 1.25:
   the vertical cut shows it BOOST times larger, easing back to the landscape
   camera over the first zoom (ZOOM_TOP), so the days stop and everything after
   are the landscape framing. Scaled about the card's focus point. */
const BOOST = 1.3;
const boostAt = (f: number) => 1 + (BOOST - 1) * (1 - ease(f, T.ZOOM_TOP[0], T.ZOOM_TOP[1], Easing.inOut(Easing.cubic)));
/* while the camera is in on Emil's room number the page moves right, in step
   with that zoom, so his name clears the frame's left edge */
const ROOM_DX = 80;

export const UnifyPromoV: React.FC = () => {
  const f = useFilmFrame();
  const ext = React.useContext(ExtTop);

  // the chat's blob lands on the timetable card where the TIMETABLE stage puts it (boosted)
  const cardBox = {
    x: W / 2 + (TT_SIL.x - W / 2) * BOOST, y: H / 2 + (TT_SIL.y - H / 2) * BOOST + (TT_DY - CHAT.dy),
    w: TT_SIL.w * BOOST, h: TT_SIL.h * BOOST, r: TT_SIL.r * BOOST,
  };
  // the timetable stays centred: the landscape slide toward the left is undone
  const room = ease(f, T.ROOM_IN[0], T.ROOM_IN[1], Easing.inOut(Easing.cubic)) * (1 - ease(f, T.ROOM_OUT[0], T.ROOM_OUT[1], Easing.inOut(Easing.cubic)));
  const ttDx = VW / 2 - ttCx(f) + ROOM_DX * room;
  const boost = boostAt(f);
  // a dark wash under the timetable's captions: the page runs on above the camera's point
  const ttWash = ease(f, T.CARD_IN0, T.CARD_IN1) * (1 - ease(f, T.TT_OUT, T.TT_OUT + 14));

  // the ending, as the landscape film's
  const k = Math.exp(Math.log(6) * (1 - ease(f, T.FRAME0, T.FRAME1, Easing.inOut(Easing.cubic))));
  const black = ease(f, T.BLACK0, T.BLACK1, Easing.inOut(Easing.quad));
  const look = -3.5 * ease(f, T.FRAME1 - 6, T.FRAME1 + 4) + 7 * ease(f, T.FRAME1 + 14, T.FRAME1 + 24);
  const us = SCREEN_W / APP_W;
  const screenUI = (
    <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `scale(${us})`}}>
      <MapAppUI h={SCREEN_H / us} look={look} />
    </div>
  );

  return (
    <AbsoluteFill style={{background: DARK, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: ext, width: VW, height: VH}}>
        {f >= T.ZOOM1 && f < T.BOOM + 32 ? <div style={{position: 'absolute', left: 0, top: -ext, width: VW, height: VH + ext, background: PINK}} /> : null}

        {/* 1 — the chat, the flood, the suck, the puff and the morph */}
        {f < T.CARD_IN1 + 4 ? (
          <Stage dx={CHAT.dx} dy={CHAT.dy}>
            <ChatScene f={f} cardBox={cardBox} cardIn={[T.CARD_IN0, T.CARD_IN1]} vertical maxW={VW * 0.9} />
          </Stage>
        ) : null}

        {/* 2 — the shared timetable, caption above */}
        {f >= T.CARD_IN0 && f < T.TT_OUT + 16 ? (
          <Stage dx={ttDx} dy={TT_DY}>
            <div style={{position: 'absolute', inset: 0, transform: boost !== 1 ? `scale(${boost})` : undefined, transformOrigin: `${ttCx(f)}px ${H / 2}px`}}>
              <TimetableScene f={f} />
            </div>
          </Stage>
        ) : null}
        {ttWash > 0 ? <div style={{position: 'absolute', left: 0, top: -ext, width: VW, height: WASH_END + ext, opacity: ttWash, background: washGradient('41,41,37', ext)}} /> : null}
        {TT_CAPS.map((c, i) => (f >= c.inAt && f < c.outAt + 20 ? <CaptionV key={i} lines={c.lines} f={f} inAt={c.inAt} outAt={c.outAt} color={CREAM} y={CAP_TT_Y} size={88} /> : null))}

        {/* 3 — connect now, and the dive into Nam */}
        {f >= T.C_IN && f < T.ZOOM1 ? (
          <Stage dx={CN.dx} dy={CN.dy}>
            <ConnectScene f={f} />
          </Stage>
        ) : null}
        {f >= T.C_IN && f < T.ZOOM0 + 14 ? <CaptionV lines={['or view', 'at a glance']} f={f} inAt={T.C_IN + 6} outAt={T.ZOOM0} color={CREAM} y={CAP_Y} size={100} /> : null}

        {/* 4 — customize your character, on the app's pink */}
        {f >= T.ZOOM1 && f < T.BOOM ? (
          <Stage dx={CN.dx} dy={CN.dy}>
            <CustomizeChar f={f} />
          </Stage>
        ) : null}
        {f >= T.CAP_CU && f < T.BOOM + 14 ? <CaptionV lines={['customize', 'your character']} f={f} inAt={T.CAP_CU} outAt={T.BOOM} color={DARK} y={CAP_Y} size={100} /> : null}

        {/* 5/6 — the burst onto the campus map, friends then courses */}
        {f >= T.BOOM ? (
          <Stage dx={MAP.dx} dy={MAP.dy}>
            <CampusMap f={f} T={T} charW={charWidth(FINAL_CHAR)} finalChar={FINAL_CHAR} finalEyes={CYCLE[CYCLE.length - 1][1]} layout={MAP_V} />
          </Stage>
        ) : null}

        {/* 7 — the phone frame closes round the map, with the app's chrome; its screen goes black: frame 0 */}
        {f >= T.FRAME0 ? (
          <Stage dx={MAP.dx} dy={MAP.dy}>
            <PhoneFrameClose k={k} black={black} ground={DARK} screen={screenUI} />
          </Stage>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* The phone hero's tall cut: UNIFY_EXT_V px of canvas above the vertical film. */
export const UnifyPromoVTall: React.FC = () => (
  <ExtTop.Provider value={UNIFY_EXT_V}>
    <UnifyPromoV />
  </ExtTop.Provider>
);
