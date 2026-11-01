import numpy as np
from trace import trace_svg, svg
l=np.load('own/l9903.npy')
for name,k,sc,tol in [('timeline-line',2,0.35,1.0),('timeline-knob',17,1.0,0.6)]:
    w,h,d=trace_svg(l==k,scale=sc,tol=tol,turd=4)
    open(f'own/out/{name}.svg','w').write(svg(w,h,d)); print(name,w,h,len(d))
