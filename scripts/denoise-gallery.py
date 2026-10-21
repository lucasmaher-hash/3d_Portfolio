"""Denoise Cycles light bakes with the OpenImageDenoise bundled with Blender."""
import ctypes as c
from pathlib import Path
import sys
import numpy as np
from PIL import Image

root = Path(sys.argv[1])
output = root / 'denoised'
output.mkdir(exist_ok=True)
lib = c.CDLL('/Applications/Blender.app/Contents/Resources/lib/libOpenImageDenoise.dylib')
def bind(name, result, *args):
    fn = getattr(lib, name)
    fn.restype, fn.argtypes = result, args
    return fn
device_new = bind('oidnNewDevice', c.c_void_p, c.c_int)
device_commit = bind('oidnCommitDevice', None, c.c_void_p)
filter_new = bind('oidnNewFilter', c.c_void_p, c.c_void_p, c.c_char_p)
image_set = bind('oidnSetSharedFilterImage', None, c.c_void_p, c.c_char_p, c.c_void_p,
                 c.c_int, c.c_size_t, c.c_size_t, c.c_size_t, c.c_size_t, c.c_size_t)
bool_set = bind('oidnSetFilterBool', None, c.c_void_p, c.c_char_p, c.c_bool)
commit = bind('oidnCommitFilter', None, c.c_void_p)
execute = bind('oidnExecuteFilter', None, c.c_void_p)
release = bind('oidnReleaseFilter', None, c.c_void_p)
error = bind('oidnGetDeviceError', c.c_int, c.c_void_p, c.POINTER(c.c_char_p))
device = device_new(1)
device_commit(device)
for path in sorted(root.glob('*.png')):
    pixels = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32) / 255
    result = np.empty_like(pixels)
    h, w, _ = pixels.shape
    filt = filter_new(device, b'RT')
    for name, data in [(b'color', pixels), (b'output', result)]:
        image_set(filt, name, data.ctypes.data, 3, w, h, 0, 0, 0)
    bool_set(filt, b'hdr', False)
    bool_set(filt, b'srgb', True)
    commit(filt)
    execute(filt)
    message = c.c_char_p()
    if error(device, c.byref(message)):
        raise RuntimeError(message.value)
    Image.fromarray((np.clip(result, 0, 1) * 255).astype(np.uint8)).save(output / path.name)
    release(filt)
    print('Denoised ' + path.name, flush=True)
