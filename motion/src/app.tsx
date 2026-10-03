import React from 'react';
import {BOX_LEFT, BOX_NUDGE, CheckRing, CIRCLE_LINE, Glass, GLYPH, Grip, LiveGlyph, Pal, PIXEL, Pixel, ROW, Trough, rgba, mix, mixHex, sf} from './ui';

/* ─────────────────────────────────────────────────────────────────────────
   The app's screens' building blocks, at the app's own metrics. Every size
   is in points and multiplied by `z` (video px per pt). Sources in the app:
   SkeuRootView (rows, tab bar, workspace bar), SkeuLiveSection (Live box,
   Live switch, Go pill, bin), PinnedTaskLiveActivity (Lock Screen card).
   ───────────────────────────────────────────────────────────────────────── */

type CSS = React.CSSProperties;

/* SkeuPulse: small end opacity .28 / scale .88; large end opacity 1 / scale
   1.08 / brightness pushed away from the page. b: 0 = small, 1 = large. */
export const pulseStyle = (p: Pal, b: number | null): CSS =>
  b === null
    ? {}
    : {
        opacity: 0.28 + 0.72 * b,
        transform: `scale(${0.88 + 0.2 * b})`,
        filter: `brightness(${1 + (p.dark ? 0.32 : -0.34) * b * 1.6})`,
      };

/* ─── Task row ───────────────────────────────────────────────────────── */
export const TaskRow: React.FC<{
  title: string;
  w: number; // row width in pt
  z: number;
  p: Pal;
  checked?: number; // 0..1
  slat?: number; // 0..1 — the lit slat a row wears while it is being slid
  inWell?: boolean;
  check?: number; // 0..1 — the checkbox's own entrance
  checkDraw?: number; // 0..1 — instead, the ring's line is drawn round from the top
  grip?: number; // 0..1
  titleOpacity?: number;
  titleNode?: React.ReactNode; // replaces the title text (typing)
  slatInset?: [number, number]; // pt in from the left / right — the slat growing out of its title
  style?: CSS;
}> = ({title, w, z, p, checked = 0, slat = 0, inWell = true, check = 1, checkDraw, grip = 1, titleOpacity = 1, titleNode, slatInset = [0, 0], style}) => {
  const slatA = slat;
  return (
    <div style={{position: 'relative', width: w * z, height: ROW.h * z, ...style}}>
      {slatA > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: slatInset[0] * z,
            right: slatInset[1] * z,
            borderRadius: 16 * z,
            /* opaque, pre-mixed over the well's floor: two stacked slats
               must occlude each other, not darken where they overlap */
            background: p.dark ? p.materialTop : mixHex(p.recessBottom, p.recess, inWell ? 0.6 : 0.35),
            opacity: slat,
          }}
        />
      ) : null}
      {/* the checkbox, centred in its 44pt touch square */}
      <div
        style={{
          position: 'absolute',
          left: BOX_LEFT * z,
          top: ((ROW.h - ROW.check) / 2) * z,
          width: ROW.check * z,
          height: ROW.check * z,
          opacity: Math.min(1, check * 1.6),
          transform: `scale(${0.5 + 0.5 * check})`,
        }}
      >
        <CheckRing d={ROW.check} z={z} draw={checkDraw} style={{position: 'absolute', inset: 0, opacity: 1 - checked}} />
        {checked > 0 ? (
          <Glass h={ROW.check} z={z} p={p} prominent style={{position: 'absolute', inset: 0, opacity: checked, display: 'grid', placeItems: 'center'}}>
            <Pixel g={GLYPH.check} cell={(11 * 1.85 * z) / 12} color={p.ink} style={{position: 'relative'}} />
          </Glass>
        ) : null}
      </div>
      <div
        style={{
          position: 'absolute',
          left: (ROW.touch + ROW.gap) * z,
          right: (ROW.touch + ROW.trail) * z,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          ...sf(ROW.label, z, 400, -0.02),
          lineHeight: 1.19,
          color: checked > 0.5 ? p.inkMuted : p.ink,
          textDecoration: checked > 0.5 ? `line-through ${p.inkMuted}` : undefined,
          whiteSpace: 'nowrap',
          opacity: titleOpacity,
        }}
      >
        {titleNode ?? title}
      </div>
      <div
        style={{
          position: 'absolute',
          right: ROW.trail * z,
          top: 0,
          bottom: 0,
          width: ROW.touch * z,
          display: 'grid',
          placeItems: 'center',
          opacity: grip,
        }}
      >
        <Grip z={z} color={p.inkFaint} />
      </div>
    </div>
  );
};

