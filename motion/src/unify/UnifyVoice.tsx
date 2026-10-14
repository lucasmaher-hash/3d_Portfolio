import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile} from 'remotion';
import {FilmRemap, UNIFY_EXT, UnifyPromo} from './UnifyPromo';
import {ExtTop} from './lib';
import {SEGS, SFX, VO, VOICE_DURATION} from './voiceTimeline';

/* Unify promo with voice-over (ElevenLabs v4, voice Jessica) and UI sound effects, 2026-10-15.
   Same scenes as UnifyPromo, re-timed per scene so every line has room: SEGS maps output frames
   to film frames piecewise, then a moving average smooths the speed changes between scenes. */
const RAW: number[] = (() => {
  const a: number[] = [];
  const last = SEGS[SEGS.length - 1];
  for (let o = 0; o < VOICE_DURATION; o++) {
    const s = SEGS.find((x) => o >= x.o0 && o < x.o0 + x.olen);
    a.push(s ? s.f0 + ((o - s.o0) / s.olen) * s.flen : last.f0 + last.flen);
  }
  return a;
})();
const SMOOTH = 9;
const MAP = RAW.map((_, i) => {
  let sum = 0;
  let n = 0;
  for (let j = i - SMOOTH; j <= i + SMOOTH; j++) {
    sum += RAW[Math.max(0, Math.min(RAW.length - 1, j))];
    n++;
  }
  return sum / n;
});
const remap = (o: number) => MAP[Math.max(0, Math.min(MAP.length - 1, Math.round(o)))];

/* Music bed: sits well under voice and effects, ducks a further ~9 dB while a line plays
   (attack ~0.1 s, release ~0.5 s), fades in at the start and out over the last 2 s. */
const BED = 0.208; // Lucas 15.10.: music 35% quieter than the first mix (0.32)
const DUCK = 0.35;
const duck = (f: number) => {
  let g = 1;
  for (const v of VO) {
    const k = interpolate(f, [v.at - 3, v.at + 1, v.end, v.end + 15], [1, DUCK, DUCK, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    g = Math.min(g, k);
  }
  const fade = interpolate(f, [0, 12, VOICE_DURATION - 60, VOICE_DURATION - 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return BED * g * fade;
};

export const UnifyVoice: React.FC<{music?: string}> = ({music}) => (
  <AbsoluteFill>
    {music ? <Audio src={staticFile(music)} volume={duck} /> : null}
    <FilmRemap.Provider value={remap}>
      <UnifyPromo />
    </FilmRemap.Provider>
    {VO.map((v, i) => (
      <Sequence key={`vo${i}`} from={v.at}>
        <Audio src={staticFile(v.file)} volume={1} />
      </Sequence>
    ))}
    {SFX.map((s, i) => (
      <Sequence key={`sfx${i}`} from={s.at}>
        <Audio src={staticFile(s.file)} volume={s.vol} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
/* Tall cut for the portfolio's desktop hero: same canvas extension above the frame as
   UnifyPromoTall, so the nav bar never covers content. */
export const UnifyVoiceTall: React.FC<{music?: string}> = (p) => (
  <ExtTop.Provider value={UNIFY_EXT}>
    <UnifyVoice {...p} />
  </ExtTop.Provider>
);
export {VOICE_DURATION};
