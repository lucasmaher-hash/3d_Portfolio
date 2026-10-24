import json
import numpy as np
from PIL import Image
im=np.asarray(Image.open('img/sketch_up.png').convert('RGB')).astype(int)
R,G,B=im[...,0],im[...,1],im[...,2]
red=(R>150)&(R-G>70)&(R-B>60)
blue=(B>110)&(B-R>50)&(B-G>20)
ys,xs=np.nonzero(red); print('red px',len(xs), xs.min(),xs.max(),ys.min(),ys.max())
ys2,xs2=np.nonzero(blue); print('blue px',len(xs2))
# affine fit sketch->scene
S=np.array([[307,465],[795,380],[960,530],[412,1028],[832,800]],float)
W=np.array([[-14.063,7.916],[9.684,14.526],[18.526,6.526],[-8.211,-17.474],[11.789,-7.032]])
A=np.c_[S,np.ones(5)]; M,res,*_=np.linalg.lstsq(A,W,rcond=None)
print('M',M.round(4)); print('resid',(A@M-W).round(2))
np.save('M.npy',M)
Image.fromarray((red*255).astype(np.uint8)).save('redmask.png')
Image.fromarray((blue*255).astype(np.uint8)).save('bluemask.png')
