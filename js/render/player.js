// Neon Platformer — Player blob: animation and drawing
// The look is the original V6 metaball slime. On top of it:
//  • squash & stretch from the feet (landing, takeoff, air, running steps, turning)
//  • eyes: slide when turning, follow the aim when holding a weapon, blink, squint, X when hit
//  • front/back flip on double jump, dust puffs, double-jump ring, stomp shockwave, hit flash
//  • the current weapon is shown in a little goo hand, aimed and kicking back when fired
// playerAnimTick() runs once per 60Hz game tick (from the game loop); drawPlayerBlob() draws.

const PWD={ // weapon look: colour + how hard it kicks
  blaster:{col:'#AFA9EC',rec:.55}, shotgun:{col:'#FF8800',rec:1}, laser:{col:'#00FFEE',rec:.7},
  sword:{col:'#AA44FF',rec:0}, grenade:{col:'#FF6600',rec:.3}, freeze:{col:'#88EEFF',rec:.4}, plasma:{col:'#FF44FF',rec:1.3}
};
const PA={t:0,sq:0,sqv:0,air:0,sx:1,sy:1,face:1,lean:0,kick:0,blink:0,blinkNext:120,run:0,lastStep:0,
  landT:99,impact:0,idleT:0,glance:1,hurtT:0,flash:0,flipT:null,flipDir:1,flipA:0,fx:[],
  w:{type:null,ang:0,rec:0,flash:0,pop:1,throwT:0},prev:null};
const _pclamp=(v,a,b)=>v<a?a:v>b?b:v,_prnd=(a,b)=>a+Math.random()*(b-a);
function _pLerpAng(a,b,t){const d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;return a+d*t;}

