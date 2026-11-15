// Neon Platformer — Smooth, sharp rendering (V5.5)
// 1) Sharp: the canvas is drawn at the screen's real pixel density (up to 2×)
//    instead of being stretched by the browser.
// 2) Smooth: the game still thinks at a fixed 60 ticks/sec, but every screen
//    refresh is drawn, with moving things placed between their last two ticks
//    (interpolation). No more skipped/doubled frames, and 90/120/144 Hz screens
//    get genuinely smoother motion.
// 3) Stable: the camera is snapped to whole screen pixels, so thin neon edges
//    don't shimmer while scrolling.
var DPR=1,_dprCap=2,_slowFrames=0;
function applyCanvasSize(){
  DPR=Math.max(1,Math.min(_dprCap,window.devicePixelRatio||1));
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  cv.style.width=W+'px';cv.style.height=H+'px';
  cx.setTransform(DPR,0,0,DPR,0,0);
}
// lists of things that move every tick and should be drawn in-between ticks
function _smoothLists(){
  const L=[enemies,bullets,eBullets,movPlats,grenades,powerOrbs];
  if(typeof enemyBombs!=='undefined')L.push(enemyBombs);
  if(typeof fallingRocks!=='undefined')L.push(fallingRocks);
  return L;
}
// remember where everything was before a tick
function smoothSnapshot(){
  player._px=player.x;player._py=player.y;
  window._pcamX=camX;window._pcamY=camY;
  for(const L of _smoothLists())for(const o of L){o._px=o.x;o._py=o.y;}
}
// draw with everything placed `a` of the way from its previous tick to its current one
function drawSmooth(a){
  if(mode!=='play'){draw();return;}
  a=Math.max(0,Math.min(1,a));
  const moved=[];
  const lerp=o=>{if(o._px===undefined)return;const dx=o.x-o._px,dy=o.y-o._py;if(dx*dx+dy*dy>80*80)return;   // teleports/respawns snap
    moved.push(o,o.x,o.y);o.x=o._px+dx*a;o.y=o._py+dy*a;};
  lerp(player);for(const L of _smoothLists())for(const o of L)lerp(o);
  const rx=camX,ry=camY,jump=Math.abs(camX-window._pcamX)>200||Math.abs(camY-window._pcamY)>200;
  if(!jump&&window._pcamX!==undefined){camX=window._pcamX+(camX-window._pcamX)*a;camY=window._pcamY+(camY-window._pcamY)*a;}
  try{draw();}
  finally{camX=rx;camY=ry;for(let i=0;i<moved.length;i+=3){moved[i].x=moved[i+1];moved[i].y=moved[i+2];}}
}
// snap the camera to whole device pixels for the duration of a draw
function withPixelCamera(fn){const rx=camX,ry=camY;camX=Math.round(camX*DPR)/DPR;camY=Math.round(camY*DPR)/DPR;try{fn();}finally{camX=rx;camY=ry;}}
// if a device can't keep up at full sharpness, step down once (2× → 1.5× → 1×)
var _bgAuto=false;
function smoothPerf(frameMs){
  if(DPR<=1||mode!=='play'||paused)return;
  // a run of frames slower than ~45 fps means this device can't keep up at this sharpness
  _slowFrames=frameMs>22?_slowFrames+1:Math.max(0,_slowFrames-1);
  if(_slowFrames>45){_slowFrames=0;
    // V6.6 stay sharp: first make the lighting cheaper, only drop the resolution as a last resort
    if(typeof LIGHT!=='undefined'&&LIGHT.on&&LIGHT.sc>0.2){LIGHT.sc=0.2;return;}
    if(typeof MS!=='undefined'&&!MS.bgLite&&typeof togS==='function'&&!_bgAuto){_bgAuto=true;MS.bgLite=true;return;}
    _dprCap=DPR>1.5?1.5:1;applyCanvasSize();}
}
if(window.matchMedia)try{matchMedia('(resolution: '+(window.devicePixelRatio||1)+'dppx)').addEventListener('change',()=>applyCanvasSize());}catch(e){}
