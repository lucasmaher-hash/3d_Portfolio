import React from 'react';
import {Composition, continueRender, delayRender, staticFile} from 'remotion';
import {DURATION, FPS, Promo} from './Promo';

/* W95FA (Alina Sava, SIL OFL 1.1) — the app's chrome face. Block rendering
   until it is in, or the first frames fall back to monospace. */
const fontHandle = delayRender('W95FA');
const w95 = new FontFace('W95FA', `url('${staticFile('W95FA.otf')}') format('opentype')`);
w95
  .load()
  .then((loaded) => {
    document.fonts.add(loaded);
    continueRender(fontHandle);
  })
  .catch((err) => {
    console.error(err);
    continueRender(fontHandle);
  });

export const RemotionRoot: React.FC = () => (
  <Composition id="TomorrowPromo" component={Promo} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
);
