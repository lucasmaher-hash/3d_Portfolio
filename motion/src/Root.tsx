import React from 'react';
import {Composition, continueRender, delayRender, staticFile} from 'remotion';
import {Lab, LAB_BTN, LAB_H, LAB_W, LabBox, LabButtons} from './Lab';
import {DURATION_E, DURATION_F, EXT, FPS, LabPhone, Promo, PromoTall} from './Promo';
import {DURATION_F as DURATION_FV, EXT_V, PromoV, PromoVTall} from './PromoV';
import {UNIFY_DURATION, UNIFY_EXT, UnifyPromo, UnifyPromoTall} from './unify/UnifyPromo';
import {UnifyLab} from './unify/Lab';
import './sk.css';

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

/* Nunito (Vernon Adams et al., SIL OFL 1.1) — the Unify app's only face. Variable,
   so one file covers every weight the app uses (300–900). */
const nunitoHandle = delayRender('Nunito');
const nunito = new FontFace('Nunito', `url('${staticFile('unify/Nunito.ttf')}') format('truetype')`, {weight: '200 1000'});
nunito
  .load()
  .then((loaded) => {
    document.fonts.add(loaded);
    continueRender(nunitoHandle);
  })
  .catch((err) => {
    console.error(err);
    continueRender(nunitoHandle);
  });

export const RemotionRoot: React.FC = () => (
  <>
    {/* ── Unify promo ── */}
    <Composition id="UnifyPromo" component={UnifyPromo} durationInFrames={UNIFY_DURATION} fps={30} width={1920} height={1080} />
    {/* ...and its TALL cut, the draft page's hero: UNIFY_EXT px of canvas above the frame */}
    <Composition id="UnifyPromoTall" component={UnifyPromoTall} durationInFrames={UNIFY_DURATION} fps={30} width={1920} height={1080 + UNIFY_EXT} />
    <Composition id="UnifyLab" component={UnifyLab} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={{which: 'card' as const}} />
    <Composition id="Lab" component={Lab} durationInFrames={1} fps={30} width={LAB_W} height={LAB_H} />
    <Composition id="LabButtons" component={LabButtons} durationInFrames={1} fps={30} width={LAB_BTN.w} height={LAB_BTN.h} />
    <Composition id="LabPhone" component={LabPhone} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={{at: 'pill' as const, live: false}} />
    <Composition id="LabBox" component={LabBox} durationInFrames={1} fps={30} width={1206} height={922} />
    {/* The promo (E — the one Lucas chose, 2026-10-04): the typed "Go Live" turns into the
        button, then the camera pulls back to the phone. The alternates A–D are no longer
        registered; their branches are still inside Promo.tsx. */}
    <Composition
      id="TomorrowPromoE"
      component={Promo}
      durationInFrames={DURATION_E}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{variant: 'A' as const, transition: 'golive2' as const}}
    />
    {/* F: E plus one inserted beat — "Go Live on important tasks" typed and taken back on the dark */}
    <Composition
      id="TomorrowPromoF"
      component={Promo}
      durationInFrames={DURATION_F}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{variant: 'A' as const, transition: 'golive3' as const}}
    />
    {/* The VERTICAL cut (4:5) for phones — F's story re-laid, see PromoV.tsx */}
    <Composition
      id="TomorrowPromoV"
      component={PromoV}
      durationInFrames={DURATION_FV}
      fps={FPS}
      width={1080}
      height={1350}
      defaultProps={{variant: 'A' as const, transition: 'golive3' as const}}
    />
    {/* ...and its tall cut, the project page's phone hero: EXT_V px of canvas above */}
    <Composition
      id="TomorrowPromoVTall"
      component={PromoVTall}
      durationInFrames={DURATION_FV}
      fps={FPS}
      width={1080}
      height={1350 + EXT_V}
      defaultProps={{variant: 'A' as const, transition: 'golive3' as const}}
    />
    {/* F's TALL cut — the website hero on desktop: EXT px of empty canvas above the frame */}
    <Composition
      id="TomorrowPromoFTall"
      component={PromoTall}
      durationInFrames={DURATION_F}
      fps={FPS}
      width={1920}
      height={1080 + EXT}
      defaultProps={{variant: 'A' as const, transition: 'golive3' as const}}
    />
  </>
);
