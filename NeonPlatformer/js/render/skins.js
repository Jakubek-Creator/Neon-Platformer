// Neon Platformer — Blob customisation (V5.9)
// Colour, eyes, hat and trail. Every item has an id, a name and `free:true` for now;
// the shop will later add items with a price — owned items are kept in SKIN_OWNED.
const SKIN_ITEMS={
  colour:[
    {id:'mint',  name:'MINT',  free:true,col:'#00FF99',col2:'#00AA55',glo:'#00FF88'},
    {id:'cyan',  name:'CYAN',  free:true,col:'#22E6FF',col2:'#0088B0',glo:'#00D8FF'},
    {id:'pink',  name:'PINK',  free:true,col:'#FF6AD5',col2:'#B0207A',glo:'#FF44CC'},
    {id:'gold',  name:'GOLD',  free:true,col:'#FFD84A',col2:'#B07800',glo:'#FFC400'},
    {id:'violet',name:'VIOLET',free:true,col:'#B58CFF',col2:'#5A2DB0',glo:'#9A66FF'},
    {id:'ember', name:'EMBER', free:true,col:'#FF7A45',col2:'#B02A00',glo:'#FF5522'},
    {id:'frost', name:'FROST', free:true,col:'#E6F4FF',col2:'#7A9AC0',glo:'#BFE4FF'}],
  eyes:[{id:'classic',name:'CLASSIC',free:true},{id:'happy',name:'HAPPY',free:true},{id:'sleepy',name:'SLEEPY',free:true},{id:'angry',name:'ANGRY',free:true}],
  hat:[{id:'none',name:'NONE',free:true},{id:'antenna',name:'ANTENNA',free:true},{id:'phones',name:'HEADPHONES',free:true},{id:'cowboy',name:'COWBOY',free:true},{id:'band',name:'HEADBAND',free:true}],
  trail:[{id:'none',name:'NONE',free:true},{id:'sparkle',name:'SPARKLES',free:true},{id:'flames',name:'FLAMES',free:true},{id:'bubbles',name:'BUBBLES',free:true}]
};
const SKIN_SHOP_SOON={colour:2,eyes:2,hat:3,trail:2};     // locked "???" slots shown as a teaser
var SKIN={colour:'mint',eyes:'classic',hat:'none',trail:'none'};
var SKIN_OWNED=[];
(function(){try{const s=JSON.parse(localStorage.getItem('ns_skin')||'null');if(s)for(const k in SKIN)if(s[k]&&SKIN_ITEMS[k].some(i=>i.id===s[k]))SKIN[k]=s[k];
  SKIN_OWNED=JSON.parse(localStorage.getItem('ns_skinOwned')||'[]');}catch(e){}})();
function skinSave(){try{localStorage.setItem('ns_skin',JSON.stringify(SKIN));}catch(e){}}
function skinItem(k){return SKIN_ITEMS[k].find(i=>i.id===SKIN[k])||SKIN_ITEMS[k][0];}
function skinOwned(k,it){return it.free||SKIN_OWNED.includes(k+':'+it.id);}
function skinSet(k,id){const it=SKIN_ITEMS[k].find(i=>i.id===id);if(!it||!skinOwned(k,it))return;SKIN[k]=id;skinSave();}
function skinCols(){return skinItem('colour');}

