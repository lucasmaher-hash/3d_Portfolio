import json, numpy as np
from PIL import Image
exec(open('strokes.py').read().split("res={}")[0])
M=np.load('M.npy').astype(float)
T=lambda P: np.c_[np.asarray(P,float),np.ones(len(P))]@M
rc=comps(red); bc=comps(blue)
line=max(rc,key=len)
def centreline(pts,c,nb=60):
    a=np.degrees(np.arctan2(pts[:,1]-c[1],pts[:,0]-c[0])); bins=np.linspace(a.min(),a.max(),nb+1); out=[]
    for i in range(nb):
        s=(a>=bins[i])&(a<bins[i+1])
        if s.sum()>3: out.append(pts[s].mean(0))
    return np.array(out)
rl=centreline(line.astype(float),(700,850))
bl=centreline(np.vstack([c for c in bc if c[:,1].min()>740 and not (790<c[:,0].mean()<875 and c[:,1].mean()<840)]).astype(float),(700,850),40)
circ=[c for c in rc if c is not line]
vr=np.vstack([c for c in circ if c[:,0].mean()>800]); tm=[c for c in circ if c[:,0].mean()<800][0]
def ctr(p): return ((p[:,0].min()+p[:,0].max())/2,(p[:,1].min()+p[:,1].max())/2, (p[:,0].max()-p[:,0].min()+p[:,1].max()-p[:,1].min())/4)
out={"red":T(rl).tolist(),"blue":T(bl).tolist()}
for n,p in [("vr_new",vr),("tm",tm)]:
    cx,cy,r=ctr(p); w=T([[cx,cy]])[0]; out[n]=[w[0],w[1],r*0.048]; print(n,(cx,cy,r),w.round(2),round(r*0.048,2))
json.dump(out,open('sketch_world.json','w'))
json.dump(out['red'],open('red.json','w')); json.dump(out['blue'],open('blue.json','w'))
print(np.array(out['red'])[::6].round(1))
