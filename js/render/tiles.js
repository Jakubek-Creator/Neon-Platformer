// Neon Platformer — Block look & animation
// Solid ground is drawn as connected neon shapes: only the outer edges glow,
// with a bright rim on top (where you stand), rounded outer corners and small
// light nodes in the inside corners — no more box around every single tile.
// Special blocks get their own look and animation. Behaviour is unchanged.
//   tileDraw(t,sx,sy,c,r) → true if handled (else the old drawTile is used)
//   tileFx(kind,c,r)       → event from the game: 'crumble', 'break', 'bounce'
//   tilesTick()            → once per game tick (effects)   tilesDrawFx() → draw effects
const TL={cache:{},key:'',fx:[],bounce:{},respawn:[],grow:{}};
const CRUMBLE_RESPAWN=240; // ticks (~4 s) before a crumbled block comes back
const _tlc=(v,a,b)=>v<a?a:v>b?b:v;
function _tlHex(h){if(h[0]==='r'){return h.match(/[\d.]+/g).slice(0,3).map(Number);}h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255];}
function _tlMix(a,b,t,al){const A=_tlHex(a),B=_tlHex(b),c=A.map((v,i)=>Math.round(v+(B[i]-v)*t));return al==null?`rgb(${c[0]},${c[1]},${c[2]})`:`rgba(${c[0]},${c[1]},${c[2]},${al})`;}
function _tlCv(w,h){const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;}
function _tlHash(c,r){let h=(c*374761393+r*668265263)>>>0;h=(h^(h>>>13))*1274126177>>>0;return(h^(h>>>16))>>>0;}
function _tlGlow(col,rad){const k='g|'+col+'|'+rad;if(TL.cache[k])return TL.cache[k];const c=_tlCv(rad*2,rad*2),g=c.getContext('2d'),gr=g.createRadialGradient(rad,rad,0,rad,rad,rad);
  const A=_tlHex(col);gr.addColorStop(0,`rgba(${A},1)`);gr.addColorStop(0.3,`rgba(${A},0.5)`);gr.addColorStop(1,`rgba(${A},0)`);g.fillStyle=gr;g.fillRect(0,0,rad*2,rad*2);return TL.cache[k]=c;}
// theme palette for solid ground, taken from the level's theme colours
function _tlPal(){const k=TC.fill+TC.stroke+TC.glow;if(TL.key!==k){TL.key=k;for(const x in TL.cache)if(x[0]!=='g')delete TL.cache[x];}
  return{fill:TC.fill,stroke:TC.stroke,glow:TC.glow,core:_tlMix(TC.stroke,'#ffffff',0.55),top:_tlMix(TC.fill,TC.stroke,0.16),bot:_tlMix(TC.fill,'#000000',0.35)};}
const _TLP={
  ice:{fill:'#0b2a36',stroke:'#7FFFFF',glow:'#33CCFF',core:'#e6ffff',top:'#1d5a6a',bot:'#071c26'},
  crumble:{fill:'#1a0c06',stroke:'#FF9A3C',glow:'#CC5500',core:'#ffd9a8',top:'#2e160a',bot:'#0e0603'},
  brick:{fill:'#1e1208',stroke:'#E0A060',glow:'#8a5420',core:'#ffe0b8',top:'#2c1a0c',bot:'#120a04'},
  bounce:{fill:'#06180a',stroke:'#63c916',glow:'#3B6D11',core:'#d6ffb0',top:'#0d2a10',bot:'#041006'}
};
// tile body: soft top-lit gradient + one of four faint surface details
function _tlBody(P,v){const k='b|'+P.stroke+'|'+v;if(TL.cache[k])return TL.cache[k];const c=_tlCv(TS,TS),g=c.getContext('2d');
  g.fillStyle=_tlMix(P.top,P.bot,0.55);g.fillRect(0,0,TS,TS);
  g.strokeStyle=_tlMix(P.stroke,P.stroke,0,0.07);g.fillStyle=_tlMix(P.stroke,P.stroke,0,0.12);g.lineWidth=1;
  if(v===1){g.beginPath();g.moveTo(4,10.5);g.lineTo(14,10.5);g.lineTo(18,14.5);g.stroke();g.fillRect(18,14,2,2);}
  else if(v===2){g.beginPath();g.moveTo(8.5,TS);g.lineTo(8.5,22.5);g.lineTo(20.5,22.5);g.lineTo(20.5,14);g.stroke();g.beginPath();g.arc(20.5,13,1.6,0,7);g.fill();}
  else if(v===3){g.fillRect(6,24,2,2);g.fillRect(24,8,2,2);}
  return TL.cache[k]=c;}
