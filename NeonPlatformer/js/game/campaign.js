// Neon Platformer — Campaign: level loading, level select, save profiles, slot picker
// ── LEVEL SELECT ──
const TOTAL_SLOTS=50;
// V5.0 progress lives inside the active save profile (1-3), so each save slot
// keeps its own unlocks. With no profile active (editor) the old global keys are used.
var activeProf=0;
function _ap(){if(!activeProf)return null;var p=gProf(activeProf);if(!p){p={progress:1,score:0,date:Date.now(),campaignSlot:1};}if(!p.done){ // migrate pre-V5 saves from the old shared progress keys
  p.done=[];for(var i=1;i<=TOTAL_SLOTS;i++)if(LS.getItem('neon_done_'+i)==='1')p.done.push(i);
  p.progress=Math.max(p.progress||1,parseInt(LS.getItem('neon_prog')||'1'));sProf(activeProf,p);}
  return p;}
function lsProgress(){var p=_ap();if(p)return p.progress||1;return parseInt(LS.getItem('neon_prog')||'1');}
function lsSetProgress(n){var p=_ap();if(p){p.progress=Math.max(p.progress||1,n);sProf(activeProf,p);return;}LS.setItem('neon_prog',Math.max(lsProgress(),n));}
function lsDone(n){var p=_ap();if(p)return p.done.indexOf(n)>=0;return LS.getItem('neon_done_'+n)==='1';}
function lsMarkDone(n){var p=_ap();if(p){if(p.done.indexOf(n)<0)p.done.push(n);sProf(activeProf,p);return;}LS.setItem('neon_done_'+n,'1');}
function profNote(slot,addScore){var p=_ap();if(!p)return;if(slot)p.campaignSlot=slot;if(addScore)p.score=(p.score||0)+addScore;p.date=Date.now();sProf(activeProf,p);}
// V5.1 the campaign lives in the levels/ folder: levels/campaign.json lists the
// level files in play order. When the game is served online it reads those files
// directly; when opened from disk it uses levels/campaign.js, which tools/build.py
// generates from the same files. Levels saved to slots in this browser still take
// priority, so the editor workflow is unchanged.
let BUILTIN_LEVELS=(window.NEON_CAMPAIGN&&window.NEON_CAMPAIGN.levels)||[];
let campaignTitle=(window.NEON_CAMPAIGN&&window.NEON_CAMPAIGN.name)||'';
function loadCampaignFolder(){
  if(window.NEON_SINGLE_FILE||!/^https?:/.test(location.protocol)||!window.fetch)return Promise.resolve(false);
  return fetch('levels/campaign.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw 0;return r.json();}).then(c=>
    Promise.all((c.levels||[]).map(f=>fetch('levels/'+f,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('missing levels/'+f);return r.json();}).then(d=>d.data||d)))
      .then(list=>{BUILTIN_LEVELS=list;campaignTitle=c.name||campaignTitle;return true;})
  ).catch(e=>{if(e&&e.message)console.warn('Campaign folder: '+e.message+' (using levels/campaign.js)');return false;});
}
function _decLevel(d){if(!d||!d.g)return d;const o=Object.assign({},d);o.grid=d.g.map(row=>{const a=[];row.split(',').forEach(tok=>{const p=tok.split('*');const t=+p[0],n=p[1]?+p[1]:1;for(let i=0;i<n;i++)a.push(t);});return a;});delete o.g;return o;}
function lsGetData(n){const r=LS.getItem('neon_lvl_'+n);if(r)return JSON.parse(r);return _decLevel(BUILTIN_LEVELS[n-1])||null;}
function showEnding(){
  document.getElementById('win').style.display='none';
  const p=_ap();pauseGoMenu();
  const s=document.getElementById('credSub');
  if(s){s.textContent='★ CAMPAIGN COMPLETE ★'+(p?'  ·  TOTAL SCORE '+(p.score||0):'');s.classList.add('ending');}
  goMS('credits');winFanfareSound();
}
// Number of levels in the playable campaign (last slot that has a level).
function campaignLen(){let last=0;for(let i=1;i<=TOTAL_SLOTS;i++)if(LS.getItem('neon_lvl_'+i)||BUILTIN_LEVELS[i-1])last=i;return last;}
function lsSaveData(n,data){LS.setItem('neon_lvl_'+n,JSON.stringify(data));}

