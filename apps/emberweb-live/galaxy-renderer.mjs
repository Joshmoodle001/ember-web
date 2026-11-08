import { clamp, smooth } from "./galaxy-motion.mjs?v=20261108-atlas";

// Original art-directed GLSL, not a physical relativity simulation. Light,
// accretion, turbulent gas and the birth shock share one camera/timeline.
const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `
precision highp float;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float time;
uniform float scene;
uniform float entry;
uniform float collapse;
uniform float tunnel;
uniform float explosion;
uniform float expansion;
uniform float reveal;
uniform sampler2D nebulaPlate;
uniform float plateReady;
uniform sampler2D lensingPlate;
uniform float lensingReady;
float hash(vec3 p){p=fract(p*.3183099+vec3(.11,.23,.37));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.;float a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec3(4.1,1.7,8.3);a*=.5;}return v;}
mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float ring(float r,float at,float width){float d=(r-at)/width;return exp(-d*d);}
void main(){
  float aspect=resolution.x/resolution.y;
  bool mobile=aspect<.9;
  vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;
  float drift=time*.025;
  float born=smoothstep(.7,1.65,scene);
  float galaxy=smoothstep(1.65,2.6,scene);
  float expand=smoothstep(3.4,4.8,scene);
  vec2 origin=mix(vec2(mobile?0.:aspect*.235,mobile?.20:.015),vec2(.02,.02),born);
  origin=mix(origin,vec2(0.),entry*(1.-reveal));
  origin+=pointer*vec2(.012,.009)*(1.-entry);
  vec2 p=uv-origin;
  // Bank toward the disk, then straighten as the far side of the passage opens.
  float dive=entry*collapse*(1.-explosion);
  p=turn(-.13+scene*.16+dive*.72-tunnel*.38)*p;
  p.x+=sin(collapse*3.14159)*entry*.11;
  float r=length(p),angle=atan(p.y,p.x);
  float suction=collapse*(1.-explosion);
  float holeSize=.135+smoothstep(.2,.8,collapse)*.15;
  holeSize+=smoothstep(.73,1.,collapse)*1.4;
  float holePower=(1.-born)*mix(1.,smoothstep(0.,.6,collapse),entry)*(1.-explosion);
  float lens=holePower*holeSize*holeSize/(r*r+.035);
  vec2 sky=p*(1.+lens*.7);
  sky=turn(lens*.25+scene*.12)*sky;
  float field=fbm(vec3(sky*3.1,drift));
  float filament=fbm(vec3(sky*7.+field*2.8,1.7+drift*.7));
  float dust=pow(clamp(field*.65+filament*.52,0.,1.),3.2);
  vec3 blue=vec3(.10,.27,.64);
  vec3 violet=vec3(.32,.095,.49);
  vec3 gold=vec3(.9,.34,.095);
  vec3 gas=mix(blue,violet,clamp(filament*1.7-.35,0.,1.));
  float river=exp(-pow((sky.y+.17*sin(sky.x*2.8+scene))/.22,2.));
  vec3 col=vec3(.0015,.002,.007)+gas*dust*(.30+born*1.35)*(.3+river);
  col+=gold*dust*river*born*.22;
  // A rotating spiral cloud condenses into a disk of star-forming matter.
  vec2 gp=turn(-.55+scene*.20)*p;
  gp.y*=mix(1.15,2.6,galaxy);
  float gr=length(gp),ga=atan(gp.y,gp.x);
  float winding=ga*3.+log(gr+.045)*6.-time*.075;
  float arms=pow(.5+.5*sin(winding+field*2.),5.);
  float galaxyMask=exp(-gr*3.1)*(1.-smoothstep(.1,.85,gr));
  float starFormation=born*(1.-expand*.65);
  col+=(mix(vec3(.2,.35,.85),vec3(.68,.46,.22),filament)*arms*.75+vec3(.11,.20,.44))*galaxyMask*starFormation;
  float core=exp(-r*r/(.005+galaxy*.004));
  col+=vec3(.72,.83,1.)*core*starFormation*.65;
  // Lensed upper/lower arcs and a hot, turbulent, elliptical accretion disk.
  vec2 disk=p;disk.y*=5.0;
  float dr=length(disk);
  float da=atan(disk.y,disk.x);
  float flow=fbm(vec3(cos(da)*4.+time*.1,sin(da)*4.,dr*24.-time*.17));
  float diskCloud=ring(dr,holeSize*2.05,holeSize*1.08)*(1.-smoothstep(holeSize*3.5,holeSize*5.,dr));
  diskCloud*=smoothstep(holeSize*.85,holeSize*1.2,dr);
  float bands=.45+.35*pow(.5+.5*sin(dr*205.+flow*17.-time*.8),2.);
  float beam=.55+.6*smoothstep(.8,-.8,p.x);
  vec3 diskColor=mix(vec3(.55,.19,.045),vec3(1.,.72,.36),flow);
  vec3 accretion=diskColor*diskCloud*(.45+bands)*beam*1.7;
  float photon=ring(r,holeSize*1.04,holeSize*.028);
  float halo=ring(r,holeSize*1.08,holeSize*.13)*.25;
  float lensed=ring(length(vec2(p.x,p.y*.8)),holeSize*1.17,holeSize*.06);
  lensed*=smoothstep(.015,.11,p.y);
  float shadow=1.-smoothstep(holeSize*.97,holeSize*1.01,r);
  vec3 blackHole=(col+accretion)*(1.-shadow);
  blackHole+=vec3(1.,.71,.43)*(photon*.8+halo+lensed*.25);
  float foreground=smoothstep(.005,-.025,p.y)*smoothstep(holeSize*.48,holeSize*.8,dr);
  blackHole+=accretion*foreground*.42;
  vec2 lensUv=p*vec2(.88,1.56)*(.135/holeSize)+vec2(.66,.5);
  float lensBounds=smoothstep(0.,.14,lensUv.x)*smoothstep(0.,.14,1.-lensUv.x)*smoothstep(0.,.14,lensUv.y)*smoothstep(0.,.14,1.-lensUv.y);
  vec3 lensDetail=texture2D(lensingPlate,clamp(lensUv,vec2(.001),vec2(.999))).rgb;
  blackHole=mix(blackHole,lensDetail*.88+blackHole*.11,lensingReady*lensBounds);
  col=mix(col,blackHole,holePower);
  // A continuous tunnel, one birth shock, then expanding warm/cool gas.
  float spiral=angle+1.6*log(r+.045)-time*.58;
  float tunnelRay=pow(.5+.5*sin(spiral*25.+field*3.),12.);
  vec2 tube=vec2(fract(spiral/6.28318),fract(.12/(r+.055)-time*.54));
  vec3 walls=texture2D(nebulaPlate,tube).rgb;
  col+=walls*vec3(.6,.98,1.6)*tunnel*plateReady*smoothstep(.025,.32,r)*1.5;
  float horizon=ring(r,.10+tunnel*.18,.012+.014*r);
  col+=vec3(.6,.83,1.)*tunnel*horizon*.6;
  col+=vec3(.20,.35,.8)*tunnelRay*tunnel*(.14+.5*r);
  col+=vec3(.8,.4,.12)*tunnel/(.04+r*r)*.018;
  float shockRadius=.02+expansion*1.6;
  float shock=ring(r,shockRadius,.012+expansion*.08)*explosion*(1.-expansion);
  float flare=exp(-r*r/(.001+expansion*.12))*explosion*(1.-smoothstep(.0,.65,expansion));
  col+=vec3(.7,.82,1.)*shock*.6+vec3(.65,.43,.17)*flare*.8;
  float birthCloud=fbm(vec3(p*(3.+expansion*4.),3.+expansion*1.5+drift));
  col+=mix(vec3(.06,.17,.5),vec3(.45,.13,.04),birthCloud)*pow(birthCloud,3.)*explosion*(1.-reveal)*1.6;
  // A high-detail original gas plate adds real texture to the procedural volume.
  vec2 plateUv=gl_FragCoord.xy/resolution;
  plateUv=(plateUv-.5)/1.08+.5+vec2(sin(scene*.7)*.025,scene*.009);
  vec3 plate=texture2D(nebulaPlate,clamp(plateUv,vec2(.001),vec2(.999))).rgb;
  col+=plate*plateReady*born*(1.-expand*.45)*.72*(1.-entry*(1.-reveal));
  col*=1.-entry*(1.-smoothstep(0.,.18,collapse));
  col*=1.-suction*.15;
  // A quiet zone behind the left-hand reading column; the object keeps its light.
  float reading=mobile?.90:mix(.52,1.,smoothstep(-.15,.35,uv.x));
  col*=mix(reading,1.,entry);
  col=vec3(1.)-exp(-col*1.45);
  col=pow(max(col,vec3(0.)),vec3(1.02));
  col*=1.-.25*smoothstep(.4,1.1,length(uv/vec2(aspect,1.)));
  gl_FragColor=vec4(col,1.);
}`;

