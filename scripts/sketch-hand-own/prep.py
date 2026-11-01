import cv2, numpy as np
im = cv2.imread('own/9901.png')
g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
bg = cv2.GaussianBlur(g,(0,0),40)
d = bg - g
print(np.percentile(d,[50,90,95,98,99]))
bw = (d>28).astype(np.uint8)*255
bw = cv2.morphologyEx(bw, cv2.MORPH_OPEN, np.ones((2,2),np.uint8))
cv2.imwrite('own/bw.png', 255-bw)
rows = bw.sum(1)/255
# line bands
band=[];on=False
for y,v in enumerate(rows):
    if v>3 and not on: s=y;on=True
    if v<=3 and on:
        on=False
        if y-s>20: band.append((s,y))
print(band)
