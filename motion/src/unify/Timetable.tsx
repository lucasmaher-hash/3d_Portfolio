import React from 'react';
import {Img, staticFile} from 'remotion';
import {clamp01, CREAM, CSS, DARK, NUNITO, PINK} from './lib';

/* ─────────────────────────────────────────────────────────────────────────
   The shared timetable — a port of the app's Timetable tab
   (stundenplan.html + stundenplan.css), in the app's own CSS px. Same
   structure, same flex rules, same numbers; the scene scales it as a whole.
   ───────────────────────────────────────────────────────────────────────── */

const u = (f: string) => staticFile(`unify/${f}`);

export type Day = 'montag' | 'dienstag' | 'mittwoch';
/* `figs` overrides the figure per person (the break shows the home screen's own friend art) */
type Course = {title: string; room: string; time: string; people?: string[]; figs?: Record<string, string>};

/* courseData from stundenplan.html, week 1 (base start 09:00, back to back). */
export const DAYS: Record<Day, {pink: Course[]; cream: Course[]}> = {
  montag: {
    pink: [
      {title: 'Interface Design', room: '(1.019)', time: '09:00-10:30', people: ['Sophia', 'James']},
      {title: 'Math', room: '(2.013)', time: '10:30-12:00'},
    ],
    cream: [{title: 'Ping Pong Duel', room: '(outdoor)', time: '12:00-13:00', people: ['Anna', 'Konst', 'Zoe', 'Nam']}],
  },
  dienstag: {
    pink: [
      {title: 'Prototyping', room: '(1.104)', time: '09:00-10:30'},
      {title: 'ID Fundamentals', room: '(1.019)', time: '10:30-12:00', people: ['Greg', 'Anna', 'James', 'Sophia', 'Michi']},
    ],
    // the Socials tab's own time for it (19:00-21:30); the timetable's back-to-back
    // scheduler put it at 12:00, which would collide with the break block
    cream: [{title: 'Movie Night', room: '(0.012)', time: '19:00-21:30', people: ['Greg', 'Michi']}],
  },
  // The film's Wednesday (Lucas, 2026-10-05): Ergonomics, then the app's own
  // Wednesday course CAD Modeling under it — the one whose people row "who's in
  // your course" shows, so that beat needs its own scroll down from the days.
  // Book Club (Thursday's social in the app) is the uni activity in the cream
  // block, with its own stop. Four friends in the course, two at the activity (Lucas).
  mittwoch: {
    pink: [
      {title: 'Ergonomics', room: '(1.031)', time: '09:00-10:30'},
      {title: 'CAD Modeling', room: '(1.026)', time: '10:30-12:00', people: ['Konst', 'Zoe', 'Sophia', 'Anna']},
    ],
    cream: [{title: 'Book Club', room: '(0.220)', time: '17:00-18:30', people: ['Greg', 'Michi']}],
  },
};

/* stundenplan.html's figureMap */
const FIG: Record<string, string> = {
  Greg: 'figur_1.svg', Anna: 'figur_2.svg', James: 'figur_3.svg', Sophia: 'figur_4.svg', Naomi: 'figur_3.svg',
  Michi: 'figur_5.svg', Konst: 'figur_6.svg', Zoe: 'figur_4.svg', Nam: 'figur_7.svg',
};

const T19: CSS = {fontFamily: NUNITO, fontWeight: 800, fontSize: 19, color: DARK, margin: 0};

/* A person in a course's people row. `t` is a spring (0 → 1, overshooting):
   each one bounces into existence from its feet. */
const Person: React.FC<{name: string; src: string; t: number; h?: number}> = ({name, src, t, h = 81}) => (
  <div
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
      height: h, width: 66, padding: '0 1px', boxSizing: 'border-box', flex: 'none',
      opacity: clamp01(t * 3), transform: `scale(${Math.max(0, t)})`, transformOrigin: '50% 100%',
    }}
  >
    <span style={{position: 'relative', width: 51.2, height: 34.4, display: 'block', flex: 'none'}}>
      <Img src={u(src)} style={{position: 'absolute', top: 0, left: 0, width: 51.2, height: 34.4, display: 'block', objectFit: 'contain'}} />
    </span>
    <p style={{margin: '2px 0 0 0', fontFamily: NUNITO, fontWeight: 400, fontSize: 20, color: DARK, textAlign: 'center', lineHeight: 1.05}}>{name}</p>
  </div>
);

