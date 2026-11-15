// Neon Platformer — Mobile editor (V6.8)
// On phones/tablets the editor gets its own layout (the PC editor is unchanged):
//   · the big toolbar and the hint footer are gone — the level gets the whole screen
//   · top-left: ▶ TEST · ↶ ↷ · ☰ (everything else: theme, size, save, load, heatmap…)
//   · left rail: ✏ PAINT · ▭ BOX · ⌫ ERASE · ✋ MOVE · ⬚ SELECT · 🎯 TEST HERE
//   · bottom hotbar: the block you're using + your recent blocks + ⊞ ALL (full palette)
//   · the palette closes by itself as soon as you pick a block, when you touch the level,
//     or after a few seconds; rail + hotbar fade out while your finger is drawing
//   · long-press a block in the level = pick that block (eyedropper)
//   · two fingers = move + zoom, always
var ME={on:false,tool:'paint',rect:null,pan:null,lp:null,lpDone:false,idle:Date.now(),touching:false,mob:false};
function meIsMob(){try{return matchMedia('(pointer:coarse)').matches;}catch(e){return 'ontouchstart' in window;}}
ME.mob=meIsMob();

function meApply(){
  const on=ME.mob&&mode==='edit';if(on===ME.on&&document.body.classList.contains('medit')===on)return;
  ME.on=on;document.body.classList.toggle('medit',on);meMenu(false);
  if(!on&&sbOpen&&document.getElementById('sb').classList.contains('msheet'))toggleSB();
  setTimeout(()=>{resize();},0);meRender();
}
const _meSM=setMode;setMode=function(m){_meSM(m);meApply();};
window.addEventListener('resize',()=>{ME.mob=meIsMob();meApply();});

// ── tools ──
function meTool(t){
  if(t==='here'){ME.tool='paint';edHereMode();meRender();return;}
  ME.tool=t;EDT.here=false;EDT.paste=false;
  if(t==='select'){edSelectMode(true);}else if(EDT.selMode){edSelectMode(false);}
  meRender();
}
const _meTip={paint:'✏ Paint — drag to draw',rect:'▭ Box — drag a box to fill it',erase:'⌫ Erase — drag to clear',pan:'✋ Move — drag to look around',select:'⬚ Select — drag over an area'};
function _meCell(e){return _edTile(e);}

