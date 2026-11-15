// Neon Platformer — Enemy look & animation (V5.3)
// New drawings for: walker, sniper, climber, sentinel, hive, warden.
// Drone, turret, shield, charger and bomber keep their original look (in draw.js).
// Same sizes, hitboxes and behaviour; only the drawing changes.
//   enemyAnimTick()   once per game tick (from the loop)
//   drawEnemy(e)      draws one enemy of a type in ENEW
//   enemyDied(e)      starts a death pop     drawEnemyFx() draws the pops
const ENEW=new Set(['walker','sniper','climber','sentinel','hive','warden']);
const EFX=[];
const ENEMY_COL={walker:'#C05BC0',sniper:'#FF0055',climber:'#3FE0A8',sentinel:'#7F77DD',hive:'#9CE85A',warden:'#FFAA44'};
const _ec=(v,a,b)=>v<a?a:v>b?b:v;
function _ea(e){
  if(!e._a)e._a={t:Math.random()*100,sq:0,sqv:0,flash:0,jit:0,blink:0,blinkNext:60+Math.random()*120,
    lx:e.x,ly:e.y,vx:0,vy:0,lastInv:0,look:{x:1,y:0},dist:999,pop:0,rec:0,trail:[],walk:0,prev:{}};
  return e._a;
}
function enemyAnimTick(){
  if(mode!=='play'||won||paused)return;
  for(const e of enemies)if(ENEW.has(e.type))_enemyAnim(e);
  for(const f of EFX){f.t++;for(const s of f.shards){s.vy+=0.22;s.x+=s.vx;s.y+=s.vy;s.vx*=0.97;s.r+=s.vr;}}
  for(let i=EFX.length-1;i>=0;i--)if(EFX[i].t>=EFX[i].max)EFX.splice(i,1);
}
function _enemyAnim(e){
  const A=_ea(e);A.t++;
  A.vx=A.vx*0.6+(e.x-A.lx)*0.4;A.vy=A.vy*0.6+(e.y-A.ly)*0.4;
  A.walk+=Math.abs(e.x-A.lx)*0.32+Math.abs(e.y-A.ly)*(e.type==='climber'?0.32:0);
  A.lx=e.x;A.ly=e.y;
  if(e.inv>A.lastInv&&e.inv>=10){A.flash=7;A.sqv-=0.55;A.jit=6;}      // just got hit
  A.lastInv=e.inv;
  A.sqv+=-A.sq*0.3;A.sqv*=0.7;A.sq+=A.sqv;
  if(A.flash>0)A.flash--;if(A.jit>0)A.jit--;A.rec*=0.8;A.pop*=0.88;
  if(--A.blinkNext<=0){A.blink=6;A.blinkNext=90+Math.random()*160;}if(A.blink>0)A.blink--;
  const dx=(player.x+player.w/2)-(e.x+e.w/2),dy=(player.y+player.h/2)-(e.y+e.h/2),d=Math.hypot(dx,dy)||1;
  A.look.x+=(dx/d-A.look.x)*0.15;A.look.y+=(dy/d-A.look.y)*0.15;A.dist=d;
  const P=A.prev;
  if(e.type==='sniper'&&P.shootCd2!=null&&e.shootCd2>P.shootCd2+5)A.rec=1;
  if(e.type==='sniper'&&e.lockTimer>58&&!(P.lockTimer>58))A.pop=1;
  if(e.type==='warden'){A.trail.unshift({x:e.x,y:e.y});if(A.trail.length>6)A.trail.length=6;}
  A.prev={shootCd2:e.shootCd2,lockTimer:e.lockTimer,state:e.state};
}
function enemyDied(e){
  feelEnemyDied(e);
  if(!ENEW.has(e.type))return;
  const col=ENEMY_COL[e.type],cxm=e.x+e.w/2,cym=e.y+e.h/2,big=e.w>40;
  const shards=[];for(let i=0;i<(big?18:9);i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*(big?4:3);shards.push({x:cxm,y:cym,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1.5,r:Math.random()*Math.PI,vr:(Math.random()-.5)*0.4,sz:big?3+Math.random()*3:2+Math.random()*2});}
  EFX.push({x:cxm,y:cym,w:e.w,h:e.h,col,t:0,max:big?40:26,shards,big});
}
function clearEnemyFx(){EFX.length=0;}
function drawEnemyFx(){
  for(const f of EFX){
    const k=f.t/f.max,x=f.x-camX,y=f.y-camY;cx.save();
    const core=f.t<4?(f.w*0.55)*(1+f.t*0.15):(f.w*0.55)*Math.max(0,1-(f.t-4)/8);
    if(core>0){cx.shadowBlur=20;cx.shadowColor=f.col;cx.fillStyle='#fff';cx.beginPath();cx.arc(x,y,core,0,7);cx.fill();}
    cx.shadowBlur=14;cx.shadowColor=f.col;cx.strokeStyle=f.col;cx.globalAlpha=1-k;cx.lineWidth=(f.big?4:2.5)*(1-k)+0.5;
    cx.beginPath();cx.arc(x,y,f.w*0.4+k*(f.big?70:34),0,7);cx.stroke();
    cx.fillStyle=f.col;
    for(const s of f.shards){cx.save();cx.translate(s.x-camX,s.y-camY);cx.rotate(s.r);cx.fillRect(-s.sz/2,-s.sz/2,s.sz,s.sz*0.6);cx.restore();}
    cx.restore();
  }
}

