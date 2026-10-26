/* Version-2 hero: 14% faster overall, with most of the saving taken from holds.
   Evaluate the original 30-fps animation at fractional frames and render at 60
   fps, so springs and camera moves gain real samples rather than dropped frames. */
export const HERO_FPS = 60;

export const createHeroTiming = (sourceDuration: number, holds: Array<[number, number]>) => {
  const durationInFrames = Math.round(sourceDuration * 2 / 1.14);
  const last = sourceDuration - 1;
  const activeSpeed = 1.06;
  const spans = holds.map(([start, end]) => ({start, end, ramp: Math.min(6, (end - start) / 3)}));
  // Integral of a smoothstep shoulder; velocity and acceleration meet cleanly.
  const shoulder = (x: number, ramp: number) => {
    const u = x / ramp;
    return ramp * (u ** 3 - u ** 4 / 2);
  };
  const held = (source: number) => spans.reduce((total, {start, end, ramp}) => {
    const x = Math.max(0, Math.min(end - start, source - start));
    const length = end - start;
    const area = x < ramp ? shoulder(x, ramp)
      : x <= length - ramp ? x - ramp / 2
      : length - ramp - shoulder(length - x, ramp);
    return total + area;
  }, 0);
  const outputLast = (durationInFrames - 1) / 2;
  const compression = (last - outputLast * activeSpeed) / held(last);
  if (compression <= 0 || compression >= 1) throw new Error('Hero holds cannot meet the target duration');
  const outputAt = (source: number) => (source - compression * held(source)) / activeSpeed;
  const frameAt = (frame: number) => {
    if (frame <= 0) return 0;
    if (frame >= durationInFrames - 1) return last;
    let low = 0;
    let high = last;
    for (let i = 0; i < 32; i++) {
      const mid = (low + high) / 2;
      if (outputAt(mid) < frame / 2) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  };
  return {durationInFrames, frameAt};
};