// hook the editor input (wraps the tools.js layer)
const _meEC=editClick,_mePT=paint;
editClick=function(e){
  if(!ME.on||mode!=='edit')return _meEC(e);
  _meWake();_meSheetClose();
  if(EDT.here||EDT.paste)return _meEC(e);
  const t=_meCell(e);EDT.mouse=t;
  if(ME.tool==='pan'){ME.pan={x:e.clientX,y:e.clientY,cx:camX,cy:camY};return;}
  if(ME.tool==='rect'){ME.rect={c0:t.c,r0:t.r,c1:t.c,r1:t.r};return;}
  if(ME.tool==='erase'){edBegin();_edEA(e);return;}
  return _meEC(e);
};
paint=function(e){
  if(!ME.on||mode!=='edit')return _mePT(e);
  if(ME.lpDone)return;                       // long-press picked a block: don't draw this touch
  const t=_meCell(e);EDT.mouse=t;
  if(ME.tool==='pan'&&ME.pan){const z=editZoom||1,R=cv.getBoundingClientRect(),k=(W/R.width)/z;
    camX=Math.max(0,Math.min(camMaxX(),ME.pan.cx-(e.clientX-ME.pan.x)*k));camY=Math.max(0,Math.min(camMaxY(),ME.pan.cy-(e.clientY-ME.pan.y)*k));return;}
  if(ME.tool==='rect'&&ME.rect){ME.rect.c1=t.c;ME.rect.r1=t.r;return;}
  if(ME.tool==='erase'){edBegin();_edEA(e);return;}
  return _mePT(e);
};
function _meEnd(){
  if(ME.rect){const R=ME.rect;ME.rect=null;
    if(pen===13||pen===14||pen===44){toast('Use ✏ Paint for that block');}
    else{edPush();const c0=Math.min(R.c0,R.c1),c1=Math.max(R.c0,R.c1),r0=Math.min(R.r0,R.r1),r1=Math.max(R.r0,R.r1);
      for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)if(grid[r]){if(grid[r][c]===44&&pen!==44)spawnPoint=null;grid[r][c]=pen;}rebuildCrushers();}}
  ME.pan=null;ME.touching=false;document.body.classList.remove('mdraw');
  clearTimeout(ME.lp);ME.lp=null;setTimeout(()=>{ME.lpDone=false;},0);
}
// touch: fade the UI while drawing, long-press eyedropper
cv.addEventListener('touchstart',e=>{
  if(!ME.on||mode!=='edit')return;_meWake();
  if(e.touches.length!==1){clearTimeout(ME.lp);ME.lp=null;if(ME.rect)ME.rect=null;return;}
  ME.touching=true;document.body.classList.add('mdraw');
  const t0=e.touches[0],sx=t0.clientX,sy=t0.clientY;ME._lpStart={x:sx,y:sy};
  clearTimeout(ME.lp);
  if(ME.tool==='paint'||ME.tool==='rect'||ME.tool==='erase')ME.lp=setTimeout(()=>{
    ME.lp=null;const{c,r}=_meCell({clientX:sx,clientY:sy});
    const orig=EDT.snap&&EDT.snap.g[r]?EDT.snap.g[r][c]:(grid[r]?grid[r][c]:0);
    if(grid[r])grid[r][c]=orig;ME.rect=null;ME.lpDone=true;
    if(orig&&orig!==44){pick(orig);if(ME.tool!=='paint')meTool('paint');toast('🎯 Picked '+(TLABELS[orig]||'block'));if(navigator.vibrate)try{navigator.vibrate(15);}catch(_){}}
    else toast('Long-press a block to pick it');
    meRender();
  },480);
},{passive:true});
cv.addEventListener('touchmove',e=>{if(!ME.on||!ME.lp||!ME._lpStart)return;const t=e.touches[0];if(Math.hypot(t.clientX-ME._lpStart.x,t.clientY-ME._lpStart.y)>10){clearTimeout(ME.lp);ME.lp=null;}},{passive:true});
document.addEventListener('touchend',e=>{if(ME.on&&(!e.touches||e.touches.length===0))_meEnd();});
document.addEventListener('touchcancel',()=>{if(ME.on)_meEnd();});
document.addEventListener('mouseup',()=>{if(ME.on)_meEnd();});

// ── palette sheet: closes by itself ──
let _meSheetT=0;
function meSheet(){if(!sbOpen)toggleSB();document.getElementById('sb').classList.add('msheet');_meSheetT=Date.now();meMenu(false);}
function _meSheetClose(){const sb=document.getElementById('sb');if(sbOpen&&sb.classList.contains('msheet'))toggleSB();}
const _mePick=pick;pick=function(n){_mePick(n);if(ME.on){if(ME.tool==='pan'||ME.tool==='select'){if(EDT.selMode)edSelectMode(false);ME.tool='paint';}setTimeout(_meSheetClose,140);meRender();}};
setInterval(()=>{if(!ME.on)return;const sb=document.getElementById('sb');
  if(sbOpen&&sb.classList.contains('msheet')&&Date.now()-_meSheetT>9000&&document.activeElement!==document.getElementById('sbSearch'))_meSheetClose();
  if(Date.now()-ME.idle>5000)document.body.classList.add('midle');},500);
function _meWake(){ME.idle=Date.now();document.body.classList.remove('midle');}
document.addEventListener('pointerdown',_meWake,true);
document.getElementById('sb')&&document.getElementById('sb').addEventListener('pointerdown',()=>{_meSheetT=Date.now();},true);

// ── ☰ menu: the normal toolbar, shown as a sheet ──
function meMenu(open){const on=open==null?!document.body.classList.contains('mmenu'):open;document.body.classList.toggle('mmenu',on&&ME.on);if(on)_meSheetClose();}
document.addEventListener('click',e=>{if(!document.body.classList.contains('mmenu'))return;const bar=document.getElementById('bar');
  if(e.target.closest('#meMenuBtn'))return;
  if(bar.contains(e.target)){if(e.target.closest('button,.thsw'))setTimeout(()=>meMenu(false),120);}else meMenu(false);},true);

