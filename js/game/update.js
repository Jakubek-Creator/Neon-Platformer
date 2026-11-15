// Neon Platformer — Main game update (one 60Hz tick)
// ── UPDATE ──
function update(){
  if(mode!=='play'||won||paused)return;  // V2.6 pause check
  frame++;
  // V1.4 shake
  if(FEEL.on){if(shakeAmt>0){feelShake(shakeAmt);shakeAmt=0;}}else if(shakeAmt>0){shakeX=(Math.random()-.5)*shakeAmt*2;shakeY=(Math.random()-.5)*shakeAmt*2;shakeAmt*=0.82;if(shakeAmt<0.3)shakeAmt=0;}else{shakeX=0;shakeY=0;}
  // V1.7: freeze game logic during death animation (draw() still runs for the overlay)
  updateDeathSeq();
  if(startHintTimer>0)startHintTimer--;
  if(deathTimer>0){deathTimer--;return;}
  if(pickupFlash.t>0)pickupFlash.t--;
  // V4.0 rising lava (Lava theme only)
  if(levelTheme===2&&lavaRiseSpeed>0){
    lavaLevel-=lavaRiseSpeed;
    if(lavaLevel<-TS*2)lavaLevel=-TS*2;
    if(player.y+player.h>lavaLevel&&player.inv===0)damage();
  }
  const p=player;
  if(p.inv>0)p.inv--;if(tpCool>0)tpCool--;if(pups.speed>0)pups.speed--;if(pups.jump>0)pups.jump--;if(p._swCool>0)p._swCool--;if(shootCd>0)shootCd--;if(swordSwing>0)swordSwing--;
  if(won)updateWinAnim();
  if(!p._wasGnd&&p.grounded)p._landAnim=9;if(p._landAnim>0)p._landAnim--;p._wasGnd=p.grounded;
  if(plasmaCharging&&(keys['KeyZ']||keys['KeyX']))plasmaCharge=Math.min(plasmaCharge+1.2,60);
  const wet=tileAt(p.x+p.w/2,p.y+p.h*.6)===2||twistWet();p.wet=wet;
  // V3.6: snappier feel — faster run, slightly stronger gravity + jump, higher fall cap
  const spd=(wet?2.3:4.8)*(pups.speed>0?1.6:1),grav=wet?0.2:0.6,maxFall=wet?3.4:15;
  const maxJumps=p._bounceJumps?3:pups.jump>0?3:2;
  if(p.grounded)p._bounceJumps=false;
  const uf=tileAt(p.x+p.w/2,p.y+p.h+2);
  const onIce=(uf===8)||(levelTheme===1&&p.grounded&&solid(uf));
  if(movesPre(p,grav,wet)){}  // V5.8 dash / pound hang / wall-jump push-off
  else if(keys['ArrowLeft']||keys['KeyA']||touchKeys.left||gyroKeys.left){const s2=spd*tpadSpeed();p.vx=onIce?Math.max(p.vx-(wet?0.5:0.55),-s2):-s2;p.facing=-1;}
  else if(keys['ArrowRight']||keys['KeyD']||touchKeys.right||gyroKeys.right){const s2=spd*tpadSpeed();p.vx=onIce?Math.min(p.vx+(wet?0.5:0.55),s2):s2;p.facing=1;}
  else p.vx*=onIce?0.985:(wet?0.80:0.68);
  if(uf===9)p.vx=Math.min(p.vx+0.35,5.5);if(uf===10)p.vx=Math.max(p.vx-0.35,-5.5);
  if((uf===20||uf===21)&&p._swCool===0){const col=uf===20?'red':'blue';doorState[col]=!doorState[col];p._swCool=30;spawnParts(p.x+p.w/2,p.y+p.h,uf===20?'#FF5555':'#5555FF',8);toast((uf===20?'🔴':'🔵')+' '+col+' doors '+(doorState[col]?'OPEN':'CLOSED')+'!');}
  const jk=keys['ArrowUp']||keys['KeyW']||keys['Space']||touchKeys.jump;
  if(jk&&!keys._pj&&GH.st!=='pull'&&GH.st!=='swing'&&!(p._dash>0)&&!(p._poundHang>0)&&!movesWallJump(p)&&(p.grounded||p.jumps<maxJumps)){const jp=p._bounceJumps?-12.8:-11.8;p.vy=wet?-6.4:jp;p.jumps++;spawnParts(p.x+p.w/2,p.y+p.h,'#7F77DD',5);}
  keys._pj=jk;
  if((keys['ArrowDown']||keys['KeyS']||touchKeys.down)&&!p.grounded&&!p._stomping&&!(p._dash>0)&&p.vy>-4){movesPoundStart(p);spawnParts(p.x+p.w/2,p.y+p.h,'#FFAA00',8);}
  p.vy=Math.min(p.vy+grav,maxFall);
  twistPhysics(p);
  const _pounding=p._stomping&&!p._poundHang;
  moveX(p);moveY(p);checkSlopes(p);updateMovPlats();checkMovPlats(p);
  if(_pounding&&p.grounded)movesPound(p);
  if(p.grounded)p._stomping=false;
  // stomp enemies
  enemies=enemies.filter(e=>{const onTop=p.x+p.w>e.x+3&&p.x<e.x+e.w-3&&p.y+p.h>=e.y&&p.y+p.h<e.y+e.h*0.6&&p.vy>1;if(!onTop)return true;if(e.type==='sentinel'){p.vy=-7;p._stomping=false;spawnParts(p.x+p.w/2,p.y+p.h,'#4488FF',6);return true;}if(e.type==='bomber'){p.vy=-7;p._stomping=false;spawnParts(p.x+p.w/2,p.y+p.h,'#AA44FF',6);return true;}if(e.type==='hive'||e.type==='warden'){p.vy=-7;p._stomping=false;spawnParts(p.x+p.w/2,p.y+p.h,e.type==='hive'?'#9CE85A':'#FFAA44',6);return true;}e.hp=0;enemyDied(e);p.vy=-9;p._stomping=false;p.jumps=0;spawnParts(e.x+e.w/2,e.y+e.h/2,'#FF4444',20);score+=(e.type==='shield'||e.type==='turret')?100:75;updateHUD();return false;});
  // teleporters
  if(tpCool===0){const tc=Math.floor((p.x+p.w/2)/TS),tr2=Math.floor((p.y+p.h)/TS);if(tr2>=0&&tr2<ROWS&&tc>=0&&tc<COLS&&grid[tr2]){const t=grid[tr2][tc];if(t===11||t===12){const tgt=t===11?12:11;outer:for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(grid[r]&&grid[r][c]===tgt){p.x=c*TS;p.y=(r-1)*TS;p.vy=0;spawnParts(p.x+p.w/2,p.y+p.h,'#00FF99',15);tpCool=60;break outer;}}}}
  const mid=tileAt(p.x+p.w/2,p.y+p.h/2),flo=tileAt(p.x+p.w/2,p.y+p.h+1);
  if(mid===3||flo===3||mid===45||flo===45)damage();
  if((mid===4||flo===4)&&getSpikeExt()>0.5)damage();
  if(mid===24){const tc=Math.floor((p.x+p.w/2)/TS),tr2=Math.floor((p.y+p.h/2)/TS),key=tc+','+tr2;if(!activatedCPs.has(key)){activatedCPs.add(key);checkpoint={x:p.x,y:p.y-4};lavaCheckpointLevel=lavaLevel;spawnParts(p.x+p.w/2,p.y,'#00FF88',15);toast('🚩 Checkpoint saved!');updateHUD();}}
  if(mid===7){
    const bossAlive=enemies.some(e=>e.type==='sentinel'||e.type==='hive'||e.type==='warden');
    if(bossAlive){
      if(!player._portalLockMsg||frame-player._portalLockMsg>120){toast('🔒 Defeat the boss first!');player._portalLockMsg=frame;}
    } else {
      won=true;runEndFrame=frame;
      startWinSequence(p.x+p.w/2,p.y);
    }
  }
  if(p.y>ROWS*TS+60)damage();  // V3.8 fall-death uses world height (camY may be scrolled)
  // keys
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(!grid[r])continue;const kt=grid[r][c];if(kt!==16&&kt!==17)continue;const kx=c*TS+TS/2,ky=r*TS+TS/2,dx=(p.x+p.w/2)-kx,dy=(p.y+p.h/2)-ky;if(dx*dx+dy*dy<(TS*1.3)**2){const col=kt===16?'red':'blue';grid[r][c]=0;doorState[col]=true;spawnParts(kx,ky,kt===16?'#FF5555':'#5555FF',15);toast((kt===16?'🔴':'🔵')+' key — '+col+' doors open!');}}
  // vents
  const pc=Math.floor((p.x+p.w/2)/TS);for(let dc=-1;dc<=1;dc++){const c=pc+dc;if(c<0||c>=COLS)continue;for(let r=0;r<ROWS;r++){if(!grid[r]||grid[r][c]!==23)continue;const ph=getVentPhase(c,r);if(ph<0.4)continue;if(p.x+p.w>c*TS&&p.x<c*TS+TS&&p.y+p.h>(r-4)*TS&&p.y<r*TS)damage();}}
  // V2.5 SAW — always damages on contact
  if((mid===48||flo===48)&&player.inv===0)damage();
  crushers.forEach(updateCrusher);
  // V2.5 FLAME JETS
  flameJets.forEach(function(fj){
    fj.timer=(fj.timer+1)%120;
    fj.active=fj.timer>=80&&fj.timer<112;
    if(!fj.active){fj.reach=0;return;}
    fj.reach=0;
    for(let r2=fj.gy+fj.dir;r2>=0&&r2<ROWS;r2+=fj.dir){
      if(solid(grid[r2]&&grid[r2][fj.gx]||0))break;
      fj.reach++;
    }
    if(player.inv===0&&fj.reach>0){
      const fy1=fj.dir<0?(fj.gy-fj.reach)*TS:fj.gy*TS;
      const fy2=fj.dir<0?fj.gy*TS:(fj.gy+fj.reach+1)*TS;
      if(player.x+player.w>fj.gx*TS&&player.x<fj.gx*TS+TS&&player.y+player.h>fy1&&player.y<fy2)damage();
    }
  });
  // V3.3/3.4 DRIP BLOCKS (tile 52 acid / 53 lava) — multi-drop, droplet+underside damage, brief puddle on landing surface
  dripBlocks.forEach(function(db){
    const bx=db.gx*TS, byBottom=(db.gy+1)*TS;
    const spd=db.speed||1;
    // deadly underside: player head touching block's lower face
    if(player.inv===0 && player.x+player.w>bx+2 && player.x<bx+TS-2 &&
       player.y<byBottom && player.y>byBottom-TS) damage();
    // spawn drops from random columns along the block, sometimes 1-2 at once (faster speed = more frequent)
    db.nextT--;
    if(db.nextT<=0){
      const n=1+(Math.random()<0.5?1:0);
      for(let i=0;i<n;i++) db.drops.push({x:bx+5+Math.random()*(TS-10),y:byBottom+4,vy:1.4*spd});
      db.nextT=Math.round((20+Math.random()*22)/spd);
    }
    // move drops + find landing
    for(let i=db.drops.length-1;i>=0;i--){
      const d=db.drops[i];
      d.vy=Math.min(d.vy+0.5*spd,13*spd); d.y+=d.vy;
      // damage player mid-air
      if(player.inv===0 && d.x>player.x && d.x<player.x+player.w && d.y>player.y && d.y<player.y+player.h){
        damage(); db.drops.splice(i,1); continue;
      }
      // find first solid tile beneath the drop's column → land on its TOP surface
      const tc=Math.floor(d.x/TS), tr=Math.floor(d.y/TS);
      const offWorld = d.y>ROWS*TS+20;  // V3.8 world height (camY may scroll)
      const onSolid = tr>=0&&tr<ROWS&&tc>=0&&tc<COLS&&grid[tr]&&solid(grid[tr][tc]);
      if(onSolid||offWorld){
        const surfY = onSolid ? tr*TS : Math.floor(d.y/TS)*TS; // top of the block it lands on
        db.puddles.push({x:d.x, surfY:surfY, life:48, lava:db.lava});
        spawnParts(d.x, surfY, db.lava?'#FF8A3C':'#7CFF3C', 4);
        db.drops.splice(i,1);
      }
    }
    // puddles: brief lingering hazard resting on the block surface
    for(let i=db.puddles.length-1;i>=0;i--){
      const pu=db.puddles[i]; pu.life--;
      if(player.inv===0 && player.x+player.w>pu.x-7 && player.x<pu.x+7 &&
         player.y+player.h>pu.surfY-4 && player.y+player.h<pu.surfY+6) damage();
      if(pu.life<=0) db.puddles.splice(i,1);
    }
  });
  // V2.5 FALLING ROCKS
  fallingRocks.forEach(updateFallingRock);
  // ── CRUMBLE BLOCKS ──
  // Start crumbling when player stands on tile 42
  if(p.grounded){
    const fr2=Math.floor((p.y+p.h)/TS);
    for(const bx2 of[p.x+4,p.x+p.w-4]){
      const fc2=Math.floor(bx2/TS);
      if(fc2>=0&&fc2<COLS&&fr2>=0&&fr2<ROWS&&grid[fr2]&&grid[fr2][fc2]===42){
        const key=fc2+','+fr2;
        if(crumbleBlocks[key]===undefined)crumbleBlocks[key]=45;
      }
    }
  }
  // Tick all active crumble timers
  for(const key in crumbleBlocks){
    crumbleBlocks[key]--;
    if(crumbleBlocks[key]<=0){
      const[sc2,sr2]=key.split(',').map(Number);
      if(grid[sr2]&&grid[sr2][sc2]===42){
        grid[sr2][sc2]=0;
        tileFx('crumble',sc2,sr2);
      }
      delete crumbleBlocks[key];
    }
  }
  // camera
  const maxCam=Math.max(0,COLS*TS-W);camX+=(Math.max(0,Math.min(maxCam,p.x-W*0.35+(FEEL.on?FEEL.look:0)))-camX)*0.1;
  // V3.8 vertical camera follow — only scrolls when the level is taller than the viewport.
  // A deadzone band keeps small hops from jittering the view; eases toward the target like camX.
  const maxCamY=camMaxY();
  if(maxCamY>0){
    const pcy=p.y+p.h/2;                 // player centre Y (world)
    const band=H*CAM.bandY;              // vertical deadzone half-height (V4.2)
    const top=camY+H*CAM.anchorY-band, bot=camY+H*CAM.anchorY+band;
    let wantY=camY;
    if(pcy<top)      wantY=camY+(pcy-top);
    else if(pcy>bot) wantY=camY+(pcy-bot);
    wantY=Math.max(0,Math.min(maxCamY,wantY));
    camY+=(wantY-camY)*CAM.lerp;
  } else camY+=(0-camY)*0.2;             // short level: glide back to top
  // trail
  const isMoving=Math.abs(p.vx)>0.3||!p.grounded;
  if(isMoving&&frame%2===0)trail.push({x:p.x+p.w/2,y:p.y+p.h*0.85,r:p.w*0.36+Math.random()*2,alpha:0.5,wet:p.wet});
  trail=trail.filter(s=>{s.alpha-=0.028;s.r*=0.97;return s.alpha>0;});
  // bullets
  bullets=bullets.filter(b=>{
    b.x+=b.vx;if(b.vy)b.y+=b.vy;b.life--;
    if(b.life<=0||b.x<-100||b.x>camX+W+200||b.y<camY-100||b.y>camY+H+100)return false;
    const tc=Math.floor(b.x/TS),tr2=Math.floor(b.y/TS);
    if(tc>=0&&tc<COLS&&tr2>=0&&tr2<ROWS&&solid(tileAt(b.x,b.y))){
      if(b.type==='plasma'){spawnExplosion(b.x,b.y,b.r*2.5,WDEFS.plasma.col);}
      else{if(grid[tr2]&&grid[tr2][tc]===25){grid[tr2][tc]=0;tileFx('break',tc,tr2);}spawnParts(b.x,b.y,'#D85A30',3);}
      return false;
    }
    let hit=false;
    enemies=enemies.filter(e=>{
      if(hit&&b.type!=='plasma')return true;
      const bdx=b.x-(e.x+e.w/2),bdy=b.y-(e.y+e.h/2);
      const hitR=b.type==='plasma'?(b.r+e.w/2):(e.w/2+5);
      if(bdx*bdx+bdy*bdy<hitR*hitR){
        if(b.type==='freeze'){e.frozen=180;spawnParts(b.x,b.y,'#88EEFF',6);hit=true;return true;}
        if(e.type==='shield'&&b.type!=='sword'){const blocked=(e.facing===1&&b.vx<0)||(e.facing===-1&&b.vx>0);if(blocked){spawnParts(b.x,b.y,'#4488FF',4);hit=true;return true;}}
        // V3.8 Sentinel: rotating shield blocks shots from the covered arc (unless dropped for a volley)
        if(e.type==='sentinel'&&e.shieldDown<=0){
          const hitAng=Math.atan2(b.y-(e.y+e.h/2),b.x-(e.x+e.w/2));
          let diff=Math.abs(((hitAng-e.ang+Math.PI*3)%(Math.PI*2))-Math.PI);
          if(diff<1.1){spawnParts(b.x,b.y,'#4488FF',5);hit=true;return true;}
        }
        // V4.0 Hive: armored shell blocks all damage while sealed (weak point only when open)
        if(e.type==='hive'&&e.state==='sealed'){spawnParts(b.x,b.y,'#639922',4);hit=true;return b.type==='plasma'?b.life>0:true;}
        e.hp-=(b.type==='plasma'?3:1);e.inv=20;spawnParts(b.x,b.y,'#FF4444',5);
        if(b.type==='plasma'){spawnExplosion(b.x,b.y,b.r*2.5,WDEFS.plasma.col);return e.hp>0;}
        hit=true;return e.hp>0;
      }
      return true;
    });
    return!hit||(b.type==='plasma'&&b.life>0);
  });
  // grenades
  grenades=grenades.filter(g=>{
    g.x+=g.vx;g.y+=g.vy;g.vy+=0.45;g.life--;
    if(solid(tileAt(g.x,g.y+8))&&g.bounced<1){g.vy*=-0.55;g.vx*=0.7;g.bounced++;}
    if(g.life<=0||(solid(tileAt(g.x,g.y+8))&&g.bounced>=1)){spawnExplosion(g.x,g.y,55,'#FF6600');return false;}
    return true;
  });
  explosions=explosions.filter(ex=>{ex.r=Math.min(ex.r+ex.maxR/8,ex.maxR);ex.life--;return ex.life>0;});
  laserBeams=laserBeams.filter(lb=>{lb.life--;return lb.life>0;});
  eBullets=eBullets.filter(b=>{if(b.grav)b.vy+=b.grav;b.x+=b.vx;b.y+=b.vy;b.life--;if(b.life<=0)return false;if(solid(tileAt(b.x,b.y))){spawnParts(b.x,b.y,b.acid?'#5DCAA5':'#FF6600',3);return false;}const dx=b.x-(p.x+p.w/2),dy=b.y-(p.y+p.h/2);if(dx*dx+dy*dy<(p.w/2+4)**2){damage();return false;}return true;});
  coins=coins.filter(c=>{if(c.vy!=null){c.y+=c.vy;c.vy+=0.4;if(solid(tileAt(c.x,c.y+8)))c.vy=null;}const dx=(p.x+p.w/2)-c.x,dy=(p.y+p.h/2)-c.y;if(dx*dx+dy*dy<256){score+=10;runCoins++;updateHUD();spawnParts(c.x,c.y,'#EF9F27',8);coinPops.push({x:c.x,y:c.y,life:50,vy:-0.9});return false;}return true;});
  // V4.1 advance coin pickup popups
  for(let i=coinPops.length-1;i>=0;i--){const cp=coinPops[i];cp.y+=cp.vy;cp.vy*=0.96;cp.life--;if(cp.life<=0)coinPops.splice(i,1);}
  powerOrbs=powerOrbs.filter(o=>{
    if(o.vy!=null){o.y+=o.vy;o.vy+=0.3;if(solid(tileAt(o.x,o.y+8)))o.vy=null;}o.life--;
    const dx=(p.x+p.w/2)-o.x,dy=(p.y+p.h/2)-o.y;
    if(dx*dx+dy*dy<300){
      if(o.type==='speed')pups.speed=300;
      if(o.type==='shield')pups.shield=1;
      if(o.type==='jump')pups.jump=400;
      if(o.type==='hook'){hasHook=true;_ghBtn();toast('⚓ GRAPPLING HOOK! Hold C / Shift to swing');spawnParts(o.x,o.y,'#40e8ff',18);coinPops.push({x:o.x,y:o.y,life:60,vy:-0.9,txt:'GRAPPLE!',col:'#7ff6ff'});return false;}
      if(o.type==='wpick'){const def=WDEFS[o.weapon];wAmmo[o.weapon]=(wAmmo[o.weapon]===Infinity?Infinity:Math.min((wAmmo[o.weapon]||0)+def.maxAmmo,def.maxAmmo));selectW(o.weapon);toast(def.icon+' '+def.name+' equipped!');}
      if(o.type==='life'){lives++;toast('💚 1UP! '+lives+' lives');spawnParts(o.x,o.y,'#44DD66',16);coinPops.push({x:o.x,y:o.y,life:55,vy:-0.9,txt:'+1 LIFE',col:'#7CF09A'});updateHUD();return false;}
      if(o.type==='heart'){if(hp<5){hp++;toast('❤ +1 Heart');spawnParts(o.x,o.y,'#FF3366',16);coinPops.push({x:o.x,y:o.y,life:55,vy:-0.9,txt:'+1 HEART',col:'#FF6699'});}else{toast('❤ Health full');spawnParts(o.x,o.y,'#FF3366',8);}updateHUD();return false;}
      score+=20;updateHUD();spawnParts(o.x,o.y,'#FFEE00',12);return false;
    }
    return o.life>0;
  });
  // V1.4 touch fire/cycle
  if(touchKeys.fire&&!touchKeys._lf&&mode==='play'&&!won)fireWeapon();
  touchKeys._lf=touchKeys.fire;
  if(touchKeys.cycle&&!touchKeys._lc&&mode==='play'&&!won)cycleW(1);
  touchKeys._lc=touchKeys.cycle;
  // ── LASER EMITTERS ──
  laserEmitters.forEach(function(em){
    em.timer=(em.timer+1)%180;
    em.active=em.timer>=140&&em.timer<175;
    if(em.active){
      var by2=em.gy*TS+TS/2;
      if(em.dir>0){
        em.bx1=em.gx*TS+TS; em.bx2=em.bx1;
        for(var sc2=em.gx+1;sc2<COLS;sc2++){if(solid(grid[em.gy]&&grid[em.gy][sc2]||0))break;em.bx2=sc2*TS+TS;}
      }else{
        em.bx2=em.gx*TS; em.bx1=em.bx2;
        for(var sc3=em.gx-1;sc3>=0;sc3--){if(solid(grid[em.gy]&&grid[em.gy][sc3]||0))break;em.bx1=sc3*TS;}
      }
      em.by=by2;
      if(player.inv===0&&player.y<by2+6&&player.y+player.h>by2-6&&player.x+player.w>em.bx1&&player.x<em.bx2)damage();
    }
  });
  enemies=enemies.filter(e=>{updateEnemy(e);if(e.hp<=0){enemyDied(e);if(e.type==='sentinel'){spawnParts(e.x+e.w/2,e.y+e.h/2,'#FF44FF',40);spawnParts(e.x+e.w/2,e.y+e.h/2,'#4488FF',24);triggerShake(12);score+=500;toast('👁 Sentinel defeated! +500');updateHUD();return false;}if(e.type==='hive'){spawnParts(e.x+e.w/2,e.y+e.h/2,'#9CE85A',40);spawnParts(e.x+e.w/2,e.y+e.h/2,'#63c916',24);triggerShake(12);score+=600;toast('🐝 The Hive destroyed! +600');updateHUD();return false;}if(e.type==='warden'){spawnParts(e.x+e.w/2,e.y+e.h/2,'#FFAA44',40);spawnParts(e.x+e.w/2,e.y+e.h/2,'#FF8800',24);triggerShake(12);score+=550;toast('⚔ Warden defeated! +550');updateHUD();return false;}const sc=e.type==='bomber'?125:(e.type==='climber'?110:(e.type==='charger'?100:50));spawnParts(e.x+e.w/2,e.y+e.h/2,'#FF4444',15);score+=sc;updateHUD();return false;}return true;});
  if(pendingEnemies.length){for(const pe of pendingEnemies)enemies.push(pe);pendingEnemies.length=0;}
  updateBombs();
  parts=parts.filter(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.vy+=0.15;pt.life--;return pt.life>0;});
}
