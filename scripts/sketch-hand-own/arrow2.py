import cv2, numpy as np, potrace
import trace as T
bw=(cv2.imread('own/bw.png',0)<128).astype(np.uint8)
n,lab,st,_=cv2.connectedComponentsWithStats(bw,8)
x,y,w,h,a=st[56]
m=(lab[y:y+h,x:x+w]==56)
rows=np.arange(h)[:,None]; cols=np.arange(w)[None,:]
sx=190-55*rows/152.0                      # centre line of the vertical stroke
head=m.copy()
head[(cols>sx+11)&(rows>55)&(rows<125)]=False
head[:,215:]=False
# drop leftover tail fragments (small components)
n2,l2,s2,_=cv2.connectedComponentsWithStats(head.astype(np.uint8),8)
keep=np.argmax(s2[1:,4])+1; head=(l2==keep)
cv2.imwrite('own/out/head_prev.png',255-head.astype(np.uint8)*255)
def trace_frame(ink,scale=0.5,tol=0.6,turd=8):
    c=ink.astype(np.uint8)*255
    c=cv2.resize(cv2.GaussianBlur(c,(0,0),1.2),None,fx=scale,fy=scale,interpolation=cv2.INTER_AREA)
    c=np.pad(c,3)>110
    paths=potrace.Bitmap(~c).trace(turdsize=turd,alphamax=1.0,opticurve=True,opttolerance=tol)
    hh,ww=c.shape
    f=lambda v:('%.1f'%v).rstrip('0').rstrip('.')
    d=[]
    for cv in paths:
        d.append('M%s %s'%(f(cv.start_point.x),f(cv.start_point.y)))
        for s in cv.segments:
            if s.is_corner: d.append('L%s %s L%s %s'%(f(s.c.x),f(s.c.y),f(s.end_point.x),f(s.end_point.y)))
            else: d.append('C%s %s %s %s %s %s'%(f(s.c1.x),f(s.c1.y),f(s.c2.x),f(s.c2.y),f(s.end_point.x),f(s.end_point.y)))
        d.append('Z')
    return ww,hh,''.join(d)
for name,mm in [('hand-arrow-head',head),('hand-arrow',m)]:
    ww,hh,d=trace_frame(mm); open(f'own/out/{name}.svg','w').write(T.svg(ww,hh,d)); print(name,ww,hh)
