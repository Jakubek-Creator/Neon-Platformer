// Neon Platformer — Game feel
// Smooth "trauma" screen shake, hit-stop (tiny freeze on hits), slow motion on boss
// kills, a camera that looks ahead the way you run, hurt / flash overlays and
// falling speed streaks. FEEL.on=false turns all of it off.
var FEEL={on:!(typeof MS!=='undefined'&&MS.feel===false),trauma:0,kx:0,ky:0,stop:0,slow:1,slowT:0,slowMax:1,look:0,flash:0,flashCol:'#ffffff',hurt:0,
  pg:false,pvy:0,streaks:[]};
function feelShake(a){FEEL.trauma=Math.min(1,FEEL.trauma+a/16);}
function feelKick(dx,dy){FEEL.kx+=dx;FEEL.ky+=dy;}
function feelStop(n){}   // hit-stop removed: the game never pauses on hits or kills
function feelSlow(scale,ticks){if(FEEL.on){FEEL.slow=scale;FEEL.slowT=FEEL.slowMax=ticks;}}
function feelFlash(col,a){if(FEEL.on){FEEL.flash=Math.max(FEEL.flash,a);FEEL.flashCol=col;}}
function feelReset(){FEEL.trauma=0;FEEL.kx=FEEL.ky=0;FEEL.stop=0;FEEL.slow=1;FEEL.slowT=0;FEEL.flash=0;FEEL.hurt=0;FEEL.streaks.length=0;}
// loop helpers: time scale for slow motion, and the hit-stop gate (false = skip this tick)
function feelTimeScale(){return FEEL.on&&mode==='play'?FEEL.slow:1;}
function feelGate(){if(FEEL.stop>0&&mode==='play'){FEEL.stop--;return false;}return true;}
// events (called from the game)
function feelEnemyDied(e){if(!FEEL.on)return;
  const boss=e.type==='sentinel'||e.type==='hive'||e.type==='warden',big=e.w>40;
  if(boss){feelStop(10);feelShake(14);feelSlow(0.25,70);feelFlash('#ffffff',0.55);}
  else{feelStop(big?6:4);feelShake(big?7:4);feelFlash(ENEMY_COL&&ENEMY_COL[e.type]||'#ffffff',0.08);}}
function feelHurt(){if(!FEEL.on)return;feelShake(5);   // no freeze when you get hit
 FEEL.hurt=1;feelFlash('#ff2040',0.22);}
function feelDeath(){if(!FEEL.on)return;feelSlow(0.35,45);feelShake(10);}
// once per game tick
function feelTick(){
  if(FEEL.slowT>0){FEEL.slowT--;const k=1-FEEL.slowT/FEEL.slowMax;FEEL.slow=FEEL.slow+(1-FEEL.slow)*(k*k*0.12);if(FEEL.slowT<=0)FEEL.slow=1;}
  FEEL.trauma=Math.max(0,FEEL.trauma-0.022);FEEL.kx*=0.78;FEEL.ky*=0.78;
  FEEL.flash*=0.84;if(FEEL.flash<0.01)FEEL.flash=0;FEEL.hurt*=0.93;if(FEEL.hurt<0.01)FEEL.hurt=0;
  if(mode!=='play')return;
  const p=player;
  // look-ahead: running left slides the view so you can see where you're going
  const want=p.vx<-1.2?-W*0.3:p.vx>1.2?0:FEEL.look;FEEL.look+=(want-FEEL.look)*0.035;
  // heavy landing thump
  if(p.grounded&&!FEEL.pg&&FEEL.pvy>13)feelShake(Math.min(6,(FEEL.pvy-11)*1.2)),feelKick(0,2);
  FEEL.pg=p.grounded;FEEL.pvy=p.vy;
  // speed streaks when falling fast or speed-boosted
  const fast=p.vy>9||(pups.speed>0&&Math.abs(p.vx)>4);
  if(FEEL.on&&fast&&frame%2===0)FEEL.streaks.push({x:p.x+p.w/2+(Math.random()-.5)*40,y:p.y+(p.vy>9?p.h+10:p.h/2+(Math.random()-.5)*20),
    vx:p.vy>9?0:-p.vx*0.6,vy:p.vy>9?-p.vy*0.5:0,len:p.vy>9?p.vy*2.5:Math.abs(p.vx)*4,life:10});
  for(const s of FEEL.streaks){s.x+=s.vx;s.y+=s.vy;s.life--;}FEEL.streaks=FEEL.streaks.filter(s=>s.life>0);
}
// draw: set the shake offset (smooth noise, not random jitter) — called right before the world is drawn
function feelPreDraw(){
  if(!FEEL.on)return;
  const t=performance.now(),a=FEEL.trauma*FEEL.trauma*14;
  shakeX=a*(Math.sin(t*0.037)+Math.sin(t*0.061+1.7)*0.6)/1.6+FEEL.kx;
  shakeY=a*(Math.sin(t*0.043+0.6)+Math.sin(t*0.071+2.9)*0.6)/1.6+FEEL.ky;
}
// world-space extras (inside the camera transform)
function feelDrawWorld(){
  if(!FEEL.on||!FEEL.streaks.length)return;
  cx.save();cx.lineCap='round';cx.lineWidth=1.5;
  for(const s of FEEL.streaks){const x=s.x-camX,y=s.y-camY,vert=s.vy!==0;cx.strokeStyle=`rgba(200,240,255,${s.life/10*0.45})`;cx.beginPath();
    if(vert){cx.moveTo(x,y);cx.lineTo(x,y+s.len);}else{cx.moveTo(x,y);cx.lineTo(x+Math.sign(s.vx||1)*s.len,y);}cx.stroke();}
  cx.restore();
}
// screen-space overlays (after the world)
var _feelVig=null;
function feelDrawOverlay(){
  if(!FEEL.on)return;
  if(FEEL.flash>0){cx.save();cx.globalCompositeOperation='lighter';cx.globalAlpha=FEEL.flash*0.6;cx.fillStyle=FEEL.flashCol;cx.fillRect(0,0,W,H);cx.restore();}
  const slowK=FEEL.slow<1?(1-FEEL.slow):0;
  if(FEEL.hurt>0||slowK>0){
    if(!_feelVig||_feelVig.w!==W||_feelVig.h!==H){const mk=col=>{const c=document.createElement('canvas');c.width=256;c.height=Math.max(64,Math.round(256*H/W));const g=c.getContext('2d'),
      gr=g.createRadialGradient(c.width/2,c.height/2,c.height*0.35,c.width/2,c.height/2,c.width*0.62);gr.addColorStop(0,`rgba(${col},0)`);gr.addColorStop(1,`rgba(${col},1)`);g.fillStyle=gr;g.fillRect(0,0,c.width,c.height);return c;};
      _feelVig={dark:mk('0,0,0'),red:mk('200,10,40'),w:W,h:H};}
    cx.save();
    if(slowK>0){cx.globalAlpha=Math.min(0.75,slowK*0.9);cx.drawImage(_feelVig.dark,0,0,W,H);}
    if(FEEL.hurt>0){cx.globalAlpha=FEEL.hurt*0.75;cx.drawImage(_feelVig.red,0,0,W,H);}
    cx.restore();
  }
}
