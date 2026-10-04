import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DARK, LIGHT} from './ui';
import {LiveBox, LiveControls, LockCard, TabBar, TaskRow, TopBar} from './app';

/* A calibration sheet: components at 3x, laid out at the same pixel
   positions as crops of the simulator screenshots (1206 px = 402 pt), so
   the two can be compared side by side. Not part of the video. */
const Z = 3;
export const LAB_W = 1206;
export const LAB_H = 1480;

export const Lab: React.FC = () => (
  <AbsoluteFill>
    {/* 0–180: resting row; 180–360: checked row; 360–682: tab bar (all light) */}
    <div style={{position: 'absolute', left: 0, top: 0, width: LAB_W, height: 682, background: LIGHT.canvas}}>
      <div style={{position: 'absolute', left: 21.5 * Z, top: 90 - (56.3 * Z) / 2}}>
        <TaskRow title="organize trip to Asia" w={402 - 43} z={Z} p={LIGHT} />
      </div>
      <div style={{position: 'absolute', left: 21.5 * Z, top: 270 - (56.3 * Z) / 2}}>
        <TaskRow title="book train to Hamburg" w={402 - 43} z={Z} p={LIGHT} checked={1} />
      </div>
      <div style={{position: 'absolute', left: 21.5 * Z, top: 360 + 143 - (51 * Z) / 2}}>
        <TabBar w={402 - 43} z={Z} p={LIGHT} liveSelected={false} pill={0} />
      </div>
    </div>
    {/* 682–1082: dark top bar + live controls; 1082–1480: lock card (light) */}
    <div style={{position: 'absolute', left: 0, top: 682, width: LAB_W, height: 400, background: DARK.canvas}}>
      <div style={{position: 'absolute', left: 21.5 * Z, top: 30}}>
        <TopBar w={402 - 43} z={Z} p={DARK} />
      </div>
      <div style={{position: 'absolute', left: (402 * Z - 402 * 0.68 * Z) / 2, top: 250}}>
        <LiveControls screenW={402} z={Z} p={DARK} mode="live" breath={1} hasText />
      </div>
    </div>
    <div style={{position: 'absolute', left: 0, top: 1082, width: LAB_W, height: 398, background: '#3E7F86'}}>
      <div style={{position: 'absolute', left: 42, top: 100}}>
        <LockCard w={(1206 - 84) / Z} z={Z} p={LIGHT} title="Don’t forget health insurance card !" done={0} strike={0} />
      </div>
    </div>
  </AbsoluteFill>
);

export const LabBox: React.FC = () => (
  <AbsoluteFill style={{background: DARK.canvas}}>
    <div style={{position: 'absolute', left: 62, top: 72}}>
      <LiveBox w={(1144 - 62) / Z} h={(1650 - 872) / Z} z={Z} p={DARK}>
        Don’t forget health insurance card !
      </LiveBox>
    </div>
  </AbsoluteFill>
);

/* Centring check for the text inside the phone's buttons (dev only): each
   control at 4x on its own band, at a known top, so the pill's centre line is
   known exactly and the ink can be measured against it. */
export const LAB_BTN = {z: 4, w: 1700, h: 1200, rows: [60, 340, 620, 900]};
export const LabButtons: React.FC = () => {
  const {z, rows} = LAB_BTN;
  return (
    <AbsoluteFill style={{background: DARK.canvas}}>
      <div style={{position: 'absolute', left: 40, top: rows[0]}}>
        <TopBar w={359} z={z} p={DARK} />
      </div>
      <div style={{position: 'absolute', left: 40, top: rows[1]}}>
        <LiveControls screenW={402} z={z} p={DARK} mode="go" breath={null} hasText knob />
      </div>
      <div style={{position: 'absolute', left: 40, top: rows[2]}}>
        <LiveControls screenW={402} z={z} p={DARK} mode="live" breath={1} hasText />
      </div>
      <div style={{position: 'absolute', left: 40, top: rows[3]}}>
        <TabBar w={359} z={z} p={DARK} liveSelected pill={null} />
      </div>
    </AbsoluteFill>
  );
};