// glowing edges for the exposed sides (mask bits: 1 top, 2 right, 4 bottom, 8 left)
function _tlEdge(P,m,full){const k='e|'+P.stroke+'|'+m+'|'+(full?1:0);if(TL.cache[k])return TL.cache[k];
  const pad=12,c=_tlCv(TS+pad*2,TS+pad*2),g=c.getContext('2d');g.translate(pad,pad);
  const T=m&1,R=m&2,B=m&4,L=m&8,rad=5,i=1.5,e=TS-1.5;
  const path=()=>{g.beginPath();
    if(T){g.moveTo(L?i+rad:0,i);g.lineTo(R?e-rad:TS,i);}
    if(R){if(T){g.moveTo(e-rad,i);g.arcTo(e,i,e,i+rad,rad);}else g.moveTo(e,0);g.lineTo(e,B?e-rad:TS);}
    if(B){if(R){g.moveTo(e,e-rad);g.arcTo(e,e,e-rad,e,rad);}else g.moveTo(TS,e);g.lineTo(L?i+rad:0,e);}
    if(L){if(B){g.moveTo(i+rad,e);g.arcTo(i,e,i,e-rad,rad);}else g.moveTo(i,TS);g.lineTo(i,T?i+rad:0);if(T){g.arcTo(i,i,i+rad,i,rad);}}
  };
  if(T){const lg=g.createLinearGradient(0,0,0,TS);lg.addColorStop(0,_tlMix(P.stroke,P.stroke,0,0.34));lg.addColorStop(0.25,_tlMix(P.stroke,P.stroke,0,0.1));lg.addColorStop(1,_tlMix(P.stroke,P.stroke,0,0));g.fillStyle=lg;g.fillRect(0,0,TS,TS);}
  g.lineCap='round';g.shadowBlur=12;g.shadowColor=P.glow;g.strokeStyle=P.stroke;g.lineWidth=3;path();g.stroke();
  g.shadowBlur=0;g.strokeStyle=P.core;g.lineWidth=1.2;path();g.stroke();
  if(T){g.strokeStyle='rgba(255,255,255,0.85)';g.lineWidth=1;g.beginPath();g.moveTo(L?i+rad:0,i);g.lineTo(R?e-rad:TS,i);g.stroke();}
  return TL.cache[k]=c;}
// boxy style: every tile is its own glowing box (classic look) with the new neon tube glow
function _tlBox(P,top){const k='x|'+P.stroke+'|'+(top?1:0);if(TL.cache[k])return TL.cache[k];
  const pad=12,c=_tlCv(TS+pad*2,TS+pad*2),g=c.getContext('2d');g.translate(pad,pad);
  if(top){const lg=g.createLinearGradient(0,0,0,TS);lg.addColorStop(0,_tlMix(P.stroke,P.stroke,0,0.3));lg.addColorStop(0.3,_tlMix(P.stroke,P.stroke,0,0.08));lg.addColorStop(1,_tlMix(P.stroke,P.stroke,0,0));g.fillStyle=lg;g.fillRect(1,1,TS-2,TS-2);}
  const rr=()=>{g.beginPath();g.roundRect(1.5,1.5,TS-3,TS-3,3);};
  g.shadowBlur=10;g.shadowColor=P.glow;g.strokeStyle=P.stroke;g.lineWidth=2.4;rr();g.stroke();
  g.shadowBlur=0;g.strokeStyle=P.core;g.lineWidth=0.9;g.globalAlpha=0.8;rr();g.stroke();g.globalAlpha=1;
  // inner bevel line like the old tiles
  g.strokeStyle=_tlMix(P.stroke,P.stroke,0,0.22);g.lineWidth=1;g.beginPath();g.roundRect(5.5,5.5,TS-11,TS-11,2);g.stroke();
  if(top){g.strokeStyle='rgba(255,255,255,0.9)';g.lineWidth=1;g.beginPath();g.moveTo(4,1.5);g.lineTo(TS-4,1.5);g.stroke();}
  return TL.cache[k]=c;}
TL.boxy=true;
function _tlAt(c,r){if(r<0||c<0||c>=COLS||r>=ROWS)return -1;return(grid[r]&&grid[r][c])||0;}
function _tlMask(c,r,same){let m=0;const s=t=>t===-1||same(t);if(!s(_tlAt(c,r-1)))m|=1;if(!s(_tlAt(c+1,r)))m|=2;if(!s(_tlAt(c,r+1)))m|=4;if(!s(_tlAt(c-1,r)))m|=8;return m;}
// connected block: body + edges + inside-corner nodes + travelling light along the top rim
function _tlConnected(P,sx,sy,c,r,same,opt){
  const m=_tlMask(c,r,same),h=_tlHash(c,r);
  cx.drawImage(_tlBody(P,opt&&opt.plain?0:(h%7<3?0:h%4)),sx,sy);
  if(opt&&opt.over)opt.over();
  if(TL.boxy&&!(opt&&opt.connected))cx.drawImage(_tlBox(P,m&1),sx-12,sy-12);else if(m)cx.drawImage(_tlEdge(P,m),sx-12,sy-12);
  // inside corners: both neighbours solid but the diagonal is open
  const node=(dx,dy,x,y)=>{if(same(_tlAt(c+dx,r))&&same(_tlAt(c,r+dy))&&!same(_tlAt(c+dx,r+dy))&&_tlAt(c+dx,r+dy)!==-1)cx.drawImage(_tlGlow(P.stroke,5),x-5,y-5);};
  if(!TL.boxy&&!(m&1)){node(-1,-1,sx,sy);node(1,-1,sx+TS,sy);}
  // a pulse of light that runs along top rims (world-based so it flows across tiles)
  if(m&1){const per=560,pos=((c*TS+r*97-frame*2.4)%per+per)%per;if(pos<TS+14){const x=sx+pos-7;cx.globalCompositeOperation='lighter';cx.drawImage(_tlGlow(P.stroke,9),x-9,sy+1.5-9);cx.globalCompositeOperation='source-over';}}
  return m;}