function playerAnimTick(){
  if(mode!=='play'||won||paused)return;
  const p=player,A=PA,W=A.w;
  const cur={x:p.x,y:p.y,vy:p.vy,grounded:p.grounded,jumps:p.jumps||0,facing:p.facing,hp,shield:pups.shield,
    stomp:!!p._stomping,cd:shootCd,swing:swordSwing,type:curW};
  const pr=A.prev;A.prev=cur;A.t++;
  if(!pr||Math.abs(cur.x-pr.x)>48||Math.abs(cur.y-pr.y)>48){A.fx=[];A.flipT=null;return;} // spawn / respawn / teleport
  const ox=p.x+9,fy=p.y+18;
  // ── events, read from the game's own state ──
  if(cur.grounded&&!pr.grounded){
    const v=pr.vy;A.sqv+=v*0.096;A.landT=0;A.impact=v;A.air=0;A.flipT=null;
    if(v>4)for(let k=0;k<(pr.stomp?8:4);k++){const s=k%2?1:-1;A.fx.push({k:'puff',x:ox+s*_prnd(4,9),y:fy-1,vx:s*_prnd(.6,1.6)*(pr.stomp?1.8:1),vy:-_prnd(.1,.5),r:_prnd(1.6,2.8),life:_prnd(16,24),max:24});}
    if(pr.stomp){A.sqv+=0.5;A.fx.push({k:'ring',x:ox,y:fy,r:6,vr:2.6,life:16,max:16,flat:0.3});}
  }
  if(cur.jumps>pr.jumps){
    if(pr.grounded||cur.jumps<2)A.sqv-=1.05;
    else{ // double (or triple) jump: ring + flip
      A.sqv-=0.8;A.fx.push({k:'ring',x:ox,y:fy,r:5,vr:1.4,life:14,max:14,flat:0.35});
      A.flipT=0;A.flipDir=Math.abs(p.vx)>1?Math.sign(p.vx):-p.facing;   // moving = front flip, still = back flip
    }
  }else if(cur.vy<-9&&pr.vy>-2)A.sqv-=0.9;                   // launched by a bounce pad
  if(cur.facing!==pr.facing&&cur.grounded)A.sqv+=0.35;
  if(cur.hp<pr.hp||(cur.shield<=0&&pr.shield>0)){A.sqv-=0.9;A.flash=10;A.hurtT=30;}
  // ── weapon ──
  const hasW=wAmmo[curW]>0;
  if(cur.type!==W.type){W.type=cur.type;W.pop=0;W.throwT=0;}
  if(hasW){
    const fired=cur.cd>pr.cd&&cur.type===pr.type;
    if(fired){const d=PWD[W.type]||PWD.blaster;W.rec=d.rec;W.flash=5;A.kick+=d.rec;A.sqv+=d.rec*0.22;
      if(W.type==='plasma')W.rec=d.rec*1.2;if(W.type==='grenade')W.throwT=14;}
    const {ax,ay}=getAimVector();W.ang=_pLerpAng(W.ang,Math.atan2(ay,ax),0.35);
    if(W.type==='freeze'&&Math.random()<0.25){A.fx.push({k:'puff',frost:1,x:ox+Math.cos(W.ang)*20,y:p.y+12+Math.sin(W.ang)*20,vx:_prnd(-.3,.3),vy:_prnd(.1,.4),r:.7,life:20,max:20});}
  }
  W.rec*=0.78;W.flash=Math.max(0,W.flash-1);W.pop=Math.min(1,W.pop+0.12);
  if(W.throwT>0){W.throwT--;if(W.throwT<=0)W.pop=0;}
  // ── squash spring: strong hit, small rebound ──
  A.sqv+=-A.sq*0.3;A.sqv*=0.68;A.sq+=A.sqv;
  const airT=p.grounded?0:_pclamp(Math.abs(p.vy)*0.022,0,0.28)+(p._stomping?0.15:0);
  A.air+=(airT-A.air)*0.35;
  const running=p.grounded&&Math.abs(p.vx)>0.5;if(running)A.run+=Math.abs(p.vx)*0.075;
  const bob=running?Math.sin(A.run*2):0,breath=p.grounded&&!running?Math.sin(A.t*0.06)*0.025:0;
  A.sx=_pclamp(1+A.sq*0.3-A.air*0.45-bob*0.045-breath,0.55,1.6);A.sy=_pclamp(1-A.sq*0.3+A.air+bob*0.05+breath,0.55,1.6);
  const step=Math.floor(A.run*2/Math.PI);
  if(running&&step!==A.lastStep&&Math.abs(p.vx)>3)A.fx.push({k:'puff',x:ox-p.facing*7,y:fy-1,vx:-p.facing*_prnd(.3,.8),vy:-_prnd(.1,.3),r:_prnd(1.2,2),life:16,max:16});
  A.lastStep=step;
  const leanT=_pclamp(p.vx*(p.grounded?0.03:0.016),-0.14,0.14)-A.kick*0.08*p.facing;A.lean+=(leanT-A.lean)*0.25;A.kick*=0.8;
  A.face+=(p.facing-A.face)*0.28;
  // moves: stretch while dashing, hug the wall while sliding, tuck before a ground pound
  if(p._dash>0){A.sq=Math.max(A.sq,0.95);A.lean=p._dashDir*0.12;}
  if(p._wall){A.lean+=(p._wall*0.24-A.lean)*0.35;A.sq=Math.min(A.sq,-0.3);}
  if(p._poundHang>0){A.sq=Math.max(A.sq,0.5);}else if(p._stomping&&p.vy>8){A.sq=Math.min(A.sq,-0.7);}
  if(--A.blinkNext<=0){A.blink=7;A.blinkNext=_prnd(110,260);}if(A.blink>0)A.blink--;
  A.landT++;if(A.flash>0)A.flash--;if(A.hurtT>0)A.hurtT--;
  A.idleT=(Math.abs(p.vx)>0.3||!p.grounded)?0:A.idleT+1;A.glance=A.idleT>200&&(A.idleT%240)<60?-1:1;
  A.flipA=0;
  if(A.flipT!=null){A.flipT++;const D=26;
    if(A.flipT>=D||(p.grounded&&A.flipT>2))A.flipT=null;
    else{const t=A.flipT/D,e=1-Math.pow(1-t,2.4),tuck=Math.sin(t*Math.PI)*0.14;A.flipA=A.flipDir*e*Math.PI*2;A.sx*=1-tuck;A.sy*=1-tuck;}}
  for(const f of A.fx){f.life--;if(f.k==='puff'){f.x+=f.vx;f.y+=f.vy;f.vx*=0.9;f.r+=0.06;}else f.r+=f.vr;}
  A.fx=A.fx.filter(f=>f.life>0);
}

