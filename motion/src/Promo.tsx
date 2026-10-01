import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import './sk.css';
import {Finger, Glass, GLYPH, INK, Mark, Phone, phoneScreen, Pixel, StatusBar, TabBar, breathStyle, mix} from './ui';

/* ─────────────────────────────────────────────────────────────────────────
   to.morrow — 20 s promo loop, 1920x1080 @ 30 fps (600 frames).

   0     "to.morrow" alone (also the last frames → no loop seam), held 1.5 s
   45    a task row builds itself around the name: plate, checkbox, grip
   72    pull back: the stack sits in "Tomorrow", between "Today" and "Soon"
   108   three moves between the panels: → Today, → Soon, Soon → Tomorrow
   244   CUT — plain background, "Never forget a task again."
   296   CUT — two phones: type a task, Go Live, it lands on the Lock Screen
   508   ticked off on the Lock Screen
   554   light floods out of the tick, back into frame 0
   ───────────────────────────────────────────────────────────────────────── */

export const FPS = 30;
export const DURATION = 600;
const W = 1920;
const H = 1080;

/* The app's own springs (SwiftUI response/damping → stiffness/damping, m=1):
   k = (2π/response)², c = 4π·damping/response. */
const SPR = {
  press: {mass: 1, stiffness: 584, damping: 32.9}, // response .26, damping .68
  layout: {mass: 1, stiffness: 246.7, damping: 27.0}, // .40 / .86
  present: {mass: 1, stiffness: 146, damping: 20.3}, // .52 / .84
};
const sp = (f: number, start: number, k: keyof typeof SPR) =>
  f < start ? 0 : spring({frame: f - start, fps: FPS, config: SPR[k]});
/* A swell: up to `amt` on touch-down, back on release (the app's press). */
const swell = (f: number, down: number, up: number, amt = 0.115) => 1 + amt * (sp(f, down, 'press') - sp(f, up, 'press'));
const ease = (f: number, a: number, b: number, e: (t: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], {easing: e, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/* 2 s breath cycle (shove95-live-button.md §7) */
const breathAt = (f: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * f) / 60);
type P = [number, number];
const qbez = (p0: P, p1: P, p2: P, t: number): P => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
};

/* Marketing type is the system face. W95FA stays where the app itself puts
   it — inside the phones' chrome — and nowhere else. */
const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif';

const Centered: React.FC<{x: number; y: number; style?: React.CSSProperties; children: React.ReactNode}> = ({x, y, style, children}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', ...style}}>{children}</div>
);

const Canvas: React.FC<{dark: boolean; children: React.ReactNode; flat?: boolean}> = ({dark, children, flat}) => (
  <AbsoluteFill
    className={`sk ${dark ? 'dark' : ''}`}
    style={{
      background: flat
        ? dark
          ? '#2C2D30'
          : '#CACFD6'
        : dark
          ? 'radial-gradient(120% 100% at 82% -12%, #36383C 0%, #2C2D30 52%, #242528 100%)'
          : 'radial-gradient(120% 100% at 82% -12%, #D9DDE3 0%, #CACFD6 52%, #C2C7CF 100%)',
      overflow: 'hidden',
    }}
  >
    {children}
  </AbsoluteFill>
);

/* Letters rise into place on the app's `present` spring. */
const Rise: React.FC<{text: string; f: number; start: number; step?: number; by?: 'char' | 'word'; style?: React.CSSProperties}> = ({
  text,
  f,
  start,
  step = 1.1,
  by = 'char',
  style,
}) => {
  const parts = by === 'word' ? text.split(/(\s+)/) : text.split('');
  let k = 0;
  return (
    <span style={{display: 'inline-flex', whiteSpace: 'pre', ...style}}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
        const p = sp(f, start + k++ * step, 'present');
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: clamp01(p * 1.3),
              transform: `translateY(${(1 - p) * (by === 'word' ? 44 : 30)}px)`,
              filter: by === 'word' ? `blur(${(1 - clamp01(p)) * 10}px)` : undefined,
            }}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
};

/* ═══ Scene 1 — three panels ════════════════════════════════════════════
   Today | Tomorrow | Soon as three screens side by side. Tasks are swiped
   from one to another; the destination list opens a slot and catches. */
const PZ = 1.7; // app scale inside the panels
const PANEL = {w: 560, h: 540, top: 330, gap: 40, pad: 30, listTop: 156};
const ROW_H = 56 * PZ;
const ROW_W = PANEL.w - PANEL.pad * 2;
const panelX = (i: number) => (W - (3 * PANEL.w + 2 * PANEL.gap)) / 2 + i * (PANEL.w + PANEL.gap);
const panelCX = (i: number) => panelX(i) + PANEL.w / 2;
const slotY = (slot: number) => PANEL.top + PANEL.listTop + ROW_H / 2 + slot * ROW_H;
const slotP = (panel: number, slot: number): P => [panelCX(panel), slotY(slot)];
const PANELS = [
  {title: 'Today', sub: 'Friday 4 September'},
  {title: 'Tomorrow', sub: 'Saturday 5 September'},
  {title: 'Soon', sub: 'Whenever it fits'},
];
const STACK_PEEK = 22;

