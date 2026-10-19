"""Render the app's actual WebGL shaders/mesh with surfaceless native Mesa.
This checks the GPU assets. It is not a browser or UI test.
"""
import ctypes as c
import json
from pathlib import Path
import numpy as np
from PIL import Image
import sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent
E=c.CDLL('libEGL.so.1')
E.eglGetProcAddress.argtypes=[c.c_char_p];E.eglGetProcAddress.restype=c.c_void_p
def ef(name,restype,args):
 f=getattr(E,name);f.restype=restype;f.argtypes=args;return f
getplatform=c.CFUNCTYPE(c.c_void_p,c.c_uint,c.c_void_p,c.POINTER(c.c_int))(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
display=getplatform(0x31DD,None,None)
major,minor=c.c_int(),c.c_int()
assert ef('eglInitialize',c.c_uint,[c.c_void_p,c.POINTER(c.c_int),c.POINTER(c.c_int)])(display,c.byref(major),c.byref(minor))
assert ef('eglBindAPI',c.c_uint,[c.c_uint])(0x30A0)
attrs=(c.c_int*17)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3038,0,0)
config=c.c_void_p();count=c.c_int()
assert ef('eglChooseConfig',c.c_uint,[c.c_void_p,c.POINTER(c.c_int),c.POINTER(c.c_void_p),c.c_int,c.POINTER(c.c_int)])(display,attrs,c.byref(config),1,c.byref(count)) and count.value
w,h=1440,960
pattrs=(c.c_int*5)(0x3057,w,0x3056,h,0x3038)
surface=ef('eglCreatePbufferSurface',c.c_void_p,[c.c_void_p,c.c_void_p,c.POINTER(c.c_int)])(display,config,pattrs)
ca=(c.c_int*3)(0x3098,2,0x3038)
context=ef('eglCreateContext',c.c_void_p,[c.c_void_p,c.c_void_p,c.c_void_p,c.POINTER(c.c_int)])(display,config,None,ca)
assert context and surface
assert ef('eglMakeCurrent',c.c_uint,[c.c_void_p,c.c_void_p,c.c_void_p,c.c_void_p])(display,surface,surface,context)
def gl(name,restype,args):
 addr=E.eglGetProcAddress(name.encode());assert addr,name
 return c.CFUNCTYPE(restype,*args)(addr)