/* The list's last row: an empty circle and "add". */
export const AddRow: React.FC<{w: number; z: number; p: Pal; text?: React.ReactNode; style?: CSS}> = ({w, z, p, text, style}) => (
  <div style={{position: 'relative', width: w * z, height: ROW.h * z, ...style}}>
    <CheckRing d={ROW.check} z={z} style={{position: 'absolute', left: BOX_LEFT * z, top: ((ROW.h - ROW.check) / 2) * z}} />
    <div
      style={{
        position: 'absolute',
        left: (ROW.touch + ROW.gap) * z,
        top: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        ...sf(ROW.label, z, 400, -0.02),
        color: text === undefined ? p.inkFaint : p.ink,
      }}
    >
      {text === undefined ? 'add' : text}
    </div>
  </div>
);

/* ─── Tab bar: the Live trough + Today / Tomorrow / Soon ─────────────── */
export const TabBar: React.FC<{
  w: number; // total width in pt
  z: number;
  p: Pal;
  liveSelected: boolean;
  pill: number | null; // selected bucket
  liveBreath?: number | null;
  liveSwell?: number;
}> = ({w, z, p, liveSelected, pill, liveBreath = null, liveSwell = 1}) => {
  const H = 51;
  const pillH = H - 8.2 * 2;
  const segW = w - H - 16;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 16 * z, width: w * z}}>
      <Trough z={z} p={p} refH={H} radius="pill" bloom style={{width: H * z, height: H * z, flex: 'none'}}>
        <div style={{position: 'absolute', inset: 8.2 * z, display: 'grid', placeItems: 'center'}}>
          {liveSelected ? <Glass h={pillH} z={z} p={p} style={{position: 'absolute', inset: 0}} /> : null}
          <div style={{position: 'relative', transform: `scale(${liveSwell})`}}>
            <LiveGlyph d={pillH * 0.5 * z} color={p.ink} line={1.7 * z} style={pulseStyle(p, liveBreath)} />
          </div>
        </div>
      </Trough>
      <Trough z={z} p={p} refH={H} radius="pill" bloom style={{width: segW * z, height: H * z, flex: 'none'}}>
        <div style={{position: 'absolute', inset: `0 ${8.2 * z}px`, display: 'flex', gap: 3 * z}}>
          {['Today', 'Tomorrow', 'Soon'].map((label, i) => (
            <div key={label} style={{position: 'relative', flex: 1, display: 'grid', placeItems: 'center'}}>
              {pill === i ? <Glass h={pillH} z={z} p={p} style={{position: 'absolute', left: 0, right: 0, top: 8.2 * z, bottom: 8.2 * z}} /> : null}
              <span
                style={{
                  position: 'relative',
                  fontFamily: PIXEL,
                  fontSize: 16.4 * 1.22 * z,
                  letterSpacing: `${-0.02 * 16.4 * z}px`,
                  color: p.ink,
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </Trough>
    </div>
  );
};

/* ─── Workspace pill + gear (the top bar) ────────────────────────────── */
export const TopBar: React.FC<{w: number; z: number; p: Pal}> = ({w, z, p}) => {
  const rowH = 40.6;
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: w * z}}>
      <Glass h={rowH} z={z} p={p} radius={rowH / 2} style={{height: rowH * z, padding: `0 ${14.8 * z}px`, display: 'flex', alignItems: 'center', gap: 12.2 * z}}>
        <span style={{position: 'relative', fontFamily: PIXEL, fontSize: 19.7 * 1.22 * z, letterSpacing: `${-0.02 * 19.7 * z}px`, color: p.ink, lineHeight: 1}}>
          Personal
        </span>
        <svg width={10.8 * z} height={6.3 * z} viewBox="0 0 10.8 6.3" style={{position: 'relative'}}>
          <path d="M0.8 0.8 L5.4 5.5 L10 0.8" fill="none" stroke={p.ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Glass>
      <Glass h={44.4} z={z} p={p} style={{width: 44.4 * z, height: 44.4 * z, display: 'grid', placeItems: 'center'}}>
        <Pixel g={GLYPH.gear} cell={(22.2 * 0.82 * z) / 12} color={p.ink} style={{position: 'relative'}} />
      </Glass>
    </div>
  );
};

/* ─── The Live box (SkeuLiveSection.box) ─────────────────────────────── */
export const LiveBox: React.FC<{w: number; h: number; z: number; p: Pal; children?: React.ReactNode}> = ({w, h, z, p, children}) => (
  <Trough z={z} p={p} refH={64} radius={22} fillStop={0.26} shadeScale={0.65} fillLift={0.55} style={{width: w * z, height: h * z}}>
    <div
      style={{
        position: 'absolute',
        inset: 20 * z,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        ...sf(22, z, 500),
        color: p.ink,
        lineHeight: 1.2,
      }}
    >
      {children}
    </div>
  </Trough>
);

/* The trash glyph, drawn (SF Symbols cannot be used on the web). */
export const Trash: React.FC<{s: number; color: string}> = ({s, color}) => (
  <svg width={s} height={s * 1.13} viewBox="0 0 16 18" style={{position: 'relative', display: 'block'}}>
    <path
      d="M1.4 3.6h13.2M5.6 3.6V2.2c0-.6.4-1 1-1h2.8c.6 0 1 .4 1 1v1.4M2.9 3.6l.8 12.1c.05.8.7 1.3 1.4 1.3h5.8c.7 0 1.35-.5 1.4-1.3l.8-12.1M6.3 6.6v7.6M9.7 6.6v7.6M8 6.6v7.6"
      fill="none"
      stroke={color}
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ─── The knob: version E's Go Live glyph ──────────────────────────────
   The app's Live ring + dot, NOT glass (Lucas), drawn at 28pt and placed so
   its CENTRE is exactly where the open checkbox's centre is relative to its
   title — 32.2pt left of the text (half the 44pt touch square + the 10.2pt
   gap). The transition then only shrinks the circle; it never slides. Its
   line is the shared CIRCLE_LINE. */
// (−0.36pt: layout inside the scaled phone lands the ring a hair right of the maths — measured at the cut)
// the ring sits where the open box's centre sits relative to its title, so the box's nudge
// moves it right INSIDE the pill: pad grows and gap shrinks by the same amount, pill unchanged
export const KNOB = {d: 28, pad: 8.2 + BOX_NUDGE, gap: ROW.touch / 2 + ROW.gap - 28 / 2 - 0.36 - BOX_NUDGE, line: CIRCLE_LINE};
export const Knob: React.FC<{z: number; p: Pal; style?: CSS}> = ({z, p, style}) => (
  <LiveGlyph d={KNOB.d * z} color={p.ink} line={KNOB.line * z} style={{position: 'relative', ...style}} />
);

/* ─── Live controls: the switch (or the Go pill) and the bin ─────────── */
export const LiveControls: React.FC<{
  screenW: number;
  z: number;
  p: Pal;
  mode: 'off' | 'go' | 'live';
  breath: number | null;
  hasText: boolean;
  swell?: number;
  reveal?: {pill: number; glyph: number; bin: number}; // the "Go Live" transition builds the button round its label
  knob?: boolean; // E: the glyph is the Live ring + dot — what the new task's checkbox turns into
  knobBreath?: {opacity: number; scale: number}; // E: the ring keeps breathing in the pill
}> = ({screenW, z, p, mode, breath, hasText, swell = 1, reveal = {pill: 1, glyph: 1, bin: 1}, knob = false, knobBreath}) => {
  const H = 44.4;
  const width = screenW * 0.68;
  const label: CSS = {...sf(16.4, z, 500), lineHeight: 1, position: 'relative'};
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 * z, width: width * z}}>
      {mode === 'go' ? (
        <Glass
          h={H}
          z={z}
          p={p}
          bodyOpacity={reveal.pill}
          style={{
            height: H * z,
            padding: knob ? `0 ${20 * z}px 0 ${KNOB.pad * z}px` : `0 ${20 * z}px`,
            display: 'flex',
            alignItems: 'center',
            gap: (knob ? KNOB.gap : 8) * z,
            transform: `scale(${swell})`,
          }}
        >
          {knob ? (
            <Knob z={z} p={p} style={{opacity: reveal.glyph * (knobBreath?.opacity ?? 1), transform: `scale(${knobBreath?.scale ?? 1})`}} />
          ) : (
            <LiveGlyph d={H * 0.42 * z} color={p.ink} line={1.7 * z} style={{position: 'relative', opacity: reveal.glyph, transform: `scale(${0.6 + 0.4 * reveal.glyph})`}} />
          )}
          {/* E: the label is set exactly like a task title (regular) — it IS the task "Go Live" */}
          <span
            style={{
              ...label,
              // −0.72pt: inside the scaled phone the label's line box rounds 3px lower on screen
              // than the same words in the list — measured across the cut and taken back here
              ...(knob ? {...sf(ROW.label, z, 400, -0.02), top: -0.54 * z} : {}),
              color: p.ink,
            }}
          >
            Go Live
          </span>
        </Glass>
      ) : (
        <Glass h={H} z={z} p={p} style={{height: H * z, flex: 1, display: 'grid', placeItems: 'center', transform: `scale(${swell})`}}>
          <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 8 * z, opacity: mode === 'live' ? 1 : 0.55, ...pulseStyle(p, mode === 'live' ? breath : null)}}>
            <LiveGlyph d={H * 0.42 * z} color={mode === 'live' ? p.accent : p.inkMuted} line={1.7 * z} />
            <span style={{...label, color: mode === 'live' ? p.ink : p.inkMuted}}>{mode === 'live' ? 'Live' : 'Off air'}</span>
          </div>
        </Glass>
      )}
      <Glass h={H} z={z} p={p} style={{width: H * z, height: H * z, flex: 'none', display: 'grid', placeItems: 'center', opacity: reveal.bin}}>
        <div style={{opacity: hasText ? 1 : 0.55}}>
          <Trash s={22.2 * 0.72 * z} color={p.ink} />
        </div>
      </Glass>
    </div>
  );
};

