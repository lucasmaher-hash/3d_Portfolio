import numpy as np, cv2, json
from PIL import Image
a=np.array(Image.open('siqi/intro1.png').convert('RGBA'))[:,:,3].astype(float)
bw=(a>100)
LINES=[(13,48),(83,120),(153,190),(223,260)]
WORDS=[
 [('A',2,21),('selection',35,149),('of',164,196),('my',200,242),('sketches',256,384),('and',396,457)],
 [('drawings',1,126),('of',141,173),('movie,',177,256),('real-life',272,388),('and',394,455)],
 [('imaginary',1,142),('characters',158,310),('and',322,383),('scenes,',394,488)],
 [('created',3,105),('with',117,194),('pen,',200,260),('pencil',275,365),('and',371,432),('watercolor',444,595)],
]
W={'a':1,'c':.85,'d':1.05,'e':.8,'f':.75,'g':1,'h':1,'i':.42,'k':.95,'l':.42,'m':1.5,'n':1,'o':.9,'p':1,'r':.75,'s':.8,'t':.7,'v':.9,'w':1.45,'y':1,'A':1.3,',':.35,'-':.6}
out=[]
for li,((y0,y1),words) in enumerate(zip(LINES,WORDS)):
    band=bw[y0-3:y1+3]
    col=band.sum(0)
    for word,x0,x1 in words:
        n=len(word); L=x1-x0
        tot=sum(W[c] for c in word); exp=[W[c]/tot*L for c in word]
        # DP: cuts c_1..c_{n-1} in (x0,x1)
        INF=1e18
        pos=list(range(x0,x1+1))
        # cost of cut at x: col[x] ; width penalty
        best={(0,x0):(0,None)}
        layer={x0:(0,None)}
        layers=[layer]
        for k in range(n):
            nl={}
            for x,(cst,_) in layer.items():
                lo=x+max(2,int(exp[k]*0.45)); hi=x+int(exp[k]*1.8)+2
                ends=[x1] if k==n-1 else range(lo,min(hi,x1-1)+1)
                for e in ends:
                    w=e-x
                    c=cst+(0 if k==n-1 else col[e]*3)+((w-exp[k])/max(exp[k],1))**2*6
                    if e not in nl or c<nl[e][0]: nl[e]=(c,x)
            layers.append(nl); layer=nl
        # backtrack
        cuts=[x1]; e=x1
        for k in range(n,0,-1):
            e=layers[k][e][1]; cuts.append(e)
        cuts=cuts[::-1]
        for k,ch in enumerate(word):
            out.append(dict(ch=ch,line=li,x0=int(cuts[k]),x1=int(cuts[k+1]),word=word))
json.dump(out,open('siqi/glyphs.json','w'))
# contact sheet: each glyph crop zoom 4 with label
cells=[]
for g in out:
    y0,y1=LINES[g['line']]
    crop=(255-bw[y0-6:y1+8, g['x0']:g['x1']]*255).astype(np.uint8)
    z=cv2.resize(crop,None,fx=4,fy=4,interpolation=cv2.INTER_NEAREST)
    z=cv2.copyMakeBorder(z,18,2,2,2,cv2.BORDER_CONSTANT,value=230)
    cv2.putText(z,g['ch'],(3,14),cv2.FONT_HERSHEY_SIMPLEX,0.5,0,1)
    cells.append(z)
H=max(c.shape[0] for c in cells)
rows=[];cur=[];wsum=0
for c in cells:
    c=cv2.copyMakeBorder(c,0,H-c.shape[0],0,0,cv2.BORDER_CONSTANT,value=255)
    if wsum+c.shape[1]>1400: rows.append(np.hstack(cur)); cur=[];wsum=0
    cur.append(c); wsum+=c.shape[1]
rows.append(np.hstack(cur))
Wd=max(r.shape[1] for r in rows)
sheet=np.vstack([cv2.copyMakeBorder(r,0,4,0,Wd-r.shape[1],cv2.BORDER_CONSTANT,value=255) for r in rows])
cv2.imwrite('siqi/sheet.png',sheet); print(sheet.shape, len(out))
