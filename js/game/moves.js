// Neon Platformer — New moves (V5.8)
//  DASH         Double-tap left or right. A quick burst in the facing direction. No gravity while
//               dashing, you can't be hurt, and enemies you pass through take a hit.
//               One dash in the air; it refills when you land or touch a wall.
//  WALL SLIDE   Hold toward a wall while falling: you slide down slowly.
//  WALL JUMP    Jump while sliding: you kick off the wall (double jump stays available).
//  GROUND POUND ↓ in the air (the old stomp): a short hang, then a slam that sends out
//               a shockwave which hits and knocks up nearby enemies.
const MV={DASH_T:10,DASH_SPD:11.5,DASH_CD:20,WJ_LOCK:9,SLIDE_MAX:1.3,POUND_HANG:7,POUND_R:84,
  fx:[],ghosts:[],waves:[]};
function _mvSolid(x,y){return solid(tileAt(x,y));}
function mvWallDir(p){ // which side has a wall right next to the player (0 none)
  if(_mvSolid(p.x+p.w+1.5,p.y+4)&&_mvSolid(p.x+p.w+1.5,p.y+p.h-4))return 1;
  if(_mvSolid(p.x-1.5,p.y+4)&&_mvSolid(p.x-1.5,p.y+p.h-4))return -1;return 0;}
