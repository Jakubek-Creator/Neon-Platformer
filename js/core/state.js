// Neon Platformer — Constants, tile ids, global game state, themes, grid helpers, resize
// ── CONSTANTS ──
const TS=32;
const WDEFS={
  blaster:{name:'Blaster',icon:'🔵',col:'#AFA9EC',maxAmmo:Infinity,cd:18},
  shotgun:{name:'Shotgun',icon:'🟠',col:'#FF8800',maxAmmo:8,cd:28},
  laser:  {name:'Laser',  icon:'🔷',col:'#00FFEE',maxAmmo:6,cd:44},
  sword:  {name:'Sword',  icon:'⚔️', col:'#AA44FF',maxAmmo:10,cd:22},
  grenade:{name:'Grenade',icon:'💣',col:'#FF6600',maxAmmo:5,cd:38},
  freeze: {name:'Freeze', icon:'❄️', col:'#88EEFF',maxAmmo:8,cd:20},
  plasma: {name:'Plasma', icon:'⚡',col:'#FF44FF',maxAmmo:4,cd:55},
};
const WLIST=['blaster','shotgun','laser','sword','grenade','freeze','plasma'];
const WPICK={33:'shotgun',34:'laser',35:'sword',36:'grenade',37:'freeze',38:'plasma',39:'blaster'};
const TLABELS={0:'✕ ERASE',1:'SOL',2:'H2O',3:'LAV',4:'▲ Spike',5:'↑↑↑ Bounce',6:'? Power',7:'END Portal',8:'ICE',9:'► Push R',10:'◄ Push L',11:'TP-A',12:'TP-B',13:'M-H Plat',14:'M-V Plat',15:'👾 Drone',16:'🔑R Key',17:'🔑B Key',18:'🚪R Door',19:'🚪B Door',20:'🔘R Sw',21:'🔘B Sw',22:'💥 Crusher',23:'🌋 Vent',24:'🚩 Check',25:'🧱 Break',26:'🛸 Turret',27:'🛡 Shield',28:'🚶 Walker',29:'⚡ Speed PU',30:'🛡 Shield PU',31:'✦ Jump PU',32:'● Coin',33:'🟠 Shotgun',34:'🔷 Laser',35:'⚔️ Sword',36:'💣 Grenade',37:'❄️ Freeze',38:'⚡ Plasma',39:'🔵 Blaster',40:'◥ Slope /',41:'◤ Slope \\',42:'💀 Crumble',43:'🎯 Sniper',44:'🏠 Spawn',45:'🟢 Acid',46:'🔴 LaserR',47:'🔴 LaserL',52:'💧 Acid Drip',53:'💧 Lava Drip',54:'👁 Sentinel',55:'⚡ Charger',56:'☄ Bomber',57:'🕷 Climber',58:'🐝 Hive',59:'⚔ Warden',60:'💚 1UP Life',61:'❤ Extra Heart'};

