import ctypes as c,sys,os,json,math
from pathlib import Path
import numpy as np
import OpenImageIO as oiio
root=Path(sys.argv[1]);out=root/'denoised';out.mkdir(exist_ok=True)
lib=c.CDLL('/Applications/Blender.app/Contents/Resources/lib/libOpenImageDenoise.dylib')
def bind(n,r,*a):
 f=getattr(lib,n);f.restype=r;f.argtypes=a;return f
new=bind('oidnNewDevice',c.c_void_p,c.c_int);commit_device=bind('oidnCommitDevice',None,c.c_void_p)
new_filter=bind('oidnNewFilter',c.c_void_p,c.c_void_p,c.c_char_p)
setimage=bind('oidnSetSharedFilterImage',None,c.c_void_p,c.c_char_p,c.c_void_p,c.c_int,c.c_size_t,c.c_size_t,c.c_size_t,c.c_size_t,c.c_size_t)
setbool=bind('oidnSetFilterBool',None,c.c_void_p,c.c_char_p,c.c_bool)
commit=bind('oidnCommitFilter',None,c.c_void_p);execute=bind('oidnExecuteFilter',None,c.c_void_p);release=bind('oidnReleaseFilter',None,c.c_void_p)
geterror=bind('oidnGetDeviceError',c.c_int,c.c_void_p,c.POINTER(c.c_char_p))
device=new(1);commit_device(device)
for path in sorted(root.glob('*.exr')):
 if (out/path.name).exists() and (out/path.name).stat().st_mtime>=path.stat().st_mtime:continue
 image=oiio.ImageBuf(str(path));pixels=np.ascontiguousarray(image.get_pixels(oiio.FLOAT)[...,:3],dtype=np.float32)
 result=np.empty_like(pixels);h,w,_=pixels.shape
 f=new_filter(device,b'RT')
 for n,data in [(b'color',pixels),(b'output',result)]:setimage(f,n,data.ctypes.data,3,w,h,0,0,0)
 setbool(f,b'hdr',True);setbool(f,b'srgb',False);commit(f);execute(f)
 msg=c.c_char_p()
 if geterror(device,c.byref(msg)):raise RuntimeError(msg.value)
 spec=oiio.ImageSpec(w,h,3,oiio.HALF);spec.attribute('compression','zip');spec.attribute('oiio:ColorSpace','Linear Rec.709')
 target=oiio.ImageOutput.create(str(out/path.name));target.open(str(out/path.name),spec);target.write_image(result);target.close();release(f)
 print('HDR denoised '+path.name,flush=True)
