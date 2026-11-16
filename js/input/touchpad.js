// Neon Platformer — Arc touch pad
// One control for the left thumb: a neon slider bar.
//   BAR (bottom)   analog: put your thumb down anywhere and slide left / right to run — the
//                  further you slide the faster. Quick TAP on a side = DASH that way.
//   DOT (centre)   quick tap = ground pound (in the air). Landing your thumb here and
//                  sliding just runs, like anywhere else on the bar.
//   Aiming is on the fire button: hold it and drag the way you want to shoot.
// Jump, fire and weapon switch stay on the right side. Settings → TOUCH MOVE switches
// between this pad and the old ← ↓ → buttons.
var TPAD={on:true,cv:null,g:null,w:240,h:156,ptr:{},keys:{left:false,right:false,down:false},aim:null,fire:false,
  knobX:null,amt:1,flash:0,flashDir:0,poundT:0,raf:0};
function _tpG(){const w=TPAD.w,h=TPAD.h,barH=h,barY=0,cx0=w/2;return{w,h,barH,barY,cx0,R:w/2-8,dotY:barY+barH/2,dotR:18};}
function tpadSetup(){
  const cv=document.getElementById('tpad');if(!cv)return;TPAD.cv=cv;TPAD.g=cv.getContext('2d');
  const sz=()=>{const d=Math.min(2,window.devicePixelRatio||1);TPAD.w=Math.round(Math.min(240,Math.max(180,window.innerWidth*0.27)));TPAD.h=56;
    cv.style.width=TPAD.w+'px';cv.style.height=TPAD.h+'px';cv.width=TPAD.w*d;cv.height=TPAD.h*d;TPAD.g.setTransform(d,0,0,d,0,0);};
  sz();window.addEventListener('resize',sz);
  const loc=e=>{const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
  cv.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();try{cv.setPointerCapture(e.pointerId);}catch(_){}
    const{x,y}=loc(e),G=_tpG();let role=null;
    role='move';   // thumb can land anywhere, the middle too — sliding from there runs
    if(!role)return;
    TPAD.ptr[e.pointerId]={role,x0:x,ox:x,t0:performance.now(),x,y};_tpApply();});
  cv.addEventListener('pointermove',e=>{const P=TPAD.ptr[e.pointerId];if(!P)return;e.preventDefault();const{x,y}=loc(e);P.x=x;P.y=y;_tpApply();});
  const up=e=>{const P=TPAD.ptr[e.pointerId];if(!P)return;e.preventDefault();delete TPAD.ptr[e.pointerId];
    if(P.role==='move'&&performance.now()-P.t0<220&&Math.abs(P.x-P.x0)<16){const G=_tpG();
      if(Math.abs(P.x0-G.cx0)<G.dotR+10){TPAD.poundReq=true;TPAD.poundFlash=1;}           // quick tap on the dot = ground pound
      else{const d=P.x<G.cx0?-1:1;touchKeys.dashReq=d;TPAD.flash=1;TPAD.flashDir=d;}      // quick tap on a side = dash
      if(MS.haptics&&navigator.vibrate){try{navigator.vibrate(12);}catch(_){}}}
    _tpApply();};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  ['touchstart','touchmove','touchend'].forEach(ev=>cv.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();},{passive:false}));
  window.addEventListener('blur',()=>{TPAD.ptr={};_tpApply();});
  tpadApplySetting();
  const loop=()=>{TPAD.raf=requestAnimationFrame(loop);if(cv.offsetParent)tpadDraw();};loop();
}
function _tpApply(){
  const G=_tpG(),k=TPAD.keys;k.left=k.right=k.down=false;TPAD.amt=1;TPAD.aim=null;TPAD.fire=false;TPAD.knobX=null;
  for(const id in TPAD.ptr){const P=TPAD.ptr[id];
    if(P.role==='move'){
      // analog stick: the point where your thumb lands is the centre; slide away from it to run.
      // The further you slide (up to ~46px) the faster. Pull back past the start to turn round.
      const MAXD=46;let dx=P.x-P.ox;if(Math.abs(dx)>MAXD){P.ox=P.x-Math.sign(dx)*MAXD;dx=P.x-P.ox;}
      if(dx<-6)k.left=true;else if(dx>6)k.right=true;
      TPAD.amt=Math.max(0.3,Math.min(1,(Math.abs(dx)-6)/(MAXD-12)));TPAD.knobX=P.x;TPAD.originX=P.ox;}
    else if(P.role==='pound')k.down=true;
    else if(P.role==='aim'){let ax=P.x-G.cx0,ay=P.y-G.dotY;const L=Math.hypot(ax,ay)||1;ax/=L;ay/=L;if(ay>0.35){ay=0.35;const n=Math.hypot(ax,ay);ax/=n;ay/=n;}
      TPAD.aim={x:ax,y:ay};}}
  touchKeys.aimV=TPAD.aim;touchKeys.padFire=TPAD.fire;
  if(typeof _tSync==='function')_tSync();
}
// run speed factor for the player (1 = full speed). Keyboard / buttons always give full speed.
function tpadSpeed(){return TPAD.on&&TPAD.knobX!=null&&!keys['ArrowLeft']&&!keys['ArrowRight']&&!keys['KeyA']&&!keys['KeyD']?TPAD.amt:1;}
// called once per game tick
function tpadTick(){
  if(TPAD.poundFlash>0)TPAD.poundFlash=Math.max(0,TPAD.poundFlash-0.06);
  if(TPAD.poundReq){TPAD.poundReq=false;const p=player;
    if(mode==='play'&&!p.grounded&&!p._stomping&&!(p._dash>0)){movesPoundStart(p);spawnParts(p.x+p.w/2,p.y+p.h,'#FFAA00',4);}}
  if(TPAD.flash>0)TPAD.flash=Math.max(0,TPAD.flash-0.08);
  // dragging the fire button = aim stick: keeps firing that way while held
  if(touchKeys.aimV2&&touchKeys.fire&&curW!=='plasma'&&mode==='play'&&!won&&!paused)fireWeapon();
  const ta=touchKeys.aimV2||touchKeys.aimV;if(ta&&Math.abs(ta.x)>0.15&&!touchKeys.left&&!touchKeys.right)player.facing=Math.sign(ta.x);
}
function tpadApplySetting(){
  const arc=typeof MS==='undefined'||MS.tpadArc!==false;TPAD.on=arc;
  const L=document.getElementById('tzoneL'),C=TPAD.cv;if(L)L.style.display=arc?'none':'';if(C)C.style.display=arc?'block':'none';
  if(!arc){TPAD.ptr={};_tpApply();}
}
function tpadDraw(){
  const g=TPAD.g,G=_tpG(),t=performance.now()/1000,k=TPAD.keys;g.clearRect(0,0,G.w,G.h);
  const neon=(col,blur,w)=>{g.shadowColor=col;g.shadowBlur=blur;g.strokeStyle=col;g.lineWidth=w;};
  // bar
  g.save();const bx=6,bw=G.w-12,by=G.barY+2,bh=G.barH-6;g.beginPath();g.roundRect(bx,by,bw,bh,bh/2);g.fillStyle='rgba(10,8,30,0.45)';g.fill();neon('#ffcc33',8,2);g.globalAlpha=0.8;g.stroke();g.globalAlpha=1;
  const arrow=(dir,on)=>{const ax=G.cx0+dir*(G.w*0.29),ay=G.dotY,fl=TPAD.flashDir===dir?TPAD.flash:0;g.save();g.globalAlpha=on||fl?1:0.5;
    neon(fl?'#7ff6ff':'#ffcc33',on||fl?14:4,on||fl?3:2);g.lineCap='round';g.lineJoin='round';
    const len=G.w*0.14;g.beginPath();g.moveTo(ax-dir*len,ay);g.lineTo(ax+dir*len*0.6,ay);g.moveTo(ax+dir*len*0.6-dir*9,ay-9);g.lineTo(ax+dir*len*0.6,ay);g.lineTo(ax+dir*len*0.6-dir*9,ay+9);g.stroke();
    if(fl){g.globalAlpha=fl;g.beginPath();g.moveTo(ax+dir*len*0.6+dir*6-dir*9,ay-9);g.lineTo(ax+dir*len*0.6+dir*6,ay);g.lineTo(ax+dir*len*0.6+dir*6-dir*9,ay+9);g.stroke();}
    g.restore();};
  arrow(-1,k.left);arrow(1,k.right);
  if(TPAD.knobX!=null){const x1=TPAD.originX,x2=TPAD.knobX;g.strokeStyle='rgba(255,230,160,0.55)';g.lineWidth=1.5;g.beginPath();g.arc(x1,G.dotY,7,0,7);g.stroke();const fg=g.createLinearGradient(x1,0,x2,0);fg.addColorStop(0,'rgba(255,204,51,0.05)');fg.addColorStop(1,`rgba(255,204,51,${0.15+TPAD.amt*0.3})`);
    g.fillStyle=fg;g.fillRect(Math.min(x1,x2),G.dotY-8,Math.abs(x2-x1),16);g.fillStyle='rgba(255,220,120,0.25)';g.shadowColor='#ffcc33';g.shadowBlur=14;g.beginPath();g.arc(TPAD.knobX,G.dotY,11+TPAD.amt*6,0,7);g.fill();}
  g.restore();
  // centre dot
  g.save();const pf=TPAD.poundFlash||0,dn=k.down||pf>0;const p=dn?1:0.5+0.15*Math.sin(t*3);g.shadowColor=dn?'#ff9a3c':'#ffcc33';g.shadowBlur=dn?20:10;
  g.fillStyle=dn?'#ffb050':'rgba(255,204,51,0.85)';g.beginPath();g.arc(G.cx0,G.dotY,G.dotR*(dn?0.85:0.62),0,7);g.globalAlpha=p+0.3;g.fill();
  g.globalAlpha=1;g.strokeStyle='rgba(255,230,160,0.9)';g.lineWidth=1.5;g.beginPath();g.arc(G.cx0,G.dotY,G.dotR,0,7);g.stroke();
  g.fillStyle='#1a1020';g.beginPath();g.moveTo(G.cx0-5,G.dotY-3);g.lineTo(G.cx0+5,G.dotY-3);g.lineTo(G.cx0,G.dotY+4);g.closePath();g.fill();
  g.restore();
}

// aim sight in the world: a dotted line from the blob while you're aiming by touch
function tpadDrawSight(){const hk=!!touchKeys.hookAim,ta=touchKeys.hookAim||touchKeys.aimV2||touchKeys.aimV;if(!ta||mode!=='play')return;const p=player,x=p.x+p.w/2-camX,y=p.y+p.h/2-camY;
  cx.save();cx.lineCap='round';for(let i=0;i<9;i++){const d=22+i*13;cx.globalAlpha=0.75*(1-i/9);cx.fillStyle=hk?'#7ff6ff':'#ffd24a';cx.beginPath();cx.arc(x+ta.x*d,y+ta.y*d,i===0?2.2:1.6,0,7);cx.fill();}cx.restore();}
