// Neon Platformer — HUD, play/edit mode switch, editor block sidebar
// ── HUD ──
function updateHUD(){
  const MAXHP=5;
  const hearts='<span style="color:#ff5555">'+'♥'.repeat(Math.max(0,hp))+'</span>'+'<span style="color:#3a2030">'+'♥'.repeat(Math.max(0,MAXHP-hp))+'</span>';
  document.getElementById('hpTxt').innerHTML=hearts;
  document.getElementById('scTxt').textContent=score;
  const p=[];if(pups.speed>0)p.push('⚡');if(pups.shield>0)p.push('🛡');if(pups.jump>0)p.push('✦');if(checkpoint)p.push('🚩');
  document.getElementById('powerupHud').textContent=p.join(' ');

  const livesHtml='✖<b>'+Math.max(0,lives)+'</b>';
  const lt=document.getElementById('livesTxt');if(lt)lt.innerHTML=livesHtml;
  const pbHp=document.getElementById('pbHp');if(pbHp)pbHp.innerHTML=hearts;
  const pbL=document.getElementById('pbLives');if(pbL)pbL.innerHTML=livesHtml;
  const pbCoins=document.getElementById('pbCoins');if(pbCoins)pbCoins.innerHTML='★<b>'+score+'</b>';
  const pbName=document.getElementById('pbName');if(pbName)pbName.textContent=document.getElementById('levelName').textContent;
  const pbW=document.getElementById('pbWeapon');if(pbW){const def=WDEFS[curW];pbW.textContent=(def?def.icon+' ':'')+curW+(wAmmo[curW]!==Infinity?' ×'+wAmmo[curW]:'');}
  const pbPups=document.getElementById('pbPups');if(pbPups)pbPups.textContent=p.join(' ');
}
function setMode(m){
  mode=m;
  const bp=document.getElementById('bPlay');
  if(bp){bp.className=m==='play'?'on':'';bp.textContent=m==='edit'?'▶ TEST':'▶ PLAY';}
  document.getElementById('editTools').style.display=m==='edit'?'inline-flex':'none';
  document.getElementById('bar').style.display=m==='play'?'none':'flex';
  document.getElementById('playBar').style.display=m==='play'?'flex':'none';
  document.getElementById('foot').style.display=m==='play'?'none':'block';
  cv.style.cursor=m==='edit'?'crosshair':'default';
  if(m==='play'){if(sbOpen)toggleSB();checkpoint=null;lavaLevel=ROWS*TS;lavaCheckpointLevel=null;runStartFrame=frame;runDeaths=0;runCoins=0;runEndFrame=0;laserEmitters=[];flameJets=[];dripBlocks=[];fallingRocks=[];if(!_editGrid)_editGrid=grid.map(r=>r.slice());else grid=_editGrid.map(r=>r.slice());spawnFromGrid();_savedEnemySpawns=enemies.map(function(e){return{px:e.px,py:e.py,type:e.type,arc:e.arc,shock:e.shock,spawnN:e.spawnN,sweepSpd:e.sweepSpd,surf:e.surf};});_savedMovPlats=JSON.parse(JSON.stringify(movPlats));saveCrumbles();rebuildCrushers();spawnPlayer(true);startHintTimer=210;}
  if(m==='edit'){
    if(_editGrid){grid=_editGrid.map(r=>r.slice());_editGrid=null;}
    // clear all live runtime entities so editor shows spawn tiles, not spawned enemies
    enemies=[];bullets=[];eBullets=[];enemyBombs=[];pendingEnemies=[];grenades=[];explosions=[];laserBeams=[];parts=[];coins=[];powerOrbs=[];trail=[];crushers=[];coinPops=[];
    laserEmitters=[];flameJets=[];dripBlocks=[];fallingRocks=[];
    doorState={red:false,blue:false};activatedCPs=new Set();checkpoint=null;
    swordSwing=0;plasmaCharge=0;plasmaCharging=false;
    pick(pen);if(paused)resumeGame();selDrip=null;
  }
}

// ── SIDEBAR ──
function toggleSB(){
  sbOpen=!sbOpen;
  document.getElementById('sb').classList.toggle('open',sbOpen);
  document.getElementById('bBlocks').style.background=sbOpen?'#1a1830':'';
}
function togF(name){
  const fh=document.querySelector('#fld-'+name+' .fh');
  const fb=document.getElementById('fb-'+name);
  const isOpen=fb.classList.contains('open');
  fb.classList.toggle('open',!isOpen);fh.classList.toggle('open',!isOpen);
  if(!isOpen)openFolds.add(name);else openFolds.delete(name);
}
function filterTiles(q){
  q=q.toLowerCase().trim();
  document.querySelectorAll('.stb').forEach(el=>{el.classList.toggle('hi',q.length>0&&!(el.textContent||'').toLowerCase().includes(q));});
  document.querySelectorAll('.fld').forEach(f=>{
    if(!q){f.classList.remove('hi');return;}
    const vis=[...f.querySelectorAll('.stb')].some(el=>!el.classList.contains('hi'));
    f.classList.toggle('hi',!vis);
    if(vis){f.querySelector('.fb').classList.add('open');f.querySelector('.fh').classList.add('open');}
  });
}
function pick(n){
  pen=n;
  document.querySelectorAll('.stb,.eraser').forEach(el=>el.classList.remove('on'));
  const el=document.getElementById('stb'+n);if(el)el.classList.add('on');
  document.getElementById('curTile').textContent=TLABELS[n]||('Tile '+n);
  if(n!==0){recentTiles=recentTiles.filter(t=>t!==n);recentTiles.unshift(n);if(recentTiles.length>6)recentTiles.pop();renderRecent();}
}
// find a connected group of same-type drip blocks (4-dir flood fill in the grid)
function dripGroupAt(r,c){
  const type=grid[r]&&grid[r][c];
  if(type!==52&&type!==53)return null;
  const seen={},cells=[],stack=[[r,c]];
  while(stack.length){const[cr,cc]=stack.pop();const k=cr+','+cc;
    if(seen[k])continue;
    if(cr<0||cr>=ROWS||cc<0||cc>=COLS||!grid[cr]||grid[cr][cc]!==type)continue;
    seen[k]=1;cells.push({r:cr,c:cc});
    stack.push([cr+1,cc],[cr-1,cc],[cr,cc+1],[cr,cc-1]);
  }
  let minC=COLS,maxC=0,minR=ROWS;
  cells.forEach(p=>{if(p.c<minC)minC=p.c;if(p.c>maxC)maxC=p.c;if(p.r<minR)minR=p.r;});
  // group speed = stored value of any member, else default
  let sp=DRIP_DEFAULT_SPEED;
  for(const p of cells){const v=dripSpeeds[p.r+','+p.c];if(v!==undefined){sp=v;break;}}
  return {cells,minC,maxC,minR,lava:type===53,speed:sp};
}
function setDripGroupSpeed(grp,sp){
  grp.speed=sp;
  grp.cells.forEach(p=>{dripSpeeds[p.r+','+p.c]=sp;});
}
function renderRecent(){
  const c=document.getElementById('sbRT');if(!c)return;c.innerHTML='';
  recentTiles.slice(0,6).forEach(n=>{const el=document.createElement('div');el.className='stb'+(n===pen?' on':'');el.style.cssText='background:#111;border-color:#444';el.textContent=TLABELS[n]||('Tile '+n);el.title=TLABELS[n]||('Tile '+n);el.onclick=()=>pick(n);c.appendChild(el);});
}
