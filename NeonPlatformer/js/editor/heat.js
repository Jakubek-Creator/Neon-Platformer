// Neon Platformer — Playtest heatmap (V6.7)
// While anyone plays, the game quietly notes per level:
//   where the blob DIES (red), where it gets HURT (orange), and where it SPENDS TIME (blue —
//   bright blue = players hang around or get stuck there), plus runs started / finished.
// In the editor press 🔥 HEAT to paint it over the level. Export the data as a file from a
// tester's phone and Import it on yours — imports are added on top, so many testers combine.
var HEAT={on:false,key:null,name:null,data:null,runWon:false,dirty:0};
const _HMAX=600;
function _heatKey(){const n=HEAT.name||(document.getElementById('levelName')||{}).textContent||'LEVEL';return n.trim()+'|'+COLS+'x'+ROWS;}
function _heatLoad(key){try{return JSON.parse(localStorage.getItem('neon_heat_'+key)||'null')||{deaths:[],hurts:[],time:{},runs:0,wins:0};}catch(e){return{deaths:[],hurts:[],time:{},runs:0,wins:0};}}
function _heatSave(){if(!HEAT.data||!HEAT.key)return;try{localStorage.setItem('neon_heat_'+HEAT.key,JSON.stringify(HEAT.data));}catch(e){}HEAT.dirty=0;}
function heatCur(){const k=_heatKey();if(HEAT.key!==k||!HEAT.data){HEAT.key=k;HEAT.data=_heatLoad(k);}return HEAT.data;}
function _heatPush(arr,x,y){arr.push([Math.round(x),Math.round(Math.min(y,ROWS*TS-4))]);if(arr.length>_HMAX)arr.splice(0,arr.length-_HMAX);}

// ── recording ──
const _hSM=setMode;setMode=function(m){
  const was=mode;_hSM(m);
  if(m==='play'&&was!=='play'){const d=heatCur();d.runs++;HEAT.runWon=false;_heatSave();}
  if(m!=='play'&&HEAT.dirty)_heatSave();
  _heatUI();
};
const _hDmg=damage;damage=function(){const h0=hp;_hDmg.apply(this,arguments);
  if(mode==='play'&&hp<h0&&hp>0){_heatPush(heatCur().hurts,player.x+player.w/2,player.y+player.h/2);HEAT.dirty++;}};
const _hDeath=startDeathSequence;startDeathSequence=function(px,py){if(mode==='play'){_heatPush(heatCur().deaths,px,py);_heatSave();}return _hDeath.apply(this,arguments);};
const _hAD=applyData;applyData=function(d){HEAT.name=null;HEAT.data=null;return _hAD.apply(this,arguments);};
if(typeof loadNamedLevel==='function'){const _hLN=loadNamedLevel;loadNamedLevel=function(name){_hLN(name);HEAT.name=name;HEAT.data=null;};}
function heatTick(){
  if(mode!=='play'||paused)return;
  if(won&&!HEAT.runWon){HEAT.runWon=true;heatCur().wins++;_heatSave();return;}
  if(won||(typeof deathSeqTimer!=='undefined'&&deathSeqTimer>0)||hp<=0)return;
  if(frame%15===0){const c=Math.floor((player.x+player.w/2)/TS),r=Math.floor((player.y+player.h/2)/TS),k=r+','+c,t=heatCur().time;t[k]=(t[k]||0)+1;HEAT.dirty++;}
  if(HEAT.dirty>40)_heatSave();
}

// ── export / import / clear ──
function heatExport(){
  const all={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('neon_heat_'))all[k.slice(10)]=JSON.parse(localStorage.getItem(k));}
  const blob=new Blob([JSON.stringify({neonHeat:1,levels:all})],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='neon-playtest-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
  toast('⬇ Playtest data exported ('+Object.keys(all).length+' level'+(Object.keys(all).length===1?'':'s')+')');}
function heatImport(e){const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=ev=>{try{const J=JSON.parse(ev.target.result);if(!J.neonHeat)throw new Error('not a playtest file');let n=0;
    for(const k in J.levels){const a=_heatLoad(k),b=J.levels[k];a.deaths=a.deaths.concat(b.deaths||[]).slice(-_HMAX*3);a.hurts=a.hurts.concat(b.hurts||[]).slice(-_HMAX*3);
      for(const t in b.time||{})a.time[t]=(a.time[t]||0)+b.time[t];a.runs+=b.runs||0;a.wins+=b.wins||0;localStorage.setItem('neon_heat_'+k,JSON.stringify(a));n++;}
    HEAT.data=null;toast('⬆ Added playtest data for '+n+' level'+(n===1?'':'s'));_heatUI();}catch(err){toast('✗ '+err.message);}};rd.readAsText(f);e.target.value='';}
function heatClear(){if(!confirm('Clear the playtest data for this level?'))return;localStorage.removeItem('neon_heat_'+_heatKey());HEAT.data=null;_heatUI();toast('🗑 Playtest data cleared');}
function heatToggle(){HEAT.on=!HEAT.on;_heatUI();if(HEAT.on){const d=heatCur();if(!d.runs&&!d.deaths.length)toast('No playtest data yet — play this level, then look again');}}

