// Neon Platformer — Level setup, reset, pause menu, spawning
// ── INIT ──
// Clear-all / new blank level with confirmation
function newLevel(){
  if(confirm('Clear the entire level and start a blank one?\nThis cannot be undone.')){
    initLevel();
    if(mode!=='edit')setMode('edit');
    toast('🆕 New blank level');
  }
}
function initLevel(){
  // Measure canvas area first
  W=window.innerWidth;
  H=window.innerHeight-document.getElementById('bar').offsetHeight-document.getElementById('foot').offsetHeight;
  if(W<1)W=600;if(H<1)H=400;
  applyCanvasSize();
  VCOLS=Math.floor(W/TS);
  ROWS=Math.max(10,Math.floor(H/TS));  // reset to default window height
  COLS=100;
  spawnPoint=null;
  setTheme(0);
  grid=makeGrid(ROWS,COLS);
  for(let c=0;c<COLS;c++)grid[ROWS-1][c]=1;
  movPlats=[];
  dripSpeeds={};selDrip=null;selPlat=null;  // clear drip data on new level
  bossOpts={};selBoss=null;_editGrid=null;   // /clear boss data + grid backup on new level
  hazOpts={};
  resetState();rebuildCrushers();spawnPlayer(true);updateHUD();updateDimsDisp();
}
let _runToken=0;
function resetState(){
  if(typeof clearEnemyFx==='function')clearEnemyFx();
  _runToken++;
  bullets=[];eBullets=[];enemyBombs=[];pendingEnemies=[];parts=[];coins=[];powerOrbs=[];trail=[];enemies=[];crushers=[];
  grenades=[];explosions=[];laserBeams=[];swordSwing=0;plasmaCharge=0;plasmaCharging=false;
  pups={speed:0,shield:0,jump:0};tpCool=0;shootCd=0;score=0;hp=DIFF_HP();won=false;camX=0;camY=0;frame=0;if(typeof clearTileFx==='function')clearTileFx();if(typeof feelReset==='function')feelReset();if(typeof movesReset==='function')movesReset();if(typeof twistInit==='function')twistInit();
  crumbleBlocks={};
  laserEmitters=[];
  flameJets=[];dripBlocks=[];fallingRocks=[];
  doorState={red:false,blue:false};checkpoint=null;activatedCPs=new Set();
  lavaLevel=ROWS*TS;lavaCheckpointLevel=null;  // lava starts at the very bottom
  curW='blaster';wAmmo={blaster:0,shotgun:0,laser:0,sword:0,grenade:0,freeze:0,plasma:0};hasHook=false;if(typeof _ghBtn==='function')_ghBtn();
  document.getElementById('win').style.display='none';
}
function replayLevel(){
  document.getElementById('win').style.display='none';
  resetState();spawnFromGrid();rebuildCrushers();spawnPlayer(true);updateHUD();
}

