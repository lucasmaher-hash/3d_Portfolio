import sys,os,json,math
from pathlib import Path
import numpy as np,OpenImageIO as oiio
root=Path(sys.argv[1]);out=Path(sys.argv[2]) if len(sys.argv)>2 else Path(__file__).resolve().parents[1]/'public/gallery-baked-assets/maps'
out.mkdir(parents=True,exist_ok=True)
manifest={}
for path in sorted((root/'denoised').glob('*.exr')):
 raw=np.ascontiguousarray(oiio.ImageBuf(str(path)).get_pixels(oiio.FLOAT)[...,:3],dtype=np.float32)
 if not np.isfinite(raw).all():raise RuntimeError('Non-finite bake '+path.name)
 pixels=np.maximum(raw,0);maximum=float(pixels.max());value_range=2**math.ceil(math.log2(max(1,maximum)))
 multiplier=np.maximum(np.ceil(pixels.max(axis=-1)/value_range*255)/255,1/255)
 rgb=pixels/(multiplier[...,None]*value_range)
 encoded=np.round(np.concatenate([rgb,multiplier[...,None]],axis=-1)*255).clip(0,255).astype(np.uint8)
 decoded=encoded[...,:3].astype(np.float32)/255*(encoded[...,3:4].astype(np.float32)/255)*value_range
 error=np.abs(decoded-pixels)
 h,w,_=encoded.shape;filename=path.stem+'.png'
 spec=oiio.ImageSpec(w,h,4,oiio.UINT8);spec.attribute('oiio:ColorSpace','data');spec.attribute('png:compressionLevel',8)
 # Alpha stores radiance magnitude, not opacity. PNG must preserve RGB bytes.
 spec.attribute('oiio:UnassociatedAlpha',1)
 output=oiio.ImageOutput.create(str(out/filename));output.open(str(out/filename),spec);output.write_image(encoded);output.close()
 config=oiio.ImageSpec();config.attribute('oiio:UnassociatedAlpha',1)
 verify=oiio.ImageInput.open(str(out/filename),config)
 stored=verify.read_image(format=oiio.UINT8);verify.close()
 if not np.array_equal(stored,encoded):raise RuntimeError('PNG changed RGBM data: '+filename)
 manifest[path.stem]={'file':filename,'range':value_range,'width':w,'height':h,'maxHDR':maximum,'encoding':'RGBM-linear','meanLinearError':float(error.mean()),'p99LinearError':float(np.quantile(error,.99))}
 print('Encoded',filename,w,h,'range',value_range,flush=True)
json.dump(manifest,open(root/'web-lightmaps.json','w'),indent=2)