// ── UI ──
function _heatUI(){
  const b=document.getElementById('bHeat');if(b)b.classList.toggle('edon',HEAT.on);
  const p=document.getElementById('heatPanel');if(!p)return;const show=HEAT.on&&mode==='edit';p.style.display=show?'block':'none';if(!show)return;
  const bar=document.getElementById('bar');if(bar)p.style.top=(document.body.classList.contains('medit')?54:bar.getBoundingClientRect().bottom+8)+'px';
  const d=heatCur(),deaths=d.deaths.length,hurts=d.hurts.length;
  // the worst spot: biggest cluster of deaths within ~2 tiles
  let worst=null,wn=0;for(const a of d.deaths){let n=0;for(const q of d.deaths)if(Math.abs(q[0]-a[0])<64&&Math.abs(q[1]-a[1])<64)n++;if(n>wn){wn=n;worst=a;}}
  const rate=d.runs?Math.round(d.wins/d.runs*100):0;
  document.getElementById('heatStats').innerHTML=
    `<div><b>${d.runs}</b> runs · <b>${d.wins}</b> finished <span class="hr">${d.runs?rate+'%':''}</span></div>`+
    `<div><span class="hd">●</span> <b>${deaths}</b> deaths · <span class="hh">●</span> <b>${hurts}</b> hits</div>`+
    (worst&&wn>1?`<div class="hw" onclick="heatGo(${worst[0]},${worst[1]})">⚠ Worst spot: ${wn} deaths near column ${Math.floor(worst[0]/TS)} — show</div>`:'');
}
function heatGo(x,y){camX=Math.max(0,Math.min(camMaxX(),x-W/2/editZoom));camY=Math.max(0,Math.min(camMaxY(),y-H/2/editZoom));}
function heatSetupUI(){
  const tools=document.getElementById('editTools');if(!tools||document.getElementById('bHeat'))return;
  const b=document.createElement('button');b.id='bHeat';b.textContent='🔥 HEAT';b.title='Show where players die, get hurt and get stuck';b.style.color='#FF6A4A';b.style.borderColor='#FF6A4A88';b.style.whiteSpace='nowrap';b.onclick=heatToggle;
  const here=document.getElementById('bHere');tools.insertBefore(b,here?here.nextSibling:tools.children[1]);
  const p=document.createElement('div');p.id='heatPanel';
  p.innerHTML='<div class="ht">🔥 PLAYTEST HEATMAP</div><div id="heatStats"></div>'+
    '<div class="hl"><span class="hd">● died</span> <span class="hh">● hurt</span> <span class="hb">■ time spent</span></div>'+
    '<div class="hbtn"><button onclick="heatExport()" title="Save all playtest data to a file (send it to yourself)">⬇ Export</button>'+
    '<button onclick="document.getElementById(\'heatIn\').click()" title="Add a tester\'s data file">⬆ Import</button>'+
    '<button onclick="heatClear()" title="Clear this level\'s data">🗑</button></div>'+
    '<input type="file" id="heatIn" accept=".json" style="display:none" onchange="heatImport(event)">';
  document.body.appendChild(p);_heatUI();
}
window.addEventListener('load',()=>setTimeout(heatSetupUI,0));

// ── overlay (editor) ──
var _heatGlow={};
function _hg(col){if(_heatGlow[col])return _heatGlow[col];const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,col.replace('A','1'));gr.addColorStop(0.45,col.replace('A','0.45'));gr.addColorStop(1,col.replace('A','0'));g.fillStyle=gr;g.fillRect(0,0,64,64);return _heatGlow[col]=c;}
function heatDraw(){
  if(!HEAT.on||mode!=='edit')return;const d=heatCur();
  cx.save();
  // time spent: blue cells, brighter = more time
  let mx=1;for(const k in d.time)mx=Math.max(mx,d.time[k]);
  for(const k in d.time){const[r,c]=k.split(',').map(Number),x=c*TS-camX,y=r*TS-camY;if(x<-TS||y<-TS||x>W/editZoom+TS||y>H/editZoom+TS)continue;
    const v=Math.pow(d.time[k]/mx,0.55);cx.fillStyle=`rgba(40,140,255,${0.08+v*0.42})`;cx.fillRect(x,y,TS,TS);}
  cx.globalCompositeOperation='lighter';
  for(const h of d.hurts){cx.globalAlpha=0.35;cx.drawImage(_hg('rgba(255,150,40,A)'),h[0]-camX-20,h[1]-camY-20,40,40);}
  for(const a of d.deaths){cx.globalAlpha=0.8;cx.drawImage(_hg('rgba(255,40,60,A)'),a[0]-camX-36,a[1]-camY-36,72,72);}
  cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
  cx.lineCap='round';
  for(const a of d.deaths){const x=a[0]-camX,y=a[1]-camY;cx.beginPath();cx.moveTo(x-5,y-5);cx.lineTo(x+5,y+5);cx.moveTo(x+5,y-5);cx.lineTo(x-5,y+5);
    cx.strokeStyle='rgba(0,0,0,0.8)';cx.lineWidth=4;cx.stroke();cx.strokeStyle='#ff3c50';cx.lineWidth=2.2;cx.stroke();}
  cx.restore();
}
