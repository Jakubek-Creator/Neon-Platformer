// Neon Platformer — Enemies, minibosses, crushers, hazards
// ── ENEMY FACTORIES ──
function mkDrone(px,py){return{x:px,y:py,px,py,vx:-1.2,vy:0,w:20,h:20,grounded:false,alert:0,hp:2,inv:0,frozen:0,type:'drone'};}
function mkTurret(px,py){return{x:px,y:py,px,py,vx:1.8,vy:0,w:22,h:18,grounded:false,alert:0,hp:2,inv:0,frozen:0,type:'turret',shootTimer:90};}
function mkShield(px,py){return{x:px,y:py,px,py,vx:-0.8,vy:0,w:22,h:22,grounded:false,alert:0,hp:3,inv:0,frozen:0,type:'shield',facing:1};}
function mkWalker(px,py){return{x:px,y:py,px,py,vx:1.2,vy:0,w:20,h:24,grounded:false,alert:0,hp:1,inv:0,frozen:0,type:'walker'};}
function mkSniper(px,py){return{x:px,y:py,px,py,vx:0,vy:0,w:20,h:22,grounded:false,alert:0,hp:3,inv:0,frozen:0,type:'sniper',lockTimer:0,shootCd2:150,facing:1,surf:null};}
// Charger — paces, telegraphs, then dashes; stuns on wall impact
function mkCharger(px,py){return{x:px,y:py,px,py,vx:1.2,vy:0,w:24,h:26,grounded:false,alert:0,hp:3,inv:0,frozen:0,type:'charger',state:'patrol',timer:0,facing:1,dvx:0};}
// Bomber — hovers near ceiling, tracks player X, drops bombs
function mkBomber(px,py){return{x:px,y:py,px,py,vx:1.4,vy:0,w:26,h:18,grounded:false,alert:0,hp:2,inv:0,frozen:0,type:'bomber',wob:Math.random()*6,timer:90,homeY:py};}
// Climber — clings to a wall, slides vertically, lobs arcing shots
function mkClimber(px,py){return{x:px,y:py,px,py,vx:0,vy:1.4,w:20,h:22,grounded:false,alert:0,hp:3,inv:0,frozen:0,type:'climber',timer:90,side:1,minY:py-TS*3,maxY:py+TS*3,wallSide:-1};}
// Sentinel miniboss — slow arcing jumps, rotating shield, volley, two phases
function mkSentinel(px,py,arc,shock){return{
  x:px,y:py,px,py,vx:0,vy:0,w:44,h:44,grounded:false,alert:0,hp:8,inv:0,frozen:0,type:'sentinel',
  ang:Math.random()*Math.PI*2, state:'wait', timer:90, crouch:0, targetX:px, shieldDown:0,
  volleyTimer:200, pounce:false,
  arc:(arc!=null?arc:BOSS_DEFAULT_ARC), shock:(shock!=null?shock:BOSS_DEFAULT_SHOCK)
};}
// HIVE miniboss — sealed/invulnerable core that opens to spawn drones; weak point during open window
function mkHive(px,py,spawnN){return{
  x:px,y:py,px,py,vx:0,vy:0,w:52,h:52,grounded:true,alert:0,hp:10,inv:0,frozen:0,type:'hive',
  state:'sealed', timer:130, open:0, pulse:0, homeY:py,
  spawnN:(spawnN!=null?spawnN:HIVE_DEFAULT_SPAWN)
};}
// WARDEN miniboss — dashes wall-to-wall then plants and fires a rotating sweep beam; exposed after
function mkWarden(px,py,sweepSpd){return{
  x:px,y:py,px,py,vx:0,vy:0,w:34,h:34,grounded:false,alert:0,hp:9,inv:0,frozen:0,type:'warden',
  state:'idle', timer:80, facing:1, beam:0, sweep:0, dashCount:0,
  sweepSpd:(sweepSpd!=null?sweepSpd:WARDEN_DEFAULT_SWEEP)
};}
function updateSniper(e){
  if(e.frozen>0){e.frozen--;return;}if(e.inv>0)e.inv--;
  const p=player,dx=(p.x+p.w/2)-(e.x+e.w/2),dy=(p.y+p.h/2)-(e.y+e.h/2),dist=Math.sqrt(dx*dx+dy*dy);
  e.facing=dx>0?1:-1;
  // anchored to a wall/ceiling → stay perfectly still. Only an un-anchored (floor) one falls.
  if(e.surf==='ceiling'||e.surf==='left'||e.surf==='right'){
    e.vy=0; e.grounded=true;
  } else {
    e.vy=Math.min(e.vy+0.5,14);e.y+=e.vy;e.grounded=false;
    if(e.vy>=0){const foot=e.y+e.h;for(const bx of[e.x+2,e.x+e.w-2]){if(solid(tileAt(bx,foot))){e.y=Math.floor(foot/TS)*TS-e.h;e.vy=0;e.grounded=true;break;}}}
    if(e.y>ROWS*TS+80){e.x=e.px;e.y=e.py;e.vy=0;}
  }
  if(e.shootCd2>0)e.shootCd2--;
  if(dist<280&&e.shootCd2===0){
    e.lockTimer++;
    if(e.lockTimer>=90){const len=Math.max(dist,1);eBullets.push({x:e.x+e.w/2,y:e.y+e.h/2,vx:dx/len*8,vy:dy/len*8,life:90});e.lockTimer=0;e.shootCd2=130;triggerShake(3);}
  }else{e.lockTimer=Math.max(0,e.lockTimer-2);}
  if(e.inv===0&&dist<(e.w/2+player.w/2)+2)damage();
}