const _PCX=cx;
// g/o: optional other canvas + position (used by the CUSTOMISE screen preview)
function drawPlayerBlob(g,o){
  const cx=g||_PCX,p=player,A=PA,W=A.w,PU=o?{speed:0,jump:0,shield:0}:pups,SC=skinCols();
  if(!o&&p.inv>0&&Math.floor(p.inv/4)%2===0)return;               // damage flicker (as before)
  const wet=p.wet;
  const col =wet?'#29AAFF':(PU.speed>0?'#FFFF44':PU.jump>0?'#FF88FF':SC.col);
  const col2=wet?'#0066CC':(PU.speed>0?'#888800':PU.jump>0?'#AA44AA':SC.col2);
  const glo =wet?'#0088FF':(PU.speed>0?'#FFFF00':PU.jump>0?'#FF44FF':SC.glo);
  const r=9,bx=o?o.x:p.x-camX+9,by=o?o.y:p.y-camY+18,ox=p.x+9,oy=p.y+18;
  // speed power-up trail (as before)
  if(!o&&pups.speed>0){cx.save();cx.translate(bx,by-r);cx.globalAlpha=0.25;
    for(let i=1;i<=4;i++){cx.fillStyle=`rgba(255,238,0,${1-i*0.22})`;cx.beginPath();cx.ellipse(-p.facing*i*8,0,r*(1-i*.15),r*(1-i*.15),0,0,Math.PI*2);cx.fill();}cx.restore();}
  cx.save();cx.translate(bx,by);
  // dust, rings, frost (world positions)
  if(!o)for(const f of A.fx){const al=f.life/f.max;
    if(f.k==='puff'){cx.fillStyle=f.frost?'rgba(200,250,255,'+(al*0.8)+')':'rgba(200,196,250,'+(al*0.55)+')';cx.beginPath();cx.arc(f.x-ox,f.y-oy,f.r,0,7);cx.fill();}
    else{cx.strokeStyle=glo;cx.globalAlpha=al*0.7;cx.lineWidth=1.2;cx.beginPath();cx.ellipse(f.x-ox,f.y-oy,f.r,f.r*f.flat,0,0,7);cx.stroke();cx.globalAlpha=1;}}
  cx.save();
  if(A.flash>0)cx.filter='sepia(1) saturate(7) hue-rotate(-55deg) brightness(1.15)';
  cx.rotate(A.lean);
  const sx=A.sx,sy=A.sy,cy=-r*sy;
  if(A.flipA){
    cx.save();cx.strokeStyle=glo;cx.globalAlpha=.35;cx.lineWidth=2;cx.lineCap='round';cx.beginPath();
    const a1=A.flipA-Math.PI/2,a0=a1-A.flipDir*1.8;cx.arc(0,cy,13,Math.min(a0,a1),Math.max(a0,a1));cx.stroke();cx.restore();
    cx.translate(0,cy);cx.rotate(A.flipA);cx.translate(0,-cy);
  }
  const hasW=W.type&&wAmmo[W.type]>0&&W.pop>0.05&&!(W.type==='grenade'&&W.throwT>0);
  const swordRest=W.type==='sword'&&swordSwing<=0;
  if(hasW&&swordRest)_pDrawWeapon(A,W,cy,sx,col);
  if(hasW&&!swordRest)_pDrawArm(A,W,cy,sx,col,col2);
  // body
  cx.shadowBlur=18;cx.shadowColor=glo;
  const gr=cx.createRadialGradient(-r*.25*sx,cy-r*.3*sy,r*.12,0,cy,r*1.6);
  gr.addColorStop(0,'rgba(210,255,240,0.95)');gr.addColorStop(.45,col);gr.addColorStop(1,col2);cx.fillStyle=gr;
  const wf=1+Math.abs(p.vx)*0.12,wa=1+Math.max(0,1-A.landT/14)*0.6;
  cx.beginPath();
  for(let a=0;a<=Math.PI*2+.01;a+=Math.PI/16){
    const rr=r+(Math.sin(a*3+A.t*.15*wf)*1.2+Math.sin(a*5-A.t*.11*wf)*0.75)*wa+(p.grounded?Math.max(0,Math.sin(a))*1.6:0);
    const x=Math.cos(a)*rr*sx,y=cy+Math.sin(a)*rr*sy;a===0?cx.moveTo(x,y):cx.lineTo(x,y);
  }
  cx.closePath();cx.fill();cx.shadowBlur=0;
  cx.fillStyle='rgba(255,255,255,0.5)';cx.beginPath();cx.ellipse(-r*.3*sx,cy-r*.38*sy,r*.26*sx,r*.15*sy,-.4,0,7);cx.fill();
  // eyes: follow the aim with a weapon, otherwise movement
  const aiming=hasW&&W.type!=='sword',aimX=aiming?Math.cos(W.ang):0,aimY=aiming?Math.sin(W.ang):0;
  const f=aiming?A.face:A.face*A.glance,ex=f*r*.28*sx+aimX*0.6,ey=cy-r*.1*sy+aimY*2.2;
  const look=aiming?{x:_pclamp(aimX*1.7,-1.7,1.7),y:_pclamp(aimY*1.7,-1.6,1.6)}:{x:_pclamp(f+p.vx*.06,-1.6,1.6),y:_pclamp(p.vy*.1,-1.2,1.3)};
  let ry=4.4*sy;ry*=A.blink>0?Math.max(.12,Math.abs(A.blink-3.5)/3.5):1;
  if((A.landT<10&&A.impact>9)||p._stomping)ry*=0.55;
  for(const off of[-4+f*.5,4+f*.5]){
    const x=ex+off;
    if(A.hurtT>0){cx.strokeStyle='rgba(0,30,15,0.9)';cx.lineWidth=1.3;cx.lineCap='round';cx.beginPath();cx.moveTo(x-2,ey-2);cx.lineTo(x+2,ey+2);cx.moveTo(x+2,ey-2);cx.lineTo(x-2,ey+2);cx.stroke();continue;}
    skinDrawEye(cx,x,ey,ry,sx,look,glo,off<f*.5?-1:1,col);
  }
  skinDrawHat(cx,sx,sy,cy,r,A.t,{col,col2,glo},A.face,p.vx);
  if(hasW&&!swordRest)_pDrawWeapon(A,W,cy,sx,col);
  cx.restore();
  // shield aura, out-of-jumps halo (as before), stomp speed lines
  if(o){cx.restore();return;}
  if(pups.shield>0){cx.strokeStyle='rgba(0,255,238,0.55)';cx.lineWidth=2;cx.beginPath();cx.ellipse(0,-r,r+8,r+8,0,0,7);cx.stroke();}
  if(!p.grounded&&A.flipT==null&&p.jumps>=(pups.jump>0?3:2)){cx.shadowBlur=12;cx.shadowColor=glo;cx.strokeStyle=col;cx.lineWidth=1.5;cx.globalAlpha=.4+Math.sin(frame*.35)*.3;cx.beginPath();cx.ellipse(0,-r,r+7,r+4,0,0,7);cx.stroke();cx.globalAlpha=1;cx.shadowBlur=0;}
  if(p._stomping){cx.strokeStyle='rgba(255,170,0,0.6)';cx.lineWidth=1;for(const x of[-6,0,6]){cx.beginPath();cx.moveTo(x,-22-_prnd(0,4));cx.lineTo(x,-30-_prnd(0,6));cx.stroke();}}
  cx.restore();
}

