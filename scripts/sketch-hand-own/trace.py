import cv2, numpy as np, potrace, json, sys
def trace_svg(ink, scale=0.5, tol=0.6, turd=8):
    ys,xs=np.where(ink); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    c=ink[y0:y1,x0:x1].astype(np.uint8)*255
    c=cv2.resize(cv2.GaussianBlur(c,(0,0),1.2),None,fx=scale,fy=scale,interpolation=cv2.INTER_AREA)
    c=np.pad(c,3)>110
    bm=potrace.Bitmap(~c)
    paths=bm.trace(turdsize=turd,alphamax=1.0,opticurve=True,opttolerance=tol)
    h,w=c.shape
    f=lambda v:('%.1f'%v).rstrip('0').rstrip('.')
    d=[]
    for cv in paths:
        d.append('M%s %s'%(f(cv.start_point.x),f(cv.start_point.y)))
        for s in cv.segments:
            if s.is_corner: d.append('L%s %s L%s %s'%(f(s.c.x),f(s.c.y),f(s.end_point.x),f(s.end_point.y)))
            else: d.append('C%s %s %s %s %s %s'%(f(s.c1.x),f(s.c1.y),f(s.c2.x),f(s.c2.y),f(s.end_point.x),f(s.end_point.y)))
        d.append('Z')
    return w,h,''.join(d)
def svg(w,h,d,fill='#000'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><path fill="{fill}" fill-rule="evenodd" d="{d}"/></svg>'
if __name__=='__main__':
    bw=(cv2.imread('own/bw.png',0)<128)
    lab=np.load('own/lab.npy'); line=np.load('own/line.npy')
    def region(li,x0,x1):
        m=np.isin(lab,np.where(line==li)[0]); r=np.zeros_like(m); r[:,x0:x1]=m[:,x0:x1]; return r
    out='own/out'; import os; os.makedirs(out,exist_ok=True)
    # selection: line 3 from the "A" onward (the first ◁ is the chevron)
    sel=region(3,0,3000)&~(lab==36); hint=region(1,0,3023)|region(2,0,3023)
    arrow=(lab==56)
    for name,m in [('hand-select',sel),('hand-hint',hint),('hand-arrow',arrow)]:
        w,h,d=trace_svg(m); open(f'{out}/{name}.svg','w').write(svg(w,h,d)); print(name,w,h,len(d))
    # pencil line + dot from IMG_9903
    im=cv2.imread('own/9903.png'); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
    d=cv2.GaussianBlur(g,(0,0),40)-g
    print(np.percentile(d,[50,90,99,99.5]))
    m=(d>22).astype(np.uint8); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,l,st,_=cv2.connectedComponentsWithStats(m,8)
    for k in range(1,n):
        if st[k][4]>200: print(k,st[k])
    np.save('own/l9903.npy',l); cv2.imwrite('own/m9903.png',255-m*255)
