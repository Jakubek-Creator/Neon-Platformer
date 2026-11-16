// Neon Platformer — Background engine
// Each theme is a scene of parallax layers. Still layers are painted once into
// hidden canvases (re-made only when the theme or screen size changes) and copied
// each frame; only the living details (cars, aurora, fish, embers…) are drawn live.
// Uses the game globals: cx, W, H, camX, camY, frame, levelTheme, ROWS, TS, MS.
const BG={key:'',scene:null,lite:false,sprites:{}};

// ── small helpers ──
function bgCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
function bgRng(seed){let s=(seed*2654435761)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function bgHex(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255];}
function bgMix(a,b,t,al){const A=bgHex(a),B=bgHex(b);const c=A.map((v,i)=>Math.round(v+(B[i]-v)*t));return al==null?`rgb(${c[0]},${c[1]},${c[2]})`:`rgba(${c[0]},${c[1]},${c[2]},${al})`;}
function bgRgba(h,a){const c=bgHex(h);return`rgba(${c[0]},${c[1]},${c[2]},${a})`;}
// periodic 1-D value noise over u∈[0,1): repeats exactly, so layers tile with no seam
function bgNoise1(seed,N){const r=bgRng(seed),v=[];for(let i=0;i<N;i++)v.push(r());
  return u=>{u=((u%1)+1)%1;const x=u*N,i=Math.floor(x),f=x-i,t=f*f*(3-2*f);return v[i%N]+(v[(i+1)%N]-v[i%N])*t;};}
function bgFbm1(seed,base,oct,gain){gain=gain||0.5;const ns=[];for(let o=0;o<oct;o++)ns.push(bgNoise1(seed+o*977,base<<o));
  return u=>{let s=0,a=1,t=0;for(const n of ns){s+=n(u)*a;t+=a;a*=gain;}return s/t;};}
// periodic-in-x 2-D value noise (for clouds, nebulae, fog)
function bgNoise2(seed,NX,NY){const r=bgRng(seed),v=new Float32Array(NX*(NY+1));for(let i=0;i<v.length;i++)v[i]=r();
  return(u,w)=>{u=((u%1)+1)%1;const x=u*NX,y=_bgc(w,0,0.9999)*NY,i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    const i1=(i+1)%NX,a=v[j*NX+i],b=v[j*NX+i1],c=v[(j+1)*NX+i],d=v[(j+1)*NX+i1];return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;};}
function bgFbm2(seed,nx,ny,oct){const ns=[];for(let o=0;o<oct;o++)ns.push(bgNoise2(seed+o*131,nx<<o,ny<<o));
  return(u,w)=>{let s=0,a=1,t=0;for(const n of ns){s+=n(u,w)*a;t+=a;a*=0.5;}return s/t;};}
const _bgc=(v,a,b)=>v<a?a:v>b?b:v;
// paint a soft noise field (clouds/nebula/fog) at quarter resolution, then scale up smoothly
function bgField(P,h,fn,scale){scale=scale||4;const w=Math.ceil(P/scale),hh=Math.ceil(h/scale),lo=bgCanvas(w,hh),g=lo.getContext('2d'),img=g.createImageData(w,hh),d=img.data;
  for(let y=0;y<hh;y++)for(let x=0;x<w;x++){const c=fn(x/w,y/hh),k=(y*w+x)*4;d[k]=c[0];d[k+1]=c[1];d[k+2]=c[2];d[k+3]=c[3];}
  g.putImageData(img,0,0);const out=bgCanvas(P,h),o=out.getContext('2d');o.imageSmoothingEnabled=true;
  // draw 3 copies side by side then crop the middle so the smoothing wraps around the seam
  const tmp=bgCanvas(P*3,h),t=tmp.getContext('2d');t.imageSmoothingEnabled=true;for(let i=0;i<3;i++)t.drawImage(lo,i*P,0,P,h);o.drawImage(tmp,P,0,P,h,0,0,P,h);return out;}
// soft round glow sprite, cached per colour+size (drawn with drawImage instead of shadowBlur)
function bgGlow(col,r){const k=col+'|'+r;if(BG.sprites[k])return BG.sprites[k];const c=bgCanvas(r*2,r*2),g=c.getContext('2d'),gr=g.createRadialGradient(r,r,0,r,r,r);
  gr.addColorStop(0,bgRgba(col,1));gr.addColorStop(0.25,bgRgba(col,0.55));gr.addColorStop(1,bgRgba(col,0));g.fillStyle=gr;g.fillRect(0,0,r*2,r*2);return BG.sprites[k]=c;}
// draw something that wraps across a layer of width P (calls fn at x, x-P and x+P when near an edge)
function bgWrap(P,x,w,fn){fn(x);if(x+w>P)fn(x-P);if(x-w<0)fn(x+P);}
// a layer: painted canvas of width P, scrolled at par (x) and lifted by py (y)
function bgLayer(P,h,par,py,paint){const c=bgCanvas(P,h);paint(c.getContext('2d'),P,h);return{img:c,P,par,py};}
function bgDrawLayer(L,v){
  const sx=v.camX*L.par,ox=-(((sx%L.P)+L.P)%L.P),y=Math.round(v.lift*L.py)+(v.H-L.img.height);
  for(let x=ox;x<v.W;x+=L.P)cx.drawImage(L.img,Math.round(x),y);
}
// screen position of a point that lives in a layer (for live details placed on layers)
function bgLX(L,v,x){const P=L.P,s=v.camX*L.par;return((((x-s)%P)+P)%P);}

// ── the frame ──
function drawBackground(){
  const TH=levelTheme||0,lite=BG.lite||(typeof MS!=='undefined'&&MS.bgLite);
  // the editor zoom scales the context; the background is always drawn at real screen size
  const sc=(cx.getTransform().a||1)/(typeof DPR!=='undefined'?DPR:1),SW=Math.round(W*sc),SH=Math.round(H*sc);
  const key=TH+'|'+SW+'|'+SH+'|'+(lite?1:0);
  if(BG.key!==key){BG.key=key;BG.scene=null;const T=BG_THEMES[TH]||BG_THEMES[0];BG.scene=T.build(SW,SH,lite);BG.scene.T=T;}
  const S=BG.scene;
  // how far the camera has climbed above the level floor (for vertical parallax)
  const levelH=(typeof ROWS!=='undefined'?ROWS*TS:H),camMax=Math.max(0,levelH-H),lift=_bgc(camMax-(camY||0),0,H*1.4)*sc;
  const v={W:SW,H:SH,camX:(camX||0)*sc,camY:(camY||0)*sc,lift,t:frame||0,lite,S};
  cx.save();cx.setTransform(typeof DPR!=='undefined'?DPR:1,0,0,typeof DPR!=='undefined'?DPR:1,0,0);S.T.draw(S,v);
  // vignette (shared)
  if(!S.vig){S.vig=bgCanvas(SW,SH);const g=S.vig.getContext('2d'),gr=g.createRadialGradient(SW/2,SH*0.55,Math.min(SW,SH)*0.35,SW/2,SH*0.55,Math.max(SW,SH)*0.78);
    gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,0.55)');g.fillStyle=gr;g.fillRect(0,0,SW,SH);}
  cx.drawImage(S.vig,0,0);
  cx.restore();
}

// ── shared painters ──
function bgSkyCanvas(W,H,stops,extra){const c=bgCanvas(W,H),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,H);for(const s of stops)gr.addColorStop(s[0],s[1]);g.fillStyle=gr;g.fillRect(0,0,W,H);if(extra)extra(g);return c;}
function bgStars(g,P,h,n,seed,maxY,col,big){const r=bgRng(seed);for(let i=0;i<n;i++){const x=r()*P,y=r()*maxY,s=r(),a=0.15+s*0.6;g.fillStyle=bgRgba(col,a);const z=s>0.93?1.6:s>0.7?1.1:0.7;g.fillRect(x,y,z,z);
  if(big&&s>0.985){g.strokeStyle=bgRgba(col,0.35);g.lineWidth=0.6;g.beginPath();g.moveTo(x-4,y+0.5);g.lineTo(x+5,y+0.5);g.moveTo(x+0.5,y-4);g.lineTo(x+0.5,y+5);g.stroke();}}}
