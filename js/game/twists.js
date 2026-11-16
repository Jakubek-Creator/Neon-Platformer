// Neon Platformer — World twists
// Each theme plays a little differently. A level can switch its twist off in the editor
// (TWIST button next to the theme colours); it is saved with the level as `twist`.
//   NEON     — none (the home city)
//   ICE      — wind gusts push you sideways; icicles hang under ceilings and drop when you pass
//   LAVA     — no twist: lava stays as it is (the tide code below is kept but switched off)
//   TOXIC    — acid rain storms: get under cover or the acid burns you
//   VOID     — darkness: you only see what is lit (your glow, lava, shots, pickups…)
//   SOLAR    — solar beams sweep across the level: stay in the shade of a block
//   DEEP SEA — the whole level is underwater: floaty swimming and an air meter; bubbles refill it
var levelTwist=true;
const TW={t:0,phase:'calm',pt:0,wind:0,windT:0,icicles:[],drops:[],splash:[],beams:[],bubbles:[],vents:[],snow:[],
  meter:0,meterKind:'',air:1,tideY:null,dark:null,dg:null};
const TWIST_NAMES=['','WIND & ICICLES','','ACID RAIN','DARKNESS','SOLAR BEAMS','UNDERWATER'];
function twistOn(){return levelTwist&&mode==='play';}
function twistKind(){return twistOn()&&levelTheme!==2?levelTheme:0;}   // LAVA keeps its normal behaviour (no twist)
function _twSolid(c,r){if(r<0)return false;if(c<0||c>=COLS||r>=ROWS)return true;const t=grid[r]&&grid[r][c];return !!t&&solid(t);}
// is there a block somewhere above this point? (cover from rain / sun)
function twCovered(x,y){const c=Math.floor(x/TS);for(let r=Math.floor(y/TS)-1;r>=0;r--)if(_twSolid(c,r))return true;return false;}
function twCoverY(x){const c=Math.floor(x/TS);for(let r=0;r<ROWS;r++)if(_twSolid(c,r))return r*TS;return ROWS*TS;}

// ── level start / respawn ──
function twistInit(){
  TW.t=0;TW.phase='calm';TW.pt=0;TW.wind=0;TW.windT=240;TW.drops=[];TW.splash=[];TW.beams=[];TW.bubbles=[];TW.snow=[];TW.meter=0;TW.air=1;TW.tideY=null;
  TW.icicles=[];TW.vents=[];TW._floor=null;TW.windF=0;
  if(levelTheme===1){let last=-9;for(let c=0;c<COLS;c++)for(let r=0;r<ROWS-3;r++){
      if(_twSolid(c,r)&&!_twSolid(c,r+1)&&!_twSolid(c,r+2)&&!_twSolid(c,r+3)&&c-last>=3&&((c*7+r*13)%10)<5){TW.icicles.push({c,r:r+1,x:c*TS+TS/2,y0:(r+1)*TS,y:(r+1)*TS,vy:0,st:'hang',t:0,len:14+((c*5+r)%3)*4});last=c;break;}}}
  if(levelTheme===6){let last=-99;for(let c=1;c<COLS-1;c++){if(c-last<12)continue;for(let r=1;r<ROWS;r++){if(_twSolid(c,r)&&!_twSolid(c,r-1)&&!_twSolid(c,r-2)){TW.vents.push({x:c*TS+TS/2,y:r*TS,t:(c*17)%40});last=c;break;}}}}
}
function twistReset(){twistInit();}

