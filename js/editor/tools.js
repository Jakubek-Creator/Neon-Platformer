// Neon Platformer — Editor tools (V6.7)
//  UNDO / REDO      Ctrl+Z · Ctrl+Y (or Ctrl+Shift+Z) · ↶ ↷ buttons. 80 steps.
//  SELECT           ⬚ button (or hold Shift and drag). Then: Copy, Cut, Delete, Fill with
//                   the current block, Mirror ↔, Flip ↕, and hazard timing (SYNC / WAVE / RANDOM).
//  PASTE            Ctrl+V or PASTE: a ghost follows the cursor, click to stamp. Empty cells
//                   don't overwrite. The clipboard survives between levels.
//  TEST FROM HERE   🎯 button then click a spot (or press T over it). You start there,
//                   deaths respawn there, and you get every weapon/hook placed before that point.
// Keys: Ctrl+C / Ctrl+X / Ctrl+V · Delete · M mirror · F flip · Esc cancel.
var EDT={undo:[],redo:[],snap:null,selMode:false,sel:null,drag:null,clip:null,paste:false,here:false,mouse:{c:0,r:0}};
try{const c=JSON.parse(localStorage.getItem('neon_clip')||'null');if(c&&c.cells)EDT.clip=c;}catch(e){}

// ── snapshots ──
function _edSnap(){return{g:grid.map(r=>r.slice()),cols:COLS,rows:ROWS,mp:JSON.parse(JSON.stringify(movPlats)),ds:Object.assign({},dripSpeeds),
  bo:JSON.parse(JSON.stringify(bossOpts)),ho:JSON.parse(JSON.stringify(hazOpts)),sp:spawnPoint?Object.assign({},spawnPoint):null};}
function _edSame(a,b){if(a.cols!==b.cols||a.rows!==b.rows||a.g.length!==b.g.length)return false;
  for(let r=0;r<a.g.length;r++){const x=a.g[r],y=b.g[r];if(!y||x.length!==y.length)return false;for(let c=0;c<x.length;c++)if(x[c]!==y[c])return false;}
  return JSON.stringify([a.mp,a.ds,a.bo,a.ho,a.sp])===JSON.stringify([b.mp,b.ds,b.bo,b.ho,b.sp]);}
function _edRestore(s){COLS=s.cols;ROWS=s.rows;grid=s.g.map(r=>r.slice());movPlats=JSON.parse(JSON.stringify(s.mp));dripSpeeds=Object.assign({},s.ds);
  bossOpts=JSON.parse(JSON.stringify(s.bo));hazOpts=JSON.parse(JSON.stringify(s.ho));spawnPoint=s.sp?Object.assign({},s.sp):null;
  selPlat=null;selDrip=null;selBoss=null;if(typeof updateDimsDisp==='function')updateDimsDisp();rebuildCrushers();}
function edPush(){if(mode!=='edit')return;EDT.undo.push(_edSnap());if(EDT.undo.length>80)EDT.undo.shift();EDT.redo.length=0;_edBtns();}
function edBegin(){if(mode==='edit'&&!EDT.snap)EDT.snap=_edSnap();}
function edCommit(){if(!EDT.snap)return;const s=EDT.snap;EDT.snap=null;if(_edSame(s,_edSnap()))return;EDT.undo.push(s);if(EDT.undo.length>80)EDT.undo.shift();EDT.redo.length=0;_edBtns();}
function edUndo(){if(mode!=='edit'||!EDT.undo.length)return;edCommit();EDT.redo.push(_edSnap());_edRestore(EDT.undo.pop());toast('↶ Undo');_edBtns();}
function edRedo(){if(mode!=='edit'||!EDT.redo.length)return;EDT.undo.push(_edSnap());_edRestore(EDT.redo.pop());toast('↷ Redo');_edBtns();}
function _edBtns(){const u=document.getElementById('bUndo'),r=document.getElementById('bRedo');if(u)u.disabled=!EDT.undo.length;if(r)r.disabled=!EDT.redo.length;}

