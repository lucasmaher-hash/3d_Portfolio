import json, numpy as np
from PIL import Image
from collections import deque
im=np.asarray(Image.open('img/sketch_up.png').convert('RGB')).astype(float)
R,G,B=im[...,0],im[...,1],im[...,2]
red=(R>60)&(R>1.7*G)&(R>1.7*B)
blue=(B>50)&(B>1.5*R)&(B>1.15*G)
M=np.load('M.npy')
def comps(mask,minsz=40):
    H,W=mask.shape; lab=np.zeros(mask.shape,int); out=[]; k=0
    for y,x in zip(*np.nonzero(mask)):
        if lab[y,x]: continue
        k+=1; q=deque([(y,x)]); lab[y,x]=k; pts=[]
        while q:
            a,b=q.popleft(); pts.append((b,a))
            for dy in (-2,-1,0,1,2):
                for dx in (-2,-1,0,1,2):
                    c,d=a+dy,b+dx
                    if 0<=c<H and 0<=d<W and mask[c,d] and not lab[c,d]: lab[c,d]=k; q.append((c,d))
        if len(pts)>=minsz: out.append(np.array(pts))
    return out
res={}
for name,m in [('red',red),('blue',blue)]:
    cs=comps(m); print(name,[ (len(c),c[:,0].min(),c[:,0].max(),c[:,1].min(),c[:,1].max()) for c in cs])
    res[name]=[(np.c_[c,np.ones(len(c))]@M).tolist() for c in cs]
json.dump(res,open('strokes.json','w'))