function showLS(){
  renderLS();
  document.getElementById('ls').classList.add('open');
}
function hideLS(){document.getElementById('ls').classList.remove('open');}

function renderLS(){
  const grid2=document.getElementById('lsGrid');
  const prog=lsProgress();
  grid2.innerHTML='';
  const WORLD_NAMES=[
    {label:'World 1 — Neon City',   col:THEME_SWATCHES[0]},
    {label:'World 2 — Ice Fields',  col:THEME_SWATCHES[1]},
    {label:'World 3 — Lava Zone',   col:THEME_SWATCHES[2]},
    {label:'World 4 — Toxic Swamp', col:THEME_SWATCHES[3]},
    {label:'World 5 — The Void',    col:THEME_SWATCHES[4]},
  ];
  const shown=activeProf?Math.max(1,campaignLen()):TOTAL_SLOTS; // V5.0 players only see real levels
  const lsb=document.getElementById('lsFree');if(lsb)lsb.style.display=activeProf?'none':'';
  for(let i=1;i<=shown;i++){
    if((i-1)%10===0){
      const wIdx=Math.floor((i-1)/10);
      const wDiv=document.createElement('div');
      wDiv.className='ls-whdr';
      wDiv.style.color=WORLD_NAMES[wIdx].col;
      wDiv.textContent=WORLD_NAMES[wIdx].label;
      grid2.appendChild(wDiv);
    }
    const unlocked=i<=prog;
    const done=lsDone(i);
    const data=lsGetData(i);
    const hasData=!!data;
    const active=currentSlot===i;
    const el=document.createElement('div');
    el.className='lslot'+(active?' active':'')+(done?' done':'')+(unlocked?'':' locked');
    const themeCol=(data&&data.theme!=null)?THEME_SWATCHES[data.theme]||'':'';
    const dot=themeCol&&hasData?'<span style="position:absolute;bottom:3px;right:5px;width:6px;height:6px;border-radius:50%;background:'+themeCol+'"></span>':'';
    el.innerHTML='<div class="ln">'+i+'</div><div class="li">'+(done?'✓ DONE':unlocked?(hasData?'▶ PLAY':'EMPTY'):'🔒')+'</div>'+dot;
    if(unlocked)el.onclick=()=>playSlot(i);
    grid2.appendChild(el);
  }
}

function playSlot(n,keepLives){
  if(activeProf&&!lsGetData(n)){
    pauseGoMenu();
    setTimeout(function(){toast(n===1?'No levels installed yet \u2014 build them in the Level Editor and Push to Slots':'Level '+n+' is empty');},300);
    return;
  }
  currentSlot=n;profNote(n);
  if(!keepLives)lives=DIFF_LIVES(); // V4.1 fresh start from menu resets lives; winNext carries them
  const data=lsGetData(n);
  hideLS();
  setMode('play');
  if(data){applyData(data);}
  else{initLevel();}
  document.getElementById('levelName').textContent='LEVEL '+n;
  updateSlotBtn();
}

function freeBuild(){
  currentSlot=0;hideLS();lives=DIFF_LIVES();
  initLevel();
  document.getElementById('levelName').textContent='CUSTOM LEVEL';
  updateSlotBtn();
}

function saveToSlot(){
  showSlotPicker();
}

