// Neon Platformer — Fixed-timestep game loop
// ── LOOP ──
// cap to ~60fps so 120/144Hz monitors don't run the game at double speed
let _lastFrameTime=0;
// fixed 60Hz simulation: physics is per-tick, so 90/120Hz screens no
// longer slow the game down (90Hz used to run at ~45 ticks/sec) and
// slow devices catch up instead of running in slow motion.
function _isTouch(){return matchMedia('(pointer:coarse)').matches;}
var _loopErrN=0;
function _loopErr(e){ // report the first few errors, but never let one stop the loop
  if(_loopErrN++<3)setTimeout(function(){throw e;},0);
}
var TICK_MS=1000/60,_loopOn=false,_acc=0,_portraitMQ=window.matchMedia('(orientation:portrait) and (pointer:coarse)');
// On phones, go fullscreen + landscape when a game starts (Android; iOS ignores it).
function goImmersive(){
  if(!matchMedia('(pointer:coarse)').matches||matchMedia('(display-mode:standalone)').matches)return;
  var de=document.documentElement,rf=de.requestFullscreen||de.webkitRequestFullscreen;
  if(!rf||document.fullscreenElement)return;
  try{var pr=rf.call(de);if(pr&&pr.then)pr.then(function(){if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(function(){});}).catch(function(){});}catch(e){}
}
function loop(ts){
  requestAnimationFrame(loop);
  if(ts==null)ts=performance.now();
  var dt=_lastFrameTime?ts-_lastFrameTime:16.67;_lastFrameTime=ts;
  musicSync();
  if(mOn)return;                       // menu is up: don't simulate behind it
  try{pollGamepad();}catch(e){_gpOff=true;}
  _acc+=Math.min(dt,100)*feelTimeScale();
  var n=0;
  try{
    // exact 60 Hz step (16.667 was a hair too long, so ~half of all 60 Hz frames
    // ran no tick and the next ran two — a freeze then a jump)
    while(_acc>=TICK_MS-0.05&&n<4){smoothSnapshot();if(feelGate()){update();audioWatch();playerAnimTick();enemyAnimTick();tilesTick();movesTick();tpadTick();skinTick();twistTick();grappleTickFx();heatTick();}feelTick();_acc-=TICK_MS;n++;}
    if(n===4)_acc=0;
    if(_acc<0)_acc=0;
    // draw on every screen refresh, placing moving things between ticks
    drawSmooth(paused||won?1:Math.min(1,_acc/TICK_MS));smoothPerf(dt);
  }catch(e){_acc=0;_loopErr(e);}
}