// ── per tick ──
function twistTick(){
  const k=twistKind();if(!k)return;const p=player;TW.t++;
  const alive=typeof deathSeqTimer==='undefined'||deathSeqTimer<=0;
  if(k===1)_twIce(p,alive);else if(k===2)_twLava(p,alive);else if(k===3)_twAcid(p,alive);else if(k===5)_twSolar(p,alive);else if(k===6)_twSea(p,alive);
  for(const s of TW.splash){s.x+=s.vx;s.y+=s.vy;s.vy+=0.15;s.life--;}TW.splash=TW.splash.filter(s=>s.life>0);
}
function _twHurt(kind){TW.meter=0.45;damage();}
// ICE: gusts + icicles
function _twIce(p,alive){
  if(--TW.windT<=0){if(TW.wind===0){TW.windDir=Math.random()<0.5?-1:1;TW.wind=0.001;TW.windT=200;}else{TW.wind=0;TW.windT=300+Math.random()*200;}}
  const target=TW.wind?TW.windDir*1.25:0;TW.windF=(TW.windF||0)+(target-(TW.windF||0))*0.04;
  if(Math.abs(TW.windF)>0.05&&frame%2===0)TW.snow.push({x:camX+(TW.windF>0?-10:W+10),y:camY+Math.random()*H,vx:TW.windF*7+(Math.random()-.5),vy:0.6+Math.random()*0.8,life:200,s:1+Math.random()*1.6,streak:Math.random()<0.25});
  if(frame%5===0)TW.snow.push({x:camX+Math.random()*W,y:camY-6,vx:(TW.windF||0)*4,vy:0.5+Math.random()*0.6,life:300,s:0.8+Math.random()*1.2});
  for(const s of TW.snow){s.x+=s.vx;s.y+=s.vy;s.life--;}TW.snow=TW.snow.filter(s=>s.life>0&&s.y<camY+H+20&&s.x>camX-40&&s.x<camX+W+40);
  for(const ic of TW.icicles){
    if(ic.st==='hang'){if(alive&&Math.abs(p.x+p.w/2-ic.x)<42&&p.y>ic.y0&&p.y-ic.y0<TS*12){ic.st='shake';ic.t=26;try{sfx('square',1400,1800,0.05,0.03);}catch(e){}}}
    else if(ic.st==='shake'){if(--ic.t<=0){ic.st='fall';ic.vy=1;}}
    else if(ic.st==='fall'){ic.vy=Math.min(ic.vy+0.55,13);ic.y+=ic.vy;const tip=ic.y+ic.len;
      if(alive&&p.x<ic.x+4&&p.x+p.w>ic.x-4&&p.y<tip&&p.y+p.h>ic.y){damage();_twShatter(ic);}
      else if(_twSolid(Math.floor(ic.x/TS),Math.floor(tip/TS))||tip>ROWS*TS)_twShatter(ic);}
    else if(ic.st==='gone'){if(--ic.t<=0){ic.st='grow';ic.t=0;ic.y=ic.y0;}}
    else if(ic.st==='grow'){if(++ic.t>=40)ic.st='hang';}
  }
}
function _twShatter(ic){ic.st='gone';ic.t=360;for(let i=0;i<9;i++)TW.splash.push({x:ic.x,y:ic.y+ic.len,vx:(Math.random()-.5)*4,vy:-1-Math.random()*3,life:24,col:'#BFF4FF',s:2});try{sfxNoise(0.1,0.05,4000);}catch(e){}if(typeof feelShake==='function')feelShake(1.5);}
// LAVA: tides
function _twLava(p,alive){
  if(lavaRiseSpeed>0){TW.tideY=null;return;}   // the level already has rising lava
  const base=ROWS*TS+8,top=_twFloorY()-TS*2.5;TW.pt++;
  const D={calm:600,warn:130,rise:170,hold:160,fall:170};
  if(TW.pt>=D[TW.phase]){TW.pt=0;TW.phase={calm:'warn',warn:'rise',rise:'hold',hold:'fall',fall:'calm'}[TW.phase];if(TW.phase==='rise'&&typeof feelShake==='function')feelShake(4);}
  const k=TW.pt/D[TW.phase],ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
  TW.tideY=TW.phase==='rise'?base+(top-base)*ease(k):TW.phase==='hold'?top+Math.sin(TW.t*0.05)*3:TW.phase==='fall'?top+(base-top)*ease(k):base;
  if(TW.phase==='warn'&&typeof feelShake==='function'&&TW.pt%20===0)feelShake(1.2);
  if(alive&&p.y+p.h>TW.tideY+6)damage();
}
function _twFloorY(){if(TW._floor!=null&&TW._floorRows===ROWS)return TW._floor;let best=ROWS*TS,cnt={};for(let c=0;c<COLS;c++){for(let r=0;r<ROWS;r++)if(_twSolid(c,r)&&!_twSolid(c,r-1)){cnt[r]=(cnt[r]||0)+1;}}
  let mr=-1,mv=0;for(const r in cnt)if(cnt[r]>mv||(cnt[r]===mv&&+r>mr)){mv=cnt[r];mr=+r;}best=mr>=0?mr*TS:best;TW._floor=best;TW._floorRows=ROWS;return best;}
