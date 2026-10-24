"""Build gallery-review-v06.blend from the approved v05 (web height, approved lighting).

Run:  Blender -b gallery-review-v05.blend --python build_v06.py -- <expanded.blend> <out.blend> <seams.json>

Ports the room expansion made in gallery-with-tomorrow.blend (native height) into v05:
new outer wall / floor / ceiling / floor LED, Virtual Cooking moved, to.morrow podium 06 +
LED + ceiling well 07 + exhibit. Then flattens the 8 mm panel grooves of the outer wall and
the inner ring (they bake unreliably) and writes the groove centre lines for the web shader.
"""
import bpy, sys, math, json
import numpy as np
from mathutils import Vector, Matrix

SRC, OUT, SEAMS = sys.argv[sys.argv.index('--') + 1:][:3]
ob = bpy.data.objects
VR_OLD = Vector((11.789, -7.032, 0)); VR_NEW = Vector((13.93, -9.13, 0)); TM = Vector((6.35, -15.42, 0))
DLT = VR_NEW - VR_OLD
log = {}

# ---- bring the expanded objects in from the native-height file -------------------------
WANT = ['Outer Wall | closed | inward coves | 9 cm thick', 'Floor | fitted base footprint | 10.8 cm slab',
        'Ceiling | six rounded circular light recesses', 'LED | outer floor perimeter',
        'Podium 06 | to.morrow', 'LED | podium 06 | to.morrow',
        'Ceiling 07 | rounded recessed well', 'Ceiling 07 | turquoise luminous diffuser',
        'Exhibit 06 | to.morrow', 'Tomorrow_Project_Object', 'Tomorrow_ContinuousShell',
        'Tomorrow_GlassBubbleButton', 'Tomorrow_LiveIcon_Ring', 'Tomorrow_LiveIcon_Dot']
before = set(bpy.data.materials)
with bpy.data.libraries.load(SRC, link=False) as (src, dst):
    dst.objects = [n for n in src.objects if n in WANT]
new = {o.name.rsplit('.', 1)[0] if o.name.rsplit('.', 1)[0] in WANT else o.name: o for o in dst.objects}
assert len(new) == len(WANT), sorted(new)

# materials appended alongside that already exist in v05 -> use v05's own
def base(n):
    p = n.rsplit('.', 1)
    return p[0] if len(p) == 2 and p[1].isdigit() else n
for m in list(set(bpy.data.materials) - before):
    keep = bpy.data.materials.get(base(m.name))
    if keep is not None and keep is not m:
        m.user_remap(keep); bpy.data.materials.remove(m)

def set_slots(me, mats):
    # Assign in place: materials.clear() resets every face's material_index to 0
    # (that dropped podium 06's seam material once).
    while len(me.materials) < len(mats): me.materials.append(None)
    for i, m in enumerate(mats): me.materials[i] = m

def swap_data(dst_name, src_obj):
    o = ob[dst_name]; mats = list(o.data.materials)
    o.data = src_obj.data
    if o.type == 'MESH': set_slots(o.data, mats)
    return o

# architecture: same local data convention as v05 (v05 only adds object z scale 1.6411)
for n in WANT[:3]:
    swap_data(n, new[n])
led = ob['LED | outer floor perimeter']; nl = new['LED | outer floor perimeter']
sp = led.data.splines[0]; led.data.splines.remove(sp)
ns = led.data.splines.new('POLY'); pts = nl.data.splines[0].points
ns.points.add(len(pts) - 1)
for a, b in zip(ns.points, pts): a.co = b.co
ns.use_cyclic_u = True

# ---- Virtual Cooking moves -------------------------------------------------------------
for n in ['Podium 04 | Virtual Cooking', 'LED | podium 04 | Virtual Cooking', 'Ceiling 04 | downward illumination']:
    ob[n].location += DLT
for n in ['Ceiling 04 | rounded recessed well', 'Ceiling 04 | turquoise luminous diffuser']:
    ob[n].data.transform(Matrix.Translation(DLT)); ob[n].data.update()
ang = math.atan2(VR_NEW.y, VR_NEW.x) - math.atan2(VR_OLD.y, VR_OLD.x)
M = Matrix.Translation(VR_NEW) @ Matrix.Rotation(ang, 4, 'Z') @ Matrix.Translation(-VR_OLD)
for n in ['Pivot_VRPanel', '04-virtual-cooking']:
    ob[n].matrix_world = M @ ob[n].matrix_world

# ---- to.morrow bay ---------------------------------------------------------------------
excol = ob['Podium 04 | Virtual Cooking'].users_collection[0]
ceilcol = ob['Ceiling 04 | downward illumination'].users_collection[0]
p4 = ob['Podium 04 | Virtual Cooking']
def adopt(o, like, coll):
    for c in list(o.users_collection): c.objects.unlink(o)
    coll.objects.link(o)
    o.location.z = like.location.z; o.scale = like.scale
    return o