type Move = {from: P; to: P; toPanel: number; appear: number; down: number; dragStart: number; release: number; land: number};
const M1: Move = {from: slotP(1, 0), to: slotP(0, 0), toPanel: 0, appear: 108, down: 116, dragStart: 118, release: 128, land: 150};
const M2: Move = {from: slotP(1, 0), to: slotP(2, 0), toPanel: 2, appear: 146, down: 154, dragStart: 156, release: 166, land: 188};
const M3: Move = {from: slotP(2, 1), to: slotP(1, 0), toPanel: 1, appear: 184, down: 192, dragStart: 194, release: 204, land: 228};
const MOVES = [M1, M2, M3];
const SWIPE_END = 244;

/* The opening: the name alone, then the row it really is builds around it. */
const BUILD = {plate: 45, slide: 51, check: 56, grip: 60, stack: 62};
const ZOOM_OUT: [number, number] = [72, 112];
const LOGO_PLATE_W = 260; // a pill hugging the centred name before it widens to a row
const TEXT_X = (14 + 33.3 + 10) * PZ; // where a row's title starts: padding + checkbox + gap

/* A flick, not a drag: the finger pulls the task 150px, accelerating, lets
   go, and the task glides on at about the speed it was let go with, lifting
   in a low arc, into its new slot. */
const DRAG = 150;
const DRAG_EASE = Easing.in(Easing.cubic);
const FLIGHT_EASE = Easing.bezier(0.22, 0.5, 0.3, 1);
const dirOf = (m: Move) => Math.sign(m.to[0] - m.from[0]);
const movePos = (m: Move, g: number): P => {
  const dir = dirOf(m);
  if (g < m.release) return [m.from[0] + dir * DRAG * ease(g, m.dragStart, m.release, DRAG_EASE), m.from[1]];
  const t = ease(g, m.release, m.land, FLIGHT_EASE);
  const x0 = m.from[0] + dir * DRAG;
  return [lerp(x0, m.to[0], t), lerp(m.from[1], m.to[1], t) - 46 * Math.sin(Math.PI * t)];
};
const liftOf = (m: Move, g: number) => clamp01(sp(g, m.down, 'press') - sp(g, m.land - 3, 'layout'));
const settle = (m: Move, g: number) => 1 - ease(g, m.land - 2, m.land + 12); // plate → plain row

type TaskState = {
  x: number;
  y: number;
  lift: number;
  plate: number;
  content: number;
  scale: number;
  dim: number;
  opacity?: number;
  // only the opening row uses these; every other row is at the defaults (fully built)
  plateW?: number;
  plateH?: number;
  textT?: number; // 0 = centred in the row, 1 = at its title position
  textScale?: number;
  textWeight?: number;
  check?: number;
  grip?: number;
};
type Task = {title: string; state: (g: number) => TaskState; move?: Move; moves: Move[]};

/* A row that never moves itself, only makes room: slot(g) may be fractional. */
const staticRow = (title: string, panel: number, slot: (g: number) => number): Task[] => [
  {title, moves: [], state: (g) => ({x: panelCX(panel), y: slotY(slot(g)), lift: 0, plate: 0, content: 1, scale: 1, dim: 0})},
];

const TASKS: Task[] = [
  ...staticRow('Doctors appointment', 0, (g) => sp(g, M1.release + 3, 'layout')),
  ...staticRow('Buy groceries', 0, (g) => 1 + sp(g, M1.release + 4, 'layout')),
  ...staticRow('Call grandma', 2, (g) => 1 + sp(g, M2.release + 4, 'layout') - sp(g, M3.release + 3, 'layout')),
  {
    title: 'Table reservation',
    moves: [M3],
    state: (g) => {
      const [x, y] = g < M3.dragStart ? [panelCX(2), slotY(0) + ROW_H * sp(g, M2.release + 3, 'layout')] : movePos(M3, g);
      const lift = liftOf(M3, g);
      return {x, y, lift, plate: ease(g, M3.down - 2, M3.down + 5) * settle(M3, g), content: 1, scale: 1 + 0.04 * lift, dim: 0};
    },
  },
  {
    title: 'Plan trip to Asia',
    moves: [M2],
    state: (g) => {
      // slides out from under the opening row, then waits at the back of the stack
      const emerge = sp(g, BUILD.stack, 'present');
      const fwd = sp(g, M1.release + 2, 'layout');
      const [x, y] = g < M2.dragStart ? [panelCX(1), slotY(0) + STACK_PEEK * emerge * (1 - fwd)] : movePos(M2, g);
      const lift = liftOf(M2, g);
      return {
        x,
        y,
        lift,
        plate: settle(M2, g),
        content: fwd,
        scale: (0.95 + 0.05 * fwd) * (1 + 0.04 * lift),
        dim: 1 - fwd,
        opacity: clamp01(emerge * 1.6),
      };
    },
  },
  {
    title: 'to.morrow',
    moves: [M1],
    state: (g) => {
      const [x, y] = movePos(M1, g);
      const lift = liftOf(M1, g);
      const grow = sp(g, BUILD.plate, 'layout');
      const slide = sp(g, BUILD.slide, 'layout');
      return {
        x,
        y,
        lift,
        plate: settle(M1, g) * clamp01(grow * 1.8),
        content: 1,
        scale: 1 + 0.04 * lift,
        dim: 0,
        plateW: lerp(LOGO_PLATE_W, ROW_W, grow),
        plateH: lerp(ROW_H * 0.82, ROW_H, grow),
        textT: slide,
        textScale: lerp(1.35, 1, slide),
        textWeight: lerp(620, 400, clamp01(slide)),
        check: sp(g, BUILD.check, 'press'),
        grip: ease(g, BUILD.grip, BUILD.grip + 8),
      };
    },
  },
];

