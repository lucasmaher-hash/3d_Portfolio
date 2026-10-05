import React from 'react';
import {Img, staticFile} from 'remotion';
import {CSS, PINK, WALL} from './lib';

/* ─────────────────────────────────────────────────────────────────────────
   The campus map — the app's 1.F floor plan (map.html, #mapBg1FCourses):
   the walls as one SVG (map_1f_walls.svg, strokes in the app's flat
   #938E87), the course rooms as separate pink rects UNDER the walls, so each
   can grow in on its own. Coordinates are the plan's own units (4569 x 2411).
   ───────────────────────────────────────────────────────────────────────── */

export const PLAN_W = 4569;
export const PLAN_H = 2411;

/* The Courses tab's pink rooms (data-room / data-course from map.html) */
export const ROOMS = [
  {x: 2059, y: 591, w: 461, h: 276, room: '1.102', course: 'Motion Design'},
  {x: 2054, y: 1022, w: 461, h: 217, room: '1.045', course: 'Illustration'},
  {x: 334, y: 788, w: 134, h: 494, room: '1.007', course: 'Photography'},
  {x: 894, y: 1025, w: 171, h: 214, room: '1.018', course: 'Typography'},
  {x: 1411, y: 1025, w: 171, h: 214, room: '1.026', course: 'Math'},
  {x: 1588, y: 1067, w: 151, h: 286, room: '1.031', course: 'Ergonomics'},
  {x: 2828, y: 1068, w: 145, h: 278, room: '1.088', course: 'Statistics'},
  {x: 3148, y: 1018, w: 169, h: 219, room: '1.095', course: 'Ceramics'},
  {x: 4107, y: 794, w: 130, h: 489, room: '1.112', course: 'ID Grundlagen'},
  {x: 1745, y: 1522, w: 344, h: 293, room: '1.052', course: 'Service Design'},
];

/* `walls` opacity, `rooms(i)` 0→1 growth of each pink room. Rendered at
   `scale` px per plan unit; position it with the wrapper. */
export const Plan: React.FC<{scale: number; walls: number; rooms: (i: number) => number; style?: CSS}> = ({scale, walls, rooms, style}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: PLAN_W * scale, height: PLAN_H * scale, ...style}}>
    {ROOMS.map((r, i) => {
      const t = rooms(i);
      if (t <= 0) return null;
      return (
        <div
          key={r.room}
          style={{
            position: 'absolute', left: r.x * scale, top: r.y * scale, width: r.w * scale, height: r.h * scale, background: PINK,
            transform: `scale(${Math.max(0, t)})`, transformOrigin: 'center', borderRadius: (1 - Math.min(1, t)) * 40 * scale,
          }}
        />
      );
    })}
    <Img src={staticFile('unify/map_1f_walls.svg')} style={{position: 'absolute', left: 0, top: 0, width: PLAN_W * scale, height: PLAN_H * scale, opacity: walls}} />
  </div>
);

export {WALL};