pod = adopt(new['Podium 06 | to.morrow'], p4, excol)
set_slots(pod.data, list(p4.data.materials))
ledn = adopt(new['LED | podium 06 | to.morrow'], ob['LED | podium 04 | Virtual Cooking'], excol)
set_slots(ledn.data, list(ob['LED | podium 04 | Virtual Cooking'].data.materials))
for part in ['rounded recessed well', 'turquoise luminous diffuser']:
    o = adopt(new['Ceiling 07 | ' + part], ob['Ceiling 04 | ' + part], ceilcol)
    set_slots(o.data, list(ob['Ceiling 04 | ' + part].data.materials))
    for k in ob['Ceiling 04 | ' + part].keys(): o[k] = ob['Ceiling 04 | ' + part][k]
l4 = ob['Ceiling 04 | downward illumination']
l7 = l4.copy(); l7.data = l4.data.copy(); l7.name = l7.data.name = 'Ceiling 07 | downward illumination'
ceilcol.objects.link(l7); l7.location = Vector((TM.x, TM.y, l4.location.z))
# exhibit: v05 raised every exhibit with the podium top (podium z-scaled, exhibits not)
top_native = 0.8577882647514343
dz = (p4.location.z + p4.scale.z * top_native) - top_native
ex = new['Exhibit 06 | to.morrow']
for o in [ex] + list(ex.children_recursive):
    for c in list(o.users_collection): c.objects.unlink(o)
    excol.objects.link(o)
ex.location.z += dz
ex['ceiling_fixture'] = 'Ceiling 07 | downward illumination'
# review camera for the new bay, posed like 04's relative to its exhibit and the centre
c4 = ob['04-virtual-cooking']; c6 = c4.copy(); c6.data = c4.data.copy(); c6.name = '06-tomorrow'
c4.users_collection[0].objects.link(c6)
a2 = math.atan2(-TM.y, -TM.x) - math.atan2(-VR_NEW.y, -VR_NEW.x)
c6.matrix_world = Matrix.Translation(TM) @ Matrix.Rotation(a2, 4, 'Z') @ Matrix.Translation(-VR_NEW) @ c4.matrix_world
bpy.context.view_layer.update()
pts = np.array([o.matrix_world @ v.co for o in ex.children_recursive if o.type == 'MESH' for v in o.data.vertices])
ptop = max((pod.matrix_world @ v.co).z for v in pod.data.vertices)
log['tomorrow'] = {'bottom': float(pts[:, 2].min()), 'podium_top': ptop, 'hover': float(pts[:, 2].min() - ptop),
                   'centre_xy': ((pts[:, :2].max(0) + pts[:, :2].min(0)) / 2).round(3).tolist()}

# ---- centre help podium (podium 07), baked for real (2026-10-24) -----------------------
# Was a web-side copy of podium 04 borrowing its lightmap. Now a real podium at the centre,
# lit by the centre well: Podium 04's mesh (seam material and stripes kept) with the straight
# band shortened by 15 cm, the floor cut at its LED ring, its own LED ring, and a shadow-only
# (The faint shadow on its top is drawn by the web from to.morrow's baked shadow: a physical
# half-size occluder under a 4 m area light casts almost nothing, so it cannot be baked.)
import bmesh
HELP_SHORTEN = 0.15; BAND = (0.32, 0.94); Z0 = p4.location.z; ZS = p4.scale.z
pod7 = bpy.data.objects.new('Podium 07 | centre help', p4.data.copy()); pod7.data.name = 'Podium 07 | centre help'
excol.objects.link(pod7); pod7.location = Vector((0, 0, Z0)); pod7.scale = p4.scale
for k in p4.keys():
    if k != 'galleryProject': pod7[k] = p4[k]
me7 = pod7.data; co = np.empty(len(me7.vertices) * 3); me7.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
zw = Z0 + ZS * co[:, 2]; b0, b1 = BAND; kk = (b1 - b0 - HELP_SHORTEN) / (b1 - b0)
zn = np.where(zw <= b0, zw, np.where(zw > b1, zw - HELP_SHORTEN, b0 + (zw - b0) * kk))
co[:, 2] = (zn - Z0) / ZS; me7.vertices.foreach_set('co', co.ravel()); me7.update()
led4 = ob['LED | podium 04 | Virtual Cooking']
led7 = bpy.data.objects.new('LED | podium 07 | centre help', led4.data.copy()); led7.data.name = led7.name
excol.objects.link(led7); led7.location = Vector((0, 0, led4.location.z)); led7.scale = led4.scale
led7['galleryRole'] = 'emitter'
top7 = Z0 + ZS * max(v.co.z for v in me7.vertices)
bpy.context.view_layer.update()
# floor: same slab fill as before, one more round hole at the centre (04's hole, recentred)
fl = ob['Floor | fitted base footprint | 10.8 cm slab']
bm = bmesh.new(); bm.from_mesh(fl.data)
topf = {f for f in bm.faces if f.normal.z > 0.9}
adj = {}
for e in bm.edges:
    if sum(1 for f in e.link_faces if f in topf) == 1:
        a, b = e.verts; adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
seen = set(); loops = []
for v0 in adj:
    if v0 in seen: continue
    lp = [v0]; seen.add(v0); prev = None; cur = v0
    while True:
        nx = [w for w in adj[cur] if w != prev and w not in seen]
        if not nx: break
        prev, cur = cur, nx[0]; seen.add(cur); lp.append(cur)
    loops.append(np.array([(x.co.x, x.co.y) for x in lp]))