// ── CANVAS / STATE ──
const cv=document.getElementById('c'), cx=cv.getContext('2d');
let W,H,ROWS=0,VCOLS,COLS=50,grid=[];
let mode='play',pen=0,camX=0,camY=0;
let score=0,hp=3,lives=3,won=false,frame=0,keys={};
let runStartFrame=0,runDeaths=0,runCoins=0,runEndFrame=0;  // level-complete stats
let winTimer=0,winPhase=0,winParts=[],winDisplayScore=0,winTargetScore=0,winAudioCtx=null;
let deathSeqTimer=0,deathBones=[],deathDebris=[],deathCloud=[],deathFlash=0,deathRing=0,deathAudioCtx=null;
let deathSeqX=0,deathSeqY=0;
let player={x:52,y:100,vx:0,vy:0,w:18,h:18,grounded:false,jumps:0,facing:1,inv:0,wet:false,_bounceJumps:false,_swCool:0,_stomping:false};
let bullets=[],eBullets=[],parts=[],coins=[],movPlats=[],enemies=[],powerOrbs=[],trail=[];
let coinPops=[]; // floating +N text when collecting coins
let startHintTimer=0; // brief control hint shown at level start
let enemyBombs=[];     // Bomber dropped bombs
let pendingEnemies=[]; // enemies queued mid-update (e.g. Hive drones), appended after filter
let grenades=[],explosions=[],laserBeams=[],swordSwing=0,plasmaCharge=0,plasmaCharging=false;
let pups={speed:0,shield:0,jump:0};
let hasHook=false;   // grappling hook is found in the level (tile 62), like a weapon
let wAmmo={blaster:0,shotgun:0,laser:0,sword:0,grenade:0,freeze:0,plasma:0};
let curW='blaster',shootCd=0;
let crumbleBlocks={};  // "col,row" → countdown timer (45→0 then tile deleted)
let tpCool=0,selPlat=null,doorState={red:false,blue:false},crushers=[],checkpoint=null,activatedCPs=new Set();
let sbOpen=false,recentTiles=[],openFolds=new Set(['terrain']);
let currentSlot=0; // 0 = free build, 1-50 = campaign slot
// additions
let shakeAmt=0,shakeX=0,shakeY=0;
let deathTimer=0;
let pickupFlash={t:0,col:'#fff',name:''};
let touchKeys={hook:false,reel:0,hookReq:null,hookAim:null,dashReq:0,aimV:null,aimV2:null,padFire:false,left:false,right:false,jump:false,fire:false,down:false,cycle:false,aimUp:false,_lf:false,_lc:false};
let gyroKeys={left:false,right:false}; // tilt controls
let editZoom=1; // editor pinch zoom (0.5–2.5)
let spawnPoint=null;
let laserEmitters=[];
let flameJets=[];      // tile 49/50
let dripBlocks=[];     // tile 52/53 ceiling acid/lava drip (multi-drop)
const DRIP_DEFAULT_SPEED=1.0; // default when a block has no stored speed
const LAVA_DEFAULT_RISE=0.10; // px/frame the lava flood rises in Lava theme
let lavaRiseSpeed=0;          // per-level rise speed (0 = off); only used in Lava theme
let lavaLevel=0;             // current lava flood top (world Y); high number = low on screen
let lavaCheckpointLevel=null;// lava Y captured at last checkpoint (for death reset)
let dripSpeeds={};     // /3.5 per-cell speed "r,c" -> multiplier (whole group shares value)
let selDrip=null;      // selected drip group: {cells:[{r,c}], minC,maxC,minR,lava}
let hazOpts={};        // per-cell hazard timing "r,c" -> {phase:0..1} (flame jets, lasers, crushers)
let bossOpts={};       // per-cell Sentinel options "r,c" -> {arc, shock}
let selBoss=null;      // selected boss tile in editor: {r,c}
let _editGrid=null;    // backup of the editor grid taken on TEST, restored on return to edit
const BOSS_DEFAULT_ARC=1.0, BOSS_DEFAULT_SHOCK=true;
const HIVE_DEFAULT_SPAWN=2, WARDEN_DEFAULT_SWEEP=0.03;
let fallingRocks=[];   // tile 51
let levelTheme = 0;
let _savedEnemySpawns=[];   // – persists spawn list for death-restart
let _savedMovPlats=[];       // – persists movplat list for death-restart
let _savedCrumbles=[];       // – persists crumble block positions for death-restart
let paused=false;            // – pause state
// TC = current Theme Colors for solid tile drawing
var TC = {fill:'#1a1830', stroke:'#7F77DD', glow:'#534AB7', line:'rgba(127,119,221,0.15)'};
const THEMES = [
  {name:'NEON',    fill:'#1a1830', stroke:'#7F77DD', glow:'#534AB7', line:'rgba(127,119,221,0.15)'},
  {name:'ICE',     fill:'#0a1828', stroke:'#44AAFF', glow:'#1166CC', line:'rgba(68,170,255,0.15)'},
  {name:'LAVA',    fill:'#280800', stroke:'#FF5533', glow:'#CC2200', line:'rgba(255,85,51,0.15)'},
  {name:'TOXIC',   fill:'#071a08', stroke:'#44DD55', glow:'#228833', line:'rgba(68,221,85,0.15)'},
  {name:'VOID',    fill:'#1a0820', stroke:'#EE22EE', glow:'#881188', line:'rgba(238,34,238,0.15)'},
  {name:'SOLAR',   fill:'#201000', stroke:'#FFAA11', glow:'#AA6600', line:'rgba(255,170,17,0.15)'},
  {name:'DEEPSEA', fill:'#041820', stroke:'#00CCEE', glow:'#007799', line:'rgba(0,204,238,0.15)'},
];
function setTheme(n){
  levelTheme=n;
  if(typeof twistBtnRefresh==='function')setTimeout(twistBtnRefresh,0);
  var t=THEMES[n];
  TC.fill=t.fill; TC.stroke=t.stroke; TC.glow=t.glow; TC.line=t.line;
  cv.style.filter='none'; // no canvas-wide filter — only solid tiles change
  document.querySelectorAll('.thsw').forEach(function(el,i){
    el.className='thsw'+(i===n?' tson':'');
  });
  // show the lava rise slider only for Lava theme
  var lc=document.getElementById('lavaRiseCtl');
  if(lc){lc.style.display=(n===2)?'inline-flex':'none';
    var sl=document.getElementById('lavaRiseSlider');if(sl)sl.value=lavaRiseSpeed;
    updateLavaRiseLabel();}
  toast('Theme: '+t.name);
}
function updateLavaRiseLabel(){
  var lbl=document.getElementById('lavaRiseVal');if(!lbl)return;
  lbl.textContent=lavaRiseSpeed<=0?'OFF':(lavaRiseSpeed.toFixed(2)+'/f');
}
function setLavaRise(v){
  lavaRiseSpeed=parseFloat(v)||0;
  updateLavaRiseLabel();
}


