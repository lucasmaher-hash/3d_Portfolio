import cv2, numpy as np, sys
from trace import trace_svg, svg
bw=(cv2.imread('own/bw.png',0)<128).astype(np.uint8)
n,lab,st,cen=cv2.connectedComponentsWithStats(bw,8)
line=np.load('own/line.npy')
def band(m):
    rows=m.sum(1).astype(float)
    rows=cv2.GaussianBlur(rows.reshape(-1,1),(1,0),sigmaX=0,sigmaY=3).ravel()
    ys=np.where(rows>0.4*rows.max())[0]
    return ys.min(),ys.max()
SHEAR={1:0.324,23:0.22}; BOTTOM={23}   # 23 = t of 'to'   # k of 'click': stem leaned 18 deg, the rest of the writing ~33 deg
def align(ids, tiny=400):
    comps=[dict(k=k,x=st[k][0],y=st[k][1],w=st[k][2],h=st[k][3],a=st[k][4]) for k in ids]
    units=[c for c in comps if c['a']>=tiny]; dots=[c for c in comps if c['a']<tiny]
    for c in units:
        sub=(lab[c['y']:c['y']+c['h'],c['x']:c['x']+c['w']]==c['k'])
        t,b=band(sub); c['bt']=c['y']+t; c['bb']=c['y']+b; c['bh']=b-t+1; c['kids']=[]
    xh0=np.median([c['bh'] for c in units if c['bh']/c['h']>0.45])
    for c in units: c['ok']=0.75*xh0<c['bh']<1.3*xh0
    rel=sorted([c for c in units if c['ok']],key=lambda c:c['x']+c['w']/2)
    xh=np.median([c['bh'] for c in rel]); base=np.median([c['bb'] for c in rel])
    for c in rel:
        if abs(base-c['bb'])>25: c['ok']=False   # band is not the letter's baseline (e.g. f): leave it where it is
    rel=[c for c in rel if c['ok']]
    xh=np.median([c['bh'] for c in rel]); base=np.median([c['bb'] for c in rel])
    cxs=[c['x']+c['w']/2 for c in rel]; dys=[base-c['bb'] for c in rel]
    for c in units:
        if c['ok']:
            c['dy']=base-c['bb']; s=xh/c['bh']; c['s']=1+(s-1)*0.8 if 0.82<s<1.22 else 1.0; c['py']=c['bb']
        else:
            c['dy']=float(np.interp(c['x']+c['w']/2,cxs,dys)); c['s']=1.0; c['py']=c['y']+c['h']
            if c['k'] in BOTTOM: c['dy']=base-(c['y']+c['h'])
    for d in dots:
        def gap(o):
            gx=max(o['x']-(d['x']+d['w']),d['x']-(o['x']+o['w']),0); gy=max(o['y']-(d['y']+d['h']),d['y']-(o['y']+o['h']),0)
            return gx*2+gy
        min(units,key=gap)['kids'].append(d)
    print('xh',xh,'base',base,'unreliable',[(c['x'],int(c['bh'])) for c in units if not c['ok']])
    H,W=bw.shape
    out=np.zeros((H+400,W+400),np.uint8)
    for c in units:
        s=c['s']; px=c['x']+c['w']/2; py=c['py']
        for p in [c]+c['kids']:
            m=(lab[p['y']:p['y']+p['h'],p['x']:p['x']+p['w']]==p['k']).astype(np.uint8)*255
            if p['k'] in SHEAR:   # lean the stroke like the rest of the writing (about the bottom of its band)
                sh=SHEAR[p['k']]; hb=p['bb']-p['y'] if ('bb' in p and p['k'] not in BOTTOM) else p['h']
                m=cv2.warpAffine(m,np.float32([[1,-sh,sh*hb],[0,1,0]]),(m.shape[1]+int(sh*hb)+2,m.shape[0]))
                p=dict(p,w=m.shape[1])
            nw=max(1,int(round(p['w']*s))); nh=max(1,int(round(p['h']*s)))
            m2=cv2.resize(m,(nw,nh),interpolation=cv2.INTER_AREA) if s!=1.0 else m
            nx=int(round(px+(p['x']-px)*s)); ny=int(round(py+c['dy']+(p['y']-py)*s))
            out[ny+200:ny+200+nh,nx+200:nx+200+nw]|=(m2>100).astype(np.uint8)
    return out[200:200+H,200:200+W]>0
if __name__=='__main__':
    ids=lambda li:[k for k in range(1,n) if line[k]==li and k!=17]
    import os
    res={}
    sel=align([k for k in ids(3) if k!=36])
    hint=align(ids(1))|align(ids(2))
    for name,m in [('hand-select',sel),('hand-hint',hint)]:
        w,h,d=trace_svg(m); open(f'own/out/{name}.svg','w').write(svg(w,h,d)); print(name,w,h)
