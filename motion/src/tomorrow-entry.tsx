/* A render entry for the to.morrow films ONLY, so they can be rendered while
   Root.tsx carries other, unfinished work (e.g. the Unify promo):
   npx remotion render src/tomorrow-entry.tsx <id> out/<file>.mp4
   Same ids and settings as in Root.tsx. */
import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {DURATION_F, EXT, FPS, Promo, PromoTall} from './Promo';
import {DURATION_F as DURATION_FV, EXT_V, PromoV, PromoVTall} from './PromoV';
import {DURATION_F as DURATION_F16, Promo16} from './Promo16';
import './sk.css';

const F = {variant: 'A' as const, transition: 'golive3' as const};

const TomorrowRoot: React.FC = () => (
  <>
    <Composition id="TomorrowPromoF" component={Promo} durationInFrames={DURATION_F} fps={FPS} width={1920} height={1080} defaultProps={F} />
    <Composition id="TomorrowPromoFTall" component={PromoTall} durationInFrames={DURATION_F} fps={FPS} width={1920} height={1080 + EXT} defaultProps={F} />
    <Composition id="TomorrowPromoV" component={PromoV} durationInFrames={DURATION_FV} fps={FPS} width={1080} height={1350} defaultProps={F} />
    <Composition id="TomorrowPromoVTall" component={PromoVTall} durationInFrames={DURATION_FV} fps={FPS} width={1080} height={1350 + EXT_V} defaultProps={F} />
    <Composition id="TomorrowPromo16" component={Promo16} durationInFrames={DURATION_F16} fps={FPS} width={1920} height={1080} defaultProps={F} />
  </>
);

registerRoot(TomorrowRoot);
