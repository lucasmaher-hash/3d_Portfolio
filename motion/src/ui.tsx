import React from 'react';
import {Img, staticFile} from 'remotion';

type CSS = React.CSSProperties;
const vars = (o: Record<string, string | number>) => o as unknown as CSS;

/* ─── Colour helpers ─────────────────────────────────────────────────── */
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};

export const INK = {light: '#212224', dark: '#DCE5F5'};
/* The breath pushes ink AWAY from the page: to black on light, to white on dark. */
export const breathInk = (dark: boolean, b: number) =>
  dark ? mix('#DCE5F5', '#FFFFFF', b) : mix('#212224', '#000000', b);

/* ─── Pixel glyphs — cells transcribed from shove95-components-demo.html ─ */
type Cells = Array<[number, number]>;
const rows = (r: Record<number, number[]>): Cells =>
  Object.entries(r).flatMap(([y, xs]) => xs.map((x) => [x, Number(y)] as [number, number]));
const span = (a: number, b: number) => Array.from({length: b - a + 1}, (_, i) => a + i);

export const GLYPH = {
  // app — ring quantised from a circle, 3x3 core
  live: {
    w: 11,
    h: 11,
    cells: rows({
      0: [4, 5, 6], 1: span(2, 8), 2: [1, 2, 3, 7, 8, 9], 3: [1, 2, 8, 9],
      4: [0, 1, 4, 5, 6, 9, 10], 5: [0, 1, 4, 5, 6, 9, 10], 6: [0, 1, 4, 5, 6, 9, 10],
      7: [1, 2, 8, 9], 8: [1, 2, 3, 7, 8, 9], 9: span(2, 8), 10: [4, 5, 6],
    }),
  },
  grip: {w: 12, h: 12, cells: rows({3: span(2, 9), 6: span(2, 9), 9: span(2, 9)})},
  gear: {
    w: 12,
    h: 12,
    cells: [
      ...rows({2: span(2, 9), 3: span(2, 9), 8: span(2, 9), 9: span(2, 9)}),
      ...rows({4: [2, 3, 8, 9], 5: [2, 3, 8, 9], 6: [2, 3, 8, 9], 7: [2, 3, 8, 9]}),
      ...rows({0: [5, 6], 1: [5, 6], 10: [5, 6], 11: [5, 6]}),
      ...rows({5: [0, 1, 10, 11], 6: [0, 1, 10, 11]}),
      ...rows({1: [1, 10], 10: [1, 10]}),
    ] as Cells,
  },
  chevron: {w: 12, h: 7, cells: rows({1: [0, 9], 2: [1, 8], 3: [2, 7], 4: [3, 6], 5: [4, 5]})},
  // drawn to match, on the same grid language
  arrowL: {w: 9, h: 7, cells: rows({0: [3], 1: [2], 2: [1], 3: span(0, 8), 4: [1], 5: [2], 6: [3]})},
  arrowR: {w: 9, h: 7, cells: rows({0: [5], 1: [6], 2: [7], 3: span(0, 8), 4: [7], 5: [6], 6: [5]})},
};

export const Pixel: React.FC<{g: {w: number; h: number; cells: Cells}; cell: number; color?: string; style?: CSS}> = ({
  g,
  cell,
  color = 'currentColor',
  style,
}) => (
  <svg
    width={g.w * cell}
    height={g.h * cell}
    viewBox={`0 0 ${g.w} ${g.h}`}
    shapeRendering="crispEdges"
    style={{display: 'block', flex: 'none', ...style}}
  >
    {g.cells.map(([x, y]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
    ))}
  </svg>
);

/* ─── Glass ──────────────────────────────────────────────────────────── */
export const Glass: React.FC<{
  h: number;
  z: number;
  rest?: boolean;
  className?: string;
  style?: CSS;
  children?: React.ReactNode;
}> = ({h, z, rest, className = '', style, children}) => (
  <div className={`sk-glass ${rest ? 'sk-glass--rest' : ''} ${className}`} style={{...vars({'--h': h, '--z': z}), ...style}}>
    {children}
  </div>
);

