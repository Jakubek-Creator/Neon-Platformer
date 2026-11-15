// Neon Platformer — Player physics, damage, death and level-complete sequences, camera, level size
// ── PHYSICS ──
function moveX(p){p.x+=p.vx;if(p.vx>0&&solid(tileAt(p.x+p.w,p.y+3))&&solid(tileAt(p.x+p.w,p.y+p.h-3))){p.x=Math.floor((p.x+p.w)/TS)*TS-p.w-0.1;p.vx=0;}if(p.vx<0&&solid(tileAt(p.x,p.y+3))&&solid(tileAt(p.x,p.y+p.h-3))){p.x=Math.floor(p.x/TS)*TS+TS+0.1;p.vx=0;}p.x=Math.max(0,Math.min(COLS*TS-p.w,p.x));}
function moveY(p){
  p.y+=p.vy;p.grounded=false;
  if(p.vy>=0){const foot=p.y+p.h;for(const bx of[p.x+3,p.x+p.w-3]){const t=tileAt(bx,foot);if(solid(t)){p.y=Math.floor(foot/TS)*TS-p.h;if(t===25&&p._stomping){const bc=Math.floor(bx/TS),br=Math.floor(foot/TS);if(br>=0&&br<ROWS&&bc>=0&&bc<COLS&&grid[br]){grid[br][bc]=0;tileFx('break',bc,br);}p.vy=-8;p._stomping=false;}else if(t===5){tileFx('bounce',Math.floor(bx/TS),Math.floor(foot/TS));p.vy=-16;p.jumps=0;p._bounceJumps=true;spawnParts(p.x+p.w/2,p.y+p.h,'#63c916',8);}else{p.vy=0;p.grounded=true;p.jumps=0;p._stomping=false;}break;}}}
  if(p.vy<0){for(const bx of[p.x+3,p.x+p.w-3]){if(solid(tileAt(bx,p.y))){const tr2=Math.floor(p.y/TS),tc2=Math.floor(bx/TS);if(tr2>=0&&tr2<ROWS&&tc2>=0&&tc2<COLS&&grid[tr2]&&grid[tr2][tc2]===6){grid[tr2][tc2]=0;spawnOrb(tc2*TS+TS/2,tr2*TS-8);spawnParts(tc2*TS+TS/2,tr2*TS,'#EF9F27',12);}p.y=Math.floor(p.y/TS)*TS+TS;p.vy=0;break;}}}
}
function spawnOrb(x,y){const types=['speed','shield','jump','coin'];const t=types[Math.floor(Math.random()*types.length)];if(t==='coin'){coins.push({x,y,vy:-5});return;}powerOrbs.push({x,y,vy:-4,type:t,life:300});}
// V4.1 reusable vector heart (matches the extra-life preview); s = unit scale
function drawHeartShape(g,x,y,s,col){g.save();g.translate(x,y);g.scale(s,s);g.fillStyle=col;g.beginPath();g.moveTo(0,-2.2);g.bezierCurveTo(-3,-5.5,-8,-3.5,-8,0.4);g.bezierCurveTo(-8,3.8,-3.4,6.2,0,8.6);g.bezierCurveTo(3.4,6.2,8,3.8,8,0.4);g.bezierCurveTo(8,-3.5,3,-5.5,0,-2.2);g.closePath();g.fill();g.restore();}
function spawnParts(x,y,col,n){for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-.5)*6,vy:(Math.random()-1.8)*5,life:30,col,r:1+Math.random()*2.2});if(parts.length>180)parts.splice(0,parts.length-180);}
function spawnWinParts(wx,wy,col,n,spread){
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,spd=1.5+Math.random()*(spread||6);
    winParts.push({x:wx,y:wy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,life:90+Math.random()*60,maxLife:150,col,r:1.5+Math.random()*3});}
  if(winParts.length>400)winParts.splice(0,winParts.length-400);
}
function spawnDeathBones(n,px,py){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,spd=3+Math.random()*7;
    deathBones.push({x:px,y:py,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-3,rot:Math.random()*6,vr:(Math.random()-.5)*0.35,life:110,scale:0.5+Math.random()*0.5,col:'#E6E0D0'});
  }
}
function spawnDeathDebris(n,px,py){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,spd=4+Math.random()*9;
    deathDebris.push({x:px,y:py,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-3,rot:Math.random()*6,vr:(Math.random()-.5)*0.4,life:110,size:3+Math.random()*7,col:Math.random()<0.5?'#FFAA33':'#FF4400'});
  }
}
function spawnDeathCloudParts(px,py){
  for(let i=0;i<6;i++){
    deathCloud.push({x:px+(Math.random()-.5)*14,y:py,vy:-(1.1+Math.random()*0.9),driftPhase:Math.random()*Math.PI*2,r:6+Math.random()*8,born:deathSeqTimer,col:Math.random()<0.5?'#FFCC55':'#FF8833',cap:false});
  }
}
function spawnDeathCapParts(px,py,stemHeight){
  for(let i=0;i<3;i++){
    const a=(Math.random()-.5)*Math.PI*1.4;
    deathCloud.push({x:px+Math.cos(a)*6,y:py-stemHeight,vy:-0.15-Math.random()*0.2,vx:Math.cos(a)*(1.4+Math.random()*1.2),driftPhase:Math.random()*Math.PI*2,r:10+Math.random()*14,born:deathSeqTimer,col:Math.random()<0.5?'#FFE099':'#FFB066',cap:true});
  }
}
function deathBlastSound(){try{
  if(!deathAudioCtx)deathAudioCtx=AU_ctx();
  const o=deathAudioCtx.createOscillator(),g=deathAudioCtx.createGain();
  o.connect(g);g.connect(_sfxBus());
  o.frequency.setValueAtTime(180,deathAudioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(40,deathAudioCtx.currentTime+0.5);
  o.type='sawtooth';
  g.gain.setValueAtTime(0.22,deathAudioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,deathAudioCtx.currentTime+0.6);
  o.start();o.stop(deathAudioCtx.currentTime+0.6);}catch(e){}}
function startDeathSequence(px,py){
  deathSeqTimer=0;deathBones=[];deathDebris=[];deathCloud=[];deathFlash=1;deathRing=0;
  deathSeqX=px;deathSeqY=py;
  spawnDeathDebris(20,px,py);spawnDeathBones(18,px,py);
  deathBlastSound();
}
function updateDeathSeq(){
  if(deathTimer<=0&&deathSeqTimer===0)return;
  deathSeqTimer++;
  if(deathFlash>0)deathFlash=Math.max(0,deathFlash-0.07);
  if(deathSeqTimer>2)deathRing=Math.min(360,(deathSeqTimer-2)*9);
  const px=deathSeqX,py=deathSeqY;
  if(deathSeqTimer>14&&deathSeqTimer%3===0&&deathSeqTimer<100)spawnDeathCloudParts(px,py);
  const stemHeight=Math.min(85,(deathSeqTimer-14)*1.2);
  if(deathSeqTimer===100)spawnDeathCapParts(px,py,stemHeight);
  if(deathSeqTimer>100&&deathSeqTimer%6===0&&deathSeqTimer<140)spawnDeathCapParts(px,py,stemHeight);
  deathDebris.forEach(d=>{d.x+=d.vx;d.y+=d.vy;d.vy+=0.15;d.rot+=d.vr;d.life--;});
  deathDebris=deathDebris.filter(d=>d.life>0);
  deathBones.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.vy+=0.16;b.rot+=b.vr;b.life--;});
  deathBones=deathBones.filter(b=>b.life>0);
  deathCloud.forEach(p=>{
    const age=deathSeqTimer-p.born;
    if(p.cap){p.x+=(p.vx||0)*0.96;p.vx=(p.vx||0)*0.96;p.y+=p.vy;}
    else{p.y+=p.vy;p.x+=Math.sin(p.driftPhase+deathSeqTimer*0.05)*0.3;}
  });
  deathCloud=deathCloud.filter(p=>deathSeqTimer-p.born<200);
  if(deathSeqTimer>200){deathSeqTimer=0;deathBones=[];deathDebris=[];deathCloud=[];}
}
function drawDeathSkull(cx2,cy2,scale,alpha,col){
  cx.save();cx.translate(cx2,cy2);cx.scale(scale,scale);cx.globalAlpha=alpha;
  cx.fillStyle=col;cx.shadowBlur=18;cx.shadowColor=col;
  cx.beginPath();
  cx.arc(0,-6,22,Math.PI*0.05,Math.PI*0.95,true);
  cx.lineTo(-16,10);cx.lineTo(-16,16);cx.lineTo(-10,22);cx.lineTo(-10,16);
  cx.lineTo(-4,22);cx.lineTo(-4,16);cx.lineTo(4,16);cx.lineTo(4,22);
  cx.lineTo(10,16);cx.lineTo(10,10);cx.lineTo(16,10);
  cx.closePath();cx.fill();
  cx.shadowBlur=0;
  cx.fillStyle='#07070f';
  cx.beginPath();cx.ellipse(-9,-6,6,7,0,0,Math.PI*2);cx.fill();
  cx.beginPath();cx.ellipse(9,-6,6,7,0,0,Math.PI*2);cx.fill();
  cx.beginPath();cx.moveTo(0,1);cx.lineTo(-4,9);cx.lineTo(4,9);cx.closePath();cx.fill();
  cx.fillStyle=col;cx.fillRect(-9,16,3,3);cx.fillRect(-3,16,3,3);cx.fillRect(3,16,3,3);
  cx.save();cx.rotate(-0.55);cx.fillRect(-30,28,60,5);cx.restore();
  cx.save();cx.rotate(0.55);cx.fillRect(-30,28,60,5);cx.restore();
  cx.restore();
}
function drawDeathBone(x,y,rot,scale,alpha,col){
  cx.save();cx.translate(x,y);cx.rotate(rot);cx.scale(scale,scale);cx.globalAlpha=alpha;
  cx.fillStyle=col;cx.shadowBlur=4;cx.shadowColor=col;
  cx.fillRect(-12,-2.5,24,5);
  cx.beginPath();cx.arc(-12,-4,3.2,0,Math.PI*2);cx.arc(-12,4,3.2,0,Math.PI*2);cx.fill();
  cx.beginPath();cx.arc(12,-4,3.2,0,Math.PI*2);cx.arc(12,4,3.2,0,Math.PI*2);cx.fill();
  cx.restore();
}
function drawDeathOverlay(){
  if(deathSeqTimer===0)return;
  const t=deathSeqTimer;
  const sx2=deathSeqX-camX,sy2=deathSeqY-camY;
  cx.save();
  if(deathFlash>0){cx.globalAlpha=deathFlash;cx.fillStyle='#fff';cx.fillRect(0,0,W,H);}
  cx.restore();
  const shakeEnd=40;
  const shakeMag=t<shakeEnd?Math.max(0,16*(1-t/shakeEnd)):0;
  const ssx=(Math.random()-.5)*shakeMag,ssy=(Math.random()-.5)*shakeMag;
  cx.save();cx.translate(ssx,ssy);
  if(deathRing>0){
    const ringAlpha=Math.max(0,1-deathRing/360);
    cx.save();cx.globalAlpha=ringAlpha*0.8;cx.strokeStyle='#FFCC55';cx.lineWidth=4;cx.shadowBlur=12;cx.shadowColor='#FF8833';
    cx.beginPath();cx.arc(sx2,sy2,deathRing,0,Math.PI*2);cx.stroke();cx.shadowBlur=0;cx.restore();
  }
  if(t<70){
    const glowT=Math.max(0,1-t/60);
    cx.save();cx.globalAlpha=glowT*0.5;
    const rg=cx.createRadialGradient(sx2,sy2,5,sx2,sy2,200);
    rg.addColorStop(0,'#FFEE99');rg.addColorStop(0.4,'#FF8833');rg.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=rg;cx.fillRect(0,0,W,H);cx.restore();
  }
  deathDebris.forEach(d=>{
    const al=Math.max(0,d.life/110);
    cx.save();cx.globalAlpha=al;cx.translate(d.x-camX,d.y-camY);cx.rotate(d.rot);
    cx.fillStyle=d.col;cx.shadowBlur=6;cx.shadowColor=d.col;
    cx.fillRect(-d.size/2,-d.size/2,d.size,d.size);cx.restore();
  });
  deathBones.forEach(b=>{
    drawDeathBone(b.x-camX,b.y-camY,b.rot,b.scale,Math.max(0,b.life/110),b.col);
  });
  const stemHeight=Math.min(85,(t-14)*1.2);
  deathCloud.forEach(p=>{
    const age=t-p.born;
    const al=Math.max(0,Math.min(1,age/20))*Math.max(0,1-Math.max(0,age-150)/40);
    cx.save();cx.globalAlpha=al*0.55;cx.fillStyle=p.col;cx.shadowBlur=10;cx.shadowColor=p.col;
    cx.beginPath();cx.arc(p.x-camX,p.y-camY,p.r,0,Math.PI*2);cx.fill();cx.restore();
  });
  if(t>70){
    const rise=Math.min(1,(t-70)/14);
    const skullY=sy2-stemHeight*0.55-rise*16;
    const overshoot=t<80?1+(1-(t-70)/10)*0.35:1;
    cx.save();cx.translate(sx2,skullY);cx.scale(overshoot,overshoot);
    drawDeathSkull(0,0,1.4,rise,'#FF6644');cx.restore();
  }
  cx.restore();
  if(t>50){
    const tp=Math.min(1,(t-50)/16);
    const titleShake=t<shakeEnd?(Math.random()-.5)*Math.max(0,(shakeEnd-t)*0.3):0;
    cx.save();cx.translate(titleShake,0);
    cx.font='bold 28px monospace';cx.textAlign='center';cx.textBaseline='middle';
    cx.fillStyle='rgba(255,210,150,'+tp+')';cx.shadowBlur=22;cx.shadowColor='#FF6600';
    cx.fillText('YOU ARE DEAD',W/2,H/2);
    cx.shadowBlur=0;cx.restore();
  }
  if(t>140){
    cx.save();cx.globalAlpha=Math.min(1,(t-140)/20);
    cx.fillStyle='#aaa';cx.font='12px monospace';cx.textAlign='center';cx.textBaseline='middle';
    cx.fillText(checkpoint?'respawning at checkpoint\u2026':'respawning\u2026',W/2,H/2+50);
    cx.restore();
  }
}
function winTickSound(){try{
  if(!winAudioCtx)winAudioCtx=AU_ctx();
  const o=winAudioCtx.createOscillator(),g=winAudioCtx.createGain();
  o.connect(g);g.connect(_sfxBus());
  o.frequency.value=440+Math.random()*220;o.type='square';
  g.gain.setValueAtTime(0.06,winAudioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,winAudioCtx.currentTime+0.08);
  o.start();o.stop(winAudioCtx.currentTime+0.08);}catch(e){}}