// ── CRUSHERS ──
function makeCrusher(col,row){const o=hazOpts[row+','+col];return{col,row,x:col*TS,homeY:row*TS,y:row*TS,w:TS,h:TS*1.5,vy:0,state:'wait',timer:o&&o.phase!=null?60+Math.floor(o.phase*120):60+Math.floor(Math.random()*120)};}
function rebuildCrushers(){crushers=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(grid[r]&&grid[r][c]===22)crushers.push(makeCrusher(c,r));}}
// Falling Rocks
function makeFallingRock(col,row){return{col,row,x:col*TS,homeY:row*TS,y:row*TS,w:TS,h:TS,vy:0,state:'idle',timer:0};}
function resetFallingRocks(){fallingRocks.forEach(function(fr){fr.y=fr.homeY;fr.vy=0;fr.state='idle';fr.timer=0;});}
function updateFallingRock(fr){
  const p=player;
  const ox=fr.state==='warn'?(Math.random()-.5)*3:0;fr.shakeX=ox;
  if(fr.state==='idle'){
    const pBelow=p.x+p.w>fr.x-4&&p.x<fr.x+fr.w+4&&p.y>=fr.y&&p.y<fr.y+10*TS;
    if(pBelow){fr.state='warn';fr.timer=38;}
  } else if(fr.state==='warn'){
    fr.timer--;if(fr.timer<=0){fr.state='fall';fr.vy=0;}
  } else if(fr.state==='fall'){
    fr.vy=Math.min(fr.vy+1.8,18);fr.y+=fr.vy;
    const landed=solid(tileAt(fr.x+4,fr.y+fr.h))||solid(tileAt(fr.x+fr.w-4,fr.y+fr.h))||fr.y>fr.homeY+14*TS;
    if(landed){fr.y=Math.min(fr.y,fr.homeY+14*TS);fr.vy=0;fr.state='landed';fr.timer=140;shakeAmt=5;spawnParts(fr.x+fr.w/2,fr.y+fr.h,'#AA6633',12);}
    if(p.x+p.w>fr.x+2&&p.x<fr.x+fr.w-2&&p.y+p.h>fr.y&&p.y<fr.y+fr.h)damage();
  } else if(fr.state==='landed'){
    fr.timer--;
    if(p.x+p.w>fr.x+2&&p.x<fr.x+fr.w-2&&p.y+p.h>fr.y&&p.y<fr.y+fr.h)damage();
    if(fr.timer<=0){fr.y=fr.homeY;fr.vy=0;fr.state='idle';}
  }
}
// snapshot all tile-42 positions so they can be restored on respawn
function saveCrumbles(){_savedCrumbles=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(grid[r]&&grid[r][c]===42)_savedCrumbles.push({r,c});}}
function restoreCrumbles(){if(typeof twistInit==='function')twistInit();if(typeof movesReset==='function')movesReset();if(typeof feelReset==='function')feelReset();if(typeof clearTileFx==='function')clearTileFx();_savedCrumbles.forEach(function(pos){if(grid[pos.r])grid[pos.r][pos.c]=42;});crumbleBlocks={};}
function getVentPhase(c,r){const period=240,offset=(c*37+r*17)%period,t=(frame+offset)%period;if(t<120)return 0;if(t<150)return(t-120)/30;if(t<180)return 1;return Math.max(0,1-(t-180)/30);}
function updateCrusher(cr){
  const p=player;
  const pBelow=p.x+p.w>cr.x&&p.x<cr.x+cr.w&&p.y>cr.y+cr.h&&p.y<cr.y+cr.h+6*TS;
  const hit=p.x+p.w>cr.x&&p.x<cr.x+cr.w&&p.y+p.h>cr.y&&p.y<cr.y+cr.h;
  if(cr.state==='wait'){cr.timer--;if(pBelow||cr.timer<=0){cr.state='warn';cr.timer=25;}}
  else if(cr.state==='warn'){cr.timer--;if(cr.timer<=0)cr.state='fall';}
  else if(cr.state==='fall'){cr.vy=Math.min(cr.vy+2,18);cr.y+=cr.vy;if(solid(tileAt(cr.x+2,cr.y+cr.h))||solid(tileAt(cr.x+cr.w-2,cr.y+cr.h))||cr.y>cr.homeY+6*TS){cr.y=Math.min(cr.y,cr.homeY+6*TS);cr.vy=0;cr.state='held';cr.timer=50;}if(hit)damage();}
  else if(cr.state==='held'){cr.timer--;if(cr.timer<=0)cr.state='rise';if(hit)damage();}
  else if(cr.state==='rise'){cr.vy=Math.max(cr.vy-0.4,-4);cr.y+=cr.vy;if(cr.y<=cr.homeY){cr.y=cr.homeY;cr.vy=0;cr.state='wait';cr.timer=90+Math.floor(Math.random()*90);}}
}