bm.free()
outer = max(loops, key=lambda l: np.ptp(l[:, 0]))
holes = [l for l in loops if l is not outer]
h04 = next(l for l in holes if np.linalg.norm(l.mean(0) - VR_NEW.to_2d()) < 0.5)
holes.append(h04 - np.array(VR_NEW.to_2d()))
cu = bpy.data.curves.new('tmp_slab', 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.extrude = 0.054
for l in [outer] + holes:
    sp = cu.splines.new('POLY'); sp.points.add(len(l) - 1)
    sp.points.foreach_set('co', np.c_[l, np.zeros(len(l)), np.ones(len(l))].ravel()); sp.use_cyclic_u = True
tmp = bpy.data.objects.new('tmp_slab', cu); bpy.context.scene.collection.objects.link(tmp)
fme = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
bpy.data.objects.remove(tmp); bpy.data.curves.remove(cu)
fco = np.empty(len(fme.vertices) * 3); fme.vertices.foreach_get('co', fco); fco = fco.reshape(-1, 3); fco[:, 2] += 0.006
fme.vertices.foreach_set('co', fco.ravel())
fmats = list(fl.data.materials); old_fl = fl.data
set_slots(fme, fmats)
fme.polygons.foreach_set('material_index', np.zeros(len(fme.polygons), int)); fme.polygons.foreach_set('use_smooth', np.zeros(len(fme.polygons), bool))
fuv = fme.uv_layers.new(name='UVMap'); flv = np.empty(len(fme.loops), int); fme.loops.foreach_get('vertex_index', flv)
fxy = fco[flv, :2]; fmn = fxy.min(0); fuv.data.foreach_set('uv', ((fxy - fmn) / (fxy.max(0) - fmn).max()).ravel()); fme.update()
nm = old_fl.name; fl.data = fme; fme.name = nm
log['help_podium'] = {'top': top7, 'floor_holes': len(holes)}

# ---- flatten panel grooves, keep their centre lines -----------------------------------
K = 122
def flatten(o, label):
    me = o.data; n = len(me.vertices) // K
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); G = co.reshape(K, n, 3)
    mid = G[30, :, :2]
    th = np.linalg.norm(G[30, :, :2] - G[91, :, :2], axis=1)
    deep = th < np.median(th) - 0.0015
    gap = np.linalg.norm(np.roll(mid, -1, 0) - mid, axis=1)          # j -> j+1
    thr = 0.35 * np.median(gap)
    seams, changed = [], 0
    j = 0
    visited = np.zeros(n, bool)
    for d in np.flatnonzero(deep):
        if visited[d]: continue
        a = d
        while gap[(a - 1) % n] < thr: a = (a - 1) % n
        b = d
        while gap[b] < thr: b = (b + 1) % n
        idx = [(a + i) % n for i in range(((b - a) % n) + 1)]
        visited[idx] = True
        inner = idx[1:-1]
        if not inner: continue
        L = np.cumsum([0] + [gap[i] for i in idx[:-1]]); t = L / L[-1]
        for i, ti in zip(inner, t[1:-1]):
            G[:, i] = G[:, a] * (1 - ti) + G[:, b] * ti
        changed += len(inner)
        seams.append(G[:, inner].mean(1))                               # (K,3) local
    me.vertices.foreach_set('co', G.reshape(-1))
    if me.attributes.get('custom_normal'): me.attributes.remove(me.attributes['custom_normal'])
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
    me.set_sharp_from_angle(angle=math.radians(30))
    me.update()
    # web coords: x, y(up)=z, z=-y ; level key = y in mm
    W = np.array(o.matrix_world)
    out = {}
    S = np.array(seams)                                                # (s,K,3)
    for k in range(K):
        w = S[:, k] @ W[:3, :3].T + W[:3, 3]
        key = str(int(round(w[0, 2] * 1000)))
        flat = np.c_[w[:, 0], -w[:, 1]].reshape(-1)
        out.setdefault(key, []).extend(int(round(v * 1e4)) for v in flat)
    deepcols = int(deep.sum())
    log[label] = {'columns': n, 'seams': len(seams), 'flattened_cols': changed, 'deep_cols': deepcols}
    return out
seam_json = {'outer': flatten(ob['Outer Wall | closed | inward coves | 9 cm thick'], 'outer'),
             'ring': flatten(ob['Inner Ring | 12 m | 9 cm shells | rounded returns'], 'ring')}
json.dump(seam_json, open(SEAMS, 'w'))

# tidy: appended helper objects that were only data donors
for n in WANT[:4]:
    o = new[n]
    if o.name in bpy.data.objects and o.users_collection == () or not o.users_collection:
        bpy.data.objects.remove(o)
for o in list(bpy.data.objects):
    if o.name.endswith('.001') and o.name[:-4] in WANT[:4]: bpy.data.objects.remove(o)
bpy.context.scene['gallerySource'] = 'gallery-review-v06.blend'
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('BUILD_V06', json.dumps(log), flush=True)
