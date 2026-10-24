exec(open('wallmodel.py').read())
LV=np.load('wallLV.npy').reshape(-1,4); CN=np.load('wallCN.npy').reshape(-1,4,3); EV=np.load('wallEV.npy'); SH=np.load('wallSH.npy')
kk=LV//J; jj=LV%J
dj0=(jj-jj[:,[1]])%J
base=np.where(dj0.min(1)==0, jj[:,1], 0)
# base = column of corner(s) with rel 0 when rel set is {0,1}
rel=(jj-jj[:,[1]])%J; rel[rel==J-1]=-1
b=(jj[:,1]+rel.min(1))%J; dj=(jj-b[:,None])%J
assert set(np.unique(dj))<= {0,1}
tkey=[tuple(r) for r in np.c_[kk,dj].tolist()]
tids={};tid=np.array([tids.setdefault(t,len(tids)) for t in tkey]); T=len(tids); print('templates',T)
temps=np.array(list(tids.keys()))  # (T,8)
face_of=np.full((T,J),-1); face_of[tid,b]=np.arange(len(LV))
assert (face_of>=0).all()
sj=np.load('sj.npy'); s_un=np.unwrap(sj/old.L*2*np.pi)*old.L/(2*np.pi); assert np.all(np.diff(s_un)>0)
pr=np.load('prof.npy'); po,to,no=old.at(sj)
# local loop normals per (template, phase, corner)
locN=np.zeros((T,10,4,3))
for c in range(4):
    col=(b+dj[:,c])%J; N=CN[:,c]
    L3=np.c_[(N[:,:2]*to[col]).sum(1),(N[:,:2]*no[col]).sum(1),N[:,2]]
    for f in range(10):
        m=(b%10==f)
        np.add.at(locN[:,f,c],tid[m],L3[m])
locN/=np.linalg.norm(locN,axis=-1,keepdims=True)
# sharp per (template, phase, edge c->c+1)
eset=set(map(tuple,np.sort(EV[SH],1).tolist()))
shr=np.zeros((T,10,4)); cnt=np.zeros((T,10,4))
for c in range(4):
    a=LV[:,c]; bb=LV[:,(c+1)%4]; key=np.sort(np.c_[a,bb],1)
    s=np.array([tuple(x) in eset for x in key.tolist()])
    for f in range(10):
        m=(b%10==f); np.add.at(shr[:,f,c],tid[m],s[m]); np.add.at(cnt[:,f,c],tid[m],1)
r=shr/cnt; print('sharp ratio purity',np.mean((r<.05)|(r>.95)))
sharpT=r>0.5
# typical period
st=s_un[::10]; per=np.diff(st); good=np.where(np.abs(per-0.7218)<0.004)[0]
offs=np.array([(s_un[10*q:10*q+10]-s_un[10*q]) for q in good]).mean(0); P0=per[good].mean()
print('typical period',P0,len(good),'offs',offs.round(4))
Pn=np.load('newP.npy'); new=Path(Pn)
lo=old.S[870]; hi=old.S[1355]; shift=new.S[1325+len(Pn)-len(P)]-old.S[1325]
nper=J//10
qa=max(q for q in range(nper) if s_un[10*q+9]<lo)+1
qb=min(q for q in range(qa,nper) if s_un[10*q]>hi)
# The kept columns after the section are copied verbatim, so place them by where the first
# one actually lies on the new path (an arc offset read off the smoothed join was 2 cm off
# and folded the last faces back over).
shift=float(new.project(G[30,10*qb:10*qb+1,:2])[0])-s_un[10*qb]
sa=s_un[10*qa]; sb=s_un[10*qb]+shift
mp=int(round((sb-sa)/P0)); pp=(sb-sa)/mp
print('replace periods',qa,qb,'old',qb-qa,'new',mp,'period',round(pp,4),'shift',round(shift,3))
newS=sa+np.add.outer(np.arange(mp)*pp, offs*pp/P0).reshape(-1)
before=np.arange(0,10*qa); after=np.arange(10*qb,J)
oldidx=np.r_[before,-np.ones(len(newS),int),after]; Jn=len(oldidx)
phase=np.r_[before%10,np.tile(np.arange(10),mp),after%10]
colS=np.r_[s_un[before],newS,s_un[after]+shift]
fp,ft,fn=new.at(colS)
V=np.zeros((K,Jn,3))
V[:,:len(before)]=G[:,before]; V[:,len(before)+len(newS):]=G[:,after]
for i in range(len(newS)):
    c=len(before)+i; a,d,z=pr[phase[c]]
    V[:,c,:2]=fp[c]+a[:,None]*ft[c]+d[:,None]*fn[c]; V[:,c,2]=z
cs=np.diff(colS); print('col spacing min/max',cs.min().round(5),cs.max().round(4),'Jn',Jn)
# faces/normals
F=np.zeros((Jn,T,4),np.int64); NL=np.zeros((Jn,T,4,3)); SE=np.zeros((Jn,T,4),bool)
for j in range(Jn):
    j2=(j+1)%Jn
    cj=np.where(temps[:,4:]==0, j, j2)       # (T,4)
    F[j]=temps[:,:4]*Jn+cj
    SE[j]=sharpT[:,phase[j]]
    if oldidx[j]>=0 and oldidx[j2]>=0 and oldidx[j2]==(oldidx[j]+1)%J:
        NL[j]=CN[face_of[:,oldidx[j]]]
    else:
        l=locN[:,phase[j]]                      # (T,4,3)
        NL[j,...,:2]=l[...,0:1]*ft[cj]+l[...,1:2]*fn[cj]; NL[j,...,2]=l[...,2]
np.save('nwV.npy',V.reshape(-1,3).astype(np.float64)); np.save('nwF.npy',F.reshape(-1,4)); np.save('nwN.npy',NL.reshape(-1,3).astype(np.float32))
sharp_pairs=np.sort(np.c_[F.reshape(-1,4)[:, :].reshape(-1), np.roll(F.reshape(-1,4),-1,1).reshape(-1)],1)[SE.reshape(-1)]
np.save('nwSharp.npy',np.unique(sharp_pairs,axis=0))
np.save('nwRim.npy',V[0,:,:2]); np.save('nwJn.npy',np.array([Jn,K]))
# sanity: reconstruct check — old faces copied for unchanged; compare a reconstructed (model) wall at old path for new-region formula accuracy
print('faces',F.reshape(-1,4).shape,'verts',K*Jn)