// ── helpers ──
function _edTile(e){const{mx,my}=getCP(e);return{c:Math.max(0,Math.min(COLS-1,Math.floor((mx+camX)/TS))),r:Math.max(0,Math.min(ROWS-1,Math.floor((my+camY)/TS)))};}
function _edRect(){const s=EDT.sel;return s?{c0:Math.min(s.c0,s.c1),c1:Math.max(s.c0,s.c1),r0:Math.min(s.r0,s.r1),r1:Math.max(s.r0,s.r1)}:null;}
function _edKeyIn(k,R){const[r,c]=k.split(',').map(Number);return r>=R.r0&&r<=R.r1&&c>=R.c0&&c<=R.c1;}
function _edMpIn(mp,R){const c=Math.floor(mp.ox/TS),r=Math.floor(mp.oy/TS);return r>=R.r0&&r<=R.r1&&c>=R.c0&&c<=R.c1;}
const _ED_MIRROR={40:41,41:40,9:10,10:9,46:47,47:46},_ED_FLIP={49:50,50:49,52:52};
const _ED_HAZ=new Set([46,47,49,50,22]);
function edSelectMode(on){EDT.selMode=on==null?!EDT.selMode:on;EDT.paste=false;EDT.here=false;if(!EDT.selMode){EDT.sel=null;EDT.drag=null;}_edPanel();_edToolBtns();}
function edCancel(){EDT.sel=null;EDT.drag=null;EDT.paste=false;EDT.here=false;_edPanel();_edToolBtns();}

// ── operations on the selection ──
function edCopy(silent){const R=_edRect();if(!R)return;const cells=[];
  for(let r=R.r0;r<=R.r1;r++){const row=[];for(let c=R.c0;c<=R.c1;c++)row.push(grid[r]?grid[r][c]:0);cells.push(row);}
  const rel=(o)=>{const out={};for(const k in o)if(_edKeyIn(k,R)){const[r,c]=k.split(',').map(Number);out[(r-R.r0)+','+(c-R.c0)]=o[k];}return out;};
  EDT.clip={w:R.c1-R.c0+1,h:R.r1-R.r0+1,cells,ds:rel(dripSpeeds),bo:rel(bossOpts),ho:rel(hazOpts),
    mp:movPlats.filter(m=>_edMpIn(m,R)).map(m=>Object.assign({},m,{dx:m.ox-R.c0*TS,dy:m.oy-R.r0*TS}))};
  try{localStorage.setItem('neon_clip',JSON.stringify(EDT.clip));}catch(e){}
  if(!silent)toast('⧉ Copied '+EDT.clip.w+'×'+EDT.clip.h);}
function _edClear(R){for(let r=R.r0;r<=R.r1;r++)for(let c=R.c0;c<=R.c1;c++)if(grid[r]){if(grid[r][c]===44)spawnPoint=null;grid[r][c]=0;}
  for(const o of[dripSpeeds,bossOpts,hazOpts])for(const k of Object.keys(o))if(_edKeyIn(k,R))delete o[k];
  movPlats=movPlats.filter(m=>!_edMpIn(m,R));selPlat=null;selDrip=null;selBoss=null;}
function edDelete(){const R=_edRect();if(!R)return;edPush();_edClear(R);rebuildCrushers();toast('🗑 Deleted');}
function edCut(){const R=_edRect();if(!R)return;edCopy(true);edPush();_edClear(R);rebuildCrushers();toast('✂ Cut '+EDT.clip.w+'×'+EDT.clip.h);}
function edFill(){const R=_edRect();if(!R)return;if(pen===13||pen===14||pen===44){toast('Pick a block to fill with');return;}edPush();
  for(let r=R.r0;r<=R.r1;r++)for(let c=R.c0;c<=R.c1;c++)if(grid[r])grid[r][c]=pen;rebuildCrushers();toast('▦ Filled');}
