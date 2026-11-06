import numpy as np, json, struct
from PIL import Image, ImageDraw, ImageFont
OUT="public/demo/immersive/"
try: F=lambda s: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",s)
except: F=None
def font(s):
    try: return ImageFont.truetype("DejaVuSans-Bold.ttf",s)
    except: return ImageFont.load_default(size=s)
# cabin box: x[-0.8,0.8] y[-0.6,0.6] z[-1.2,1.6], eye at origin
B=np.array([[-0.8,0.8],[-0.55,0.65],[-1.3,1.7]])
PURPLE=np.array([191,90,242])/255
def shade(d, led=True):
    # d: (...,3) unit dirs; return rgb
    t=np.full(d.shape[:-1],1e9); face=np.zeros(d.shape[:-1],int)
    for ax in range(3):
        for s,b in enumerate(B[ax]):
            with np.errstate(divide='ignore',invalid='ignore'):
                tt=b/d[...,ax]
            ok=(tt>0)&(tt<t); t=np.where(ok,tt,t); face=np.where(ok,ax*2+s,face)
    p=d*t[...,None]
    base={0:[.10,.10,.12],1:[.10,.10,.12],2:[.06,.06,.07],3:[.16,.15,.17],4:[.55,.62,.72],5:[.09,.09,.10]}
    col=np.zeros(d.shape); 
    for f,c in base.items(): col[face==f]=c
    # windshield (front z+ face upper) bright sky, dashboard lower
    front=face==5
    col[front&(p[...,1]>0.05)]=[.45,.55,.7]
    col[front&(p[...,1]<=0.05)]=[.07,.07,.08]
    # seats texture: subtle stripes on floor
    col[face==2]*= (0.8+0.2*(np.sin(p[...,2][face==2]*30)>0))[...,None]
    if led:
        g=np.zeros(d.shape[:-1])
        # dash strip: front face y≈0.05
        g+=np.where(front,np.exp(-((p[...,1]-0.05)/0.012)**2),0)
        # door strips: side faces y≈0.1
        side=(face==0)|(face==1)
        g+=np.where(side,np.exp(-((p[...,1]-0.1)/0.012)**2),0)
        # footwell: floor near sides
        g+=np.where(face==2,np.exp(-((np.abs(p[...,0])-0.75)/0.03)**2)*0.6,0)
        # roof stars
        rng=np.random.default_rng(1)
        roof=face==3
        star=(np.sin(p[...,0]*91)*np.sin(p[...,2]*77)>0.995)
        g+=np.where(roof&star,1,0)
        col=col*(1+0.4*np.clip(g,0,1)[...,None])+np.clip(g,0,1.5)[...,None]*PURPLE
    return np.clip(col,0,1)
def label(img,txt,size):
    d=ImageDraw.Draw(img); f=font(size)
    w=d.textlength(txt,font=f); x=(img.width-w)/2
    d.rectangle([x-20,10,x+w+20,20+size*1.3],fill=(0,0,0))
    d.text((x,15),txt,fill=(255,215,0),font=f)
# equirect 4096x2048
W,H=4096,2048
u=(np.arange(W)+.5)/W; v=(np.arange(H)+.5)/H
yaw=(u-.5)*2*np.pi; pitch=(.5-v)*np.pi
Y,P=np.meshgrid(yaw,pitch)
d=np.stack([np.sin(Y)*np.cos(P),np.sin(P),np.cos(Y)*np.cos(P)],-1)
im=Image.fromarray((shade(d)**(1/2.2)*255).astype(np.uint8))
dr=ImageDraw.Draw(im)
for k in range(4):
    txt="DEMO / DỮ LIỆU THỬ NGHIỆM - MÔ PHỎNG 3D"
    f=font(44); w=dr.textlength(txt,font=f); x=k*1024+512-w/2
    dr.rectangle([x-10,1300,x+w+10,1360],fill=(0,0,0)); dr.text((x,1305),txt,fill=(255,215,0),font=f)
im.save(OUT+"demo-suv-cabin-360.jpg",quality=86)
im.resize((1024,512)).save(OUT+"demo-suv-cabin-360-preview.jpg",quality=80)
# perspective views (same angle) for before/after + poster
def persp(w,h,led,fov=80,yaw0=0.0,pitch0=-0.1):
    f=0.5*w/np.tan(np.radians(fov)/2)
    xs=np.arange(w)-w/2+.5; ys=h/2-np.arange(h)-.5
    X,Yy=np.meshgrid(xs,ys); dd=np.stack([X,Yy,np.full_like(X,f)],-1)
    cp,sp=np.cos(pitch0),np.sin(pitch0)
    dd=np.stack([dd[...,0],dd[...,1]*cp+dd[...,2]*sp,-dd[...,1]*sp+dd[...,2]*cp],-1)
    dd/=np.linalg.norm(dd,axis=-1,keepdims=True)
    return Image.fromarray((shade(dd,led)**(1/2.2)*255).astype(np.uint8))
b=persp(1600,1000,False); label(b,"DEMO - TRƯỚC (chưa lắp LED) - MÔ PHỎNG",40); b.save(OUT+"demo-suv-before.jpg",quality=85)
a=persp(1600,1000,True); label(a,"DEMO - SAU (LED tím) - MÔ PHỎNG",40); a.save(OUT+"demo-suv-after.jpg",quality=85)
p=persp(1280,720,True,fov=95); label(p,"DEMO / DỮ LIỆU THỬ NGHIỆM - SUV DEMO",36); p.save(OUT+"demo-suv-poster.jpg",quality=82)

