import numpy as np, json
P=np.load('pathP.npy'); n=len(P)
i0,i1=900,1325
ctrl=np.array([P[880],P[i0],[17.25,-5.2],[18.6,-8.0],[19.3,-11.2],[18.75,-14.3],[17.0,-17.0],[14.5,-19.25],[11.5,-20.6],[8.4,-21.08],[6.4,-21.17],P[i1],P[i1+20]])
def cr(p0,p1,p2,p3,m=200,alpha=.5):
    def tj(ti,pi,pj): return ti+np.linalg.norm(pj-pi)**alpha
    t0=0;t1=tj(t0,p0,p1);t2=tj(t1,p1,p2);t3=tj(t2,p2,p3)
    t=np.linspace(t1,t2,m,endpoint=False)[:,None]
    A1=(t1-t)/(t1-t0)*p0+(t-t0)/(t1-t0)*p1; A2=(t2-t)/(t2-t1)*p1+(t-t1)/(t2-t1)*p2; A3=(t3-t)/(t3-t2)*p2+(t-t2)/(t3-t2)*p3
    B1=(t2-t)/(t2-t0)*A1+(t-t0)/(t2-t0)*A2; B2=(t3-t)/(t3-t1)*A2+(t-t1)/(t3-t1)*A3
    return (t2-t)/(t2-t1)*B1+(t-t1)/(t2-t1)*B2
dense=np.vstack([cr(*ctrl[k:k+4]) for k in range(len(ctrl)-3)]+[ctrl[-2:-1]])
# resample section at ~old spacing
seg=np.linalg.norm(np.diff(dense,axis=0),axis=1); s=np.r_[0,np.cumsum(seg)]
sp=np.mean(np.linalg.norm(np.diff(P,axis=0),axis=1))
m=int(round(s[-1]/sp)); u=np.linspace(0,s[-1],m+1)
sec=np.c_[np.interp(u,s,dense[:,0]),np.interp(u,s,dense[:,1])]
newP=np.vstack([P[:i0],sec[:-1],P[i1:]])
# light smoothing around the two joins (±25 pts), keeps rest exact
J0=i0; J1=i0+len(sec)-1
Q=newP.copy()
for it in range(60):
    for J in (J0,J1):
        idx=np.arange(J-25,J+26)
        w=np.clip(1-np.abs(idx-J)/26,0,1)[:,None]
        Q[idx]=Q[idx]*(1-0.5*w)+0.5*w*(Q[idx-1]+Q[idx+1])/2
newP=Q
np.save('newP.npy',newP)
def curv(Pp):
    a=np.roll(Pp,1,0);b=Pp;c=np.roll(Pp,-1,0)
    ab=np.linalg.norm(b-a,axis=1);bc=np.linalg.norm(c-b,axis=1);ac=np.linalg.norm(c-a,axis=1)
    cross=(b-a)[:,0]*(c-b)[:,1]-(b-a)[:,1]*(c-b)[:,0]
    return 2*cross/(ab*bc*ac)
k=curv(newP); ko=curv(P)
print('old n',n,'new n',len(newP),'old L',np.sum(np.linalg.norm(np.roll(P,-1,0)-P,axis=1)),'new L',np.sum(np.linalg.norm(np.roll(newP,-1,0)-newP,axis=1)))
print('section idx',J0,J1)
print('new section curvature range',k[J0-30:J1+30].min().round(3),k[J0-30:J1+30].max().round(3),'old global',ko.min().round(3),ko.max().round(3))
print('min concave radius (room side) new section', (1/np.abs(k[J0-30:J1+30][k[J0-30:J1+30]>0])).min() if (k[J0-30:J1+30]>0).any() else None)
json.dump(newP.tolist(),open('newpath.json','w'))
area=lambda Q:0.5*np.sum(Q[:,0]*np.roll(Q[:,1],-1)-np.roll(Q[:,0],-1)*Q[:,1])
print('area old',abs(area(P)),'new',abs(area(newP)))
