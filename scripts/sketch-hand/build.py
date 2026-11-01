import json, sys
import numpy as np, cv2, potrace
from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen

K = 8  # hi-res factor
alpha = np.array(Image.open('siqi/intro1.png').convert('RGBA'))[:, :, 3].astype(np.float32) / 255
bw = alpha > 0.4
LINES = [(13, 48), (83, 120), (153, 190), (223, 260)]
G = json.load(open('siqi/glyphs.json'))
NODESC = set('acemnorsvw')

# per-line baseline / x-height from letters without ascenders or descenders
def ink_rows(li, x0, x1):
    y0, y1 = LINES[li]
    rows = np.where(bw[y0 - 4:y1 + 4, x0:x1].any(1))[0]
    return (rows.min() + y0 - 4, rows.max() + y0 - 4) if len(rows) else None
base, xtop = {}, {}
for li in range(4):
    bots, tops = [], []
    for g in G:
        if g['line'] == li and g['ch'] in NODESC:
            r = ink_rows(li, g['x0'], g['x1'])
            if r: tops.append(r[0]); bots.append(r[1])
    base[li] = int(np.median(bots)) + 1
    xtop[li] = int(np.median(tops))
xh = np.median([base[l] - xtop[l] for l in range(4)])
U = 430 / xh  # font units per native px
print('baselines', base, 'xheight px', xh, 'U', U)

def boundary_ink(g):
    y0, y1 = LINES[g['line']]
    c = bw[y0 - 4:y1 + 4]
    return c[:, g['x0']].sum() + c[:, min(g['x1'], c.shape[1] - 1)].sum()

# choose one instance per character: lowest ink at its cut columns, then closest to median width
pick = {}
for ch in set(g['ch'] for g in G):
    inst = [g for g in G if g['ch'] == ch]
    med = np.median([g['x1'] - g['x0'] for g in inst])
    pick[ch] = min(inst, key=lambda g: boundary_ink(g) * 2 + abs((g['x1'] - g['x0']) - med))

PAD_UP, PAD_DN = 30, 16  # native rows above / below baseline
def hires(g):
    li = g['line']; b = base[li]
    crop = alpha[b - PAD_UP:b + PAD_DN, g['x0']:g['x1']].copy()
    crop = np.pad(crop, ((0, 0), (2, 2)))
    big = cv2.resize(crop, None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC)
    img = (big > 0.45)
    # glyph object: hi-res binary, baseline row, origin column (x of advance start), advance
    return dict(img=img, base=PAD_UP * K, ox=2 * K, adv=(g['x1'] - g['x0']) * K)

CUTS = json.load(open('siqi/cuts.json'))
CUTS['t'] = [3, 152, 168]; CUTS['u'] = [3, 116, 131]; CUTS['v'] = [1, 218, 230]; CUTS['-'] = [1, 329, 338]
def clean(ch, g):
    # drop neighbour fragments: small blobs touching the cut columns; for '-' keep the largest blob only
    li = g['line']; b = base[li]
    sub = bw[b - PAD_UP:b + PAD_DN, g['x0']:g['x1']].astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(sub, 8)
    keep = np.zeros_like(sub, bool)
    big = 1 + int(np.argmax(st[1:, 4])) if n > 1 else 0
    for k in range(1, n):
        x, y, w, h, area = st[k]
        edge = x == 0 or x + w >= sub.shape[1]
        if ch == '-' and k != big: continue
        if edge and area < 10: continue
        keep |= lab == k
    return keep
def hires_cut(ch, li, x0, x1):
    g = dict(line=li, x0=x0, x1=x1)
    keep = clean(ch, g)
    b = base[li]
    crop = alpha[b - PAD_UP:b + PAD_DN, x0:x1] * cv2.dilate(keep.astype(np.uint8), np.ones((3, 3), np.uint8))
    crop = np.pad(crop, ((0, 0), (2, 2)))
    big = cv2.resize(crop, None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC)
    return dict(img=big > 0.45, base=PAD_UP * K, ox=2 * K, adv=(x1 - x0) * K)
GL = {ch: hires_cut(ch, *v) for ch, v in CUTS.items()}

# ---------- helpers for constructed glyphs ----------
def bbox(img):
    ys, xs = np.where(img)
    return ys.min(), ys.max(), xs.min(), xs.max()
def canvas(w):
    return np.zeros(((PAD_UP + PAD_DN) * K, w), bool)