// CHARGER AI
function updateCharger(e){
  if(e.frozen>0){e.frozen--;return;}if(e.inv>0)e.inv--;
  const p=player,dx=(p.x+p.w/2)-(e.x+e.w/2),dy=(p.y+p.h/2)-(e.y+e.h/2),adx=Math.abs(dx);
  e.vy=Math.min(e.vy+0.5,14);
  if(e.state==='patrol'){
    e.x+=e.vx;e.facing=e.vx>0?1:-1;
    const ah=e.vx>0?e.x+e.w+2:e.x-2;
    if(solid(tileAt(ah,e.y+e.h/2))||!solid(tileAt(ah,e.y+e.h+2)))e.vx*=-1;
    if(adx<150&&Math.abs(dy)<TS&&Math.sign(dx)===e.facing){e.state='windup';e.timer=32;}
  } else if(e.state==='windup'){
    e.timer--;if(e.timer<=0){e.state='charge';e.dvx=e.facing*6.5;}
  } else if(e.state==='charge'){
    e.x+=e.dvx;
    const wall=e.dvx>0?solid(tileAt(e.x+e.w,e.y+e.h/2)):solid(tileAt(e.x,e.y+e.h/2));
    const ledge=!solid(tileAt(e.x+e.w/2+e.facing*e.w,e.y+e.h+2));
    if(wall||ledge){e.state='stun';e.timer=45;triggerShake(4);spawnParts(e.x+e.w/2,e.y+e.h,'#FF8800',12);}
  } else if(e.state==='stun'){
    e.timer--;if(e.timer<=0){e.state='patrol';e.vx=e.facing*-1.2;}
  }
  e.y+=e.vy;e.grounded=false;
  if(e.vy>=0){const foot=e.y+e.h;for(const bx of[e.x+2,e.x+e.w-2]){if(solid(tileAt(bx,foot))){e.y=Math.floor(foot/TS)*TS-e.h;e.vy=0;e.grounded=true;break;}}}
  if(e.y>ROWS*TS+80){e.x=e.px;e.y=e.py;e.vy=0;e.state='patrol';}
  if(e.inv===0&&adx<(e.w/2+p.w/2)&&Math.abs(dy)<(e.h/2+p.h/2))damage();
}
// BOMBER AI
function updateBomber(e){
  if(e.frozen>0){e.frozen--;return;}if(e.inv>0)e.inv--;
  const p=player;e.wob+=0.08;
  const target=p.x+p.w/2-e.w/2;
  e.x+=Math.max(-1.8,Math.min(1.8,(target-e.x)*0.04));
  if(e.x<TS){e.x=TS;}if(e.x>COLS*TS-e.w-TS){e.x=COLS*TS-e.w-TS;}
  e.y=e.homeY+Math.sin(e.wob)*6;
  e.timer--;
  if(e.timer<=0){e.timer=140;enemyBombs.push({x:e.x+e.w/2,y:e.y+e.h,vy:0,flash:0});}
  const dx=(p.x+p.w/2)-(e.x+e.w/2),dy=(p.y+p.h/2)-(e.y+e.h/2);
  if(e.inv===0&&Math.abs(dx)<(e.w/2+p.w/2)&&Math.abs(dy)<(e.h/2+p.h/2))damage();
}
function updateBombs(){
  for(let i=enemyBombs.length-1;i>=0;i--){const b=enemyBombs[i];
    b.vy=Math.min(b.vy+0.35,8);b.y+=b.vy;b.flash++;
    const land=solid(tileAt(b.x,b.y+6))||b.y>ROWS*TS+40;
    if(land){
      explosions.push({x:b.x,y:b.y,r:6,maxR:34,life:18,col:'#FF8800'});
      spawnParts(b.x,b.y,'#FF8800',18);spawnParts(b.x,b.y,'#FFCC44',10);triggerShake(5);
      const p=player,bdx=(p.x+p.w/2)-b.x,bdy=(p.y+p.h/2)-b.y;
      if(player.inv===0&&bdx*bdx+bdy*bdy<34*34)damage();
      enemyBombs.splice(i,1);
    }
  }
}
// CLIMBER AI
function updateClimber(e){
  if(e.frozen>0){e.frozen--;return;}if(e.inv>0)e.inv--;
  const p=player;
  // climb up/down (original behaviour — slides along its wall between minY/maxY)
  e.y+=e.vy*e.side;
  if(e.y<=e.minY){e.y=e.minY;e.side=1;}
  if(e.y>=e.maxY){e.y=e.maxY;e.side=-1;}
  if(solid(tileAt(e.x+e.w/2,e.y-2))){e.side=1;}
  if(solid(tileAt(e.x+e.w/2,e.y+e.h+2))){e.side=-1;}
  // detect which side the wall is on (for leg orientation) — does NOT affect movement.
  // sample into the NEIGHBOURING tile columns (far enough past our own ~28px cell), at several heights.
  let lW=false,rW=false;
  for(const yy of [e.y+3,e.y+e.h/2,e.y+e.h-3]){
    if(solid(tileAt(e.x-8,yy)))lW=true;        // cell to our left
    if(solid(tileAt(e.x+e.w+8,yy)))rW=true;    // cell to our right
  }
  if(lW&&!rW)e.wallSide=-1; else if(rW&&!lW)e.wallSide=1;
  // (both or neither: keep last known wallSide)
  e.timer--;
  if(e.timer<=0){e.timer=110;
    const sx=e.x+e.w/2,sy=e.y+e.h/2;
    const dx=(p.x+p.w/2)-sx,dy=(p.y+p.h/2)-sy,t=30;
    eBullets.push({x:sx,y:sy,vx:dx/t,vy:dy/t-0.5*0.18*t,life:90,grav:0.18,acid:true});
  }
  const dx=(p.x+p.w/2)-(e.x+e.w/2),dy=(p.y+p.h/2)-(e.y+e.h/2);
  if(e.inv===0&&Math.abs(dx)<(e.w/2+p.w/2)&&Math.abs(dy)<(e.h/2+p.h/2))damage();
}
// ── ENEMY AI ──
function updateDrone(e){
  if(e.frozen>0){e.frozen--;return;}if(e.inv>0)e.inv--;
  const p=player,dx=(p.x+p.w/2)-(e.x+e.w/2),dy=(p.y+p.h/2)-(e.y+e.h/2),dist=Math.sqrt(dx*dx+dy*dy);
  if(dist<180&&Math.abs(dy)<TS*0.6)e.alert=Math.min(e.alert+1,60);else e.alert=Math.max(e.alert-1,0);
  e.vx=e.alert>30?(dx>0?2.2:-2.2):(e.vx>0?1.2:-1.2);
  if(e.alert<=30){const ah=e.vx>0?e.x+e.w+2:e.x-2;if(solid(tileAt(ah,e.y+e.h/2))||!solid(tileAt(ah,e.y+e.h+2)))e.vx*=-1;}
  e.vy=Math.min(e.vy+0.5,14);e.x+=e.vx;
  if(solid(tileAt(e.x,e.y+3))&&solid(tileAt(e.x,e.y+e.h-3))){e.x=Math.floor(e.x/TS)*TS+TS+0.1;e.vx*=-1;}
  if(solid(tileAt(e.x+e.w,e.y+3))&&solid(tileAt(e.x+e.w,e.y+e.h-3))){e.x=Math.floor((e.x+e.w)/TS)*TS-e.w-0.1;e.vx*=-1;}
  e.y+=e.vy;e.grounded=false;
  if(e.vy>=0){const foot=e.y+e.h;for(const bx of[e.x+2,e.x+e.w-2]){if(solid(tileAt(bx,foot))){e.y=Math.floor(foot/TS)*TS-e.h;e.vy=0;e.grounded=true;break;}}}
  if(e.y>ROWS*TS+80){e.x=e.px;e.y=e.py;e.vy=0;}
  if(e.inv===0&&dist<(e.w/2+player.w/2)+2)damage();
}
function updateTurret(e){
  if(e.frozen>0){e.frozen--;return;}if(e.inv>0)e.inv--;
  const p=player,dx=(p.x+p.w/2)-(e.x+e.w/2),dy=(p.y+p.h/2)-(e.y+e.h/2),dist=Math.sqrt(dx*dx+dy*dy);
  e.y=e.py+Math.sin(frame*0.04+e.px*0.008)*10;e.x+=e.vx;
  if(solid(tileAt(e.x,e.y+e.h/2))||e.x<=0)e.vx=Math.abs(e.vx);
  if(solid(tileAt(e.x+e.w,e.y+e.h/2))||e.x+e.w>=COLS*TS)e.vx=-Math.abs(e.vx);
  e.shootTimer--;
  if(e.shootTimer<=0&&dist<350){e.shootTimer=70+Math.floor(Math.random()*50);const len=Math.max(dist,1),spd=3.2;eBullets.push({x:e.x+e.w/2,y:e.y+e.h/2,vx:dx/len*spd,vy:dy/len*spd,life:100});}
  if(e.inv===0&&dist<(e.w/2+player.w/2)+2)damage();
}
function updateShield(e){
  if(e.frozen>0){e.frozen--;return;}if(e.inv>0)e.inv--;
  const p=player,dx=(p.x+p.w/2)-(e.x+e.w/2),dy=(p.y+p.h/2)-(e.y+e.h/2),dist=Math.sqrt(dx*dx+dy*dy);
  e.facing=dx>0?1:-1;e.vx=e.facing*0.8;e.vy=Math.min(e.vy+0.5,14);e.x+=e.vx;
  if(solid(tileAt(e.x,e.y+3))&&solid(tileAt(e.x,e.y+e.h-3))){e.x=Math.floor(e.x/TS)*TS+TS+0.1;e.vx*=-1;}
  if(solid(tileAt(e.x+e.w,e.y+3))&&solid(tileAt(e.x+e.w,e.y+e.h-3))){e.x=Math.floor((e.x+e.w)/TS)*TS-e.w-0.1;e.vx*=-1;}
  e.y+=e.vy;e.grounded=false;
  if(e.vy>=0){const foot=e.y+e.h;for(const bx of[e.x+2,e.x+e.w-2]){if(solid(tileAt(bx,foot))){e.y=Math.floor(foot/TS)*TS-e.h;e.vy=0;e.grounded=true;break;}}}
  if(e.y>ROWS*TS+80){e.x=e.px;e.y=e.py;e.vy=0;}
  if(e.inv===0&&dist<(e.w/2+p.w/2)+2)damage();
}
function updateWalker(e){
  if(e.frozen>0){e.frozen--;return;}if(e.inv>0)e.inv--;
  e.vy=Math.min(e.vy+0.5,14);e.x+=e.vx;
  if(solid(tileAt(e.x,e.y+e.h/2)))e.vx=Math.abs(e.vx);
  if(solid(tileAt(e.x+e.w,e.y+e.h/2)))e.vx=-Math.abs(e.vx);
  e.y+=e.vy;e.grounded=false;
  if(e.vy>=0){const foot=e.y+e.h;for(const bx of[e.x+2,e.x+e.w-2]){if(solid(tileAt(bx,foot))){e.y=Math.floor(foot/TS)*TS-e.h;e.vy=0;e.grounded=true;break;}}}
  if(e.y>ROWS*TS+80){e.x=e.px;e.y=e.py;e.vy=0;}
  const dist=Math.sqrt((player.x+player.w/2-e.x-e.w/2)**2+(player.y+player.h/2-e.y-e.h/2)**2);
  if(e.inv===0&&dist<(e.w/2+player.w/2)+2)damage();
}
// SENTINEL miniboss AI
function updateSentinel(e){
  if(e.frozen>0){e.frozen--;return;}
  if(e.inv>0)e.inv--;
  const p=player, p2=e.hp<=4;
  // shield spin (steady; faster in phase 2)
  e.ang+=(p2?0.075:0.045);
  if(e.shieldDown>0)e.shieldDown--;
  // ── free-floating drift (wanders in all directions, ignores player) ──
  // 'arc' repurposed as float-speed multiplier; phase 2 a touch faster
  const fspd=(e.arc||1)*(p2?1.5:1.1);
  if(e.fvx===undefined){e.fvx=(Math.random()<0.5?-1:1)*fspd;e.fvy=(Math.random()<0.5?-1:1)*fspd*0.7;e.wT=0;}
  e.wT=(e.wT||0)-1;
  if(e.wT<=0){ // occasionally pick a new drift heading
    const ang=Math.random()*Math.PI*2;
    e.fvx=Math.cos(ang)*fspd;e.fvy=Math.sin(ang)*fspd;
    e.wT=60+Math.floor(Math.random()*90);
  }
  // gentle bob layered on top for a floaty feel
  e.bob=(e.bob||0)+0.06;
  e.x+=e.fvx;
  e.y+=e.fvy+Math.sin(e.bob)*0.3;
  // bounce off level bounds
  if(e.x<TS){e.x=TS;e.fvx=Math.abs(e.fvx);}
  if(e.x>COLS*TS-e.w-TS){e.x=COLS*TS-e.w-TS;e.fvx=-Math.abs(e.fvx);}
  if(e.y<TS){e.y=TS;e.fvy=Math.abs(e.fvy);}
  if(e.y>ROWS*TS-e.h-TS){e.y=ROWS*TS-e.h-TS;e.fvy=-Math.abs(e.fvy);}
  // bounce off solid tiles so it doesn't drift through walls
  if(solid(tileAt(e.x,e.y+e.h*0.5))){e.x=Math.floor(e.x/TS)*TS+TS+0.1;e.fvx=Math.abs(e.fvx);}
  if(solid(tileAt(e.x+e.w,e.y+e.h*0.5))){e.x=Math.floor((e.x+e.w)/TS)*TS-e.w-0.1;e.fvx=-Math.abs(e.fvx);}
  if(solid(tileAt(e.x+e.w*0.5,e.y))){e.y=Math.floor(e.y/TS)*TS+TS+0.1;e.fvy=Math.abs(e.fvy);}
  if(solid(tileAt(e.x+e.w*0.5,e.y+e.h))){e.y=Math.floor((e.y+e.h)/TS)*TS-e.h-0.1;e.fvy=-Math.abs(e.fvy);}
  e.grounded=false;
  // ── volley (shield drops, fires a spread) ──
  e.volleyTimer--;
  if(e.volleyTimer<=0){
    e.shieldDown=46;
    const dx=(p.x+p.w/2)-(e.x+e.w/2), dy=(p.y+p.h/2)-(e.y+e.h/2);
    const base=Math.atan2(dy,dx), n=(p2?7:5)+(e.shock?2:0), spd=3.6;
    for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*0.28;eBullets.push({x:e.x+e.w/2,y:e.y+e.h/2,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:100});}
    spawnParts(e.x+e.w/2,e.y+e.h/2,'#FF8800',16);
    e.volleyTimer=p2?150:210;
  }
  // contact damage
  const cdx=(p.x+p.w/2)-(e.x+e.w/2), cdy=(p.y+p.h/2)-(e.y+e.h/2);
  if(e.inv===0 && Math.abs(cdx)<(e.w/2+p.w/2) && Math.abs(cdy)<(e.h/2+p.h/2))damage();
}
// HIVE miniboss AI — sealed (invuln) → opens (weak point + spawns drones) → closes
function updateHive(e){
  if(e.frozen>0){e.frozen--;return;}
  if(e.inv>0)e.inv--;
  e.pulse+=0.1;
  const p2=e.hp<=5;
  // sealed shell makes it invulnerable; weak point only while open
  e.invulnShell=(e.state==='sealed');
  if(e.state==='sealed'){
    e.open=Math.max(0,e.open-0.05);e.timer--;
    if(e.timer<=0){e.state='opening';e.timer=20;}
  } else if(e.state==='opening'){
    e.open=Math.min(1,e.open+0.06);e.timer--;
    if(e.timer<=0){
      e.state='open';e.timer=p2?52:72;
      e.cycle=(e.cycle||0)+1;
      // every 3rd open cycle (and always once enraged) one spawn is a turret instead of a drone
      const spawnTurret=(e.cycle%3===0)||p2;
      // cap living minions per hive so long fights can't flood the level
      const alive=enemies.filter(x=>x._hive===e).length+pendingEnemies.filter(x=>x._hive===e).length;
      const n=Math.max(0,Math.min((e.spawnN||HIVE_DEFAULT_SPAWN)+(p2?1:0),8-alive));
      for(let i=0;i<n;i++){
        const spread=(i-(n-1)/2);
        const dx0=e.x+e.w/2-10+spread*16;
        let s;
        if(spawnTurret&&i===0){
          s=mkTurret(dx0,e.y+e.h+18);            // turret hovers a bit lower so it clears the shell
        }else{
          s=mkDrone(dx0,e.y+e.h+2);
        }
        s.vx=(spread<0?-1:1)*1.6;                 // fan out left/right
        s.vy=1;                                    // drop out, not up into the body
        s.alert=0;s._hive=e;
        pendingEnemies.push(s);
      }
      if(n>0){spawnParts(e.x+e.w/2,e.y+e.h,spawnTurret?'#FF8800':'#9CE85A',16);triggerShake(4);}
    }
  } else if(e.state==='open'){
    e.timer--;if(e.timer<=0){e.state='closing';e.timer=16;}
  } else if(e.state==='closing'){
    e.open=Math.max(0,e.open-0.08);e.timer--;
    if(e.timer<=0){e.state='sealed';e.timer=p2?70:120;}
  }
  // contact damage (touching the shell hurts)
  const p=player,cdx=(p.x+p.w/2)-(e.x+e.w/2),cdy=(p.y+p.h/2)-(e.y+e.h/2);
  if(e.inv===0&&Math.abs(cdx)<(e.w/2+p.w/2)&&Math.abs(cdy)<(e.h/2+p.h/2))damage();
}
// WARDEN miniboss AI — idle → telegraph → dash(es) → plant → sweep beam → cooldown(exposed)
function updateWarden(e){
  if(e.frozen>0){e.frozen--;return;}
  if(e.inv>0)e.inv--;
  const p=player,p2=e.hp<=4,dx=(p.x+p.w/2)-(e.x+e.w/2);
  // gravity / ground stick
  e.vy=Math.min(e.vy+0.5,14);e.y+=e.vy;e.grounded=false;
  {const foot=e.y+e.h;for(const bx of[e.x+3,e.x+e.w-3]){if(solid(tileAt(bx,foot))){e.y=Math.floor(foot/TS)*TS-e.h;e.vy=0;e.grounded=true;break;}}}
  const spd=7;
  if(e.state==='idle'){
    e.timer--;if(e.timer<=0){if(Math.abs(dx)<480){e.state='telegraph';e.timer=24;e.facing=dx>0?1:-1;}else e.timer=30;}   // sleeps till you get close
  } else if(e.state==='telegraph'){
    e.timer--;if(e.timer<=0){e.state='dash';e.vx=e.facing*spd;e.dashCount=p2?2:1;}
  } else if(e.state==='dash'){
    e.x+=e.vx;
    const wallR=solid(tileAt(e.x+e.w,e.y+e.h/2))||e.x+e.w>=COLS*TS-TS;
    const wallL=solid(tileAt(e.x,e.y+e.h/2))||e.x<=TS;
    if(e.vx>0&&wallR){e.x=Math.min(e.x,COLS*TS-TS-e.w);e.facing=-1;e.vx=e.facing*spd;e.dashCount--;triggerShake(5);spawnParts(e.x+e.w,e.y+e.h,'#FFAA44',10);}
    else if(e.vx<0&&wallL){e.x=Math.max(e.x,TS);e.facing=1;e.vx=e.facing*spd;e.dashCount--;triggerShake(5);spawnParts(e.x,e.y+e.h,'#FFAA44',10);}
    if(e.dashCount<=0){e.state='plant';e.timer=18;e.vx=0;}
  } else if(e.state==='plant'){
    e.timer--;if(e.timer<=0){e.state='sweep';e.beam=1;e.sweep=-Math.PI*0.5;}
  } else if(e.state==='sweep'){
    e.sweep+=(e.sweepSpd||WARDEN_DEFAULT_SWEEP)*(p2?1.5:1);
    // beam damage: if player is along the beam ray and not crouching/jumping clear of it
    const bx=e.x+e.w/2,by=e.y+e.h/2;
    const ang=Math.atan2((p.y+p.h/2)-by,(p.x+p.w/2)-bx);
    let diff=Math.abs(((ang-e.sweep+Math.PI*3)%(Math.PI*2))-Math.PI);
    const pdist=Math.hypot((p.x+p.w/2)-bx,(p.y+p.h/2)-by);
    if(player.inv===0&&diff<0.16&&pdist>20&&pdist<540)damage();   // the beam has a reach limit
    if(e.sweep>Math.PI*0.5){e.state='cooldown';e.timer=p2?42:62;e.beam=0;}
  } else if(e.state==='cooldown'){
    e.timer--;if(e.timer<=0){e.state='idle';e.timer=p2?42:78;}
  }
  // contact damage
  const cdx=(p.x+p.w/2)-(e.x+e.w/2),cdy=(p.y+p.h/2)-(e.y+e.h/2);
  if(e.inv===0&&Math.abs(cdx)<(e.w/2+p.w/2)&&Math.abs(cdy)<(e.h/2+p.h/2))damage();
}
function updateEnemy(e){if(e.type==='turret')updateTurret(e);else if(e.type==='shield')updateShield(e);else if(e.type==='walker')updateWalker(e);else if(e.type==='sniper')updateSniper(e);else if(e.type==='sentinel')updateSentinel(e);else if(e.type==='charger')updateCharger(e);else if(e.type==='bomber')updateBomber(e);else if(e.type==='climber')updateClimber(e);else if(e.type==='hive')updateHive(e);else if(e.type==='warden')updateWarden(e);else updateDrone(e);}
function updateMovPlats(){movPlats.forEach(mp=>{mp.t+=mp.spd;const s=Math.sin(mp.t*0.04);if(mp.axis==='x'){mp.x=mp.ox+s*mp.range;mp.vx=Math.cos(mp.t*0.04)*mp.range*0.04*mp.spd;mp.vy=0;}else{mp.y=mp.oy+s*mp.range;mp.vy=Math.cos(mp.t*0.04)*mp.range*0.04*mp.spd;mp.vx=0;}});}
function checkMovPlats(p){movPlats.forEach(mp=>{const on=p.x+p.w>mp.x&&p.x<mp.x+mp.w&&p.y+p.h>=mp.y&&p.y+p.h<=mp.y+mp.h+8&&p.vy>=0;if(on){p.y=mp.y-p.h;p.vy=0;p.grounded=true;p.jumps=0;if(mp.axis==='x')p.x+=mp.vx;else p.y+=mp.vy;}});}
