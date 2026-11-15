// Neon Platformer — Live lighting (V5.7)
// Glowing things (lava, acid, the exit, bullets, explosions, pickups, enemies, the
// blob, sparks) cast coloured light. The light is drawn into a small buffer, then:
//  · on blocks it is added strongly, so walls and floors light up near lava or a shot
//  · a faint copy is added everywhere as glow in the air
// LIGHT.on=false switches it off.
var LIGHT={on:!(typeof MS!=='undefined'&&MS.lighting===false),sc:0.34,cv:null,g:null,mk:null,mg:null,dk:null,dg:null,n:0,ambient:0};
const _lCol={},_lSpr={};
function _lNorm(col){if(_lCol[col])return _lCol[col];const g=_lNorm.g||(_lNorm.g=document.createElement('canvas').getContext('2d'));
  g.fillStyle='#ffffff';g.fillStyle=col;let s=g.fillStyle;if(s[0]!=='#'){const m=s.match(/[\d.]+/g);s='#'+m.slice(0,3).map(v=>(+v|0).toString(16).padStart(2,'0')).join('');}return _lCol[col]=s;}
function _lSprite(col){const k=_lNorm(col);if(_lSpr[k])return _lSpr[k];const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),
  n=parseInt(k.slice(1),16),rgb=`${(n>>16)&255},${(n>>8)&255},${n&255}`,gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,`rgba(${rgb},1)`);gr.addColorStop(0.25,`rgba(${rgb},0.7)`);gr.addColorStop(0.55,`rgba(${rgb},0.3)`);gr.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=gr;g.fillRect(0,0,64,64);return _lSpr[k]=c;}
// add one light (world coords)
function lightAdd(x,y,r,col,a){const g=LIGHT.g,s=LIGHT.sc,sx=(x-camX)*s,sy=(y-camY)*s,rr=r*s;
  if(sx<-rr||sy<-rr||sx>LIGHT.cv.width+rr||sy>LIGHT.cv.height+rr||a<=0.01)return;
  g.globalAlpha=Math.min(1,a);g.drawImage(_lSprite(col),sx-rr,sy-rr,rr*2,rr*2);LIGHT.n++;}
const _LTILE={3:['#ff5a10',80,0.42],45:['#7dff3a',64,0.32],7:['#ff44ff',130,0.85],5:['#63c916',40,0.28],4:['#ff2233',30,0.22],
  6:['#ffd040',50,0.4],11:['#44ccff',56,0.45],12:['#ff9a3c',56,0.45],24:['#44ffaa',46,0.3],46:['#ff2244',36,0.4],47:['#ff2244',36,0.4],
  16:['#ffdd44',40,0.35],17:['#44aaff',40,0.35],8:['#7fffff',28,0.1],2:['#3aa8ff',40,0.14]};
const _LBUL={blaster:'#AFA9EC',shotgun:'#FF8800',laser:'#00FFEE',sword:'#AA44FF',grenade:'#FF6600',freeze:'#88EEFF',plasma:'#FF44FF'};
const _LORB={speed:'#FFFF44',shield:'#00FFEE',jump:'#FF88FF',life:'#44DD66',heart:'#FF88AA',wpick:'#ffffff',hook:'#40e8ff'};
function _lEnsure(){const w=Math.max(16,Math.ceil(W*LIGHT.sc)),h=Math.max(16,Math.ceil(H*LIGHT.sc));
  if(!LIGHT.cv||LIGHT.cv.width!==w||LIGHT.cv.height!==h){const mk=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    LIGHT.cv=mk();LIGHT.g=LIGHT.cv.getContext('2d');LIGHT.mk=mk();LIGHT.mg=LIGHT.mk.getContext('2d');LIGHT.dk=mk();LIGHT.dg=LIGHT.dk.getContext('2d');}}