// mirror (h) or flip (v) the selection in place
function _edTransform(v){const R=_edRect();if(!R)return;edPush();const map=v?_ED_FLIP:_ED_MIRROR,W2=R.c1-R.c0,H2=R.r1-R.r0;
  const src=[];for(let r=R.r0;r<=R.r1;r++)src.push(Array.from(grid[r].slice(R.c0,R.c1+1)));
  for(let i=0;i<=H2;i++)for(let j=0;j<=W2;j++){const t=v?src[H2-i][j]:src[i][W2-j];grid[R.r0+i][R.c0+j]=map[t]!=null?map[t]:t;}
  for(const o of[dripSpeeds,bossOpts,hazOpts]){const moved={};for(const k of Object.keys(o))if(_edKeyIn(k,R)){const[r,c]=k.split(',').map(Number);
      const nr=v?R.r0+(R.r1-r):r,nc=v?c:R.c0+(R.c1-c);moved[nr+','+nc]=o[k];delete o[k];}Object.assign(o,moved);}
  for(const m of movPlats)if(_edMpIn(m,R)){if(v){const ny=R.r0*TS+(R.r1+1)*TS-(m.oy+m.h);m.oy=m.y=Math.round(ny/TS*2)/2*TS;}else{const nx=R.c0*TS+(R.c1+1)*TS-(m.ox+m.w);m.ox=m.x=Math.max(0,nx);}}
  for(let r=R.r0;r<=R.r1;r++)for(let c=R.c0;c<=R.c1;c++)if(grid[r][c]===44)spawnPoint={x:c*TS+TS/2-9,y:r*TS-19};
  rebuildCrushers();toast(v?'⇅ Flipped':'⇆ Mirrored');}
function edMirror(){_edTransform(false);}
function edFlip(){_edTransform(true);}
// hazard timing for flame jets / lasers / crushers in the selection
function edHaz(kind){const R=_edRect();if(!R)return;let n=0,mc=1e9,mr=1e9;edPush();
  for(let r=R.r0;r<=R.r1;r++)for(let c=R.c0;c<=R.c1;c++)if(grid[r]&&_ED_HAZ.has(grid[r][c])){mc=Math.min(mc,c);mr=Math.min(mr,r);}
  for(let r=R.r0;r<=R.r1;r++)for(let c=R.c0;c<=R.c1;c++)if(grid[r]&&_ED_HAZ.has(grid[r][c])){const k=r+','+c;
    if(kind==='random')delete hazOpts[k];else hazOpts[k]={phase:kind==='sync'?0:(((c-mc)+(r-mr))*0.1)%1};n++;}
  toast(n?('⏱ '+n+' hazard'+(n>1?'s':'')+' → '+kind.toUpperCase()):'No flame jets, lasers or crushers in the selection');}
// paste
function edPasteMode(){if(!EDT.clip){toast('Nothing copied yet');return;}EDT.paste=true;EDT.here=false;_edPanel();_edToolBtns();toast('Click to paste · Esc to cancel');}
function _edPasteAt(c0,r0){const C=EDT.clip;if(!C)return;edPush();
  for(let i=0;i<C.h;i++)for(let j=0;j<C.w;j++){const t=C.cells[i][j],r=r0+i,c=c0+j;if(!t||t===44||r<0||c<0||r>=ROWS||c>=COLS||!grid[r])continue;grid[r][c]=t;}
  const put=(src,dst)=>{for(const k in src){const[r,c]=k.split(',').map(Number);if(r0+r<ROWS&&c0+c<COLS)dst[(r0+r)+','+(c0+c)]=JSON.parse(JSON.stringify(src[k]));}};
  put(C.ds||{},dripSpeeds);put(C.bo||{},bossOpts);put(C.ho||{},hazOpts);
  for(const m of C.mp||[]){const x=c0*TS+m.dx,y=r0*TS+m.dy;if(x<COLS*TS&&y<ROWS*TS){const n=Object.assign({},m,{x,y,ox:x,oy:y,t:0,vx:0,vy:0});delete n.dx;delete n.dy;movPlats.push(n);}}
  rebuildCrushers();EDT.sel={c0,r0,c1:Math.min(COLS-1,c0+C.w-1),r1:Math.min(ROWS-1,r0+C.h-1)};EDT.selMode=true;EDT.paste=false;_edPanel();_edToolBtns();toast('📋 Pasted');}

