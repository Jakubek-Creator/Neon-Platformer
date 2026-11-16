// Neon Platformer — Grappling hook
// Own button: C or Shift (gamepad Y / triggers, touch: hook button).
//   HOLD  → the hook catches a block and you SWING. ←/→ pump, ↑/↓ (W/S) reel in / out.
//           Let go at any time: you fly off with a boost and a flip — throw again in
//           mid-air to chain swings. Space = vault straight up off the rope.
//   TAP   → it PULLS you to the block. At a ledge you flip up on top of it.
//   ENEMY → yanks it to you and stuns it for a moment (no damage).
// It has to be FOUND first: the ⚓ pickup (editor: WEAPONS → Grapple, tile 62).
// Aim: with nothing (or just ←/→) held the hook finds a good block up ahead by itself.
// ↑ = straight up, ↑+←/→ = diagonal, fire-button drag (phone) = exact aim.
const GH={st:'idle',x:0,y:0,vx:0,vy:0,ax:0,ay:0,bc:0,br:0,len:0,lenT:0,t:0,cd:0,enemy:null,spd:28,range:360,pull:12.5,fx:[],prevKey:false,stuck:0,lastD:0,_pj:false};
function _ghKey(){return keys['KeyC']||keys['ShiftLeft']||keys['ShiftRight']||touchKeys.hook;}
function _ghGrab(t){return solid(t)||t===42||t===40||t===41;}
// distance to the first block along a direction (or 0 if none in range)
function _ghRay(x,y,ax,ay){for(let d=16;d<=GH.range;d+=8){const tx=x+ax*d,ty=y+ay*d;if(ty<0||tx<0||tx>COLS*TS)return 0;if(_ghGrab(tileAt(tx,ty)))return d;}return 0;}
function _ghAim(p){
  const ta=touchKeys.aimV2||touchKeys.aimV;if(ta)return{x:ta.x,y:ta.y};
  const px=p.x+p.w/2,py=p.y+p.h/2;
  const up=keys['ArrowUp']||keys['KeyW'],dn=keys['ArrowDown']||keys['KeyS'],l=keys['ArrowLeft']||keys['KeyA']||touchKeys.left,r=keys['ArrowRight']||keys['KeyD']||touchKeys.right;
  const hx=r?1:l?-1:0;
  if(up){const L=Math.hypot(hx,1);return{x:hx/L,y:-1/L};}
  if(dn&&!p.grounded){const L=Math.hypot(hx,1);return{x:hx/L,y:1/L};}
  const dir=hx||(Math.abs(p.vx)>1.5?Math.sign(p.vx):p.facing);
  // an enemy right ahead? hook it
  for(const e of enemies){const ex=e.x+e.w/2-px,ey=e.y+e.h/2-py;if(ex*dir>24&&ex*dir<GH.range*0.8&&Math.abs(ey)<46){const L=Math.hypot(ex,ey);if(!_ghRay(px,py,ex/L,ey/L)||_ghRay(px,py,ex/L,ey/L)>L)return{x:ex/L,y:ey/L};}}
  // aim assist: look for a block up ahead, best swing angles first
  let best=null,bs=1e9;for(const deg of[52,42,62,33,72,24,82,16]){const a=deg*Math.PI/180,ax=Math.cos(a)*dir,ay=-Math.sin(a),d=_ghRay(px,py,ax,ay);if(!d)continue;
    const sc=Math.abs(d-185)+Math.abs(deg-50)*1.2+(d<90?150:0);if(sc<bs){bs=sc;best={x:ax,y:ay};}}   // prefer a rope long enough for a real swing
  if(best)return best;
  return{x:dir*0.7,y:-0.7};
}
// hooked near the edge of a platform from below? then aim the pull at the side of the edge block, so you can flip up on top
function _ghLedge(p,px,py){GH.ledge=0;if(py<=GH.br*TS)return false;const sd=px<GH.bc*TS+TS/2?-1:1,G=(c,r)=>_ghGrab(tileAt(c*TS+TS/2,r*TS+TS/2));
  for(let i=0;i<4;i++){const c=GH.bc+sd*i;if(!G(c,GH.br)||G(c,GH.br-1))break;
    if(!G(c+sd,GH.br)&&!G(c+sd,GH.br-1)&&!G(c+sd,GH.br+1)){GH.ledge=sd;GH.ax=c*TS+TS/2+sd*(TS/2+p.w/2+3);GH.ay=GH.br*TS+TS/2;GH.x=GH.ax-sd*(p.w/2+3);GH.y=GH.ay;return true;}}
  return false;}
