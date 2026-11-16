// Neon Platformer — Weapons
// ── WEAPONS ──
function selectW(w){if(!WDEFS[w]||wAmmo[w]<=0)return;curW=w;}
function cycleW(dir){
  const idx=WLIST.indexOf(curW);
  for(let i=1;i<WLIST.length;i++){const nw=WLIST[(idx+dir*i+WLIST.length)%WLIST.length];if(wAmmo[nw]>0){curW=nw;return;}}
}
function spawnExplosion(x,y,maxR,col){
  triggerShake(10);
  explosions.push({x,y,r:4,maxR,life:18,col});
  spawnParts(x,y,col,16);
  enemies.forEach(e=>{const dx=(e.x+e.w/2)-x,dy=(e.y+e.h/2)-y;if(dx*dx+dy*dy<(maxR+e.w/2)**2){e.hp-=2;e.inv=20;spawnParts(e.x+e.w/2,e.y+e.h/2,col,6);}});
}
function fireLaser(ax,ay){
  const p=player,sx=p.x+p.w/2,sy=p.y+p.h/2;
  if(ax==null){ax=p.facing;ay=0;}
  let ex=sx,ey=sy;
  for(let d=8;d<COLS*TS;d+=8){
    const tx=sx+ax*d,ty=sy+ay*d;
    if(solid(tileAt(tx,ty)))break;
    ex=tx;ey=ty;
    enemies.forEach(e=>{if(tx>e.x&&tx<e.x+e.w&&ty>e.y&&ty<e.y+e.h){e.hp--;e.inv=20;spawnParts(tx,ty,'#00FFEE',5);}});
  }
  laserBeams.push({x1:sx,y1:sy,x2:ex,y2:ey,life:10});
}
function fireSword(){
  swordSwing=18;const p=player;
  const sx=p.facing>0?p.x+p.w:p.x-38,sy=p.y;
  enemies.forEach(e=>{if(e.x+e.w>sx&&e.x<sx+38&&e.y+e.h>sy&&e.y<sy+p.h){e.hp-=(e.type==='shield'?3:2);e.inv=25;spawnParts(e.x+e.w/2,e.y+e.h/2,'#CC88FF',8);}});
  spawnParts(p.x+p.w/2+(p.facing*18),p.y+p.h/2,'#AA44FF',6);
}
// 8-direction aim — aim with held movement keys; down-aim air-only (ground = stomp)
function getAimVector(){
  const p=player;
  const ta=touchKeys.aimV2||touchKeys.aimV;if(ta)return{ax:ta.x,ay:ta.y};   // touch aim (fire-button drag or arc)
  const up=keys['ArrowUp']||keys['KeyW']||touchKeys.aimUp;
  const down=(keys['ArrowDown']||keys['KeyS']||touchKeys.down)&&!p.grounded;
  const left=keys['ArrowLeft']||keys['KeyA']||touchKeys.left||gyroKeys.left;
  const right=keys['ArrowRight']||keys['KeyD']||touchKeys.right||gyroKeys.right;
  let ax=0,ay=0;
  if(left)ax=-1; else if(right)ax=1;
  if(up)ay=-1; else if(down)ay=1;
  if(ax===0&&ay===0){ax=p.facing;ay=0;}                 // default: forward
  if(ax!==0&&ay!==0){ax*=Math.SQRT1_2;ay*=Math.SQRT1_2;} // normalize diagonals
  return{ax,ay};
}
function fireWeapon(){
  if(shootCd>0)return;
  if(wAmmo[curW]<=0){cycleW(1);return;}
  const w=curW,def=WDEFS[w],p=player,{ax,ay}=getAimVector();
  const ox=p.x+p.w/2+ax*10,oy=p.y+p.h/2+ay*10;
  if(w==='blaster'){bullets.push({x:ox,y:oy,vx:12*ax,vy:12*ay,life:50,type:'blaster'});}
  else if(w==='shotgun'){const base=Math.atan2(ay,ax);[-0.28,-0.14,0,0.14,0.28].forEach(sp=>{const a=base+sp;bullets.push({x:ox,y:oy,vx:11*Math.cos(a),vy:11*Math.sin(a),life:22,type:'shotgun'});});}
  else if(w==='laser'){fireLaser(ax,ay);}
  else if(w==='sword'){fireSword();}
  else if(w==='grenade'){grenades.push({x:ox,y:oy,vx:7*ax,vy:(ay<0?-5+ay*4:-5),life:120,bounced:0});}
  else if(w==='freeze'){bullets.push({x:ox,y:oy,vx:8*ax,vy:8*ay,life:55,type:'freeze'});}
  else if(w==='plasma'){
    const ch=Math.min(plasmaCharge/50,1),r=14+ch*26,spd=6+ch*3;
    bullets.push({x:ox,y:oy,vx:spd*ax,vy:spd*ay,life:80,type:'plasma',r,ch});
    plasmaCharge=0;plasmaCharging=false;
  }
  if(wAmmo[w]!==Infinity)wAmmo[w]--;
  shootCd=def.cd;
}