function _lBlock(t){return t&&t!==2&&t!==3&&t!==45&&t!==7&&t!==44&&!(t>=26&&t<=39)&&t!==15&&t!==28&&t!==54&&t!==55&&t!==56&&t!==57&&t!==58&&t!==59&&t!==60&&t!==61&&t!==43&&t!==51&&t!==52&&t!==53&&t!==42&&(solid(t)||t===40||t===41||t===4);}
function lightDraw(){
  if(!LIGHT.on||mode!=='play')return;
  _lEnsure();const g=LIGHT.g,s=LIGHT.sc,f=frame;LIGHT.n=0;
  g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,LIGHT.cv.width,LIGHT.cv.height);g.globalCompositeOperation='lighter';
  // tiles that glow
  const c0=Math.max(0,Math.floor(camX/TS)-3),c1=Math.min(COLS,Math.ceil((camX+W)/TS)+3),r0=Math.max(0,Math.floor(camY/TS)-3),r1=Math.min(ROWS,Math.ceil((camY+H)/TS)+3);
  for(let r=r0;r<r1;r++){const row=grid[r];if(!row)continue;for(let c=c0;c<c1;c++){const t=row[c];const L=t&&_LTILE[t];if(!L)continue;
    if((t===3||t===45||t===2)&&grid[r-1]&&grid[r-1][c]===t)continue;           // liquids: light from the surface only
    const fl=t===3?0.85+0.15*Math.sin(f*0.13+c*1.7)+0.08*Math.sin(f*0.31+c):t===7?0.85+0.15*Math.sin(f*0.09):1;
    lightAdd(c*TS+TS/2,r*TS+(t===3||t===45||t===2?8:TS/2),L[1]*(t===7?fl:1),L[0],L[2]*fl);}}
  // the blob
  const p=player;if(typeof deathSeqTimer==='undefined'||deathSeqTimer<=0){const pc=p.wet?'#29AAFF':pups.speed>0?'#FFFF44':pups.jump>0?'#FF88FF':skinCols().col;lightAdd(p.x+p.w/2,p.y+p.h/2,95,pc,0.42);}
  if(pups.shield>0)lightAdd(p.x+p.w/2,p.y+p.h/2,60,'#00FFEE',0.3);
  // shots
  for(const b of bullets)lightAdd(b.x,b.y,b.type==='plasma'?70:42,b.col||_LBUL[b.type]||'#AFA9EC',0.6);
  for(const b of eBullets)lightAdd(b.x,b.y,34,b.acid?'#5DCAA5':'#FF6600',0.55);
  for(const gr of grenades)lightAdd(gr.x,gr.y,30,'#FF6600',0.35+0.25*Math.sin(f*0.5));
  if(typeof swordSwing!=='undefined'&&swordSwing>0)lightAdd(p.x+p.w/2+p.facing*16,p.y+p.h/2,60,'#AA44FF',swordSwing/18*0.6);
  if(typeof plasmaCharging!=='undefined'&&plasmaCharging)lightAdd(p.x+p.w/2+p.facing*12,p.y+p.h/2,30+plasmaCharge*0.6,'#FF44FF',0.3+Math.min(0.5,plasmaCharge/80));
  // explosions & deaths
  for(const ex of explosions){const k=ex.life/18;lightAdd(ex.x,ex.y,ex.maxR*2.6,ex.col,k*1.0);lightAdd(ex.x,ex.y,ex.maxR*1.2,'#fff4d0',k*0.7);}
  if(typeof EFX!=='undefined')for(const e of EFX){const k=1-e.t/e.max;lightAdd(e.x,e.y,(e.big?140:80)*(0.6+0.4*k),e.col,k*0.8);}
  if(typeof TL!=='undefined')for(const fx of TL.fx){if(fx.k==='flash')lightAdd(fx.x,fx.y,70,fx.col,fx.life/fx.max*0.8);else if(fx.k==='ring')lightAdd(fx.x,fx.y,50,fx.col,fx.life/fx.max*0.35);}
  if(typeof TL!=='undefined')for(const k in TL.bounce){const t=f-TL.bounce[k];if(t>=0&&t<20){const[c,r]=k.split(',').map(Number);lightAdd(c*TS+TS/2,r*TS+8,70,'#a8ff5a',(1-t/20)*0.7);}}
  // pickups and enemies
  for(const o of powerOrbs)lightAdd(o.x,o.y,52,_LORB[o.type]||'#ffffff',0.4);
  for(const cn of coins)lightAdd(cn.x,cn.y,30,'#FFD700',0.3);
  for(const e of enemies){const col=(typeof ENEMY_COL!=='undefined'&&ENEMY_COL[e.type])||(e.type==='drone'?'#FF4466':e.type==='turret'?'#FF8800':e.type==='shield'?'#44AAFF':e.type==='charger'?'#FF5522':e.type==='bomber'?'#FFAA22':'#ff6688');
    const big=e.w>40;lightAdd(e.x+e.w/2,e.y+e.h/2,big?120:50,col,(big?0.45:0.3)*(e.inv>0?1.6:1));}
  // fire and lasers
  for(const fj of flameJets)if(fj.active&&fj.reach)for(let i=1;i<=fj.reach;i+=2)lightAdd(fj.gx*TS+TS/2,(fj.gy+fj.dir*i)*TS+TS/2,70,'#ff7a20',0.45);
  for(const em of laserEmitters)if(em.active&&em.bx2!=null){const y=em.gy*TS+TS/2,n=Math.ceil(Math.abs(em.bx2-em.bx1)/48);for(let i=0;i<=n;i++)lightAdd(em.bx1+(em.bx2-em.bx1)*i/Math.max(1,n),y,40,'#ff2244',0.35);}
  if(typeof laserBeams!=='undefined')for(const lb of laserBeams){if(lb.x1==null)continue;const n=Math.ceil(Math.hypot(lb.x2-lb.x1,lb.y2-lb.y1)/40);for(let i=0;i<=n;i++)lightAdd(lb.x1+(lb.x2-lb.x1)*i/n,lb.y1+(lb.y2-lb.y1)*i/n,36,lb.col||'#00FFEE',0.3);}
  if(typeof movesLights==='function')movesLights();
  if(typeof twistLights==='function')twistLights();
  if(typeof grappleLights==='function')grappleLights();
  // sparks
  for(let i=0;i<parts.length&&i<160;i+=2){const pt=parts[i];lightAdd(pt.x,pt.y,16,pt.col,(pt.life/30)*0.35);}
  g.globalAlpha=1;g.globalCompositeOperation='source-over';
  // ── mask: where the blocks are ──
  const mg=LIGHT.mg;mg.globalCompositeOperation='source-over';mg.clearRect(0,0,LIGHT.mk.width,LIGHT.mk.height);mg.fillStyle='#fff';
  for(let r=r0;r<r1;r++){const row=grid[r];if(!row)continue;let run=-1;for(let c=c0;c<=c1;c++){const b=c<c1&&_lBlock(row[c]);
    if(b&&run<0)run=c;else if(!b&&run>=0){mg.fillRect(Math.floor((run*TS-camX)*s),Math.floor((r*TS-camY)*s),Math.ceil((c-run)*TS*s)+1,Math.ceil(TS*s)+1);run=-1;}}}
  for(const mp of movPlats)mg.fillRect((mp.x-camX)*s,(mp.y-camY)*s,mp.w*s,mp.h*s);
  // light only where the blocks are, plus a faint copy everywhere — merged into one buffer
  mg.globalCompositeOperation='source-in';mg.drawImage(LIGHT.cv,0,0);
  mg.globalCompositeOperation='lighter';mg.globalAlpha=0.25;mg.drawImage(LIGHT.mk,0,0);mg.globalAlpha=0.32;mg.drawImage(LIGHT.cv,0,0);mg.globalAlpha=1;mg.globalCompositeOperation='source-over';
  // ── composite: two blits ──
  cx.save();cx.imageSmoothingEnabled=true;
  cx.globalCompositeOperation='lighter';cx.globalAlpha=1;cx.drawImage(LIGHT.mk,0,0,W,H);
  cx.restore();
}
