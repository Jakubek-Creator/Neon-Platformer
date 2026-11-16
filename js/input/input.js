// Neon Platformer — Mouse, keyboard and editor touch input
// ── INPUT ──
function getCP(e){const r=cv.getBoundingClientRect();const z=(mode==='edit')?editZoom:1;return{mx:(e.clientX-r.left)*(W/r.width)/z,my:(e.clientY-r.top)*(H/r.height)/z};}
let mdown=false,dragBar=null,panStart=null;
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('mousedown',e=>{
  if(e.button===1){e.preventDefault();panStart={sx:e.clientX,sy:e.clientY,cx:camX,cy:camY};return;}
  mdown=true;if(e.button===2){e.preventDefault();eraseAt(e);}else editClick(e);
});
cv.addEventListener('mouseup',e=>{if(e.button===1){panStart=null;return;}mdown=false;dragBar=null;});
cv.addEventListener('mouseleave',()=>{mdown=false;dragBar=null;panStart=null;});
cv.addEventListener('mousemove',e=>{
  if(panStart&&mode==='edit'){camX=Math.max(0,Math.min(camMaxX(),panStart.cx-(e.clientX-panStart.sx)));camY=Math.max(0,Math.min(camMaxY(),panStart.cy-(e.clientY-panStart.sy)));cv.style.cursor='grabbing';return;}
  if(mode==='edit')cv.style.cursor='crosshair';
  if(mode==='edit'&&dragBar){applyDrag(e);return;}
  if(mdown){if(e.buttons===2)eraseAt(e);else paint(e);}
});
cv.addEventListener('wheel',e=>{if(mode!=='edit')return;e.preventDefault();
  if(e.ctrlKey){ // pinch on trackpads / ctrl+wheel: zoom anchored at cursor
    const r=cv.getBoundingClientRect();const mx=(e.clientX-r.left)*(W/r.width),my=(e.clientY-r.top)*(H/r.height);
    const z0=editZoom;const z=Math.max(0.5,Math.min(2.5,z0*(e.deltaY<0?1.1:0.9)));editZoom=z;
    camX=Math.max(0,Math.min(camMaxX(),camX+mx/z0-mx/z));camY=Math.max(0,Math.min(camMaxY(),camY+my/z0-my/z));return;}
  if(Math.abs(e.deltaX)>Math.abs(e.deltaY))camX=Math.max(0,Math.min(camMaxX(),camX+e.deltaX*0.8));else camY=Math.max(0,Math.min(camMaxY(),camY+e.deltaY*0.8));},{passive:false});
