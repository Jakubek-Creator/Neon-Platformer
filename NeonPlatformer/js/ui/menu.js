// Neon Platformer — Main menu, settings, save slots, credits
// ====== MENU SYSTEM V1.3 ======
var mEl   = document.getElementById('menu');
var mBg   = document.getElementById('menuBg');
var mCtx  = mBg.getContext('2d');
var mOn   = true;
var mScrn = 'intro';
var mPts  = [];
var mTick = 0;
var mGOff = 0;
var mRafId= null;
var mAC   = null;
var MS = {
  masterVol:  parseFloat(LS.getItem('ns_master')  || '0.8'),
  musicVol:   parseFloat(LS.getItem('ns_music')   || '0.6'),
  sfxVol:     parseFloat(LS.getItem('ns_sfx')     || '0.8'),
  difficulty: LS.getItem('ns_diff')               || 'normal',
  tutorials:  LS.getItem('ns_tut')                !== 'false',
  autosave:   LS.getItem('ns_auto')               !== 'false',
  gyro:       LS.getItem('ns_gyro')               === 'true',
  haptics:    LS.getItem('ns_haptics')            !== 'false',
  bgLite:     LS.getItem('ns_bgLite')             === 'true',
  lighting:   LS.getItem('ns_lighting')           !== 'false',
  feel:       LS.getItem('ns_feel')               !== 'false',
  tpadArc:    LS.getItem('ns_tpadArc')            !== 'false'
};
var NS_KEY_MAP = {masterVol:'master',musicVol:'music',sfxVol:'sfx',difficulty:'diff',tutorials:'tut',autosave:'auto',gyro:'gyro',haptics:'haptics',bgLite:'bgLite',lighting:'lighting',feel:'feel',tpadArc:'tpadArc'};
function svMS(k,v){ MS[k]=v; LS.setItem('ns_'+(NS_KEY_MAP[k]||k), v); }
function updS(k,v){
  svMS(k,v);
  if(k==='masterVol') document.getElementById('sv-master').textContent = Math.round(v*100)+'%';
  if(k==='musicVol')  document.getElementById('sv-music').textContent  = Math.round(v*100)+'%';
  if(k==='sfxVol')    document.getElementById('sv-sfx').textContent    = Math.round(v*100)+'%';
  AU_applyVolumes();
  mhov();
}
function setDif(d){ svMS('difficulty',d); refreshDif(); }
function refreshDif(){
  var map = {easy:'d-easy', normal:'d-norm', hard:'d-hard'};
  ['easy','normal','hard'].forEach(function(d){
    var b = document.getElementById(map[d]);
    if(b) b.className = 'tb' + (MS.difficulty===d ? ' on' : '');
  });
}
function togS(k,id){
  svMS(k, !MS[k]);
  var b = document.getElementById(id);
  if(b){ b.className = 'tb' + (MS[k] ? ' on' : ''); b.textContent = MS[k] ? 'ON' : 'OFF'; }
  if(k==='lighting'&&typeof LIGHT!=='undefined')LIGHT.on=MS.lighting;
  if(k==='feel'&&typeof FEEL!=='undefined'){FEEL.on=MS.feel;if(!FEEL.on)feelReset();}
  if(k==='tpadArc'){if(b)b.textContent=MS.tpadArc?'SLIDER':'BUTTONS';if(typeof tpadApplySetting==='function')tpadApplySetting();}
  if(k==='bgLite'&&b){ b.className='tb'+(MS.bgLite?'':' on'); b.textContent=MS.bgLite?'LITE':'FULL'; }
}
// ── V4.1 GYRO TILT CONTROLS ──
var _gyroBound=false;
function _gyroHandler(e){
  if(!MS.gyro||mode!=='play'){gyroKeys.left=false;gyroKeys.right=false;return;}
  var angle=(screen.orientation&&typeof screen.orientation.angle==='number')?screen.orientation.angle:(window.orientation||0);
  var tilt;
  if(angle===90)tilt=(e.beta||0);
  else if(angle===-90||angle===270)tilt=-(e.beta||0);
  else if(angle===180)tilt=-(e.gamma||0);
  else tilt=(e.gamma||0);
  var dz=6;
  gyroKeys.left = tilt < -dz;
  gyroKeys.right = tilt > dz;
}
function bindGyro(){ if(_gyroBound)return; try{window.addEventListener('deviceorientation',_gyroHandler);}catch(e){} _gyroBound=true; }
function _gyroOffBtn(){ var b=document.getElementById('t-gyro'); if(b){b.className='tb';b.textContent='OFF';} }
function togGyro(){
  togS('gyro','t-gyro');
  if(MS.gyro){
    if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
      DeviceOrientationEvent.requestPermission().then(function(st){
        if(st==='granted'){bindGyro();}
        else{svMS('gyro',false);_gyroOffBtn();}
      }).catch(function(){svMS('gyro',false);_gyroOffBtn();});
    } else bindGyro();
  } else { gyroKeys.left=false;gyroKeys.right=false; }
}
// restore on load (iOS needs a fresh permission gesture, so require re-toggle there)
if(MS.gyro){
  if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){MS.gyro=false;}
  else bindGyro();
}
function gProf(n){ var r=LS.getItem('np_'+n); return r ? JSON.parse(r) : null; }
function sProf(n,d){ LS.setItem('np_'+n, JSON.stringify(d)); }
function dProf(n){ LS.removeItem('np_'+n); }
function lastProf(){
  var best=null, bestT=0;
  for(var i=1;i<=3;i++){
    var p=gProf(i);
    if(p && p.date>bestT){ bestT=p.date; best={}; for(var k in p) best[k]=p[k]; best.n=i; }
  }
  return best;
}
function getAC(){ return AU_ctx(); }
function playTone(f1,f2,dur,vol){
  try{
    var ac=getAC(); if(!ac) return;
    var o=ac.createOscillator(), g=ac.createGain();
    o.connect(g); g.connect(_sfxBus());
    o.frequency.setValueAtTime(f1, ac.currentTime);
    if(f2) o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime+dur);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime+dur);
    o.start(); o.stop(ac.currentTime+dur);
  }catch(e){}
}
function mhov(){ playTone(700, 700, 0.07, 0.025); }
function mcl(){  playTone(880, 440, 0.12, 0.045); }
function goMS(id){
  document.querySelectorAll('.ms').forEach(function(s){ s.classList.remove('on'); });
  var el = document.getElementById('ms-'+id);
  if(el) el.classList.add('on');
  mScrn = id;
}
function doNew(){ buildSlots('ng-slots', false); goMS('newg'); }
function doCont(){ var p=lastProf(); if(!p){ doNew(); return; } loadProf(p.n); }
function doLoad(){ buildSlots('ld-slots', true); goMS('load'); }
function doEditor(){
  activeProf=0;
  startGame(function(){
    setMode('edit');
  });
}
function doSett(){
  document.getElementById('sm-master').value = MS.masterVol;
  document.getElementById('sm-music').value  = MS.musicVol;
  document.getElementById('sm-sfx').value    = MS.sfxVol;
  document.getElementById('sv-master').textContent = Math.round(MS.masterVol*100)+'%';
  document.getElementById('sv-music').textContent  = Math.round(MS.musicVol*100)+'%';
  document.getElementById('sv-sfx').textContent    = Math.round(MS.sfxVol*100)+'%';
  refreshDif();
  var tt=document.getElementById('t-tut');  if(tt){ tt.className='tb'+(MS.tutorials?' on':''); tt.textContent=MS.tutorials?'ON':'OFF'; }
  var ta=document.getElementById('t-auto'); if(ta){ ta.className='tb'+(MS.autosave?' on':'');  ta.textContent=MS.autosave?'ON':'OFF'; }
  var th=document.getElementById('t-hap');  if(th){ th.className='tb'+(MS.haptics?' on':'');  th.textContent=MS.haptics?'ON':'OFF'; }
  var ttp=document.getElementById('t-tpad'); if(ttp){ ttp.className='tb'+(MS.tpadArc?' on':''); ttp.textContent=MS.tpadArc?'SLIDER':'BUTTONS'; }
  var tbg=document.getElementById('t-bg'); if(tbg){ tbg.className='tb'+(MS.bgLite?'':' on'); tbg.textContent=MS.bgLite?'LITE':'FULL'; }
  [['t-light','lighting'],['t-feel','feel']].forEach(function(a){var e=document.getElementById(a[0]);if(e){e.className='tb'+(MS[a[1]]?' on':'');e.textContent=MS[a[1]]?'ON':'OFF';}});
  var tg=document.getElementById('t-gyro'); if(tg){ tg.className='tb'+(MS.gyro?' on':'');  tg.textContent=MS.gyro?'ON':'OFF'; }
  goMS('sett');
}
function buildSlots(cid, loadMode){
  var container = document.getElementById(cid);
  container.innerHTML = '';
  for(var i=1; i<=3; i++){
    var prof = gProf(i);
    var row  = document.createElement('div');
    var numDiv  = document.createElement('div');
    var infoDiv = document.createElement('div');
    var nameDiv = document.createElement('div');
    var detDiv  = document.createElement('div');
    numDiv.className  = 'sln';
    infoDiv.className = 'sli';
    nameDiv.className = 'slname';
    detDiv.className  = 'sldet';
    numDiv.textContent = String(i);
    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(detDiv);
    row.appendChild(numDiv);
    row.appendChild(infoDiv);
    if(prof){
      row.className = 'sl2';
      var dt = new Date(prof.date);
      var ds = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      nameDiv.textContent = 'SLOT ' + i + ' — LVL ' + (prof.progress||1);
      detDiv.textContent  = 'SCORE ' + (prof.score||0) + '  ·  ' + ds;
      var delBtn = document.createElement('button');
      delBtn.className   = 'sldel';
      delBtn.textContent = '✕';
      delBtn.addEventListener('mouseenter', mhov);
      (function(si, sc, sl){
        delBtn.addEventListener('click', function(e){
          e.stopPropagation();
          rmSlot(si, sc, sl);
        });
      })(i, cid, loadMode);
      row.appendChild(delBtn);
      (function(idx){ row.addEventListener('click', function(){ mcl(); loadProf(idx); }); })(i);
    } else {
      row.className = 'sl2 emp';
      nameDiv.textContent = 'EMPTY SLOT';
      detDiv.textContent  = loadMode ? 'No data' : 'New game here';
      if(!loadMode)(function(idx){ row.addEventListener('click', function(){ mcl(); newProf(idx); }); })(i);
    }
    row.addEventListener('mouseenter', mhov);
    container.appendChild(row);
  }
}
function rmSlot(n, cid, lm){ if(!confirm('Delete slot '+n+'?')) return; dProf(n); buildSlots(cid, lm); }
function newProf(n){
  if(gProf(n)&&!confirm('Overwrite save slot '+n+'?')) return;
  sProf(n, {progress:1, score:0, date:Date.now(), campaignSlot:1, done:[]});
  activeProf=n;
  startGame(function(){ playSlot(1); });
}
function loadProf(n){
  var p=gProf(n); if(!p){ newProf(n); return; }
  p.date=Date.now(); sProf(n,p); activeProf=n;
  var sl=p.campaignSlot||p.progress||1;
  startGame(function(){ if(sl>0) playSlot(sl); else initLevel(); });
}
function startGame(cb){
  document.body.classList.add('ingame');goImmersive();
  if(_portraitMQ.matches)setTimeout(function(){toast('\u21bb Turn your phone sideways for a bigger view');},900);
  mEl.style.transition = 'opacity .5s';
  mEl.style.opacity = '0';
  mOn = false;
  cancelAnimationFrame(mRafId);
  document.getElementById('wrap').style.display = 'flex';
  setTimeout(function(){
    mEl.style.display = 'none';
    if(!_loopOn){setupTouch();_loopOn=true;loop();}
    initLevel();
    if(cb) cb();
  }, 520);
}
var _introGuard=0;
function introAdvance(){
  if(!(mOn && mScrn==='intro')) return;
  _introGuard=Date.now(); // swallow the follow-up ghost click so it can't hit a main-menu button
  goMS('main'); // advance FIRST so nothing can block it
  try{ mcl(); }catch(err){}
  try{
    var p = lastProf();
    var b = document.getElementById('miCont');
    if(b) b.className = 'mi c-cont' + (p ? '' : ' off');
  }catch(err){}
}
document.addEventListener('click', function(e){
  if(Date.now()-_introGuard<700){ e.stopPropagation(); e.preventDefault(); }
}, true);
document.addEventListener('keydown', function(e){ if(mOn && mScrn==='intro') introAdvance(); });
document.addEventListener('click', introAdvance);
document.addEventListener('pointerdown', function(){ if(mOn && mScrn==='intro') introAdvance(); });
document.addEventListener('touchstart', function(){ if(mOn && mScrn==='intro') introAdvance(); }, {passive:true});
document.addEventListener('touchend', function(e){
  if(mOn && mScrn==='intro'){ if(e.cancelable) e.preventDefault(); introAdvance(); }
}, {passive:false});
var MCOLS = ['#7F77DD','#AFA9EC','#00FFEE','#FF44FF','#EF9F27'];
function initPts(){
  var w=mBg.width, h=mBg.height; mPts=[];
  for(var i=0;i<50;i++){
    mPts.push({x:Math.random()*w, y:Math.random()*h,
      vx:(Math.random()-.5)*.35, vy:-(0.2+Math.random()*.65),
      r:.7+Math.random()*2.2, a:.1+Math.random()*.45,
      col:MCOLS[i%MCOLS.length]});
  }
}
function drawBg(){
  var w=mBg.width, h=mBg.height;
  mCtx.clearRect(0,0,w,h);
  mCtx.fillStyle='#07070f'; mCtx.fillRect(0,0,w,h);
  mGOff=(mGOff+.2)%48;
  mCtx.strokeStyle='rgba(127,119,221,.025)'; mCtx.lineWidth=1;
  for(var gx=mGOff%48; gx<w; gx+=48){ mCtx.beginPath(); mCtx.moveTo(gx,0); mCtx.lineTo(gx,h); mCtx.stroke(); }
  for(var gy=mGOff%48; gy<h; gy+=48){ mCtx.beginPath(); mCtx.moveTo(0,gy); mCtx.lineTo(w,gy); mCtx.stroke(); }
  var fg=mCtx.createLinearGradient(0,h-60,0,h);
  fg.addColorStop(0,'rgba(127,119,221,0)'); fg.addColorStop(1,'rgba(127,119,221,.06)');
  mCtx.fillStyle=fg; mCtx.fillRect(0,h-60,w,60);
  mCtx.shadowBlur=8; mCtx.shadowColor='#7F77DD';
  mCtx.strokeStyle='rgba(127,119,221,.2)'; mCtx.lineWidth=1;
  mCtx.beginPath(); mCtx.moveTo(0,h-24); mCtx.lineTo(w,h-24); mCtx.stroke();
  mCtx.shadowBlur=0;
  for(var pi=0;pi<mPts.length;pi++){
    var pt=mPts[pi]; pt.x+=pt.vx; pt.y+=pt.vy;
    if(pt.y<-5){ pt.y=h+3; pt.x=Math.random()*w; }
    if(pt.x<0) pt.x=w; if(pt.x>w) pt.x=0;
    mCtx.save(); mCtx.globalAlpha=pt.a; mCtx.shadowBlur=6; mCtx.shadowColor=pt.col;
    mCtx.fillStyle=pt.col; mCtx.beginPath(); mCtx.arc(pt.x,pt.y,pt.r,0,Math.PI*2); mCtx.fill();
    mCtx.shadowBlur=0; mCtx.restore();
  }
  var t=mTick++; var cx2=w/2+Math.sin(t*.024)*4; var cy2=h-24-20;
  mCtx.save();
  mCtx.globalAlpha=.08+Math.sin(t*.055)*.03; mCtx.strokeStyle='#00FFEE'; mCtx.lineWidth=1.5;
  mCtx.beginPath(); mCtx.arc(cx2,cy2+9,16,0,Math.PI*2); mCtx.stroke();
  mCtx.globalAlpha=1; mCtx.shadowBlur=16; mCtx.shadowColor='#7F77DD';
  mCtx.fillStyle='#0d0d1e'; mCtx.fillRect(cx2-8,cy2,16,16);
  mCtx.strokeStyle='#AFA9EC'; mCtx.lineWidth=1.5; mCtx.strokeRect(cx2-7.5,cy2+.5,15,15);
  mCtx.fillStyle='#AFA9EC'; mCtx.shadowBlur=5; mCtx.shadowColor='#AFA9EC';
  mCtx.beginPath(); mCtx.arc(cx2+3.5,cy2+8,2.5,0,Math.PI*2); mCtx.fill();
  mCtx.shadowBlur=0; mCtx.restore();
  mCtx.save(); mCtx.globalAlpha=.022; mCtx.fillStyle='#000';
  for(var sy=0; sy<h; sy+=4) mCtx.fillRect(0,sy,w,2);
  mCtx.restore();
  // V4.0 player blob hopping across the ground line — ties the title to the game
  drawMenuBlob(w,h,t);
}
function drawMenuBlob(w,h,t){
  var groundY=h-24;
  var cycle=(t*2.6)%(w+120);           // travels left→right, loops
  var bx=cycle-60;
  var hop=Math.abs(Math.sin(t*0.12));   // 0..1 hop
  var by=groundY-18-hop*26;
  var squash=1+ (hop<0.06?0.18:0) - hop*0.08;
  var bw=20/squash, bh=22*squash;
  mCtx.save();
  // landing dust
  if(hop<0.08){mCtx.globalAlpha=0.4;mCtx.fillStyle='#3B6D11';for(var d=0;d<3;d++){mCtx.beginPath();mCtx.arc(bx+10+(d-1)*7,groundY-2,2,0,Math.PI*2);mCtx.fill();}mCtx.globalAlpha=1;}
  // shadow
  mCtx.globalAlpha=0.25-hop*0.18;mCtx.fillStyle='#000';mCtx.beginPath();mCtx.ellipse(bx+10,groundY-1,12-hop*4,3,0,0,Math.PI*2);mCtx.fill();mCtx.globalAlpha=1;
  // body (matches in-game green blob)
  var _sc=(typeof skinCols==='function')?skinCols():{col:'#63c916',glo:'#63c916'};
  mCtx.shadowBlur=12;mCtx.shadowColor=_sc.glo;
  mCtx.fillStyle=_sc.col;mCtx.fillRect(bx+10-bw/2,by,bw,bh);
  mCtx.fillStyle='#3B6D11';mCtx.fillRect(bx+10-bw/2+3,by+5,3,4);mCtx.fillRect(bx+10+bw/2-6,by+5,3,4);
  mCtx.shadowBlur=0;mCtx.restore();
}
function mLoop(){
  if(!mOn) return;
  if(mBg.width!==window.innerWidth || mBg.height!==window.innerHeight){
    mBg.width=window.innerWidth; mBg.height=window.innerHeight; initPts();
  }
  drawBg();
  musicSync();
  mRafId = requestAnimationFrame(mLoop);
}

// V5.7 apply saved lighting / game-feel settings
if(typeof LIGHT!=='undefined')LIGHT.on=MS.lighting;if(typeof FEEL!=='undefined')FEEL.on=MS.feel;