function _ghFlip(p){if(typeof PA!=='undefined'){PA.flipT=0;PA.flipDir=Math.abs(p.vx)>0.5?Math.sign(p.vx):p.facing;}}
function ghFire(p){
  const a=_ghAim(p);GH.st='fly';GH.x=p.x+p.w/2;GH.y=p.y+p.h/2;GH.vx=a.x*GH.spd;GH.vy=a.y*GH.spd;GH.t=0;GH.enemy=null;GH.ledgeT=0;
  if(Math.abs(a.x)>0.2)p.facing=Math.sign(a.x);
  try{sfx('square',900,300,0.08,0.05);}catch(e){}
}
// let go of the rope. kind: 'fly' (released the button), 'vault' (jump), 'pull' (pull finished), 'drop'
function ghRelease(p,kind){
  if(kind==='fly'){const sp=Math.hypot(p.vx,p.vy);if(sp>2.5){p.vx*=1.12;p.vy*=1.12;if(p.vy<2)p.vy-=2.6;_ghFlip(p);}p._fling=45;p.jumps=1;}
  else if(kind==='vault'){p.vy=Math.min(p.vy-3,-9.5);p._fling=30;p.jumps=1;_ghFlip(p);}
  else if(kind==='pull'){
    if(GH.ledge&&Math.hypot(GH.ax-p.x-p.w/2,GH.ay-p.y-p.h/2)<34){p.vy=-10;p.vx=-GH.ledge*3.8;p._fling=18;GH.ledgeT=18;GH.ledgeDir=-GH.ledge;p.facing=-GH.ledge;_ghFlip(p);}   // flip up onto the ledge
    else p.vy=Math.min(p.vy,-6.5);
    p.jumps=Math.min(p.jumps,1);}
  GH.st='back';GH.cd=3;GH.enemy=null;
}
// called from movesPre each tick; returns true while it controls the player
function grappleTick(p,grav){
  if(!hasHook){GH.prevKey=false;if(GH.st!=='idle')GH.st='idle';return false;}
  const k=_ghKey(),press=k&&!GH.prevKey;GH.prevKey=k;
  if(GH.cd>0)GH.cd--;
  const px=p.x+p.w/2,py=p.y+p.h/2;
  const alive=typeof deathSeqTimer==='undefined'||deathSeqTimer<=0;
  if(!alive){if(GH.st!=='idle')GH.st='back';}
  else if(press&&(GH.st==='idle'||GH.st==='back')&&GH.cd<=0&&!(p._dash>0)&&!(p._poundHang>0))ghFire(p);
  else if(press&&GH.st==='pull')ghRelease(p,'pull');
  // ── swinging: the rope keeps you at most GH.len from the anchor ──
  if(GH.st==='swing'){
    if(!k){ghRelease(p,'fly');return false;}
    if(_ghJump()){if(_ghLedge(p,px,py)){GH.st='pull';GH.t=0;GH.stuck=0;GH.lastD=1e9;}else{ghRelease(p,'vault');return false;}}   // Space: at a platform edge → up and over; otherwise vault
    if(GH.st==='swing'){
    const up=keys['ArrowUp']||keys['KeyW'],dn=keys['ArrowDown']||keys['KeyS'],reel=(up?-1:dn?1:0)+(touchKeys.reel||0);
    GH.lenT=Math.max(36,Math.min(GH.range,GH.lenT+reel*3.2));
    GH.len+=Math.max(-5,Math.min(5,GH.lenT-GH.len));                           // rope length changes smoothly, never snaps
    const l=keys['ArrowLeft']||keys['KeyA']||touchKeys.left,r=keys['ArrowRight']||keys['KeyD']||touchKeys.right;
    let vx=p.vx,vy=p.vy+grav*0.6;                                             // lighter gravity = floaty swing
    const ax=GH.ax-px,ay=GH.ay-py,d=Math.hypot(ax,ay)||1;
    if(l||r){const tx=-ay/d,ty=ax/d,dir=(r?1:-1)*(tx>=0?1:-1);vx+=tx*dir*0.22;vy+=ty*dir*0.22;}   // pump along the swing
    let nx=px+vx,ny=py+vy;const dx=nx-GH.ax,dy=ny-GH.ay,nd=Math.hypot(dx,dy);
    if(nd>GH.len){nx=GH.ax+dx/nd*GH.len;ny=GH.ay+dy/nd*GH.len;vx=nx-px;vy=ny-py;}
    const sp=Math.hypot(vx,vy);if(sp>10.5){vx*=10.5/sp;vy*=10.5/sp;}
    p.vx=vx;p.vy=vy-grav;p.grounded=false;p._stomping=false;p._fling=0;GH.t++;
    if(Math.abs(p.vx)>0.8)p.facing=Math.sign(p.vx);
    return true;}
  }
  if(GH.st==='fly'){
    // move the head in small steps so it can't pass through thin blocks
    for(let s=0;s<5&&GH.st==='fly';s++){GH.x+=GH.vx/5;GH.y+=GH.vy/5;
      if(_ghGrab(tileAt(GH.x,GH.y))){
        GH.bc=Math.floor(GH.x/TS);GH.br=Math.floor(GH.y/TS);GH.ax=GH.x-GH.vx/5*0.5;GH.ay=GH.y-GH.vy/5*0.5;
        GH.st=k?'swing':'pull';GH.t=0;GH.stuck=0;GH.lastD=1e9;p._stomping=false;p._dash=0;
        GH._pj=keys['Space']||touchKeys.jump||(!k&&(keys['ArrowUp']||keys['KeyW']));
        GH.ledge=0;if(!k)_ghLedge(p,px,py);
        const dist=Math.hypot(GH.ax-px,GH.ay-py);GH.len=Math.max(36,dist);GH.lenT=GH.len*(p.grounded?0.8:0.97);
        // keep the bottom of the swing clear of the floor under the anchor
        GH.lenT=Math.min(GH.lenT,200);                                        // long throws reel you in: quicker, tighter swings
        for(let y=GH.ay+TS;y<GH.ay+GH.len+TS*2;y+=TS/2){const tt=tileAt(GH.ax,y);if(_ghGrab(tt)||tt===3||tt===45||tt===4||tt===2){GH.lenT=Math.min(GH.lenT,Math.floor(y/TS)*TS-GH.ay-p.h/2-14);break;}}
        GH.lenT=Math.max(36,GH.lenT);
        for(let i=0;i<6;i++)GH.fx.push({x:GH.x,y:GH.y,vx:(Math.random()-.5)*3,vy:(Math.random()-.5)*3,life:14});
        if(typeof feelShake==='function')feelShake(1.2);try{sfx('square',220,140,0.06,0.06);}catch(e){}break;}
      for(const e of enemies){if(GH.x>e.x&&GH.x<e.x+e.w&&GH.y>e.y&&GH.y<e.y+e.h){GH.st='yank';GH.enemy=e;GH.t=0;e._ghStun=50;
        spawnParts(GH.x,GH.y,'#7ff6ff',8);if(typeof feelStop==='function')feelStop(3);try{sfx('square',300,600,0.08,0.06);}catch(e2){}break;}}
    }
    if(GH.st==='fly'&&(Math.hypot(GH.x-px,GH.y-py)>GH.range||GH.x<0||GH.y<0||GH.x>COLS*TS||GH.y>ROWS*TS))GH.st='back';
    if(GH.st==='swing')return grappleSwingStart(p);
  }
  if(GH.st==='pull'){
    GH.t++;let dx=GH.ax-px,dy=GH.ay-py;const d=Math.hypot(dx,dy);
    if(GH.ledge&&(px-GH.ax)*GH.ledge<-3&&py>GH.br*TS+TS)dy=Math.min(0,dy)*0.15;      // under the platform: slide out past the edge first
    if(_ghJump()||d<22||GH.t>70)ghRelease(p,'pull');
    else{
      const sp=Math.min(GH.pull,3+GH.t*1.2),dn=Math.hypot(dx,dy)||1;p.vx=dx/dn*sp;p.vy=dy/dn*sp-grav;p.grounded=false;p._fling=0;
      if(d>GH.lastD-0.5){if(++GH.stuck>8)ghRelease(p,'pull');}else GH.stuck=0;GH.lastD=d;
      if(GH.st==='pull')return true;
    }
  }
  if(GH.st==='yank'){
    const e=GH.enemy;GH.t++;
    if(!e||!enemies.includes(e)||e.hp<=0||GH.t>24){GH.st='back';GH.cd=8;GH.enemy=null;}
    else{const dx=px-(e.x+e.w/2),dy=py-(e.y+e.h/2),d=Math.hypot(dx,dy)||1;if(d>34){const sp=Math.min(9,d*0.25);e.x+=dx/d*sp;e.y+=dy/d*sp*0.6;}GH.x=e.x+e.w/2;GH.y=e.y+e.h/2;if(d<=34){GH.st='back';GH.cd=8;GH.enemy=null;}}
  }
  if(GH.ledgeT>0){GH.ledgeT--;if(p.grounded&&GH.ledgeT<12)GH.ledgeT=0;else p.vx=GH.ledgeDir*3.8;}   // carry you over the edge onto the platform
  if(GH.st==='back'){const dx=px-GH.x,dy=py-GH.y,d=Math.hypot(dx,dy);if(d<40)GH.st='idle';else{GH.x+=dx/d*36;GH.y+=dy/d*36;}}
  return false;
}
function grappleSwingStart(p){return false;}   // first swing tick happens next frame (keeps this frame's motion)
function _ghJump(){const jk=keys['Space']||touchKeys.jump||(GH.st==='pull'&&(keys['ArrowUp']||keys['KeyW']));const r=jk&&!GH._pj;GH._pj=jk;return r;}
function grappleTickFx(){for(const f of GH.fx){f.x+=f.vx;f.y+=f.vy;f.life--;}GH.fx=GH.fx.filter(f=>f.life>0);
  for(const e of enemies)if(e._ghStun>0){e._ghStun--;e.vx=(e.vx||0)*0.6;}}