// ── test from here ──
function edHereMode(){EDT.here=!EDT.here;EDT.paste=false;_edPanel();_edToolBtns();if(EDT.here)toast('🎯 Click where you want to start');}
function edTestAt(c,r){
  if(mode!=='edit')return;
  // find a free spot at (c,r), moving up out of solid blocks
  while(r>0&&grid[r]&&solid(grid[r][c]))r--;
  EDT.here=false;_edToolBtns();_edPanel();
  // weapons / hook placed before this point in the level
  const give={};let hook=false;for(let rr=0;rr<ROWS;rr++)for(let cc=0;cc<c;cc++){const t=grid[rr]&&grid[rr][cc];if(WPICK[t])give[WPICK[t]]=1;if(t===62)hook=true;}
  setMode('play');
  const x=c*TS+TS/2-9,y=(r+1)*TS-19;player.x=x;player.y=y;player.vx=0;player.vy=0;checkpoint={x,y};
  for(const w in give){const d=WDEFS[w];wAmmo[w]=d.maxAmmo;}if(give.blaster||Object.keys(give).length){const best=Object.keys(give).pop();if(best)selectW(best);}
  if(hook){hasHook=true;if(typeof _ghBtn==='function')_ghBtn();}
  snapCamera();updateHUD();
  toast('🎯 Testing from here'+(Object.keys(give).length||hook?' — with the gear placed before it':'')+' · deaths respawn here');
}

// ── hook into the existing editor input ──
const _edEC=editClick,_edEA=eraseAt,_edPT=paint;
editClick=function(e){
  if(mode!=='edit')return _edEC(e);
  const t=_edTile(e);
  if(EDT.here){edTestAt(t.c,t.r);return;}
  if(EDT.paste){_edPasteAt(t.c,t.r);return;}
  if(EDT.selMode||e.shiftKey){
    // clicking inside the selection keeps it; a new drag starts a new one
    EDT.selMode=true;EDT.drag={c0:t.c,r0:t.r};EDT.sel={c0:t.c,r0:t.r,c1:t.c,r1:t.r};_edPanel();_edToolBtns();return;}
  edBegin();return _edEC(e);
};
paint=function(e){
  if(mode==='edit'){const t=_edTile(e);EDT.mouse=t;
    if(EDT.drag){EDT.sel.c1=t.c;EDT.sel.r1=t.r;return;}
    if(EDT.selMode||EDT.paste||EDT.here)return;
    edBegin();}
  return _edPT(e);
};
eraseAt=function(e){
  if(mode==='edit'){if(EDT.paste||EDT.here||EDT.selMode){edCancel();if(EDT.selMode)edSelectMode(false);return;}edBegin();}
  return _edEA(e);
};
const _edEnd=()=>{if(EDT.drag){EDT.drag=null;_edPanel();}edCommit();};
document.addEventListener('mouseup',_edEnd);document.addEventListener('touchend',_edEnd);document.addEventListener('touchcancel',_edEnd);
cv.addEventListener('mousemove',e=>{if(mode==='edit')EDT.mouse=_edTile(e);});
// structural buttons get one undo step each
for(const fn of['newLevel','addCols','addRows','setLevelDimensions']){const o=window[fn];if(typeof o==='function')window[fn]=function(){edPush();return o.apply(this,arguments);};}

