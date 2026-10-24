import numpy as np, json
G=np.load('wallG.npy')            # (122,2220,3)  [k profile, j column]
P=np.load('pathP.npy')            # (2500,2) closed CW
K,J,_=G.shape
def arc(P):
    seg=np.roll(P,-1,0)-P; L=np.linalg.norm(seg,axis=1); return np.r_[0,np.cumsum(L)]
class Path:
    def __init__(s,P):
        s.P=P; s.S=arc(P); s.L=s.S[-1]
        Pc=np.vstack([P,P[:1]])
        s.Pc=Pc
        t=np.roll(P,-1,0)-np.roll(P,1,0); s.t=t/np.linalg.norm(t,axis=1)[:,None]
    def at(s,u):
        u=np.mod(u,s.L); i=np.clip(np.searchsorted(s.S,u,side='right')-1,0,len(s.P)-1)
        f=(u-s.S[i])/(s.S[i+1]-s.S[i])
        p=s.Pc[i]*(1-f)[:,None]+s.Pc[i+1]*f[:,None]
        t0=s.t[i]; t1=s.t[(i+1)%len(s.P)]; t=t0*(1-f)[:,None]+t1*f[:,None]; t/=np.linalg.norm(t,axis=1)[:,None]
        n=np.c_[t[:,1],-t[:,0]]   # right normal = inward for CW path
        return p,t,n
    def project(s,Q):
        # nearest arc param for points Q (brute force chunks)
        out=np.empty(len(Q))
        A=s.Pc[:-1]; B=s.Pc[1:]; AB=B-A; l2=(AB**2).sum(1)
        for i in range(0,len(Q),500):
            q=Q[i:i+500][:,None,:]
            f=np.clip(((q-A)*AB).sum(2)/l2,0,1)
            pt=A+f[...,None]*AB; dd=((q-pt)**2).sum(2); m=dd.argmin(1)
            out[i:i+500]=s.S[m]+f[np.arange(len(m)),m]*np.sqrt(l2[m])
        return out
old=Path(P)