// TOXIC: acid rain storms
function _twAcid(p,alive){
  TW.pt++;const D={calm:540,warn:130,storm:330};if(TW.pt>=D[TW.phase]){TW.pt=0;TW.phase={calm:'warn',warn:'storm',storm:'calm'}[TW.phase];}
  const n=TW.phase==='storm'?7:TW.phase==='warn'?1:0;
  for(let i=0;i<n;i++)TW.drops.push({x:camX-60+Math.random()*(W+120),y:camY-10-Math.random()*30,vx:-1.2,vy:9+Math.random()*3});
  for(const d of TW.drops){d.x+=d.vx;d.y+=d.vy;const c=Math.floor(d.x/TS),r=Math.floor(d.y/TS);
    if(_twSolid(c,r)||d.y>camY+H+20){d.dead=1;if(d.y<camY+H+20){for(let j=0;j<2;j++)TW.splash.push({x:d.x,y:r*TS,vx:(Math.random()-.5)*2,vy:-1-Math.random()*1.5,life:12,col:'#9CFF4A',s:1.5});}}
    else if(alive&&d.x>p.x&&d.x<p.x+p.w&&d.y>p.y&&d.y<p.y+p.h){d.dead=1;TW.splash.push({x:d.x,y:d.y,vx:(Math.random()-.5)*2,vy:-1.5,life:14,col:'#c8ff8a',s:2});}}
  TW.drops=TW.drops.filter(d=>!d.dead);
  const exposed=TW.phase==='storm'&&alive&&!twCovered(p.x+p.w/2,p.y+2);
  TW.meterKind='acid';TW.meter=exposed?TW.meter+1/50:Math.max(0,TW.meter-1/90);
  if(exposed&&frame%6===0)spawnParts(p.x+p.w/2,p.y+2,'#9CFF4A',1);
  if(TW.meter>=1)_twHurt();
}
// SOLAR: sweeping sun beams
function _twSolar(p,alive){
  if(TW.beams.length<2&&TW.t%200===0){const dir=Math.random()<0.5?-1:1,x=p.x+p.w/2+(dir>0?-W*0.45:W*0.45)+(Math.random()-.5)*120;TW.beams.push({x,dir,t:0,w:52,warm:70,on:330});}
  for(const b of TW.beams){b.t++;if(b.t>b.warm)b.x+=b.dir*1.25;b.end=twCoverY(b.x);}
  TW.beams=TW.beams.filter(b=>b.t<b.warm+b.on);
  let hit=false;for(const b of TW.beams){if(b.t<=b.warm)continue;const cx0=p.x+p.w/2;if(Math.abs(cx0-b.x)<b.w/2-4&&p.y<b.end)hit=true;}
  TW.meterKind='heat';TW.meter=hit&&alive?TW.meter+1/34:Math.max(0,TW.meter-1/80);
  if(hit&&frame%4===0)spawnParts(p.x+p.w/2,p.y,'#FFD24A',1);
  if(TW.meter>=1)_twHurt();
}
// DEEP SEA: underwater everywhere + air
function _twSea(p,alive){
  for(const v of TW.vents){if(++v.t>=34){v.t=0;TW.bubbles.push({x:v.x+(Math.random()-.5)*10,y:v.y-4,r:5+Math.random()*4,vy:-0.9-Math.random()*0.4,ph:Math.random()*6,big:true});}}
  if(frame%9===0)TW.bubbles.push({x:camX+Math.random()*W,y:camY+H+6,r:1+Math.random()*1.8,vy:-0.6-Math.random()*0.6,ph:Math.random()*6});
  for(const b of TW.bubbles){b.y+=b.vy;b.x+=Math.sin(TW.t*0.06+b.ph)*0.35;
    if(b.big&&alive&&Math.abs(b.x-(p.x+p.w/2))<b.r+9&&Math.abs(b.y-(p.y+p.h/2))<b.r+9){b.dead=1;TW.air=Math.min(1,TW.air+0.22);for(let i=0;i<5;i++)TW.splash.push({x:b.x,y:b.y,vx:(Math.random()-.5)*2,vy:-Math.random()*1.5,life:14,col:'#bff2ff',s:1.4});try{sfx('sine',600,1100,0.06,0.04);}catch(e){}}
    if(b.y<-20||(b.big&&_twSolid(Math.floor(b.x/TS),Math.floor((b.y-b.r)/TS))))b.dead=1;}
  TW.bubbles=TW.bubbles.filter(b=>!b.dead);
  if(alive){TW.air-=1/900;if(TW.air<=0){TW.air=0.3;damage();}}
  TW.meterKind='air';TW.meter=TW.air;
}
// physics hooks
function twistPhysics(p){const k=twistKind();if(k===1&&TW.windF&&!p._dash){p.vx+=TW.windF*(p.grounded?0.22:0.4);}}
function twistWet(){return twistKind()===6;}

