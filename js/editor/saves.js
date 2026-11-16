// Neon Platformer — Editor saves: level library, file import/export, autosave, campaign builder
// ── SAVE/LOAD ──
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.style.opacity=1;clearTimeout(el._t);el._t=setTimeout(()=>el.style.opacity=0,2400);}

// single source of truth for level data
function currentLevelData(){
  const gsrc=_editGrid||grid;  // prefer pre-test grid so enemy/boss tiles aren't lost
  return {cols:COLS,rows:ROWS,grid:Array.from(gsrc,r=>Array.from(r)),movPlats,enemies:enemies.map(e=>({px:e.px,py:e.py,type:e.type})),spawnPoint,theme:levelTheme,dripSpeeds,bossOpts,hazOpts,lavaRise:lavaRiseSpeed,twist:levelTwist};
}

// theme swatch colours
const THEME_SWATCHES=['#7F77DD','#4488CC','#AA4466','#44DD55','#EE22EE','#FFAA11','#00CCEE'];

// capture tiny thumbnail of current canvas view
function captureThumb(){
  try{
    const tc=document.createElement('canvas');tc.width=120;tc.height=54;
    const tx=tc.getContext('2d');tx.drawImage(cv,0,0,W,H,0,0,120,54);
    return tc.toDataURL('image/jpeg',0.35);
  }catch(e){return '';}
}

// ── Named Level Saves ──
function namedList(){return JSON.parse(LS.getItem('neon_named_list')||'[]');}
function namedSave(name,meta){
  const list=namedList();if(!list.includes(name))list.push(name);
  LS.setItem('neon_named_list',JSON.stringify(list));
  LS.setItem('neon_named_'+name,JSON.stringify(meta));
}
function namedGet(name){const r=LS.getItem('neon_named_'+name);return r?JSON.parse(r):null;}
function namedDelete(name){
  const list=namedList().filter(n=>n!==name);
  LS.setItem('neon_named_list',JSON.stringify(list));
  LS.removeItem('neon_named_'+name);
}
function fmtDate(ts){const d=new Date(ts);return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'2-digit'});}

// ── 💾 Save as Level ──
function saveAsLevel(prefill){
  const name=((prompt('Level name:',prefill||'')||'').trim());
  if(!name)return;
  const meta={name,savedAt:Date.now(),thumb:captureThumb(),cols:COLS,rows:ROWS,theme:levelTheme,data:currentLevelData()};
  try{namedSave(name,meta);toast('💾 Saved "'+name+'"');}
  catch(e){toast('✗ '+e.message);}
}

// ── 📂 Level Library ──
function showLevelLibrary(){
  renderLevelLibrary();
  document.getElementById('lvLibModal').classList.add('open');
}
function hideLevelLibrary(){document.getElementById('lvLibModal').classList.remove('open');}
function renderLevelLibrary(){
  const list=namedList();
  const grid2=document.getElementById('lvLibGrid');
  const empty=document.getElementById('lvLibEmpty');
  const count=document.getElementById('lvLibCount');
  count.textContent=list.length?list.length+' level'+(list.length>1?'s':''):'';
  // Check autosave
  const asRaw=LS.getItem('neon_autosave');
  const recBtn=document.getElementById('btnRecover');
  if(recBtn)recBtn.style.display=asRaw?'inline-block':'none';
  if(!list.length){grid2.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  grid2.innerHTML='';
  list.forEach(name=>{
    const meta=namedGet(name);if(!meta)return;
    const sw=THEME_SWATCHES[meta.theme||0]||'#7F77DD';
    const card=document.createElement('div');card.className='lvcard';
    card.innerHTML=`<img class="lvcard-thumb" src="${meta.thumb||''}" onerror="this.style.background='#05050f'">
      <div class="lvcard-body">
        <div class="lvcard-name" title="${name}">${name}</div>
        <div class="lvcard-meta">
          <span class="lvcard-swatch" style="background:${sw};margin-top:1px"></span>
          <span>${meta.cols||'?'}×${meta.rows||'?'}</span>
          <span>${meta.savedAt?fmtDate(meta.savedAt):''}</span>
        </div>
        <div class="lvcard-acts">
          <button onclick="loadNamedLevel('${esc(name)}');hideLevelLibrary()" style="color:#AFA9EC;border-color:#7F77DD;background:#0d0d1c">Load</button>
          <button onclick="deleteNamedLevel('${esc(name)}')" style="color:#E24B4A;border-color:#A32D2D;background:#0d0d1c">✕</button>
        </div>
      </div>`;
    grid2.appendChild(card);
  });
}
function esc(s){return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
function loadNamedLevel(name){
  try{const meta=namedGet(name);if(!meta){toast('Not found');return;}applyData(meta.data||meta);toast('📂 Loaded "'+name+'"');}
  catch(e){toast('✗ '+e.message);}
}
function deleteNamedLevel(name){
  if(!confirm('Delete "'+name+'"?'))return;
  namedDelete(name);
  renderLevelLibrary();
  toast('🗑 Deleted "'+name+'"');
}

// ── ⬇ Save As… (file export) ──
function saveAsFile(){
  const name=((prompt('File name:','my_level')||'').trim());
  if(!name)return;
  const safe=name.replace(/[^a-z0-9_\-]/gi,'_');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(currentLevelData(),null,2)],{type:'application/json'}));
  a.download=safe+'.json';a.click();
  toast('⬇ Saved '+safe+'.json');
}