function bgFogBand(g,P,y,h,col,a){const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,bgRgba(col,0));gr.addColorStop(1,bgRgba(col,a));g.fillStyle=gr;g.fillRect(0,y,P,h);}
// ridge silhouette across a layer: f(u) in 0..1 → height
function bgRidge(g,P,h,base,amp,f,fill){g.fillStyle=fill;g.beginPath();g.moveTo(0,h);for(let x=0;x<=P;x+=3){g.lineTo(x,base-amp*f(x/P));}g.lineTo(P,h);g.closePath();g.fill();}
function bgDt(S,v){const dt=S.last==null?1:_bgc(v.t-S.last,0,3);S.last=v.t;return dt;}
function bgAdd(fn){const o=cx.globalCompositeOperation;cx.globalCompositeOperation='lighter';fn();cx.globalCompositeOperation=o;}
function bgPuff(col){const k='puff|'+col;if(BG.sprites[k])return BG.sprites[k];const r=32,c=bgCanvas(r*2,r*2),g=c.getContext('2d'),gr=g.createRadialGradient(r,r,0,r,r,r);gr.addColorStop(0,bgRgba(col,0.55));gr.addColorStop(0.6,bgRgba(col,0.22));gr.addColorStop(1,bgRgba(col,0));g.fillStyle=gr;g.fillRect(0,0,r*2,r*2);return BG.sprites[k]=c;}
function bgRay(col,w,h,a){const k='ray|'+col+w+'|'+h+'|'+a;if(BG.sprites[k])return BG.sprites[k];const c=bgCanvas(w,h),g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,bgRgba(col,a));gr.addColorStop(1,bgRgba(col,0));g.fillStyle=gr;g.beginPath();g.moveTo(w*0.42,0);g.lineTo(w*0.58,0);g.lineTo(w,h);g.lineTo(0,h);g.closePath();g.fill();return BG.sprites[k]=c;}
function bgP(W){return Math.max(1280,Math.ceil((W+240)/128)*128);}
// a city block painter; returns rooftop light spots and window spots for live effects
function bgCity(g,P,h,o){
  const r=bgRng(o.seed),tops=[],wins=[],signs=[];let x=r()*40;
  while(x<P-10){
    const bw=o.wMin+r()*(o.wMax-o.wMin),bh=o.hMin+r()*(o.hMax-o.hMin),top=o.base-bh,kind=r();
    if(x+bw>P-4)break;
    bgWrap(P,x,bw,xx=>{
      g.fillStyle=o.col;g.fillRect(xx,top,bw,h-top);
      if(kind<0.3){g.fillRect(xx+bw*0.2,top-bh*0.12,bw*0.6,bh*0.12+1);}                 // setback
      if(kind>0.75){g.beginPath();g.moveTo(xx+bw*0.3,top);g.lineTo(xx+bw*0.5,top-bh*0.18);g.lineTo(xx+bw*0.7,top);g.fill();} // spire
      if(o.rim){g.fillStyle=o.rim;g.fillRect(xx,top,1,h-top);}
      if(o.win){const ws=o.win.s,gap=o.win.gap,cols=Math.floor((bw-6)/gap),rows=Math.floor((h-top-12)/(gap*1.4)),seedF=r()*10;
        for(let cy2=0;cy2<rows;cy2++){const floorOn=Math.sin(cy2*1.7+seedF)>-0.2;for(let c2=0;c2<cols;c2++){if(!floorOn||r()>o.win.p)continue;const wx=xx+4+c2*gap,wy=top+8+cy2*gap*1.4;g.fillStyle=bgRgba(o.win.cols[Math.floor(r()*o.win.cols.length)],o.win.a*(0.4+r()*0.6));g.fillRect(wx,wy,ws,ws*1.3);if(r()<0.02)wins.push({x:wx,y:wy,s:ws});}}}
    });
    const antenna=kind>0.55&&kind<=0.75;
    if(antenna){const ax=x+bw*0.5,at=top-bh*0.25;bgWrap(P,ax,2,xx=>{g.strokeStyle=o.col;g.lineWidth=1.2;g.beginPath();g.moveTo(xx,top);g.lineTo(xx,at);g.stroke();});tops.push({x:ax,y:at});}
    else if(bh>o.hMin+(o.hMax-o.hMin)*0.6)tops.push({x:x+bw*0.5,y:kind>0.75?top-bh*0.18:top});
    if(o.signs&&r()<o.signs&&bw>26){const words=['24H','BAR','RAMEN','HOTEL','ARCADE','OPEN','CYBER','NOODLE','CLUB','DINER'],col=['#ff3ea5','#29e7ff','#ffcf3a','#9d6bff','#39ff9c'][Math.floor(r()*5)],word=words[Math.floor(r()*words.length)];
      const vert=r()<0.4,sw=vert?11:Math.min(bw-8,word.length*7+8),sh=vert?word.length*9+6:13,sx=x+(bw-sw)/2,sy=top+10+r()*Math.max(4,(h-top)*0.35);
      signs.push({x:sx,y:sy,w:sw,h:sh,col});
      bgWrap(P,sx,sw,xx=>{g.save();g.fillStyle='rgba(8,4,16,0.9)';g.fillRect(xx,sy,sw,sh);g.shadowBlur=8;g.shadowColor=col;g.strokeStyle=col;g.lineWidth=1.2;g.strokeRect(xx+0.5,sy+0.5,sw-1,sh-1);
        g.fillStyle=col;g.font='bold 8px monospace';g.textAlign='center';g.textBaseline='middle';
        if(vert)for(let i=0;i<word.length;i++)g.fillText(word[i],xx+sw/2,sy+7+i*9);else g.fillText(word,xx+sw/2,sy+sh/2+0.5);g.restore();});}
    x+=bw+o.gapMin+r()*o.gapRand;
  }
  return{tops,wins,signs};
}

const BG_THEMES=[];