function winFanfareSound(){try{
  if(!winAudioCtx)winAudioCtx=AU_ctx();
  [523,659,784,1047].forEach((freq,i)=>{
    const o=winAudioCtx.createOscillator(),g=winAudioCtx.createGain();
    o.connect(g);g.connect(_sfxBus());o.frequency.value=freq;o.type='sine';
    const t=winAudioCtx.currentTime+i*0.12;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.15,t+0.03);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.28);o.start(t);o.stop(t+0.3);});}catch(e){}}
function startWinSequence(px,py){
  const secs=Math.max(1,(runEndFrame-runStartFrame)/60);
  let rank='C';
  if(runDeaths===0&&secs<60)rank='S';
  else if(runDeaths===0&&secs<120)rank='A';
  else if(runDeaths<=2)rank='B';
  const tstr=Math.floor(secs/60)+':'+String(Math.floor(secs%60)).padStart(2,'0');
  const noDeath=runDeaths===0;
  const wstat=(lbl,val,col)=>'<div class="ws-stat" style="text-align:center"><div style="font-size:20px;font-weight:bold;color:'+col+';text-shadow:0 0 12px '+col+'">'+val+'</div><div style="font-size:9px;color:#888;letter-spacing:1px">'+lbl+'</div></div>';
  document.getElementById('winStats').innerHTML=
    wstat('TIME',tstr,'#AFA9EC')+
    wstat('COINS','🪙 '+runCoins,'#EF9F27')+
    wstat('DEATHS',runDeaths,noDeath?'#63c916':'#E24B4A')+
    wstat('SCORE','<span id="winScoreNum">0</span>','#63c916')+
    (noDeath?'<div class="ws-stat" style="text-align:center"><div style="font-size:20px">⭐</div><div style="font-size:9px;color:#FFD700;letter-spacing:1px">FLAWLESS</div></div>':'');
  document.getElementById('wbNext').textContent=currentSlot>0&&currentSlot<TOTAL_SLOTS?'NEXT LEVEL →':'🗺 LEVEL SELECT';
  document.getElementById('winBtns').style.display='none';
  const rankEl=document.getElementById('winRank');
  rankEl.textContent='';rankEl.className='';rankEl.dataset.rank=rank;
  document.getElementById('winRankLabel').textContent='';
  document.getElementById('winRankLabel').className='';
  document.getElementById('winTitle').textContent=currentSlot>0?('LEVEL '+currentSlot+' COMPLETE!'):'LEVEL COMPLETE!';
  winTimer=0;winPhase=1;winDisplayScore=0;winTargetScore=score;winParts=[];winAudioCtx=null;
  const wcols=['#FF44FF','#FF88FF','#FFD700','#AFA9EC','#63c916','#FF4488'];
  for(let i=0;i<5;i++)setTimeout(()=>{
    spawnWinParts(px,py,wcols[Math.floor(Math.random()*wcols.length)],18,8);
    spawnWinParts(W/2,H*0.35,'#FF44FF',8,4);
  },i*80);
  document.getElementById('win').style.display='flex';
}
function updateWinAnim(){
  if(!won)return;
  winTimer++;
  if(winPhase===1&&winTimer%12===0){
    const wc=['#FF44FF','#FFD700','#AFA9EC','#63c916','#FF8855'];
    spawnWinParts(W/2+(Math.random()-.5)*W*0.6,H*0.5+(Math.random()-.5)*H*0.3,wc[Math.floor(Math.random()*wc.length)],10,6);
  }
  if(winPhase===1&&winTimer>90){
    winPhase=2;winTimer=0;
    document.querySelectorAll('#winStats .ws-stat').forEach((el,i)=>setTimeout(()=>el.classList.add('show'),i*120));
    winFanfareSound();
  }
  if(winPhase===2){
    const t=Math.min(winTimer/120,1),eased=1-Math.pow(1-t,3);
    const newScore=Math.round(eased*winTargetScore);
    if(newScore!==winDisplayScore){
      winDisplayScore=newScore;
      const el=document.getElementById('winScoreNum');if(el)el.textContent=winDisplayScore;
      if(winTimer%4===0&&t<1)winTickSound();
    }
    if(winTimer>150){winPhase=3;winTimer=0;}
  }
  if(winPhase===3&&winTimer===1){
    const re=document.getElementById('winRank'),rk=re.dataset.rank||'B';
    const lbls={S:'PERFECT RUN',A:'GREAT RUN',B:'LEVEL CLEAR',C:'COMPLETED'};
    re.textContent=rk;re.className='rank-'+rk;
    void re.offsetWidth;requestAnimationFrame(()=>re.classList.add('show'));
    const rl=document.getElementById('winRankLabel');
    rl.textContent=lbls[rk]||'COMPLETED';setTimeout(()=>rl.classList.add('show'),300);
    if(rk==='S')for(let i=0;i<6;i++)setTimeout(()=>{
      spawnWinParts(W*Math.random(),H*0.5,'#FFD700',20,10);
      spawnWinParts(W/2,H*0.4,'#FF44FF',12,8);
    },i*100);
    try{if(!winAudioCtx)winAudioCtx=AU_ctx();
      const rf={S:1047,A:880,B:660,C:440}[rk]||660;
      const ro=winAudioCtx.createOscillator(),rg=winAudioCtx.createGain();
      ro.connect(rg);rg.connect(_sfxBus());
      ro.frequency.value=rf;ro.type='sine';
      rg.gain.setValueAtTime(0.2,winAudioCtx.currentTime);
      rg.gain.exponentialRampToValueAtTime(0.001,winAudioCtx.currentTime+0.6);
      ro.start();ro.stop(winAudioCtx.currentTime+0.6);}catch(e){}
  }
  if(winPhase===3&&winTimer>60){winPhase=4;document.getElementById('winBtns').style.display='flex';}
  for(let i=winParts.length-1;i>=0;i--){
    const wp=winParts[i];wp.x+=wp.vx;wp.y+=wp.vy;wp.vy+=0.12;wp.vx*=0.98;wp.life--;
    if(wp.life<=0)winParts.splice(i,1);
  }
}
function triggerShake(a){shakeAmt=Math.max(shakeAmt,a);}
function damage(){
  if(player.inv>0||player._dash>0)return;
  feelHurt();
  triggerShake(6);
  if(pups.shield>0){pups.shield=0;player.inv=80;spawnParts(player.x+player.w/2,player.y+player.h/2,'#00FFEE',12);updateHUD();return;}
  hp=Math.max(0,hp-1);player.inv=80;spawnParts(player.x+player.w/2,player.y+player.h/2,'#E24B4A',10);updateHUD();
  if(hp===0){deathTimer=72;runDeaths++;lives--;startDeathSequence(player.x+player.w/2,player.y+player.h/2);feelDeath();
    const gameOver=lives<=0; // V4.1 out of lives -> restart level from the start, lives reset
    if(gameOver)lives=DIFF_LIVES();
    updateHUD();
    const _tok=_runToken; // V5.0 ignore this respawn if the player left/restarted the level meanwhile
    setTimeout(()=>{
      if(_tok!==_runToken)return;
      deathTimer=0;hp=DIFF_HP();won=false; // V1.7: reset deathTimer so player unfreezes immediately on respawn
      bullets=[];eBullets=[];enemyBombs=[];pendingEnemies=[];parts=[];grenades=[];explosions=[];laserBeams=[];swordSwing=0;plasmaCharge=0;plasmaCharging=false;
      pups={speed:0,shield:0,jump:0};shootCd=0;
      curW='blaster';wAmmo={blaster:wAmmo.blaster||0,shotgun:0,laser:0,sword:0,grenade:0,freeze:0,plasma:0}; // V6.2 you keep the blaster you found
      if(checkpoint&&!gameOver){
        // respawn at checkpoint — level state (tiles, enemies) stays intact
        player.x=checkpoint.x;player.y=checkpoint.y;player.vx=0;player.vy=0;player.grounded=false;player.jumps=0;player.inv=80;player.facing=1;player._stomping=false;player._bounceJumps=false;player._swCool=0;
        if(lavaCheckpointLevel!=null)lavaLevel=lavaCheckpointLevel; // V4.0 lava back to checkpoint height
        snapCamera(); // V3.8 recentre on checkpoint respawn
      } else {
        // no checkpoint — full level restart
        crumbleBlocks={};doorState={red:false,blue:false};activatedCPs=new Set();checkpoint=null;camX=0;camY=0;
        lavaLevel=ROWS*TS;lavaCheckpointLevel=null; // V4.0 lava back to bottom
        enemies=[];coins=[];powerOrbs=[];crushers=[];laserEmitters=[];flameJets=[];dripBlocks=[];  // V2.5
        resetFallingRocks(); // V2.5 reset rocks to home instead of rebuilding
        restoreCrumbles(); // V1.8: puts tile-42 back in the grid before spawnFromGrid
        movPlats=JSON.parse(JSON.stringify(_savedMovPlats.length>0?_savedMovPlats:[])); // V1.7 fixed
        spawnFromGrid();
        // V1.7: re-spawn enemies from saved list if grid tiles were already consumed
        if(enemies.length===0&&_savedEnemySpawns.length>0){var _mk={drone:mkDrone,turret:mkTurret,shield:mkShield,walker:mkWalker,sniper:mkSniper,charger:mkCharger,bomber:mkBomber,climber:mkClimber};_savedEnemySpawns.forEach(function(e){if(e.type==="sentinel")enemies.push(mkSentinel(e.px,e.py,e.arc,e.shock));else if(e.type==="hive")enemies.push(mkHive(e.px,e.py,e.spawnN));else if(e.type==="warden")enemies.push(mkWarden(e.px,e.py,e.sweepSpd));else if(e.type==="sniper"){var _sn=mkSniper(e.px,e.py);_sn.surf=e.surf;enemies.push(_sn);}else if(_mk[e.type])enemies.push(_mk[e.type](e.px,e.py));});}
        rebuildCrushers();spawnPlayer(true);
      }
      if(gameOver)toast('💀 Out of lives — level restarted');
      else toast('✖ '+lives+' '+(lives===1?'life':'lives')+' left');
      updateHUD();
    },1200);
  }
}
// V2.2: fast snappy spike — quick out, brief hold, quick back, pause
function getSpikeExt(){const p=100,t=frame%p;if(t<10)return t/10;if(t<30)return 1;if(t<40)return 1-(t-30)/10;return 0;}
function camMaxX(){return Math.max(0,COLS*TS-W/((mode==='edit')?editZoom:1));}
function camMaxY(){return Math.max(0,ROWS*TS-H/((mode==='edit')?editZoom:1));}
// V3.8 instantly centre the camera on the player (used on spawn/respawn so the
// view doesn't pan down from the top of a tall level).
// V4.2 camera anchor raised so the player sits above the thumbs on mobile
const CAM={anchorY:0.38,bandY:0.16,lerp:0.1};
function snapCamera(){
  const p=player;
  const maxCam=Math.max(0,COLS*TS-W);
  camX=Math.max(0,Math.min(maxCam,p.x-W*0.35));
  const maxCY=camMaxY();
  camY=maxCY>0?Math.max(0,Math.min(maxCY,p.y+p.h/2-H*CAM.anchorY)):0;
}
function addCols(n){
  n=n||20;
  const nc=COLS+n;
  for(let r=0;r<ROWS;r++){if(!grid[r])continue;const row=new Uint8Array(nc);row.set(grid[r]);for(let c=COLS;c<nc;c++)row[c]=(r===ROWS-1)?1:0;grid[r]=row;}
  COLS=nc;updateColsDisp();
  toast('Width: '+COLS+' tiles · '+(COLS*32)+'px');
}
function addRows(n){
  n=n||5;
  const nr=ROWS+n;
  for(let r=ROWS;r<nr;r++)grid.push(new Uint8Array(COLS));
  ROWS=nr;
  updateDimsDisp();
  toast('Height: '+ROWS+' tiles · '+(ROWS*32)+'px');
}
function setLevelDimensions(){
  const raw=prompt('Set level dimensions\nFormat: WIDTH x HEIGHT  (tiles, e.g. 150x30)\nMax: 500 wide, 200 tall\n\nCurrent: '+COLS+' × '+ROWS,COLS+' x '+ROWS);
  if(!raw)return;
  const parts=raw.split(/[x×,\s]+/i).map(v=>parseInt(v)).filter(v=>!isNaN(v)&&v>0);
  if(!parts.length)return;
  const newW=parts[0], newH=parts[1]||ROWS;
  let changed=false;
  // --- WIDTH ---
  const nc=Math.max(20,Math.min(500,newW));
  if(nc>COLS){
    for(let r=0;r<ROWS;r++){if(!grid[r])continue;const row=new Uint8Array(nc);row.set(grid[r]);for(let c=COLS;c<nc;c++)row[c]=(r===ROWS-1)?1:0;grid[r]=row;}
    COLS=nc;changed=true;
  }else if(nc<COLS){
    if(!confirm('Shrink width to '+nc+' tiles? Columns beyond '+nc+' will be deleted.'))return;
    for(let r=0;r<ROWS;r++){if(grid[r])grid[r]=grid[r].slice(0,nc);}
    COLS=nc;camX=Math.min(camX,camMaxX());changed=true;
  }
  // --- HEIGHT ---
  const nr=Math.max(10,Math.min(200,newH));
  if(nr>ROWS){
    for(let r=ROWS;r<nr;r++)grid.push(new Uint8Array(COLS));
    ROWS=nr;changed=true;
  }else if(nr<ROWS){
    if(!confirm('Shrink height to '+nr+' tiles? Rows below '+nr+' will be deleted.'))return;
    grid=grid.slice(0,nr);
    ROWS=nr;camY=Math.min(camY,camMaxY());changed=true;
  }
  // Ensure floor row is solid
  if(changed){
    for(let c=0;c<COLS;c++)if(!grid[ROWS-1][c])grid[ROWS-1][c]=1;
    updateDimsDisp();
    toast('Level: '+COLS+' × '+ROWS+' tiles  (· '+(COLS*32)+' × '+(ROWS*32)+'px)');
  }
}
function updateDimsDisp(){const el=document.getElementById('dimsDisp');if(el)el.textContent=COLS+'×'+ROWS;}
function updateColsDisp(){updateDimsDisp();}