def paste(dst, src, x, y):
    h, w = src.shape
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    if x1 > x0 and y1 > y0:
        dst[y0:y1, x0:x1] |= src[y0 - y:y1 - y, x0 - x:x1 - x]
def ink(g):
    y0, y1, x0, x1 = bbox(g['img']); return g['img'][y0:y1 + 1, x0:x1 + 1], y0, y1, x0, x1
def stroke_w():
    # typical stroke width (hi-res px) from the 'l' stem
    img = GL['l']['img']; widths = [r.sum() for r in img if r.sum() > 0]
    return float(np.median(widths))
SW = stroke_w()
def scale(img, sx, sy, keep_stroke=True):
    out = cv2.resize(img.astype(np.uint8) * 255, None, fx=sx, fy=sy, interpolation=cv2.INTER_LINEAR) > 127
    grow = (min(sx, sy) if keep_stroke else 1) - 1
    if keep_stroke and grow > 0.05:
        r = int(round(SW * grow / 2))
        if r > 0: out = cv2.erode(out.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))) > 0
    return out
def shear(img, k):
    # x' = x + k * (rows above bottom)
    h, w = img.shape; extra = int(abs(k) * h) + 2
    M = np.float32([[1, -k, (k * h if k > 0 else 0) + 1], [0, 1, 0]])
    return cv2.warpAffine(img.astype(np.uint8) * 255, M, (w + extra, h)) > 127
def glyph_from(img, x_left_pad=None, adv=None, bottom=None):
    # place an ink image on a standard canvas with its bottom at `bottom` rows below baseline (0 = on baseline)
    cols = np.where(img.any(0))[0]
    img = img[:, cols.min():cols.max() + 1]
    sb = int(SW * 0.25)
    w = img.shape[1] + 2 * sb
    c = canvas(w)
    y = PAD_UP * K + (bottom or 0) - img.shape[0]
    paste(c, img, sb, y)
    return dict(img=c, base=PAD_UP * K, ox=0, adv=adv if adv else w)

# slant from the 'l' stem: x-centre drift per row
img = GL['l']['img']; rows = [(y, np.where(r)[0].mean()) for y, r in enumerate(img) if r.any()]
ys, xc = np.array(rows).T; slope = -np.polyfit(ys, xc, 1)[0]
print('slant', slope)

capH = (lambda t: t[2] - t[1] + 1)(ink(GL['A']))
ascH = (lambda t: t[2] - t[1] + 1)(ink(GL['l']))

# dot from i (ink above x-height)
iimg, iy0, iy1, ix0, ix1 = ink(GL['i'])
xh_hi = xh * K
top_part = GL['i']['img'][:GL['i']['base'] - int(xh_hi * 1.1)]
dy0, dy1, dx0, dx1 = bbox(top_part)
DOT = top_part[dy0:dy1 + 1, dx0:dx1 + 1]
GL['.'] = glyph_from(DOT)

# u = n turned 180 degrees
# u comes from the first half of the 'w' in "with" (stem, cup, stem)

# b = d mirrored, slant restored
dimg = ink(GL['d'])[0][:, ::-1]
GL['b'] = glyph_from(shear(dimg, 2 * slope))

# x = ")(" : mirrored c + c
cimg = ink(GL['c'])[0]
cw = cimg.shape[1]
xi = np.zeros((cimg.shape[0], int(cw * 1.55)), bool)
paste(xi, cimg[:, ::-1], 0, 0); paste(xi, cimg, int(cw * 0.55), 0)
GL['x'] = glyph_from(xi)

# parentheses from c, stretched tall and narrow
par = scale(cimg, 0.62, (ascH * 1.25) / cimg.shape[0], keep_stroke=False)
GL['('] = glyph_from(shear(par, slope * 0.5), bottom=int(ascH * 0.25))
GL[')'] = glyph_from(shear(par[:, ::-1], slope * 0.5), bottom=int(ascH * 0.25))

# K from k, V from v (scaled, stroke kept)
kimg = ink(GL['k'])[0]
GL['K'] = glyph_from(scale(kimg, 1.08, capH * 1.02 / kimg.shape[0]))
vimg = ink(GL['v'])[0]
GL['V'] = glyph_from(scale(vimg, 1.25, capH / vimg.shape[0]))