// editor touch: 1 finger paints, 2 fingers pinch-zoom + pan
let _tPinch=null,_tPend=null,_tPaint=false;
cv.addEventListener('touchstart',e=>{
  if(mode!=='edit')return;
  e.preventDefault();
  if(e.touches.length===1){
    const t=e.touches[0];
    _tPend=setTimeout(()=>{_tPend=null;_tPaint=true;mdown=true;editClick({clientX:t.clientX,clientY:t.clientY,button:0});},110);
  }else if(e.touches.length===2){
    if(_tPend){clearTimeout(_tPend);_tPend=null;}
    _tPaint=false;mdown=false;dragBar=null;
    const a=e.touches[0],b=e.touches[1],r=cv.getBoundingClientRect();
    _tPinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),
      mx:((a.clientX+b.clientX)/2-r.left)*(W/r.width),
      my:((a.clientY+b.clientY)/2-r.top)*(H/r.height),
      z:editZoom,cx:camX,cy:camY};
  }
},{passive:false});
cv.addEventListener('touchmove',e=>{
  if(mode!=='edit')return;
  e.preventDefault();
  if(e.touches.length===2&&_tPinch){
    const a=e.touches[0],b=e.touches[1],r=cv.getBoundingClientRect();
    const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    const mx=((a.clientX+b.clientX)/2-r.left)*(W/r.width);
    const my=((a.clientY+b.clientY)/2-r.top)*(H/r.height);
    const z=Math.max(0.5,Math.min(2.5,_tPinch.z*(d/Math.max(1,_tPinch.d))));
    editZoom=z;
    camX=Math.max(0,Math.min(camMaxX(),_tPinch.cx+_tPinch.mx/_tPinch.z-mx/z));
    camY=Math.max(0,Math.min(camMaxY(),_tPinch.cy+_tPinch.my/_tPinch.z-my/z));
  }else if(e.touches.length===1){
    const t=e.touches[0];
    if(_tPend){clearTimeout(_tPend);_tPend=null;_tPaint=true;mdown=true;editClick({clientX:t.clientX,clientY:t.clientY,button:0});}
    else if(_tPaint){if(dragBar)applyDrag({clientX:t.clientX,clientY:t.clientY});else paint({clientX:t.clientX,clientY:t.clientY});}
  }
},{passive:false});
cv.addEventListener('touchend',e=>{
  if(mode!=='edit')return;
  if(_tPend){clearTimeout(_tPend);_tPend=null;const t=e.changedTouches[0];mdown=true;editClick({clientX:t.clientX,clientY:t.clientY,button:0});mdown=false;}
  if(e.touches.length<2)_tPinch=null;
  if(e.touches.length===0){_tPaint=false;mdown=false;dragBar=null;}
},{passive:false});
cv.addEventListener('touchcancel',()=>{if(_tPend){clearTimeout(_tPend);_tPend=null;}_tPinch=null;_tPaint=false;mdown=false;dragBar=null;});
function eraseAt(e){
  if(mode!=='edit')return;
  const{mx,my}=getCP(e),wx=mx+camX,wy=my+camY;
  for(let i=movPlats.length-1;i>=0;i--){const mp=movPlats[i];if(wx>=mp.x&&wx<=mp.x+mp.w&&wy>=mp.y&&wy<=mp.y+mp.h){movPlats.splice(i,1);if(selPlat===i)selPlat=null;return;}}
  const tc=Math.floor(wx/TS),tr=Math.floor(wy/TS);
  if(tc>=0&&tc<COLS&&tr>=0&&tr<ROWS&&grid[tr])grid[tr][tc]=0;
}
// compute the on-canvas slider rect for a selected drip group (screen coords)
function dripSliderRect(grp){
  const gx0=grp.minC*TS-camX, gx1=(grp.maxC+1)*TS-camX;
  const gw=gx1-gx0;
  const pad=10, bw=Math.max(80, Math.min(gw-pad*2, 220));
  const cxm=(gx0+gx1)/2;
  let bx=cxm-bw/2;
  bx=Math.max(6,Math.min(bx,W-bw-6));
  let by=grp.minR*TS-camY-26;            // above the group
  if(by<6) by=(grp.minR+1)*TS-camY+10;   // if no room above, put it just below top row
  return {bx,by,bw,bh:10};
}
// Sentinel options panel geometry (screen coords): arc slider + shock toggle
function bossPanelRect(sel){
  const pw=176, ph=64;
  let px=sel.c*TS-camX+TS+8;
  if(px+pw>W-4) px=sel.c*TS-camX-pw-8;
  if(px<4) px=4;
  let py=sel.r*TS-camY-8;
  if(py+ph>H-4) py=H-ph-4;
  if(py<4) py=4;
  return {px,py,pw,ph,
    sx:px+10, sw:pw-20, sy:py+30,           // arc slider track
    tx:px+10, ty:py+44, tw:pw-20, th:14};   // shock toggle row
}
function editClick(e){
  if(mode!=='edit')return;
  const{mx,my}=getCP(e),wx=mx+camX,wy=my+camY;
  // drip group slider drag
  if(selDrip!==null){
    const sr=dripSliderRect(selDrip);
    if(mx>=sr.bx&&mx<=sr.bx+sr.bw&&my>=sr.by-6&&my<=sr.by+sr.bh+6){dragBar={drip:true,bx:sr.bx,bw:sr.bw};applyDrag(e);return;}
  }
  if(selPlat!==null){const mp=movPlats[selPlat],pw=180,ph=68,px2=Math.min(mp.x-camX,W-pw-4),py2=mp.y-camY-ph-8;if(mx>=px2+8&&mx<=px2+pw-8&&my>=py2+36&&my<=py2+44){dragBar={idx:selPlat,bar:'spd',bx:px2+8,bw:pw-16};applyDrag(e);return;}if(mx>=px2+8&&mx<=px2+pw-8&&my>=py2+50&&my<=py2+58){dragBar={idx:selPlat,bar:'dist',bx:px2+8,bw:pw-16};applyDrag(e);return;}}
  // /boss panel interaction
  if(selBoss!==null){
    const pr=bossPanelRect(selBoss), key=selBoss.r+','+selBoss.c;
    const bt=grid[selBoss.r]&&grid[selBoss.r][selBoss.c];
    const bo=bossOpts[key]||(bossOpts[key]={});
    if(bt===54){
      if(bo.arc==null)bo.arc=BOSS_DEFAULT_ARC; if(bo.shock==null)bo.shock=BOSS_DEFAULT_SHOCK;
      if(mx>=pr.sx-6&&mx<=pr.sx+pr.sw+6&&my>=pr.sy-8&&my<=pr.sy+8){dragBar={boss:key,bt:54,bx:pr.sx,bw:pr.sw};applyDrag(e);return;}
      if(mx>=pr.tx&&mx<=pr.tx+pr.tw&&my>=pr.ty-4&&my<=pr.ty+pr.th){bo.shock=!bo.shock;return;}
    } else if(bt===58){
      if(bo.spawnN==null)bo.spawnN=HIVE_DEFAULT_SPAWN;
      if(mx>=pr.sx-6&&mx<=pr.sx+pr.sw+6&&my>=pr.sy-8&&my<=pr.sy+8){dragBar={boss:key,bt:58,bx:pr.sx,bw:pr.sw};applyDrag(e);return;}
    } else if(bt===59){
      if(bo.sweepSpd==null)bo.sweepSpd=WARDEN_DEFAULT_SWEEP;
      if(mx>=pr.sx-6&&mx<=pr.sx+pr.sw+6&&my>=pr.sy-8&&my<=pr.sy+8){dragBar={boss:key,bt:59,bx:pr.sx,bw:pr.sw};applyDrag(e);return;}
    }
    if(mx>=pr.px&&mx<=pr.px+pr.pw&&my>=pr.py&&my<=pr.py+pr.ph)return;
  }
  for(let i=0;i<movPlats.length;i++){const mp=movPlats[i];if(wx>=mp.x&&wx<=mp.x+mp.w&&wy>=mp.y&&wy<=mp.y+mp.h){selPlat=i;selDrip=null;return;}}
  // select a placed drip block → selects its whole connected group (drip pen active)
  {const tc=Math.floor(wx/TS),tr=Math.floor(wy/TS);
   if((pen===52||pen===53)&&tr>=0&&tr<ROWS&&tc>=0&&tc<COLS&&grid[tr]&&(grid[tr][tc]===52||grid[tr][tc]===53)){selDrip=dripGroupAt(tr,tc);selPlat=null;selBoss=null;return;}}
  // /select a placed boss (boss pen active) → opens its options panel
  {const tc=Math.floor(wx/TS),tr=Math.floor(wy/TS);
   if((pen===54||pen===58||pen===59)&&tr>=0&&tr<ROWS&&tc>=0&&tc<COLS&&grid[tr]&&grid[tr][tc]===pen){selBoss={r:tr,c:tc};selPlat=null;selDrip=null;return;}}
  selDrip=null;selPlat=null;selBoss=null;paint(e);
}
function applyDrag(e){if(!dragBar)return;const{mx}=getCP(e);const t=Math.max(0,Math.min(1,(mx-dragBar.bx)/dragBar.bw));
  if(dragBar.boss){const bo=bossOpts[dragBar.boss]||(bossOpts[dragBar.boss]={});
    if(dragBar.bt===58){bo.spawnN=Math.max(1,Math.round(1+t*3));return;}        // Hive: 1–4 drones
    if(dragBar.bt===59){bo.sweepSpd=Math.round((0.02+t*0.05)*1000)/1000;return;} // Warden: 0.02–0.07
    if(bo.arc==null)bo.arc=BOSS_DEFAULT_ARC; if(bo.shock==null)bo.shock=BOSS_DEFAULT_SHOCK;
    bo.arc=Math.round((0.6+t*1.0)*100)/100;return;}  // arc 0.6–1.6
  if(dragBar.drip&&selDrip){const sp=Math.round((0.3+t*2.2)*10)/10;setDripGroupSpeed(selDrip,sp);return;}
  const mp=movPlats[dragBar.idx];if(dragBar.bar==='spd')mp.spd=Math.round(t*38+2)/10;if(dragBar.bar==='dist')mp.range=Math.max(1,Math.round(t*12))*TS;}