// ── V3.0 SLOT PICKER ──
function showSlotPicker(){
  renderSlotPicker();
  document.getElementById('slotPickModal').classList.add('open');
}
function hideSlotPicker(){
  document.getElementById('slotPickModal').classList.remove('open');
}
function renderSlotPicker(){
  const container=document.getElementById('spWorlds');
  container.innerHTML='';
  const WORLD_NAMES=[
    {label:'World 1 — Neon City',   col:THEME_SWATCHES[0]},
    {label:'World 2 — Ice Fields',  col:THEME_SWATCHES[1]},
    {label:'World 3 — Lava Zone',   col:THEME_SWATCHES[2]},
    {label:'World 4 — Toxic Swamp', col:THEME_SWATCHES[3]},
    {label:'World 5 — The Void',    col:THEME_SWATCHES[4]},
  ];
  for(let w=0;w<5;w++){
    const wDiv=document.createElement('div');wDiv.className='sp-world';
    const lbl=document.createElement('div');lbl.className='sp-wlbl';
    lbl.style.color=WORLD_NAMES[w].col;
    lbl.textContent=WORLD_NAMES[w].label+' (slots '+(w*10+1)+'–'+((w+1)*10)+')';
    wDiv.appendChild(lbl);
    const row=document.createElement('div');row.className='sp-row';
    for(let i=w*10+1;i<=(w+1)*10;i++){
      const data=lsGetData(i);
      const hasData=!!data;
      const isCurrent=currentSlot===i;
      const btn=document.createElement('div');
      btn.className='sp-slot'+(hasData?' has-data':'')+(isCurrent?' is-current':'');
      const themeCol=data&&data.theme!=null?THEME_SWATCHES[data.theme]||'':'';
      btn.innerHTML=String(i)+(themeCol?'<span class="sp-dot" style="background:'+themeCol+'"></span>':'');
      btn.title='Slot '+i+(hasData?' (has level data)':' (empty)');
      btn.onclick=()=>doPickSlot(i);
      row.appendChild(btn);
    }
    wDiv.appendChild(row);
    container.appendChild(wDiv);
  }
}
function doPickSlot(n){
  currentSlot=n;
  lsSetProgress(n);
  const saveData=currentLevelData();
  saveData.thumb=captureThumb();
  lsSaveData(n,saveData);
  document.getElementById('levelName').textContent='LEVEL '+n;
  updateSlotBtn();
  hideSlotPicker();
  toast('📌 Saved to slot '+n);
}

// ── V3.0 PUSH CAMPAIGN TO SLOTS ──
function pushCampaignToSlots(){
  if(!_campSlots.length){toast('Add some levels first!');return;}
  if(!confirm('Write '+_campSlots.length+' campaign levels to slots 1–'+_campSlots.length+'?\n\nThis overwrites any existing data in those slots.'))return;
  _campSlots.forEach((s,i)=>{
    const data=Object.assign({},s.data,{thumb:s.thumb||''});
    lsSaveData(i+1,data);
  });
  lsSetProgress(_campSlots.length);
  hideCampaignBuilder();
  toast('✓ '+_campSlots.length+' levels pushed to slots 1–'+_campSlots.length);
}

// ── V3.0 CAMPAIGN BUILDER PERSISTENCE ──
function saveCampState(){
  try{
    // Store only name + thumb (strip full data to avoid quota; data already lives in namedSave)
    const slim=_campSlots.map(s=>({name:s.name,thumb:s.thumb||'',data:s.data}));
    LS.setItem('neon_camp_builder',JSON.stringify(slim));
  }catch(e){}
}
function loadCampState(){
  try{
    const r=LS.getItem('neon_camp_builder');
    if(r){
      const parsed=JSON.parse(r);
      if(Array.isArray(parsed)&&parsed.length){_campSlots=parsed;return true;}
    }
  }catch(e){}
  return false;
}

function updateSlotBtn(){
  const b=document.getElementById('bSlot');
  if(b)b.textContent=currentSlot>0?('📌 SLOT '+currentSlot):'📌 SLOT';
}

// Win handlers
function winNext(){
  if(currentSlot>0){
    profNote(0,score);
    lsMarkDone(currentSlot);
    lsSetProgress(currentSlot+1);
    document.getElementById('win').style.display='none';
    const last=activeProf?campaignLen():TOTAL_SLOTS;
    if(currentSlot<last){playSlot(currentSlot+1,true);}
    else{showEnding();}
  } else {
    document.getElementById('win').style.display='none';
    replayLevel();
  }
}
function winRetry(){
  winParts=[];winPhase=0;winTimer=0;lives=DIFF_LIVES();
  document.getElementById('win').style.display='none';
  replayLevel();
}
