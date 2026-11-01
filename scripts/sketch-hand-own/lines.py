import cv2, numpy as np
bw = (cv2.imread('own/bw.png',0)<128).astype(np.uint8)
n,lab,st,cen = cv2.connectedComponentsWithStats(bw,8)
line = np.zeros(n,int)
for k in range(1,n):
    cy=cen[k][1]; area=st[k][4]
    if area<40: line[k]=-1; continue
    line[k]= 1 if cy<345 else 2 if cy<585 else 3 if cy<900 else 4
np.save('own/lab.npy',lab); np.save('own/line.npy',line)
for li,(y0,y1) in {1:(20,345),2:(340,620),3:(560,830)}.items():
    mask = np.isin(lab, np.where(line==li)[0])
    img = (255*(1-mask[y0:y1])).astype(np.uint8)
    img = cv2.cvtColor(img,cv2.COLOR_GRAY2BGR)
    for x in range(0,img.shape[1],50):
        cv2.line(img,(x,0),(x,img.shape[0]),(255,200,200) if x%100 else (200,200,255),1)
        if x%100==0: cv2.putText(img,str(x),(x+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,200),1)
    cv2.imwrite(f'own/L{li}.png',img[:, :])
    print(li,img.shape)
for k in range(1,n):
    if line[k]==4 or line[k]==-1 and st[k][4]>15: print(k,st[k],line[k])