ui=c.c_uint;ii=c.c_int;ff=c.c_float;vp=c.c_void_p
GetString=gl('glGetString',c.c_char_p,[ui]);GetError=gl('glGetError',ui,[])
print('Native shader QA:',GetString(0x1F02).decode(),GetString(0x1F01).decode())
CreateShader=gl('glCreateShader',ui,[ui]);ShaderSource=gl('glShaderSource',None,[ui,ii,c.POINTER(c.c_char_p),c.POINTER(ii)]);CompileShader=gl('glCompileShader',None,[ui]);GetShaderiv=gl('glGetShaderiv',None,[ui,ui,c.POINTER(ii)]);GetShaderInfoLog=gl('glGetShaderInfoLog',None,[ui,ii,c.POINTER(ii),c.c_char_p]);CreateProgram=gl('glCreateProgram',ui,[]);AttachShader=gl('glAttachShader',None,[ui,ui]);LinkProgram=gl('glLinkProgram',None,[ui]);GetProgramiv=gl('glGetProgramiv',None,[ui,ui,c.POINTER(ii)]);GetProgramInfoLog=gl('glGetProgramInfoLog',None,[ui,ii,c.POINTER(ii),c.c_char_p]);UseProgram=gl('glUseProgram',None,[ui])
GenBuffers=gl('glGenBuffers',None,[ii,c.POINTER(ui)]);BindBuffer=gl('glBindBuffer',None,[ui,ui]);BufferData=gl('glBufferData',None,[ui,c.c_ssize_t,vp,ui]);EnableVertexAttribArray=gl('glEnableVertexAttribArray',None,[ui]);DisableVertexAttribArray=gl('glDisableVertexAttribArray',None,[ui]);VertexAttribPointer=gl('glVertexAttribPointer',None,[ui,ii,ui,c.c_ubyte,ii,vp]);GetAttribLocation=gl('glGetAttribLocation',ii,[ui,c.c_char_p]);GetUniformLocation=gl('glGetUniformLocation',ii,[ui,c.c_char_p]);UniformMatrix4fv=gl('glUniformMatrix4fv',None,[ii,ii,c.c_ubyte,c.POINTER(ff)]);Uniform3fv=gl('glUniform3fv',None,[ii,ii,c.POINTER(ff)]);Uniform4fv=gl('glUniform4fv',None,[ii,ii,c.POINTER(ff)]);Uniform1f=gl('glUniform1f',None,[ii,ff]);Uniform1i=gl('glUniform1i',None,[ii,ii])
GenTextures=gl('glGenTextures',None,[ii,c.POINTER(ui)]);BindTexture=gl('glBindTexture',None,[ui,ui]);TexImage2D=gl('glTexImage2D',None,[ui,ii,ii,ii,ii,ii,ui,ui,vp]);TexParameteri=gl('glTexParameteri',None,[ui,ui,ii]);ActiveTexture=gl('glActiveTexture',None,[ui]);GenRenderbuffers=gl('glGenRenderbuffers',None,[ii,c.POINTER(ui)]);BindRenderbuffer=gl('glBindRenderbuffer',None,[ui,ui]);RenderbufferStorage=gl('glRenderbufferStorage',None,[ui,ui,ii,ii]);GenFramebuffers=gl('glGenFramebuffers',None,[ii,c.POINTER(ui)]);BindFramebuffer=gl('glBindFramebuffer',None,[ui,ui]);FramebufferTexture2D=gl('glFramebufferTexture2D',None,[ui,ui,ui,ui,ii]);FramebufferRenderbuffer=gl('glFramebufferRenderbuffer',None,[ui,ui,ui,ui]);CheckFramebufferStatus=gl('glCheckFramebufferStatus',ui,[ui]);Viewport=gl('glViewport',None,[ii,ii,ii,ii]);ClearColor=gl('glClearColor',None,[ff,ff,ff,ff]);Clear=gl('glClear',None,[ui]);Enable=gl('glEnable',None,[ui]);Disable=gl('glDisable',None,[ui]);DepthMask=gl('glDepthMask',None,[c.c_ubyte]);DrawArrays=gl('glDrawArrays',None,[ui,ii,ii]);BlendFunc=gl('glBlendFunc',None,[ui,ui]);ReadPixels=gl('glReadPixels',None,[ii,ii,ii,ii,ui,ui,vp]);Finish=gl('glFinish',None,[])
sh=json.loads((root/'shaders.json').read_text());cam=json.loads((root/'camera.json').read_text())
def shader(kind,source):
 s=CreateShader(kind);src=c.c_char_p(source.encode());ShaderSource(s,1,c.byref(src),None);CompileShader(s);ok=ii();GetShaderiv(s,0x8B81,c.byref(ok));log=c.create_string_buffer(16384);GetShaderInfoLog(s,16384,None,log);assert ok.value,log.value.decode();return s
def program(v,f):
 p=CreateProgram();AttachShader(p,shader(0x8B31,v));AttachShader(p,shader(0x8B30,f));LinkProgram(p);ok=ii();GetProgramiv(p,0x8B82,c.byref(ok));log=c.create_string_buffer(16384);GetProgramInfoLog(p,16384,None,log);assert ok.value,log.value.decode();return p
main=program(sh['vertexShader'],sh['fragmentShader']);depth=program(sh['shadowVertex'],sh['shadowFragment'])
print('Both programs compiled and linked')
def new(gen):
 a=ui();gen(1,c.byref(a));return a.value