# ---- GLB cabin with LED_ meshes ----
def box(c,s):
    cx,cy,cz=c; sx,sy,sz=[v/2 for v in s]
    P=[];N=[];I=[]
    faces=[((1,0,0),(0,1,0),(0,0,1)),((-1,0,0),(0,1,0),(0,0,-1)),((0,1,0),(0,0,1),(1,0,0)),((0,-1,0),(0,0,-1),(1,0,0)),((0,0,1),(1,0,0),(0,1,0)),((0,0,-1),(-1,0,0),(0,1,0))]
    for n,a,bb in faces:
        n=np.array(n);a=np.array(a);bb=np.array(bb); base=len(P)
        half=np.array([sx,sy,sz])
        for i,j in [(-1,-1),(1,-1),(1,1),(-1,1)]:
            P.append(np.array(c)+(n+a*i+bb*j)*half); N.append(n)
        # winding: a x bb should == n
        if np.dot(np.cross(a,bb),n)>0: I+= [base,base+1,base+2,base,base+2,base+3]
        else: I+= [base,base+2,base+1,base,base+3,base+2]
    return np.array(P,np.float32),np.array(N,np.float32),np.array(I,np.uint16)
parts=[ # name, center, size, color, emissive
("Floor",(0,-0.5,0.2),(1.6,0.05,2.8),(0.08,0.08,0.09),None),
("Roof",(0,0.62,0.2),(1.6,0.04,2.8),(0.13,0.12,0.14),None),
("Dashboard",(0,-0.05,1.45),(1.5,0.35,0.3),(0.06,0.06,0.07),None),
("Door_L",(-0.8,0,0.2),(0.05,0.9,2.6),(0.1,0.1,0.11),None),
("Door_R",(0.8,0,0.2),(0.05,0.9,2.6),(0.1,0.1,0.11),None),
("Seat_FL",(-0.38,-0.25,0.4),(0.5,0.45,0.5),(0.2,0.14,0.1),None),
("Seat_FR",(0.38,-0.25,0.4),(0.5,0.45,0.5),(0.2,0.14,0.1),None),
("Seat_Rear",(0,-0.25,-0.8),(1.4,0.45,0.5),(0.2,0.14,0.1),None),
("LED_Dash",(0,0.13,1.29),(1.4,0.02,0.02),(0.75,0.35,0.95),(0.75,0.35,0.95)),
("LED_Door_L",(-0.77,0.08,0.2),(0.02,0.02,2.2),(0.75,0.35,0.95),(0.75,0.35,0.95)),
("LED_Door_R",(0.77,0.08,0.2),(0.02,0.02,2.2),(0.75,0.35,0.95),(0.75,0.35,0.95)),
("LED_Footwell",(0,-0.47,1.1),(1.3,0.02,0.04),(0.75,0.35,0.95),(0.75,0.35,0.95)),
("LED_Roof",(0,0.59,0.1),(0.9,0.02,1.4),(0.4,0.2,0.5),(0.75,0.35,0.95)),
]
bin_=bytearray(); bv=[];acc=[];meshes=[];nodes=[];mats=[]
def addbuf(arr,target):
    while len(bin_)%4: bin_.append(0)
    off=len(bin_); bin_.extend(arr.tobytes()); bv.append({"buffer":0,"byteOffset":off,"byteLength":arr.nbytes,"target":target}); return len(bv)-1
for name,c,s,col,em in parts:
    P,N,I=box(c,s)
    pv=addbuf(P,34962); acc.append({"bufferView":pv,"componentType":5126,"count":len(P),"type":"VEC3","min":P.min(0).tolist(),"max":P.max(0).tolist()}); pa=len(acc)-1
    nv=addbuf(N,34962); acc.append({"bufferView":nv,"componentType":5126,"count":len(N),"type":"VEC3"}); na=len(acc)-1
    iv=addbuf(I,34963); acc.append({"bufferView":iv,"componentType":5123,"count":len(I),"type":"SCALAR"}); ia=len(acc)-1
    m={"name":name if name.startswith("LED_") else name+"_Mat","pbrMetallicRoughness":{"baseColorFactor":[*col,1],"metallicFactor":0.1,"roughnessFactor":0.6}}
    if em: m["emissiveFactor"]=list(em); m["extras"]={"sklightLed":True}
    mats.append(m)
    meshes.append({"name":name,"primitives":[{"attributes":{"POSITION":pa,"NORMAL":na},"indices":ia,"material":len(mats)-1}]})
    nodes.append({"name":name,"mesh":len(meshes)-1})
while len(bin_)%4: bin_.append(0)
gl={"asset":{"version":"2.0","generator":"SKLIGHT demo","extras":{"note":"DEMO / DU LIEU THU NGHIEM - cabin SUV gia dinh"}},"scene":0,"scenes":[{"nodes":list(range(len(nodes)))}],"nodes":nodes,"meshes":meshes,"materials":mats,"accessors":acc,"bufferViews":bv,"buffers":[{"byteLength":len(bin_)}]}
js=json.dumps(gl).encode(); js+=b" "*((4-len(js)%4)%4)
out=struct.pack("<III",0x46546C67,2,12+8+len(js)+8+len(bin_))+struct.pack("<II",len(js),0x4E4F534A)+js+struct.pack("<II",len(bin_),0x004E4942)+bytes(bin_)
open(OUT+"demo-suv-cabin-led.glb","wb").write(out)
