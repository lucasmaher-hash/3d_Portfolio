"""Bake already-calibrated approved v05 scene. Never modify the review source."""
import bpy, os, sys, json, math, re
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
OUT=os.path.abspath(args[0]);PILOT='--pilot' in args
os.makedirs(OUT,exist_ok=True);s=bpy.context.scene
s.render.engine='CYCLES';s.cycles.samples=256;s.cycles.adaptive_threshold=.01;s.cycles.adaptive_min_samples=64
s.cycles.use_adaptive_sampling=True;s.cycles.use_denoising=True
s.render.use_persistent_data=True
s.render.bake.use_pass_direct=True;s.render.bake.use_pass_indirect=True;s.render.bake.use_pass_color=True
s.render.bake.margin=16;s.render.bake.margin_type='ADJACENT_FACES'
s.render.image_settings.file_format='OPEN_EXR';s.render.image_settings.color_depth='16';s.render.image_settings.exr_codec='ZIP'
try:
 p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='METAL';p.get_devices()
 for d in p.devices:d.use=d.type=='METAL'
 if any(d.use for d in p.devices):s.cycles.device='GPU'
except Exception as e:print(e,flush=True)
# Geometry in this file is ALREADY at web height. No scaling, shifts or light changes.
assert abs(next(o for o in s.objects if o.name.startswith('Ceiling |')).matrix_world.translation.z)>0
BOTTLE={'bottle body_Podest','label_Podest','lid_Podest'}
def slug(t):return re.sub(r'[^a-z0-9]+','-',t.lower()).strip('-')
def label(o):
 if o.name.startswith('Outer Wall'):return 'outer'
 if o.name.startswith('Inner Ring'):return 'ring'
 if o.name.startswith('Floor |'):return 'floor'
 if o.name.startswith('Ceiling |'):return 'ceiling'
 if 'rounded recessed well' in o.name:return 'well-'+o.name.split()[1]
 if o.name.startswith('Podium '):return 'podium-'+o.name.split()[1]
 return slug(o.name)
def report(t):
 print('BAKE '+t,flush=True)
 with open(OUT+'/progress.txt','w') as f:f.write(t)