/* ─── Lock Screen card (PinnedTaskLiveActivity.SkeuCardView) ────────────
   iOS draws the activity's own rounded container in the activity's tint
   (the palette's material); the app puts a second card inside it, 8pt in,
   with a 1pt rim fading down from the light edge, and a 44pt check button. */
export const LockCard: React.FC<{w: number; z: number; p: Pal; title: string; done: number; strike: number; checkSwell?: number}> = ({
  w,
  z,
  p,
  title,
  done,
  strike,
  checkSwell = 1,
}) => {
  const surface = p.material;
  const outer = p.dark ? mix(surface, '#FFFFFF', 0.05) : mix(surface, '#FFFFFF', 0.45);
  const strokeRing = (r: number, top: number, bottom: number): CSS => ({
    position: 'absolute',
    inset: 0,
    borderRadius: r,
    padding: 1 * z,
    background: `linear-gradient(to bottom, ${rgba(p.edgeLight, top)}, ${rgba(p.edgeLight, bottom)})`,
    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    WebkitMaskComposite: 'xor',
    mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    maskComposite: 'exclude',
  });
  return (
    <div style={{position: 'relative', width: w * z, borderRadius: 26 * z, background: outer, padding: 8 * z, boxSizing: 'border-box'}}>
      <div style={{position: 'relative', borderRadius: 22 * z, background: surface, padding: 18 * z, display: 'flex', alignItems: 'center', gap: 14 * z}}>
        <div style={strokeRing(22 * z, 0.85, 0.04)} />
        <div
          style={{
            position: 'relative',
            flex: 1,
            ...sf(17, z, 500),
            color: mix(p.ink, p.inkMuted, done),
            lineHeight: 1.25,
          }}
        >
          <span style={{position: 'relative'}}>
            {title}
            <span style={{position: 'absolute', left: -2 * z, top: '55%', height: 1.4 * z, width: `calc(${strike * 100}% + ${4 * z}px)`, background: p.inkMuted, opacity: strike > 0 ? 1 : 0}} />
          </span>
        </div>
        <div
          style={{
            position: 'relative',
            width: 44 * z,
            height: 44 * z,
            borderRadius: 999,
            background: surface,
            boxShadow: `0 ${3 * z}px ${10 * z}px ${rgba(p.shadow, 0.35)}`,
            display: 'grid',
            placeItems: 'center',
            transform: `scale(${checkSwell})`,
          }}
        >
          <div style={strokeRing(999, 0.9, 0.05)} />
          <svg width={17 * z} height={17 * z} viewBox="0 0 24 24" style={{position: 'relative'}}>
            <path d="M2.6 13.2l6.4 7L21.6 3.6" fill="none" stroke={p.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};