function grappleReset(){GH.ledgeT=0;GH.st='idle';GH.cd=0;GH.enemy=null;GH.fx.length=0;}
// drawing (world space, after the player)
function grappleDraw(){
  for(const f of GH.fx){cx.fillStyle=`rgba(180,250,255,${f.life/14})`;cx.fillRect(f.x-camX-1,f.y-camY-1,2,2);}
  if(GH.st==='idle')return;const p=player,x0=p.x+p.w/2-camX,y0=p.y+p.h/2-camY;
  const hx=GH.st==='swing'||GH.st==='pull'?GH.ax:GH.x,hy=GH.st==='swing'||GH.st==='pull'?GH.ay:GH.y,x1=hx-camX,y1=hy-camY;
  const d=Math.hypot(x1-x0,y1-y0),taut=GH.st==='pull'||GH.st==='yank'||(GH.st==='swing'&&d>GH.len-6),sag=taut?0:Math.min(18,d*0.12);
  const mx=(x0+x1)/2,my=(y0+y1)/2+sag;
  cx.save();cx.lineCap='round';
  cx.strokeStyle='rgba(64,232,255,0.35)';cx.lineWidth=4;cx.beginPath();cx.moveTo(x0,y0);cx.quadraticCurveTo(mx,my,x1,y1);cx.stroke();
  cx.strokeStyle=taut?'#e8ffff':'#7ff6ff';cx.lineWidth=1.4;cx.setLineDash(GH.st==='fly'||GH.st==='back'?[4,3]:[]);cx.lineDashOffset=-frame;cx.stroke();cx.setLineDash([]);
  // the claw
  const ang=Math.atan2(y1-y0,x1-x0);cx.translate(x1,y1);cx.rotate(ang);cx.shadowBlur=10;cx.shadowColor='#40e8ff';cx.strokeStyle='#bff8ff';cx.lineWidth=2;
  const open=GH.st==='fly'?1:0.4;cx.beginPath();cx.moveTo(-4,0);cx.lineTo(3,0);cx.moveTo(3,0);cx.lineTo(7,-4*open-1);cx.moveTo(3,0);cx.lineTo(7,4*open+1);cx.stroke();
  cx.fillStyle='#fff';cx.beginPath();cx.arc(0,0,2.2,0,7);cx.fill();cx.restore();
}
function grappleLights(){if(GH.st==='swing'){const p=player,n=5;for(let i=1;i<n;i++)lightAdd(p.x+p.w/2+(GH.ax-p.x-p.w/2)*i/n,p.y+p.h/2+(GH.ay-p.y-p.h/2)*i/n,30,'#40e8ff',0.2);}if(GH.st!=='idle')lightAdd(GH.x,GH.y,46,'#40e8ff',0.45);}

// touch: only show the ⚓ button once you have the hook
function _ghBtn(){const b=document.getElementById('tb-hook');if(b)b.style.display=hasHook?'':'none';}
window.addEventListener('load',()=>setTimeout(_ghBtn,0));
