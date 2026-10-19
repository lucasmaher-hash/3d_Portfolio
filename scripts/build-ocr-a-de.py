"""Builds public/OCR-A-BT-DE.ttf: a copy of public/OCR-A-BT.ttf (Bitstream,
left untouched) with the German characters it lacks (Lucas, 2026-10-19).

  ä ö ü   a / o / u + the umlaut strokes of Ü, shortened to sit between the
          x-height and the i's dot line (the font's own lowercase dot height)
  Ä Ö Ü   redrawn: full-height A / O / U with the same strokes above the cap
          height (the original squashed the letter to keep them inside it)
  ß ẞ     drawn here: centrelines stroked at the font's stem width (172 units),
          straight runs with the same chamfered corners and round ends as b and h
  „ “ ‚ ‘ the font's own " and ' (OCR-A has no curly quotes), the low ones moved
          down to the baseline
  – — …   hyphen, a full-width bar, three smaller periods

Every glyph is 1266 units wide like the rest (monospace). Run:
  python3 -m venv v && v/bin/pip install fonttools shapely
  v/bin/python scripts/build-ocr-a-de.py
"""
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from shapely.geometry import LineString
from shapely.geometry.polygon import orient

SRC = 'public/OCR-A-BT.ttf'
DST = 'public/OCR-A-BT-DE.ttf'
f = TTFont(SRC)
glyf, hmtx, cmap = f['glyf'], f['hmtx'], f.getBestCmap()
ADV = 1266
HALF = 86                                # half the stem width (outline 209..381 -> centre 295)

def contours(name):
    gl = glyf[name]
    coords, ends, flags = gl.getCoordinates(glyf)
    out, start = [], 0
    for e in ends:
        out.append([(tuple(coords[i]), flags[i] & 1) for i in range(start, e + 1)])
        start = e + 1
    return out

def draw_contours(pen, cs):
    """Draw TrueType contours (on/off-curve points) into a pen."""
    for c in cs:
        pts = c[:]
        # start on an on-curve point
        k = next((i for i, (_, on) in enumerate(pts) if on), None)
        if k is None:
            continue
        pts = pts[k:] + pts[:k]
        pen.moveTo(pts[0][0])
        buf = []
        for p, on in pts[1:] + [pts[0]]:
            if on:
                if buf:
                    pen.qCurveTo(*buf, p); buf = []
                else:
                    pen.lineTo(p)
            else:
                buf.append(p)
        if buf:
            pen.qCurveTo(*buf, pts[0][0])
        pen.closePath()

def xform(cs, sx=1, sy=1, dx=0, dy=0, oy=0):
    return [[((round(x * sx + dx), round((y - oy) * sy + oy + dy)), on) for (x, y), on in c] for c in cs]

def stroke(*paths, width=2 * HALF):
    """Centrelines -> outline contours (mitred joins on 45° runs = the font's chamfered corners, round ends like b and h)."""
    geom = None
    for p in paths:
        g = LineString(p).buffer(width / 2, quad_segs=6, cap_style='round', join_style='mitre', mitre_limit=2.0)
        geom = g if geom is None else geom.union(g)
    polys = [geom] if geom.geom_type == 'Polygon' else list(geom.geoms)
    cs = []
    for poly in polys:
        poly = orient(poly, sign=-1.0)           # TrueType: outer contours clockwise
        cs.append([((round(x), round(y)), 1) for x, y in list(poly.exterior.coords)[:-1]])
        for ring in poly.interiors:
            cs.append([((round(x), round(y)), 1) for x, y in list(ring.coords)[:-1]])
    return cs

def add(name, uni, cs):
    pen = TTGlyphPen(None)
    draw_contours(pen, cs)
    g = pen.glyph()
    g.recalcBounds(glyf)
    glyf[name] = g
    hmtx[name] = (ADV, g.xMin if g.numberOfContours else 0)
    if name not in f.getGlyphOrder():
        f.setGlyphOrder(f.getGlyphOrder() + [name])
    for t in f['cmap'].tables:
        if t.isUnicode() or (t.platformID == 1 and uni < 256):
            if t.platformID == 1:
                continue          # the Mac Roman table cannot hold these code points sensibly
            t.cmap[uni] = name

# ── ä ö ü: the umlaut strokes of Ü (x 383-555 and 711-883, y 924-1241),
#    shortened to the i-dot band (1069-1313) and set over the lowercase.
U = contours('Udieresis')
dots = [c for c in U if min(p[0][1] for p in c) >= 900]
dots = xform(dots, sy=244 / 317, oy=924, dy=1069 - 924)
for base, name, uni in (('a', 'adieresis', 0xE4), ('o', 'odieresis', 0xF6), ('u', 'udieresis', 0xFC)):
    add(name, uni, contours(base) + dots)

# ── Ä Ö Ü redrawn (Lucas): the original squashes the letter under the cap
#    height to fit the strokes inside it. Now the full-height A / O / U with the
#    same strokes ABOVE the cap height, the same gap over the letter as on the
#    lowercase (1069 - 881 = 188).
cap_dots = xform(dots, dy=(1241 + 188) - 1069)
for base, name in (('A', 'Adieresis'), ('O', 'Odieresis'), ('U', 'Udieresis')):
    add(name, ord({'A': 'Ä', 'O': 'Ö', 'U': 'Ü'}[base]), contours(base) + cap_dots)

# ── ß: stem up from the baseline, a narrow upper bowl, a wider lower bowl.
L, R = 209 + HALF, 1057 - HALF                 # stem centres, as in B (295 / 971)
TOP = 1241 - HALF                              # cap-height centreline (1155)
eszett = stroke(
    [(L, -HALF), (L, 960), (L + 180, TOP), (760, TOP), (R - 40, TOP - 170), (R - 40, 880), (720, 715), (560, 715)],
    [(600, 715), (790, 715), (R, 545), (R, 170), (R - 170, 0), (520, 0)],
)
add('germandbls', 0xDF, eszett)
# ẞ: the same build at full width, a wider top
eszett_cap = stroke(
    [(L, -HALF), (L, 960), (L + 180, TOP), (R - 170, TOP), (R, TOP - 100), (R, TOP - 120), (690, 715), (560, 715)],
    [(600, 715), (790, 715), (R, 545), (R, 170), (R - 170, 0), (520, 0)],
)
add('uni1E9E', 0x1E9E, eszett_cap)

# ── quotes: OCR-A's own straight " and '; the low pair moved down to the baseline.
qd = contours('quotedbl'); qs = contours('quotesingle')
low = -86 - 635                                # their bottoms (635) to the comma's (-86)
add('quotedblbase', 0x201E, xform(qd, dy=low))
add('quotedblleft', 0x201C, qd)
add('quotedblright', 0x201D, qd)
add('quotesinglbase', 0x201A, xform(qs, dy=low))
add('quoteleft', 0x2018, qs)

# ── dashes and the ellipsis
hy = contours('hyphen')                        # 209-1057 x 418-664
add('endash', 0x2013, hy)
add('emdash', 0x2014, xform(hy, sx=1186 / 848, dx=40 - 209 * 1186 / 848))
dot = contours('period')                       # 463-803 x 129-446, centre 633
small = xform(dot, sx=0.55, sy=0.55, dx=-633 * 0.55, dy=0)
add('ellipsis', 0x2026, [c for x in (300, 633, 966) for c in xform(small, dx=x)])

name = f['name']
for rec in name.names:
    if rec.nameID == 5:
        rec.string = rec.toUnicode() + '; German extension 2026-10-19'
f.save(DST)
print('wrote', DST)