// ── eyes (local blob space; x,ey = eye centre, ry = eye height incl. blink) ──
function skinDrawEye(g,x,ey,ry,sx,look,glo,side,col){
  const e=SKIN.eyes;
  if(e==='happy'){g.strokeStyle='rgba(0,30,15,0.85)';g.lineWidth=1.6;g.lineCap='round';g.beginPath();g.arc(x,ey+1.2,2.6*sx,Math.PI*1.1,Math.PI*1.9);g.stroke();return;}
  g.fillStyle='rgba(0,30,15,0.78)';g.beginPath();g.ellipse(x,ey,3.2*sx,ry,0,0,7);g.fill();
  if(ry>1.2){g.shadowBlur=6;g.shadowColor=glo;g.fillStyle='#eeffee';g.beginPath();g.ellipse(x+look.x*.9,ey-ry*.12+look.y*.8,1.6,Math.min(2,ry*.45),0,0,7);g.fill();g.shadowBlur=0;}
  if(e==='sleepy'){g.fillStyle=col;g.beginPath();g.ellipse(x,ey-ry*0.55,3.6*sx,ry*0.75,0,0,7);g.fill();g.strokeStyle='rgba(0,30,15,0.7)';g.lineWidth=1;g.beginPath();g.moveTo(x-3*sx,ey-ry*0.05);g.lineTo(x+3*sx,ey-ry*0.05);g.stroke();}
  if(e==='angry'){const inX=x-side*3.6*sx,outX=x+side*3.6*sx,inY=ey+ry*0.15,outY=ey-ry*1.05;   // lid slopes down toward the middle
    g.fillStyle=col;g.beginPath();g.moveTo(outX,outY-3);g.lineTo(outX,outY);g.lineTo(inX,inY);g.lineTo(inX,ey-ry-3);g.closePath();g.fill();
    g.strokeStyle='rgba(0,30,15,0.95)';g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(outX+side*0.4,outY-0.6);g.lineTo(inX-side*0.2,inY-0.9);g.stroke();}
}
// ── hats (local blob space; top = top of the body) ──
function skinDrawHat(g,sx,sy,cy,r,t,c,face,vx){
  const h=SKIN.hat;if(h==='none')return;const top=cy-r*sy;g.save();
  if(h==='antenna'){const sway=Math.sin(t*0.09)*1.5-vx*0.6,bx=sway*1.6,by=top-10;g.strokeStyle=c.col2;g.lineWidth=1.4;g.lineCap='round';
    g.beginPath();g.moveTo(0,top+1);g.quadraticCurveTo(sway*0.4,top-5,bx,by);g.stroke();g.shadowBlur=10;g.shadowColor=c.glo;g.fillStyle='#ffffff';g.beginPath();g.arc(bx,by,2.4,0,7);g.fill();
    g.fillStyle=c.col;g.globalAlpha=0.6+0.4*Math.sin(t*0.15);g.beginPath();g.arc(bx,by,3.4,0,7);g.fill();}
  else if(h==='phones'){const w=r*sx*1.02,y=top+5*sy;g.strokeStyle='#2a2a3a';g.lineWidth=2.2;g.beginPath();g.ellipse(0,y,w,7.5*sy,0,Math.PI*1.08,Math.PI*1.92);g.stroke();
    g.strokeStyle=c.col2;g.lineWidth=1;g.stroke();
    const beat=1+Math.max(0,Math.sin(t*0.35))*0.12;for(const s2 of[-1,1]){const px=s2*w*0.98,py=y+1.5;g.fillStyle='#1c1c28';g.beginPath();g.ellipse(px,py,2.6*beat,4*beat,0,0,7);g.fill();
      g.shadowBlur=8;g.shadowColor='#FF3CC8';g.fillStyle='#FF5AD8';g.beginPath();g.ellipse(px+s2*1.1,py,1.1,2.4*beat,0,0,7);g.fill();g.shadowBlur=0;}}
  else if(h==='cowboy'){const y=top+1.5,bw=r*sx*1.55,tilt=-face*0.08+Math.sin(t*0.05)*0.03;g.translate(0,y);g.rotate(tilt);
    const leather=g.createLinearGradient(0,-9,0,2);leather.addColorStop(0,'#C88A4A');leather.addColorStop(1,'#7A4A1E');
    // crown of the hat
    g.fillStyle=leather;g.beginPath();g.moveTo(-5.5,-0.5);g.bezierCurveTo(-6.5,-6,-4.5,-9.5,-1.5,-8);g.quadraticCurveTo(0,-6.5,1.5,-8);g.bezierCurveTo(4.5,-9.5,6.5,-6,5.5,-0.5);g.closePath();g.fill();
    g.fillStyle='#3A2210';g.fillRect(-5.6,-2.6,11.2,1.8);g.fillStyle='#FFD84A';g.fillRect(-1,-2.6,2,1.8);
    // brim curling up at both ends
    g.fillStyle='#A86A30';g.beginPath();g.moveTo(-bw,-3.2);g.quadraticCurveTo(-bw*0.75,0.6,0,0.9);g.quadraticCurveTo(bw*0.75,0.6,bw,-3.2);g.quadraticCurveTo(bw*0.7,-0.8,0,-0.9);g.quadraticCurveTo(-bw*0.7,-0.8,-bw,-3.2);g.closePath();g.fill();
    g.strokeStyle='rgba(255,220,160,0.6)';g.lineWidth=0.6;g.beginPath();g.moveTo(-bw*0.8,-1.6);g.quadraticCurveTo(0,0.2,bw*0.8,-1.6);g.stroke();}
  else if(h==='band'){const y=top+3.2*sy;g.strokeStyle='#FF3C5A';g.lineWidth=2.6;g.shadowBlur=6;g.shadowColor='#FF2244';g.beginPath();g.ellipse(0,y,r*sx*0.98,2.2,0,Math.PI*1.02,Math.PI*1.98);g.stroke();
    const bx=-face*r*sx*0.92;g.lineWidth=1.8;g.lineCap='round';for(let i=0;i<2;i++){const ph=t*0.25+i*1.3,len=8+Math.min(6,Math.abs(vx)*1.5);g.beginPath();g.moveTo(bx,y);
      g.quadraticCurveTo(bx-face*len*0.5,y+2+Math.sin(ph)*2.5+i*1.5,bx-face*len,y+1+Math.sin(ph+1)*3+i*2.5);g.stroke();}}
  g.restore();
}
// ── trails (world space) ──
const SKTR={pts:[],sp:[]};
function skinTick(){
  const p=player,tr=SKIN.trail,c=skinCols(),x=p.x+p.w/2,y=p.y+p.h*0.55,mv=Math.hypot(p.vx,p.vy);
  SKTR.pts.length=0;
  if(tr==='flames'&&mv>1.2)for(let i=0;i<2;i++)SKTR.sp.push({k:'f',x:x-p.vx*0.8+(Math.random()-.5)*8,y:p.y+p.h-3+(Math.random()-.5)*4,vx:-p.vx*0.05+(Math.random()-.5)*0.3,vy:-0.7-Math.random()*0.8,life:22,max:22,s:4.5+Math.random()*3});
  if(tr==='bubbles'&&mv>1.2&&frame%4===0)SKTR.sp.push({k:'b',x:x+(Math.random()-.5)*10,y:y+(Math.random()-.5)*8,vx:-p.vx*0.08,vy:-0.35-Math.random()*0.3,life:46,max:46,s:2+Math.random()*3,ph:Math.random()*6});
  if(tr==='sparkle'&&mv>1.2&&frame%2===0)SKTR.sp.push({x:x+(Math.random()-.5)*12,y:y+(Math.random()-.5)*10,vx:-p.vx*0.1,vy:-0.3-Math.random()*0.4,life:26,max:26,s:1+Math.random()*1.5,col:Math.random()<0.5?c.col:'#ffffff'});
  for(const s of SKTR.sp){s.x+=s.vx+(s.k==='b'?Math.sin(frame*0.12+s.ph)*0.25:0);s.y+=s.vy;s.life--;}SKTR.sp=SKTR.sp.filter(s=>s.life>0);
}
function skinDrawTrail(){
  const c=skinCols();
  if(SKTR.pts.length>2){const P=SKTR.pts;let still=Math.hypot(P[0].x-P[P.length-1].x,P[0].y-P[P.length-1].y)<4;if(!still){cx.save();cx.lineCap='round';cx.lineJoin='round';cx.globalCompositeOperation='lighter';
    for(let i=1;i<P.length;i++){const k=1-i/P.length;cx.strokeStyle=c.col;cx.globalAlpha=k*0.55;cx.lineWidth=k*9;cx.beginPath();cx.moveTo(P[i-1].x-camX,P[i-1].y-camY);cx.lineTo(P[i].x-camX,P[i].y-camY);cx.stroke();}
    cx.restore();}}
  for(const s of SKTR.sp){const k=s.life/s.max,x=s.x-camX,y=s.y-camY;
    if(s.k==='f'){const z=s.s*(0.35+k*0.65);cx.save();cx.globalCompositeOperation='lighter';cx.globalAlpha=Math.min(1,k*1.3);const gr=cx.createRadialGradient(x,y,0,x,y,z*1.6);gr.addColorStop(0,'#ffffff');gr.addColorStop(0.35,c.col);gr.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=gr;cx.beginPath();cx.moveTo(x,y-z*2.2);cx.quadraticCurveTo(x+z*1.3,y-z*0.2,x,y+z);cx.quadraticCurveTo(x-z*1.3,y-z*0.2,x,y-z*2.2);cx.fill();cx.restore();continue;}
    if(s.k==='b'){const z=s.s*(0.8+(1-k)*0.4);cx.save();cx.globalAlpha=Math.min(1,k*2)*0.85;cx.strokeStyle=c.col;cx.lineWidth=1;cx.shadowBlur=6;cx.shadowColor=c.glo;cx.beginPath();cx.arc(x,y,z,0,7);cx.stroke();
      cx.shadowBlur=0;cx.fillStyle='rgba(255,255,255,0.8)';cx.beginPath();cx.arc(x-z*0.35,y-z*0.35,z*0.25,0,7);cx.fill();if(s.life===1)0;cx.restore();continue;}
    const z=s.s*(0.5+k);cx.save();cx.globalAlpha=k;cx.fillStyle=s.col;cx.shadowBlur=6;cx.shadowColor=c.glo;
    cx.beginPath();cx.moveTo(x,y-z*2);cx.lineTo(x+z*0.5,y-z*0.5);cx.lineTo(x+z*2,y);cx.lineTo(x+z*0.5,y+z*0.5);cx.lineTo(x,y+z*2);cx.lineTo(x-z*0.5,y+z*0.5);cx.lineTo(x-z*2,y);cx.lineTo(x-z*0.5,y-z*0.5);cx.closePath();cx.fill();cx.restore();}
}
function skinReset(){SKTR.pts.length=0;SKTR.sp.length=0;}