// ── UI ──
const _meTools=[['paint','✏','Paint'],['rect','▭','Box'],['erase','⌫','Erase'],['pan','✋','Move'],['select','⬚','Select'],['here','🎯','Test here']];
function meSetupUI(){
  if(document.getElementById('meTop'))return;
  const top=document.createElement('div');top.id='meTop';
  top.innerHTML='<button class="mt" onclick="setMode(\'play\')" style="color:#63c916;border-color:#3B6D11">▶ TEST</button>'+
    '<button id="meUndo" class="mt" onclick="edUndo()">↶</button><button id="meRedo" class="mt" onclick="edRedo()">↷</button>'+
    '<button id="meMenuBtn" class="mt" onclick="meMenu()">☰</button><span id="meTip"></span>';
  const rail=document.createElement('div');rail.id='meRail';
  rail.innerHTML=_meTools.map(([k,i,l])=>`<button data-t="${k}" onclick="meTool('${k}')" title="${l}"><span>${i}</span><small>${l.toUpperCase()}</small></button>`).join('');
  const hot=document.createElement('div');hot.id='meHot';
  const wrap=document.getElementById('canvasWrap');wrap.appendChild(top);wrap.appendChild(rail);wrap.appendChild(hot);
  meRender();
}
function _meChip(n,big){const src=document.getElementById('stb'+n),b=document.createElement('button');b.className='mchip'+(n===pen?' on':'')+(big?' big':'');
  if(src){b.innerHTML=src.innerHTML;b.style.background=src.style.background;b.style.borderColor=src.style.borderColor;}else b.textContent=TLABELS[n]||n;
  b.onclick=()=>pick(n);return b;}
function meRender(){
  const hot=document.getElementById('meHot');if(!hot)return;
  hot.innerHTML='';const cur=_meChip(pen,true);cur.onclick=meSheet;cur.title='Change block';hot.appendChild(cur);
  const sep=document.createElement('span');sep.className='msep';hot.appendChild(sep);
  recentTiles.filter(n=>n!==pen).slice(0,7).forEach(n=>hot.appendChild(_meChip(n)));
  const all=document.createElement('button');all.className='mchip mall';all.innerHTML='⊞<small>ALL</small>';all.onclick=meSheet;hot.appendChild(all);
  const t=EDT.here?'here':ME.tool;document.querySelectorAll('#meRail button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  const tip=document.getElementById('meTip');if(tip)tip.textContent=EDT.here?'🎯 Tap where to start':(_meTip[ME.tool]||'');
  const u=document.getElementById('meUndo'),r=document.getElementById('meRedo');if(u)u.disabled=!EDT.undo.length;if(r)r.disabled=!EDT.redo.length;
}
const _meBtns=_edBtns;_edBtns=function(){_meBtns();meRender();};
const _meHM=edHereMode;edHereMode=function(){_meHM();meRender();};
const _meTA=edTestAt;edTestAt=function(c,r){_meTA(c,r);meRender();};
window.addEventListener('load',()=>setTimeout(()=>{meSetupUI();meApply();},0));

// ── drawing: box preview + finger cursor ──
function meDraw(){
  if(!ME.on)return;
  if(ME.rect){const c0=Math.min(ME.rect.c0,ME.rect.c1),c1=Math.max(ME.rect.c0,ME.rect.c1),r0=Math.min(ME.rect.r0,ME.rect.r1),r1=Math.max(ME.rect.r0,ME.rect.r1);
    cx.save();cx.globalAlpha=0.5;for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){if(pen){cx.save();try{drawTile(pen,c*TS-camX,r*TS-camY,c,r);}catch(e){}cx.restore();}else{cx.fillStyle='rgba(255,60,80,0.35)';cx.fillRect(c*TS-camX,r*TS-camY,TS,TS);}}
    cx.globalAlpha=1;cx.strokeStyle=pen?'#22E6FF':'#ff4d6a';cx.lineWidth=2;cx.setLineDash([6,4]);cx.strokeRect(c0*TS-camX,r0*TS-camY,(c1-c0+1)*TS,(r1-r0+1)*TS);
    cx.setLineDash([]);cx.fillStyle='#fff';cx.font='bold 10px monospace';cx.textAlign='left';cx.textBaseline='bottom';cx.fillText((c1-c0+1)+'×'+(r1-r0+1),c0*TS-camX+2,r0*TS-camY-3);cx.restore();}
  else if(ME.touching&&ME.tool!=='pan'){const{c,r}=EDT.mouse,x=c*TS-camX,y=r*TS-camY;cx.save();cx.strokeStyle=ME.tool==='erase'?'#ff4d6a':'#ffffff';cx.lineWidth=2;cx.shadowBlur=10;cx.shadowColor=cx.strokeStyle;cx.strokeRect(x-1,y-1,TS+2,TS+2);cx.restore();}
}