// ── Import JSON ──
function importFile(e){const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=ev=>{try{applyData(JSON.parse(ev.target.result));toast('⬆ Imported!');}catch(err){toast('✗ Invalid');}};rd.readAsText(f);e.target.value='';}

// ── 🔄 Autosave ──
let _autoSaveTimer=null;
function startAutoSave(){
  if(_autoSaveTimer)clearInterval(_autoSaveTimer);
  _autoSaveTimer=setInterval(()=>{
    if(mode==='edit'&&MS.autosave){
      try{
        const snap={...currentLevelData(),savedAt:Date.now()};
        LS.setItem('neon_autosave',JSON.stringify(snap));
        const el=document.getElementById('autoSaveInd');
        if(el){el.style.opacity=1;clearTimeout(el._t);el._t=setTimeout(()=>el.style.opacity=0,2500);}
      }catch(e){}
    }
  },60000);
}
function recoverAutosave(){
  try{
    const raw=LS.getItem('neon_autosave');
    if(!raw){toast('No autosave found');return;}
    const snap=JSON.parse(raw);
    const when=snap.savedAt?fmtDate(snap.savedAt):'unknown date';
    if(!confirm('Recover autosave from '+when+'?'))return;
    applyData(snap);hideLevelLibrary();toast('🔄 Autosave recovered ('+when+')');
  }catch(e){toast('✗ '+e.message);}
}

// ── 🏆 Campaign Builder ──
let _campSlots=[]; // [{name,thumb,data}]

function showCampaignBuilder(){
  loadCampState();
  renderCBLib();renderCBSlots();
  document.getElementById('campModal').classList.add('open');
}
function hideCampaignBuilder(){document.getElementById('campModal').classList.remove('open');}

function renderCBLib(){
  const list=namedList();
  const el=document.getElementById('cbLibList');
  el.innerHTML='';
  if(!list.length){el.innerHTML='<div class="cb-empty">No saved levels.<br>Use 💾 Level to save some first.</div>';return;}
  list.forEach(name=>{
    const meta=namedGet(name);if(!meta)return;
    const row=document.createElement('div');row.className='cblv';
    row.innerHTML=`<img src="${meta.thumb||''}" onerror="this.style.background='#05050f'">
      <span class="cbn">${name}</span>
      <button class="cbadd" onclick="addToCampaign('${esc(name)}')" style="color:#63c916;border-color:#3B6D11;background:#030d03;border-radius:3px;padding:2px 8px;font-family:monospace;font-size:10px;cursor:pointer">+ Add</button>`;
    el.appendChild(row);
  });
}
function renderCBSlots(){
  const el=document.getElementById('cbSlotList');
  const ct=document.getElementById('cbSlotCount');
  ct.textContent=_campSlots.length?'('+_campSlots.length+' levels)':'';
  el.innerHTML='';
  if(!_campSlots.length){el.innerHTML='<div class="cb-empty">← Add levels from the left panel.</div>';return;}
  _campSlots.forEach((s,i)=>{
    const row=document.createElement('div');row.className='cb-slot';
    row.innerHTML=`<span class="cbord">${String(i+1).padStart(2,'0')}</span>
      <img src="${s.thumb||''}" onerror="this.style.background='#05050f'">
      <span class="cbn">${s.name}</span>
      <div class="cb-sbtns">
        ${i>0?`<button onclick="moveCamp(${i},-1)" style="color:#AFA9EC;border-color:#333;background:#111">▲</button>`:'<button disabled style="color:#222;border-color:#1a1a2a;background:#111">▲</button>'}
        ${i<_campSlots.length-1?`<button onclick="moveCamp(${i},1)" style="color:#AFA9EC;border-color:#333;background:#111">▼</button>`:'<button disabled style="color:#222;border-color:#1a1a2a;background:#111">▼</button>'}
        <button onclick="removeFromCampaign(${i})" style="color:#E24B4A;border-color:#A32D2D;background:#111">✕</button>
      </div>`;
    el.appendChild(row);
  });
}
function addToCampaign(name){
  const meta=namedGet(name);if(!meta)return;
  _campSlots.push({name,thumb:meta.thumb||'',data:meta.data||meta});
  renderCBSlots();saveCampState();toast('+ Added "'+name+'" to campaign');
}
function removeFromCampaign(i){_campSlots.splice(i,1);renderCBSlots();saveCampState();}
function moveCamp(i,dir){
  const j=i+dir;if(j<0||j>=_campSlots.length)return;
  [_campSlots[i],_campSlots[j]]=[_campSlots[j],_campSlots[i]];renderCBSlots();saveCampState();
}
function clearCampaignSlots(){if(_campSlots.length&&!confirm('Clear all levels from campaign?'))return;_campSlots=[];renderCBSlots();saveCampState();}