tex=new(GenTextures);BindTexture(0x0DE1,tex);TexImage2D(0x0DE1,0,0x1908,1024,1024,0,0x1908,0x1401,None)
for p,v in [(0x2801,0x2600),(0x2800,0x2600),(0x2802,0x812F),(0x2803,0x812F)]:TexParameteri(0x0DE1,p,v)
rb=new(GenRenderbuffers);BindRenderbuffer(0x8D41,rb);RenderbufferStorage(0x8D41,0x81A5,1024,1024)
fbo=new(GenFramebuffers);BindFramebuffer(0x8D40,fbo);FramebufferTexture2D(0x8D40,0x8CE0,0x0DE1,tex,0);FramebufferRenderbuffer(0x8D40,0x8D00,0x8D41,rb);assert CheckFramebufferStatus(0x8D40)==0x8CD5;BindFramebuffer(0x8D40,0)
def uni(p,n):return GetUniformLocation(p,n.encode())
def arr(a):return np.array(a,dtype=np.float32)
def matrix(p,n,a):
 a=arr(a);UniformMatrix4fv(uni(p,n),1,False,a.ctypes.data_as(c.POINTER(ff)))
def bind(data,p,full=True):
 b=new(GenBuffers);BindBuffer(0x8892,b);BufferData(0x8892,data.nbytes,data.ctypes.data,0x88E4)
 for i in range(5):DisableVertexAttribArray(i)
 attrs=[('aPosition',3,0),('aNormal',3,12),('aColor',3,24),('aMaterial',1,36),('aEmission',1,40)] if full else [('aPosition',3,0)]
 for name,size,offset in attrs:
  loc=GetAttribLocation(p,name.encode())
  if loc>=0:EnableVertexAttribArray(loc);VertexAttribPointer(loc,size,0x1406,False,44,offset)
 return b
stats={}
for name in ['day','night','full','electric','lights-off','custom','socket']:
 meta=json.loads((root/(name+'.json')).read_text());current_cam=meta.get('camera',cam);current_light=meta.get('lightPV',sh['lightPV']);solid=np.fromfile(root/(name+'-solid.bin'),dtype=np.float32);glass=np.fromfile(root/(name+'-glass.bin'),dtype=np.float32)
 Enable(0x0B71);Disable(0x0BE2);DepthMask(True)
 BindFramebuffer(0x8D40,fbo);Disable(0x0BD0);Viewport(0,0,1024,1024);ClearColor(1,1,1,1);Clear(0x4000|0x0100);UseProgram(depth);matrix(depth,'uLight',current_light);bind(solid,depth,False);DrawArrays(4,meta.get('shadowStart',36),len(solid)//11-meta.get('shadowStart',36))
 BindFramebuffer(0x8D40,0);Enable(0x0BD0);Viewport(0,0,w,h);night=name in ['night','lights-off'];ClearColor(*([.07,.12,.2,1] if night else [.91,.95,.985,1]));Clear(0x4000|0x0100);UseProgram(main);matrix(main,'uPV',current_cam['pv']);matrix(main,'uLight',current_light);eye=arr(current_cam['eye']);Uniform3fv(uni(main,'uEye'),1,eye.ctypes.data_as(c.POINTER(ff)));Uniform1f(uni(main,'uNight'),float(night));Uniform1f(uni(main,'uShadowEnabled'),1);lamps=arr(meta['lights']+[[0,0,0,0]]*(8-len(meta['lights'])));Uniform4fv(uni(main,'uLamps[0]'),8,lamps.ctypes.data_as(c.POINTER(ff)));ActiveTexture(0x84C0);BindTexture(0x0DE1,tex);Uniform1i(uni(main,'uShadow'),0);bind(solid,main);DrawArrays(4,0,len(solid)//11);Enable(0x0BE2);BlendFunc(0x0302,0x0303);DepthMask(False);bind(glass,main);DrawArrays(4,0,len(glass)//11);DepthMask(True);Finish();error=GetError();assert error==0,hex(error)
 image=np.zeros((h,w,4),dtype=np.uint8);ReadPixels(0,0,w,h,0x1908,0x1401,image.ctypes.data);image=np.flipud(image);Image.fromarray(image,'RGBA').save(root/(name+'.png'));stats[name]={'pixels':list(image.shape),'mean':float(image[:,:,:3].mean()),'vertices':meta['solidVertices'],'meshes':meta['meshes']};print(name,stats[name])
(root/'native-qa.json').write_text(json.dumps(stats,indent=2))