export function createUniverseRenderer(canvas, particles, onFailure) {
  let gl, program, uniforms, plateReady=0,lensingReady=0;
  try {
    gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power", preserveDrawingBuffer: false });
    if (!gl) throw new Error("WebGL unavailable");
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const reason = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(reason); }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
    program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Universe shader linking failed");
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    uniforms = Object.fromEntries(["resolution","pointer","time","scene","entry","collapse","tunnel","explosion","expansion","reveal","plateReady","nebulaPlate","lensingReady","lensingPlate"].map(name => [name, gl.getUniformLocation(program, name)]));
    const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.uniform1i(uniforms.nebulaPlate,0);
    const plate=new Image();plate.decoding="async";
    plate.onload=()=>{if(!gl)return;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,plate);plateReady=1;};
    plate.src="/visuals/genesis-nebula-v2.jpg";
    const lensTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,lensTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.uniform1i(uniforms.lensingPlate,1);
    const lens=new Image();lens.decoding="async";lens.onload=()=>{if(!gl)return;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,lensTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,lens);lensingReady=1;};lens.src="/visuals/genesis-lensing-v2.jpg";
  } catch {
    gl = null; canvas.hidden = true; onFailure?.();
  }
  let context;
  try { context = particles.getContext("2d", { alpha: true }); } catch { context = null; }
  let width = 1, height = 1, dpr = 1, quality = 1, compact = false;
  let seed = 44201;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const stars = Array.from({ length: 1800 }, (_, index) => ({
    angle: random()*Math.PI*2, radius: .035+Math.pow(random(),.65)*2.5,
    z: random()*4, y: (random()-.5)*2, size: .35+random()*1.2,
    glow: .15+random()*.8, arm: index%3, color: random(),
  }));
  function resize(w,h,mobile,scale=1) {
    width=w; height=h; compact=mobile; quality=scale;
    dpr=Math.min(window.devicePixelRatio||1,compact?1.2:1.5);
    const shaderScale=Math.min(dpr,Math.sqrt((compact?650000:1800000)/(w*h)))*quality;
    canvas.width=Math.max(1,Math.round(w*shaderScale)); canvas.height=Math.max(1,Math.round(h*shaderScale));
    particles.width=Math.round(w*dpr); particles.height=Math.round(h*dpr);
    if(gl) gl.viewport(0,0,canvas.width,canvas.height);
  }
  function draw(state) {
    if(gl) {
      gl.useProgram(program); gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
      gl.uniform2f(uniforms.pointer,state.pointerX,state.pointerY);
      gl.uniform1f(uniforms.plateReady,plateReady);
      gl.uniform1f(uniforms.lensingReady,lensingReady);
      for(const name of ["time","scene","entry","collapse","tunnel","explosion","expansion","reveal"]) gl.uniform1f(uniforms[name],state[name]||0);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    if(!context) return;
    const ctx=context;
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height);
    if(state.entry && state.collapse===0) return;
    const formed=smooth((state.scene-.65)/1.65);
    const cosmicWeb=smooth((state.scene-2.6)/.6)*(1-smooth((state.scene-3.8)/.8));
    const expansion=smooth((state.scene-3.6)/1.2);
    let centerX=width*(compact?.5:.735)+(width*.5-width*(compact?.5:.735))*formed;
    let centerY=height*(compact?.30:.49)+(height*.5-height*(compact?.30:.49))*formed;
    if(state.entry){centerX=width*.5+(centerX-width*.5)*state.reveal;centerY=height*.5+(centerY-height*.5)*state.reveal;}
    const collapse=state.collapse*(1-state.explosion);
    const introExpansion=state.explosion*(1-state.reveal);
    const count=compact?650:stars.length;
    const projected=[];
    for(let i=0;i<count;i++) {
      const star=stars[i];
      const a=star.angle+state.time*.012+state.scene*.22;
      const depth=((star.z-state.scene*.67-state.time*.009)%4+4)%4+.15;
      const spiral=a+Math.log(star.radius+.03)*1.6+star.arm*Math.PI*2/3;
      let x=Math.cos(a)*star.radius, y=star.y;
      const diskX=Math.cos(spiral)*star.radius*1.25, diskY=Math.sin(spiral)*star.radius*.33+star.y*.09;
      x+=(diskX-x)*formed; y+=(diskY-y)*formed;
      x*=1+expansion*1.2; y*=1+expansion*1.2;
      let scale=height*.62/depth;
      if(state.entry) scale*=1-collapse*.98+introExpansion*(.1+state.expansion*4.8);
      const roll=state.scene*.18;
      const px=x*Math.cos(roll)-y*Math.sin(roll), py=x*Math.sin(roll)+y*Math.cos(roll);
      const sx=centerX+px*scale+state.pointerX*12/depth, sy=centerY+py*scale+state.pointerY*8/depth;
      if(sx<-30||sx>width+30||sy<-30||sy>height+30) continue;
      const shadowRadius=height*(.132+smooth((state.collapse-.2)/.6)*.15+smooth((state.collapse-.73)/.27)*1.4);
      if(formed<.1&&state.explosion<.1&&Math.hypot(sx-centerX,sy-centerY)<shadowRadius)continue;
      const alpha=star.glow*(state.entry?clamp(state.collapse*2)*(1-collapse*.4):1);
      const size=clamp(star.size/depth,.35,2.3);
      ctx.fillStyle=star.color>.92?`rgba(224,246,166,${alpha})`:star.color>.66?`rgba(255,204,151,${alpha})`:`rgba(181,207,255,${alpha})`;
      if((state.velocity>.002||introExpansion>.05||state.tunnel>.1)&&depth<2.6) {
        const streak=Math.min(.08,state.velocity*3+introExpansion*.028+state.tunnel*.09);
        ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=Math.max(.5,size*.5);ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+(sx-centerX)*streak,sy+(sy-centerY)*streak);ctx.stroke();
      }
      ctx.beginPath();ctx.arc(sx,sy,size,0,Math.PI*2);ctx.fill();
      if(i%43===0 && size>.6) {
        const halo=ctx.createRadialGradient(sx,sy,0,sx,sy,size*7);
        halo.addColorStop(0,`rgba(166,197,255,${alpha*.45})`);halo.addColorStop(1,"rgba(85,130,255,0)");ctx.fillStyle=halo;ctx.fillRect(sx-size*7,sy-size*7,size*14,size*14);
        ctx.strokeStyle=`rgba(195,217,255,${alpha*.4})`;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(sx-size*5,sy);ctx.lineTo(sx+size*5,sy);ctx.moveTo(sx,sy-size*5);ctx.lineTo(sx,sy+size*5);ctx.stroke();
      }
      if(i%19===0)projected.push({x:sx,y:sy});
    }
    if(cosmicWeb>.01) {
      for(let i=0;i<projected.length;i++)for(let j=i+1;j<Math.min(i+9,projected.length);j++) {
        const a=projected[i],b=projected[j];const distance=Math.hypot(a.x-b.x,a.y-b.y);
        if(distance>40&&distance<180){ctx.strokeStyle=`rgba(133,170,245,${(1-distance/180)*.19*cosmicWeb})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
      }
    }
  }
  canvas.addEventListener("webglcontextlost", event => { event.preventDefault(); gl=null; canvas.hidden=true; onFailure?.(); });
  return {resize,draw,renderer:gl?"webgl-procedural":"canvas-fallback",get quality(){return quality;}};
}
