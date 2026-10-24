# Gallery v06: room expansion, to.morrow bay, flat walls (2026-10-24)

Record of how `gallery-review-v06.blend` was made. The scripts ran from a scratch folder,
so their input/output paths are arguments or constants at the top; adjust before re-running.

Blender files (outside the repo, in `~/Documents/ChatGPT/new 3d scene 2/`):

- `gallery-with-tomorrow.blend`: Lucas's native-height layout file (ceiling 3.14 m). The
  expansion was designed and reviewed here. Backup of the state before it:
  `gallery-with-tomorrow.before-expand-2026-10-24.blend`.
- `blender-lighting-review/iteration-05-projects-and-wall/gallery-review-v05.blend`: the
  approved bake source at web height. Architecture is the same local mesh data, z-scaled
  1.6411 at z -0.1769. Exhibits are not scaled, only raised 0.373 m with the podium tops.
  Lights 363.6 W (centre 483.6 W), blue wells, centre ring colour attribute.
- `blender-lighting-review/iteration-06-expansion/gallery-review-v06.blend`: v05 plus
  everything below. **This is the bake source now.**

## 1. Outline from Lucas's sketch (native file)

- `fit.py`, `strokes.py`, `line.py`: the sketch photo (IMG_9714) is fitted to the plan by
  least squares on the five podium centres (residual about 1 m). The red line, the new VR
  circle and the to.morrow circle are traced into scene coordinates.
- `newpath.py`: the new outline. Old path points 0–900 and 1325–end are kept. In between,
  a centripetal Catmull-Rom curve runs through the traced red line. Its bottom end is moved
  0.65 m down so that it meets the existing bottom wall flush instead of crossing it. Both
  joins are Laplacian-smoothed over ±25 points. Floor area 1388 → 1478 m².

## 2. Wall rebuild (native file)

The outer wall is a sweep: 122 profile rows (inner face 0–60, outer face 61–121), one column
per path station, vertex index `row * columns + column`. Its 10-column groove period repeats
exactly, so `wallmodel.py` + `buildwall.py` measure the profile per phase relative to the path
and reconstruct it (≤ 5 mm, median 0.13 mm). Untouched columns and their normals are copied
verbatim. The 40 panels in the changed stretch are replaced by 47 new ones (0.714 m, the
rest are 0.719 m). The faces come from the mesh's own 122 face templates.

Done interactively in the native file (Blender MCP), same rules as the existing bays:

- Floor and ceiling regenerated as 2D curve fills: the outer loop is the wall's profile row
  0, and all holes are kept. The VR holes move with the podium. New floor hole for podium
  06 (radius = podium base radius), new ceiling hole copied from well 04.
- Floor LED perimeter = wall row 0, at the LED's own height.
- Virtual Cooking: +2.141 / −2.098 m, turned −2.43° about its podium axis so that it keeps
  the same angle to the room centre. Podium, LED ring, well, diffuser and light move with it.
- Podium 06: Podium 04's mesh, radially warped. The top disc is scaled, and outside it
  r + Δ. This rule reproduces podium 05 and 01 from 04 within 2.5 mm. Top Ø = span / 0.85,
  base radius = top radius + 0.48 m.
- to.morrow: sphere Ø 1.05 m (scale 0.35), button facing the room centre, level. Bounding
  box centred on the podium, hovering 18 cm. Props: `galleryProject = "to.morrow"`,
  `galleryRole = "project"`.

## 3. Port into v05 → v06, flatten the panel joints

`build_v06.py` (background Blender on v05) appends the expanded wall, floor, ceiling and LED
data plus the to.morrow objects. v05's own materials replace the appended copies. It then
repeats the VR move, adds podium 06, LED 06, well 07, diffuser 07 and light 07 as copies of
v05's 04 objects, raises the exhibit by v05's 0.373, and adds review camera `06-tomorrow`.

Then it flattens the 8 mm V-grooves on the outer wall and the inner ring:

- Groove columns are found where the 9 cm wall gets thinner.
- Each groove's inner columns are placed on the straight line between its two lip columns,
  on every row. The chord is 1 cm, so the error is under a micrometre.
- Custom normals are replaced by smooth shading + sharp edges at 30°. Away from the old
  grooves they are within 1.9° of v05.
- The vertex layout is unchanged, so the bake's wall UV atlas still applies.

The joint centre lines are written per profile row in web coordinates to
`public/gallery-baked-assets/wall-seams.json`. Result: 231 outer seams, 94 ring seams,
thickness 0.0899–0.0900 m everywhere.
