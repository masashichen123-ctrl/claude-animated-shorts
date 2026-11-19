# Kokoro am_michael narration: one clip per line, joined with fixed pauses -> voice.wav (48 kHz mono) + lines.json
import json,re,sys,numpy as np,soundfile as sf
from kokoro_onnx import Kokoro
from scipy import signal
K=sys.argv[1]; SP=float(sys.argv[2]) if len(sys.argv)>2 else 1.2
k=Kokoro(K+"/model.onnx",K+"/voices.bin"); SR=48000
txt=open("SCRIPT.md").read().split("## Narration")[1]
lines=[re.sub(r"^\d+\.\s*","",l).strip() for l in txt.splitlines() if re.match(r"^\d+\.",l)]
SPEED={}; PAUSE={0:0.55,3:0.5,8:0.45,9:0.5,10:0.5,11:0.5}   # pause after line i (s); default 0.32
# inner beats: split "And lost." / "The emus are still there." / "The emus outran the truck." etc. on '. ' with a short gap
FIX={'ʌnlˈʌkili':'ˌʌnlˈʌkili'}   # 'Unluckily' otherwise sounds like 'and luckily'
def trim(y,sr):
    th=0.006*np.abs(y).max(); i=np.where(np.abs(y)>th)[0]; return y[max(i[0]-int(.02*sr),0):min(i[-1]+int(.06*sr),len(y))]
out=[np.zeros(int(0.12*SR))]; t=0.12; L=[]
for i,l in enumerate(lines):
    parts=[p for p in re.split(r"(?<=\.)\s+",l) if p]
    for j,p in enumerate(parts):
        ph=k.tokenizer.phonemize(p,"en-us")
        for a,b in FIX.items(): ph=ph.replace(a,b)
        y,sr=k.create(ph,voice="am_michael",speed=SPEED.get(i,SP),is_phonemes=True); y=signal.resample_poly(trim(y,sr),SR,sr)
        L.append({"line":i,"text":p,"s":round(t,3),"e":round(t+len(y)/SR,3)}); out.append(y); t+=len(y)/SR
        g=0.22 if j<len(parts)-1 else PAUSE.get(i,0.32); out.append(np.zeros(int(g*SR))); t+=g
y=np.concatenate(out); sf.write("voice/voice.wav",y.astype(np.float32),SR); json.dump(L,open("voice/lines.json","w"),indent=1)
print("duration",round(len(y)/SR,2),"words",sum(len(l.split()) for l in lines))
