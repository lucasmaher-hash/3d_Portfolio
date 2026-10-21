"""Build the isolated gallery asset from the approved Blender file.

Run with Blender --background SOURCE --python scripts/export-gallery.py -- OUTPUT_DIR.
The source .blend and the live portfolio GLB are never overwritten.
"""
import bpy
import json
import math
import os
import sys
from mathutils import Matrix

OUT = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
REUSE = '--reuse' in sys.argv
os.makedirs(OUT, exist_ok=True)
scene = bpy.data.scenes['Scene']
bpy.context.window.scene = scene
FLOOR = 0.10778824985027313
HEIGHT_SCALE = (4.922500133514404 - 0.01809215173125267) / (3.0963478088378906 - FLOOR)
EYE = -0.7653 - (0.01809215173125267 - 2.7220145676872347)

def report(message):
    print('GALLERY: ' + message, flush=True)
    with open(os.path.join(OUT, 'progress.txt'), 'w') as f:
        f.write(message)

# Use only the approved architecture and its fixtures, excluding sample objects,
# guides, studio floor and the old wall parked beside the gallery.
def included(ob):
    return ((ob.name.startswith(('Outer Wall |', 'Inner Ring |', 'Floor | fitted',
                                'Ceiling | five', 'Ceiling 0', 'LED |', 'Podium 0'))
            or ob.get('galleryRole') == 'project')
            and not ob.name.startswith('SAMPLE'))

# Flatten the imported project hierarchy before deleting its wrapper empties.
# Transform snapshots prevent parent/child matrices from being scaled twice.
keep = [ob for ob in scene.objects if included(ob)]
for ob in keep:
    matrix = ob.matrix_world.copy()
    ob.parent = None
    ob.matrix_world = matrix
for ob in list(scene.objects):
    if ob not in keep and ob.type not in {'LIGHT'}:
        bpy.data.objects.remove(ob, do_unlink=True)
    elif ob.type == 'LIGHT' and not ob.name.startswith('Ceiling 0'):
        bpy.data.objects.remove(ob, do_unlink=True)

transform = Matrix.Diagonal((1, 1, HEIGHT_SCALE, 1)) @ Matrix.Translation((0, 0, -FLOOR))
for ob in scene.objects:
    if ob.get('galleryRole') == 'project':
        # Keep each product's approved dimensions; raise it onto the taller
        # exported podium without stretching the product itself.
        ob.matrix_world.translation.z += .75 * (HEIGHT_SCALE - 1) - FLOOR
    else:
        ob.matrix_world = transform @ ob.matrix_world
    if ob.type == 'LIGHT':
        ob.data.energy *= HEIGHT_SCALE ** 2

scene.render.engine = 'CYCLES'
scene.cycles.samples = 128
scene.cycles.use_denoising = True
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .01
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for device in prefs.devices:
        device.use = device.type == 'METAL'
    if any(d.use for d in prefs.devices):
        scene.cycles.device = 'GPU'
except Exception as error:
    report('GPU unavailable; using CPU: ' + str(error))

scene.render.bake.margin = 8
scene.render.bake.use_pass_direct = True
scene.render.bake.use_pass_indirect = True
scene.render.bake.use_pass_color = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '8'