// ── helpers ──
function _rr(x,y,w,h,r){r=Math.min(r,w/2,h/2);cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();}
function _glow(c,b){cx.shadowBlur=b;cx.shadowColor=c;}
// one neon eye: socket, glowing iris that follows look, pupil, glint, blink + optional angry brow
function _eye(x,y,r,A,col,o){
  o=o||{};const bk=A.blink>0?Math.max(0.15,Math.abs(A.blink-3)/3):1,lid=(o.lid||0);
  const ry=r*bk*(1-lid);
  cx.fillStyle=o.socket||'#08040a';cx.beginPath();cx.ellipse(x,y,r,Math.max(0.6,ry),0,0,7);cx.fill();
  if(ry>1){
    const lx=(o.fixX!=null?o.fixX:A.look.x)*r*0.35,ly=(o.fixY!=null?o.fixY:A.look.y)*r*0.3;
    cx.save();cx.beginPath();cx.ellipse(x,y,r,ry,0,0,7);cx.clip();
    _glow(col,8);cx.fillStyle=col;cx.beginPath();cx.arc(x+lx,y+ly,r*0.62,0,7);cx.fill();cx.shadowBlur=0;
    cx.fillStyle='#0a0004';cx.beginPath();cx.arc(x+lx,y+ly,r*(o.pupil||0.28),0,7);cx.fill();
    cx.fillStyle='rgba(255,255,255,.9)';cx.beginPath();cx.arc(x+lx-r*0.22,y+ly-r*0.22,r*0.14,0,7);cx.fill();
    cx.restore();
  }
  if(o.angry){cx.strokeStyle=o.brow||col;cx.lineWidth=1.6;cx.lineCap='round';const s=o.angry;cx.beginPath();cx.moveTo(x-r*1.1,y-r*1.15+s*-1.2);cx.lineTo(x+r*1.1,y-r*1.15+s*1.2);cx.stroke();}
}
function _bang(x,y,A,col){ // "!" that pops in with a bounce
  if(A.pop<0.05)return;const s=1+A.pop*0.8;
  cx.save();cx.translate(x,y);cx.scale(s,s);_glow(col,8);cx.fillStyle=col;cx.font='bold 11px monospace';cx.textAlign='center';cx.textBaseline='bottom';cx.fillText('!',0,0);cx.restore();
}