// ── PAUSE ──
function togglePause(){
  if(mode!=='play'||won||deathTimer>0)return;
  paused?resumeGame():openPause();
}
function openPause(){
  paused=true;releaseTouches();AU_applyVolumes();
  // Grey out checkpoint button if none set
  const cpBtn=document.getElementById('pmCheckpoint');
  if(cpBtn)cpBtn.classList.toggle('dim',!checkpoint);
  document.getElementById('pauseMenu').classList.add('open');
}
function resumeGame(){
  paused=false;AU_applyVolumes();
  document.getElementById('pauseMenu').classList.remove('open');
}
function pauseRestartLevel(){
  resumeGame();_runToken++;
  // Full level restart — same as death with no checkpoint
  hp=DIFF_HP();lives=DIFF_LIVES();won=false;deathTimer=0;
  bullets=[];eBullets=[];enemyBombs=[];pendingEnemies=[];parts=[];grenades=[];explosions=[];laserBeams=[];swordSwing=0;plasmaCharge=0;plasmaCharging=false;
  pups={speed:0,shield:0,jump:0};shootCd=0;
  curW='blaster';wAmmo={blaster:0,shotgun:0,laser:0,sword:0,grenade:0,freeze:0,plasma:0};hasHook=false;if(typeof _ghBtn==='function')_ghBtn();
  crumbleBlocks={};doorState={red:false,blue:false};activatedCPs=new Set();camX=0;camY=0;
  checkpoint=null;lavaLevel=ROWS*TS;lavaCheckpointLevel=null;
  enemies=[];coins=[];powerOrbs=[];crushers=[];laserEmitters=[];flameJets=[];dripBlocks=[];
  resetFallingRocks();
  movPlats=JSON.parse(JSON.stringify(_savedMovPlats.length>0?_savedMovPlats:[]));
  restoreCrumbles();
  spawnFromGrid();
  if(enemies.length===0&&_savedEnemySpawns.length>0){var _mk={drone:mkDrone,turret:mkTurret,shield:mkShield,walker:mkWalker,sniper:mkSniper,charger:mkCharger,bomber:mkBomber,climber:mkClimber};_savedEnemySpawns.forEach(function(e){if(e.type==="sentinel")enemies.push(mkSentinel(e.px,e.py,e.arc,e.shock));else if(e.type==="hive")enemies.push(mkHive(e.px,e.py,e.spawnN));else if(e.type==="warden")enemies.push(mkWarden(e.px,e.py,e.sweepSpd));else if(e.type==="sniper"){var _sn=mkSniper(e.px,e.py);_sn.surf=e.surf;enemies.push(_sn);}else if(_mk[e.type])enemies.push(_mk[e.type](e.px,e.py));});}
  rebuildCrushers();spawnPlayer(true);updateHUD();
}
function pauseRestartCheckpoint(){
  if(!checkpoint)return;
  resumeGame();
  hp=DIFF_HP();deathTimer=0;
  bullets=[];eBullets=[];enemyBombs=[];pendingEnemies=[];parts=[];grenades=[];explosions=[];laserBeams=[];swordSwing=0;plasmaCharge=0;plasmaCharging=false;
  pups={speed:0,shield:0,jump:0};shootCd=0;
  curW='blaster';wAmmo={blaster:0,shotgun:0,laser:0,sword:0,grenade:0,freeze:0,plasma:0};
  player.x=checkpoint.x;player.y=checkpoint.y;player.vx=0;player.vy=0;
  player.grounded=false;player.jumps=0;player.inv=80;player.facing=1;
  player._stomping=false;player._bounceJumps=false;player._swCool=0;
  if(lavaCheckpointLevel!=null)lavaLevel=lavaCheckpointLevel;
  updateHUD();
}
function pauseGoEdit(){
  resumeGame();
  setMode('edit');
}
function pauseGoMenu(){
  resumeGame();
  paused=false;
  // Reset game state cleanly before showing menu
  resetState();
  // Show main menu overlay
  const mEl2=document.getElementById('menu');
  if(mEl2){
    mEl2.style.display='flex';mEl2.style.opacity='1';
    // Switch to main screen inside menu
    document.querySelectorAll('.ms').forEach(s=>s.classList.remove('on'));
    const main=document.getElementById('ms-main');
    if(main)main.classList.add('on');
    window.mOn=true;window.mScrn='main';
    document.body.classList.remove('ingame');
    releaseTouches();
    var pc=lastProf(),bc=document.getElementById('miCont');if(bc)bc.className='mi c-cont'+(pc?'':' off');
    cancelAnimationFrame(mRafId);mRafId=requestAnimationFrame(mLoop);
  }
}
function spawnPlayer(fromStart){
  const sx=checkpoint?checkpoint.x:(fromStart&&spawnPoint?spawnPoint.x:52);
  const sy=checkpoint?checkpoint.y:(fromStart&&spawnPoint?spawnPoint.y:H-100);
  player={x:sx,y:sy,vx:0,vy:0,w:18,h:18,grounded:false,jumps:0,facing:1,inv:0,wet:false,_bounceJumps:false,_swCool:0,_stomping:false};
  snapCamera(); // centre view on spawn (prevents pan-from-top in tall levels)
}
// hazard timing from the editor (SYNC / WAVE); otherwise the old random start
function _hazT(r,c,cycle,def){const o=hazOpts[r+','+c];return o&&o.phase!=null?Math.floor(o.phase*cycle)%cycle:def;}
function spawnFromGrid(){
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!grid[r])continue;
    const t=grid[r][c];
    if(t===15){enemies.push(mkDrone(c*TS,r*TS-22));grid[r][c]=0;}
    else if(t===26){enemies.push(mkTurret(c*TS,r*TS-20));grid[r][c]=0;}
    else if(t===27){enemies.push(mkShield(c*TS,r*TS-24));grid[r][c]=0;}
    else if(t===28){enemies.push(mkWalker(c*TS,r*TS-26));grid[r][c]=0;}
    else if(t===43){
      // Sniper anchors to the surface it's placed against
      const sn=mkSniper(c*TS+(TS-20)/2, r*TS+(TS-22)/2);
      const cc=c*TS+TS/2, rc=r*TS+TS/2;
      if(solid(tileAt(cc,(r-1)*TS+TS/2))){sn.surf='ceiling';sn.y=r*TS+1;sn.x=c*TS+(TS-20)/2;}
      else if(solid(tileAt((c-1)*TS+TS/2,rc))){sn.surf='left';sn.x=c*TS+1;sn.y=r*TS+(TS-22)/2;}
      else if(solid(tileAt((c+1)*TS+TS/2,rc))){sn.surf='right';sn.x=c*TS+TS-20-1;sn.y=r*TS+(TS-22)/2;}
      else if(solid(tileAt(cc,(r+1)*TS+TS/2))){sn.surf='floor';sn.y=r*TS+TS-22;sn.x=c*TS+(TS-20)/2;}
      else {sn.surf='floor';} // no adjacent wall: behave like before (will fall to floor)
      sn.px=sn.x;sn.py=sn.y;
      enemies.push(sn);grid[r][c]=0;
    }
    else if(t===55){enemies.push(mkCharger(c*TS,r*TS-28));grid[r][c]=0;}  // Charger
    else if(t===56){enemies.push(mkBomber(c*TS,r*TS+TS));grid[r][c]=0;}   // Bomber (hovers near placement)
    else if(t===57){enemies.push(mkClimber(c*TS+4,r*TS));grid[r][c]=0;}   // Climber
    else if(t===54){const bo=bossOpts[r+','+c]||{};enemies.push(mkSentinel(c*TS-6,r*TS-44,bo.arc,bo.shock!=null?bo.shock:BOSS_DEFAULT_SHOCK));grid[r][c]=0;}  // Sentinel
    else if(t===58){const bo=bossOpts[r+','+c]||{};enemies.push(mkHive(c*TS-12,r*TS-52,bo.spawnN));grid[r][c]=0;}  // Hive
    else if(t===59){const bo=bossOpts[r+','+c]||{};enemies.push(mkWarden(c*TS-3,r*TS-34,bo.sweepSpd));grid[r][c]=0;}  // Warden
    else if(t===44){spawnPoint={x:c*TS+TS/2-9,y:r*TS-19};}
    else if(t===46||t===47){laserEmitters.push({gx:c,gy:r,dir:t===46?1:-1,timer:_hazT(r,c,180,Math.floor(Math.random()*140)),active:false,bx1:0,bx2:0,by:0});}
    else if(t===49||t===50){flameJets.push({gx:c,gy:r,dir:t===49?-1:1,timer:_hazT(r,c,120,Math.floor(Math.random()*120)),active:false,reach:0});}
    else if(t===52||t===53){const sp=dripSpeeds[r+','+c]||DRIP_DEFAULT_SPEED;dripBlocks.push({gx:c,gy:r,lava:t===53,drops:[],puddles:[],nextT:Math.floor(Math.random()*40),speed:sp});}  // /3.5
    else if(t===51){fallingRocks.push(makeFallingRock(c,r));grid[r][c]=0;}
    else if(t===29){powerOrbs.push({x:c*TS+TS/2,y:r*TS+TS/2,type:'speed',life:99999,vy:null});}
    else if(t===30){powerOrbs.push({x:c*TS+TS/2,y:r*TS+TS/2,type:'shield',life:99999,vy:null});}
    else if(t===31){powerOrbs.push({x:c*TS+TS/2,y:r*TS+TS/2,type:'jump',life:99999,vy:null});}
    else if(t===32){coins.push({x:c*TS+TS/2,y:r*TS+TS/2,vy:null});}
    else if(t===60){powerOrbs.push({x:c*TS+TS/2,y:r*TS+TS/2,type:'life',life:99999,vy:null});grid[r][c]=0;}
    else if(t===62){powerOrbs.push({x:c*TS+TS/2,y:r*TS+TS/2,type:'hook',life:99999,vy:null});grid[r][c]=0;}  // grappling hook
    else if(t===61){powerOrbs.push({x:c*TS+TS/2,y:r*TS+TS/2,type:'heart',life:99999,vy:null});grid[r][c]=0;}
    else if(WPICK[t]){powerOrbs.push({x:c*TS+TS/2,y:r*TS+TS/2,type:'wpick',weapon:WPICK[t],life:99999,vy:null});grid[r][c]=0;}
  }
}