function exportCampaign(){
  const name=(document.getElementById('campName').value||'').trim()||'my_campaign';
  if(!_campSlots.length){toast('Add some levels first!');return;}
  const obj={name,createdAt:Date.now(),levels:_campSlots};
  const safe=name.replace(/[^a-z0-9_\-]/gi,'_');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));
  a.download=safe+'_campaign.json';a.click();
  toast('⬇ Exported "'+name+'" ('+_campSlots.length+' levels)');
}
function importCampaign(e){
  const f=e.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=ev=>{
    try{
      const obj=JSON.parse(ev.target.result);
      if(!obj.levels||!Array.isArray(obj.levels))throw new Error('Not a campaign file');
      // Import all levels into named saves
      obj.levels.forEach((lv,i)=>{
        const nm=lv.name||(obj.name+' Level '+(i+1));
        namedSave(nm,{name:nm,savedAt:Date.now(),thumb:lv.thumb||'',cols:lv.data&&lv.data.cols||20,rows:lv.data&&lv.data.rows||10,theme:lv.data&&lv.data.theme||0,data:lv.data||lv});
      });
      // Load into campaign builder
      _campSlots=obj.levels.map((lv,i)=>({name:lv.name||(obj.name+' Level '+(i+1)),thumb:lv.thumb||'',data:lv.data||lv}));
      if(obj.name)document.getElementById('campName').value=obj.name;
      renderCBLib();renderCBSlots();
      toast('⬆ Campaign imported: '+_campSlots.length+' levels');
    }catch(err){toast('✗ '+err.message);}
  };
  rd.readAsText(f);e.target.value='';
}

// ── Legacy wrappers ──
function saveLevel(){saveAsLevel();}
function loadSavedLevel(){showLevelLibrary();}
function exportLevel(){saveAsFile();}
function showPickLevel(){showLevelLibrary();}
function hidePickLevel(){hideLevelLibrary();}

function applyData(data){
  resize();COLS=data.cols;
  ROWS=Math.max(ROWS||0,data.rows||10,10);
  grid=data.grid.map(r=>new Uint8Array(r));
  while(grid.length<ROWS)grid.push(new Uint8Array(COLS));
  movPlats=data.movPlats||[];
  dripSpeeds=data.dripSpeeds||{};
  bossOpts=data.bossOpts||{};
  hazOpts=data.hazOpts||{};
  _editGrid=null;                             // fresh load clears any test-session grid backup
  lavaRiseSpeed=(data.lavaRise!=null)?data.lavaRise:0;
  _savedMovPlats=JSON.parse(JSON.stringify(movPlats));
  spawnPoint=data.spawnPoint||null;
  levelTwist=data.twist!==false;
  setTheme(data.theme||0);
  resetState();spawnFromGrid();
  // if grid had no enemy tiles (level saved in play mode), spawn from saved enemy list
  if(enemies.length===0&&data.enemies&&data.enemies.length>0){var _mk={drone:mkDrone,turret:mkTurret,shield:mkShield,walker:mkWalker,sniper:mkSniper,charger:mkCharger,bomber:mkBomber,climber:mkClimber};data.enemies.forEach(function(e){if(e.type==="sentinel")enemies.push(mkSentinel(e.px,e.py,e.arc,e.shock));else if(e.type==="hive")enemies.push(mkHive(e.px,e.py,e.spawnN));else if(e.type==="warden")enemies.push(mkWarden(e.px,e.py,e.sweepSpd));else if(e.type==="sniper"){var _sn=mkSniper(e.px,e.py);_sn.surf=e.surf;enemies.push(_sn);}else if(_mk[e.type])enemies.push(_mk[e.type](e.px,e.py));});}
  _savedEnemySpawns=enemies.map(function(e){return{px:e.px,py:e.py,type:e.type,arc:e.arc,shock:e.shock,spawnN:e.spawnN,sweepSpd:e.sweepSpd,surf:e.surf};});
  saveCrumbles();
  rebuildCrushers();spawnPlayer(true);updateHUD();
}
