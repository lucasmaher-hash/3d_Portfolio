import bpy, bmesh, sys, math
from mathutils import Vector
argv = sys.argv[sys.argv.index('--')+1:]
src, dst, width = argv[0], argv[1], float(argv[2])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for ob in [o for o in bpy.context.scene.objects if o.type=='MESH']:
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    n0 = len(bm.faces)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.normal_update()
    convex=[]; concave=0
    for e in bm.edges:
        if len(e.link_faces)!=2: continue
        a = e.calc_face_angle_signed(0.0)
        if abs(a) < math.radians(30): continue
        if a > 0: convex.append(e)
        else: concave+=1
    for f in bm.faces: f.smooth = True
    for e in bm.edges:
        if len(e.link_faces)==2 and abs(e.calc_face_angle(0.0)) >= math.radians(30): e.smooth=False
    res = bmesh.ops.bevel(bm, geom=convex, offset=width, offset_type='OFFSET', segments=4, profile=0.5,
                          affect='EDGES', clamp_overlap=True, harden_normals=True, face_strength_mode='NONE')
    for f in res['faces']:
        for e in f.edges: e.smooth = True
    bm.to_mesh(me); bm.free()
    print('BEVEL', ob.name, 'faces', n0, '->', len(me.polygons), 'convex', len(convex), 'concave kept', concave)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_normals=True, export_texcoords=True, export_materials='NONE', export_apply=False)