// ── GRID HELPERS ──
function makeGrid(R,C){return Array.from({length:R},()=>new Uint8Array(C));}
function tileAt(px,py){
  const tc=Math.floor(px/TS),tr=Math.floor(py/TS);
  if(tr>=ROWS)return 1;
  if(tc<0||tc>=COLS||tr<0||tr>=ROWS)return 0;
  return(grid[tr]&&grid[tr][tc])||0;
}
function solid(t){if(t===18)return!doorState.red;if(t===19)return!doorState.blue;return t===1||t===5||t===6||t===8||t===9||t===10||t===11||t===12||t===20||t===21||t===23||t===25||t===42||t===46||t===47||t===48||t===49||t===50||t===52||t===53;}
// Returns slope surface Y at player-centre X, or null if not applicable
function slopeY(t,tileX,tileY,playerCX){
  const f=Math.max(0,Math.min(1,(playerCX-tileX)/TS));
  if(t===40)return tileY+TS*(1-f); // ◥  /  rises right
  if(t===41)return tileY+TS*f;     // ◤  \  rises left
  return null;
}
function checkSlopes(p){
  if(p.vy<-2)return;               // never snap during an upward jump
  const pcx=p.x+p.w/2, foot=p.y+p.h;
  const tc=Math.floor(pcx/TS);
  if(tc<0||tc>=COLS)return;
  // scan from just above feet down one full tile — catches walking up INTO a rising surface
  const trStart=Math.max(0,Math.floor((foot-4)/TS));
  const trEnd=Math.min(ROWS-1,Math.floor((foot+TS)/TS));
  for(let tr=trStart;tr<=trEnd;tr++){
    const t=(grid[tr]&&grid[tr][tc])||0;
    if(t!==40&&t!==41)continue;
    const sy2=slopeY(t,tc*TS,tr*TS,pcx);
    if(sy2===null)continue;
    // foot at or up to 1px above surface → standing on slope
    // foot up to one full tile below surface  → fell into slope, push up
    if(foot>=sy2-1&&foot<=sy2+TS){
      p.y=sy2-p.h;
      p.vy=Math.min(p.vy,0);
      p.grounded=true; p.jumps=0; p._bounceJumps=false; p._stomping=false;
      return;
    }
  }
}

// ── RESIZE ──
function resize(){
  W=window.innerWidth;
  H=window.innerHeight-document.getElementById('bar').offsetHeight-document.getElementById('foot').offsetHeight;
  if(W<1)W=600;if(H<1)H=400;
  applyCanvasSize(); // sharp on high-density screens
  const visR=Math.max(10,Math.floor(H/TS));
  VCOLS=Math.floor(W/TS);
  // Only grow ROWS – never shrink a custom level height on window resize
  if(visR>ROWS){
    if(grid.length)for(let r=grid.length;r<visR;r++)grid.push(new Uint8Array(Math.max(COLS,1)));
    ROWS=visR;
  }
}
window.addEventListener('resize',()=>resize());