function _pHand(W,cy,sx){
  const a=W.ang,ax=Math.cos(a),ay=Math.sin(a),reach=9*sx+3-W.rec*3.2;
  return{x:ax*reach,y:cy+3.2*(1-Math.abs(ay))+ay*reach*0.9+(W.type==='grenade'?-1:0)};
}
function _pSwordAngle(){const t=1-swordSwing/18,e=1-Math.pow(1-t,3),a=-Math.PI*0.62+Math.PI*0.94*e;return player.facing>0?a:Math.PI-a;}
function _pDrawArm(A,W,cy,sx,col,col2){
  let h=_pHand(W,cy,sx);if(W.type==='sword'){const a=_pSwordAngle();h={x:Math.cos(a)*11,y:cy+Math.sin(a)*9};}
  cx.strokeStyle=col2;cx.globalAlpha=0.9;cx.lineCap='round';cx.lineWidth=3.2;cx.beginPath();cx.moveTo(h.x*0.35,cy+(h.y-cy)*0.35);cx.quadraticCurveTo(h.x*0.7,cy+(h.y-cy)*0.75+1,h.x,h.y);cx.stroke();
  cx.globalAlpha=1;cx.fillStyle=col;cx.beginPath();cx.arc(h.x,h.y,1.9,0,7);cx.fill();
}
function _pGlow(c,b){cx.shadowBlur=b;cx.shadowColor=c;}
function _pRR(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();}
function _pDrawWeapon(A,W,cy,sx){
  const col=(PWD[W.type]||PWD.blaster).col;cx.save();
  if(W.type==='sword'){
    let a,hx,hy;
    if(swordSwing>0){a=_pSwordAngle();hx=Math.cos(a)*11;hy=cy+Math.sin(a)*9;}
    else{const f=player.facing;a=(f>0?-Math.PI*0.62:-Math.PI*0.38)+Math.sin(A.t*0.05)*0.04;hx=-f*4;hy=cy-3;}
    cx.translate(hx,hy);cx.rotate(a);_pGlow('#AA44FF',swordSwing>0?16:9);
    const bl=cx.createLinearGradient(0,0,17,0);bl.addColorStop(0,'#e7ccff');bl.addColorStop(1,'#CC88FF');
    cx.fillStyle=bl;cx.beginPath();cx.moveTo(2,-1.3);cx.lineTo(15,-0.9);cx.lineTo(18,0);cx.lineTo(15,0.9);cx.lineTo(2,1.3);cx.closePath();cx.fill();
    cx.shadowBlur=0;cx.fillStyle='#6a2aa8';cx.fillRect(0.6,-3.2,1.5,6.4);cx.fillStyle='#3d1a5c';cx.fillRect(-3.4,-0.9,4,1.8);
    cx.fillStyle='#fff';cx.globalAlpha=.7;cx.fillRect(4,-0.35,9,0.5);cx.restore();return;
  }
  const h=_pHand(W,cy,sx);
  cx.translate(h.x,h.y);cx.rotate(W.ang);if(Math.cos(W.ang)<-0.01)cx.scale(1,-1);
  const sc=0.4+W.pop*0.6;cx.scale(sc,sc);
  let tip=8;
  if(W.type==='blaster'){
    cx.fillStyle='#2a2650';cx.fillRect(-1.2,0.6,2.2,3.4);
    _pGlow(col,6);cx.fillStyle='#4a4490';_pRR(-2.5,-2.2,10,3.4,1.4);cx.fill();cx.shadowBlur=0;
    cx.fillStyle=col;cx.fillRect(-1,-1.9,6,0.8);_pGlow(col,8);cx.fillStyle='#e6e3ff';cx.beginPath();cx.arc(7.8,-0.5,1.1,0,7);cx.fill();tip=8.5;
  }else if(W.type==='shotgun'){
    cx.fillStyle='#4a2a08';_pRR(-6,-1.2,4.5,3.2,1);cx.fill();
    _pGlow(col,6);cx.fillStyle='#5c3a12';_pRR(-2,-2.4,14,2.6,0.8);cx.fill();cx.shadowBlur=0;
    cx.fillStyle='#c46600';cx.fillRect(-1.5,-1.3,13,0.7);
    const pump=W.rec>0.2?-2.2*W.rec:0;cx.fillStyle=col;_pRR(2.5+pump,0.3,4,1.9,0.8);cx.fill();tip=12.5;
  }else if(W.type==='laser'){
    cx.fillStyle='#0c2a33';_pRR(-4,-1.7,16,3,1.2);cx.fill();
    const pulse=0.55+Math.sin(A.t*0.25)*0.25+W.flash*0.1;
    _pGlow(col,10);cx.strokeStyle='rgba(0,255,238,'+pulse+')';cx.lineWidth=0.9;cx.beginPath();cx.moveTo(-2.5,-0.2);cx.lineTo(10,-0.2);cx.stroke();
    cx.fillStyle=col;cx.fillRect(-3,1.2,1.2,1.6);cx.fillRect(-0.6,1.2,1.2,1.6);
    cx.strokeStyle=col;cx.lineWidth=0.8;cx.beginPath();cx.arc(12.6,-0.2,1.5+W.flash*0.25,0,7);cx.stroke();cx.shadowBlur=0;tip=13;
  }else if(W.type==='grenade'){
    _pGlow(col,8);cx.fillStyle='#c94e00';cx.beginPath();cx.arc(2,0,3.3,0,7);cx.fill();cx.shadowBlur=0;
    cx.strokeStyle='#ff9a4d';cx.lineWidth=0.6;cx.beginPath();cx.arc(2,0,3.3,-2.4,-0.8);cx.stroke();
    cx.fillStyle='#555';cx.fillRect(0.8,-4.6,2.4,1.6);
    if(Math.floor(A.t/9)%2===0){_pGlow('#ff2a2a',8);cx.fillStyle='#ff4a4a';cx.beginPath();cx.arc(2,-5,0.9,0,7);cx.fill();cx.shadowBlur=0;}
    tip=0;
  }else if(W.type==='freeze'){
    cx.fillStyle='#1b3a4a';_pRR(-3,-1,10,2,1);cx.fill();
    _pGlow(col,12);cx.fillStyle='#d8fbff';cx.beginPath();cx.moveTo(7,0);cx.lineTo(9.5,-2.6);cx.lineTo(12.5,0);cx.lineTo(9.5,2.6);cx.closePath();cx.fill();cx.shadowBlur=0;
    cx.strokeStyle=col;cx.lineWidth=0.5;cx.beginPath();cx.moveTo(7,0);cx.lineTo(12.5,0);cx.stroke();tip=12.5;
  }else if(W.type==='plasma'){
    cx.fillStyle='#3a1040';_pRR(-4,-2.6,13,5.2,2);cx.fill();
    _pGlow(col,8);cx.fillStyle='#5d1a66';cx.beginPath();cx.arc(1.5,0,2.4,0,7);cx.fill();
    cx.fillStyle=col;cx.beginPath();cx.arc(1.5,0,1.1+Math.sin(A.t*0.2)*0.3,0,7);cx.fill();cx.shadowBlur=0;
    cx.fillStyle='#8a2a96';cx.fillRect(9,-2,1.6,4);tip=11;
    if(plasmaCharging&&plasmaCharge>3){const ch=Math.min(1,plasmaCharge/50),rad=1+ch*5;_pGlow(col,14+ch*14);
      cx.fillStyle='rgba(255,140,255,0.9)';cx.beginPath();cx.arc(tip+rad*0.8,0,rad,0,7);cx.fill();cx.fillStyle='#fff';cx.beginPath();cx.arc(tip+rad*0.8,0,rad*0.45,0,7);cx.fill();
      cx.strokeStyle='rgba(255,200,255,0.8)';cx.lineWidth=0.5;
      for(let k=0;k<3;k++){const a=_prnd(0,7),l=rad+_prnd(1,3);cx.beginPath();cx.moveTo(tip+rad*.8,0);cx.lineTo(tip+rad*.8+Math.cos(a)*l*.6,Math.sin(a)*l*.6);cx.lineTo(tip+rad*.8+Math.cos(a+.4)*l,Math.sin(a+.4)*l);cx.stroke();}
      cx.shadowBlur=0;}
  }
  if(W.flash>0&&tip>0){const s=W.flash/5;_pGlow(col,14);cx.fillStyle='#fff';cx.beginPath();
    for(let k=0;k<8;k++){const a=k/8*Math.PI*2,l=(k%2?1.4:4.2)*s+0.6;cx.lineTo(tip+1.5+Math.cos(a)*l*(k%4===0?1.4:1),Math.sin(a)*l);}cx.closePath();cx.fill();
    cx.fillStyle=col;cx.globalAlpha=0.5;cx.beginPath();cx.arc(tip+1.5,0,3*s+1,0,7);cx.fill();cx.shadowBlur=0;}
  cx.restore();
}