function drawEnemy(e){
  const A=_ea(e);let sx=e.x-camX,sy=e.y-camY;
  if(A.jit>0){sx+=(Math.random()-.5)*A.jit*0.5;sy+=(Math.random()-.5)*A.jit*0.3;}
  cx.save();
  if(A.flash>0)cx.filter='brightness(2.6) saturate(0.25)';
  EDRAW[e.type](e,A,sx,sy);
  cx.restore();
}
const EDRAW={
  walker(e,A,sx,sy){ // two-legged stalker with a proper step cycle
    const w=e.w,h=e.h,cxm=sx+w/2,f=A.vx>=0?1:-1,ph=A.walk*0.55,hipY=sy+h-9,bob=Math.abs(Math.sin(ph))*1.6;
    const leg=(s)=>{const p=ph+(s>0?0:Math.PI),fx=cxm+s*3+Math.cos(p)*4*f,fy=sy+h-Math.max(0,Math.sin(p))*3.5,hx=cxm+s*3,hy=hipY-bob;
      const kx=(hx+fx)/2+f*3,ky=(hy+fy)/2-1;cx.strokeStyle=s>0?'#C05BC0':'#8a3a8a';cx.lineWidth=2;cx.lineCap='round';cx.beginPath();cx.moveTo(hx,hy);cx.lineTo(kx,ky);cx.lineTo(fx,fy);cx.stroke();
      cx.fillStyle=cx.strokeStyle;cx.fillRect(fx-1.8,fy-1,3.6,1.6);};
    leg(-1);
    _glow('#AA44AA',9);cx.fillStyle='#1d051d';_rr(sx+1,sy+1-bob,w-2,h-11,5);cx.fill();cx.strokeStyle='#C05BC0';cx.lineWidth=1.6;cx.stroke();cx.shadowBlur=0;
    leg(1);
    _eye(cxm+f*2,sy+7-bob,3.8,A,'#E07AE0',{fixX:f*0.8,fixY:0.1});
  },
  sniper(e,A,sx,sy){ // wall-mounted scope; iris tightens as it locks on
    const w=e.w,h=e.h,cxm=sx+w/2,cym=sy+h/2,lp=Math.min((e.lockTimer||0)/90,1),near=A.dist<280&&e.shootCd2===0;
    cx.fillStyle='#FF0055';
    if(e.surf==='ceiling')cx.fillRect(sx+3,sy-3,w-6,3);else if(e.surf==='left')cx.fillRect(sx-3,sy+3,3,h-6);else if(e.surf==='right')cx.fillRect(sx+w,sy+3,3,h-6);else cx.fillRect(sx+3,sy+h,w-6,3);
    if(near){const tx=player.x+player.w/2-camX,ty=player.y+player.h/2-camY;cx.save();cx.globalAlpha=0.15+lp*0.6;cx.strokeStyle='#FF0055';cx.lineWidth=1;cx.setLineDash([4,4]);cx.lineDashOffset=-A.t*0.6;cx.beginPath();cx.moveTo(cxm,cym);cx.lineTo(tx,ty);cx.stroke();cx.setLineDash([]);
      const rs=10-lp*5;cx.translate(tx,ty);cx.rotate(A.t*0.05);cx.lineWidth=1.4;cx.globalAlpha=0.45+lp*0.55;
      for(let i=0;i<4;i++){cx.rotate(Math.PI/2);cx.beginPath();cx.moveTo(rs,-2.5);cx.lineTo(rs,2.5);cx.stroke();}cx.restore();}
    _glow('#FF0055',9+lp*10);cx.fillStyle='#1a0012';cx.beginPath();for(let i=0;i<6;i++){const a=i/6*Math.PI*2+Math.PI/6;cx.lineTo(cxm+Math.cos(a)*w*0.52,cym+Math.sin(a)*h*0.5);}cx.closePath();cx.fill();cx.strokeStyle='#FF0055';cx.lineWidth=1.6;cx.stroke();cx.shadowBlur=0;
    const ang=Math.atan2(A.look.y,A.look.x);cx.save();cx.translate(cxm,cym);cx.rotate(ang);cx.fillStyle='#3a0020';cx.fillRect(4-A.rec*3,-2,8,4);cx.strokeStyle='#FF3377';cx.lineWidth=1;cx.strokeRect(4-A.rec*3,-2,8,4);
    if(A.rec>0.4){_glow('#FF5588',14);cx.fillStyle='#fff';cx.beginPath();cx.arc(13,0,3*A.rec,0,7);cx.fill();cx.shadowBlur=0;}cx.restore();
    _eye(cxm,cym,5.2,A,lp>0.65?'#FF2266':'#FF6A99',{pupil:0.45-lp*0.3,socket:'#0d0008'});
    _bang(cxm,sy-4,A,'#FF0055');
  },
  climber(e,A,sx,sy){ // wall orb with gripping tendrils, blink and stretch
    const ws=(e.wallSide===1)?1:-1,cxm=sx+e.w/2,cym=sy+e.h/2,rr=e.w*0.52,charging=e.timer<22,ct=charging?(1-e.timer/22):0;
    const st=_ec(Math.abs(A.vy)*0.08,0,0.18);
    const wallX=ws<0?sx-2:sx+e.w+2;cx.strokeStyle='#1D9E75';cx.lineWidth=2;cx.lineCap='round';
    for(let i=0;i<3;i++){const a=(i-1)*0.8,reach=Math.sin(A.walk*0.5+i*2.1),ty=cym+a*rr*1.1+reach*3,sway=Math.sin(A.t*0.08+i)*1.5;
      cx.beginPath();cx.moveTo(cxm+ws*rr*0.5,cym+a*rr*0.5);cx.quadraticCurveTo(wallX-ws*2,ty+sway,wallX,ty+sway);cx.stroke();
      cx.fillStyle='#3FE0A8';cx.beginPath();cx.arc(wallX,ty+sway,1.8,0,7);cx.fill();}
    cx.save();cx.translate(cxm,cym);cx.scale(1-st*0.6,1+st);
    _glow('#3FE0A8',12+ct*10);const g=cx.createRadialGradient(-rr*0.3,-rr*0.3,rr*0.15,0,0,rr);g.addColorStop(0,'#1f6a50');g.addColorStop(.7,'#0c3527');g.addColorStop(1,'#06241b');
    cx.fillStyle=g;cx.beginPath();cx.arc(0,0,rr,0,7);cx.fill();cx.shadowBlur=0;cx.strokeStyle='#5DCAA5';cx.lineWidth=1.6;cx.stroke();
    cx.strokeStyle='rgba(63,224,168,0.3)';cx.lineWidth=1;for(let i=0;i<4;i++){const a=i*1.6+0.4+Math.sin(A.t*0.03)*0.2;cx.beginPath();cx.moveTo(Math.cos(a)*rr*0.45,Math.sin(a)*rr*0.45);cx.lineTo(Math.cos(a)*rr*0.92,Math.sin(a)*rr*0.92);cx.stroke();}
    cx.restore();
    _eye(cxm-ws*1.2,cym,rr*0.55,A,charging?'#FF9933':'#7CF5CD',{socket:'#bfffe8',pupil:charging?0.5:0.32});
    if(charging){const cr=rr+4-ct*3;cx.strokeStyle='rgba(255,170,80,'+(0.4+0.5*Math.sin(A.t*0.7))+')';cx.lineWidth=2;cx.beginPath();cx.arc(cxm,cym,cr,0,7);cx.stroke();}
  },
  sentinel(e,A,sx,sy){ // floating eye boss: tracking iris, orbiting sparks, rage cracks
    const p2=e.hp<=4,col=p2?'#FF4466':'#7F77DD',cxm=sx+e.w/2,cym=sy+e.h/2;
    const crouch=_ec(e.crouch||0,0,1),sq=1+Math.sin(e.bob||0)*0.05+crouch*0.18+A.sq*0.15;
    const rw=(e.w/2)*sq,rh=(e.h/2)/sq;
    for(let i=0;i<6;i++){const a=A.t*0.03*(p2?1.8:1)+i*Math.PI/3,r=e.w/2+14+Math.sin(A.t*0.05+i)*2;cx.fillStyle=col;cx.globalAlpha=0.55;cx.beginPath();cx.arc(cxm+Math.cos(a)*r,cym+Math.sin(a)*r*0.8,1.4,0,7);cx.fill();}
    cx.globalAlpha=1;
    _glow(col,20);cx.fillStyle=p2?'#2a0820':'#1a1830';cx.beginPath();cx.ellipse(cxm,cym,rw,rh,0,0,7);cx.fill();cx.strokeStyle=col;cx.lineWidth=2;cx.stroke();cx.shadowBlur=0;
    if(p2){cx.strokeStyle='rgba(255,68,102,.7)';cx.lineWidth=1;for(let i=0;i<5;i++){const a=i*1.3+0.3;cx.beginPath();cx.moveTo(cxm+Math.cos(a)*rw*0.95,cym+Math.sin(a)*rh*0.95);cx.lineTo(cxm+Math.cos(a+0.2)*rw*0.6,cym+Math.sin(a+0.2)*rh*0.6);cx.lineTo(cxm+Math.cos(a-0.1)*rw*0.45,cym+Math.sin(a-0.1)*rh*0.45);cx.stroke();}}
    _eye(cxm,cym,rw*0.52,A,p2?'#FF4466':'#AFA9EC',{lid:p2?0.3:0,angry:p2?1:0,brow:'#FF4466',pupil:0.3+Math.sin(A.t*0.1)*0.05});
    if(e.shieldDown<=0){cx.save();_glow('#4488FF',14);cx.strokeStyle='#4488FF';cx.lineWidth=6;cx.lineCap='round';cx.beginPath();cx.arc(cxm,cym,e.w/2+8,e.ang-1.1,e.ang+1.1);cx.stroke();
      cx.shadowBlur=0;cx.strokeStyle='rgba(200,230,255,.8)';cx.lineWidth=2;cx.setLineDash([3,4]);cx.lineDashOffset=-A.t*0.8;cx.beginPath();cx.arc(cxm,cym,e.w/2+8,e.ang-1.1,e.ang+1.1);cx.stroke();cx.restore();}
    else{cx.save();cx.globalAlpha=0.35+Math.sin(A.t*0.3)*0.15;cx.strokeStyle='#FF8800';cx.lineWidth=2;cx.setLineDash([4,5]);cx.lineDashOffset=A.t;cx.beginPath();cx.arc(cxm,cym,e.w/2+8,0,7);cx.stroke();cx.restore();}
  },
  hive(e,A,sx,sy){ // honeycomb shell that breathes; opens on a beating core
    const p2=e.hp<=5,col=p2?'#FF4466':'#9CE85A',dark=p2?'#2a0812':'#0a1a00',cxm=sx+e.w/2,cym=sy+e.h/2,gap=e.open*16,beat=Math.sin((e.pulse||0)*3);
    const breathe=e.open<0.05?Math.sin(A.t*0.05)*0.03:0;
    if(e.open>0.1){
      cx.strokeStyle=p2?'rgba(255,68,102,.6)':'rgba(156,232,90,.55)';cx.lineWidth=1.4;
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2+A.t*0.01,r=12+gap*0.6;cx.beginPath();cx.moveTo(cxm,cym);cx.quadraticCurveTo(cxm+Math.cos(a+0.5)*r*0.6,cym+Math.sin(a+0.5)*r*0.6,cxm+Math.cos(a)*r,cym+Math.sin(a)*r);cx.stroke();}
      _glow(col,20);cx.fillStyle=p2?'rgba(255,68,102,.35)':'rgba(156,232,90,.35)';cx.beginPath();cx.arc(cxm,cym,14+beat*2,0,7);cx.fill();
      cx.fillStyle=col;cx.beginPath();cx.arc(cxm,cym,7+beat*2,0,7);cx.fill();cx.shadowBlur=0;
      _eye(cxm,cym,4.5+beat,A,'#fff',{socket:p2?'#5a0a20':'#1d4a08'});
    }
    const half=(x0)=>{
      cx.save();cx.translate(x0+(e.w/2-2)/2,cym);cx.scale(1+breathe,1+breathe);cx.translate(-(x0+(e.w/2-2)/2),-cym);
      _glow(col,12);cx.fillStyle=dark;_rr(x0,sy,e.w/2-2,e.h,10);cx.fill();cx.strokeStyle=col;cx.lineWidth=2;cx.stroke();cx.shadowBlur=0;
      cx.save();_rr(x0,sy,e.w/2-2,e.h,10);cx.clip();
      const s=5.2;for(let r=0;r<7;r++)for(let c=0;c<4;c++){const hx=x0+3+c*s*1.7+(r%2)*s*0.85,hy=sy+4+r*s*1.48;const lit=(Math.sin(A.t*0.05+r*1.7+c*2.3)>0.86);
        cx.strokeStyle=lit?col:(p2?'#5a1530':'#1f4a0a');cx.lineWidth=lit?1.2:0.8;cx.beginPath();for(let k=0;k<6;k++){const a=k/6*Math.PI*2+Math.PI/6;cx.lineTo(hx+Math.cos(a)*s*0.85,hy+Math.sin(a)*s*0.85);}cx.closePath();cx.stroke();}
      cx.restore();cx.restore();
    };
    half(sx-gap);half(sx+e.w/2+gap+2);
    if(e.open<0.1){cx.strokeStyle=col;cx.globalAlpha=0.4+Math.sin(A.t*0.1)*0.3;cx.lineWidth=1.2;cx.beginPath();cx.moveTo(cxm,sy+3);cx.lineTo(cxm,sy+e.h-3);cx.stroke();cx.globalAlpha=1;}
  },
  warden(e,A,sx,sy){ // armoured dasher: afterimages, anchors when planting, steam when spent
    const p2=e.hp<=4,col=p2?'#FF4466':'#FFAA44',edge=p2?'#FF4466':'#BA7517',cxm=sx+e.w/2,cym=sy+e.h/2,f=e.facing||1,st=e.state;
    if(st==='dash'){for(let i=1;i<A.trail.length;i++){const tp=A.trail[i];cx.globalAlpha=0.22*(1-i/A.trail.length);cx.strokeStyle=col;cx.lineWidth=2;cx.strokeRect(tp.x-camX+.5,tp.y-camY+.5,e.w-1,e.h-1);}cx.globalAlpha=1;
      _glow('#FFAA33',12);cx.fillStyle='rgba(255,170,60,.8)';const bx=f>0?sx-2:sx+e.w+2;cx.beginPath();cx.moveTo(bx,cym-5);cx.lineTo(bx-f*(8+Math.random()*6),cym);cx.lineTo(bx,cym+5);cx.closePath();cx.fill();cx.shadowBlur=0;}
    if(st==='sweep'){const len=COLS*TS,ex=cxm+Math.cos(e.sweep)*len,ey=cym+Math.sin(e.sweep)*len;cx.save();
      _glow('#FF8800',18);cx.strokeStyle='rgba(255,136,0,.75)';cx.lineWidth=7+Math.sin(A.t*0.8)*1.5;cx.beginPath();cx.moveTo(cxm,cym);cx.lineTo(ex,ey);cx.stroke();
      cx.strokeStyle='rgba(255,240,180,.95)';cx.lineWidth=2;cx.stroke();cx.restore();}
    if(st==='telegraph'){const k=1-(e.timer||0)/24;cx.strokeStyle='rgba(255,120,30,'+(0.3+k*0.5)+')';cx.lineWidth=1.2;
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2+A.t*0.1,r=26-k*14;cx.beginPath();cx.moveTo(cxm+Math.cos(a)*r,cym+Math.sin(a)*r);cx.lineTo(cxm+Math.cos(a)*(r-5),cym+Math.sin(a)*(r-5));cx.stroke();}
      if(Math.floor((e.timer||0)/4)%2){cx.fillStyle='#FF4400';cx.font='8px monospace';cx.textAlign='center';cx.fillText(f>0?'▶▶':'◀◀',cxm,sy-8);}}
    if(st==='plant'||st==='sweep'){cx.strokeStyle=edge;cx.lineWidth=2;for(const s of[-1,1]){cx.beginPath();cx.moveTo(cxm+s*8,sy+e.h-2);cx.lineTo(cxm+s*13,sy+e.h+5);cx.stroke();}}
    _glow(col,14);cx.fillStyle=p2?'#2a0812':'#1a0a00';_rr(sx,sy,e.w,e.h,7);cx.fill();cx.strokeStyle=edge;cx.lineWidth=2;cx.stroke();cx.shadowBlur=0;
    cx.strokeStyle=p2?'rgba(255,68,102,.4)':'rgba(186,117,23,.5)';cx.lineWidth=1;cx.beginPath();cx.moveTo(sx+4,sy+e.h*0.68);cx.lineTo(sx+e.w-4,sy+e.h*0.68);cx.stroke();
    cx.fillStyle=col;_rr(sx-4,sy+6,4,e.h-12,2);cx.fill();_rr(sx+e.w,sy+6,4,e.h-12,2);cx.fill();
    const vis=st==='cooldown'?0.35:1;cx.globalAlpha=vis;_glow(col,10);cx.fillStyle='#120600';_rr(sx+5,cym-6,e.w-10,8,4);cx.fill();cx.shadowBlur=0;
    _eye(cxm+A.look.x*4,cym-2,3.6,A,st==='telegraph'||st==='sweep'?'#FFE08A':col,{angry:st==='dash'||st==='telegraph'?f:0,brow:col,socket:'#120600'});cx.globalAlpha=1;
    if(st==='cooldown'&&Math.random()<0.6){cx.fillStyle='rgba(220,220,230,.35)';cx.beginPath();cx.arc(sx+(Math.random()<.5?2:e.w-2),sy-2-Math.random()*8,2+Math.random()*2,0,7);cx.fill();}
  }
};