/* ─── Vector live mark (pills, buttons) ──────────────────────────────── */
export const Mark: React.FC<{d: number; color: string; style?: CSS}> = ({d, color, style}) => (
  <div
    style={{
      position: 'relative',
      width: d,
      height: d,
      flex: 'none',
      borderRadius: 999,
      border: `${(d * 1.7) / 17.3}px solid ${color}`,
      boxSizing: 'border-box',
      ...style,
    }}
  >
    <div style={{position: 'absolute', inset: 0, margin: 'auto', width: '42%', height: '42%', borderRadius: 999, background: color}} />
  </div>
);

/* Breath: 0 = small end, 1 = large end (shove95-live-button.md §7). */
export const breathStyle = (dark: boolean, b: number | null, swell = 1): {color: string; style: CSS} => {
  if (b === null) return {color: dark ? INK.dark : INK.light, style: {transform: `scale(${swell})`}};
  return {
    color: breathInk(dark, b),
    style: {opacity: 0.28 + 0.72 * b, transform: `scale(${(0.88 + 0.2 * b) * swell})`},
  };
};

/* ─── The Live button ────────────────────────────────────────────────── */
export const LiveButton: React.FC<{n: number; dark: boolean; selected: number; breath: number | null; swell?: number}> = ({
  n,
  dark,
  selected,
  breath,
  swell = 1,
}) => {
  const m = breathStyle(dark, breath, swell);
  return (
    <div className="live" style={vars({'--n': n})}>
      <span className="live__bloom" />
      <span className="live__trough" />
      <span className="live__contour" />
      <span className="live__glass" style={{opacity: selected}}>
        <span className="live__lens">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="live__relief" />
        <span className="live__glow" />
        <span className="live__rim" />
      </span>
      <span className="live__mark" style={{borderColor: m.color, ...m.style}}>
        <i style={{background: m.color}} />
      </span>
    </div>
  );
};

/* ─── Tab bar: Live + Today / Tomorrow / Soon ────────────────────────── */
export const TAB = {liveW: 51, gap: 12, segW: 260, h: 51, padX: 8.2, optGap: 3};
export const TAB_LABELS = ['Today', 'Tomorrow', 'Soon'];
export const tabWidth = (segW = TAB.segW) => TAB.liveW + TAB.gap + segW;
/* x-centre of option i, relative to the bar's left edge, in design px */
export const tabOptionX = (i: number, segW = TAB.segW) => {
  const optW = (segW - TAB.padX * 2 - TAB.optGap * 2) / 3;
  return TAB.liveW + TAB.gap + TAB.padX + optW * (i + 0.5) + TAB.optGap * i;
};