// ── individual blocks ──
const TLD={};
const _tlSolidSame=t=>t===1||t===40||t===41;
TLD[1]=(sx,sy,c,r)=>{_tlConnected(_tlPal(),sx,sy,c,r,_tlSolidSame);};
TLD[8]=(sx,sy,c,r)=>{const P=_TLP.ice;_tlConnected(P,sx,sy,c,r,t=>t===8,{plain:true,over:()=>{
  // frosty facets
  cx.strokeStyle='rgba(190,250,255,0.16)';cx.lineWidth=1;cx.beginPath();const h=_tlHash(c,r)%3;cx.moveTo(sx+4+h*6,sy);cx.lineTo(sx+14+h*4,sy+TS);cx.moveTo(sx+TS,sy+8+h*5);cx.lineTo(sx+10,sy+20);cx.stroke();
  // a shine that sweeps across the ice every few seconds
  const per=700,pos=((frame*4-c*TS-r*16)%per+per)%per-40;if(pos>-8&&pos<TS+8){cx.save();cx.beginPath();cx.rect(sx,sy,TS,TS);cx.clip();cx.strokeStyle='rgba(255,255,255,0.55)';cx.lineWidth=3;cx.beginPath();cx.moveTo(sx+pos,sy+TS);cx.lineTo(sx+pos+12,sy);cx.stroke();cx.lineWidth=1;cx.beginPath();cx.moveTo(sx+pos+6,sy+TS);cx.lineTo(sx+pos+18,sy);cx.stroke();cx.restore();}
  if(_tlHash(c,r)%5===0){const tw=Math.sin(frame*0.08+c);if(tw>0.6){cx.fillStyle=`rgba(255,255,255,${(tw-0.6)*2.2})`;cx.fillRect(sx+22,sy+9,2,2);}}}});};
// liquids: one connected body, glowing wavy surface only on top, bubbles inside
const _TLQ={2:{surf:'#5ec8ff',a:'#0d3a5e',b:'#04121f',bub:'rgba(170,230,255,0.7)',glow:false},3:{surf:'#ffb040',a:'#b8380a',b:'#2a0600',bub:'#ffd27a',glow:true},45:{surf:'#a8ff5a',a:'#2c7a12',b:'#061500',bub:'#c8ff8a',glow:true}};
for(const t of[2,3,45])TLD[t]=(sx,sy,c,r)=>{const Q=_TLQ[t],top=_tlAt(c,r-1)!==t;
  const k='q|'+t+'|'+(top?1:0);let bd=TL.cache[k];if(!bd){bd=_tlCv(TS,TS);const g=bd.getContext('2d'),gr=g.createLinearGradient(0,0,0,TS);gr.addColorStop(0,top?Q.a:_tlMix(Q.a,Q.b,0.5));gr.addColorStop(1,Q.b);g.fillStyle=gr;g.fillRect(0,0,TS,TS);TL.cache[k]=bd;}
  const wx=c*TS;let y0=0;
  if(top){const wave=x=>7+Math.sin((wx+x)*0.09+frame*0.07)*2+Math.sin((wx+x)*0.21-frame*0.11)*1;
    cx.save();cx.beginPath();cx.moveTo(sx,sy+TS);for(let x=0;x<=TS;x+=4)cx.lineTo(sx+x,sy+wave(x));cx.lineTo(sx+TS,sy+TS);cx.closePath();cx.clip();cx.drawImage(bd,sx,sy);cx.restore();
    if(t===3){cx.globalAlpha=0.35+Math.sin(frame*0.05+c)*0.15;cx.drawImage(_tlGlow('#ff7a20',16),sx,sy-10,TS,TS);cx.globalAlpha=1;}
    cx.strokeStyle=_tlMix(Q.surf,Q.surf,0,0.35);cx.lineWidth=4;cx.beginPath();for(let x=0;x<=TS;x+=4){const y=sy+wave(x);x?cx.lineTo(sx+x,y):cx.moveTo(sx,y);}cx.stroke();
    cx.strokeStyle=Q.surf;cx.lineWidth=1.4;cx.stroke();
    y0=8;}else cx.drawImage(bd,sx,sy);
  // lava veins / bubbles
  const h=_tlHash(c,r);
  if(t===3){cx.strokeStyle='rgba(255,170,60,0.35)';cx.lineWidth=1.2;cx.beginPath();const yy=sy+18+Math.sin(frame*0.03+h)*4;cx.moveTo(sx,yy);cx.quadraticCurveTo(sx+TS/2,yy+Math.sin(frame*0.05+c)*5,sx+TS,yy+2);cx.stroke();}
  for(let i=0;i<2;i++){const sp=0.35+((h>>(i*4))&7)*0.06,yy=TS-((frame*sp+(h>>(i*3))%TS)%(TS-y0));if(yy<y0+1)continue;const x=sx+6+((h>>(i*5))%20);
    if(Q.glow){cx.drawImage(_tlGlow(Q.surf,3),x-3,sy+yy-3);}else{cx.strokeStyle=Q.bub;cx.lineWidth=1;cx.beginPath();cx.arc(x,sy+yy,1.4,0,7);cx.stroke();}}
};
// crumble: amber glass that cracks open, dips, shakes, leaks light — then shatters
function _tlCracks(c,r){const k='k|'+c+','+r;if(TL.cache[k])return TL.cache[k];let s=_tlHash(c,r);const rn=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  const segs=[];let x=10+rn()*12,y=0;const main=[[x,y]];for(let i=0;i<5;i++){x+=(rn()-0.5)*12;y+=TS/5;main.push([_tlc(x,3,TS-3),y]);}
  const add=pts=>{for(let i=1;i<pts.length;i++)segs.push([pts[i-1],pts[i]]);};add(main);
  for(let b=0;b<3;b++){const from=main[1+Math.floor(rn()*3)],dir=rn()<0.5?-1:1;let bx=from[0],by=from[1];const br=[[bx,by]];for(let i=0;i<3;i++){bx+=dir*(4+rn()*6);by+=(rn()-0.3)*7;br.push([_tlc(bx,1,TS-1),_tlc(by,1,TS-1)]);}add(br);}
  let L=0;for(const sg of segs){sg.len=Math.hypot(sg[1][0]-sg[0][0],sg[1][1]-sg[0][1]);L+=sg.len;}segs.total=L;return TL.cache[k]=segs;}