meshes = [ob for ob in scene.objects if ob.type == 'MESH']
original_materials = {}
baked = []
for ob in meshes:
    if ob.get('galleryRole') == 'project':
        continue
    if 'diffuser' in ob.name.lower():
        ob['galleryRole'] = 'emitter'
        continue
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    for mod in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    mesh = ob.data
    for uv in list(mesh.uv_layers):
        mesh.uv_layers.remove(uv)
    uv = mesh.uv_layers.new(name='GalleryBake')
    is_outer = ob.name.startswith('Outer Wall')
    is_ring = ob.name.startswith('Inner Ring')
    if is_outer or is_ring:
        rows = 61
        layer = len(mesh.vertices) // 2
        n = layer // rows
        segments = 16 if is_outer else 8
        cols = 4
        atlas_rows = math.ceil(segments * 2 / cols)
        # Reserve a real two-dimensional strip for each crown/foot rim.
        # The former 8px strips touched at an 8px bake margin, contaminating
        # the crown. Segment boundaries now follow whole geometry edges.
        rim_height = .07
        surface_bottom = .20
        for poly in mesh.polygons:
            ids = list(poly.vertices)
            rim = not (all(v < layer for v in ids) or all(v >= layer for v in ids))
            js = [v % n for v in ids]
            if max(js) - min(js) > n / 2:
                js = [j + n if j < n / 2 else j for j in js]
            first = min(js)
            segment = min(segments - 1, next((q for q in range(segments)
                if first < (q + 1) * n // segments), segments - 1))
            start = segment * n // segments
            end = (segment + 1) * n // segments
            back = ids[0] >= layer
            tile = segment + (segments if back else 0)
            for li, j in zip(poly.loop_indices, js):
                vi = mesh.loops[li].vertex_index
                k = (vi % layer) // n
                u = (j - start) / (end - start)
                v = k / (rows - 1)
                pad = .02
                if rim:
                    uv.data[li].uv = (.01 + .98 * j / n,
                        .01 + (.10 if k > rows / 2 else 0) +
                        (rim_height if vi >= layer else 0))
                else:
                    uv.data[li].uv = ((tile % cols + pad + u * (1 - 2 * pad)) / cols,
                        surface_bottom + (1 - surface_bottom) *
                        (tile // cols + pad + v * (1 - 2 * pad)) / atlas_rows)
    elif ob.name.startswith(('Floor |', 'Ceiling |')):
        xs = [v.co.x for v in mesh.vertices]
        ys = [v.co.y for v in mesh.vertices]
        xmin, xmax, ymin, ymax = min(xs), max(xs), min(ys), max(ys)
        underside = ob.name.startswith('Ceiling |')
        for poly in mesh.polygons:
            visible = poly.normal.z < -.9 if underside else poly.normal.z > .9
            for li in poly.loop_indices:
                p = mesh.vertices[mesh.loops[li].vertex_index].co
                u = (p.x - xmin) / (xmax - xmin)
                v = (p.y - ymin) / (ymax - ymin)
                # Keep hidden backs and slab edges off the visible surface atlas.
                uv.data[li].uv = (.01 + .98 * u, .04 + .95 * v) if visible else (.01 + .98 * u, .002 + .018 * v)
    else:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=1.25, island_margin=.02)
        bpy.ops.object.mode_set(mode='OBJECT')
    resolution = 4096 if is_outer or is_ring or ob.name.startswith(('Floor |', 'Ceiling |')) else 1024 if ob.name.startswith('Podium ') else 512
    label = 'outer' if is_outer else 'ring' if is_ring else 'ceiling' if ob.name.startswith('Ceiling |') else 'floor' if ob.name.startswith('Floor |') else 'podium-' + ob.name.split()[1] if ob.name.startswith('Podium ') else 'well-' + ob.name.split()[1]
    image = bpy.data.images.new('Gallery bake ' + label, width=resolution, height=resolution)
    image.colorspace_settings.name = 'sRGB'
    original_materials[ob] = list(mesh.materials)
    # Give every baking object its own material node tree: shared well materials
    # must not change which image is active on a previously baked object.
    for i, material in enumerate(list(mesh.materials)):
        if material is None:
            material = bpy.data.materials.new('Gallery default surface')
            material.use_nodes = True
        else:
            material = material.copy()
        mesh.materials[i] = material
        target = material.node_tree.nodes.new('ShaderNodeTexImage')
        target.image = image
        material.node_tree.nodes.active = target
    image.filepath_raw = os.path.join(OUT, label + '.png')
    image.file_format = 'PNG'
    if REUSE and os.path.exists(image.filepath_raw) and label not in {'ring', 'outer'}:
        image = bpy.data.images.load(image.filepath_raw, check_existing=False)
        report('Reusing bake ' + label)
    else:
        report('Baking ' + label + ' at ' + str(resolution))
        bpy.ops.object.bake(type='DIFFUSE')
        image.save()
    baked.append((ob, image, label))

# Change materials only after ALL bakes: subsequent bakes must still see the
# original Cycles materials for bounce light and surface colour.
for ob, image, label in baked:
    material = bpy.data.materials.new('Gallery baked | ' + label)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (0, 0, 0, 1)
    bsdf.inputs['Roughness'].default_value = .30 if label in {'floor', 'ceiling'} else .8
    tex = material.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    material.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = 1
    ob.data.materials.clear()
    ob.data.materials.append(material)
    for poly in ob.data.polygons:
        poly.material_index = 0
    ob['galleryRole'] = 'floor' if label == 'floor' else 'wall' if label in {'ring', 'outer'} else 'podium' if label.startswith('podium-') else 'ceiling'
    ob['galleryBaked'] = True

for ob in scene.objects:
    if ob.type == 'CURVE':
        ob['galleryRole'] = 'emitter'

bpy.ops.object.select_all(action='DESELECT')
for ob in scene.objects:
    if ob.type in {'MESH', 'CURVE'}:
        ob.select_set(True)
report('Exporting baked GLB')
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'gallery.glb'), export_format='GLB',
                          use_selection=True, use_active_scene=True, export_apply=True, export_extras=True,
                          export_cameras=False, export_lights=False)
with open(os.path.join(OUT, 'scene.json'), 'w') as f:
    json.dump({'floorY': 0, 'eyeHeight': EYE, 'heightScale': HEIGHT_SCALE,
               'ceilingHeight': 4.922500133514404 - 0.01809215173125267,
               'fov': 90, 'speed': 3.45, 'spawn': [0, EYE, 0],
               'yaw': math.pi, 'pitch': .054,
               'lighting': 'Cycles diffuse direct + indirect + colour; 128 samples',
               'surfaceColor': '#3E6281', 'surfaceRoughness': .30,
               'fixtures': [[ob.location.x, -ob.location.y, ob.location.z] for ob in scene.objects if ob.type == 'LIGHT'],
               'source': 'gallery_layout.blend', 'baked': [label for _, _, label in baked]}, f, indent=2)
report('Complete')
