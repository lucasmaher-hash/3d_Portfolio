"""Local reflection captures for the baked gallery (one equirect EXR per bay + centre).

  Blender -b gallery-review-v06.blend --python scripts/render-gallery-probes.py -- <workspace>/probes

Native materials and lights of the review .blend, never the baked emitters. Each bay's
capture hides that bay's own project so it does not reflect itself. Also writes
cameras.json (every camera in the file, as web review views). Positions are Blender
x, y, z; the manifest stores them in web space (x, z, -y). Moved from the local
fourth-export workspace into the repo on 2026-10-24 (v06: Virtual Cooking moved,
to.morrow bay added).
"""
import bpy, os, sys, json
from mathutils import Vector
OUT = sys.argv[sys.argv.index('--') + 1]
os.makedirs(OUT, exist_ok=True)
s = bpy.context.scene
bpy.context.view_layer.update()
reviews = {}
for o in s.objects:
    if o.type == 'CAMERA':
        p = o.matrix_world.translation; target = p + o.matrix_world.to_quaternion() @ Vector((0, 0, -1))
        reviews[o.name] = {'position': [p.x, p.z, -p.y], 'target': [target.x, target.z, -target.y], 'lens': o.data.lens}
with open(OUT + '/cameras.json', 'w') as f: json.dump(reviews, f, indent=2)
# Bay probes sit over each podium centre, at exhibit height.
probes = [('center', (0, 0, 1.94), None)]
for o in s.objects:
    if o.name.startswith('Podium ') and o.get('galleryProject'):
        slug = {'Double Packaging': 'bottle'}.get(o['galleryProject'], o['galleryProject'].lower().replace(' ', '-').replace('.', ''))
        probes.append((slug, (round(o.location.x, 3), round(o.location.y, 3), 2.05), o['galleryProject']))
probes.sort(key=lambda p: p[0] != 'center')
s.render.resolution_x = 1024; s.render.resolution_y = 512; s.render.resolution_percentage = 100
s.render.image_settings.file_format = 'OPEN_EXR'; s.render.image_settings.color_mode = 'RGB'
s.render.image_settings.color_depth = '16'; s.render.image_settings.exr_codec = 'ZIP'
s.render.engine = 'CYCLES'
s.cycles.samples = 64; s.cycles.adaptive_threshold = .025; s.cycles.use_denoising = True; s.render.use_persistent_data = True
try:
    pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = 'METAL'; pr.get_devices()
    for d in pr.devices: d.use = d.type == 'METAL'
    s.cycles.device = 'GPU'
except Exception as e: print(e)
camdata = bpy.data.cameras.new('Offline local reflection capture'); camdata.type = 'PANO'
if hasattr(camdata, 'panorama_type'): camdata.panorama_type = 'EQUIRECTANGULAR'
else: camdata.cycles.panorama_type = 'EQUIRECTANGULAR'
cam = bpy.data.objects.new(camdata.name, camdata); s.collection.objects.link(cam); s.camera = cam
cam.rotation_euler = Vector((1, 0, 0)).to_track_quat('-Z', 'Y').to_euler()
original = {o.name: o.hide_render for o in s.objects}; manifest = []
for name, pos, project in probes:
    for o in s.objects: o.hide_render = original.get(o.name, False) or bool(project and o.get('galleryProject') == project)
    cam.location = pos; filename = name + '.exr'; s.render.filepath = OUT + '/' + filename
    if not os.path.exists(s.render.filepath):
        print('PROBE ' + name, flush=True); bpy.ops.render.render(write_still=True)
    manifest.append({'file': filename, 'position': [pos[0], pos[2], -pos[1]], 'project': project})
with open(OUT + '/probes.json', 'w') as f: json.dump(manifest, f, indent=2)
print('PROBES_COMPLETE', json.dumps(manifest), flush=True)