// ── customise screen ──
var _skRaf=0;
function doSkin(){skinBuildUI();goMS('skin');cancelAnimationFrame(_skRaf);const loop=()=>{if(mScrn!=='skin')return;_skRaf=requestAnimationFrame(loop);skinPreviewDraw();};loop();}
function skinBuildUI(){
  const box=document.getElementById('sk-rows');if(!box)return;box.innerHTML='';
  const label={colour:'COLOUR',eyes:'EYES',hat:'HAT',trail:'TRAIL'};
  for(const k of['colour','eyes','hat','trail']){
    const row=document.createElement('div');row.className='skrow';const lb=document.createElement('div');lb.className='sklbl';lb.textContent=label[k];row.appendChild(lb);
    const chips=document.createElement('div');chips.className='skchips';row.appendChild(chips);
    for(const it of SKIN_ITEMS[k]){const b=document.createElement('button');b.className='skc'+(SKIN[k]===it.id?' on':'')+(k==='colour'?' sw':'');
      if(k==='colour'){b.style.setProperty('--c',it.col);b.title=it.name;}else b.textContent=it.name;
      b.onmouseenter=()=>{try{mhov();}catch(e){}};b.onclick=()=>{try{mcl();}catch(e){}skinSet(k,it.id);skinBuildUI();PA.sq=0.6;};chips.appendChild(b);}
    for(let i=0;i<(SKIN_SHOP_SOON[k]||0);i++){const b=document.createElement('button');b.className='skc lock'+(k==='colour'?' sw':'');b.textContent=k==='colour'?'?':'??? SHOP';b.title='Coming to the shop';chips.appendChild(b);}
    box.appendChild(row);}
  const nm=document.getElementById('sk-name');if(nm)nm.textContent=skinCols().name+' · '+skinItem('eyes').name+' · '+skinItem('hat').name+' · '+skinItem('trail').name;
}
function skinPreviewDraw(){
  const cv=document.getElementById('sk-cv');if(!cv)return;const g=cv.getContext('2d'),d=Math.min(2,window.devicePixelRatio||1),W2=cv.clientWidth,H2=cv.clientHeight;
  if(cv.width!==Math.round(W2*d)||cv.height!==Math.round(H2*d)){cv.width=Math.round(W2*d);cv.height=Math.round(H2*d);}
  const t=performance.now()/16.67,c=skinCols(),S=4;g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,W2,H2);
  // platform
  const gy=H2-34;g.save();g.shadowBlur=14;g.shadowColor='#7F77DD';g.strokeStyle='#AFA9EC';g.lineWidth=2;g.beginPath();g.roundRect(W2/2-90,gy,180,14,4);g.stroke();g.restore();
  const gl=g.createRadialGradient(W2/2,gy,4,W2/2,gy,110);gl.addColorStop(0,c.glo+'55');gl.addColorStop(1,c.glo+'00');g.fillStyle=gl;g.fillRect(0,0,W2,H2);
  // little hop every ~2.5 s
  const ph=(t%150)/150,hop=ph<0.3?Math.sin(ph/0.3*Math.PI):0,sq=ph<0.03||(ph>0.3&&ph<0.36)?0.35:0;
  const vxFake=Math.sin(t*0.02)*2;
  // trail preview
  if(SKIN.trail==='flames'){g.save();g.globalCompositeOperation='lighter';for(let i=0;i<14;i++){const k=((t*0.02+i/14)%1),x=W2/2-14-k*110+Math.sin(i*5)*6,y=gy-10-k*30,z=(9-k*7);g.globalAlpha=(1-k)*0.8;
      const gr=g.createRadialGradient(x,y,0,x,y,z*1.6);gr.addColorStop(0,'#fff');gr.addColorStop(0.35,c.col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.moveTo(x,y-z*2.2);g.quadraticCurveTo(x+z*1.3,y-z*0.2,x,y+z);g.quadraticCurveTo(x-z*1.3,y-z*0.2,x,y-z*2.2);g.fill();}g.restore();}
  if(SKIN.trail==='bubbles'){g.save();for(let i=0;i<8;i++){const k=((t*0.008+i/8)%1),x=W2/2-30-k*90+Math.sin(t*0.05+i)*8,y=gy-40-k*70,z=5+(i%3)*3;g.globalAlpha=(1-k)*0.85;g.strokeStyle=c.col;g.lineWidth=2;g.shadowBlur=8;g.shadowColor=c.glo;g.beginPath();g.arc(x,y,z,0,7);g.stroke();g.shadowBlur=0;g.fillStyle='#fff';g.beginPath();g.arc(x-z*0.35,y-z*0.35,z*0.25,0,7);g.fill();}g.restore();}
  if(SKIN.trail==='sparkle'){for(let i=0;i<10;i++){const k=((t*0.012+i/10)%1),x=W2/2-k*120+Math.sin(i*7)*10,y=gy-30-hop*40+Math.sin(i*3.3)*14-k*10,z=2+Math.sin(i)*1;g.globalAlpha=1-k;g.fillStyle=i%2?c.col:'#fff';g.beginPath();g.arc(x,y,z,0,7);g.fill();}g.globalAlpha=1;}
  // the real blob drawing, scaled up
  const save={inv:player.inv,wet:player.wet,vx:player.vx,vy:player.vy,gr:player.grounded,face:player.facing,st:player._stomping,wt:PA.w.type,sx:PA.sx,sy:PA.sy,t:PA.t,lean:PA.lean};
  player.inv=0;player.wet=false;player.vx=vxFake*0.3;player.vy=0;player.grounded=hop===0;player.facing=1;player._stomping=false;PA.w.type=null;
  PA.t=t;PA.sx=1+sq*0.35-hop*0.08;PA.sy=1-sq*0.3+hop*0.1;PA.lean=0;
  g.save();g.translate(W2/2,gy-hop*40);g.scale(S,S);try{drawPlayerBlob(g,{x:0,y:0,preview:true});}catch(e){}g.restore();
  player.inv=save.inv;player.wet=save.wet;player.vx=save.vx;player.vy=save.vy;player.grounded=save.gr;player.facing=save.face;player._stomping=save.st;PA.w.type=save.wt;PA.sx=save.sx;PA.sy=save.sy;PA.t=save.t;PA.lean=save.lean;
}