function paint(e){
  if(mode!=='edit')return;
  const{mx,my}=getCP(e),tc=Math.floor((mx+camX)/TS),tr=Math.floor((my+camY)/TS);
  if(tc<0||tc>=COLS||tr<0||tr>=ROWS||!grid[tr])return;
  if(pen===44){for(let r2=0;r2<ROWS;r2++)for(let c2=0;c2<COLS;c2++)if(grid[r2]&&grid[r2][c2]===44)grid[r2][c2]=0;grid[tr][tc]=44;spawnPoint={x:tc*TS+TS/2-9,y:tr*TS-19};return;}
  if(pen===13||pen===14){const axis=pen===13?'x':'y';movPlats.push({x:tc*TS,y:tr*TS,ox:tc*TS,oy:tr*TS,w:3*TS,h:TS/2,range:3*TS,axis,t:0,spd:1.0,vx:0,vy:0});}
  else {if((grid[tr][tc]===52||grid[tr][tc]===53)&&pen!==52&&pen!==53){delete dripSpeeds[tr+','+tc];if(selDrip&&selDrip.cells&&selDrip.cells.some(p=>p.r===tr&&p.c===tc))selDrip=null;}grid[tr][tc]=pen;}
}
document.addEventListener('keydown',e=>{
  // Ctrl+S quick-save (edit mode)
  if((e.ctrlKey||e.metaKey)&&(e.key==='s'||e.key==='S')){
    e.preventDefault();
    if(mode==='edit'){
      if(currentSlot>0){
        const saveData=currentLevelData();
        saveData.thumb=captureThumb();
        lsSaveData(currentSlot,saveData);
        document.getElementById('levelName').textContent='LEVEL '+currentSlot;
        toast('📌 Slot '+currentSlot+' saved');
        const ind=document.getElementById('autoSaveInd');
        if(ind){ind.style.opacity=1;clearTimeout(ind._t);ind._t=setTimeout(()=>ind.style.opacity=0,2200);}
      } else {
        showSlotPicker();
      }
    }
    return;
  }
  // pause toggle
  if((e.code==='Escape'||e.code==='KeyP')&&mode==='play'){togglePause();e.preventDefault();return;}
  if(paused)return; // block all input while paused
  if(mode==='edit'){
    if(e.code==='ArrowLeft'){camX=Math.max(0,camX-TS*4);e.preventDefault();return;}
    if(e.code==='ArrowRight'){camX=Math.min(camMaxX(),camX+TS*4);e.preventDefault();return;}
    if(e.code==='ArrowUp'){camY=Math.max(0,camY-TS*4);e.preventDefault();return;}
    if(e.code==='ArrowDown'){camY=Math.min(camMaxY(),camY+TS*4);e.preventDefault();return;}
  }
  keys[e.code]=true;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(mode==='play'&&!won){
    if(e.code==='KeyZ'||e.code==='KeyX'){if(curW==='plasma')plasmaCharging=true;else fireWeapon();}
    if(e.code==='KeyQ')cycleW(-1);
    if(e.code==='KeyE')cycleW(1);
    const hk={'Digit1':'blaster','Digit2':'shotgun','Digit3':'laser','Digit4':'sword','Digit5':'grenade','Digit6':'freeze','Digit7':'plasma'};
    if(hk[e.code]){const w=hk[e.code];if(wAmmo[w]>0)selectW(w);}
  }
});
document.addEventListener('keyup',e=>{
  keys[e.code]=false;
  if(mode==='play'&&!won&&(e.code==='KeyZ'||e.code==='KeyX')&&curW==='plasma'&&plasmaCharging){plasmaCharging=false;fireWeapon();}
});