/* A course with people is 186 tall (98 + its people row); `expand` < 1 holds it
   at the height of a course without people and grows it from there, so a row
   only makes room for its friends once they arrive. */
export const COURSE_H = 98;
export const PEOPLE_ROW_H = 88;
/* The COMPACT row — the break and the uni activity (Lucas, 2026-10-05: 30%
   shorter, closed and open): no empty headroom in the person boxes, less air
   under the friends, and the break drops its blank room line. Its height is
   always explicit, so the camera's model of it (ttLayout) is exact. The break:
   closed 64 + its 16px top padding = 80 (was 114), open 125 + 16 = 141 (was
   202); the activity keeps its room line, so 17px more either way. */
const compactHead = (c: Course) => (c.room ? 63 : 46); // the 3px line + the title row (60, or 43 with no room line)
const COMPACT_AIR = 18; // under the title while closed
const COMPACT_PERSON_H = 58; // a person's own figure + name, nothing above
export const COMPACT_GROW = 61; // what the people row adds: 6 + 58 + 15, less the closed air
export const BREAK_ROW = 46 + COMPACT_AIR;
export const SOCIAL_ROW = 63 + COMPACT_AIR;
const CourseRow: React.FC<{c: Course; personT: (name: string, i: number) => number; expand?: number; compact?: boolean}> = ({c, personT, expand = 1, compact}) => {
  const people = !!c.people?.length;
  const size: CSS = compact
    ? {height: compactHead(c) + COMPACT_AIR + COMPACT_GROW * expand, overflow: 'hidden'}
    : !people ? {height: COURSE_H} : expand < 1 ? {height: COURSE_H + PEOPLE_ROW_H * expand, overflow: 'hidden'} : {height: 'auto', minHeight: 142};
  return (
    <div style={{width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', ...size}}>
      <div style={{height: 3, background: DARK, width: 336, margin: '0 auto', flexShrink: 0}} />
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0', width: 336, margin: '0 auto', gap: 8, flexShrink: 0, ...(compact ? {height: compactHead(c) - 3, boxSizing: 'border-box'} : {})}}>
        <div style={{display: 'flex', flexDirection: 'column', flex: 1}}>
          <p style={{...T19, lineHeight: 1, marginBottom: c.room ? 2 : 0}}>{c.title}</p>
          {c.room ? <p style={{...T19, lineHeight: 1}}>{c.room}</p> : null}
        </div>
        <p style={{...T19, fontWeight: 500, whiteSpace: 'nowrap', textAlign: 'right', flexShrink: 0}}>{c.time}</p>
      </div>
      {people ? (
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px 3px', width: '100%', padding: compact ? '6px 0 15px' : '2px 0 40px', alignItems: 'flex-start', flexShrink: 0, justifyContent: 'flex-start', boxSizing: 'border-box'}}>
          {c.people!.map((p, i) => (
            <Person key={p} name={p} src={c.figs?.[p] ?? FIG[p]} t={personT(c.title, i)} h={compact ? COMPACT_PERSON_H : undefined} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

/* The week arrow (icon_arrow_week.svg), inside its 16px-padded button. */
const WeekArrow: React.FC<{prev?: boolean}> = ({prev}) => (
  <span style={{padding: 16, display: 'flex', alignItems: 'center', transform: prev ? 'rotate(180deg)' : undefined}}>
    <Img src={u('icon_arrow_week.svg')} style={{display: 'block', width: 26, height: 20.9}} />
  </span>
);

export const DAY_LETTERS = ['m', 'd', 'm', 'd', 'f'];

/* `slide` is the app's day-switch: the new day's courses come in from the side
   moved toward (34px + fade, .45s). `activeDay` index into DAY_LETTERS;
   `dayFill` lets the active disc cross-fade from the old day to the new. */
export const SpCard: React.FC<{
  day: Day;
  slide?: number;
  activeFrom?: number;
  activeTo?: number;
  activeT?: number;
  personT?: (course: string, i: number) => number;
  style?: CSS;
}> = ({day, slide = 1, activeFrom = 0, activeTo = 0, activeT = 1, personT = () => 1, style}) => {
  const d = DAYS[day];
  const slideStyle: CSS = slide >= 1 ? {} : {opacity: clamp01(slide), transform: `translateX(${(1 - slide) * 34}px)`};
  return (
    <div style={{position: 'relative', width: 377, flex: 'none', fontFamily: NUNITO, ...style}}>
      {/* tab header: the active (pink) tab on the left, "Socials" on the dark */}
      <div style={{display: 'flex', height: 60}}>
        <div style={{flex: 'none', background: PINK, height: 60, width: 184, borderRadius: '25px 25px 0 0'}} />
        <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NUNITO, fontWeight: 800, fontSize: 24, color: CREAM}}>Socials</div>
      </div>
      {/* pink panel: week, days, regular courses */}
      <div style={{width: 377, boxSizing: 'border-box', background: PINK, borderRadius: '0 22px 0 0', marginTop: -1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0'}}>
          <WeekArrow prev />
          <span style={{...T19, width: 39, display: 'inline-block'}}>7.3</span>
          <span style={{...T19, width: 123, textAlign: 'center', display: 'inline-block'}}>till</span>
          <span style={{...T19, width: 50, textAlign: 'right', display: 'inline-block'}}>13.3</span>
          <WeekArrow />
        </div>
        <div style={{display: 'flex', gap: 42, padding: '10px 0', justifyContent: 'center'}}>
          {DAY_LETTERS.map((l, i) => {
            const a = i === activeTo ? activeT : i === activeFrom ? 1 - activeT : 0;
            return (
              <span
                key={i}
                style={{
                  width: 32, height: 31.8, borderRadius: 27.6, border: `3px solid ${DARK}`, boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `rgba(41,41,37,${a})`, ...T19, color: a > 0.5 ? CREAM : DARK, padding: 0,
                }}
              >
                {l}
              </span>
            );
          })}
        </div>
        {d.pink.map((c) => (
          <div key={c.title} style={slideStyle}>
            <CourseRow c={c} personT={personT} />
          </div>
        ))}
      </div>
      {/* cream panel: the social activities you joined */}
      <div style={{width: 377, boxSizing: 'border-box', background: CREAM, borderRadius: '0 0 22px 22px', padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden'}}>
        {d.cream.map((c) => (
          <div key={c.title} style={slideStyle}>
            <CourseRow c={c} personT={personT} />
          </div>
        ))}
      </div>
      {/* the tab's face: pink blob + eyes, then the dark mouth holding the label */}
      <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: 0}}>
        <Img src={u('tab_face_stundenplan.svg')} style={{position: 'absolute', left: 20, top: -36, width: 142, height: 46, display: 'block'}} />
        <Img src={u('tab_mouth_stundenplan.svg')} style={{position: 'absolute', left: 8.4, top: 10.8, width: 167.6, height: 48.2, display: 'block'}} />
        <p style={{position: 'absolute', left: 8.4, top: 10.8, width: 167.6, height: 48.2, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NUNITO, fontWeight: 800, fontSize: 24, color: CREAM, whiteSpace: 'nowrap'}}>
          Timetable
        </p>
      </div>
    </div>
  );
};

/* ── The film's timetable (Lucas, 2026-10-05) ─────────────────────────────
   No tab header and no week row: it starts at the days. A BREAK section — a
   compact course row, the friends who are on a break right now — sits
   between the courses and the socials as its own rounded block, with a gap
   either side. */
export const BREAK: Course = {
  // no room line (Lucas); the compact row skips it altogether
  // three of the home screen's friends on a break (Lucas) — Nam and Yas are the two opened on "connect now"
  title: 'break', room: '', time: '12:00-12:45', people: ['Paul', 'Nam', 'Yas'],
  figs: {Paul: 'friend_paul.svg', Nam: 'friend_nam.svg', Yas: 'friend_yas.svg'},
};
export const TT_GAP = 16;
/* Heights with every people row collapsed (0) or grown (1) — the film's camera
   reads them to follow the page as sections open. */
/* a little air above the days, now that no tab header sits there (Lucas) */
export const DAYS_PAD = 8;
export const ttLayout = (eCourse: number, eBreak: number, eSocial: number, pinkCourses = 2) => {
  // days + the pink courses (pinkCourses may be fractional while a day switch resizes the panel)
  const pink = DAYS_PAD + 51.8 + (4 + COURSE_H) * pinkCourses + PEOPLE_ROW_H * eCourse;
  const breakTop = pink + TT_GAP;
  const breakH = 16 + BREAK_ROW + COMPACT_GROW * eBreak;
  const creamTop = breakTop + breakH + TT_GAP;
  const creamH = 16 + SOCIAL_ROW + COMPACT_GROW * eSocial; // the activity: a compact row like the break
  return {pink, breakTop, breakH, creamTop, creamH, h: creamTop + creamH};
};

export const SharedTimetable: React.FC<{
  day: Day;
  slide?: number;
  activeFrom?: number;
  activeTo?: number;
  activeT?: number;
  personT?: (course: string, i: number) => number;
  blockT?: (i: number) => number;
  expandT?: (course: string) => number;
  pinkH?: number;
}> = ({day, slide = 1, activeFrom = 0, activeTo = 0, activeT = 1, personT = () => 1, blockT = () => 1, expandT = () => 1, pinkH}) => {
  const d = DAYS[day];
  const slideStyle: CSS = slide >= 1 ? {} : {opacity: clamp01(slide), transform: `translateX(${(1 - slide) * 34}px)`};
  const block = (i: number): CSS => {
    const t = blockT(i);
    return {opacity: clamp01(t * 1.5), transform: `translateY(${(1 - t) * 24}px) scale(${0.94 + 0.06 * t})`};
  };
  return (
    <div style={{width: 377, fontFamily: NUNITO, display: 'flex', flexDirection: 'column', gap: TT_GAP}}>
      <div style={{width: 377, boxSizing: 'border-box', background: PINK, borderRadius: 22, padding: `${DAYS_PAD}px 16px 0`, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden', height: pinkH, ...block(0)}}>
        <div style={{display: 'flex', gap: 42, padding: '10px 0', justifyContent: 'center'}}>
          {DAY_LETTERS.map((l, i) => {
            const a = i === activeTo ? activeT : i === activeFrom ? 1 - activeT : 0;
            return (
              <span
                key={i}
                style={{
                  width: 32, height: 31.8, borderRadius: 27.6, border: `3px solid ${DARK}`, boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `rgba(41,41,37,${a})`, ...T19, color: a > 0.5 ? CREAM : DARK, padding: 0,
                }}
              >
                {l}
              </span>
            );
          })}
        </div>
        {d.pink.map((c) => (
          <div key={c.title} style={slideStyle}>
            <CourseRow c={c} personT={personT} expand={expandT(c.title)} />
          </div>
        ))}
      </div>
      <div style={{width: 377, boxSizing: 'border-box', background: PINK, borderRadius: 22, padding: '16px 16px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...block(1)}}>
        <CourseRow c={BREAK} personT={personT} expand={expandT(BREAK.title)} compact />
      </div>
      <div style={{width: 377, boxSizing: 'border-box', background: CREAM, borderRadius: 22, padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden', ...block(2)}}>
        {d.cream.map((c) => (
          <div key={c.title} style={slideStyle}>
            <CourseRow c={c} personT={personT} expand={expandT(c.title)} compact />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Friends list under the card (stundenplan.html's friend rows) ───────── */
type FriendCourse = {title: string; time: string; room: string};
type Friend = {name: string; room: string; monster: string; online?: boolean; bubbleLeft?: number; dy: number; courses: FriendCourse[]; socials: FriendCourse[]};
export const FRIENDS: Friend[] = [
  {name: 'Emil', room: '0.012', monster: 'friend_monster_1.svg', online: true, dy: 0,
    courses: [{title: 'Interface Design', time: '09:00-10:30', room: '1.019'}, {title: 'Typography', time: '11:00-12:30', room: '2.004'}, {title: 'Photography', time: '14:00-15:30', room: '0.112'}],
    socials: [{title: 'Semester Kickoff', time: '20:00-23:00', room: 'Aula'}]},
  {name: 'Yasira', room: '1.104', monster: 'friend_monster_3.svg', bubbleLeft: 57, online: true, dy: 0, courses: [], socials: []},
  {name: 'Jonas', room: '2.007', monster: 'friend_monster_6.svg', online: true, dy: 0, courses: [], socials: []},
  {name: 'Lena', room: '0.220', monster: 'friend_monster_8.svg', bubbleLeft: 32, dy: -6, courses: [], socials: []},
  {name: 'Theo', room: '1.019', monster: 'friend_monster_2.svg', dy: -2, courses: [], socials: []},
];
const NAME_X = 83;

const FriendCourseItem: React.FC<{c: FriendCourse}> = ({c}) => (
  <span style={{display: 'flex', flexDirection: 'column', padding: '2px 18px 32px', textAlign: 'left'}}>
    <span style={{height: 3, background: DARK, width: '100%', display: 'block', flexShrink: 0}} />
    <span style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, paddingTop: 6}}>
      <span style={{...T19}}>{c.title}</span>
      <span style={{...T19, fontWeight: 500, whiteSpace: 'nowrap'}}>{c.time}</span>
    </span>
    <span style={{...T19, fontWeight: 500}}>{c.room}</span>
  </span>
);

/* `open` 0→1 is the row's own expand (grid 0fr→1fr, .35s ease). */
export const FriendRow: React.FC<{f: Friend; open?: number}> = ({f, open = 0}) => {
  const isOpen = open > 0;
  const bl = isOpen ? 47 : f.bubbleLeft ?? 47;
  const social = f.socials.length > 0;
  return (
    <div style={{position: 'relative', width: 362, minHeight: 71, padding: `0 0 0 ${bl}px`, display: 'flex', alignItems: 'flex-start', boxSizing: 'border-box', textAlign: 'left'}}>
      <Img src={u(f.monster)} style={{position: 'absolute', left: -3, top: f.dy, width: 84, height: 71, zIndex: 1}} />
      <span
        style={{
          position: 'relative', zIndex: 0, flex: 1, minHeight: 47, marginTop: 12, background: CREAM,
          borderRadius: `0 22px 22px ${22 * Math.min(1, open * 3)}px`, display: 'flex', flexDirection: 'column',
          padding: isOpen ? `10px 0 ${social ? 0 : 10}px` : `6px 12px 6px ${NAME_X - bl}px`, boxSizing: 'border-box',
        }}
      >
        <span style={{display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box', padding: isOpen ? '0 18px 0 36px' : 0}}>
          <span style={{fontFamily: NUNITO, fontWeight: 800, fontSize: 27.6, color: DARK, flex: 1, textAlign: 'left'}}>{f.name}</span>
          <span style={{fontFamily: NUNITO, fontWeight: 800, fontSize: 24, color: f.online ? '#37C35F' : 'rgba(41,41,37,0.47)'}}>{f.room}</span>
          <span style={{width: 35, height: 35, flex: 'none', borderRadius: 999, border: `3px solid ${DARK}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${180 * (1 - open)}deg)`}}>
            <Img src={u('icon_chevron_up.svg')} style={{width: 19, height: 19, display: 'block'}} />
          </span>
        </span>
        <span style={{display: 'grid', gridTemplateRows: `${open}fr`, width: '100%'}}>
          <span style={{overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: isOpen ? 10 : 0}}>
            {f.courses.map((c) => (
              <FriendCourseItem key={c.title} c={c} />
            ))}
            {social ? (
              <span style={{background: PINK, borderRadius: '0 0 22px 22px', display: 'flex', flexDirection: 'column', paddingTop: 10, paddingBottom: 2}}>
                {f.socials.map((c) => (
                  <FriendCourseItem key={c.title} c={c} />
                ))}
              </span>
            ) : null}
          </span>
        </span>
      </span>
    </div>
  );
};

/* The pinned search bar above the list. */
export const SearchBar: React.FC = () => (
  <div style={{width: 377, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 11px 10px 20px', borderRadius: 23, background: 'rgba(255,255,255,0.2)', border: '3px solid #fff'}}>
    <Img src={u('icon_search.svg')} style={{width: 20, height: 20, display: 'block', flex: 'none'}} />
    <p style={{margin: 0, fontFamily: NUNITO, fontWeight: 800, fontSize: 19, color: '#fff'}}>search friends</p>
  </div>
);