document.addEventListener('keydown',e=>{
  if(mode!=='edit'||paused)return;
  const tg=e.target&&e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA')return;
  const ctl=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(ctl&&k==='z'&&!e.shiftKey){e.preventDefault();edUndo();return;}
  if(ctl&&(k==='y'||(k==='z'&&e.shiftKey))){e.preventDefault();edRedo();return;}
  if(ctl&&k==='c'){e.preventDefault();edCopy();return;}
  if(ctl&&k==='x'){e.preventDefault();edCut();return;}
  if(ctl&&k==='v'){e.preventDefault();edPasteMode();return;}
  if(ctl)return;
  if(e.key==='Escape'){edCancel();edSelectMode(false);return;}
  if((e.key==='Delete'||e.key==='Backspace')&&EDT.sel){e.preventDefault();edDelete();return;}
  if(k==='m'&&EDT.sel){edMirror();return;}
  if(k==='f'&&EDT.sel){edFlip();return;}
  if(k==='t'){edTestAt(EDT.mouse.c,EDT.mouse.r);return;}
});

// ── UI ──
function _edToolBtns(){const s=document.getElementById('bSel'),h=document.getElementById('bHere');
  if(s)s.classList.toggle('edon',EDT.selMode);if(h)h.classList.toggle('edon',EDT.here);}
function _edPanel(){const p=document.getElementById('selPanel');if(!p)return;
  const R=_edRect(),show=mode==='edit'&&((R&&!EDT.drag)||EDT.paste||EDT.here);p.style.display=show?'flex':'none';if(!show)return;
  const bar=document.getElementById('bar');if(bar)p.style.top=(document.body.classList.contains('medit')?54:bar.getBoundingClientRect().bottom+6)+'px';
  const lab=document.getElementById('selLab');
  if(EDT.paste){lab.textContent='PASTE '+EDT.clip.w+'×'+EDT.clip.h+' — click to place';p.classList.add('only');return;}
  if(EDT.here){lab.textContent='TEST FROM HERE — click a spot';p.classList.add('only');return;}
  p.classList.remove('only');let hz=0;for(let r=R.r0;r<=R.r1;r++)for(let c=R.c0;c<=R.c1;c++)if(grid[r]&&_ED_HAZ.has(grid[r][c]))hz++;
  lab.textContent='SELECTION '+(R.c1-R.c0+1)+'×'+(R.r1-R.r0+1);document.getElementById('selHaz').style.display=hz?'inline-flex':'none';}
function edSetupUI(){
  const tools=document.getElementById('editTools');if(!tools||document.getElementById('bUndo'))return;
  const mk=(id,txt,title,fn,col)=>{const b=document.createElement('button');b.id=id;b.textContent=txt;b.title=title;b.onclick=fn;b.style.color=col||'#AFA9EC';b.style.borderColor=col?col+'88':'#7F77DD';return b;};
  const frag=document.createDocumentFragment();
  frag.appendChild(mk('bUndo','↶','Undo (Ctrl+Z)',edUndo));frag.appendChild(mk('bRedo','↷','Redo (Ctrl+Y)',edRedo));
  frag.appendChild(mk('bSel','⬚ SELECT','Select an area (or Shift+drag) — copy, move, mirror, timing',()=>edSelectMode(),'#22E6FF'));
  frag.appendChild(mk('bPaste','📋','Paste (Ctrl+V)',edPasteMode,'#22E6FF'));
  frag.appendChild(mk('bHere','🎯 HERE','Click a spot to start testing from there (or press T over it)',edHereMode,'#63c916'));
  const sep=document.createElement('span');sep.className='sep';frag.appendChild(sep);
  tools.insertBefore(frag,tools.children[1]);
  const p=document.createElement('div');p.id='selPanel';
  p.innerHTML='<span id="selLab"></span>'+
    '<button onclick="edCopy()" title="Ctrl+C">⧉ COPY</button><button onclick="edCut()" title="Ctrl+X">✂ CUT</button><button onclick="edDelete()" title="Delete">🗑</button>'+
    '<button onclick="edFill()" title="Fill with the current block">▦ FILL</button><button onclick="edMirror()" title="M">⇆ MIRROR</button><button onclick="edFlip()" title="F">⇅ FLIP</button>'+
    '<span id="selHaz"><span class="sl">⏱</span><button onclick="edHaz(\'sync\')" title="All fire together">SYNC</button><button onclick="edHaz(\'wave\')" title="Fire one after another, left to right">WAVE</button><button onclick="edHaz(\'random\')" title="Back to random">RANDOM</button></span>'+
    '<button class="x" onclick="edCancel();edSelectMode(false)" title="Esc">✕</button>';
  document.body.appendChild(p);_edBtns();_edPanel();
}
// keep panel in sync when leaving / entering edit mode
const _edSM=setMode;setMode=function(m){if(m==='play'){edCommit();EDT.paste=false;EDT.here=false;EDT.drag=null;}_edSM(m);_edPanel();_edToolBtns();};
window.addEventListener('load',()=>setTimeout(edSetupUI,0));

