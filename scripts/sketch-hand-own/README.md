# Lucas's own handwriting on the sketchbook page (2026-11-01)

The English intro, the back arrow, the timeline line and its knob are traced from Lucas's photos
(IMG_9901 = text + arrow, IMG_9903 = pencil line + dot; HEIC, not in the repo) into
`public/sketchbook/hand/*.svg`. prep.py thresholds the photo, lines.py labels components,
trace.py / trace2.py trace them with potracer. The text is used as images (CSS mask), not as a
font; German keeps the Sketch Hand font because the photo does not contain those letters.
