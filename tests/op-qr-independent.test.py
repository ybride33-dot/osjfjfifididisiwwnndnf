#!/usr/bin/env python3
"""Cross-check vendored QR codec against OpenCV, not just against itself."""
import subprocess,json,pathlib,cv2,numpy as np,base64
root=pathlib.Path(__file__).resolve().parent.parent
messages=['hello world','https://example.org/test?a=1','안녕 자비스 😊','QR 시험 123']
js='''const Q=require('./op-qr'),e=require('./vendor/qrcode-generator'); const s=JSON.parse(process.argv[1]);const q=Q.makeQr(s,e),n=q.getModuleCount(),m=[];for(let y=0;y<n;y++){let r='';for(let x=0;x<n;x++)r+=q.isDark(y,x)?'1':'0';m.push(r);}console.log(JSON.stringify(m));'''
for message in messages:
 rows=json.loads(subprocess.check_output(['node','-e',js,json.dumps(message,ensure_ascii=False)],cwd=root,text=True));n=len(rows);raw=np.full((n+8,n+8),255,dtype=np.uint8)
 for y,row in enumerate(rows):
  for x,c in enumerate(row):
   if c=='1':raw[y+4,x+4]=0
 img=cv2.resize(raw,None,fx=8,fy=8,interpolation=cv2.INTER_NEAREST);text,_,_=cv2.QRCodeDetector().detectAndDecode(img);assert text==message,(message,text)
print('PASS 4 generated QR codes independently read by OpenCV, including Korean and emoji')
# OpenCV's encoder generates additional independent QR examples for jsQR.
reader="""const jsQR=require('./vendor/jsqr');let input='';process.stdin.on('data',x=>input+=x);process.stdin.on('end',()=>{const x=JSON.parse(input),pixels=new Uint8ClampedArray(Buffer.from(x.data,'base64'));const r=jsQR(pixels,x.w,x.h);console.log(JSON.stringify(r&&r.data));});"""
for message in ['external QR example','https://example.org/path','QR 123']:
 matrix=cv2.QRCodeEncoder_create().encode(message);matrix=cv2.copyMakeBorder(matrix,4,4,4,4,cv2.BORDER_CONSTANT,value=255);matrix=cv2.resize(matrix,None,fx=8,fy=8,interpolation=cv2.INTER_NEAREST);rgba=cv2.cvtColor(matrix,cv2.COLOR_GRAY2RGBA);h,w=matrix.shape;data=json.dumps({'w':w,'h':h,'data':base64.b64encode(rgba.tobytes()).decode()});result=json.loads(subprocess.check_output(['node','-e',reader],cwd=root,input=data,text=True));assert result==message,(message,result)
print('PASS jsQR reads 3 QR codes independently created by OpenCV')