TLD[42]=(sx,sy,c,r)=>{const gk=c+','+r,gt=TL.grow[gk]!=null&&frame>=TL.grow[gk]?frame-TL.grow[gk]:99;
  if(gt<22){const k=gt/22,e=1-Math.pow(1-k,3)*(1-k*0.0),s=0.5+0.5*e+Math.sin(k*Math.PI)*0.08;cx.save();cx.translate(sx+TS/2,sy+TS/2);cx.scale(s,s);cx.globalAlpha=Math.min(1,k*1.6);TL.grow[gk]=null;_TLD42(-TS/2,-TS/2,c,r);TL.grow[gk]=frame-gt;cx.restore();
    if(k<0.5){cx.strokeStyle=`rgba(255,230,190,${1-k*2})`;cx.lineWidth=2;cx.beginPath();cx.roundRect(sx+1.5,sy+1.5,TS-3,TS-3,5);cx.stroke();}return;}
  if(gt<99)delete TL.grow[gk];_TLD42(sx,sy,c,r);};
function _TLD42(sx,sy,c,r){const P=_TLP.crumble,ct=crumbleBlocks[c+','+r],on=ct!==undefined,p=on?1-ct/45:0;
  let dx=0,dy=0;if(on){if(p<0.15)dy=Math.sin(p/0.15*Math.PI)*2.5;if(p>0.25){const a=(p-0.25)*3.4;dx=(Math.random()-0.5)*a;dy+=(Math.random()-0.5)*a*0.6;}}
  sx+=dx;sy+=dy;
  cx.drawImage(_tlBody(P,0),sx,sy);
  if(on){cx.fillStyle=`rgba(255,150,60,${p*0.28})`;cx.fillRect(sx,sy,TS,TS);}
  cx.drawImage(_tlEdge(P,15),sx-12,sy-12);
  if(on&&p<0.12){cx.strokeStyle=`rgba(255,240,220,${1-p/0.12})`;cx.lineWidth=2;cx.beginPath();cx.roundRect(sx+1.5,sy+1.5,TS-3,TS-3,5);cx.stroke();}
  // crack network grows from a hairline to the whole block
  const S=_tlCracks(c,r),show=(on?0.3+0.7*Math.min(1,p*1.35):0.28+Math.sin(frame*0.05+c)*0.04)*S.total;let acc=0;
  cx.lineCap='round';
  const pass=(w,col)=>{acc=0;cx.strokeStyle=col;cx.lineWidth=w;cx.beginPath();for(const sg of S){if(acc>=show)break;const f=Math.min(1,(show-acc)/sg.len);cx.moveTo(sx+sg[0][0],sy+sg[0][1]);cx.lineTo(sx+sg[0][0]+(sg[1][0]-sg[0][0])*f,sy+sg[0][1]+(sg[1][1]-sg[0][1])*f);acc+=sg.len;}cx.stroke();};
  if(on){pass(3,`rgba(255,140,40,${0.25+p*0.4})`);pass(1.2,`rgba(255,230,170,${0.6+p*0.4})`);}else pass(1,'rgba(255,170,90,0.4)');
}
// breakable: neon bricks
TLD[25]=(sx,sy,c,r)=>{const P=_TLP.brick,k='br';let b=TL.cache[k];if(!b){b=_tlCv(TS,TS);const g=b.getContext('2d');g.fillStyle='#0a0603';g.fillRect(0,0,TS,TS);
    const brick=(x,y,w,h)=>{const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#3a2412');gr.addColorStop(1,'#1c1006');g.fillStyle=gr;g.fillRect(x+1,y+1,w-2,h-2);g.strokeStyle='rgba(224,160,96,0.5)';g.lineWidth=1;g.strokeRect(x+1.5,y+1.5,w-3,h-3);g.fillStyle='rgba(255,220,170,0.35)';g.fillRect(x+2,y+2,w-4,1);};
    brick(0,0,16,11);brick(16,0,16,11);brick(-8,11,16,10);brick(8,11,16,10);brick(24,11,16,10);brick(0,21,16,11);brick(16,21,16,11);TL.cache[k]=b;}
  cx.drawImage(b,sx,sy);cx.drawImage(_tlEdge(P,15),sx-12,sy-12);};
// bounce pad: spring + pad that squashes and rebounds when used
TLD[5]=(sx,sy,c,r)=>{const P=_TLP.bounce,bt=TL.bounce[c+','+r],t=bt==null||frame<bt?99:frame-bt;
  const off=t<40?6*Math.exp(-t/7)*Math.cos(t*0.55):Math.sin(frame*0.06+c)*0.5;   // + = pressed down
  cx.save();cx.fillStyle='#062010';cx.beginPath();cx.roundRect(sx+2,sy+23,TS-4,9,[3,3,0,0]);cx.fill();cx.shadowBlur=10;cx.shadowColor='#63c916';cx.strokeStyle='#8eff4a';cx.lineWidth=1.5;cx.stroke();cx.restore();cx.fillStyle='rgba(200,255,150,0.8)';cx.fillRect(sx+6,sy+24,TS-12,1);
  // coil
  const top=sy+9+off,bot=sy+23;cx.strokeStyle='#4f9f14';cx.lineWidth=2;cx.beginPath();cx.moveTo(sx+9,bot);for(let i=1;i<=6;i++){cx.lineTo(i%2?sx+23:sx+9,bot-(bot-top)*i/6);}cx.stroke();
  // pad
  cx.save();cx.shadowBlur=10;cx.shadowColor='#63c916';const pw=TS-4+(off>0?off*0.6:off*0.3);cx.fillStyle='#163a0a';cx.fillRect(sx+TS/2-pw/2,top-4,pw,5);cx.strokeStyle='#a8ff5a';cx.lineWidth=1.4;cx.strokeRect(sx+TS/2-pw/2+0.5,top-3.5,pw-1,4);cx.restore();
  cx.fillStyle='rgba(255,255,255,0.7)';cx.fillRect(sx+TS/2-pw/2+2,top-3,pw-4,1);
  // rising chevrons (idle) / ring burst (after a bounce)
  cx.strokeStyle='#8eff4a';cx.lineWidth=1.6;cx.lineCap='round';
  for(let i=0;i<2;i++){const ph=((frame*0.035)+i*0.5)%1,y=top-6-ph*12;cx.globalAlpha=(1-ph)*0.8;cx.beginPath();cx.moveTo(sx+TS/2-5,y+3);cx.lineTo(sx+TS/2,y);cx.lineTo(sx+TS/2+5,y+3);cx.stroke();}cx.globalAlpha=1;
  if(t<18){const k=t/18;cx.strokeStyle=`rgba(168,255,90,${1-k})`;cx.lineWidth=2*(1-k)+0.5;cx.beginPath();cx.ellipse(sx+TS/2,top-4,8+k*20,3+k*5,0,0,7);cx.stroke();}
};
// spikes: three neon blades that extend/retract
TLD[4]=(sx,sy,c,r)=>{const ext=typeof getSpikeExt==='function'?getSpikeExt():1;
  cx.fillStyle='#120304';cx.fillRect(sx,sy+TS-6,TS,6);cx.fillStyle='#ff3344';cx.fillRect(sx,sy+TS-6,TS,1.5);cx.drawImage(_tlGlow('#ff2233',8),sx+TS/2-16,sy+TS-14,32,16);
  const sh=(TS-9)*ext;if(sh<0.5)return;
  for(let i=0;i<3;i++){const bx=sx+1+i*10,tip=sy+TS-6-sh;const g=cx.createLinearGradient(0,sy+TS-6,0,tip);g.addColorStop(0,'#4a0008');g.addColorStop(0.6,'#d6303c');g.addColorStop(1,'#ffd0d4');
    cx.fillStyle=g;cx.beginPath();cx.moveTo(bx,sy+TS-6);cx.lineTo(bx+5,tip);cx.lineTo(bx+10,sy+TS-6);cx.closePath();cx.fill();
    cx.strokeStyle='rgba(255,180,190,0.6)';cx.lineWidth=0.8;cx.beginPath();cx.moveTo(bx+5,tip);cx.lineTo(bx+2.5,sy+TS-6-sh*0.5);cx.stroke();
    if(ext>0.95){const tw=Math.sin(frame*0.12+i*2+c);if(tw>0.3){cx.globalAlpha=(tw-0.3)*1.4;cx.drawImage(_tlGlow('#ffffff',4),bx+1,tip-4);cx.globalAlpha=1;}}}
};
// conveyors: one continuous belt with rollers at the ends and flowing chevrons
for(const t of[9,10])TLD[t]=(sx,sy,c,r)=>{const dir=t===9?1:-1,Lc=_tlAt(c-1,r)===t,Rc=_tlAt(c+1,r)===t,y0=sy+4,h=TS-8;
  cx.save();cx.fillStyle='#1a0d00';cx.beginPath();const l=sx+(Lc?0:2),rr=sx+TS-(Rc?0:2),rad=h/2;
  cx.moveTo(Lc?l:l+rad,y0);cx.lineTo(Rc?rr:rr-rad,y0);if(Rc)cx.lineTo(rr,y0+h);else cx.arc(rr-rad,y0+rad,rad,-Math.PI/2,Math.PI/2);cx.lineTo(Lc?l:l+rad,y0+h);if(!Lc)cx.arc(l+rad,y0+rad,rad,Math.PI/2,Math.PI*1.5);cx.closePath();cx.fill();
  cx.shadowBlur=8;cx.shadowColor='#FF8800';cx.strokeStyle='#FFAA44';cx.lineWidth=1.5;cx.beginPath();
  cx.moveTo(Lc?sx:l+rad,y0+0.75);cx.lineTo(Rc?sx+TS:rr-rad,y0+0.75);if(!Rc)cx.arc(rr-rad,y0+rad,rad-0.75,-Math.PI/2,Math.PI/2);else cx.moveTo(sx+TS,y0+h-0.75);cx.lineTo(Lc?sx:l+rad,y0+h-0.75);if(!Lc)cx.arc(l+rad,y0+rad,rad-0.75,Math.PI/2,Math.PI*1.5);cx.stroke();cx.shadowBlur=0;
  cx.beginPath();cx.moveTo(Lc?l:l+rad,y0);cx.lineTo(Rc?rr:rr-rad,y0);if(Rc)cx.lineTo(rr,y0+h);else cx.arc(rr-rad,y0+rad,rad,-Math.PI/2,Math.PI/2);cx.lineTo(Lc?l:l+rad,y0+h);if(!Lc)cx.arc(l+rad,y0+rad,rad,Math.PI/2,Math.PI*1.5);cx.closePath();cx.clip();
  const off=((frame*1.2*dir)%8+8)%8;cx.fillStyle='rgba(255,170,68,0.55)';for(let x=-8;x<TS+8;x+=8){cx.fillRect(sx+x+off,y0+1,4,1.5);cx.fillRect(sx+x-off+8,y0+h-2.5,4,1.5);}
  const co=((frame*0.9*dir)%16+16)%16;cx.strokeStyle='#FFCC66';cx.lineWidth=2;cx.lineCap='round';for(let x=-16;x<TS+16;x+=16){const ax=sx+x+co;cx.globalAlpha=0.75;cx.beginPath();cx.moveTo(ax-dir*3,y0+h/2-5);cx.lineTo(ax+dir*3,y0+h/2);cx.lineTo(ax-dir*3,y0+h/2+5);cx.stroke();}cx.globalAlpha=1;cx.restore();
  const roller=x=>{cx.save();cx.translate(x,y0+h/2);cx.rotate(frame*0.12*dir);cx.strokeStyle='#FFCC66';cx.lineWidth=1.2;cx.beginPath();cx.arc(0,0,5,0,7);cx.stroke();cx.beginPath();cx.moveTo(-5,0);cx.lineTo(5,0);cx.moveTo(0,-5);cx.lineTo(0,5);cx.stroke();cx.restore();};
  if(!Lc)roller(l+rad);if(!Rc)roller(rr-rad);};
// slopes: theme body with a neon tube along the slope
for(const t of[40,41])TLD[t]=(sx,sy,c,r)=>{const P=_tlPal(),up=t===40;
  cx.save();cx.beginPath();if(up){cx.moveTo(sx,sy+TS);cx.lineTo(sx+TS,sy);cx.lineTo(sx+TS,sy+TS);}else{cx.moveTo(sx,sy);cx.lineTo(sx+TS,sy+TS);cx.lineTo(sx,sy+TS);}cx.closePath();cx.clip();cx.drawImage(_tlBody(P,0),sx,sy);cx.restore();
  const a=up?[sx+1,sy+TS-1,sx+TS-1,sy+1]:[sx+1,sy+1,sx+TS-1,sy+TS-1];
  cx.save();cx.lineCap='round';cx.shadowBlur=12;cx.shadowColor=P.glow;cx.strokeStyle=P.stroke;cx.lineWidth=3;cx.beginPath();cx.moveTo(a[0],a[1]);cx.lineTo(a[2],a[3]);cx.stroke();cx.shadowBlur=0;cx.strokeStyle='rgba(255,255,255,0.85)';cx.lineWidth=1.1;cx.stroke();cx.restore();
  const sol=x=>x===1||x===40||x===41;
  if(!sol(_tlAt(c,r+1))&&_tlAt(c,r+1)!==-1){cx.strokeStyle=P.stroke;cx.lineWidth=1.5;cx.beginPath();cx.moveTo(sx,sy+TS-1);cx.lineTo(sx+TS,sy+TS-1);cx.stroke();}
};
// exit portal: a spinning vortex that pulls sparks in
TLD[7]=(sx,sy,c,r)=>{const x=sx+TS/2,y=sy+TS/2,p=0.5+0.5*Math.sin(frame*0.09);
  cx.save();cx.globalCompositeOperation='lighter';cx.drawImage(_tlGlow('#ff44ff',26),x-26,y-26);
  for(let i=0;i<3;i++){const rr=13-i*3.5,a=frame*(0.05+i*0.03)*(i%2?-1:1);cx.strokeStyle=i===1?'rgba(120,230,255,0.85)':'rgba(255,120,255,0.9)';cx.lineWidth=2-i*0.4;cx.beginPath();cx.arc(x,y,rr,a,a+Math.PI*1.3);cx.stroke();cx.beginPath();cx.arc(x,y,rr,a+Math.PI,a+Math.PI*1.6);cx.stroke();}
  for(let i=0;i<6;i++){const k=((frame*0.02+i/6)%1),a=i*1.05+frame*0.04,rr=18*(1-k);cx.globalAlpha=k;cx.drawImage(_tlGlow('#ffd0ff',2),x+Math.cos(a)*rr-2,y+Math.sin(a)*rr-2);}
  cx.globalAlpha=1;cx.drawImage(_tlGlow('#ffffff',5+p*3),x-5-p*3,y-5-p*3);cx.restore();
  cx.fillStyle='#FF88FF';cx.font='bold 6px monospace';cx.textAlign='center';cx.textBaseline='top';cx.fillText('EXIT',x,sy-7);};

function tileDraw(t,sx,sy,c,r){const f=TLD[t];if(!f)return false;f(sx,sy,c,r);return true;}

// moving platforms: neon capsule with thrusters and running lights
function drawMovPlatNew(mp){const sx=mp.x-camX,sy=mp.y-camY,w=mp.w,h=mp.h,dir=Math.sign((mp.x-(mp._px??mp.x))||(mp.vx||1));
  cx.save();cx.drawImage(_tlGlow('#ff44aa',14),sx+w*0.2-14,sy+h-4,28,16);cx.drawImage(_tlGlow('#ff44aa',14),sx+w*0.8-14,sy+h-4,28,16);
  const fl=0.6+Math.random()*0.4;cx.fillStyle=`rgba(255,140,200,${0.5*fl})`;for(const fx of[0.2,0.8]){cx.beginPath();cx.moveTo(sx+w*fx-3,sy+h);cx.lineTo(sx+w*fx+3,sy+h);cx.lineTo(sx+w*fx,sy+h+5+fl*3);cx.fill();}
  const gr=cx.createLinearGradient(0,sy,0,sy+h);gr.addColorStop(0,'#4a0a40');gr.addColorStop(1,'#1a0018');cx.fillStyle=gr;cx.beginPath();cx.moveTo(sx+h/2,sy);cx.lineTo(sx+w-h/2,sy);cx.arc(sx+w-h/2,sy+h/2,h/2,-Math.PI/2,Math.PI/2);cx.lineTo(sx+h/2,sy+h);cx.arc(sx+h/2,sy+h/2,h/2,Math.PI/2,Math.PI*1.5);cx.closePath();cx.fill();
  cx.shadowBlur=12;cx.shadowColor='#FF44AA';cx.strokeStyle='#FF66BB';cx.lineWidth=1.6;cx.stroke();cx.shadowBlur=0;
  cx.strokeStyle='rgba(255,255,255,0.85)';cx.lineWidth=1;cx.beginPath();cx.moveTo(sx+h/2,sy+1);cx.lineTo(sx+w-h/2,sy+1);cx.stroke();
  const n=Math.max(2,Math.floor(w/12));for(let i=0;i<n;i++){const k=((i/n-frame*0.02*(dir||1))%1+1)%1;cx.fillStyle=`rgba(255,120,200,${0.25+0.75*Math.pow(Math.sin(k*Math.PI),6)})`;cx.fillRect(sx+h/2+i*((w-h)/n)+2,sy+h/2-1,4,2);}
  cx.restore();}

// ── effects: shards, chips and dust ──
function tileFx(kind,c,r){const x=c*TS,y=r*TS;
  if(kind==='bounce'){TL.bounce[c+','+r]=frame;return;}
  if(kind==='crumble')TL.respawn.push({c,r,at:frame+CRUMBLE_RESPAWN});
  const P=kind==='crumble'?_TLP.crumble:_TLP.brick,n=kind==='crumble'?9:7;
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*2.5;
    TL.fx.push({k:'shard',x:x+6+Math.random()*20,y:y+6+Math.random()*20,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1.5,rot:Math.random()*6,vr:(Math.random()-0.5)*0.3,s:4+Math.random()*6,life:40+Math.random()*15,col:P.stroke,body:kind==='crumble'?'rgba(255,140,50,0.45)':'#3a2412',brick:kind!=='crumble'});}
  TL.fx.push({k:'ring',x:x+TS/2,y:y+TS/2,life:14,max:14,col:P.stroke});TL.fx.push({k:'flash',x:x+TS/2,y:y+TS/2,life:8,max:8,col:P.stroke});
  for(let i=0;i<6;i++)TL.fx.push({k:'dust',x:x+Math.random()*TS,y:y+TS-4,vx:(Math.random()-0.5)*1.2,vy:-Math.random()*0.6,r:3+Math.random()*3,life:26,max:26});
}
function tilesTick(){
  // crumbled blocks come back (waits while the player or an enemy is in the way)
  for(let i=TL.respawn.length-1;i>=0;i--){const q=TL.respawn[i];if(q.at-frame>CRUMBLE_RESPAWN+60){TL.respawn.splice(i,1);continue;}if(frame<q.at)continue;
    if(grid[q.r]&&grid[q.r][q.c]){TL.respawn.splice(i,1);continue;}
    const x=q.c*TS,y=q.r*TS,hit=o=>o.x<x+TS&&o.x+o.w>x&&o.y<y+TS&&o.y+o.h>y;
    if(hit(player)||enemies.some(hit)){q.at=frame+20;continue;}
    grid[q.r][q.c]=42;TL.grow[q.c+','+q.r]=frame;TL.respawn.splice(i,1);
    for(let k=0;k<6;k++)TL.fx.push({k:'chip',x:x+Math.random()*TS,y:y+Math.random()*TS,vx:(Math.random()-.5)*0.4,vy:-0.6,life:18});}
  // falling chips from blocks that are crumbling
  for(const key in crumbleBlocks){if(Math.random()<0.25){const[c,r]=key.split(',').map(Number);TL.fx.push({k:'chip',x:c*TS+4+Math.random()*24,y:r*TS+TS-2,vx:(Math.random()-0.5)*0.6,vy:0.5,life:30});}}
  for(const f of TL.fx){f.life--;if(f.k==='shard'||f.k==='chip'){f.vy+=0.25;f.x+=f.vx;f.y+=f.vy;if(f.rot!=null)f.rot+=f.vr;}else if(f.k==='dust'){f.x+=f.vx;f.y+=f.vy;f.r+=0.08;}}
  TL.fx=TL.fx.filter(f=>f.life>0);if(TL.fx.length>400)TL.fx.splice(0,TL.fx.length-400);
}
function tilesDrawFx(){
  for(const q of TL.respawn){const left=q.at-frame;if(left>70)continue;const a=(1-left/70)*(0.35+0.25*Math.sin(frame*0.4));
    cx.save();cx.setLineDash([4,4]);cx.lineDashOffset=-frame*0.5;cx.strokeStyle=`rgba(255,154,60,${a})`;cx.lineWidth=1.5;cx.beginPath();cx.roundRect(q.c*TS-camX+2,q.r*TS-camY+2,TS-4,TS-4,5);cx.stroke();cx.restore();}
  for(const f of TL.fx){const x=f.x-camX,y=f.y-camY;
    if(f.k==='shard'){cx.save();cx.translate(x,y);cx.rotate(f.rot);cx.globalAlpha=Math.min(1,f.life/15);cx.fillStyle=f.body;cx.strokeStyle=f.col;cx.lineWidth=1;cx.beginPath();
      if(f.brick){cx.rect(-f.s/2,-f.s/3,f.s,f.s*0.66);}else{cx.moveTo(0,-f.s/2);cx.lineTo(f.s/2,f.s/2);cx.lineTo(-f.s/2,f.s/3);cx.closePath();}cx.fill();cx.stroke();cx.restore();}
    else if(f.k==='chip'){cx.globalAlpha=Math.min(1,f.life/10);cx.fillStyle='#FF9A3C';cx.fillRect(x,y,2,2);cx.globalAlpha=1;}
    else if(f.k==='ring'){const k=1-f.life/f.max;cx.globalAlpha=(1-k)*0.6;cx.strokeStyle=f.col;cx.lineWidth=2*(1-k)+0.5;cx.beginPath();cx.arc(x,y,8+k*18,0,7);cx.stroke();cx.globalAlpha=1;}
    else if(f.k==='flash'){cx.globalAlpha=f.life/f.max;cx.globalCompositeOperation='lighter';cx.drawImage(_tlGlow(f.col,26),x-26,y-26);cx.globalCompositeOperation='source-over';cx.globalAlpha=1;}
    else if(f.k==='flash'){cx.globalAlpha=f.life/f.max;cx.globalCompositeOperation='lighter';cx.drawImage(_tlGlow(f.col,26),x-26,y-26);cx.globalCompositeOperation='source-over';cx.globalAlpha=1;}
    else if(f.k==='dust'){cx.globalAlpha=(f.life/f.max)*0.45;cx.fillStyle='#c8b8a8';cx.beginPath();cx.arc(x,y,f.r,0,7);cx.fill();cx.globalAlpha=1;}}
}
function clearTileFx(){TL.fx.length=0;TL.bounce={};TL.respawn.length=0;TL.grow={};}
