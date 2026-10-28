"""BASISU=/path/to/basisu python3 scripts/balanced-lightmaps.py
Requires Pillow + numpy. Originals remain untouched; CI only verifies outputs.
"""
import hashlib, json, os, subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'public/gallery-baked-assets'
out = root / 'maps-balanced'
out.mkdir(exist_ok=True)
settings = json.loads((root / 'scene.json').read_text())
manifest = {'encoding': 'UASTC-linear-RGBM', 'recipe': 'half-resolution-rdo2-original-png-floor', 'originals': ['floor'], 'maps': {}}
with tempfile.TemporaryDirectory(prefix='gallery-lightmaps-') as temporary:
    for key, info in settings['lightmaps'].items():
        if key == 'floor':
            continue
        source = root / 'maps' / info['file']
        source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        scale, rdo = (1, 0) if key == 'floor' else (0.5, 2)
        width, height = max(1, int(info['width'] * scale)), max(1, int(info['height'] * scale))
        png = source
        if scale != 1:
            rgba = np.asarray(Image.open(source).convert('RGBA')).astype('float32') / 255
            radiance = rgba[:, :, :3] * rgba[:, :, 3:4] * info['range']
            # Resample decoded LINEAR radiance, never opacity-premultiplied RGBM.
            small = np.stack([np.asarray(Image.fromarray(radiance[:, :, channel]).resize(
                (width, height), Image.Resampling.LANCZOS)) for channel in range(3)], axis=2).clip(0, info['range'])
            multiplier = np.maximum(np.ceil(small.max(2) / info['range'] * 255) / 255, 1 / 255)
            encoded = np.rint(np.concatenate([small / (multiplier[:, :, None] * info['range']),
                multiplier[:, :, None]], axis=2) * 255).clip(0, 255).astype('uint8')
            png = Path(temporary) / info['file']
            Image.fromarray(encoded).save(png)
        target = Path(temporary) / (key + '.ktx2')
        command = [os.environ.get('BASISU', 'basisu'), '-ktx2', '-uastc', '-uastc_level', '3',
            '-linear', '-force_alpha', '-mipmap', '-mip_filter', 'box', '-mip_clamp']
        if rdo:
            command += ['-uastc_rdo_l', str(rdo)]
        subprocess.run(command + ['-file', str(png), '-output_file', str(target)],
            check=True, stdout=subprocess.DEVNULL)
        data = target.read_bytes()
        file = f"{key}.{hashlib.sha256(data).hexdigest()[:12]}.ktx2"
        (out / file).write_bytes(data)
        manifest['maps'][key] = {'file': file, 'source': info['file'], 'sourceSHA256': source_hash,
            'width': width, 'height': height, 'range': info['range']}
        print(key, len(data), flush=True)
(root / 'lightmaps-balanced.json').write_text(json.dumps(manifest, indent=2) + '\n')