def uv_for(o,key):
 mesh=o.data
 uv=mesh.uv_layers.get('GalleryBake') or mesh.uv_layers.new(name='GalleryBake')
 # Preserve shader texture coordinates; use an explicit target UV for baking.
 if key in {'ring','outer'}:
  rows=61;layer=len(mesh.vertices)//2;n=layer//rows
  assert layer==n*rows,(key,len(mesh.vertices),n)
  segments=16 if key=='outer' else 8;cols=4;atlas_rows=segments*2//cols
  arc=[0.]
  for j in range(n):arc.append(arc[-1]+(o.matrix_world.to_3x3()@(mesh.vertices[30*n+(j+1)%n].co-mesh.vertices[30*n+j].co)).length)
  profile=[0.]
  for k in range(1,rows):profile.append(profile[-1]+(o.matrix_world.to_3x3()@(mesh.vertices[k*n].co-mesh.vertices[(k-1)*n].co)).length)
  for poly in mesh.polygons:
   ids=list(poly.vertices);rim=not(all(v<layer for v in ids) or all(v>=layer for v in ids))
   js=[v%n for v in ids]
   if max(js)-min(js)>n/2:js=[j+n if j<n/2 else j for j in js]
   first=min(js);seg=min(segments-1,next((q for q in range(segments) if first<(q+1)*n//segments),segments-1))
   start=seg*n//segments;end=(seg+1)*n//segments;tile=seg+(segments if ids[0]>=layer else 0)
   for li,j in zip(poly.loop_indices,js):
    vi=mesh.loops[li].vertex_index;k=(vi%layer)//n
    if rim:coord=(.02+.96*arc[j]/arc[-1],.02+(.115 if k>rows/2 else 0)+(.08 if vi>=layer else 0))
    else:coord=((tile%cols+.025+.95*(arc[j]-arc[start])/(arc[end]-arc[start]))/cols,.25+.75*(tile//cols+.08+.84*profile[k]/profile[-1])/atlas_rows)
    uv.data[li].uv=coord
 elif key in {'floor','ceiling'}:
  xs=[v.co.x for v in mesh.vertices];ys=[v.co.y for v in mesh.vertices]
  xmin,xmax,ymin,ymax=min(xs),max(xs),min(ys),max(ys)
  for poly in mesh.polygons:
   visible=poly.normal.z<-.9 if key=='ceiling' else poly.normal.z>.9
   for li in poly.loop_indices:
    v=mesh.vertices[mesh.loops[li].vertex_index].co
    u=(v.x-xmin)/(xmax-xmin);w=(v.y-ymin)/(ymax-ymin)
    uv.data[li].uv=(.015+.97*u,.055+.93*w) if visible else (.015+.97*u,.004+.02*w)
 else:
  # Smart unwrap preserves original product UV0; explicit bake target is UV1.
  mesh.uv_layers.active=uv
  bpy.context.view_layer.objects.active=o
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.045);bpy.ops.object.mode_set(mode='OBJECT')
 return o.data.uv_layers['GalleryBake']
receivers=[]
for o in list(s.objects):
 if o.type!='MESH' or o.name in BOTTLE or o.name.startswith('Ceiling ') and 'diffuser' in o.name:continue
 if o.get('galleryProject')=='Mac-Lamp' and o.get('galleryRole')=='project':continue
 key=label(o)
 if PILOT and key not in {'ring','podium-04','well-04','floor','ceiling'}:continue
 receivers.append((o,key))
# Modifiers/UV preparation on a disposable copy, full approved geometry retained.
for o,key in receivers:
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
 old_render=next((u.name for u in o.data.uv_layers if u.active_render),None)
 uv=uv_for(o,key)
 if old_render and o.data.uv_layers.get(old_render):o.data.uv_layers[old_render].active_render=True
 else:uv.active_render=True
 resolution=512 if PILOT else 3072 if key=='outer' else 2048 if key in {'ring','floor','ceiling'} else 1024 if key.startswith('podium') or o.get('galleryProject')=='Unify' and 'Body' in o.name else 512
 image=bpy.data.images.new('HDR diffuse '+key,width=resolution,height=resolution,float_buffer=True)
 image.colorspace_settings.name='Linear Rec.709'
 for i,mat in enumerate(o.data.materials):
  if mat is None:
   mat=bpy.data.materials.new('Unused fallback surface');mat.use_nodes=True
  else:mat=mat.copy()
  o.data.materials[i]=mat
  target=mat.node_tree.nodes.new('ShaderNodeTexImage');target.image=image;target.label='Scene-linear HDR diffuse target';mat.node_tree.nodes.active=target
 path=OUT+'/'+key+'.exr'
 if os.path.isfile(path):report('reuse '+key)
 else:
  report(key+' '+str(resolution)+'px 256 samples')
  bpy.ops.object.bake(type='DIFFUSE',uv_layer=uv.name)
  image.filepath_raw=path;image.file_format='OPEN_EXR';image.save_render(path,scene=s)
 o['galleryBakeLabel']=key;o['galleryBaked']=True
 o['galleryRole']='wall' if key in {'outer','ring'} else 'floor' if key=='floor' else 'podium' if key.startswith('podium') else 'project' if o.get('galleryProject') else 'ceiling'
# Pilot diagnostic: same camera, native beauty then a baked diffuse-only ring.
if PILOT:
 s.cycles.samples=64;s.render.resolution_x=800;s.render.resolution_y=500;s.render.resolution_percentage=100
 s.render.image_settings.file_format='PNG';s.render.image_settings.color_depth='8'
 s.camera=bpy.data.objects['01-center-wall'];s.render.filepath=OUT+'/pilot-native.png';bpy.ops.render.render(write_still=True)
 ring=next(o for o,key in receivers if key=='ring');old=list(ring.data.materials)
 mat=bpy.data.materials.new('Pilot outgoing diffuse');mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear()
 tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(OUT+('/denoised/ring.exr' if os.path.isfile(OUT+'/denoised/ring.exr') else '/ring.exr'),check_existing=False)
 coords=nodes.new('ShaderNodeUVMap');coords.uv_map='GalleryBake';emit=nodes.new('ShaderNodeEmission');output=nodes.new('ShaderNodeOutputMaterial')
 mat.node_tree.links.new(coords.outputs['UV'],tex.inputs['Vector']);mat.node_tree.links.new(tex.outputs['Color'],emit.inputs['Color']);mat.node_tree.links.new(emit.outputs[0],output.inputs[0])
 ring.data.materials.clear();ring.data.materials.append(mat)
 s.render.filepath=OUT+'/pilot-baked.png';bpy.ops.render.render(write_still=True)
 ring.data.materials.clear()
 for m in old:ring.data.materials.append(m)
 s.render.image_settings.file_format='OPEN_EXR';s.render.image_settings.color_depth='16'
# Export native PBR plus dummy emissive texture explicitly binding bake UVs.
# Runtime replaces this placeholder with the separately encoded HDR radiance.
dummy=bpy.data.images.new('HDR map binding placeholder',width=1,height=1);dummy.pixels=(0,0,0,1)
dummy.file_format='PNG';dummy.filepath_raw=OUT+'/placeholder.png';dummy.save()
for o,key in receivers:
 for m in o.data.materials:
  bsdf=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if not bsdf:continue
  tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=dummy
  coords=m.node_tree.nodes.new('ShaderNodeUVMap');coords.uv_map='GalleryBake'
  m.node_tree.links.new(coords.outputs['UV'],tex.inputs['Vector']);m.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Emission Color']);bsdf.inputs['Emission Strength'].default_value=1
# Preserve native emitters. Bottle is merged from immutable approved web asset later.
bpy.ops.object.select_all(action='DESELECT')
for o in s.objects:
 if o.type in {'MESH','CURVE'} and o.name not in BOTTLE:o.select_set(True)
 if o.type=='CURVE' or 'luminous diffuser' in o.name:o['galleryRole']='emitter'
report('export geometry')
bpy.ops.export_scene.gltf(filepath=OUT+'/gallery.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False,export_texcoords=True)
manifest={'variant':'fourth','pilot':PILOT,'floorY':0,'eyeHeight':1.9386224159559822,'heightScale':1.6410608137401594,'ceilingHeight':4.904407981783152,'fov':90,'speed':3.45,'spawn':[0,1.9386224159559822,0],'yaw':math.pi,'pitch':.054,'exposureEV':s.view_settings.exposure,'viewTransform':s.view_settings.view_transform,'look':s.view_settings.look,'source':'gallery-review-v05.blend','receivers':[key for o,key in receivers],'quality':{'samples':256,'adaptiveThreshold':.01,'floatMasters':'OpenEXR half float ZIP','noRescale':True}}
with open(OUT+'/scene.json','w') as f:json.dump(manifest,f,indent=2)
report('complete')