// ═════════════════ 0 · NEON — megacity at night ═════════════════
BG_THEMES[0]={name:'NEON',build(W,H,lite){
  const P=bgP(W),hy=H*0.84,HZ='#4d1350',S={P,hy};
  S.sky=bgSkyCanvas(W,H,[[0,'#05021a'],[0.45,'#120634'],[0.75,'#2a0b46'],[1,'#4d1350']],g=>{
    const gr=g.createRadialGradient(W*0.5,H*1.05,0,W*0.5,H*1.05,W*0.75);gr.addColorStop(0,'rgba(255,60,170,0.28)');gr.addColorStop(1,'rgba(255,60,170,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);});
  S.stars=bgLayer(P,H,0.01,0.01,(g,P,h)=>{bgStars(g,P,h,lite?120:260,11,h*0.6,'#d9d0ff',true);
    const mx=P*0.68,my=h*0.2,mr=Math.max(18,h*0.065);g.drawImage(bgGlow('#c9b8ff',mr*4),mx-mr*4,my-mr*4);
    const mg=g.createRadialGradient(mx-mr*0.3,my-mr*0.3,mr*0.1,mx,my,mr);mg.addColorStop(0,'#f6efff');mg.addColorStop(0.7,'#cdbcf5');mg.addColorStop(1,'#9b86d6');g.fillStyle=mg;g.beginPath();g.arc(mx,my,mr,0,7);g.fill();
    g.fillStyle='rgba(120,100,180,0.25)';for(const c of[[0.3,-0.2,0.22],[-0.25,0.25,0.15],[0.1,0.35,0.1]]){g.beginPath();g.arc(mx+c[0]*mr,my+c[1]*mr,c[2]*mr,0,7);g.fill();}});
  const cf=bgFbm2(21,6,3,4);
  S.clouds=bgLayer(P,H,0.03,0.02,(g,P,h)=>{g.drawImage(bgField(P,h,(u,w)=>{const band=Math.exp(-Math.pow((w-0.36)/0.13,2)),d=_bgc((cf(u,w*1.0)-0.48)*3.2,0,1)*band;const lit=_bgc((w-0.3)*3,0,1);return[110+lit*120,40+lit*30,150+lit*40,d*150];}),0,0);});
  const far=bgLayer(P,H,0.07,0.04,(g,P,h)=>{S.farInfo=bgCity(g,P,h,{seed:3,base:hy,hMin:h*0.22,hMax:h*0.5,wMin:18,wMax:46,gapMin:-6,gapRand:14,col:bgMix('#0a0618',HZ,0.55),win:{s:1.5,gap:5,p:0.18,a:0.35,cols:['#ffd9a0','#a0e8ff']}});bgFogBand(g,P,hy-h*0.25,h*0.25+h*0.2,HZ,0.75);});
  const mid=bgLayer(P,H,0.15,0.08,(g,P,h)=>{S.midInfo=bgCity(g,P,h,{seed:7,base:hy+h*0.04,hMin:h*0.18,hMax:h*0.42,wMin:30,wMax:80,gapMin:4,gapRand:30,col:bgMix('#09051a',HZ,0.28),rim:'rgba(255,90,190,0.25)',signs:0.35,win:{s:2,gap:7,p:0.3,a:0.6,cols:['#ffcf7a','#7fe8ff','#ff8fd0']}});bgFogBand(g,P,hy-h*0.05,h*0.25,'#2a0b46',0.85);});
  const near=bgLayer(P,H,0.27,0.14,(g,P,h)=>{S.nearInfo=bgCity(g,P,h,{seed:13,base:hy+h*0.1,hMin:h*0.12,hMax:h*0.32,wMin:60,wMax:150,gapMin:30,gapRand:90,col:'#06030f',rim:'rgba(255,80,180,0.4)',signs:0.6,win:{s:2.5,gap:9,p:0.18,a:0.55,cols:['#ffcf7a','#7fe8ff']}});bgFogBand(g,P,h*0.9,h*0.1,'#05020c',0.9);});
  S.layers=[far,mid,near];S.far=far;S.mid=mid;S.near=near;
  const r=bgRng(5);
  S.cars=[];const lanes=[{L:{P,par:0.11},y:hy-H*0.28,n:lite?2:4,s:0.55},{L:{P,par:0.2},y:hy-H*0.2,n:lite?2:3,s:0.8},{L:{P,par:0.24},y:hy-H*0.36,n:lite?1:2,s:0.9}];
  for(const ln of lanes)for(let i=0;i<ln.n;i++){const dir=r()<0.5?-1:1;S.cars.push({L:ln.L,x:r()*P,y:ln.y+(r()-0.5)*14,v:(0.6+r()*1.1)*dir*ln.s*2,s:ln.s,ph:r()*6,col:r()<0.5?'#7fe8ff':'#ff8fd0'});}
  S.beams=[{x:P*0.22,ph:0},{x:P*0.71,ph:2.1}];
  S.beam=bgRay('#d8c8ff',90,Math.ceil(H*1.1),0.085);
  S.flick=(S.midInfo.wins||[]).slice(0,14).map(w=>({...w,ph:r()*100,col:r()<0.5?'#ffcf7a':'#7fe8ff'}));
  return S;},
 draw(S,v){const dt=bgDt(S,v),t=v.t;
  cx.drawImage(S.sky,0,0);bgDrawLayer(S.stars,v);
  // searchlights sweeping behind the skyline
  if(!v.lite)bgAdd(()=>{for(const b of S.beams){const x=bgLX(S.far,v,b.x),a=Math.sin(t*0.006+b.ph)*0.55;cx.save();cx.translate(x,S.hy+v.lift*0.04);cx.rotate(a+Math.PI);cx.drawImage(S.beam,-45,0);cx.restore();}});
  bgDrawLayer(S.clouds,v);bgDrawLayer(S.far,v);
  // blinking aviation lights on tall far/mid towers
  for(const [L,info,sz] of[[S.far,S.farInfo,6],[S.mid,S.midInfo,9]]){const sp=bgGlow('#ff3344',sz);for(let i=0;i<info.tops.length;i++){const tp=info.tops[i];if((Math.floor((t+i*37)/50)%2))continue;const x=bgLX(L,v,tp.x);if(x<-10||x>v.W+10)continue;cx.drawImage(sp,x-sz,tp.y+Math.round(v.lift*L.py)-sz);}}
  bgDrawLayer(S.mid,v);
  // windows switching on and off
  for(const w of S.flick){const on=Math.sin(t*0.004+w.ph)>0.2;if(!on)continue;const x=bgLX(S.mid,v,w.x);cx.fillStyle=w.col;cx.globalAlpha=0.85;cx.fillRect(x,w.y+Math.round(v.lift*S.mid.py),w.s,w.s*1.3);}cx.globalAlpha=1;
  // flying cars with light trails
  for(const c of S.cars){c.x=(c.x+c.v*dt+S.P)%S.P;const x=bgLX(c.L,v,c.x),y=c.y+Math.sin(t*0.03+c.ph)*2+v.lift*c.L.par*0.4;if(x<-60||x>v.W+60)continue;const d=Math.sign(c.v),s=c.s;
    cx.strokeStyle=bgRgba(c.col,0.35);cx.lineWidth=1.2*s;cx.beginPath();cx.moveTo(x,y);cx.lineTo(x-d*40*s,y);cx.stroke();
    cx.fillStyle='#0b0718';cx.fillRect(x-6*s,y-2*s,12*s,4*s);bgAdd(()=>{cx.drawImage(bgGlow(c.col,6),x+d*6*s-6,y-6);cx.drawImage(bgGlow('#ff3355',4),x-d*6*s-4,y-4);});}
  bgDrawLayer(S.near,v);
 }};

// ═════════════════ 1 · ICE — aurora over the glacier ═════════════════
BG_THEMES[1]={name:'ICE',build(W,H,lite){
  const P=bgP(W),hy=H*0.82,HZ='#1f6a80',S={P,hy};
  S.sky=bgSkyCanvas(W,H,[[0,'#020814'],[0.5,'#06213a'],[0.85,'#0e3f5a'],[1,'#1f6a80']]);
  const mw=bgFbm2(31,8,4,4);
  S.stars=bgLayer(P,H,0.01,0.01,(g,P,h)=>{g.drawImage(bgField(P,h,(u,w)=>{const band=Math.exp(-Math.pow((w-(0.2+0.25*u))/0.12,2));const d=_bgc((mw(u,w)-0.35)*2,0,1)*band;return[150,190,230,d*70];}),0,0);bgStars(g,P,h,lite?200:420,17,h*0.7,'#e6f4ff',true);
    const mx=P*0.2,my=h*0.17,mr=Math.max(14,h*0.05);g.drawImage(bgGlow('#bfe6ff',mr*5),mx-mr*5,my-mr*5);g.fillStyle='#eef8ff';g.beginPath();g.arc(mx,my,mr,0,7);g.fill();g.fillStyle='rgba(150,190,220,0.3)';g.beginPath();g.arc(mx+mr*0.25,my-mr*0.1,mr*0.25,0,7);g.fill();});
  const f1=bgFbm1(41,5,4,0.5),f1b=bgFbm1(47,14,3,0.5),far=bgLayer(P,H,0.05,0.03,(g,P,h)=>{const amp=h*0.34,top=hy-amp;
    const rid=n=>1-Math.abs(2*n-1),ridge=u=>_bgc(Math.pow(rid(f1(u)),2.2)*0.75+Math.pow(rid(f1b(u)),3)*0.3,0,1);
    const gr=g.createLinearGradient(0,top,0,hy);gr.addColorStop(0,bgMix('#e8f6ff',HZ,0.35));gr.addColorStop(0.28,bgMix('#9cc4dc',HZ,0.4));gr.addColorStop(0.5,bgMix('#355f7c',HZ,0.45));gr.addColorStop(1,bgMix('#0e2a40',HZ,0.5));
    bgRidge(g,P,h,hy,amp,ridge,gr);
    // shadowed side of each slope (moon is to the left): a darker copy nudged right
    g.save();g.globalCompositeOperation='source-atop';g.fillStyle='rgba(10,30,50,0.28)';g.beginPath();g.moveTo(0,h);for(let x=0;x<=P;x+=3){g.lineTo(x+7,hy-amp*ridge(x/P)+5);}g.lineTo(P,h);g.closePath();g.fill();g.restore();
    bgFogBand(g,P,hy-h*0.14,h*0.32,HZ,0.85);});
  const f2=bgFbm1(43,4,4),mid=bgLayer(P,H,0.12,0.07,(g,P,h)=>{const base=hy+h*0.03;
    const gr=g.createLinearGradient(0,base-h*0.17,0,base);gr.addColorStop(0,'#3d6f8c');gr.addColorStop(1,'#0c2236');bgRidge(g,P,h,base,h*0.17,u=>Math.pow(f2(u),1.3),gr);
    // ice cliff striations
    const r=bgRng(9);g.globalCompositeOperation='source-atop';for(let i=0;i<P/16;i++){const x=r()*P,top=base-h*0.17*Math.pow(f2(x/P),1.3);g.strokeStyle=`rgba(170,230,255,${0.03+r()*0.07})`;g.lineWidth=1;g.beginPath();g.moveTo(x,top+2);g.lineTo(x+r()*4-2,top+4+r()*h*0.08);g.stroke();}g.globalCompositeOperation='source-over';
    S.spark=[];for(let i=0;i<(lite?8:22);i++){const x=r()*P,yy=base-h*0.17*Math.pow(f2(x/P),1.3)+4+r()*h*0.06;S.spark.push({x,y:yy,ph:r()*100});}
    bgFogBand(g,P,base-h*0.08,h*0.2,'#0e3f5a',0.7);});
  const near=bgLayer(P,H,0.24,0.13,(g,P,h)=>{const r=bgRng(19),base=h;
    const pine=(x,ht)=>{const w=ht*0.42;bgWrap(P,x,w,xx=>{g.fillStyle='#03101a';g.fillRect(xx-1.5,base-ht*0.15,3,ht*0.15);for(let k=0;k<5;k++){const y0=base-ht*0.12-k*ht*0.17,ww=w*(1-k*0.17);g.beginPath();g.moveTo(xx-ww/2,y0);g.lineTo(xx,y0-ht*0.3);g.lineTo(xx+ww/2,y0);g.fill();
      g.fillStyle='rgba(225,242,255,0.75)';g.beginPath();g.moveTo(xx-ww*0.32,y0-ht*0.06);g.quadraticCurveTo(xx,y0-ht*0.12,xx+ww*0.32,y0-ht*0.06);g.lineTo(xx,y0-ht*0.24);g.closePath();g.fill();g.fillStyle='#03101a';}});};
    let x=0;while(x<P){const cl=r()<0.5;if(cl){for(let k=0;k<3+r()*4;k++){pine(x+k*14+r()*6,h*(0.12+r()*0.14));}x+=70+r()*60;}else x+=50+r()*120;}
    // snow drift
    const sd=bgFbm1(51,5,3);g.fillStyle='#b9d6e6';g.beginPath();g.moveTo(0,h);for(let xx=0;xx<=P;xx+=4)g.lineTo(xx,h-h*0.03-h*0.03*sd(xx/P));g.lineTo(P,h);g.fill();
    g.fillStyle='rgba(255,255,255,0.35)';g.beginPath();g.moveTo(0,h);for(let xx=0;xx<=P;xx+=4)g.lineTo(xx,h-h*0.03-h*0.03*sd(xx/P));for(let xx=P;xx>=0;xx-=4)g.lineTo(xx,h-h*0.025-h*0.03*sd(xx/P));g.fill();});
  S.layers=[far,mid,near];S.far=far;S.mid=mid;S.near=near;
  // aurora ray sprites (tall soft columns, bright at the bottom edge)
  const mk=(c1,c2)=>{const c=bgCanvas(24,Math.ceil(H*0.5)),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,c.height);gr.addColorStop(0,bgRgba(c2,0));gr.addColorStop(0.65,bgRgba(c2,0.35));gr.addColorStop(0.92,bgRgba(c1,0.9));gr.addColorStop(1,bgRgba(c1,0));g.fillStyle=gr;g.fillRect(0,0,24,c.height);
    g.globalCompositeOperation='destination-in';const hg=g.createLinearGradient(0,0,24,0);hg.addColorStop(0,'rgba(0,0,0,0)');hg.addColorStop(0.5,'rgba(0,0,0,1)');hg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=hg;g.fillRect(0,0,24,c.height);return c;};
  S.aur=[{spr:mk('#5dffb0','#7a5cff'),y:H*0.36,amp:H*0.08,ph:0,sp:0.006,a:0.55},{spr:mk('#4dfff0','#40a0ff'),y:H*0.26,amp:H*0.06,ph:2.2,sp:0.0045,a:0.4}];
  const r=bgRng(23);S.snow=[];for(let i=0;i<(lite?60:150);i++){const z=r();S.snow.push({x:r()*W,y:r()*H,z,ph:r()*7});}
  S.star={t:-1};
  return S;},
 draw(S,v){const dt=bgDt(S,v),t=v.t;
  cx.drawImage(S.sky,0,0);bgDrawLayer(S.stars,v);
  // aurora: a curtain of soft rays that ripples
  // aurora: soft rays drawn into a 1/3-size buffer (every other frame), then scaled up
  if(!S.aBuf){S.aBuf=bgCanvas(Math.ceil(v.W/3),Math.ceil(v.H*0.62/3));S.aT=-9;}
  if(v.t-S.aT>=2||v.t<S.aT){S.aT=v.t;const b=S.aBuf.getContext('2d'),k=1/3;b.clearRect(0,0,S.aBuf.width,S.aBuf.height);b.globalCompositeOperation='lighter';
    for(const a of S.aur){const n=v.lite?30:54,sw=v.W/n*3.4*k,hh=a.spr.height;for(let i=0;i<=n;i++){const u=i/n,x=u*v.W,w=Math.sin(u*6+t*a.sp*6+a.ph)*0.6+Math.sin(u*13-t*a.sp*9)*0.4;
      const y=a.y+w*a.amp,al=a.a*(0.6+0.4*Math.sin(u*7+t*0.02+a.ph))*(0.7+0.3*Math.sin(t*0.01+a.ph));b.globalAlpha=_bgc(al,0,1);const h2=hh*(0.65+0.35*Math.sin(u*5+t*0.008));b.drawImage(a.spr,(x*k)-sw/2,(y-h2)*k,sw,h2*k);}}b.globalAlpha=1;}
  bgAdd(()=>cx.drawImage(S.aBuf,0,0,v.W,v.H*0.62));
  // shooting star now and then
  if(S.star.t<0&&Math.random()<0.002*dt&&!v.lite)S.star={t:0,x:Math.random()*v.W*0.8,y:Math.random()*v.H*0.3};
  if(S.star.t>=0){S.star.t+=dt;const k=S.star.t/40,x=S.star.x+k*160,y=S.star.y+k*60;cx.strokeStyle=`rgba(230,245,255,${1-k})`;cx.lineWidth=1.2;cx.beginPath();cx.moveTo(x,y);cx.lineTo(x-30,y-11);cx.stroke();if(k>=1)S.star.t=-1;}
  bgDrawLayer(S.far,v);
  // far snow (slow, small)
  const snow=(minZ,maxZ)=>{cx.fillStyle='#eaf6ff';for(const s of S.snow){if(s.z<minZ||s.z>=maxZ)continue;const sp=0.25+s.z*1.1;s.y+=sp*dt;if(s.y>v.H+4){s.y=-4;s.x=Math.random()*v.W;}const x=((s.x+Math.sin(t*0.02+s.ph)*8-v.camX*(0.05+s.z*0.3))%v.W+v.W)%v.W,r=0.6+s.z*1.6;cx.globalAlpha=0.35+s.z*0.55;cx.fillRect(x,s.y,r,r);}cx.globalAlpha=1;};
  snow(0,0.45);bgDrawLayer(S.mid,v);
  for(const s of S.spark){const k=Math.sin(t*0.05+s.ph);if(k<0.8)continue;const x=bgLX(S.mid,v,s.x),y=s.y+Math.round(v.lift*S.mid.py);bgAdd(()=>{cx.globalAlpha=(k-0.8)*5;cx.drawImage(bgGlow('#d8f6ff',5),x-5,y-5);cx.globalAlpha=1;});}
  snow(0.45,0.8);bgDrawLayer(S.near,v);snow(0.8,1.01);
 }};

// ═════════════════ 2 · LAVA — volcanic hellscape ═════════════════
BG_THEMES[2]={name:'LAVA',build(W,H,lite){
  const P=bgP(W),hy=H*0.84,S={P,hy};
  S.sky=bgSkyCanvas(W,H,[[0,'#050000'],[0.45,'#1a0402'],[0.78,'#3d0a03'],[1,'#7a1d05']],g=>{const gr=g.createRadialGradient(W*0.5,H*1.1,0,W*0.5,H*1.1,W*0.8);gr.addColorStop(0,'rgba(255,110,20,0.35)');gr.addColorStop(1,'rgba(255,110,20,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);});
  const cf=bgFbm2(61,5,4,5);
  S.clouds=bgLayer(P,H,0.02,0.02,(g,P,h)=>{g.drawImage(bgField(P,h,(u,w)=>{const d=_bgc((cf(u,w)-0.38)*2.4,0,1)*_bgc(1-w*1.6,0,1);const under=_bgc((w-0.12)*3,0,1)*d;return[30+under*170,8+under*40,6,d*230];}),0,0);});
  const vf=bgFbm1(71,8,4);
  S.volcano={x:P*0.62,top:hy-H*0.5,w:Math.max(W*0.42,380)};
  const far=bgLayer(P,H,0.04,0.03,(g,P,h)=>{const V=S.volcano;
    const cone=(cxp,top,wid,col)=>{bgWrap(P,cxp,wid,xx=>{g.fillStyle=col;g.beginPath();g.moveTo(xx-wid,hy+20);for(let k=0;k<=40;k++){const u=k/40,x=xx-wid+u*wid*2,s=Math.abs(u-0.5)*2,yy=top+(hy-top)*Math.pow(s,0.7)+(vf((x/P)+0.3)-0.5)*14;g.lineTo(x,s<0.09?top+4:yy);}g.lineTo(xx+wid,hy+20);g.lineTo(xx+wid,h);g.lineTo(xx-wid,h);g.closePath();g.fill();});};
    cone(P*0.18,hy-H*0.26,Math.max(W*0.22,200),'#2b0905');cone(V.x,V.top,V.w,'#1c0604');
    // glowing crater + lava rivers
    bgWrap(P,V.x,V.w,xx=>{g.save();g.shadowBlur=18;g.shadowColor='#ff5a10';g.fillStyle='#ff7a1a';g.beginPath();g.ellipse(xx,V.top+4,V.w*0.085,4,0,0,7);g.fill();
      const r=bgRng(5);g.lineCap='round';for(let k=0;k<5;k++){let x0=xx+(r()-0.5)*V.w*0.12,y0=V.top+5;g.strokeStyle=k%2?'rgba(255,90,20,0.75)':'rgba(255,170,40,0.7)';g.lineWidth=1.2+r()*1.6;g.beginPath();g.moveTo(x0,y0);
        const side=r()<0.5?-1:1;for(let s=0;s<14;s++){x0+=side*(4+r()*10);y0+=(hy-V.top)/16;g.lineTo(x0+(r()-0.5)*6,y0);}g.stroke();}g.restore();});
    bgFogBand(g,P,hy-h*0.2,h*0.4,'#5a1404',0.75);});
  const sf=bgFbm1(73,9,4),mid=bgLayer(P,H,0.1,0.07,(g,P,h)=>{const r=bgRng(77),base=hy+h*0.04;
    bgRidge(g,P,h,base,h*0.1,u=>sf(u),'#170403');
    for(let i=0;i<(P/70|0);i++){const x=r()*P,ht=h*(0.08+r()*0.24),w=10+r()*22;bgWrap(P,x,w,xx=>{g.fillStyle='#150403';g.beginPath();g.moveTo(xx-w,base);g.lineTo(xx-w*0.25,base-ht);g.lineTo(xx-w*0.05,base-ht-6);g.lineTo(xx+w*0.3,base-ht*0.85);g.lineTo(xx+w,base);g.fill();
      g.save();g.shadowBlur=6;g.shadowColor='#ff4400';g.strokeStyle='rgba(255,90,20,0.65)';g.lineWidth=1;g.beginPath();let cx0=xx-w*0.1,cy0=base-ht*0.7;g.moveTo(cx0,cy0);for(let s=0;s<5;s++){cx0+=(r()-0.5)*6;cy0+=ht*0.12;g.lineTo(cx0,cy0);}g.stroke();g.restore();});}
    bgFogBand(g,P,base-h*0.06,h*0.2,'#3d0a03',0.8);});
  const near=bgLayer(P,H,0.2,0.13,(g,P,h)=>{const r=bgRng(81);
    let x=0;while(x<P){const n=2+Math.floor(r()*5),cw=9+r()*7,bh=h*(0.06+r()*0.14);for(let k=0;k<n;k++){const xx0=x+k*cw,ht=bh*(0.6+r()*0.6);bgWrap(P,xx0,cw,xx=>{g.fillStyle='#0b0201';g.beginPath();g.moveTo(xx,h);g.lineTo(xx,h-ht);g.lineTo(xx+cw*0.5,h-ht-r()*5);g.lineTo(xx+cw,h-ht+2);g.lineTo(xx+cw,h);g.fill();
      const rg=g.createLinearGradient(0,h-ht,0,h);rg.addColorStop(0,'rgba(255,90,20,0)');rg.addColorStop(1,'rgba(255,90,20,0.28)');g.fillStyle=rg;g.fillRect(xx,h-ht,cw,ht);g.fillStyle='rgba(255,140,60,0.35)';g.fillRect(xx,h-ht,1,ht);});}
      x+=n*cw+40+r()*140;}
    // lava pool glow along the very bottom
    const lg=g.createLinearGradient(0,h-h*0.05,0,h);lg.addColorStop(0,'rgba(255,80,10,0)');lg.addColorStop(1,'rgba(255,80,10,0.45)');g.fillStyle=lg;g.fillRect(0,h-h*0.05,P,h*0.05);});
  S.layers=[far,mid,near];S.far=far;S.mid=mid;S.near=near;
  const r=bgRng(91);S.emb=[];for(let i=0;i<(lite?40:110);i++)S.emb.push({x:r()*W,y:r()*H,z:r(),ph:r()*7});
  S.ash=[];for(let i=0;i<(lite?15:45);i++)S.ash.push({x:r()*W,y:r()*H,z:r(),ph:r()*7});
  S.erupt={t:200,bombs:[],plume:[]};S.bolt=null;
  return S;},
 draw(S,v){const dt=bgDt(S,v),t=v.t,V=S.volcano,E=S.erupt;
  cx.drawImage(S.sky,0,0);
  // volcanic lightning flashes the clouds
  if(!S.bolt&&!v.lite&&Math.random()<0.0025*dt){const x=Math.random()*v.W,pts=[[x,v.H*0.08]];let px=x,py=v.H*0.08;while(py<v.H*0.45){px+=(Math.random()-0.5)*40;py+=12+Math.random()*16;pts.push([px,py]);}S.bolt={pts,t:0};}
  if(S.bolt){const k=S.bolt.t/10;cx.fillStyle=`rgba(255,180,140,${0.12*(1-k)})`;cx.fillRect(0,0,v.W,v.H*0.6);}
  bgDrawLayer(S.clouds,v);
  if(S.bolt){const k=S.bolt.t/10;bgAdd(()=>{cx.strokeStyle=`rgba(230,200,255,${1-k})`;cx.lineWidth=1.6;cx.beginPath();S.bolt.pts.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.stroke();});S.bolt.t+=dt;if(S.bolt.t>10)S.bolt=null;}
  // eruption cycle: rumble → burst of lava bombs + rolling smoke plume
  E.t-=dt;const vx=bgLX(S.far,v,V.x),vy=V.top+Math.round(v.lift*S.far.py);
  if(E.t<=0){E.t=380+Math.random()*260;E.flash=1;for(let i=0;i<(v.lite?8:22);i++)E.bombs.push({x:0,y:0,vx:(Math.random()-0.5)*3.2,vy:-(3+Math.random()*4),life:60+Math.random()*30});}
  if(Math.random()<(v.lite?0.06:0.14)*dt)E.plume.push({x:(Math.random()-0.5)*26,y:-Math.random()*8,s:0.35+Math.random()*0.2,life:240});
  for(const p of E.plume){p.y-=0.55*dt;p.x+=0.3*dt+Math.sin(p.life*0.03)*0.1;p.s+=0.018*dt;p.life-=dt;cx.globalAlpha=_bgc(p.life/240,0,1)*Math.min(1,(240-p.life)/40)*0.22;const sz=26*p.s;cx.drawImage(bgPuff('#4a2418'),vx+p.x-sz,vy+p.y-sz,sz*2,sz*2);}cx.globalAlpha=1;E.plume=E.plume.filter(p=>p.life>0);
  if(E.flash>0){bgAdd(()=>{cx.globalAlpha=E.flash;cx.drawImage(bgGlow('#ff7a20',80),vx-80,vy-80);cx.globalAlpha=1;});E.flash=Math.max(0,E.flash-0.02*dt);}
  bgDrawLayer(S.far,v);
  bgAdd(()=>{const g=bgGlow('#ffb040',4);for(const b of E.bombs){b.vy+=0.12*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;cx.globalAlpha=_bgc(b.life/40,0,1);cx.drawImage(g,vx+b.x-4,vy+b.y-4);}cx.globalAlpha=1;});E.bombs=E.bombs.filter(b=>b.life>0);
  bgDrawLayer(S.mid,v);
  // rising embers + drifting ash
  bgAdd(()=>{for(const e of S.emb){e.y-=(0.4+e.z*1.2)*dt;if(e.y<-6){e.y=v.H+6;e.x=Math.random()*v.W;}const x=((e.x+Math.sin(t*0.03+e.ph)*10-v.camX*(0.05+e.z*0.25))%v.W+v.W)%v.W,a=_bgc(e.y/v.H,0,1)*(0.5+e.z*0.5);cx.globalAlpha=a;const s=2+e.z*3;cx.drawImage(bgGlow(e.z>0.6?'#ffd060':'#ff5a14',s),x-s,e.y-s);}cx.globalAlpha=1;});
  cx.fillStyle='#8a7a74';for(const a of S.ash){a.y+=(0.2+a.z*0.4)*dt;if(a.y>v.H+4){a.y=-4;a.x=Math.random()*v.W;}const x=((a.x+Math.sin(t*0.02+a.ph)*14-v.camX*0.1)%v.W+v.W)%v.W;cx.globalAlpha=0.3+a.z*0.3;cx.fillRect(x,a.y,1.6,1.2);}cx.globalAlpha=1;
  bgDrawLayer(S.near,v);
  // heat glow pulsing from below
  cx.fillStyle=`rgba(255,80,10,${0.05+Math.sin(t*0.02)*0.025})`;cx.fillRect(0,v.H*0.75,v.W,v.H*0.25);
 }};

// ═════════════════ 3 · TOXIC — poisoned swamp ═════════════════
BG_THEMES[3]={name:'TOXIC',build(W,H,lite){
  const P=bgP(W),hy=H*0.83,HZ='#46561a',S={P,hy};
  S.sky=bgSkyCanvas(W,H,[[0,'#040802'],[0.45,'#121d07'],[0.8,'#2a380d'],[1,'#4a5a1a']],g=>{const sx=W*0.32,sy=H*0.3,r=Math.max(20,H*0.07);g.globalAlpha=0.55;g.drawImage(bgGlow('#c8d860',r*3.2),sx-r*3.2,sy-r*3.2);g.globalAlpha=1;g.fillStyle='rgba(225,240,140,0.38)';g.beginPath();g.arc(sx,sy,r,0,7);g.fill();});
  const far=bgLayer(P,H,0.05,0.03,(g,P,h)=>{const r=bgRng(101),col=bgMix('#0a1404',HZ,0.55);S.chim=[];S.blink=[];g.fillStyle=col;
    let x=10;while(x<P-60){const kind=r();
      if(kind<0.3){const w=40+r()*30,ht=h*(0.14+r()*0.1);bgWrap(P,x,w,xx=>{g.beginPath();g.moveTo(xx,hy);g.quadraticCurveTo(xx+w*0.25,hy-ht*0.5,xx+w*0.12,hy-ht);g.lineTo(xx+w*0.88,hy-ht);g.quadraticCurveTo(xx+w*0.75,hy-ht*0.5,xx+w,hy);g.fill();});x+=w+10;}
      else if(kind<0.65){const w=6+r()*5,ht=h*(0.2+r()*0.2);bgWrap(P,x,w,xx=>{g.fillRect(xx,hy-ht,w,ht);g.fillStyle=bgMix('#1c2a0a',HZ,0.4);g.fillRect(xx,hy-ht+8,w,3);g.fillRect(xx,hy-ht+20,w,3);g.fillStyle=col;});S.chim.push({x:x+w/2,y:hy-ht});S.blink.push({x:x+w/2,y:hy-ht-3});x+=w+14+r()*20;}
      else{const w=50+r()*80,ht=h*(0.05+r()*0.08);bgWrap(P,x,w,xx=>{g.fillRect(xx,hy-ht,w,ht);g.beginPath();g.ellipse(xx+w*0.3,hy-ht,w*0.2,ht*0.5,0,Math.PI,0);g.fill();g.fillRect(xx+w*0.6,hy-ht-14,4,14);g.fillRect(xx+w*0.6,hy-ht-14,w*0.3,3);});x+=w+20;}}
    g.fillRect(0,hy,P,h-hy);bgFogBand(g,P,hy-h*0.15,h*0.35,HZ,0.85);});
  const mid=bgLayer(P,H,0.12,0.07,(g,P,h)=>{const r=bgRng(111),base=hy+h*0.05;g.fillStyle='#0b1505';g.fillRect(0,base,P,h-base);
    const branch=(x,y,a,len,w,d)=>{const x2=x+Math.cos(a)*len,y2=y+Math.sin(a)*len;g.strokeStyle='#0b1505';g.lineWidth=w;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.quadraticCurveTo((x+x2)/2+(r()-0.5)*len*0.4,(y+y2)/2,x2,y2);g.stroke();
      if(d>0){const n=1+Math.floor(r()*2.5);for(let i=0;i<n;i++)branch(x2,y2,a+(r()-0.5)*1.3,len*(0.6+r()*0.2),w*0.65,d-1);}
      else if(r()<0.6){g.strokeStyle='rgba(60,90,30,0.55)';g.lineWidth=0.8;g.beginPath();g.moveTo(x2,y2);g.lineTo(x2+(r()-0.5)*3,y2+8+r()*16);g.stroke();}};
    let x=20;while(x<P-20){const ht=h*(0.12+r()*0.12);bgWrap(P,x,ht*0.8,xx=>{const rs=r.bind(null);branch(xx,base,-Math.PI/2+(r()-0.5)*0.3,ht*0.45,4+r()*3,3);});x+=60+r()*120;}
    bgFogBand(g,P,base-h*0.08,h*0.25,'#2a380d',0.75);});
  const near=bgLayer(P,H,0.22,0.13,(g,P,h)=>{const r=bgRng(121);S.pools=[];S.mush=[];
    g.fillStyle='#040802';g.beginPath();g.moveTo(0,h);const gf=bgFbm1(123,6,3);for(let x=0;x<=P;x+=4)g.lineTo(x,h-h*0.04-h*0.04*gf(x/P));g.lineTo(P,h);g.fill();
    for(let i=0;i<(P/160|0);i++){const x=r()*P,w=30+r()*50;S.pools.push({x,w,y:h-h*0.035});bgWrap(P,x,w,xx=>{const pg=g.createLinearGradient(0,h-h*0.05,0,h);pg.addColorStop(0,'rgba(120,255,80,0.35)');pg.addColorStop(1,'rgba(40,120,20,0.1)');g.fillStyle=pg;g.beginPath();g.ellipse(xx,h-h*0.03,w,h*0.018,0,0,7);g.fill();});}
    // reeds, pipes, barrels, glowing mushrooms
    for(let i=0;i<(P/40|0);i++){const x=r()*P,k=r();bgWrap(P,x,30,xx=>{
      if(k<0.55){g.strokeStyle='#040802';g.lineWidth=1.4;for(let j=0;j<6;j++){const hh=h*(0.04+r()*0.08);g.beginPath();g.moveTo(xx+j*3,h);g.quadraticCurveTo(xx+j*3+(r()-0.5)*8,h-hh*0.5,xx+j*3+(r()-0.5)*12,h-hh);g.stroke();}}
      else if(k<0.7){g.fillStyle='#071005';g.fillRect(xx,h-h*0.12,8,h*0.12);g.fillRect(xx,h-h*0.12,26,7);g.fillStyle='rgba(120,255,80,0.35)';g.fillRect(xx+20,h-h*0.12+7,4,2);}
      else if(k<0.8){g.fillStyle='#0b1506';g.fillRect(xx,h-h*0.07,14,h*0.07);g.strokeStyle='rgba(180,220,60,0.3)';g.lineWidth=1;g.strokeRect(xx+0.5,h-h*0.07+0.5,13,6);}
      else{for(let j=0;j<3+r()*3;j++){const mx=xx+j*5+r()*3,mh=4+r()*7,cap=3+r()*3;g.fillStyle='#0b1506';g.fillRect(mx-0.7,h-h*0.05-mh,1.4,mh);g.save();g.shadowBlur=10;g.shadowColor='#5dffb0';g.fillStyle='#7dffc0';g.beginPath();g.ellipse(mx,h-h*0.05-mh,cap,cap*0.55,0,Math.PI,0);g.fill();g.restore();S.mush.push({x:mx,y:h-h*0.05-mh});}}});}});
  S.layers=[far,mid,near];S.far=far;S.mid=mid;S.near=near;
  const ff=bgFbm2(131,6,2,4);S.fog=[0,1].map(i=>({img:bgField(P,Math.ceil(H*0.4),(u,w)=>{const d=_bgc((ff(u+i*0.37,w)-0.35)*2,0,1)*Math.sin(w*Math.PI);return[150,200,90,d*(i?110:80)];}),P,par:i?0.3:0.15,drift:i?0.25:0.12}));
  const r=bgRng(141);S.fly=[];for(let i=0;i<(lite?14:34);i++)S.fly.push({x:r()*W,y:H*(0.45+r()*0.5),ph:r()*100,z:r()});
  S.puffs=[];S.bub=[];return S;},
 draw(S,v){const dt=bgDt(S,v),t=v.t;
  cx.drawImage(S.sky,0,0);
  // chimney smoke
  if(Math.random()<(v.lite?0.08:0.25)*dt){const c=S.chim[Math.floor(Math.random()*S.chim.length)];if(c)S.puffs.push({x:c.x,y:c.y,s:0.3,life:240});}
  for(const p of S.puffs){p.y-=0.25*dt;p.x+=0.22*dt;p.s+=0.008*dt;p.life-=dt;const x=bgLX(S.far,v,p.x),y=p.y+Math.round(v.lift*S.far.py),sz=24*p.s;cx.globalAlpha=_bgc(p.life/240,0,1)*0.5;cx.drawImage(bgPuff('#556a3a'),x-sz,y-sz,sz*2,sz*2);}cx.globalAlpha=1;S.puffs=S.puffs.filter(p=>p.life>0);
  bgDrawLayer(S.far,v);
  for(let i=0;i<S.blink.length;i++){const b=S.blink[i];if(Math.floor((t+i*29)/40)%2)continue;const x=bgLX(S.far,v,b.x);cx.drawImage(bgGlow('#ff4433',5),x-5,b.y+Math.round(v.lift*S.far.py)-5);}
  bgDrawLayer(S.mid,v);
  // drifting toxic fog banks
  const fog=(F,y)=>{const ox=-(((v.camX*F.par+t*F.drift)%F.P)+F.P)%F.P;for(let x=ox;x<v.W;x+=F.P)cx.drawImage(F.img,x,y);};
  fog(S.fog[0],v.H*0.55+v.lift*0.08);
  // fireflies / spores
  bgAdd(()=>{for(const f of S.fly){const x=((f.x+Math.sin(t*0.01+f.ph)*40-v.camX*(0.1+f.z*0.2))%v.W+v.W)%v.W,y=f.y+Math.sin(t*0.017+f.ph*2)*20,a=Math.max(0,Math.sin(t*0.04+f.ph));if(a<0.05)continue;cx.globalAlpha=a*0.9;const s=3+f.z*3;cx.drawImage(bgGlow('#c8ff6a',s),x-s,y-s);}cx.globalAlpha=1;});
  bgDrawLayer(S.near,v);
  // bubbles popping in the pools
  if(Math.random()<0.15*dt&&S.pools.length){const p=S.pools[Math.floor(Math.random()*S.pools.length)];S.bub.push({x:p.x+(Math.random()-0.5)*p.w,y:p.y,r:0,max:1.5+Math.random()*2.5,life:40});}
  cx.strokeStyle='rgba(170,255,110,0.7)';cx.lineWidth=1;for(const b of S.bub){b.life-=dt;b.r=Math.min(b.max,b.r+0.1*dt);const x=bgLX(S.near,v,b.x),y=b.y+Math.round(v.lift*S.near.py);cx.globalAlpha=b.life<6?b.life/6:1;cx.beginPath();cx.arc(x,y-b.r,b.r,Math.PI,0);cx.stroke();}cx.globalAlpha=1;S.bub=S.bub.filter(b=>b.life>0);
  // mushrooms breathe
  bgAdd(()=>{for(let i=0;i<S.mush.length;i++){const m=S.mush[i],x=bgLX(S.near,v,m.x);if(x<-10||x>v.W+10)continue;cx.globalAlpha=0.35+0.3*Math.sin(t*0.03+i);cx.drawImage(bgGlow('#5dffb0',8),x-8,m.y+Math.round(v.lift*S.near.py)-8);}cx.globalAlpha=1;});
  fog(S.fog[1],v.H*0.72+v.lift*0.13);
 }};

// ═════════════════ 4 · VOID — deep space anomaly ═════════════════
BG_THEMES[4]={name:'VOID',build(W,H,lite){
  const P=bgP(W),S={P};
  S.sky=bgSkyCanvas(W,H,[[0,'#010003'],[0.5,'#07021a'],[1,'#12052a']]);
  const nf=bgFbm2(151,5,4,5),nf2=bgFbm2(157,7,5,4);
  S.neb=bgLayer(P,H,0.015,0.01,(g,P,h)=>{g.drawImage(bgField(P,h,(u,w)=>{const a=nf(u,w),b=nf2(u,w),d=_bgc((a-0.42)*2.4,0,1),lane=_bgc((b-0.55)*4,0,1);const m=d*(1-lane*0.85);
      return[200*m+40*b*m,40*m+150*(1-a)*m,220*m,m*170];}),0,0);bgStars(g,P,h,lite?220:480,163,h,'#ffffff',true);});
  S.stars2=bgLayer(P,H,0.04,0.03,(g,P,h)=>{bgStars(g,P,h,lite?60:140,167,h,'#cfe6ff',true);
    // ringed planet
    const px=P*0.2,py=h*0.62,pr=Math.max(40,h*0.16);const pg=g.createRadialGradient(px-pr*0.4,py-pr*0.4,pr*0.1,px,py,pr);pg.addColorStop(0,'#6a4aa8');pg.addColorStop(0.7,'#2a1550');pg.addColorStop(1,'#0e0420');
    g.save();g.translate(px,py);g.rotate(-0.35);g.strokeStyle='rgba(180,140,255,0.35)';g.lineWidth=pr*0.08;g.beginPath();g.ellipse(0,0,pr*1.9,pr*0.38,0,Math.PI,0);g.stroke();g.restore();
    g.fillStyle=pg;g.beginPath();g.arc(px,py,pr,0,7);g.fill();g.strokeStyle='rgba(120,90,200,0.15)';g.lineWidth=2;for(let i=-3;i<=3;i++){g.beginPath();g.ellipse(px,py+i*pr*0.22,pr*Math.sqrt(1-Math.pow(i*0.22,2)),pr*0.05,0,0,7);g.stroke();}
    g.save();g.translate(px,py);g.rotate(-0.35);g.strokeStyle='rgba(200,170,255,0.5)';g.lineWidth=pr*0.08;g.beginPath();g.ellipse(0,0,pr*1.9,pr*0.38,0,0,Math.PI);g.stroke();g.restore();});
  const isl=bgLayer(P,H,0.09,0.06,(g,P,h)=>{const r=bgRng(171);S.cry=[];
    for(let i=0;i<5;i++){const x=(i+0.3+r()*0.4)*P/5,y=h*(0.35+r()*0.35),w=40+r()*70,d=w*(0.6+r()*0.5);
      bgWrap(P,x,w,xx=>{g.fillStyle='#120826';g.beginPath();g.moveTo(xx-w,y);for(let k=0;k<=8;k++){const u=k/8;g.lineTo(xx-w+u*2*w,y-(r()*6));}for(let k=8;k>=0;k--){const u=k/8;g.lineTo(xx-w+u*2*w,y+Math.sin(u*Math.PI)*d*(0.7+r()*0.3));}g.fill();
        g.fillStyle='rgba(170,120,255,0.18)';g.fillRect(xx-w,y-2,w*2,3);
        for(let c=0;c<3+r()*4;c++){const cx0=xx+(r()-0.5)*w*1.6,ch=8+r()*18,cw=3+r()*4,col=r()<0.5?'#c06bff':'#4dfff0';g.save();g.shadowBlur=12;g.shadowColor=col;g.fillStyle=bgRgba(col,0.85);g.beginPath();g.moveTo(cx0-cw,y);g.lineTo(cx0,y-ch);g.lineTo(cx0+cw,y);g.fill();g.restore();}});}});
  S.layers=[isl];S.isl=isl;
  S.hole={x:P*0.62,y:H*0.3,r:Math.max(22,H*0.06),L:{P,par:0.02}};
  const r=bgRng(181);S.shards=[];for(let i=0;i<(lite?5:10);i++)S.shards.push({x:r()*W*1.5,y:H*(0.15+r()*0.7),s:6+r()*12,a:r()*6,va:(r()-0.5)*0.01,ph:r()*7,z:0.15+r()*0.2,col:r()<0.5?'#c06bff':'#4dfff0'});
  S.wisp=[];S.tw=[];for(let i=0;i<(lite?12:30);i++)S.tw.push({x:r()*P,y:r()*H,ph:r()*7});
  S.comet=null;
  // accretion disk sprite
  const R=S.hole.r,dc=bgCanvas(R*7,R*7),dg=dc.getContext('2d');dg.translate(R*3.5,R*3.5);dg.scale(1,0.32);
  for(let i=0;i<40;i++){const rr=R*(1.3+i*0.05),a=0.07*(1-i/40);dg.strokeStyle=i<10?`rgba(255,200,140,${a*2})`:`rgba(255,90,200,${a*1.4})`;dg.lineWidth=R*0.08;dg.beginPath();dg.arc(0,0,rr,0,7);dg.stroke();}
  S.disk=dc;
  return S;},
 draw(S,v){const dt=bgDt(S,v),t=v.t,Hh=S.hole;
  cx.drawImage(S.sky,0,0);bgDrawLayer(S.neb,v);
  // twinkling bright stars
  bgAdd(()=>{for(const s of S.tw){const k=Math.sin(t*0.03+s.ph);if(k<0.6)continue;const x=bgLX(S.neb,v,s.x);cx.globalAlpha=(k-0.6)*2.5;cx.drawImage(bgGlow('#e8f0ff',4),x-4,s.y-4);}cx.globalAlpha=1;});
  bgDrawLayer(S.stars2,v);
  // black hole: spinning disk, lensing ring, matter spiralling in
  const hx=bgLX(Hh.L,v,Hh.x),hy=Hh.y+v.lift*0.02,R=Hh.r;
  bgAdd(()=>{cx.drawImage(bgGlow('#ff5ac8',R*4),hx-R*4,hy-R*4);cx.save();cx.translate(hx,hy);cx.rotate(-0.2);cx.globalAlpha=0.85+Math.sin(t*0.05)*0.1;cx.drawImage(S.disk,-S.disk.width/2,-S.disk.height/2);cx.restore();cx.globalAlpha=1;
    for(let i=0;i<14;i++){const a=t*0.02*(1+i*0.05)+i*0.45,rr=R*(1.4+((i*0.37+t*0.002)%1)*1.6);const x=hx+Math.cos(a)*rr,y=hy+Math.sin(a)*rr*0.32;cx.drawImage(bgGlow(i%2?'#ffc890':'#ff70d0',3),x-3,y-3);}});
  cx.fillStyle='#000';cx.beginPath();cx.arc(hx,hy,R,0,7);cx.fill();
  cx.strokeStyle='rgba(255,220,180,0.9)';cx.lineWidth=1.5;cx.beginPath();cx.arc(hx,hy,R*1.04,0,7);cx.stroke();
  // front half of the disk passes in front of the hole
  cx.save();cx.translate(hx,hy);cx.rotate(-0.2);cx.beginPath();cx.rect(-R*4,0,R*8,R*4);cx.clip();bgAdd(()=>cx.drawImage(S.disk,-S.disk.width/2,-S.disk.height/2));cx.restore();
  // comet
  if(!S.comet&&Math.random()<0.002*dt&&!v.lite)S.comet={x:-40,y:v.H*(0.1+Math.random()*0.3),t:0};
  if(S.comet){const c=S.comet;c.t+=dt;c.x+=2.4*dt;c.y+=0.5*dt;bgAdd(()=>{cx.strokeStyle='rgba(160,230,255,0.5)';cx.lineWidth=2;cx.beginPath();cx.moveTo(c.x,c.y);cx.lineTo(c.x-60,c.y-12);cx.stroke();cx.drawImage(bgGlow('#c8f4ff',6),c.x-6,c.y-6);});if(c.x>v.W+80)S.comet=null;}
  bgDrawLayer(S.isl,v);
  // floating crystal shards
  for(const s of S.shards){s.a+=s.va*dt;const x=((s.x-v.camX*s.z)%(v.W*1.5)+v.W*1.5)%(v.W*1.5)-v.W*0.25,y=s.y+Math.sin(t*0.015+s.ph)*10+v.lift*s.z*0.3;if(x<-30||x>v.W+30)continue;
    bgAdd(()=>{cx.globalAlpha=0.5;cx.drawImage(bgGlow(s.col,s.s*2),x-s.s*2,y-s.s*2);cx.globalAlpha=1;});
    cx.save();cx.translate(x,y);cx.rotate(s.a);cx.fillStyle='#0d0520';cx.strokeStyle=s.col;cx.lineWidth=1.2;cx.beginPath();cx.moveTo(0,-s.s);cx.lineTo(s.s*0.45,0);cx.lineTo(0,s.s);cx.lineTo(-s.s*0.45,0);cx.closePath();cx.fill();cx.stroke();
    cx.strokeStyle=bgRgba(s.col,0.5);cx.beginPath();cx.moveTo(0,-s.s);cx.lineTo(0,s.s);cx.stroke();cx.restore();}
 }};

// ═════════════════ 5 · SOLAR — desert under a giant sun ═════════════════
BG_THEMES[5]={name:'SOLAR',build(W,H,lite){
  const P=bgP(W),hy=H*0.8,S={P,hy};
  S.sky=bgSkyCanvas(W,H,[[0,'#160206'],[0.35,'#430a0e'],[0.62,'#8e2716'],[0.82,'#c95e24'],[1,'#e89a48']]);
  S.sun={x:P*0.5,y:hy-H*0.06,r:Math.max(60,H*0.2),L:{P,par:0.02}};
  const sc=bgCanvas(S.sun.r*2.4,S.sun.r*2.4),sg=sc.getContext('2d'),R=S.sun.r,c0=R*1.2;
  const dg=sg.createRadialGradient(c0,c0,0,c0,c0,R);dg.addColorStop(0,'#fffbe0');dg.addColorStop(0.55,'#ffd27a');dg.addColorStop(0.9,'#ff9a3a');dg.addColorStop(1,'#ff6a2a');sg.fillStyle=dg;sg.beginPath();sg.arc(c0,c0,R,0,7);sg.fill();
  sg.globalCompositeOperation='source-atop';for(let i=0;i<9;i++){sg.fillStyle='rgba(160,40,20,0.08)';sg.fillRect(0,c0+R*0.15+i*R*0.09,c0*2,R*0.035+i*0.6);}S.sunImg=sc;
  const mf=bgFbm1(191,7,3),far=bgLayer(P,H,0.05,0.03,(g,P,h)=>{const r=bgRng(193),col=bgMix('#3a0a0c','#d0562a',0.45);g.fillStyle=col;
    let x=0;while(x<P){const w=50+r()*120,ht=h*(0.06+r()*0.12);bgWrap(P,x,w,xx=>{g.beginPath();g.moveTo(xx,hy);g.lineTo(xx+w*0.12,hy-ht*0.5);g.lineTo(xx+w*0.18,hy-ht);g.lineTo(xx+w*0.8,hy-ht);g.lineTo(xx+w*0.86,hy-ht*0.55);g.lineTo(xx+w,hy);g.fill();
      g.fillStyle='rgba(255,170,90,0.18)';g.fillRect(xx+w*0.18,hy-ht,w*0.62,2);g.fillStyle=col;});x+=w+r()*90;}
    bgRidge(g,P,h,hy+4,h*0.03,u=>mf(u),col);g.fillRect(0,hy,P,h-hy);bgFogBand(g,P,hy-h*0.1,h*0.2,'#e6702a',0.55);});
  const df=bgFbm1(197,5,3),mid=bgLayer(P,H,0.11,0.07,(g,P,h)=>{const base=hy+h*0.07,amp=h*0.09,f=u=>df(u);
    const gr=g.createLinearGradient(0,base-amp,0,h);gr.addColorStop(0,'#7a2a10');gr.addColorStop(1,'#2a0a05');bgRidge(g,P,h,base,amp,f,gr);
    // sunlit crest lines on the dune ridges
    g.strokeStyle='rgba(255,190,110,0.45)';g.lineWidth=1.2;g.beginPath();for(let x=0;x<=P;x+=3){const y=base-amp*f(x/P),d=f((x+3)/P)-f(x/P);if(d<0)g.lineTo(x,y);else g.moveTo(x,y);}g.stroke();
    bgFogBand(g,P,base-h*0.03,h*0.16,'#a02c18',0.6);});
  const near=bgLayer(P,H,0.22,0.13,(g,P,h)=>{const r=bgRng(201),col='#160404';
    g.fillStyle=col;const gf=bgFbm1(203,4,3);g.beginPath();g.moveTo(0,h);for(let x=0;x<=P;x+=4)g.lineTo(x,h-h*0.035-h*0.03*gf(x/P));g.lineTo(P,h);g.fill();
    let x=40;while(x<P-80){const k=r();bgWrap(P,x,90,xx=>{g.fillStyle=col;
      if(k<0.3){const w=70+r()*40,ht=h*(0.16+r()*0.08),th=12;g.beginPath();g.moveTo(xx,h);g.lineTo(xx,h-ht);g.quadraticCurveTo(xx+w/2,h-ht-ht*0.35,xx+w,h-ht);g.lineTo(xx+w,h);g.lineTo(xx+w-th,h);g.lineTo(xx+w-th,h-ht+th);g.quadraticCurveTo(xx+w/2,h-ht-ht*0.35+th*1.6,xx+th,h-ht+th);g.lineTo(xx+th,h);g.fill();
        g.strokeStyle='rgba(255,150,70,0.4)';g.lineWidth=1.2;g.beginPath();g.moveTo(xx,h-ht);g.quadraticCurveTo(xx+w/2,h-ht-ht*0.35,xx+w,h-ht);g.stroke();}
      else if(k<0.6){for(let j=0;j<2+r()*3;j++){const px=xx+j*16,ph=h*(0.05+r()*0.12);g.fillStyle=col;g.fillRect(px,h-ph,9,ph);g.fillRect(px-2,h-ph-3,13,3);g.fillStyle='rgba(255,150,70,0.4)';g.fillRect(px-2,h-ph-3,13,1);}}
      else{const ch=h*(0.07+r()*0.06);g.fillStyle=col;g.fillRect(xx-2,h-ch,4,ch);g.fillRect(xx-9,h-ch*0.6,7,3);g.fillRect(xx-9,h-ch*0.85,3,ch*0.28);g.fillRect(xx+2,h-ch*0.45,7,3);g.fillRect(xx+6,h-ch*0.7,3,ch*0.27);g.fillStyle='rgba(255,150,70,0.35)';g.fillRect(xx+1,h-ch,1,ch);}});
      x+=90+r()*170;}});
  S.layers=[far,mid,near];S.far=far;S.mid=mid;S.near=near;
  const r=bgRng(211);S.sand=[];for(let i=0;i<(lite?25:70);i++)S.sand.push({x:r()*W,y:H*(0.6+r()*0.4),z:r(),l:4+r()*14});
  S.birds=[];for(let i=0;i<(lite?2:5);i++)S.birds.push({x:r()*P,y:H*(0.18+r()*0.2),ph:r()*7,v:0.25+r()*0.25});
  S.prom=[0,1,2].map(i=>({a:-Math.PI*0.25-i*0.9,ph:i*2.3}));
  return S;},
 draw(S,v){const dt=bgDt(S,v),t=v.t,sun=S.sun;
  cx.drawImage(S.sky,0,0);
  const sx=bgLX(sun.L,v,sun.x),sy=sun.y+v.lift*0.02,R=sun.r;
  // corona + slowly turning rays
  bgAdd(()=>{cx.globalAlpha=0.6;cx.drawImage(bgGlow('#ff8a30',R*2.4),sx-R*2.4,sy-R*2.4);cx.globalAlpha=1;if(!v.lite){cx.save();cx.translate(sx,sy);cx.rotate(t*0.0008);cx.fillStyle='rgba(255,200,120,0.028)';for(let i=0;i<12;i++){cx.rotate(Math.PI/6);cx.beginPath();cx.moveTo(0,0);cx.lineTo(R*3.2,-R*0.18);cx.lineTo(R*3.2,R*0.18);cx.fill();}cx.restore();}});
  cx.drawImage(S.sunImg,sx-S.sunImg.width/2,sy-S.sunImg.height/2);
  // solar prominences: glowing loops that rise and fade on the limb
  bgAdd(()=>{for(const p of S.prom){const k=(Math.sin(t*0.01+p.ph)+1)/2;if(k<0.15)continue;const a=p.a,x0=sx+Math.cos(a-0.12)*R,y0=sy+Math.sin(a-0.12)*R,x1=sx+Math.cos(a+0.12)*R,y1=sy+Math.sin(a+0.12)*R,hx=sx+Math.cos(a)*R*(1.15+k*0.25),hy=sy+Math.sin(a)*R*(1.15+k*0.25);
    cx.strokeStyle=`rgba(255,120,60,${k*0.7})`;cx.lineWidth=3+k*3;cx.beginPath();cx.moveTo(x0,y0);cx.quadraticCurveTo(hx,hy,x1,y1);cx.stroke();}});
  // gliding birds
  cx.strokeStyle='rgba(30,6,6,0.8)';cx.lineWidth=1.3;for(const b of S.birds){b.x=(b.x+b.v*dt)%S.P;const x=bgLX({P:S.P,par:0.06},v,b.x),y=b.y+Math.sin(t*0.01+b.ph)*6,f=Math.sin(t*0.12+b.ph)*3;cx.beginPath();cx.moveTo(x-6,y-f);cx.quadraticCurveTo(x-3,y-2,x,y);cx.quadraticCurveTo(x+3,y-2,x+6,y-f);cx.stroke();}
  // far mesas, with heat haze: the band just above the horizon is drawn in thin wobbling slices
  if(v.lite)bgDrawLayer(S.far,v);else{const L=S.far,y0=Math.round(S.hy-v.H*0.16),h0=Math.round(v.H*0.16),ly=Math.round(v.lift*L.py),ox=-(((v.camX*L.par%L.P)+L.P)%L.P);
    for(let x=ox;x<v.W;x+=L.P){cx.drawImage(L.img,0,0,L.P,y0,Math.round(x),ly,L.P,y0);cx.drawImage(L.img,0,y0+h0,L.P,L.img.height-y0-h0,Math.round(x),y0+h0+ly,L.P,L.img.height-y0-h0);
      for(let y=0;y<h0;y+=3){const off=Math.sin(t*0.08+y*0.35)*1.4*(y/h0);cx.drawImage(L.img,0,y0+y,L.P,3,Math.round(x)+off,y0+y+ly,L.P,3);}}}
  bgDrawLayer(S.mid,v);
  // blowing sand
  cx.strokeStyle='rgba(255,200,140,0.25)';cx.lineWidth=1;for(const s of S.sand){s.x+=(2+s.z*4)*dt;if(s.x>v.W+20){s.x=-20;s.y=v.H*(0.6+Math.random()*0.4);}const x=((s.x-v.camX*(0.1+s.z*0.2))%(v.W+40)+v.W+40)%(v.W+40)-20;cx.globalAlpha=0.4+s.z*0.5;cx.beginPath();cx.moveTo(x,s.y);cx.lineTo(x-s.l,s.y+1);cx.stroke();}cx.globalAlpha=1;
  bgDrawLayer(S.near,v);
 }};

// ═════════════════ 6 · DEEPSEA — the abyss ═════════════════
BG_THEMES[6]={name:'DEEPSEA',build(W,H,lite){
  const P=bgP(W),S={P};
  S.sky=bgSkyCanvas(W,H,[[0,'#0b5b6e'],[0.3,'#063a52'],[0.7,'#031d33'],[1,'#010b18']]);
  const cf=bgFbm2(221,10,3,3);
  S.caust=bgField(P,Math.ceil(H*0.22),(u,w)=>{const n=cf(u,w),k=Math.pow(1-Math.abs(n*2-1),6);return[180,255,255,k*90*(1-w)];});
  const far=bgLayer(P,H,0.05,0.03,(g,P,h)=>{const f=bgFbm1(231,6,4);g.fillStyle='#062d40';bgRidge(g,P,h,h*0.86,h*0.4,u=>Math.pow(f(u),1.5),'#06293b');
    const r=bgRng(233);for(let i=0;i<3;i++){const x=r()*P,y=h*0.8,ht=h*(0.12+r()*0.1);bgWrap(P,x,60,xx=>{g.fillStyle='#072f43';for(let k=0;k<3;k++)g.fillRect(xx+k*24,y-ht,8,ht);g.fillRect(xx-4,y-ht-6,64,6);g.beginPath();g.moveTo(xx-4,y-ht-6);g.lineTo(xx+28,y-ht-18);g.lineTo(xx+60,y-ht-6);g.fill();});}
    bgFogBand(g,P,h*0.6,h*0.4,'#031d33',0.75);});
  const mid=bgLayer(P,H,0.11,0.07,(g,P,h)=>{const r=bgRng(241);S.bio=[];const f=bgFbm1(243,8,3);bgRidge(g,P,h,h*0.92,h*0.1,u=>f(u),'#041a28');
    const coral=(x,y,a,len,w,d)=>{const x2=x+Math.cos(a)*len,y2=y+Math.sin(a)*len;g.strokeStyle='#041a28';g.lineWidth=w;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();
      if(d>0){coral(x2,y2,a-0.4-r()*0.3,len*0.75,w*0.7,d-1);coral(x2,y2,a+0.4+r()*0.3,len*0.75,w*0.7,d-1);}else if(r()<0.4)S.bio.push({x:x2,y:y2,col:r()<0.5?'#4dfff0':'#ff7ad9'});};
    let x=10;while(x<P-10){const k=r();bgWrap(P,x,50,xx=>{if(k<0.5)coral(xx,h*0.92,-Math.PI/2+(r()-0.5)*0.3,h*0.05+r()*h*0.04,5,4);else if(k<0.8){g.fillStyle='#041a28';g.beginPath();g.ellipse(xx,h*0.92,16+r()*14,10+r()*10,0,Math.PI,0);g.fill();}
      else{g.strokeStyle='rgba(4,26,40,0.95)';g.lineWidth=1;for(let j=0;j<14;j++){g.beginPath();g.moveTo(xx,h*0.92);g.quadraticCurveTo(xx+(j-7)*3,h*0.85,xx+(j-7)*5,h*(0.8-r()*0.05));g.stroke();}}});x+=40+r()*90;}
    bgFogBand(g,P,h*0.8,h*0.2,'#031d33',0.6);});
  const near=bgLayer(P,H,0.22,0.13,(g,P,h)=>{const r=bgRng(251);S.vents=[];const f=bgFbm1(253,5,3);bgRidge(g,P,h,h*0.97,h*0.06,u=>f(u),'#010a12');
    for(let i=0;i<(P/180|0);i++){const x=r()*P,ht=h*(0.06+r()*0.1),w=18+r()*24;bgWrap(P,x,w,xx=>{g.fillStyle='#010a12';g.beginPath();g.moveTo(xx-w,h);g.lineTo(xx-w*0.3,h-ht);g.lineTo(xx+w*0.2,h-ht*0.9);g.lineTo(xx+w,h);g.fill();
      for(let k=0;k<4;k++){const bx=xx+(r()-0.5)*w,by=h-ht*r();g.save();g.shadowBlur=8;g.shadowColor='#4dfff0';g.fillStyle='rgba(120,255,240,0.8)';g.beginPath();g.arc(bx,by,0.9+r()*0.9,0,7);g.fill();g.restore();}});if(r()<0.5)S.vents.push({x,y:h-ht});}});
  S.layers=[far,mid,near];S.far=far;S.mid=mid;S.near=near;
  const r=bgRng(261);
  S.rays=[];for(let i=0;i<(lite?3:6);i++)S.rays.push({x:r(),w:40+r()*80,ph:r()*7,a:0.08+r()*0.07});S.ray=bgRay('#a8f4ff',100,Math.ceil(H*1.05),1);
  S.kelp=[];for(let i=0;i<(lite?5:11);i++)S.kelp.push({x:r()*P,h:H*(0.25+r()*0.3),ph:r()*7,seg:10});
  S.fish=[0,1].map(i=>({L:{P,par:i?0.16:0.08},x:r()*P,y:H*(0.3+i*0.2),v:(0.5+r()*0.4)*(i?1:-1),n:lite?7:14,s:i?1:0.7,ph:r()*7,col:i?'#1a5a70':'#123f55'}));
  S.jelly=[];for(let i=0;i<(lite?2:4);i++)S.jelly.push({x:r()*W,y:H*(0.3+r()*0.6),s:6+r()*8,ph:r()*7,z:0.1+r()*0.15,col:['#ff7ad9','#7affea','#b38cff'][i%3]});
  S.snow=[];for(let i=0;i<(lite?30:80);i++)S.snow.push({x:r()*W,y:r()*H,z:r()});
  S.bub=[];S.whale={x:-1,t:0};
  return S;},
 draw(S,v){const dt=bgDt(S,v),t=v.t;
  cx.drawImage(S.sky,0,0);
  // shimmering caustics near the surface + swaying god rays
  const ox=-(((v.camX*0.02+t*0.15)%S.P)+S.P)%S.P;cx.globalAlpha=0.7+Math.sin(t*0.03)*0.2;for(let x=ox;x<v.W;x+=S.P)cx.drawImage(S.caust,x,0);cx.globalAlpha=1;
  bgAdd(()=>{for(const r of S.rays){const x=r.x*v.W+Math.sin(t*0.004+r.ph)*40-v.camX*0.02%v.W;cx.globalAlpha=r.a*(0.6+0.4*Math.sin(t*0.01+r.ph));cx.save();cx.translate(x,-10);cx.rotate(0.18+Math.sin(t*0.003+r.ph)*0.04);cx.drawImage(S.ray,-r.w/2,0,r.w,S.ray.height);cx.restore();}cx.globalAlpha=1;});
  // a whale passes far away, now and then
  if(S.whale.x<0&&Math.random()<0.0008*dt&&!v.lite)S.whale={x:v.W+200,y:v.H*(0.2+Math.random()*0.15)};
  if(S.whale.x>=0){const w=S.whale;w.x-=0.35*dt;const x=w.x,y=w.y+Math.sin(t*0.01)*6;cx.fillStyle='rgba(4,30,45,0.7)';cx.beginPath();cx.ellipse(x,y,110,22,0,0,7);cx.fill();cx.beginPath();cx.moveTo(x+100,y);cx.lineTo(x+150,y-18+Math.sin(t*0.03)*6);cx.lineTo(x+146,y+16+Math.sin(t*0.03)*6);cx.fill();cx.beginPath();cx.ellipse(x-10,y+16,30,6,0.4,0,7);cx.fill();if(x<-200)S.whale.x=-1;}
  bgDrawLayer(S.far,v);
  // fish schools: each fish follows the school with a little wave
  const school=(F)=>{F.x=(F.x+F.v*dt+S.P)%S.P;const bx=bgLX(F.L,v,F.x),d=Math.sign(F.v);cx.fillStyle=F.col;for(let i=0;i<F.n;i++){const ox=(i%5)*14*F.s-(i>>2)*6,oy=((i*7)%5-2)*9*F.s,w=Math.sin(t*0.08+i+F.ph)*3;const x=bx-d*ox+w,y=F.y+oy+Math.sin(t*0.03+i*0.7)*4+v.lift*F.L.par*0.5,s=F.s*(0.85+((i*13)%5)*0.06);
      if(x<-20||x>v.W+20)continue;cx.beginPath();cx.ellipse(x,y,5*s,2*s,0,0,7);cx.fill();cx.beginPath();cx.moveTo(x-d*4*s,y);cx.lineTo(x-d*8*s,y-2.6*s);cx.lineTo(x-d*8*s,y+2.6*s);cx.fill();}};
  school(S.fish[0]);bgDrawLayer(S.mid,v);
  bgAdd(()=>{for(let i=0;i<S.bio.length;i++){const b=S.bio[i],x=bgLX(S.mid,v,b.x);if(x<-6||x>v.W+6)continue;cx.globalAlpha=0.4+0.4*Math.sin(t*0.04+i);cx.drawImage(bgGlow(b.col,4),x-4,b.y+Math.round(v.lift*S.mid.py)-4);}cx.globalAlpha=1;});
  // kelp swaying in the current
  const kL={P:S.P,par:0.16};cx.lineCap='round';for(const k of S.kelp){const x0=bgLX(kL,v,k.x);if(x0<-60||x0>v.W+60)continue;const base=v.H+4+v.lift*0.1,seg=k.h/k.seg;let x=x0,y=base;cx.strokeStyle='#05303a';cx.lineWidth=3;cx.beginPath();cx.moveTo(x,y);
    const pts=[];for(let s=1;s<=k.seg;s++){x=x0+Math.sin(t*0.02+k.ph+s*0.35)*s*1.6;y=base-s*seg;cx.lineTo(x,y);pts.push([x,y]);}cx.stroke();cx.fillStyle='#06404a';for(let s=1;s<pts.length;s+=2){const p=pts[s],side=s%4<2?1:-1;cx.beginPath();cx.ellipse(p[0]+side*5,p[1],6,2.2,side*0.6,0,7);cx.fill();}}
  // jellyfish pulsing upward
  for(const j of S.jelly){const pulse=Math.sin(t*0.06+j.ph),x=((j.x-v.camX*j.z)%(v.W+100)+v.W+100)%(v.W+100)-50;j.y-=(0.15+Math.max(0,pulse)*0.35)*dt;if(j.y<-40){j.y=v.H+40;j.x=Math.random()*v.W;}const s=j.s,w=s*(1+pulse*0.12),hh=s*(0.8-pulse*0.12);
    bgAdd(()=>{cx.globalAlpha=0.45;cx.drawImage(bgGlow(j.col,s*2.5),x-s*2.5,j.y-s*2.5);cx.globalAlpha=1;});
    cx.fillStyle=bgRgba(j.col,0.35);cx.strokeStyle=bgRgba(j.col,0.8);cx.lineWidth=1;cx.beginPath();cx.ellipse(x,j.y,w,hh,0,Math.PI,0);cx.closePath();cx.fill();cx.stroke();
    cx.strokeStyle=bgRgba(j.col,0.4);for(let k=0;k<4;k++){cx.beginPath();cx.moveTo(x-w*0.6+k*w*0.4,j.y);for(let s2=1;s2<6;s2++)cx.lineTo(x-w*0.6+k*w*0.4+Math.sin(t*0.07+s2+k)*2,j.y+s2*s*0.5);cx.stroke();}}
  school(S.fish[1]);bgDrawLayer(S.near,v);
  // vent bubbles + marine snow
  if(Math.random()<0.2*dt&&S.vents.length){const vt=S.vents[Math.floor(Math.random()*S.vents.length)];S.bub.push({x:vt.x,y:vt.y,r:1+Math.random()*2,ph:Math.random()*7});}
  cx.strokeStyle='rgba(190,240,255,0.6)';cx.lineWidth=1;for(const b of S.bub){b.y-=(0.6+b.r*0.3)*dt;const x=bgLX(S.near,v,b.x)+Math.sin(t*0.08+b.ph)*3,y=b.y+Math.round(v.lift*S.near.py);cx.beginPath();cx.arc(x,y,b.r,0,7);cx.stroke();}S.bub=S.bub.filter(b=>b.y>-10);
  cx.fillStyle='#cfefff';for(const s of S.snow){s.y+=(0.1+s.z*0.25)*dt;s.x+=Math.sin(t*0.01+s.z*9)*0.1;if(s.y>v.H)s.y=0;const x=((s.x-v.camX*(0.05+s.z*0.2))%v.W+v.W)%v.W;cx.globalAlpha=0.15+s.z*0.35;cx.fillRect(x,s.y,1+s.z,1+s.z);}cx.globalAlpha=1;
 }};