export const TabBar: React.FC<{
  z: number;
  dark: boolean;
  segW?: number;
  liveSel: number;
  liveBreath: number | null;
  liveSwell?: number;
  pill: number | null;
  catchOpacity?: number[];
  catchScale?: number[];
  labelSwell?: number[];
  labelLit?: number[];
}> = ({z, dark, segW = TAB.segW, liveSel, liveBreath, liveSwell = 1, pill, catchOpacity = [0, 0, 0], catchScale = [1, 1, 1], labelSwell = [1, 1, 1], labelLit = [0, 0, 0]}) => {
  const ink = dark ? INK.dark : INK.light;
  const muted = dark ? '#9FAABD' : '#515357';
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: TAB.gap * z}}>
      <LiveButton n={34.6 * z} dark={dark} selected={liveSel} breath={liveBreath} swell={liveSwell} />
      <div
        className="sk-trough"
        style={{
          ...vars({'--h': TAB.h, '--z': z}),
          width: segW * z,
          height: TAB.h * z,
          borderRadius: 999,
          display: 'flex',
          gap: TAB.optGap * z,
          padding: `0 ${TAB.padX * z}px`,
          boxSizing: 'border-box',
        }}
      >
        <span className="sk-trough__bloom" />
        {TAB_LABELS.map((label, i) => (
          <div key={label} style={{position: 'relative', flex: 1, display: 'grid', placeItems: 'center'}}>
            {pill === i ? (
              <Glass h={34.6} z={z} style={{position: 'absolute', left: 0, right: 0, top: 8.2 * z, bottom: 8.2 * z, borderRadius: 999}} />
            ) : null}
            {catchOpacity[i] > 0.001 ? (
              <Glass
                h={34.6}
                z={z}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 8.2 * z,
                  bottom: 8.2 * z,
                  borderRadius: 999,
                  opacity: catchOpacity[i],
                  transform: `scale(${catchScale[i]})`,
                }}
              />
            ) : null}
            <span
              className="chrome"
              style={{
                position: 'relative',
                fontSize: 16.4 * 1.22 * z,
                lineHeight: 1,
                color: pill === i ? ink : mix(dark ? '#9FAABD' : '#515357', dark ? '#DCE5F5' : '#212224', labelLit[i]),
                transform: `scale(${labelSwell[i]})`,
                display: 'inline-block',
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── A task row in its held/swiped state ────────────────────────────────
   Rows are text on the ground; only when held does one lift onto a plate
   (--recess at 35% on light). The plate is pre-mixed to an opaque tone so
   two stacked plates do not show through each other. */
export const PLATE = {light: '#B4B9C1', dark: '#35373B'};
export const TaskPlate: React.FC<{title: string; z: number; w: number; lift: number; dark?: boolean; plain?: boolean; style?: CSS}> = ({
  title,
  z,
  w,
  lift,
  dark = false,
  plain = false,
  style,
}) => {
  const k = z / 1;
  return (
    <div
      style={{
        position: 'absolute',
        width: w,
        height: 56 * z,
        borderRadius: 16 * z,
        background: PLATE[dark ? 'dark' : 'light'],
        boxSizing: 'border-box',
        padding: `0 ${18 * k}px`,
        display: 'flex',
        alignItems: 'center',
        gap: 10 * z,
        boxShadow: plain
          ? 'none'
          : `${-4 * z * (0.4 + lift)}px ${8 * z * (0.4 + lift)}px ${18 * z * (0.5 + lift)}px rgba(36,38,41,${0.1 + 0.12 * lift}), ${-1 * z}px ${2 * z}px ${4 * z}px rgba(36,38,41,.08)`,
        ...style,
      }}
    >
      <Glass h={33.3} z={z} rest style={{width: 33.3 * z, height: 33.3 * z, borderRadius: 999, flex: 'none'}} />
      <div style={{flex: 1, fontSize: 17 * z, letterSpacing: '-0.02em', color: dark ? INK.dark : INK.light, whiteSpace: 'nowrap'}}>{title}</div>
      <Pixel g={GLYPH.grip} cell={1.6 * z} color={dark ? '#707B8C' : '#787B80'} />
    </div>
  );
};

/* ─── A finger, drawn as a glass disc ────────────────────────────────── */
export const Finger: React.FC<{x: number; y: number; d: number; opacity: number; scale: number; dark: boolean; ripple?: number}> = ({
  x,
  y,
  d,
  opacity,
  scale,
  dark,
  ripple = -1,
}) => (
  <>
    {ripple >= 0 && ripple <= 1 ? (
      <div
        style={{
          position: 'absolute',
          left: x - d / 2,
          top: y - d / 2,
          width: d,
          height: d,
          borderRadius: 999,
          border: `${2.5}px solid ${dark ? 'rgba(214,229,255,.7)' : 'rgba(33,34,36,.45)'}`,
          boxSizing: 'border-box',
          transform: `scale(${0.7 + ripple * 1.1})`,
          opacity: (1 - ripple) * 0.9,
        }}
      />
    ) : null}
    <Glass
      h={d}
      z={1}
      style={{
        position: 'absolute',
        left: x - d / 2,
        top: y - d / 2,
        width: d,
        height: d,
        borderRadius: 999,
        opacity,
        transform: `scale(${scale})`,
        backgroundColor: dark ? 'rgba(214,229,255,.16)' : 'rgba(255,255,255,.34)',
      }}
    />
  </>
);

/* ─── Phone: the to.morrow page's own transparent frame over a screen ── */
export const PHONE_RATIO = 792 / 1600;
export const phoneScreen = (H: number) => {
  const W = H * PHONE_RATIO;
  return {W, x: (W * 44) / 792, y: (H * 38) / 1600, w: (W * 704) / 792, h: (H * 1524) / 1600, r: (W * 84) / 792, z: (W * 704) / 792 / 390};
};

export const Phone: React.FC<{left: number; top: number; H: number; style?: CSS; children: React.ReactNode}> = ({left, top, H, style, children}) => {
  const s = phoneScreen(H);
  return (
    <div style={{position: 'absolute', left, top, width: s.W, height: H, ...style}}>
      <div
        style={{
          position: 'absolute',
          left: s.x - 2,
          top: s.y - 2,
          width: s.w + 4,
          height: s.h + 4,
          borderRadius: s.r + 2,
          overflow: 'hidden',
          boxShadow: '-26px 46px 70px rgba(9,9,10,.55), -8px 14px 22px rgba(9,9,10,.35)',
        }}
      >
        <div style={{position: 'absolute', left: 2, top: 2, width: 390, height: 844, transform: `scale(${s.z})`, transformOrigin: '0 0'}}>
          {children}
        </div>
      </div>
      <Img src={staticFile('phone-frame.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
    </div>
  );
};

/* ─── iOS status bar, in the screen's 390pt space ───────────────────── */
export const StatusBar: React.FC<{color: string}> = ({color}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 50, color}}>
    <div style={{position: 'absolute', left: 38, top: 16, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em'}}>09:41</div>
    <svg style={{position: 'absolute', right: 30, top: 19}} width="76" height="14" viewBox="0 0 76 14">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={10 - i * 3} width="3.4" height={4 + i * 3} rx="1" fill={color} />
      ))}
      <path d="M33 5.2a10 10 0 0 1 13 0l-1.6 1.7a7.6 7.6 0 0 0-9.8 0zM35.6 8a6.2 6.2 0 0 1 7.8 0l-1.7 1.8a3.8 3.8 0 0 0-4.4 0zM38.3 10.9a2.2 2.2 0 0 1 2.4 0L39.5 12.3z" fill={color} />
      <rect x="51" y="1.5" width="21" height="11" rx="3.4" fill="none" stroke={color} strokeOpacity=".45" />
      <rect x="53" y="3.5" width="15" height="7" rx="1.8" fill={color} />
      <rect x="73.3" y="5" width="1.6" height="4" rx=".8" fill={color} fillOpacity=".45" />
    </svg>
  </div>
);

/* ─── Wordmark: "t◉.morrow" with the Live ring breathing in the first o ── */
export const Wordmark: React.FC<{size: number; dark: boolean; breath: number}> = ({size, dark, breath}) => {
  const ink = dark ? INK.dark : INK.light;
  const cell = Math.round((size * 0.56) / 11);
  const b = breath;
  const ring = breathInk(dark, b);
  return (
    <div className="chrome" style={{display: 'flex', alignItems: 'baseline', fontSize: size, lineHeight: 1, color: ink, whiteSpace: 'nowrap'}}>
      <span>t</span>
      <span style={{display: 'inline-block', width: size * 0.62, position: 'relative', height: size * 0.56}}>
        <span style={{position: 'absolute', left: (size * 0.62 - cell * 11) / 2, bottom: 0, opacity: 0.45 + 0.55 * b, transform: `scale(${0.9 + 0.14 * b})`}}>
          <Pixel g={GLYPH.live} cell={cell} color={ring} />
        </span>
      </span>
      <span>.morrow</span>
    </div>
  );
};