// ── drawing ──
function twistDrawBack(){ // before the tiles: solar beams, under-water tint
  const k=twistKind();if(!k)return;
  if(k===5)for(const b of TW.beams){const x=b.x-camX,warm=b.t<=b.warm,top=-10,bot=b.end-camY,a=warm?0.15+0.15*Math.sin(b.t*0.4):Math.min(1,(b.warm+b.on-b.t)/40);
    cx.save();cx.globalCompositeOperation='lighter';
    if(warm){cx.strokeStyle=`rgba(255,220,120,${a+0.2})`;cx.setLineDash([6,6]);cx.lineWidth=2;cx.beginPath();cx.moveTo(x,top);cx.lineTo(x,bot);cx.stroke();}
    else{const g=cx.createLinearGradient(x-b.w/2,0,x+b.w/2,0);g.addColorStop(0,'rgba(255,190,60,0)');g.addColorStop(0.3,`rgba(255,200,80,${0.35*a})`);g.addColorStop(0.5,`rgba(255,250,210,${0.6*a})`);g.addColorStop(0.7,`rgba(255,200,80,${0.35*a})`);g.addColorStop(1,'rgba(255,190,60,0)');
      cx.fillStyle=g;cx.fillRect(x-b.w/2,top,b.w,bot-top);const sg=cx.createRadialGradient(x,bot,2,x,bot,40);sg.addColorStop(0,`rgba(255,240,180,${0.7*a})`);sg.addColorStop(1,'rgba(255,160,40,0)');cx.fillStyle=sg;cx.fillRect(x-40,bot-40,80,50);
      for(let i=0;i<4;i++){const yy=((TW.t*2+i*70)%Math.max(40,bot))|0;cx.fillStyle=`rgba(255,255,220,${0.5*a})`;cx.fillRect(x+Math.sin(TW.t*0.1+i)*b.w*0.3,yy,1.5,6);}}
    cx.restore();}
}
function twistDraw(){ // after entities
  const k=twistKind();if(!k)return;const p=player;
  if(k===1){for(const ic of TW.icicles){if(ic.st==='gone')continue;const g=ic.st==='grow'?ic.t/40:1,sh=ic.st==='shake'?(Math.random()-.5)*2.4:0,x=ic.x-camX+sh,y=ic.y-camY,L=ic.len*g;
      cx.save();cx.shadowBlur=8;cx.shadowColor='#7FFFFF';const gr=cx.createLinearGradient(0,y,0,y+L);gr.addColorStop(0,'rgba(200,250,255,0.95)');gr.addColorStop(1,'rgba(120,230,255,0.7)');cx.fillStyle=gr;
      cx.beginPath();cx.moveTo(x-5*g,y);cx.lineTo(x+5*g,y);cx.lineTo(x+1,y+L);cx.lineTo(x-1,y+L);cx.closePath();cx.fill();cx.shadowBlur=0;cx.fillStyle='rgba(255,255,255,0.8)';cx.fillRect(x-2.5*g,y+1,1.2,L*0.6);cx.restore();}
    cx.save();for(const s of TW.snow){const x=s.x-camX,y=s.y-camY;cx.fillStyle='rgba(230,250,255,0.8)';if(s.streak){cx.globalAlpha=0.35;cx.fillRect(x,y,Math.abs(s.vx)*3,1);cx.globalAlpha=1;}else{cx.beginPath();cx.arc(x,y,s.s,0,7);cx.fill();}}cx.restore();}
  if(k===2&&TW.tideY!=null&&TW.tideY<ROWS*TS){const y=TW.tideY-camY;if(y<H+10){cx.save();const g=cx.createLinearGradient(0,y,0,H);g.addColorStop(0,'rgba(255,120,30,0.95)');g.addColorStop(0.15,'rgba(200,50,10,0.92)');g.addColorStop(1,'rgba(60,8,0,0.95)');cx.fillStyle=g;
      cx.beginPath();cx.moveTo(0,H+5);for(let x=0;x<=W+8;x+=8)cx.lineTo(x,y+Math.sin((x+camX)*0.05+TW.t*0.12)*3+Math.sin((x+camX)*0.13-TW.t*0.08)*1.5);cx.lineTo(W,H+5);cx.closePath();cx.fill();
      cx.strokeStyle='#FFD27A';cx.lineWidth=2;cx.shadowBlur=14;cx.shadowColor='#FF6A10';cx.beginPath();for(let x=0;x<=W+8;x+=8){const yy=y+Math.sin((x+camX)*0.05+TW.t*0.12)*3+Math.sin((x+camX)*0.13-TW.t*0.08)*1.5;x?cx.lineTo(x,yy):cx.moveTo(x,yy);}cx.stroke();cx.restore();}}
  if(k===2&&TW.phase==='warn'){const a=0.25+0.2*Math.sin(TW.t*0.3);cx.save();const g=cx.createLinearGradient(0,H-90,0,H);g.addColorStop(0,'rgba(255,80,20,0)');g.addColorStop(1,`rgba(255,80,20,${a})`);cx.fillStyle=g;cx.fillRect(0,H-90,W,90);cx.restore();}
  if(k===3){if(TW.phase!=='calm'){const a=TW.phase==='storm'?0.55:Math.min(0.55,TW.pt/130*0.55);cx.save();const g=cx.createLinearGradient(0,0,0,90);g.addColorStop(0,`rgba(40,80,20,${a})`);g.addColorStop(1,'rgba(40,80,20,0)');cx.fillStyle=g;cx.fillRect(0,0,W,90);cx.restore();}
    cx.save();cx.strokeStyle='rgba(156,255,74,0.6)';cx.lineWidth=1.2;cx.beginPath();for(const d of TW.drops){const x=d.x-camX,y=d.y-camY;cx.moveTo(x,y);cx.lineTo(x-d.vx*1.4,y-d.vy*1.4);}cx.stroke();cx.restore();}
  if(k===6){cx.save();for(const b of TW.bubbles){const x=b.x-camX,y=b.y-camY;cx.strokeStyle=b.big?'rgba(190,245,255,0.9)':'rgba(190,245,255,0.45)';cx.lineWidth=b.big?1.5:1;if(b.big){cx.shadowBlur=8;cx.shadowColor='#5fe0ff';}
      cx.beginPath();cx.arc(x,y,b.r,0,7);cx.stroke();cx.shadowBlur=0;if(b.big){cx.fillStyle='rgba(255,255,255,0.8)';cx.beginPath();cx.arc(x-b.r*0.35,y-b.r*0.35,b.r*0.22,0,7);cx.fill();}}
    for(const v of TW.vents){const x=v.x-camX,y=v.y-camY;cx.fillStyle='rgba(120,220,255,0.35)';cx.beginPath();cx.ellipse(x,y-1,8,2.5,0,0,7);cx.fill();}cx.restore();}
  for(const s of TW.splash){cx.globalAlpha=s.life/14;cx.fillStyle=s.col;cx.fillRect(s.x-camX,s.y-camY,s.s,s.s);}cx.globalAlpha=1;
  // meter above the blob (air / acid / heat)
  if((k===3||k===5)&&TW.meter>0.02||k===6&&TW.air<0.999){const v=k===6?TW.air:TW.meter,col=k===6?(v<0.3?'#ff4d6a':'#5fe0ff'):k===3?'#9CFF4A':'#FFB43A',x=p.x+p.w/2-camX,y=p.y-camY-14;
    cx.save();cx.fillStyle='rgba(0,0,0,0.55)';cx.fillRect(x-14,y,28,4);cx.fillStyle=col;cx.shadowBlur=6;cx.shadowColor=col;cx.fillRect(x-14,y,28*Math.max(0,Math.min(1,v)),4);cx.shadowBlur=0;
    cx.font='bold 7px monospace';cx.textAlign='center';cx.fillStyle=col;cx.fillText(k===6?'AIR':k===3?'ACID':'HEAT',x,y-2);
    if(k===6&&v<0.3&&Math.floor(TW.t/10)%2)cx.fillText('!',x+18,y+5);cx.restore();}
}
// VOID darkness — drawn after lighting so only lit things show through
function twistDarkness(){
  if(twistKind()!==4)return;const s=0.5,w=Math.ceil(W*s),h=Math.ceil(H*s);
  if(!TW.dark||TW.dark.width!==w||TW.dark.height!==h){TW.dark=document.createElement('canvas');TW.dark.width=w;TW.dark.height=h;TW.dg=TW.dark.getContext('2d');}
  const g=TW.dg,p=player;g.globalCompositeOperation='source-over';g.clearRect(0,0,w,h);g.fillStyle='rgba(2,0,8,0.93)';g.fillRect(0,0,w,h);
  g.globalCompositeOperation='destination-out';
  const hole=(x,y,r,a)=>{const gr=g.createRadialGradient(x*s,y*s,0,x*s,y*s,r*s);gr.addColorStop(0,`rgba(0,0,0,${a})`);gr.addColorStop(0.6,`rgba(0,0,0,${a*0.6})`);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect((x-r)*s,(y-r)*s,r*2*s,r*2*s);};
  hole(p.x+p.w/2-camX,p.y+p.h/2-camY,150+Math.sin(TW.t*0.05)*6,1);
  if(LIGHT.on&&LIGHT.cv){g.drawImage(LIGHT.cv,0,0,w,h);g.drawImage(LIGHT.cv,0,0,w,h);g.drawImage(LIGHT.cv,0,0,w,h);}
  else{for(const b of bullets)hole(b.x-camX,b.y-camY,60,0.9);for(const e of explosions)hole(e.x-camX,e.y-camY,e.maxR*3,0.9);}
  // exit always gives a faint glow so you know where to go
  g.globalCompositeOperation='source-over';
  cx.save();cx.imageSmoothingEnabled=true;cx.drawImage(TW.dark,0,0,W,H);cx.restore();
}
// lights for the lighting system
function twistLights(){
  const k=twistKind();if(!k)return;
  if(k===2&&TW.tideY!=null&&TW.tideY<ROWS*TS)for(let x=Math.floor(camX/80)*80;x<camX+W+80;x+=80)lightAdd(x,TW.tideY,110,'#ff5a10',0.55);
  if(k===5)for(const b of TW.beams)if(b.t>b.warm)for(let y=Math.max(camY,0);y<b.end;y+=70)lightAdd(b.x,y,70,'#ffcc55',0.35);
  if(k===6)for(const b of TW.bubbles)if(b.big)lightAdd(b.x,b.y,30,'#5fe0ff',0.25);
}
function toggleTwist(){levelTwist=!levelTwist;twistBtnRefresh();}
function twistBtnRefresh(){const b=document.getElementById('twBtn');if(!b)return;const n=TWIST_NAMES[levelTheme]||'';b.style.display=n?'':'none';b.textContent=(levelTwist?'✓ ':'✗ ')+n;b.classList.toggle('off',!levelTwist);}