/* Plate tone: --recess at 35% over the panel's --material, pre-mixed. */
const PLATE_RGB = '193,197,205';

const Row: React.FC<{title: string; s: TaskState; rot: number}> = ({title, s, rot}) => {
  const pw = s.plateW ?? ROW_W;
  const ph = s.plateH ?? ROW_H;
  const tT = s.textT ?? 1;
  const ck = s.check ?? 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: s.x - ROW_W / 2,
        top: s.y - ROW_H / 2,
        width: ROW_W,
        height: ROW_H,
        transform: `rotate(${rot}deg) scale(${s.scale})`,
        filter: s.dim > 0 ? `brightness(${1 - 0.035 * s.dim})` : undefined,
        opacity: s.opacity ?? 1,
      }}
    >
      {/* the plate — the "held" state, and the frame the opening row builds */}
      <div
        style={{
          position: 'absolute',
          left: (ROW_W - pw) / 2,
          top: (ROW_H - ph) / 2,
          width: pw,
          height: ph,
          borderRadius: 16 * PZ,
          background: `rgba(${PLATE_RGB},${s.plate})`,
          boxShadow:
            s.plate > 0.01
              ? `${-5 * PZ * (0.3 + s.lift)}px ${10 * PZ * (0.3 + s.lift)}px ${22 * PZ * (0.4 + s.lift)}px rgba(36,38,41,${(0.08 + 0.14 * s.lift) * s.plate}), ${-1 * PZ}px ${2 * PZ}px ${4 * PZ}px rgba(36,38,41,${0.07 * s.plate})`
              : 'none',
        }}
      />
      <div style={{position: 'absolute', inset: 0, opacity: s.content}}>
        <Glass
          h={33.3}
          z={PZ}
          rest
          style={{
            position: 'absolute',
            left: 14 * PZ,
            top: (ROW_H - 33.3 * PZ) / 2,
            width: 33.3 * PZ,
            height: 33.3 * PZ,
            borderRadius: 999,
            opacity: clamp01(ck * 1.5),
            transform: `scale(${0.4 + 0.6 * ck})`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `calc(${(1 - tT) * 50}% + ${tT * TEXT_X}px)`,
            transform: `translate(${-(1 - tT) * 50}%, -50%)`,
            fontSize: 17 * PZ * (s.textScale ?? 1),
            fontWeight: s.textWeight ?? 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: INK.light,
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        <svg
          width={22 * PZ}
          height={22 * PZ}
          viewBox="0 0 24 24"
          style={{position: 'absolute', right: 14 * PZ, top: (ROW_H - 22 * PZ) / 2, opacity: s.grip ?? 1}}
        >
          <path d="M4 9h16M4 15h16" fill="none" stroke="#787B80" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

const SwipeScene: React.FC<{f: number}> = ({f}) => {
  // camera: close on the stack, then pull back to all three panels
  const out = ease(f, ZOOM_OUT[0], ZOOM_OUT[1], Easing.bezier(0.6, 0, 0.2, 1));
  const s = lerp(3.2, 1, out);
  const fx = W / 2;
  const fy = lerp(slotY(0) + (STACK_PEEK / 2) * sp(f, BUILD.stack, 'present'), H / 2, out);
  const reveal = ease(f, ZOOM_OUT[0] + 16, ZOOM_OUT[1]);
  const panelsIn = ease(f, 44, 76); // the name stands on the bare canvas first

  const active = MOVES.filter((m) => f >= m.appear && f <= m.land + 14).pop();

  // which task is the one moving right now — drawn last, over everything
  const order = [...TASKS].sort((a, b) => Number(a.moves.includes(active as Move)) - Number(b.moves.includes(active as Move)));

  return (
    <Canvas dark={false}>
      <AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${W / 2 - fx * s}px, ${H / 2 - fy * s}px) scale(${s})`}}>
        {PANELS.map((p, i) => {
          const catching = MOVES.filter((m) => m.toPanel === i);
          const pSwell = catching.reduce((acc, m) => acc * swell(f, m.land - 3, m.land + 4, 0.018), 1);
          const lit = Math.max(
            0,
            ...catching.map((m) => interpolate(f, [m.release, m.land - 2, m.land + 30], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})),
          );
          return (
            <div
              key={p.title}
              className="sk-card"
              style={{
                ...({'--z': 0.9} as React.CSSProperties),
                position: 'absolute',
                left: panelX(i),
                top: PANEL.top,
                width: PANEL.w,
                height: PANEL.h,
                borderRadius: 40,
                transform: `scale(${pSwell})`,
                opacity: panelsIn,
              }}
            >
              <div style={{position: 'absolute', left: PANEL.pad + 4, top: 40, opacity: i === 1 ? reveal : 1, fontFamily: SYS}}>
                <div style={{fontSize: 46, fontWeight: 650, letterSpacing: '-0.025em', color: mix('#212224', '#3F5670', lit), lineHeight: 1.1}}>{p.title}</div>
                <div style={{fontSize: 23, color: '#787B80', marginTop: 8, letterSpacing: '-0.01em'}}>{p.sub}</div>
              </div>
            </div>
          );
        })}

        {/* the slot a flying task is about to land in */}
        {MOVES.map((m, i) => {
          const op = ease(f, m.release - 2, m.release + 8) * (1 - ease(f, m.land - 3, m.land + 4));
          if (op <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: m.to[0] - ROW_W / 2,
                top: m.to[1] - ROW_H / 2,
                width: ROW_W,
                height: ROW_H,
                borderRadius: 16 * PZ,
                background: 'rgba(155,161,171,.30)',
                boxShadow: 'inset 0 3px 8px rgba(36,38,41,.10)',
                opacity: op,
              }}
            />
          );
        })}

        {order.map((t) => {
          const st = t.state(f);
          const a = t.state(f - 0.5);
          const b = t.state(f + 0.5);
          const rot = Math.max(-6, Math.min(6, (b.x - a.x) * 0.11));
          return <Row key={t.title} title={t.title} s={st} rot={rot} />;
        })}

        {/* the finger on each flick */}
        {MOVES.map((m, i) => {
          if (f < m.appear || f > m.release + 10) return null;
          const [x, y] = movePos(m, Math.min(f, m.release));
          const show = ease(f, m.appear, m.appear + 6) * (1 - ease(f, m.release, m.release + 9));
          const sc = lerp(1.3, 1, sp(f, m.appear, 'layout')) * (1 - 0.08 * sp(f, m.down, 'press')) * lerp(1, 1.15, ease(f, m.release, m.release + 9));
          const ripple = f >= m.down && f <= m.down + 16 ? (f - m.down) / 16 : -1;
          return <Finger key={i} x={x - dirOf(m) * 120} y={y} d={70} opacity={show} scale={sc} dark={false} ripple={ripple} />;
        })}
      </AbsoluteFill>

      <Centered x={W / 2} y={226}>
        <Rise text="Swipe to shove." f={f} start={ZOOM_OUT[0] + 24} style={{fontFamily: SYS, fontSize: 62, fontWeight: 650, letterSpacing: '-0.03em', color: INK.light}} />
      </Centered>
    </Canvas>
  );
};

/* ═══ Scene 2 — the line ═══════════════════════════════════════════════ */
const TEXT_IN = SWIPE_END;
const TEXT_END = 296;
const TextScene: React.FC<{f: number}> = ({f}) => (
  <Canvas dark flat>
    <Centered x={W / 2} y={H / 2} style={{transform: `translate(-50%, -50%) scale(${lerp(1, 1.035, ease(f, TEXT_IN, TEXT_END, Easing.linear))})`}}>
      <Rise
        text="Never forget a task again."
        f={f}
        start={TEXT_IN + 1}
        step={4}
        by="word"
        style={{fontFamily: SYS, fontSize: 96, fontWeight: 650, letterSpacing: '-0.035em', color: INK.dark}}
      />
    </Centered>
  </Canvas>
);

/* ═══ Scene 3 — live ═══════════════════════════════════════════════════ */
const LIVE_CUT = TEXT_END;
const PH = 830; // phone height
const PTOP = (H - PH) / 2;
const PS = phoneScreen(PH);
const PL_CX = 600;
const PR_CX = 1320;
/* screen-space (390pt) → video px, for the phone whose centre is cx */
const toGlobal = (cx: number, x: number, y: number): P => [cx - PS.W / 2 + PS.x + x * PS.z, PTOP + PS.y + y * PS.z];

const TASK = 'Bring passport';
const TYPE_START = LIVE_CUT + 30;
const TYPE_GAPS = [3, 2, 3, 3, 2, 4, 3, 2, 3, 2, 3, 3, 2, 3];
const typed = (f: number) => {
  let t = TYPE_START;
  let n = 0;
  for (const g of TYPE_GAPS) {
    t += g;
    if (f >= t) n++;
  }
  return n;
};
const TYPE_END = TYPE_START + TYPE_GAPS.reduce((a, b) => a + b, 0);

const GO_LIVE = 380;
const ARRIVE = 418;
const TICK = 508;
const OFF_AIR = TICK + 26;

/* pill sits centred in the 390pt screen, bin beside it */
const PILL = {w: 190, h: 44, top: 470};
const PILL_LEFT = (390 - (PILL.w + 12 + 37)) / 2;
const PILL_C: P = [PILL_LEFT + PILL.w / 2, PILL.top + PILL.h / 2];
const NOTIF = {left: 14, top: 562, w: 362, h: 80};
const CHECK_C: P = [NOTIF.left + NOTIF.w - 18 - 16.65, NOTIF.top + NOTIF.h / 2];

const AppScreen: React.FC<{f: number}> = ({f}) => {
  const n = typed(f);
  const clear = ease(f, OFF_AIR + 2, OFF_AIR + 12);
  const typing = f >= TYPE_START && f < TYPE_END + 4;
  const caretOn = typing || Math.floor(f / 15) % 2 === 0;
  const onAir = f >= GO_LIVE && f < OFF_AIR;
  const b = onAir ? breathAt(f - GO_LIVE) : null;
  const state = f < TYPE_START + TYPE_GAPS[0] ? 'off' : f < GO_LIVE ? 'go' : f < OFF_AIR ? 'live' : 'off';
  const dipAt = (k: number) => 1 - 0.85 * clamp01(1 - Math.abs(f - k) / 3);
  const labelOp = dipAt(TYPE_START + TYPE_GAPS[0]) * dipAt(GO_LIVE) * dipAt(OFF_AIR);
  const pillSwell = swell(f, GO_LIVE, GO_LIVE + 7);
  const mark = breathStyle(true, b);
  const ink = INK.dark;

  return (
    <div className="sk dark" style={{position: 'absolute', inset: 0, background: '#2C2D30'}}>
      <StatusBar color={ink} />
      {/* workspace pill + gear */}
      <Glass h={40.6} z={1} style={{position: 'absolute', left: 21.5, top: 56, height: 40.6, padding: '0 14.8px', borderRadius: 20.3, display: 'flex', alignItems: 'center', gap: 12.2}}>
        <span className="chrome" style={{position: 'relative', fontSize: 19.7 * 1.22, lineHeight: 1, letterSpacing: '-0.02em'}}>
          Personal
        </span>
        <Pixel g={GLYPH.chevron} cell={1.1} color={ink} style={{position: 'relative'}} />
      </Glass>
      <Glass h={44.4} z={1} style={{position: 'absolute', right: 21.5, top: 54, width: 44.4, height: 44.4, borderRadius: 999, display: 'grid', placeItems: 'center'}}>
        <Pixel g={GLYPH.gear} cell={(22.2 * 0.82) / 12} color={ink} style={{position: 'relative'}} />
      </Glass>

      {/* the Live card */}
      <div className="sk-card" style={{...({'--z': 1} as React.CSSProperties), position: 'absolute', left: 21.5, top: 236, width: 347, height: 214, borderRadius: 30, display: 'grid', placeItems: 'center'}}>
        <div style={{position: 'relative', fontSize: 22, letterSpacing: '-0.02em', textAlign: 'center'}}>
          {n === 0 || clear > 0.5 ? (
            <span style={{color: '#707B8C', opacity: n === 0 ? 1 : clear * 2 - 1}}>What are you doing?</span>
          ) : (
            <span style={{color: ink, opacity: 1 - clear * 2}}>{TASK.slice(0, n)}</span>
          )}
          {f < OFF_AIR ? (
            <span
              style={{
                position: 'absolute',
                right: n === 0 ? 'auto' : -4,
                left: n === 0 ? -6 : 'auto',
                top: -2,
                width: 2.5,
                height: 30,
                borderRadius: 2,
                background: '#D6E5FF',
                opacity: caretOn && f < GO_LIVE ? 1 : 0,
              }}
            />
          ) : null}
        </div>
      </div>

      {/* Live pill + bin */}
      <Glass
        h={PILL.h}
        z={1}
        rest={state === 'off'}
        style={{
          position: 'absolute',
          left: PILL_LEFT,
          top: PILL.top,
          width: PILL.w,
          height: PILL.h,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          transform: `scale(${pillSwell})`,
        }}
      >
        <span style={{position: 'relative', display: 'flex', opacity: labelOp * (state === 'off' ? 0.55 : 1)}}>
          <Mark d={17.3} color={state === 'off' ? '#707B8C' : mark.color} style={state === 'live' ? mark.style : undefined} />
        </span>
        <span style={{position: 'relative', fontSize: 17, fontWeight: 500, color: state === 'off' ? '#707B8C' : ink, opacity: labelOp}}>
          {state === 'off' ? 'Off air' : state === 'go' ? 'Go Live' : 'Live'}
        </span>
      </Glass>
      <Glass h={37} z={1} style={{position: 'absolute', left: PILL_LEFT + PILL.w + 12, top: PILL.top + 3.5, width: 37, height: 37, borderRadius: 999, display: 'grid', placeItems: 'center'}}>
        <svg width="16" height="18" viewBox="0 0 16 18" style={{position: 'relative'}}>
          <path d="M1.5 4h13M6 4V2.2h4V4M3.2 4l.9 11.6c.1.9.8 1.4 1.6 1.4h4.6c.8 0 1.5-.5 1.6-1.4L12.8 4" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Glass>

      {/* tab bar, Live tab selected */}
      <div style={{position: 'absolute', left: 21.5, top: 844 - 34 - 51}}>
        <TabBar z={1} dark segW={390 - 43 - 51 - 12} liveSel={1} liveBreath={b} pill={null} />
      </div>
    </div>
  );
};

const LockScreen: React.FC<{f: number}> = ({f}) => {
  const wake = ease(f, ARRIVE - 6, ARRIVE + 6);
  const nIn = sp(f, ARRIVE, 'present');
  const checked = ease(f, TICK + 1, TICK + 5);
  const tick = sp(f, TICK + 2, 'press');
  const strike = ease(f, TICK + 4, TICK + 16);
  const gone = sp(f, TICK + 22, 'layout');
  const ink = INK.dark;
  return (
    <div className="sk dark" style={{position: 'absolute', inset: 0, background: 'linear-gradient(172deg, #425A76 0%, #31465E 26%, #2C2D30 62%, #202124 100%)'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(90% 55% at 78% 8%, rgba(102,130,162,.55) 0%, rgba(102,130,162,0) 70%)'}} />
      <StatusBar color={ink} />
      <div style={{position: 'absolute', top: 88, width: '100%', textAlign: 'center', fontSize: 21, fontWeight: 600, color: 'rgba(220,229,245,.88)'}}>Friday 4 September</div>
      <div
        style={{
          position: 'absolute',
          top: 106,
          width: '100%',
          textAlign: 'center',
          fontSize: 104,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'rgba(220,229,245,.92)',
          fontFamily: '"SF Pro Rounded", -apple-system, sans-serif',
        }}
      >
        16:39
      </div>

      {/* the Live Activity */}
      <Glass
        h={NOTIF.h}
        z={1}
        style={{
          position: 'absolute',
          left: NOTIF.left,
          top: NOTIF.top,
          width: NOTIF.w,
          height: NOTIF.h,
          borderRadius: 26,
          backgroundColor: 'rgba(32,33,36,.94)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px 0 24px',
          boxSizing: 'border-box',
          opacity: clamp01(nIn * 1.5) * (1 - gone),
          transform: `translateY(${(1 - nIn) * 44 - gone * 14}px) scale(${(0.9 + 0.1 * nIn) * (1 - 0.08 * gone)})`,
        }}
      >
        <div style={{position: 'relative', flex: 1, fontSize: 18, letterSpacing: '-0.02em', color: mix('#DCE5F5', '#9FAABD', checked)}}>
          <span style={{position: 'relative'}}>
            Bring passport
            <span style={{position: 'absolute', left: -2, top: '54%', height: 1.8, width: `calc(${strike * 100}% + 4px)`, background: '#9FAABD', opacity: strike > 0 ? 1 : 0}} />
          </span>
        </div>
        <div style={{position: 'relative', width: 33.3, height: 33.3}}>
          <Glass h={33.3} z={1} rest style={{position: 'absolute', inset: 0, borderRadius: 999, opacity: 1 - checked}} />
          <Glass h={33.3} z={1} style={{position: 'absolute', inset: 0, borderRadius: 999, opacity: checked, display: 'grid', placeItems: 'center'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" style={{position: 'relative', transform: `scale(${0.3 + 0.7 * tick})`}}>
              <path d="M4.5 12.6l5 5 10-10.2" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Glass>
        </div>
      </Glass>

      {/* torch + camera, home indicator */}
      {[46, 390 - 46 - 50].map((x, i) => (
        <Glass key={x} h={50} z={1} style={{position: 'absolute', left: x, top: 744, width: 50, height: 50, borderRadius: 999, display: 'grid', placeItems: 'center', backgroundColor: 'rgba(32,33,36,.55)'}}>
          {i === 0 ? (
            <svg width="16" height="22" viewBox="0 0 16 22" style={{position: 'relative'}}>
              <path d="M2 1.5h12v3.5l-3 4V20.5H5V9L2 5z" fill="none" stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M8 12v3" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="24" height="19" viewBox="0 0 24 19" style={{position: 'relative'}}>
              <path d="M2 5.5h4.2L8 2.5h8l1.8 3H22v12H2z" fill="none" stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
              <circle cx="12" cy="11" r="3.6" fill="none" stroke={ink} strokeWidth="1.6" />
            </svg>
          )}
        </Glass>
      ))}
      <div style={{position: 'absolute', left: 128, bottom: 9, width: 134, height: 5, borderRadius: 3, background: 'rgba(220,229,245,.85)'}} />

      {/* screen off until the Live Activity wakes it */}
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: 1 - wake}} />
    </div>
  );
};

/* ─── Camera for the live scene ──────────────────────────────────────────
   s = zoom, (fx, fy) = the scene point that sits at the centre of frame.
   Wide → into the app (type, go live) → out for the hand-over → into the
   Lock Screen. Each focus leaves the phone off-centre, with a column beside
   it for the caption. */
type Cam = {s: number; fx: number; fy: number};
const CAM_WIDE: Cam = {s: 1, fx: W / 2, fy: H / 2};
const CAM_L: Cam = {s: 1.5, fx: 840, fy: 487};
const CAM_R: Cam = {s: 1.5, fx: 1053, fy: 537};
const CAM_KEYS: Array<[number, Cam]> = [
  [LIVE_CUT + 10, CAM_WIDE],
  [LIVE_CUT + 36, CAM_L],
  [GO_LIVE + 4, CAM_L],
  [GO_LIVE + 30, CAM_WIDE],
  [ARRIVE + 2, CAM_WIDE],
  [ARRIVE + 28, CAM_R],
];
const camAt = (f: number): Cam => {
  if (f <= CAM_KEYS[0][0]) return CAM_KEYS[0][1];
  for (let i = 0; i < CAM_KEYS.length - 1; i++) {
    const [a, ca] = CAM_KEYS[i];
    const [b, cb] = CAM_KEYS[i + 1];
    if (f <= b) {
      const t = ease(f, a, b, Easing.inOut(Easing.cubic));
      return {s: lerp(ca.s, cb.s, t), fx: lerp(ca.fx, cb.fx, t), fy: lerp(ca.fy, cb.fy, t)};
    }
  }
  return CAM_KEYS[CAM_KEYS.length - 1][1];
};
const toScreen = (p: P, c: Cam): P => [(p[0] - c.fx) * c.s + W / 2, (p[1] - c.fy) * c.s + H / 2];

const Caption: React.FC<{lines: string[]; f: number; start: number; out: number; x: number; y: number; align: 'left' | 'right'}> = ({
  lines,
  f,
  start,
  out,
  x,
  y,
  align,
}) => {
  const fade = 1 - ease(f, out, out + 8);
  if (f < start || fade <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        ...(align === 'left' ? {left: x} : {right: W - x}),
        transform: 'translateY(-50%)',
        fontFamily: SYS,
        fontSize: 52,
        fontWeight: 650,
        letterSpacing: '-0.03em',
        lineHeight: 1.12,
        color: INK.dark,
        textAlign: align,
        opacity: fade,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'left' ? 'flex-start' : 'flex-end',
      }}
    >
      {lines.map((line, i) => (
        <Rise key={line} text={line} f={f} start={start + i * 5} step={3} by="word" />
      ))}
    </div>
  );
};

const LiveScene: React.FC<{f: number}> = ({f}) => {
  const cam = camAt(f);

  const pillG = toGlobal(PL_CX, PILL_C[0], PILL_C[1]);
  const notifG = toGlobal(PR_CX, NOTIF.left + NOTIF.w / 2, NOTIF.top + NOTIF.h / 2);
  const checkG = toGlobal(PR_CX, CHECK_C[0], CHECK_C[1]);

  // the packet: the Live ring travelling from the pill to the Lock Screen
  const P0: P = [pillG[0], pillG[1] - 10];
  const P2: P = [notifG[0] - 60, notifG[1]];
  const P1: P = [(P0[0] + P2[0]) / 2, Math.min(P0[1], P2[1]) - 380];
  const TRAVEL_A = GO_LIVE + 6;
  const TRAVEL_B = ARRIVE - 2;
  const tNow = ease(f, TRAVEL_A, TRAVEL_B, Easing.inOut(Easing.sin));
  const traveling = f >= TRAVEL_A && f <= TRAVEL_B;
  const CELL = 8;
  const dots: React.ReactNode[] = [];
  if (f >= TRAVEL_A && f <= TRAVEL_B + 24) {
    const steps = 46;
    for (let i = 1; i < steps; i++) {
      const ti = i / steps;
      if (ti > tNow) break;
      // the frame this dot was laid down on (inverse of the sine ease), so the trail fades from its tail
      const laid = lerp(TRAVEL_A, TRAVEL_B, Math.asin(2 * ti - 1) / Math.PI + 0.5);
      const op = clamp01(1 - (f - laid) / 16);
      if (op <= 0) continue;
      const [x, y] = qbez(P0, P1, P2, ti);
      dots.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: Math.round(x / CELL) * CELL - CELL / 2,
            top: Math.round(y / CELL) * CELL - CELL / 2,
            width: CELL,
            height: CELL,
            background: '#D6E5FF',
            opacity: op * 0.85,
          }}
        />,
      );
    }
  }
  const [px, py] = qbez(P0, P1, P2, tNow);
  const pkSize = interpolate(f, [TRAVEL_A, TRAVEL_A + 6, TRAVEL_B - 4, TRAVEL_B], [0.4, 1, 1, 0.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const rings = (c: P, start: number, maxR: number, count = 3) =>
    Array.from({length: count}, (_, i) => {
      const t = (f - start - i * 5) / 26;
      if (t < 0 || t > 1) return null;
      const r = lerp(14, maxR, Easing.out(Easing.cubic)(t));
      return (
        <div
          key={`${start}-${i}`}
          style={{
            position: 'absolute',
            left: c[0] - r,
            top: c[1] - r,
            width: r * 2,
            height: r * 2,
            borderRadius: 999,
            border: '2px solid #D6E5FF',
            boxSizing: 'border-box',
            opacity: (1 - t) * 0.55,
          }}
        />
      );
    });

  const fingerAt = (c: P, down: number) =>
    f >= down - 12 && f <= down + 14 ? (
      <Finger
        x={c[0] + lerp(40, 0, ease(f, down - 12, down - 1))}
        y={c[1] + lerp(46, 0, ease(f, down - 12, down - 1))}
        d={64}
        opacity={ease(f, down - 12, down - 7) * (1 - ease(f, down + 6, down + 14))}
        scale={(1 - 0.08 * sp(f, down, 'press')) * lerp(1, 1.15, ease(f, down + 6, down + 14))}
        dark
        ripple={f >= down && f <= down + 16 ? (f - down) / 16 : -1}
      />
    ) : null;

  return (
    <Canvas dark>
      {/* everything on or between the phones moves with the camera */}
      <AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${W / 2 - cam.fx * cam.s}px, ${H / 2 - cam.fy * cam.s}px) scale(${cam.s})`}}>
        <Phone left={PL_CX - PS.W / 2} top={PTOP} H={PH}>
          <AppScreen f={f} />
        </Phone>
        <Phone left={PR_CX - PS.W / 2} top={PTOP} H={PH}>
          <LockScreen f={f} />
        </Phone>

        {rings(pillG, GO_LIVE + 1, 120)}
        {dots}
        {traveling ? (
          <Centered x={px} y={py} style={{transform: `translate(-50%, -50%) scale(${pkSize})`, filter: 'drop-shadow(0 0 14px rgba(214,229,255,.65))'}}>
            <Pixel g={GLYPH.live} cell={5} color="#E8F2FC" />
          </Centered>
        ) : null}
        {rings(notifG, ARRIVE - 1, 230, 2)}

        {fingerAt(pillG, GO_LIVE)}
        {fingerAt(checkG, TICK)}
      </AbsoluteFill>

      <Caption lines={['One task,', 'always in view.']} f={f} start={LIVE_CUT + 30} out={GO_LIVE + 4} x={938} y={520} align="left" />
      <Caption lines={['Right on your', 'Lock Screen.']} f={f} start={ARRIVE + 22} out={9999} x={1022} y={560} align="right" />
    </Canvas>
  );
};

/* ─── The way back: light floods out of the tick into frame 0 ────────── */
const circleClip = (c: P, r: number) => `circle(${r}px at ${c[0]}px ${c[1]}px)`;
const FLOOD_R = 2300;
const FLOOD = {start: TICK + 46, end: TICK + 80};
const checkScreen = toScreen(toGlobal(PR_CX, CHECK_C[0], CHECK_C[1]), camAt(FLOOD.start));

export const Promo: React.FC = () => {
  const f = useCurrentFrame();
  const r = FLOOD_R * ease(f, FLOOD.start, FLOOD.end, Easing.bezier(0.55, 0, 0.25, 1));
  return (
    <AbsoluteFill style={{background: '#CACFD6'}}>
      {f < SWIPE_END ? <SwipeScene f={f} /> : null}
      {f >= TEXT_IN && f < TEXT_END ? <TextScene f={f} /> : null}
      {f >= LIVE_CUT && f < FLOOD.end + 1 ? <LiveScene f={f} /> : null}
      {f >= FLOOD.start ? (
        <AbsoluteFill style={{clipPath: f >= FLOOD.end ? undefined : circleClip(checkScreen, r)}}>
          <SwipeScene f={0} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