// ── drawing (called inside the editor overlay) ──
function edDraw(){
  if(mode!=='edit')return;const t=performance.now()/60;
  const R=_edRect();
  if(R&&!EDT.paste){const x=R.c0*TS-camX,y=R.r0*TS-camY,w=(R.c1-R.c0+1)*TS,h=(R.r1-R.r0+1)*TS;
    cx.save();cx.fillStyle='rgba(34,230,255,0.10)';cx.fillRect(x,y,w,h);cx.setLineDash([6,4]);cx.lineDashOffset=-t;cx.strokeStyle='#22E6FF';cx.lineWidth=2;cx.shadowBlur=8;cx.shadowColor='#22E6FF';cx.strokeRect(x+1,y+1,w-2,h-2);
    cx.setLineDash([]);cx.shadowBlur=0;cx.fillStyle='#22E6FF';cx.font='bold 9px monospace';cx.textAlign='left';cx.textBaseline='bottom';cx.fillText((R.c1-R.c0+1)+'×'+(R.r1-R.r0+1),x+2,y-2);
    // hazard timing badges
    for(let r=R.r0;r<=R.r1;r++)for(let c=R.c0;c<=R.c1;c++){const o=hazOpts[r+','+c];if(o&&grid[r]&&_ED_HAZ.has(grid[r][c])){cx.fillStyle='rgba(0,0,0,0.7)';cx.fillRect(c*TS-camX+2,r*TS-camY+2,18,9);cx.fillStyle='#FFD24A';cx.font='7px monospace';cx.textBaseline='top';cx.fillText('⏱'+Math.round(o.phase*100),c*TS-camX+3,r*TS-camY+3);}}
    cx.restore();}
  if(EDT.paste&&EDT.clip){const C=EDT.clip,c0=EDT.mouse.c,r0=EDT.mouse.r;cx.save();cx.globalAlpha=0.55;
    for(let i=0;i<C.h;i++)for(let j=0;j<C.w;j++){const tt=C.cells[i][j];if(!tt||tt===44)continue;cx.save();try{drawTile(tt,(c0+j)*TS-camX,(r0+i)*TS-camY,c0+j,r0+i);}catch(e){}cx.restore();}
    cx.globalAlpha=1;cx.setLineDash([5,4]);cx.lineDashOffset=-t;cx.strokeStyle='#22E6FF';cx.lineWidth=2;cx.strokeRect(c0*TS-camX,r0*TS-camY,C.w*TS,C.h*TS);cx.restore();}
  if(EDT.here){const c=EDT.mouse.c,r=EDT.mouse.r,x=c*TS-camX+TS/2,y=(r+1)*TS-camY-10,b=Math.sin(t*0.15)*2;cx.save();cx.globalAlpha=0.8;
    cx.shadowBlur=12;cx.shadowColor='#63c916';cx.strokeStyle='#63c916';cx.lineWidth=2;cx.beginPath();cx.ellipse(x,y+b,10,9,0,0,7);cx.stroke();
    cx.fillStyle='#63c916';cx.beginPath();cx.arc(x-3,y-1+b,1.6,0,7);cx.arc(x+3,y-1+b,1.6,0,7);cx.fill();
    cx.font='bold 8px monospace';cx.textAlign='center';cx.fillText('START',x,y-16+b);cx.restore();}
  if(typeof meDraw==='function')meDraw();
}