function _mvLeft(){return keys['ArrowLeft']||keys['KeyA']||touchKeys.left||gyroKeys.left;}
function _mvRight(){return keys['ArrowRight']||keys['KeyD']||touchKeys.right||gyroKeys.right;}
// called before the normal left/right input. Returns true to skip normal input this tick.
function movesPre(p,grav,wet){
  if(p._dashReady===undefined){p._dashReady=true;p._dashCd=0;}
  if(typeof grappleTick==='function'&&grappleTick(p,grav))return true;   // V6.1 grappling hook
  if(p._fling>0){                       // flying off the rope: keep your speed, steer a little
    if(p.grounded||wet){p._fling=0;}else{p._fling--;p.vy-=grav*0.3;   /* a little hang time after letting go */const l=_mvLeft(),r=_mvRight(),spd=4.8;
      if(l)p.vx=Math.max(p.vx-0.35,Math.min(p.vx,-spd));else if(r)p.vx=Math.min(p.vx+0.35,Math.max(p.vx,spd));else p.vx*=0.99;
      if(l)p.facing=-1;if(r)p.facing=1;return true;}}
  if(p._dashCd>0)p._dashCd--;
  if(p.grounded){if(!p._dashReady&&p._dashCd<=0)mvReadyFx(p);p._dashReady=true;}
  // ── dash ──
  // double-tap left or right = dash that way 
  const L=keys['ArrowLeft']||keys['KeyA'],Rt=keys['ArrowRight']||keys['KeyD'];let tapDir=0;
  if(L&&!p._pL){if(p._tapDir===-1&&frame-p._tapT<=14)tapDir=-1;p._tapDir=-1;p._tapT=frame;}
  if(Rt&&!p._pR){if(p._tapDir===1&&frame-p._tapT<=14)tapDir=1;p._tapDir=1;p._tapT=frame;}
  p._pL=L;p._pR=Rt;
  if(tapDir)p._tapDir=0;
  if(touchKeys.dashReq){tapDir=touchKeys.dashReq;touchKeys.dashReq=0;}   // arc pad: tap a side
  const dk=tapDir!==0;
  if(dk&&!(p._dash>0)&&p._dashCd<=0&&p._dashReady&&!p._poundHang&&!wet&&deathSeqTimer<=0){
    const dir=tapDir||(_mvLeft()?-1:_mvRight()?1:p.facing);p.facing=dir;p._dash=MV.DASH_T;p._dashDir=dir;p._dashCd=MV.DASH_CD;
    if(!p.grounded)p._dashReady=false;p._stomping=false;p._dashHits=[];
    if(typeof feelShake==='function')feelShake(2);
    MV.waves.push({k:'burst',x:p.x+p.w/2,y:p.y+p.h/2,dir,life:12,max:12});
    try{sfx('sawtooth',260,900,0.12,0.08);sfxNoise(0.12,0.06,1800);}catch(e){}
  }
  if(p._dash>0){
    p._dash--;p.vx=p._dashDir*MV.DASH_SPD*(p._dash<3?0.6:1);p.vy=-grav;
    if(frame%2===0)MV.ghosts.push({x:p.x,y:p.y,w:p.w,h:p.h,f:p._dashDir,life:14});
    // hit enemies you dash through
    for(const e of enemies){if(p._dashHits.includes(e))continue;if(p.x<e.x+e.w&&p.x+p.w>e.x&&p.y<e.y+e.h&&p.y+p.h>e.y){
      p._dashHits.push(e);e.hp-=1;e.inv=20;e.vy=(e.vy||0)-3;spawnParts(e.x+e.w/2,e.y+e.h/2,'#00FFEE',8);if(typeof feelStop==='function')feelStop(3);}}
    if(mvWallDir(p)===p._dashDir){p._dash=0;p._dashReady=true;}     // stop at walls
    if(p._dash===0)p.vx*=0.55;
    return true;
  }
  // ── ground pound hang ──
  if(p._poundHang>0){p._poundHang--;p.vx*=0.5;p.vy=-grav;if(p._poundHang===0){p.vy=16;try{sfxNoise(0.15,0.07,600);}catch(e){}}return true;}
  // ── wall slide ──
  const wd=p.grounded?0:mvWallDir(p),push=(wd===1&&_mvRight())||(wd===-1&&_mvLeft());
  p._wall=0;
  if(wd&&!wet){p._wallCoyote=6;p._wallSide=wd;if(push&&p.vy>0){p._wall=wd;p._dashReady=true;
    if(p.vy>MV.SLIDE_MAX)p.vy=Math.max(MV.SLIDE_MAX,p.vy*0.75)-grav;
    if(frame%4===0)MV.fx.push({k:'spark',x:p.x+(wd>0?p.w:0),y:p.y+p.h-4,vx:-wd*(0.3+Math.random()*0.6),vy:-Math.random()*0.8,life:14});}}
  else if(p._wallCoyote>0)p._wallCoyote--;
  // ── after a wall jump: keep the push-off for a moment ──
  if(p._wjLock>0){p._wjLock--;return true;}
  return false;
}
// called when jump is pressed in the air; returns true if it became a wall jump
function movesWallJump(p){
  if(p.grounded||!(p._wallCoyote>0)||p.wet)return false;
  const side=p._wallSide;p.vy=-11.2;p.vx=-side*6.2;p.facing=-side;p._wjLock=MV.WJ_LOCK;p._wallCoyote=0;p.jumps=1;p._stomping=false;p._dashReady=true;
  for(let i=0;i<6;i++)MV.fx.push({k:'spark',x:p.x+(side>0?p.w:0),y:p.y+p.h/2+(Math.random()-.5)*10,vx:-side*(1+Math.random()*2),vy:(Math.random()-.5)*2,life:16});
  MV.waves.push({k:'kick',x:p.x+(side>0?p.w:0),y:p.y+p.h/2,dir:side,life:12,max:12});
  if(typeof feelShake==='function')feelShake(1.5);
  return true;
}
// down pressed in the air
function movesPoundStart(p){p._stomping=true;p._poundHang=MV.POUND_HANG;p.vy=0;p._dash=0;try{sfx('sine',500,900,0.08,0.06);}catch(e){}}
// landed while pounding
function movesPound(p){
  const x=p.x+p.w/2,y=p.y+p.h;
  MV.waves.push({k:'wave',x,y,life:22,max:22});
  for(let s of[-1,1])for(let i=0;i<7;i++)MV.fx.push({k:'dust',x:x+s*(4+i*6),y:y-2,vx:s*(1.5+Math.random()*2.5),vy:-Math.random()*1.5,r:2+Math.random()*2.5,life:24,max:24});
  if(typeof feelShake==='function'){feelShake(7);feelKick(0,4);}
  try{sfxNoise(0.3,0.12,300);sfx('sine',120,40,0.25,0.12);}catch(e){}
  for(const e of enemies){const ex=e.x+e.w/2,ey=e.y+e.h;if(Math.abs(ex-x)<MV.POUND_R&&Math.abs(ey-y)<40){e.hp-=1;e.inv=20;e.vy=-6;e.vx=(e.vx||0)+Math.sign(ex-x||1)*2;spawnParts(ex,e.y+e.h/2,'#FFAA00',8);}}
  // crumble blocks next to the impact start to fall
  const r=Math.floor(y/TS)+0;for(let c=Math.floor((x-MV.POUND_R*0.6)/TS);c<=Math.floor((x+MV.POUND_R*0.6)/TS);c++){if(grid[r]&&grid[r][c]===42&&crumbleBlocks[c+','+r]===undefined)crumbleBlocks[c+','+r]=30;}
}
function mvReadyFx(p){MV.waves.push({k:'ready',x:p.x+p.w/2,y:p.y+p.h/2,life:12,max:12});}
function movesReset(){if(typeof grappleReset==='function')grappleReset();MV.fx.length=0;MV.ghosts.length=0;MV.waves.length=0;const p=player;p._dash=0;p._poundHang=0;p._wjLock=0;p._wallCoyote=0;p._dashReady=true;p._dashCd=0;}
function movesTick(){
  for(const f of MV.fx){f.life--;f.x+=f.vx;f.y+=f.vy;if(f.k==='spark')f.vy+=0.12;else if(f.k==='dust'){f.vx*=0.9;f.r+=0.06;}}
  MV.fx=MV.fx.filter(f=>f.life>0);for(const g of MV.ghosts)g.life--;MV.ghosts=MV.ghosts.filter(g=>g.life>0);
  for(const w of MV.waves)w.life--;MV.waves=MV.waves.filter(w=>w.life>0);
}
// ── drawing (world space) ──
function movesDrawBehind(){ // under the player: dash afterimages
  const p=player;
  for(const g of MV.ghosts){const a=g.life/14,x=g.x-camX+g.w/2,y=g.y-camY+g.h/2;cx.save();cx.globalAlpha=a*0.55;cx.globalCompositeOperation='lighter';
    cx.fillStyle='#00e0ff';cx.beginPath();cx.ellipse(x,y+1,g.w*0.62,g.h*0.5,0,0,7);cx.fill();cx.globalAlpha=a*0.9;cx.strokeStyle='#bff8ff';cx.lineWidth=1.2;cx.stroke();cx.restore();}
  if(p._dash>0){const x=p.x-camX+p.w/2,y=p.y-camY+p.h/2,d=p._dashDir;cx.save();cx.globalCompositeOperation='lighter';
    const g=cx.createLinearGradient(x,0,x-d*70,0);g.addColorStop(0,'rgba(120,240,255,0.55)');g.addColorStop(1,'rgba(120,240,255,0)');cx.fillStyle=g;cx.fillRect(Math.min(x,x-d*70),y-p.h*0.4,70,p.h*0.8);cx.restore();}
  if(p._poundHang>0){const x=p.x-camX+p.w/2,y=p.y-camY+p.h/2,k=1-p._poundHang/MV.POUND_HANG;cx.save();cx.strokeStyle=`rgba(255,190,60,${0.4+k*0.5})`;cx.lineWidth=2;
    cx.beginPath();cx.arc(x,y,16-k*6,frame*0.4,frame*0.4+Math.PI*1.4);cx.stroke();cx.restore();}
  if(p._stomping&&!p._poundHang&&p.vy>8){const x=p.x-camX+p.w/2,y=p.y-camY;cx.save();cx.globalCompositeOperation='lighter';
    const g=cx.createLinearGradient(0,y,0,y-60);g.addColorStop(0,'rgba(255,170,40,0.5)');g.addColorStop(1,'rgba(255,170,40,0)');cx.fillStyle=g;cx.fillRect(x-p.w*0.45,y-60,p.w*0.9,60);cx.restore();}
}
function movesDrawFront(){
  const p=player;
  for(const f of MV.fx){const x=f.x-camX,y=f.y-camY;
    if(f.k==='spark'){cx.fillStyle=`rgba(255,230,160,${f.life/14})`;cx.fillRect(x-1,y-1,2,2);}
    else{cx.globalAlpha=f.life/f.max*0.5;cx.fillStyle='#d8c8b0';cx.beginPath();cx.arc(x,y,f.r,0,7);cx.fill();cx.globalAlpha=1;}}
  for(const w of MV.waves){const k=1-w.life/w.max,x=w.x-camX,y=w.y-camY;cx.save();
    if(w.k==='wave'){cx.strokeStyle=`rgba(255,200,80,${1-k})`;cx.lineWidth=3*(1-k)+0.5;cx.beginPath();cx.ellipse(x,y-2,10+k*MV.POUND_R,4+k*10,0,Math.PI,0);cx.stroke();
      cx.globalAlpha=(1-k)*0.6;cx.fillStyle='rgba(255,220,140,0.6)';cx.fillRect(x-k*MV.POUND_R,y-2,k*MV.POUND_R*2,2);}
    else if(w.k==='burst'){cx.strokeStyle=`rgba(150,245,255,${1-k})`;cx.lineWidth=2;cx.beginPath();cx.ellipse(x-w.dir*k*10,y,4+k*6,10+k*10,0,0,7);cx.stroke();}
    else if(w.k==='kick'){cx.strokeStyle=`rgba(255,240,200,${1-k})`;cx.lineWidth=2;cx.beginPath();cx.arc(x,y,4+k*16,w.dir>0?Math.PI*0.5:-Math.PI*0.5,w.dir>0?Math.PI*1.5:Math.PI*0.5);cx.stroke();}
    else if(w.k==='ready'){cx.strokeStyle=`rgba(120,240,255,${(1-k)*0.8})`;cx.lineWidth=1.5;cx.beginPath();cx.arc(x,y,8+k*14,0,7);cx.stroke();}
    cx.restore();}
  // wall slide: blob squashes against the wall
}
// lights for the lighting system
function movesLights(){
  const p=player;
  if(p._dash>0)lightAdd(p.x+p.w/2,p.y+p.h/2,90,'#40e8ff',0.55);
  for(const g of MV.ghosts)if(g.life>10)lightAdd(g.x+g.w/2,g.y+g.h/2,40,'#40e8ff',0.2);
  for(const w of MV.waves){const k=w.life/w.max;if(w.k==='wave')lightAdd(w.x,w.y-6,90+(1-k)*60,'#ffaa33',k*0.75);else if(w.k==='burst')lightAdd(w.x,w.y,60,'#40e8ff',k*0.5);}
}
