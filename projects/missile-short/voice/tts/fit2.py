import json,numpy as np,soundfile as sf,sys
from kokoro_onnx import Kokoro
from scipy import signal
K="/tmp/claude-0/-home-user-claude-animated-shorts/212da511-fe09-584c-9279-f550ba5fa642/scratchpad/kok/"
k=Kokoro(K+"model.onnx",K+"voices.bin"); VOICE=sys.argv[1]; SP=float(sys.argv[2])
L=json.load(open("m13_lines.json")); END=44.97; SR=48000; GAP=0.16
def trim(y,sr):
    th=0.006*np.abs(y).max(); idx=np.where(np.abs(y)>th)[0]; a=max(idx[0]-int(.02*sr),0); b=min(idx[-1]+int(.06*sr),len(y))
    return y[a:b]
clips=[]
for i,(a,b,t) in enumerate(L):
    s={5:1.22}.get(i,SP)
    while True:
        y,sr=k.create(t,voice=VOICE,speed=s,lang="en-us"); y=signal.resample_poly(trim(y,sr),SR,sr)
        nxt=L[i+1][0] if i+1<len(L) else END; prv=L[i-1][1] if i else 0
        if len(y)/SR <= (nxt-prv)-2*GAP-0.05 or s>=1.36 or i==5: break   # must fit between previous line's original end and next start
        s+=0.03
    clips.append([a,y,s])
# layout: start at original start; if it would overrun next start, shift earlier (not before prev end+GAP); otherwise push later
st=[c[0] for c in clips]; ends=[0]*len(st)
for i in range(len(st)):
    d=len(clips[i][1])/SR; nxt=st[i+1] if i+1<len(st) else END
    lo=(ends[i-1]+GAP) if i else 0.0
    st[i]=max(lo, min(st[i], nxt-GAP-d)); ends[i]=st[i]+d
out=np.zeros(int(45.0667*SR))
for i,c in enumerate(clips):
    n=int(st[i]*SR); y=c[1]; out[n:n+len(y)]+=y[:len(out)-n]
print(VOICE,[(i,round(clips[i][2],2),round(st[i]-clips[i][0],2),round(ends[i],2)) for i in range(len(st))])
print("max end",round(max(ends),2))
sf.write(f"voice_{VOICE}.wav",out.astype(np.float32),SR); json.dump([[round(a,3),round(b,3)] for a,b in zip(st,ends)],open(f"lay_{VOICE}.json","w"))