# E: stem from l, arms from the hyphen
limg = ink(GL['l'])[0]
stem = scale(limg, 1, capH / limg.shape[0], keep_stroke=False)
himg = ink(GL['-'])[0]
armw = int(capH * 0.5)
arm = cv2.resize(himg.astype(np.uint8) * 255, (armw, himg.shape[0])) > 127
Ei = np.zeros((stem.shape[0], stem.shape[1] + armw + 4), bool)
paste(Ei, stem, 0, 0)
H = stem.shape[0]
for frac, wf in ((0.02, 1.0), (0.48, 0.82), (0.93, 1.05)):
    yy = int(frac * H); xx = int(slope * (H - yy)) + int(SW * 0.4)
    a2 = cv2.resize(arm.astype(np.uint8) * 255, (int(armw * wf), arm.shape[0])) > 127
    paste(Ei, a2, xx, yy - arm.shape[0] // 2)
GL['E'] = glyph_from(Ei)

# umlauts: base + two dots above x-height
def umlaut(base_ch):
    g = GL[base_ch]; img = g['img'].copy()
    y0, y1, x0, x1 = bbox(img)
    cx = (x0 + x1) / 2 + slope * xh_hi * 0.6
    gap = int(xh_hi * 0.42)
    yy = g['base'] - int(xh_hi * 1.32)
    for dx in (-gap / 2, gap / 2):
        paste(img, DOT, int(cx + dx - DOT.shape[1] / 2), yy)
    return dict(img=img, base=g['base'], ox=g['ox'], adv=g['adv'])
GL['ä'] = umlaut('a'); GL['ü'] = umlaut('u'); GL['ö'] = umlaut('o')

# ---------- trace + build OTF ----------
def trace(g):
    img = g['img']
    bm = potrace.Bitmap(~img)  # potracer traces False pixels
    paths = bm.trace(turdsize=6, alphamax=1.0, opticurve=True, opttolerance=0.25)
    sc = U / K
    def P(pt):
        return ((pt.x - g['ox']) * sc, (g['base'] - pt.y) * sc)
    pen = T2CharStringPen(int(round(g['adv'] * sc)), None)
    for curve in paths:
        pen.moveTo(P(curve.start_point))
        for seg in curve.segments:
            if seg.is_corner:
                pen.lineTo(P(seg.c)); pen.lineTo(P(seg.end_point))
            else:
                pen.curveTo(P(seg.c1), P(seg.c2), P(seg.end_point))
        pen.closePath()
    return pen.getCharString(), int(round(g['adv'] * sc))

order = ['.notdef', 'space'] + sorted(k for k in GL)
names = {ch: ('g%04X' % ord(ch)) for ch in GL}
charstrings, metrics = {}, {}
pen = T2CharStringPen(500, None); charstrings['.notdef'] = pen.getCharString(); metrics['.notdef'] = (500, 0)
pen = T2CharStringPen(int(13 * U), None); charstrings['space'] = pen.getCharString(); metrics['space'] = (int(13 * U), 0)
cmap = {32: 'space'}
for ch, g in GL.items():
    cs, adv = trace(g)
    n = names[ch]; charstrings[n] = cs; metrics[n] = (adv, 0); cmap[ord(ch)] = n
glyph_order = ['.notdef', 'space'] + [names[c] for c in sorted(GL)]
fb = FontBuilder(1000, isTTF=False)
fb.setupGlyphOrder(glyph_order)
fb.setupCharacterMap(cmap)
fb.setupCFF('LucasSketchHand-Regular', {'FullName': 'Lucas Sketch Hand'}, charstrings, {})
# lsb from bounds
from fontTools.pens.boundsPen import BoundsPen
fb.setupHorizontalMetrics({n: (metrics[n][0], 0) for n in glyph_order})
gs = fb.font.getGlyphSet()
hm = {}
for n in glyph_order:
    bp = BoundsPen(gs); gs[n].draw(bp)
    hm[n] = (metrics[n][0], int(bp.bounds[0]) if bp.bounds else 0)
fb.setupHorizontalMetrics(hm)
asc, desc = int(PAD_UP * U * 0.95), -int(PAD_DN * U)
fb.setupHorizontalHeader(ascent=asc, descent=desc)
fb.setupNameTable({'familyName': 'Lucas Sketch Hand', 'styleName': 'Regular'})
fb.setupOS2(sTypoAscender=asc, sTypoDescender=desc, usWinAscent=asc, usWinDescent=-desc, sxHeight=430, sCapHeight=int(capH / K * U))
fb.setupPost()
fb.save('siqi/LucasSketchHand.otf')
fb.font.flavor = 'woff'; fb.font.save('siqi/LucasSketchHand.woff')
print('glyphs', len(glyph_order), 'cap', capH / K, 'asc', ascH / K)
