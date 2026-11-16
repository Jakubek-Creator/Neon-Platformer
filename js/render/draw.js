// Neon Platformer — All rendering: tiles, player, enemies, effects, HUD overlays, parallax
// ── DRAWING ──
// perf: cache each glowing box (fill+blur+stroke) to an offscreen sprite, stamp with drawImage.
// shadowBlur is the most expensive canvas op; baking it once removes it from the per-frame hot path.
const _nboxCache={};
function _nboxSprite(w,h,f,s,g){
  const key=w+'|'+h+'|'+f+'|'+s+'|'+g;
  let sp=_nboxCache[key];
  if(sp)return sp;
  const pad=16, cv2=document.createElement('canvas');
  cv2.width=Math.ceil(w)+pad*2; cv2.height=Math.ceil(h)+pad*2;
  const g2=cv2.getContext('2d');
  g2.shadowBlur=14;g2.shadowColor=g;g2.fillStyle=f;g2.fillRect(pad,pad,w,h);
  g2.shadowBlur=0;g2.strokeStyle=s;g2.lineWidth=1;g2.strokeRect(pad+.5,pad+.5,w-1,h-1);
  sp={canvas:cv2,pad};_nboxCache[key]=sp;return sp;
}
function nbox(x,y,w,h,f,s,g){
  const sp=_nboxSprite(w,h,f,s,g);
  cx.drawImage(sp.canvas, x-sp.pad, y-sp.pad);
}
function drawTile(t,sx,sy,c,r){
  if(mode==='play'&&t>=29&&t<=32)return;   // coins & power orbs are drawn as the real pickups in play, not as editor boxes
  if(tileDraw(t,sx,sy,c,r))return; // new block look (js/render/tiles.js)
  if(t===1){nbox(sx,sy,TS,TS,TC.fill,TC.stroke,TC.glow);cx.strokeStyle=TC.line;cx.lineWidth=1;cx.beginPath();cx.moveTo(sx+4,sy+4);cx.lineTo(sx+TS-4,sy+4);cx.stroke();}
  else if(t===2){cx.fillStyle='#071626';cx.fillRect(sx,sy,TS,TS);const wo=Math.sin(frame*0.04+c*0.6)*3;cx.fillStyle='rgba(55,138,221,0.25)';cx.fillRect(sx,sy+8+wo,TS,TS-8);cx.fillStyle='rgba(55,138,221,0.12)';cx.fillRect(sx,sy+3+wo,TS,8);cx.strokeStyle='#378ADD';cx.lineWidth=1;cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);}
  else if(t===3){cx.fillStyle='#2a0600';cx.fillRect(sx,sy,TS,TS);const lo=Math.sin(frame*0.07+c*0.9)*4;cx.fillStyle='rgba(216,90,48,0.5)';cx.fillRect(sx,sy+6+lo,TS,TS-6);cx.strokeStyle='#D85A30';cx.lineWidth=1;cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);}
  else if(t===4){
    const ext=getSpikeExt();
    cx.fillStyle='#190404';cx.fillRect(sx,sy,TS,TS);
    const sh=(TS-6)*ext;
    if(sh>0.5){
      cx.save();
      cx.shadowBlur=ext*14;cx.shadowColor='#CC0000';
      const g=cx.createLinearGradient(sx+TS/2,sy+TS-4,sx+TS/2,sy+TS-4-sh);
      g.addColorStop(0,'#5a0000');g.addColorStop(0.5,'#C43333');g.addColorStop(1,ext>0.85?'#FFAAAA':'#FF6666');
      cx.fillStyle=g;
      cx.beginPath();cx.moveTo(sx+4,sy+TS-4);cx.lineTo(sx+TS/2,sy+TS-4-sh);cx.lineTo(sx+TS-4,sy+TS-4);cx.closePath();cx.fill();
      cx.strokeStyle='rgba(255,160,160,0.4)';cx.lineWidth=0.8;
      cx.beginPath();cx.moveTo(sx+4,sy+TS-4);cx.lineTo(sx+TS/2,sy+TS-4-sh);cx.stroke();
      cx.restore();
    }
  }
  // SAW BLADE (48)
  else if(t===48){
    cx.fillStyle='#0a0a12';cx.fillRect(sx,sy,TS,TS);
    cx.save();cx.translate(sx+TS/2,sy+TS/2);cx.rotate(frame*0.09);
    cx.shadowBlur=10;cx.shadowColor='#CCCCCC';
    // teeth
    const teeth=10,r2=TS/2-3,tr=5;
    cx.fillStyle='#BBBBBB';
    for(let i=0;i<teeth;i++){cx.save();cx.rotate(i*Math.PI*2/teeth);cx.beginPath();cx.moveTo(-2,r2-tr);cx.lineTo(2,r2-tr);cx.lineTo(3,r2+2);cx.lineTo(-3,r2+2);cx.closePath();cx.fill();cx.restore();}
    // blade disc
    const g=cx.createRadialGradient(0,0,2,0,0,r2-tr);
    g.addColorStop(0,'#888');g.addColorStop(1,'#444');
    cx.fillStyle=g;cx.beginPath();cx.arc(0,0,r2-tr,0,Math.PI*2);cx.fill();
    // spokes
    cx.strokeStyle='#666';cx.lineWidth=1.5;
    for(let i=0;i<4;i++){cx.save();cx.rotate(i*Math.PI/4);cx.beginPath();cx.moveTo(0,0);cx.lineTo(0,r2-tr-2);cx.stroke();cx.restore();}
    // hub
    cx.fillStyle='#999';cx.beginPath();cx.arc(0,0,4,0,Math.PI*2);cx.fill();
    cx.shadowBlur=0;cx.restore();
  }
  // FLAME JET UP (49) / DOWN (50)
  else if(t===49||t===50){
    const dir=t===49?-1:1;
    cx.fillStyle='#1a0800';cx.fillRect(sx,sy,TS,TS);
    cx.strokeStyle='#CC4400';cx.lineWidth=1;cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);
    // nozzle pipes
    cx.fillStyle='#3a1800';
    if(dir<0){cx.fillRect(sx+8,sy,TS-16,TS-4);cx.fillRect(sx+5,sy,TS-10,6);}
    else{cx.fillRect(sx+8,sy+4,TS-16,TS-4);cx.fillRect(sx+5,sy+TS-6,TS-10,6);}
    // active flash on nozzle
    let fjActive=false;
    for(let i=0;i<flameJets.length;i++){if(flameJets[i].gx===c&&flameJets[i].gy===r&&flameJets[i].active){fjActive=true;break;}}
    if(fjActive){cx.shadowBlur=12;cx.shadowColor='#FF6600';cx.fillStyle='rgba(255,120,0,0.7)';cx.fillRect(sx+8,dir<0?sy:sy+TS-8,TS-16,8);}
    cx.shadowBlur=0;
  }
  else if(t===5){nbox(sx,sy,TS,TS,'#051505','#63c916','#3B6D11');cx.save();cx.shadowBlur=6;cx.shadowColor='#3B6D11';cx.strokeStyle='#63c916';cx.lineWidth=2;cx.lineCap='round';for(let i=0;i<3;i++){const ph=((frame*0.06)-i*0.5)%1.5;const rise=(ph>0&&ph<1)?ph:0;cx.globalAlpha=0.4+0.6*(1-Math.abs(rise-0.5)*2);const y=sy+TS-7-i*7-rise*4;cx.beginPath();cx.moveTo(sx+TS/2-6,y);cx.lineTo(sx+TS/2,y-5);cx.lineTo(sx+TS/2+6,y);cx.stroke();}cx.restore();cx.globalAlpha=1;cx.shadowBlur=0;}
  else if(t===6){nbox(sx,sy,TS,TS,'#191000','#EF9F27','#BA7517');const qs=0.9+Math.sin(frame*0.06)*0.1;cx.save();cx.translate(sx+TS/2,sy+TS/2);cx.scale(qs,qs);cx.fillStyle='#EF9F27';cx.font='bold 15px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.shadowBlur=10;cx.shadowColor='#BA7517';cx.fillText('?',0,1);cx.restore();cx.shadowBlur=0;}
  else if(t===7){const pulse=0.65+Math.sin(frame*0.09)*0.35;cx.save();cx.globalAlpha=pulse;nbox(sx,sy,TS,TS,'#190019','#FF44FF','#CC00CC');cx.globalAlpha=1;cx.shadowBlur=16;cx.shadowColor='#FF00FF';cx.strokeStyle='#FF44FF';cx.lineWidth=1.5;cx.beginPath();cx.arc(sx+TS/2,sy+TS/2,8,0,Math.PI*2*pulse);cx.stroke();cx.fillStyle='#FF88FF';cx.font='bold 8px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('END',sx+TS/2,sy+TS/2+8);cx.shadowBlur=0;cx.restore();}
  else if(t===8){nbox(sx,sy,TS,TS,'#0a2a33','#7FFFFF','#33CCFF');cx.save();cx.beginPath();cx.rect(sx,sy,TS,TS);cx.clip();
    // glossy diagonal sheen — reads as slippery
    cx.fillStyle='rgba(220,255,255,0.22)';cx.beginPath();cx.moveTo(sx,sy+TS*0.55);cx.lineTo(sx+TS*0.45,sy);cx.lineTo(sx+TS*0.8,sy);cx.lineTo(sx,sy+TS*0.95);cx.closePath();cx.fill();
    cx.fillStyle='rgba(255,255,255,0.5)';cx.fillRect(sx+2,sy+2,TS-4,2);
    // crack lines
    cx.strokeStyle='rgba(180,240,255,0.55)';cx.lineWidth=1;cx.beginPath();
    cx.moveTo(sx+TS*0.3,sy+2);cx.lineTo(sx+TS*0.42,sy+TS*0.5);cx.lineTo(sx+TS*0.3,sy+TS-2);
    cx.moveTo(sx+TS*0.42,sy+TS*0.5);cx.lineTo(sx+TS-2,sy+TS*0.42);cx.stroke();
    // frost glints
    cx.fillStyle='rgba(255,255,255,0.9)';cx.fillRect(sx+TS*0.68,sy+TS*0.66,2,2);cx.fillRect(sx+TS*0.2,sy+TS*0.7,1.5,1.5);
    cx.restore();}
  else if(t===9||t===10){const dir=t===9?1:-1;nbox(sx,sy,TS,TS,'#1a0d00','#FF8800','#AA5500');cx.save();cx.beginPath();cx.rect(sx+2,sy+2,TS-4,TS-4);cx.clip();cx.shadowBlur=6;cx.shadowColor='#FF8800';cx.strokeStyle='#FFAA44';cx.lineCap='round';for(let row=0;row<3;row++){const ry=sy+TS/2-6+row*6;const speed=0.9+row*0.18;const scroll=((frame*speed*dir)%9+9)%9;for(let i=-1;i<5;i++){const dx=i*9+scroll;cx.globalAlpha=0.3+0.5*Math.abs(Math.sin((dx+frame)*0.05));cx.lineWidth=2;cx.beginPath();cx.moveTo(sx+dx,ry);cx.lineTo(sx+dx+5*dir,ry);cx.stroke();}}cx.restore();cx.globalAlpha=1;cx.shadowBlur=0;}
  else if(t===11||t===12){const pulse=0.55+Math.sin(frame*0.1+(t===12?Math.PI:0))*0.45;nbox(sx,sy,TS,TS,'#001a0d','#00FF99','#008844');cx.save();cx.globalAlpha=pulse;cx.shadowBlur=12;cx.shadowColor='#00FF99';cx.fillStyle='#00FF99';cx.font='bold 12px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(t===11?'A':'B',sx+TS/2,sy+TS/2);cx.shadowBlur=0;cx.restore();}
  else if(t===16||t===17){const col=t===16?'#FF5555':'#5555FF',bob=Math.sin(frame*0.08)*3;cx.save();cx.shadowBlur=12;cx.shadowColor=col;cx.fillStyle=col;cx.font='16px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('🔑',sx+TS/2,sy+TS/2+bob);cx.globalAlpha=0.4;cx.font='8px monospace';cx.fillText(t===16?'R':'B',sx+TS/2,sy+TS-6);cx.shadowBlur=0;cx.restore();}
  else if(t===18||t===19){const open=t===18?doorState.red:doorState.blue,col=t===18?'#FF2222':'#2222FF';if(!open){nbox(sx,sy,TS,TS,t===18?'#2a0000':'#00002a',col,col);cx.fillStyle=col;cx.fillRect(sx+TS/2-2,sy+4,4,TS-8);}else{cx.strokeStyle=col;cx.lineWidth=1;cx.setLineDash([3,3]);cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);cx.setLineDash([]);}}
  else if(t===20||t===21){const col=t===20?'#FF5555':'#5555FF',on=t===20?doorState.red:doorState.blue;nbox(sx,sy+TS*0.55,TS,TS*0.45,t===20?'#1a0000':'#00001a',col,col);cx.save();cx.shadowBlur=on?10:0;cx.shadowColor=col;cx.fillStyle=on?col:'#2a2a2a';cx.beginPath();cx.arc(sx+TS/2,sy+TS*0.7,6,0,Math.PI*2);cx.fill();cx.shadowBlur=0;cx.restore();}
  else if(t===22){cx.fillStyle='#330000';cx.fillRect(sx,sy,TS,TS);cx.strokeStyle='#FF4400';cx.lineWidth=1;cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);cx.fillStyle='#FF4400';cx.font='14px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('⚡',sx+TS/2,sy+TS/2);}
  else if(t===23){const ph=getVentPhase(c,r);cx.fillStyle='#200800';cx.fillRect(sx,sy,TS,TS);cx.strokeStyle='#FF6600';cx.lineWidth=1;cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);cx.fillStyle='#FF4400';for(let i=0;i<3;i++)cx.fillRect(sx+5+i*9,sy+TS-5,6,5);if(ph>0){cx.save();cx.globalAlpha=ph;for(let i=0;i<4;i++){const vx2=sx+4+i*7,vh=TS*4*ph,g2=cx.createLinearGradient(vx2,sy-vh,vx2,sy);g2.addColorStop(0,'rgba(255,100,0,0)');g2.addColorStop(1,'rgba(255,60,0,0.9)');cx.fillStyle=g2;cx.fillRect(vx2,sy-vh,5,vh);}cx.restore();}}
  else if(t===24){const act=activatedCPs.has(c+','+r);cx.fillStyle='#002211';cx.fillRect(sx,sy,TS,TS);cx.strokeStyle=act?'#00FF88':'#338855';cx.lineWidth=1;cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);if(act){cx.shadowBlur=8;cx.shadowColor='#00FF88';}cx.fillStyle=act?'#00FF88':'#336644';cx.font='16px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('🚩',sx+TS/2,sy+TS/2);cx.shadowBlur=0;}
  else if(t===25){nbox(sx,sy,TS,TS,'#1a1000','#AA8855','#664422');cx.strokeStyle='rgba(100,68,34,0.6)';cx.lineWidth=1;[TS/3,TS*2/3].forEach(o=>{cx.beginPath();cx.moveTo(sx,sy+o);cx.lineTo(sx+TS,sy+o);cx.stroke();cx.beginPath();cx.moveTo(sx+o,sy);cx.lineTo(sx+o,sy+TS);cx.stroke();});}
  else if((t>=15&&t<=28)||t===43||t===55||t===56||t===57){const labels={15:'👾',26:'🛸',27:'🛡',28:'🚶',43:'🎯',55:'⚡',56:'☄',57:'🕷'},cols={15:'#FF0000',26:'#FF8800',27:'#4488FF',28:'#AA44AA',43:'#FF0055',55:'#FF8800',56:'#AA44FF',57:'#1D9E75'};const col=cols[t]||'#888';cx.fillStyle='rgba(0,0,0,0.5)';cx.fillRect(sx,sy,TS,TS);cx.strokeStyle=col;cx.lineWidth=1;cx.setLineDash([3,3]);cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);cx.setLineDash([]);cx.font='16px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(labels[t]||'?',sx+TS/2,sy+TS/2);}
  else if(t===40){
    // ◥  "/" slope — solid triangle bottom-left to top-right
    cx.fillStyle='#111020';cx.fillRect(sx,sy,TS,TS);
    cx.save();
    cx.shadowBlur=12;cx.shadowColor='#7F77DD';
    cx.fillStyle='#1a1830';
    cx.beginPath();cx.moveTo(sx,sy+TS);cx.lineTo(sx+TS,sy);cx.lineTo(sx+TS,sy+TS);cx.closePath();cx.fill();
    cx.strokeStyle='#7F77DD';cx.lineWidth=1;
    cx.beginPath();cx.moveTo(sx,sy+TS);cx.lineTo(sx+TS,sy);cx.lineTo(sx+TS,sy+TS);cx.closePath();cx.stroke();
    // highlight on hypotenuse
    cx.strokeStyle='#AFA9EC';cx.lineWidth=2;
    cx.beginPath();cx.moveTo(sx+1,sy+TS-1);cx.lineTo(sx+TS-1,sy+1);cx.stroke();
    cx.restore();
  }
  else if(t===41){
    // ◤  "\" slope — solid triangle bottom-right to top-left
    cx.fillStyle='#111020';cx.fillRect(sx,sy,TS,TS);
    cx.save();
    cx.shadowBlur=12;cx.shadowColor='#7F77DD';
    cx.fillStyle='#1a1830';
    cx.beginPath();cx.moveTo(sx,sy);cx.lineTo(sx+TS,sy+TS);cx.lineTo(sx,sy+TS);cx.closePath();cx.fill();
    cx.strokeStyle='#7F77DD';cx.lineWidth=1;
    cx.beginPath();cx.moveTo(sx,sy);cx.lineTo(sx+TS,sy+TS);cx.lineTo(sx,sy+TS);cx.closePath();cx.stroke();
    // highlight on hypotenuse
    cx.strokeStyle='#AFA9EC';cx.lineWidth=2;
    cx.beginPath();cx.moveTo(sx+1,sy+1);cx.lineTo(sx+TS-1,sy+TS-1);cx.stroke();
    cx.restore();
  }
  else if(t===42){
    const key=c+','+r;
    const ct=crumbleBlocks[key]; // undefined=intact, 45→0=crumbling
    const crumbling=ct!==undefined;
    const progress=crumbling?(1-ct/45):0; // 0=intact, 1=gone
    // shake offset increases as it crumbles
    const shk=crumbling&&ct<35?(Math.sin(frame*1.8)*(progress*3)):0;
    const sky2=crumbling&&ct<35?(Math.cos(frame*2.1)*(progress*2)):0;
    const drawX=sx+shk, drawY=sy+sky2;
    cx.save();
    cx.globalAlpha=crumbling&&ct<20?ct/20:1;
    // base block
    cx.fillStyle='#1a0d08';cx.fillRect(drawX,drawY,TS,TS);
    // border — glows orange-red
    const borderCol=crumbling?`hsl(${20+progress*10},80%,${40+progress*15}%)`:'#CC6633';
    cx.strokeStyle=borderCol;cx.lineWidth=1;
    cx.shadowBlur=crumbling?8+progress*12:4;cx.shadowColor='#CC4400';
    cx.strokeRect(drawX+.5,drawY+.5,TS-1,TS-1);cx.shadowBlur=0;
    // crack pattern — deepens as it crumbles
    const crackAlpha=0.35+progress*0.65;
    cx.strokeStyle=`rgba(80,40,10,${crackAlpha})`;cx.lineWidth=1;
    // main diagonal crack
    cx.beginPath();cx.moveTo(drawX+5,drawY+6);cx.lineTo(drawX+TS*0.55,drawY+TS*0.42);cx.lineTo(drawX+TS-5,drawY+TS-7);cx.stroke();
    // branch crack 1
    cx.beginPath();cx.moveTo(drawX+TS*0.55,drawY+TS*0.42);cx.lineTo(drawX+TS*0.75,drawY+TS*0.25);cx.stroke();
    // branch crack 2
    cx.beginPath();cx.moveTo(drawX+TS*0.3,drawY+TS*0.65);cx.lineTo(drawX+TS*0.15,drawY+TS*0.8);cx.stroke();
    // extra cracks appear when crumbling
    if(crumbling&&ct<30){
      cx.strokeStyle=`rgba(100,50,10,${progress})`;
      cx.beginPath();cx.moveTo(drawX+TS*0.6,drawY+TS*0.6);cx.lineTo(drawX+TS-4,drawY+TS*0.4);cx.stroke();
      cx.beginPath();cx.moveTo(drawX+8,drawY+TS*0.5);cx.lineTo(drawX+TS*0.3,drawY+TS-5);cx.stroke();
    }
    // dust particles emit from block while crumbling
    if(crumbling&&ct>0&&ct%4===0&&Math.random()<0.6){
      spawnParts(c*TS+TS/2+shk,r*TS+TS/2+sky2,'#AA6622',2);
    }
    cx.restore();
  }  else if(t===44){
    if(mode==='play'){cx.save();cx.globalAlpha=0.06;cx.fillStyle='#63c916';cx.fillRect(sx,sy,TS,TS);cx.restore();}
    else{
      cx.save();
      cx.shadowBlur=16;cx.shadowColor='#63c916';
      cx.fillStyle='#001a00';cx.fillRect(sx,sy,TS,TS);
      cx.strokeStyle='#63c916';cx.lineWidth=1.5;cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);
      // mini player icon
      const px4=sx+TS/2-5,py4=sy+TS/2-7;
      cx.fillStyle='#0d1a0d';cx.fillRect(px4,py4,10,10);
      cx.strokeStyle='#AFA9EC';cx.lineWidth=1.5;cx.strokeRect(px4+.5,py4+.5,9,9);
      cx.fillStyle='#AFA9EC';cx.shadowBlur=4;cx.shadowColor='#AFA9EC';
      cx.beginPath();cx.arc(px4+7,py4+5,1.8,0,Math.PI*2);cx.fill();
      // arrow
      cx.shadowBlur=8;cx.shadowColor='#63c916';cx.strokeStyle='#63c916';cx.lineWidth=1.5;
      cx.beginPath();cx.moveTo(sx+4,sy+TS-6);cx.lineTo(sx+TS-4,sy+TS-6);cx.stroke();
      cx.beginPath();cx.moveTo(sx+TS/2-4,sy+TS-10);cx.lineTo(sx+TS/2,sy+TS-4);cx.lineTo(sx+TS/2+4,sy+TS-10);cx.stroke();
      // label
      cx.fillStyle='#63c916';cx.font='bold 6px monospace';cx.textAlign='center';cx.textBaseline='top';cx.shadowBlur=0;
      cx.fillText('START',sx+TS/2,sy+2);
      cx.restore();
    }
  }  else if(t===45){
    cx.fillStyle='#061500';cx.fillRect(sx,sy,TS,TS);
    const ao=Math.sin(frame*0.07+c*0.9)*4;
    cx.fillStyle='rgba(50,210,30,0.45)';cx.fillRect(sx,sy+5+ao,TS,TS-5);
    cx.fillStyle='rgba(100,255,60,0.55)';
    for(let b2=0;b2<3;b2++){const bx5=sx+5+b2*9,by5=sy+TS-6+Math.sin(frame*0.13+b2*2.1+c)*4;cx.beginPath();cx.arc(bx5,by5,1.5,0,Math.PI*2);cx.fill();}
    cx.shadowBlur=6;cx.shadowColor='#44DD22';cx.strokeStyle='#44DD22';cx.lineWidth=1;cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);cx.shadowBlur=0;
  }
  else if(t===52||t===53){
    const lava=t===53;
    const cBlock=lava?'#2a0600':'#0a2a06', cBody=lava?'#7a2410':'#1a6e12',
          cEdge=lava?'#D85A30':'#44DD22', cGlo=lava?'#ff6a2a':'#63ff2a';
    cx.fillStyle=cBlock;cx.fillRect(sx,sy,TS,TS);
    const ool=Math.sin(frame*0.05+c)*3;
    cx.save();cx.shadowBlur=10;cx.shadowColor=cGlo;cx.fillStyle=cBody;
    cx.fillRect(sx,sy+10+ool,TS,TS-10);cx.restore();
    cx.strokeStyle=cEdge;cx.lineWidth=1;cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);
    // hanging ooze teeth along the bottom (curtain)
    cx.save();cx.shadowBlur=8;cx.shadowColor=cGlo;cx.fillStyle=cBody;
    for(let i=0;i<5;i++){const hx=sx+5+i*((TS-10)/4);const hang=6+Math.sin(frame*0.07+i*1.7+c)*4;
      cx.beginPath();cx.moveTo(hx-3,sy+TS);cx.lineTo(hx+3,sy+TS);cx.lineTo(hx,sy+TS+hang);cx.closePath();cx.fill();}
    cx.restore();
  }
  else if(t===46||t===47){
    const ldir2=t===46?1:-1;
    let em3=null;for(let ei=0;ei<laserEmitters.length;ei++){if(laserEmitters[ei].gx===c&&laserEmitters[ei].gy===r){em3=laserEmitters[ei];break;}}
    const charge2=em3?(em3.active?1:em3.timer/140):0;
    cx.save();
    cx.shadowBlur=4+charge2*10;cx.shadowColor='#FF0055';
    cx.fillStyle='#1a0010';cx.fillRect(sx,sy,TS,TS);
    cx.strokeStyle='#FF0055';cx.lineWidth=1.5;cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);
    const eyeX2=ldir2>0?sx+TS-7:sx+7;
    cx.fillStyle=charge2>0.8?'#FF3366':'#660022';
    cx.shadowBlur=charge2*10;cx.shadowColor='#FF0055';
    cx.beginPath();cx.arc(eyeX2,sy+TS/2,2.5+charge2*2,0,Math.PI*2);cx.fill();
    if(charge2>0.3&&!em3.active){
      cx.globalAlpha=(charge2-0.3)/0.7*0.45;cx.strokeStyle='#FF0055';cx.lineWidth=0.8;
      for(let li2=0;li2<3;li2++){cx.beginPath();cx.moveTo(ldir2>0?sx+3:sx+TS-3,sy+4+li2*8);cx.lineTo(eyeX2,sy+TS/2);cx.stroke();}
      cx.globalAlpha=1;
    }
    cx.fillStyle='rgba(255,50,80,0.45)';
    const ax2=ldir2>0?sx+TS-2:sx+2;
    cx.beginPath();cx.moveTo(ax2,sy+TS/2-3);cx.lineTo(ax2+ldir2*5,sy+TS/2);cx.lineTo(ax2,sy+TS/2+3);cx.fill();
    cx.shadowBlur=0;cx.restore();
  }
  else if((t>=29&&t<=39)||t===60||t===61||t===62){
    const CFG={29:{ic:'⚡',cl:'#FFEE00',bg:'#1a1a00',lb:'SPD'},60:{ic:'1UP',cl:'#44DD66',bg:'#06200c',lb:'LIFE'},61:{ic:'❤',cl:'#FF3366',bg:'#2a0010',lb:'HEART'},30:{ic:'🛡',cl:'#00FFEE',bg:'#001a1a',lb:'SHD'},31:{ic:'✦',cl:'#FF88FF',bg:'#1a0028',lb:'JMP'},32:{ic:'●',cl:'#EF9F27',bg:'#1a1000',lb:'COIN'},33:{ic:'🟠',cl:'#FF8800',bg:'#1a0800',lb:'SGUN'},34:{ic:'🔷',cl:'#00FFEE',bg:'#001a1a',lb:'LAZR'},35:{ic:'⚔️',cl:'#AA44FF',bg:'#150028',lb:'SWRD'},36:{ic:'💣',cl:'#FF5500',bg:'#1a0a00',lb:'GREN'},37:{ic:'❄️',cl:'#88EEFF',bg:'#001520',lb:'FRZ'},38:{ic:'⚡',cl:'#FF44FF',bg:'#1a001a',lb:'PLSM'},39:{ic:'🔵',cl:'#AFA9EC',bg:'#0d0d1a',lb:'BLST'},62:{ic:'⚓',cl:'#40e8ff',bg:'#00161c',lb:'HOOK'}}[t]||{ic:'?',cl:'#888',bg:'#111',lb:'?'};
    const bob=Math.sin(frame*0.08+c*0.5)*2;
    cx.fillStyle=CFG.bg;cx.fillRect(sx,sy,TS,TS);cx.strokeStyle=CFG.cl;cx.lineWidth=1;cx.setLineDash([2,2]);cx.strokeRect(sx+.5,sy+.5,TS-1,TS-1);cx.setLineDash([]);
    cx.save();cx.shadowBlur=10;cx.shadowColor=CFG.cl;
    if(t===61){cx.fillStyle=CFG.cl;drawHeartShape(cx,sx+TS/2,sy+TS/2+bob-2,1.3,CFG.cl);}
    else{cx.fillStyle=CFG.cl;cx.font=(CFG.ic==='1UP'?'bold 9px':'13px')+' monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(CFG.ic,sx+TS/2,sy+TS/2+bob);}
    cx.shadowBlur=0;cx.font='6px monospace';cx.globalAlpha=0.6;cx.fillStyle=CFG.cl;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(CFG.lb,sx+TS/2,sy+TS-5);cx.restore();
  }
  else if(t===54){
    // Sentinel miniboss editor marker
    const bo=bossOpts[r+','+c]||{};
    cx.save();
    cx.shadowBlur=14;cx.shadowColor='#FF4466';
    cx.fillStyle='#1a0820';cx.fillRect(sx+1,sy+1,TS-2,TS-2);
    cx.strokeStyle='#FF4466';cx.lineWidth=1.5;cx.setLineDash([3,3]);cx.strokeRect(sx+1.5,sy+1.5,TS-3,TS-3);cx.setLineDash([]);
    cx.shadowBlur=0;
    // rotating shield hint
    cx.strokeStyle='#4488FF';cx.lineWidth=3;cx.lineCap='round';
    const a=frame*0.05;cx.beginPath();cx.arc(sx+TS/2,sy+TS/2,TS*0.34,a-1,a+1);cx.stroke();
    // eye
    cx.fillStyle='#FF4466';cx.beginPath();cx.arc(sx+TS/2,sy+TS/2,4,0,Math.PI*2);cx.fill();
    cx.fillStyle='rgba(255,255,255,0.85)';cx.beginPath();cx.arc(sx+TS/2-1.3,sy+TS/2-1.3,1.5,0,Math.PI*2);cx.fill();
    // option hint dot: shock on/off
    cx.fillStyle=(bo.shock!=null?bo.shock:BOSS_DEFAULT_SHOCK)?'#FF8800':'#444';
    cx.beginPath();cx.arc(sx+TS-5,sy+5,2,0,Math.PI*2);cx.fill();
    cx.fillStyle='#FF4466';cx.font='bold 6px monospace';cx.textAlign='center';cx.textBaseline='top';
    cx.fillText('BOSS',sx+TS/2,sy+2);
    cx.restore();
  }
  else if(t===58){
    // Hive miniboss editor marker
    cx.save();cx.shadowBlur=14;cx.shadowColor='#639922';
    cx.fillStyle='#0a1a00';cx.fillRect(sx+1,sy+1,TS-2,TS-2);
    cx.strokeStyle='#639922';cx.lineWidth=1.5;cx.setLineDash([3,3]);cx.strokeRect(sx+1.5,sy+1.5,TS-3,TS-3);cx.setLineDash([]);
    cx.shadowBlur=0;
    // pulsing core
    const pl=0.5+0.5*Math.sin(frame*0.12);
    cx.fillStyle='rgba(156,232,90,'+(0.3+pl*0.4)+')';cx.beginPath();cx.arc(sx+TS/2,sy+TS/2,6,0,Math.PI*2);cx.fill();
    cx.fillStyle='#9CE85A';cx.beginPath();cx.arc(sx+TS/2,sy+TS/2,3,0,Math.PI*2);cx.fill();
    cx.fillStyle='#639922';cx.font='bold 6px monospace';cx.textAlign='center';cx.textBaseline='top';
    cx.fillText('HIVE',sx+TS/2,sy+2);
    cx.restore();
  }
  else if(t===59){
    // Warden miniboss editor marker
    cx.save();cx.shadowBlur=14;cx.shadowColor='#BA7517';
    cx.fillStyle='#1a0a00';cx.fillRect(sx+1,sy+1,TS-2,TS-2);
    cx.strokeStyle='#BA7517';cx.lineWidth=1.5;cx.setLineDash([3,3]);cx.strokeRect(sx+1.5,sy+1.5,TS-3,TS-3);cx.setLineDash([]);
    cx.shadowBlur=0;
    // sweeping beam hint
    cx.strokeStyle='#FF8800';cx.lineWidth=2;cx.lineCap='round';
    const a=Math.sin(frame*0.06)*1.1;cx.beginPath();cx.moveTo(sx+TS/2,sy+TS/2);cx.lineTo(sx+TS/2+Math.cos(a)*TS*0.4,sy+TS/2+Math.sin(a)*TS*0.4);cx.stroke();
    cx.fillStyle='#FFCC44';cx.fillRect(sx+TS/2-4,sy+TS/2-2,8,4);
    cx.fillStyle='#BA7517';cx.font='bold 6px monospace';cx.textAlign='center';cx.textBaseline='top';
    cx.fillText('WARD',sx+TS/2,sy+2);
    cx.restore();
  }
}

// draw() snaps the camera to whole screen pixels; the frame itself is _drawFrame()
function draw(){withPixelCamera(_drawFrame);}
function _drawFrame(){
  const _ez=(mode==='edit'&&editZoom!==1)?editZoom:1;let _rw,_rh;
  cx.setTransform(DPR*_ez,0,0,DPR*_ez,0,0);
  if(_ez!==1){_rw=W;_rh=H;W=W/_ez;H=H/_ez;}
  cx.fillStyle='#07070f';cx.fillRect(0,0,W,H);
  drawBackground(); // layered scenes in js/render/backgrounds.js (old drawParallax kept below, unused)
  feelPreDraw();
  cx.save();cx.translate(Math.round(shakeX),Math.round(shakeY));
  cx.strokeStyle='rgba(100,80,200,0.035)';cx.lineWidth=1;
  for(let x=-(camX%TS);x<W;x+=TS){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,H);cx.stroke();}
  for(let y=-(camY%TS);y<H;y+=TS){cx.beginPath();cx.moveTo(0,y);cx.lineTo(W,y);cx.stroke();}
  // trail (removed — no motion blur behind the blob)
  if(false)trail.forEach(s=>{cx.globalAlpha=s.alpha*0.6;cx.shadowBlur=7;cx.shadowColor=s.wet?'#1060A0':'#7F77DD';cx.fillStyle=s.wet?'#1a5FA5':'#534AB7';cx.beginPath();cx.arc(s.x-camX,s.y-camY,s.r,0,Math.PI*2);cx.fill();});cx.globalAlpha=1;cx.shadowBlur=0;
  // tiles
  const c0=Math.max(0,Math.floor(camX/TS)-1),c1=Math.min(COLS,c0+VCOLS+3);
  const r0=Math.max(0,Math.floor(camY/TS)-1),r1=Math.min(ROWS,r0+Math.ceil(H/TS)+3);
  cx.textAlign='center';cx.textBaseline='middle';
  twistDrawBack();
  for(let r=r0;r<r1;r++)for(let c=c0;c<c1;c++){const t=(grid[r]&&grid[r][c])||0;if(!t)continue;cx.save();drawTile(t,c*TS-camX,r*TS-camY,c,r);cx.restore();}
  // moving platforms
  movPlats.forEach(drawMovPlatNew);tilesDrawFx();
  // crushers
  crushers.forEach(cr=>{const sx=cr.x-camX,sy=cr.y-camY;cx.save();if(cr.state==='warn')cx.globalAlpha=0.5+0.5*Math.sin(frame*0.5);cx.shadowBlur=14;cx.shadowColor='#FF4400';cx.fillStyle='#3a1000';cx.fillRect(sx,sy,cr.w,cr.h);cx.strokeStyle='#FF4400';cx.lineWidth=2;cx.strokeRect(sx+.5,sy+.5,cr.w-1,cr.h-1);cx.fillStyle='#FF4400';for(let i=0;i<4;i++)cx.fillRect(sx+3+i*8,sy+cr.h-7,6,7);cx.strokeStyle='rgba(255,68,0,0.3)';cx.lineWidth=1;cx.beginPath();cx.moveTo(sx+cr.w/2,sy);cx.lineTo(sx+cr.w/2,cr.homeY-camY);cx.setLineDash([4,4]);cx.stroke();cx.setLineDash([]);cx.shadowBlur=0;cx.restore();});
  // power orbs
  powerOrbs.forEach(o=>{const sx=o.x-camX,sy=o.y-camY;const bob=Math.sin(frame*0.1+o.x)*4;const pulse=0.85+Math.sin(frame*0.12)*0.15;
    if(o.type==='life'){
      cx.save();cx.shadowBlur=16;cx.shadowColor='#44DD66';cx.fillStyle='#44DD66';cx.globalAlpha=pulse;
      cx.beginPath();cx.arc(sx,sy+bob,9,0,Math.PI*2);cx.fill();cx.shadowBlur=0;
      cx.fillStyle='#063810';cx.font='bold 7px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('1UP',sx,sy+bob);cx.restore();
      return;
    }
    if(o.type==='heart'){
      const flap=Math.sin(frame*0.3+o.x)*0.5;
      cx.save();
      // flapping wings
      cx.shadowBlur=10;cx.shadowColor='#FF88AA';cx.globalAlpha=pulse*0.9;cx.fillStyle='rgba(255,235,245,0.9)';
      cx.save();cx.translate(sx-7,sy+bob-2);cx.rotate(-0.5+flap);cx.beginPath();cx.ellipse(-5,0,7,3.5,0,0,Math.PI*2);cx.fill();cx.restore();
      cx.save();cx.translate(sx+7,sy+bob-2);cx.rotate(0.5-flap);cx.beginPath();cx.ellipse(5,0,7,3.5,0,0,Math.PI*2);cx.fill();cx.restore();
      // heart
      cx.shadowBlur=16;cx.shadowColor='#FF3366';cx.globalAlpha=pulse;
      drawHeartShape(cx,sx,sy+bob,1.15,'#FF3366');
      cx.shadowBlur=0;cx.restore();
      return;
    }
    if(o.type==='hook'){const x=sx,y=sy+bob;cx.save();cx.shadowBlur=16;cx.shadowColor='#40e8ff';cx.strokeStyle='rgba(64,232,255,0.6)';cx.lineWidth=1.5;cx.beginPath();cx.arc(x,y,10+Math.sin(frame*0.1)*1.5,0,7);cx.stroke();
      cx.translate(x,y);cx.rotate(Math.sin(frame*0.05)*0.4);cx.strokeStyle='#bff8ff';cx.lineWidth=2;cx.lineCap='round';cx.beginPath();cx.moveTo(0,-7);cx.lineTo(0,4);cx.moveTo(0,4);cx.quadraticCurveTo(-6,4,-6,-1);cx.moveTo(0,4);cx.quadraticCurveTo(6,4,6,-1);cx.moveTo(-3,-7);cx.lineTo(3,-7);cx.stroke();
      cx.fillStyle='#fff';cx.beginPath();cx.arc(0,-7,1.6,0,7);cx.fill();cx.restore();return;}
    let col,ic;if(o.type==='wpick'){const d=WDEFS[o.weapon]||{col:'#aaa',icon:'?'};col=d.col;ic=d.icon;}else{col=o.type==='speed'?'#FFFF00':o.type==='shield'?'#00FFEE':'#FF88FF';ic=o.type==='speed'?'⚡':o.type==='shield'?'🛡':'✦';}
    cx.save();cx.shadowBlur=14;cx.shadowColor=col;cx.fillStyle=col;cx.globalAlpha=pulse;cx.beginPath();cx.arc(sx,sy+bob,7,0,Math.PI*2);cx.fill();cx.fillStyle='rgba(0,0,0,0.6)';cx.font='bold 8px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(ic,sx,sy+bob);cx.shadowBlur=0;cx.restore();});
  // coins
  coins.forEach(co=>{const sx=co.x-camX,sy=co.y-camY,spin=Math.cos(frame*0.15+co.x*0.05),bob=Math.sin(frame*0.1+co.x*0.04)*2.5;cx.save();cx.translate(sx,sy+bob);cx.shadowBlur=12;cx.shadowColor='#EF9F27';cx.fillStyle='#EF9F27';cx.beginPath();cx.ellipse(0,0,Math.max(0.5,Math.abs(spin)*5),5,0,0,Math.PI*2);cx.fill();if(spin>0.2){cx.fillStyle='rgba(255,220,100,0.6)';cx.beginPath();cx.ellipse(-1,0,Math.max(0.2,spin*2),3.5,0,0,Math.PI*2);cx.fill();}cx.shadowBlur=0;cx.restore();});
  // coin pickup popups
  coinPops.forEach(cp=>{const sx=cp.x-camX,sy=cp.y-camY,al=Math.min(1,cp.life/30);const txt=cp.txt||'+10',col=cp.col||'#FFD24D';cx.save();cx.globalAlpha=al;cx.font='bold 12px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle=col;cx.shadowBlur=8;cx.shadowColor=col;cx.fillText(txt,sx,sy);cx.shadowBlur=0;cx.restore();});
  // enemy bullets
  eBullets.forEach(b=>{const sx=b.x-camX,sy=b.y-camY;cx.save();cx.shadowBlur=8;cx.shadowColor=b.acid?'#1D9E75':'#FF6600';cx.fillStyle=b.acid?'#5DCAA5':'#FF8844';cx.beginPath();cx.arc(sx,sy,4,0,Math.PI*2);cx.fill();cx.shadowBlur=0;cx.restore();});
  enemyBombs.forEach(b=>{const sx=b.x-camX,sy=b.y-camY;const fl=Math.floor(b.flash/5)%2;cx.save();cx.shadowBlur=8;cx.shadowColor='#FF8800';cx.fillStyle=fl?'#FF4422':'#FF8800';cx.fillRect(sx-5,sy-5,10,10);cx.fillStyle='#220500';cx.fillRect(sx-2,sy-2,4,4);cx.strokeStyle='#FFAA44';cx.lineWidth=1;cx.beginPath();cx.moveTo(sx,sy-5);cx.lineTo(sx+3,sy-9);cx.stroke();cx.shadowBlur=0;cx.restore();});
  // player bullets
  bullets.forEach(b=>{
    const sx=b.x-camX,sy=b.y-camY;cx.save();
    if(b.type==='plasma'){cx.shadowBlur=16;cx.shadowColor=WDEFS.plasma.col;cx.fillStyle=WDEFS.plasma.col;cx.globalAlpha=0.7+Math.sin(frame*0.2)*0.3;cx.beginPath();cx.arc(sx,sy,b.r||5,0,Math.PI*2);cx.fill();}
    else if(b.type==='freeze'){cx.shadowBlur=10;cx.shadowColor='#88EEFF';cx.fillStyle='#AAFFFF';cx.beginPath();cx.arc(sx,sy,4,0,Math.PI*2);cx.fill();}
    else{cx.shadowBlur=10;cx.shadowColor='#7F77DD';cx.fillStyle='#AFA9EC';cx.beginPath();cx.arc(sx,sy,4,0,Math.PI*2);cx.fill();cx.fillStyle='#fff';cx.beginPath();cx.arc(sx,sy,1.5,0,Math.PI*2);cx.fill();}
    cx.shadowBlur=0;cx.restore();
  });
  // grenades
  grenades.forEach(g=>{const sx=g.x-camX,sy=g.y-camY;cx.save();cx.shadowBlur=8;cx.shadowColor='#FF6600';cx.fillStyle='#FF6600';cx.beginPath();cx.arc(sx,sy,5,0,Math.PI*2);cx.fill();cx.shadowBlur=0;cx.restore();});
  // laser beams
  // ── LASER EMITTER BEAMS ──
  laserEmitters.forEach(function(em){
    if(!em.active)return;
    const sx8=em.bx1-camX,sx9=em.bx2-camX,sy8=em.by-camY;
    const fade=em.timer>=170?(175-em.timer)/5:1;
    cx.save();
    cx.globalAlpha=fade*0.92;
    cx.shadowBlur=20;cx.shadowColor='#FF0055';
    cx.strokeStyle='#FF2266';cx.lineWidth=5;
    cx.beginPath();cx.moveTo(sx8,sy8);cx.lineTo(sx9,sy8);cx.stroke();
    cx.strokeStyle='rgba(255,200,220,0.85)';cx.lineWidth=2;cx.shadowBlur=0;
    cx.beginPath();cx.moveTo(sx8,sy8);cx.lineTo(sx9,sy8);cx.stroke();
    cx.strokeStyle='rgba(255,255,255,0.65)';cx.lineWidth=0.5;
    cx.beginPath();cx.moveTo(sx8,sy8);cx.lineTo(sx9,sy8);cx.stroke();
    cx.restore();
  });
  laserBeams.forEach(lb=>{cx.save();cx.globalAlpha=lb.life/10;cx.shadowBlur=14;cx.shadowColor='#00FFEE';cx.strokeStyle='#00FFEE';cx.lineWidth=3;cx.beginPath();cx.moveTo(lb.x1-camX,lb.y1-camY);cx.lineTo(lb.x2-camX,lb.y2-camY);cx.stroke();cx.strokeStyle='#fff';cx.lineWidth=1;cx.beginPath();cx.moveTo(lb.x1-camX,lb.y1-camY);cx.lineTo(lb.x2-camX,lb.y2-camY);cx.stroke();cx.shadowBlur=0;cx.restore();});
  // FLAME JET overlays
  flameJets.forEach(function(fj){
    if(!fj.active||fj.reach<1)return;
    const phase=fj.timer>=80?(fj.timer-80)/32:Math.max(0,1-(fj.timer-112)/8);
    for(let i=1;i<=fj.reach;i++){
      const r2=fj.gy+fj.dir*i;
      const bsx=fj.gx*TS-camX,bsy=r2*TS-camY;
      const taper=1-i/fj.reach*0.55;
      cx.save();
      cx.globalAlpha=phase*taper*0.9;
      cx.shadowBlur=16;cx.shadowColor='#FF4400';
      const fw=Math.floor(TS*0.35+Math.random()*TS*0.25);
      const fx2=bsx+(TS-fw)/2;
      cx.fillStyle='#FF1500';cx.fillRect(fx2,bsy,fw,TS);
      cx.globalAlpha=phase*taper*0.5;
      cx.fillStyle='#FFAA00';cx.fillRect(fx2+(fw*0.25),bsy,fw*0.5,TS);
      cx.globalAlpha=phase*taper*0.2;
      cx.fillStyle='#FFFFFF';cx.fillRect(fx2+(fw*0.4),bsy,fw*0.2,TS);
      cx.restore();
    }
    // tip glow
    const tipR=fj.gy+fj.dir*(fj.reach+1);
    cx.save();cx.globalAlpha=phase*0.35;cx.shadowBlur=20;cx.shadowColor='#FF6600';
    cx.fillStyle='#FF6600';cx.fillRect(fj.gx*TS-camX,tipR*TS-camY,TS,TS);cx.restore();
  });
  // DRIP BLOCKS — falling droplets + puddles
  dripBlocks.forEach(function(db){
    const cGlo=db.lava?'#ff6a2a':'#63ff2a', cDrop=db.lava?'#FF8A3C':'#7CFF3C';
    db.drops.forEach(function(d){
      const dx=d.x-camX, dy=d.y-camY, r=3.2;
      cx.save();cx.shadowBlur=12;cx.shadowColor=cGlo;cx.fillStyle=cDrop;
      cx.beginPath();
      cx.moveTo(dx,dy-r*1.7);
      cx.quadraticCurveTo(dx+r,dy-r*0.3,dx+r,dy);
      cx.arc(dx,dy,r,0,Math.PI);
      cx.quadraticCurveTo(dx-r,dy-r*0.3,dx,dy-r*1.7);
      cx.fill();
      cx.fillStyle='rgba(255,255,255,0.4)';cx.beginPath();cx.ellipse(dx-r*0.3,dy-r*0.2,r*0.25,r*0.4,0,0,Math.PI*2);cx.fill();
      cx.restore();
    });
    db.puddles.forEach(function(pu){
      const px2=pu.x-camX, py2=pu.surfY-camY, a=Math.min(1,pu.life/48);
      cx.save();cx.globalAlpha=a*0.85;cx.shadowBlur=8;cx.shadowColor=cGlo;cx.fillStyle=cDrop;
      cx.beginPath();cx.ellipse(px2,py2,7,2.5,0,0,Math.PI*2);cx.fill();cx.restore();
    });
  });
  // FALLING ROCKS
  fallingRocks.forEach(function(fr){
    if(fr.state==='idle')return; // drawn as tile 51 placeholder... but we cleared it from grid. Draw at home.
    const ox=fr.shakeX||0;
    const drawX=fr.x+ox-camX,drawY=fr.y-camY;
    cx.save();
    if(fr.state==='warn')cx.globalAlpha=0.75+0.25*Math.sin(frame*0.7);
    cx.shadowBlur=fr.state==='fall'?14:4;cx.shadowColor='#AA6633';
    cx.fillStyle='#2a1a08';cx.fillRect(drawX,drawY,fr.w,fr.h);
    // rock texture
    cx.strokeStyle='#5a3a18';cx.lineWidth=1;cx.strokeRect(drawX+.5,drawY+.5,fr.w-1,fr.h-1);
    cx.strokeStyle='#3a2010';cx.lineWidth=1;
    cx.beginPath();cx.moveTo(drawX+7,drawY+5);cx.lineTo(drawX+13,drawY+14);cx.lineTo(drawX+22,drawY+9);cx.stroke();
    cx.beginPath();cx.moveTo(drawX+22,drawY+9);cx.lineTo(drawX+27,drawY+21);cx.stroke();
    cx.beginPath();cx.moveTo(drawX+5,drawY+20);cx.lineTo(drawX+14,drawY+26);cx.stroke();
    if(fr.state==='warn'){cx.strokeStyle='#FF8800';cx.lineWidth=1.5;cx.strokeRect(drawX+.5,drawY+.5,fr.w-1,fr.h-1);}
    cx.restore();
  });
  // Draw idle falling rocks at home position
  fallingRocks.forEach(function(fr){
    if(fr.state!=='idle')return;
    const drawX=fr.x-camX,drawY=fr.homeY-camY;
    cx.fillStyle='#2a1a08';cx.fillRect(drawX,drawY,fr.w,fr.h);
    cx.strokeStyle='#5a3a18';cx.lineWidth=1;cx.strokeRect(drawX+.5,drawY+.5,fr.w-1,fr.h-1);
    cx.strokeStyle='#3a2010';cx.lineWidth=1;
    cx.beginPath();cx.moveTo(drawX+7,drawY+5);cx.lineTo(drawX+13,drawY+14);cx.lineTo(drawX+22,drawY+9);cx.stroke();
    cx.beginPath();cx.moveTo(drawX+22,drawY+9);cx.lineTo(drawX+27,drawY+21);cx.stroke();
  });
  // explosions
  explosions.forEach(ex=>{const sx=ex.x-camX,sy=ex.y-camY,t=ex.life/18;cx.save();cx.globalAlpha=t*0.8;cx.shadowBlur=20;cx.shadowColor=ex.col;cx.fillStyle=ex.col;cx.beginPath();cx.arc(sx,sy,ex.r,0,Math.PI*2);cx.fill();cx.globalAlpha=t*0.4;cx.fillStyle='#fff';cx.beginPath();cx.arc(sx,sy,ex.r*0.4,0,Math.PI*2);cx.fill();cx.shadowBlur=0;cx.restore();});
  // enemies
  enemies.forEach(e=>{
    const sx=e.x-camX,sy=e.y-camY;cx.save();
    if(e.inv>0&&!ENEW.has(e.type)&&Math.floor(e.inv/4)%2===0)cx.globalAlpha=0.3;
    // walker, sniper, climber, sentinel, hive and warden use the new look in js/render/enemies.js
    // (their old drawing below is kept but no longer reached)
    if(ENEW.has(e.type)){drawEnemy(e);}
    else if(e.type==='turret'){cx.shadowBlur=10;cx.shadowColor='#FF8800';cx.fillStyle='#2a1000';cx.fillRect(sx,sy,e.w,e.h);cx.strokeStyle='#FF8800';cx.lineWidth=2;cx.strokeRect(sx+.5,sy+.5,e.w-1,e.h-1);const angle=Math.atan2((player.y+player.h/2)-(e.y+e.h/2),(player.x+player.w/2)-(e.x+e.w/2));cx.save();cx.translate(sx+e.w/2,sy+e.h/2);cx.rotate(angle);cx.fillStyle='#FF8800';cx.fillRect(2,-2.5,10,5);cx.restore();cx.fillStyle='#FFAA44';cx.beginPath();cx.arc(sx+e.w/2,sy+e.h/2,4,0,Math.PI*2);cx.fill();cx.shadowBlur=0;}
    else if(e.type==='shield'){cx.shadowBlur=10;cx.shadowColor='#4488FF';cx.fillStyle='#001030';cx.fillRect(sx,sy,e.w,e.h);cx.strokeStyle='#4488FF';cx.lineWidth=2;cx.strokeRect(sx+.5,sy+.5,e.w-1,e.h-1);cx.fillStyle='#4488FF';cx.beginPath();cx.arc(sx+e.w/2,sy+e.h/2,4,0,Math.PI*2);cx.fill();const fx=e.facing>0?sx+e.w-1:sx;cx.strokeStyle='#AACCFF';cx.lineWidth=3;cx.shadowBlur=8;cx.shadowColor='#4488FF';cx.beginPath();cx.moveTo(fx,sy+2);cx.lineTo(fx,sy+e.h-2);cx.stroke();cx.shadowBlur=0;}
    else if(e.type==='walker'){cx.shadowBlur=8;cx.shadowColor='#AA44AA';cx.fillStyle='#1a001a';cx.fillRect(sx+2,sy,e.w-4,e.h-6);cx.strokeStyle='#AA44AA';cx.lineWidth=2;cx.strokeRect(sx+2.5,sy+.5,e.w-5,e.h-7);const leg=Math.sin(frame*0.2)*7;cx.strokeStyle='#AA44AA';cx.lineWidth=2;cx.beginPath();cx.moveTo(sx+5,sy+e.h-6);cx.lineTo(sx+5+leg,sy+e.h+2);cx.stroke();cx.beginPath();cx.moveTo(sx+e.w-5,sy+e.h-6);cx.lineTo(sx+e.w-5-leg,sy+e.h+2);cx.stroke();cx.fillStyle='#CC55CC';cx.beginPath();cx.arc(sx+e.w/2,sy+6,4,0,Math.PI*2);cx.fill();cx.shadowBlur=0;}
    else if(e.type==='sniper'){cx.shadowBlur=12;cx.shadowColor='#FF0055';
      // mounting bracket on the surface it's anchored to
      cx.fillStyle='#FF0055';
      if(e.surf==='ceiling')cx.fillRect(sx+2,sy-3,e.w-4,3);
      else if(e.surf==='left')cx.fillRect(sx-3,sy+2,3,e.h-4);
      else if(e.surf==='right')cx.fillRect(sx+e.w,sy+2,3,e.h-4);
      else cx.fillRect(sx+2,sy+e.h,e.w-4,3);
      cx.fillStyle='#1a0015';cx.fillRect(sx,sy,e.w,e.h);cx.strokeStyle='#FF0055';cx.lineWidth=2;cx.strokeRect(sx+.5,sy+.5,e.w-1,e.h-1);cx.fillStyle='#FF0055';cx.beginPath();cx.arc(sx+e.w/2,sy+e.h/2,4,0,Math.PI*2);cx.fill();const sdx2=(player.x+player.w/2)-(e.x+e.w/2),sdy2=(player.y+player.h/2)-(e.y+e.h/2),sd2=Math.sqrt(sdx2*sdx2+sdy2*sdy2);if(sd2<280&&e.shootCd2===0){const lp=Math.min(e.lockTimer/90,1);cx.save();cx.globalAlpha=0.12+lp*0.55;cx.strokeStyle='#FF0055';cx.lineWidth=1;cx.setLineDash([4,4]);cx.beginPath();cx.moveTo(sx+e.w/2,sy+e.h/2);cx.lineTo(player.x+player.w/2-camX,player.y+player.h/2-camY);cx.stroke();cx.setLineDash([]);cx.fillStyle='rgba(255,0,85,'+(0.4+lp*0.5)+')';cx.beginPath();cx.arc(player.x+player.w/2-camX,player.y+player.h/2-camY,5-lp*3,0,Math.PI*2);cx.fill();cx.restore();if(lp>0.65){cx.fillStyle='#FF0055';cx.font='bold 9px monospace';cx.textAlign='center';cx.textBaseline='bottom';cx.shadowBlur=6;cx.shadowColor='#FF0055';cx.fillText('!',sx+e.w/2,sy-1);cx.shadowBlur=0;}}cx.shadowBlur=0;}
    else if(e.type==='charger'){
      const wind=e.state==='windup',chg=e.state==='charge',stun=e.state==='stun';
      if(wind&&Math.floor(e.timer/4)%2){cx.fillStyle='rgba(255,80,0,0.25)';cx.fillRect(sx-4,sy-4,e.w+8,e.h+8);}
      cx.shadowBlur=10;cx.shadowColor='#FF8800';
      cx.fillStyle=stun?'#2a1500':'#1a0d00';cx.fillRect(sx,sy,e.w,e.h);
      cx.strokeStyle=stun?'#7a4a10':(chg?'#FFBB22':'#FF8800');cx.lineWidth=2;cx.strokeRect(sx+.5,sy+.5,e.w-1,e.h-1);
      const fx=e.facing>0?sx+e.w-5:sx;cx.fillStyle='#FFD27A';cx.fillRect(fx,sy+3,5,e.h-6);
      cx.fillStyle=wind?'#FF2200':'#FFAA44';cx.fillRect(e.facing>0?sx+e.w-11:sx+6,sy+6,4,4);
      if(chg){cx.fillStyle='rgba(255,170,40,0.4)';cx.fillRect(e.facing>0?sx-12:sx+e.w,sy+4,12,e.h-8);}
      if(stun){cx.fillStyle='#FFEE88';cx.font='10px monospace';cx.textAlign='center';cx.fillText('✦',sx+e.w/2,sy-3);}
      cx.shadowBlur=0;
    }
    else if(e.type==='bomber'){
      cx.shadowBlur=12;cx.shadowColor='#AA44FF';
      cx.fillStyle='#150028';cx.fillRect(sx,sy+4,e.w,e.h-6);
      cx.strokeStyle='#AA44FF';cx.lineWidth=2;cx.strokeRect(sx+.5,sy+4.5,e.w-1,e.h-7);
      cx.fillStyle='#CC88FF';cx.fillRect(sx+4,sy,e.w-8,7);
      cx.fillStyle='#3a0a55';cx.fillRect(sx+6,sy+8,4,4);cx.fillRect(sx+e.w-10,sy+8,4,4);
      if(e.timer<25){cx.fillStyle='rgba(255,120,40,'+(0.3+0.3*Math.sin(frame*0.5))+')';cx.fillRect(sx+e.w/2-4,sy+e.h-4,8,4);}
      cx.shadowBlur=0;
    }
    else if(e.type==='climber'){
      const ws=(e.wallSide===1)?1:-1;           // -1 wall on left, +1 wall on right
      const cxm=sx+e.w/2, cym=sy+e.h/2, rr=e.w*0.52;
      const charging=(e.timer<22), ct=charging?(1-e.timer/22):0;
      cx.save();
      // tendrils anchor toward the wall side
      const wallX = ws<0 ? sx-2 : sx+e.w+2;      // x of the wall surface
      cx.strokeStyle='#1D9E75';cx.lineWidth=2;cx.lineCap='round';
      for(let i=0;i<3;i++){const a=(i-1)*0.8, ty=cym+a*rr*1.1, sway=Math.sin(frame*0.08+i)*2;
        cx.beginPath();cx.moveTo(cxm+ws*rr*0.5,cym+a*rr*0.5);cx.quadraticCurveTo(wallX-ws*2,ty+sway,wallX,ty+sway*1.4);cx.stroke();
        cx.fillStyle='#1D9E75';cx.beginPath();cx.arc(wallX,ty+sway*1.4,1.6,0,Math.PI*2);cx.fill();}
      // orb
      cx.shadowBlur=12+ct*8;cx.shadowColor='#3FE0A8';
      const grd=cx.createRadialGradient(cxm-rr*0.3,cym-rr*0.3,rr*0.15,cxm,cym,rr);
      grd.addColorStop(0,'#1f6a50');grd.addColorStop(0.7,'#0c3527');grd.addColorStop(1,'#06241b');
      cx.fillStyle=grd;cx.beginPath();cx.arc(cxm,cym,rr,0,Math.PI*2);cx.fill();
      cx.shadowBlur=0;
      // veins
      cx.strokeStyle='rgba(63,224,168,0.3)';cx.lineWidth=1;
      for(let i=0;i<4;i++){const a=i*1.6+0.4;cx.beginPath();cx.moveTo(cxm+Math.cos(a)*rr*0.4,cym+Math.sin(a)*rr*0.4);cx.lineTo(cxm+Math.cos(a)*rr*0.92,cym+Math.sin(a)*rr*0.92);cx.stroke();}
      // rim
      cx.strokeStyle='#5DCAA5';cx.lineWidth=1.6;cx.beginPath();cx.arc(cxm,cym,rr,0,Math.PI*2);cx.stroke();
      // iris — looks AWAY from the wall (toward the open side / player), tracks vertically
      const look=Math.sin(frame*0.05)*rr*0.32, ir=rr*0.52, irx=cxm-ws*rr*0.12;
      cx.fillStyle='#bfffe8';cx.beginPath();cx.arc(irx,cym+look,ir,0,Math.PI*2);cx.fill();
      cx.strokeStyle=charging?'#FFCC66':'#5DCAA5';cx.lineWidth=1.4;cx.beginPath();cx.arc(irx,cym+look,ir,0,Math.PI*2);cx.stroke();
      cx.fillStyle=charging?'#FF9933':'#05201a';cx.beginPath();cx.arc(irx,cym+look,ir*0.48,0,Math.PI*2);cx.fill();
      cx.fillStyle='#fff';cx.beginPath();cx.arc(irx-ir*0.3,cym+look-ir*0.3,ir*0.2,0,Math.PI*2);cx.fill();
      // charge ring
      if(charging){const cr=rr+4-ct*3;cx.strokeStyle='rgba(255,170,80,'+(0.4+0.5*Math.sin(frame*0.7))+')';cx.lineWidth=2;cx.beginPath();cx.arc(cxm,cym,cr,0,Math.PI*2);cx.stroke();}
      cx.restore();
    }
    else if(e.type==='hive'){
      const p2=e.hp<=5,col=p2?'#FF4466':'#639922',cxm=sx+e.w/2,cym=sy+e.h/2;
      const gap=e.open*16;
      cx.save();
      if(e.inv>0&&Math.floor(e.inv/3)%2)cx.globalAlpha=0.5;
      // core weak point (visible when open)
      if(e.open>0.1){
        cx.shadowBlur=16;cx.shadowColor=col;
        cx.fillStyle='rgba('+(p2?'255,68,102':'156,232,90')+','+(0.3+0.4*Math.sin(e.pulse*3))+')';
        cx.beginPath();cx.arc(cxm,cym,14,0,Math.PI*2);cx.fill();
        cx.fillStyle=p2?'#FF4466':'#9CE85A';cx.beginPath();cx.arc(cxm,cym,7+Math.sin(e.pulse*3)*2,0,Math.PI*2);cx.fill();
        cx.fillStyle='#fff';cx.beginPath();cx.arc(cxm-2,cym-2,2,0,Math.PI*2);cx.fill();
        cx.shadowBlur=0;
      }
      // shell halves slide apart
      cx.shadowBlur=12;cx.shadowColor=col;cx.fillStyle=p2?'#2a0812':'#0a1a00';cx.strokeStyle=col;cx.lineWidth=2;
      cx.fillRect(sx-gap,sy,e.w/2-2,e.h);cx.strokeRect(sx-gap+.5,sy+.5,e.w/2-2,e.h-1);
      cx.fillRect(sx+e.w/2+gap+2,sy,e.w/2-2,e.h);cx.strokeRect(sx+e.w/2+gap+2.5,sy+.5,e.w/2-2,e.h-1);
      cx.shadowBlur=0;cx.strokeStyle=p2?'#5a1530':'#1a3a08';cx.lineWidth=1;
      for(let i=1;i<3;i++){cx.beginPath();cx.moveTo(sx-gap,sy+i*e.h/3);cx.lineTo(sx-gap+e.w/2-2,sy+i*e.h/3);cx.stroke();cx.beginPath();cx.moveTo(sx+e.w/2+gap+2,sy+i*e.h/3);cx.lineTo(sx+e.w+gap,sy+i*e.h/3);cx.stroke();}
      cx.restore();
    }
    else if(e.type==='warden'){
      const p2=e.hp<=4,col=p2?'#FF4466':'#BA7517',cxm=sx+e.w/2,cym=sy+e.h/2;
      // sweep beam
      if(e.state==='sweep'){
        const len=COLS*TS,ex=cxm+Math.cos(e.sweep)*len,ey=cym+Math.sin(e.sweep)*len;
        cx.save();cx.shadowBlur=14;cx.shadowColor='#FF8800';cx.strokeStyle='rgba(255,136,0,0.85)';cx.lineWidth=5;
        cx.beginPath();cx.moveTo(cxm,cym);cx.lineTo(ex,ey);cx.stroke();
        cx.strokeStyle='rgba(255,220,120,0.9)';cx.lineWidth=2;cx.beginPath();cx.moveTo(cxm,cym);cx.lineTo(ex,ey);cx.stroke();cx.restore();
      }
      // telegraph flash
      if(e.state==='telegraph'&&Math.floor(e.timer/4)%2){cx.fillStyle='rgba(255,80,0,0.25)';cx.fillRect(sx-6,sy-6,e.w+12,e.h+12);cx.fillStyle='#FF4400';cx.font='8px monospace';cx.textAlign='center';cx.fillText(e.facing>0?'▶▶':'◀◀',cxm,sy-8);}
      cx.save();if(e.inv>0&&Math.floor(e.inv/3)%2)cx.globalAlpha=0.5;
      cx.shadowBlur=14;cx.shadowColor=col;
      cx.fillStyle=p2?'#2a0812':'#1a0a00';cx.fillRect(sx,sy,e.w,e.h);
      cx.strokeStyle=col;cx.lineWidth=2;cx.strokeRect(sx+.5,sy+.5,e.w-1,e.h-1);
      cx.fillStyle=p2?'#FF4466':'#FFAA44';cx.fillRect(sx-3,sy+4,4,e.h-8);cx.fillRect(sx+e.w-1,sy+4,4,e.h-8);
      cx.shadowBlur=8;cx.shadowColor=p2?'#FF4466':'#FF8800';cx.fillStyle=p2?'#FF4466':'#FFCC44';cx.fillRect(sx+6,cym-3,e.w-12,5);
      if(e.state==='plant'||e.state==='sweep'){cx.fillStyle='rgba(255,136,0,'+(0.5+0.4*Math.sin(frame*0.4))+')';cx.beginPath();cx.arc(cxm,cym,6,0,Math.PI*2);cx.fill();}
      cx.restore();cx.shadowBlur=0;
    }
    else if(e.type==='sentinel'){
      const p2=e.hp<=4, rage=p2?'#FF4466':'#7F77DD';
      const cxm=sx+e.w/2, cym=sy+e.h/2;
      // body (gentle float pulse)
      const sq=1+Math.sin((e.bob||0))*0.05;
      const rw=(e.w/2)/sq, rh=(e.h/2)*sq;
      cx.shadowBlur=18;cx.shadowColor=rage;cx.fillStyle=p2?'#2a0820':'#1a1830';
      cx.beginPath();cx.ellipse(cxm,cym,rw,rh,0,0,Math.PI*2);cx.fill();
      cx.strokeStyle=rage;cx.lineWidth=2;cx.stroke();
      cx.shadowBlur=0;
      // core eye
      cx.fillStyle=rage;cx.beginPath();cx.arc(cxm,cym,7+Math.sin(frame*0.15)*2,0,Math.PI*2);cx.fill();
      cx.fillStyle='rgba(255,255,255,0.85)';cx.beginPath();cx.arc(cxm-2,cym-2,2.5,0,Math.PI*2);cx.fill();
      // rotating shield arc (or dashed ring when dropped for a volley)
      if(e.shieldDown<=0){
        cx.save();cx.shadowBlur=14;cx.shadowColor='#4488FF';cx.strokeStyle='#4488FF';cx.lineWidth=6;cx.lineCap='round';
        cx.beginPath();cx.arc(cxm,cym,e.w/2+8,e.ang-1.1,e.ang+1.1);cx.stroke();
        cx.strokeStyle='rgba(180,220,255,0.6)';cx.lineWidth=2;cx.shadowBlur=0;
        cx.beginPath();cx.arc(cxm,cym,e.w/2+8,e.ang-1.1,e.ang+1.1);cx.stroke();cx.restore();
      } else {
        cx.save();cx.globalAlpha=0.3;cx.strokeStyle='#FF8800';cx.lineWidth=2;cx.setLineDash([4,5]);
        cx.beginPath();cx.arc(cxm,cym,e.w/2+8,0,Math.PI*2);cx.stroke();cx.restore();
      }
    }
    else{cx.shadowBlur=10;cx.shadowColor='#E24B4A';cx.fillStyle='#1a0000';cx.fillRect(sx,sy,e.w,e.h);cx.strokeStyle='#E24B4A';cx.lineWidth=2;cx.strokeRect(sx+.5,sy+.5,e.w-1,e.h-1);const scanX=sx+3+(frame*2)%Math.max(1,e.w-6);cx.fillStyle='rgba(255,68,74,0.3)';cx.fillRect(scanX,sy+1,2,e.h-2);cx.fillStyle='#FF4444';cx.shadowBlur=6;cx.shadowColor='#FF0000';cx.beginPath();cx.arc(sx+e.w/2,sy+e.h/2,4,0,Math.PI*2);cx.fill();if(e.alert>30){cx.fillStyle='#FF0000';cx.font='bold 9px monospace';cx.textAlign='center';cx.textBaseline='bottom';cx.fillText('!',sx+e.w/2,sy-1);}cx.shadowBlur=0;}
    cx.restore();
    if(e.type==='sentinel'){if(e.hp<8){cx.fillStyle='#330000';cx.fillRect(sx,sy-8,e.w,5);cx.fillStyle=(e.hp<=4?'#FF4466':'#63c916');cx.fillRect(sx,sy-8,e.w*(e.hp/8),5);cx.strokeStyle='#888';cx.lineWidth=1;cx.strokeRect(sx+.5,sy-7.5,e.w-1,4);}}
    else if(e.type==='hive'||e.type==='warden'){const mx=e.type==='hive'?10:9,p2t=e.type==='hive'?5:4;cx.fillStyle='#220011';cx.fillRect(sx,sy-12,e.w,5);cx.fillStyle=(e.hp<=p2t?'#FF4466':'#63c916');cx.fillRect(sx,sy-12,e.w*(e.hp/mx),5);cx.strokeStyle='#888';cx.lineWidth=1;cx.strokeRect(sx+.5,sy-11.5,e.w-1,4);}
    else {var _mx=(e.type==='shield'||e.type==='sniper'||e.type==='charger'||e.type==='climber')?3:2;if(e.hp<_mx){cx.fillStyle='#331111';cx.fillRect(sx,sy-6,e.w,4);cx.fillStyle='#E24B4A';cx.fillRect(sx,sy-6,e.w*(e.hp/_mx),4);cx.strokeStyle='#555';cx.lineWidth=1;cx.strokeRect(sx,sy-6,e.w,4);}}
    if(e.frozen>0){cx.save();cx.globalAlpha=Math.min(1,e.frozen/40)*0.55;cx.fillStyle='#88EEFF';cx.fillRect(sx-1,sy-1,e.w+2,e.h+2);cx.strokeStyle='#00FFEE';cx.lineWidth=1;cx.shadowBlur=6;cx.shadowColor='#00FFEE';cx.strokeRect(sx-.5,sy-.5,e.w+1,e.h+1);cx.restore();}
  });
  drawEnemyFx(); // death pops
  // sword swing
  if(swordSwing>0&&mode==='play'){const p2=player,t2=swordSwing/18,sx2=p2.x-camX,sy2=p2.y-camY,dir=p2.facing;cx.save();cx.globalAlpha=t2*0.8;cx.shadowBlur=16;cx.shadowColor='#AA44FF';cx.strokeStyle='#CC88FF';cx.lineWidth=3;const sa=dir>0?-Math.PI*0.6:Math.PI*0.4,ea=dir>0?Math.PI*0.1:Math.PI*1.6;cx.beginPath();cx.arc(sx2+p2.w/2,sy2+p2.h/2,32,sa,ea,dir<0);cx.stroke();cx.fillStyle='#DD99FF';cx.globalAlpha=t2*0.35;cx.beginPath();cx.moveTo(sx2+p2.w/2,sy2+p2.h/2);cx.arc(sx2+p2.w/2,sy2+p2.h/2,32,sa,ea,dir<0);cx.closePath();cx.fill();cx.shadowBlur=0;cx.restore();}
  // player blob: animation + weapon in hand live in js/render/player.js
  skinDrawTrail();movesDrawBehind();drawPlayerBlob();movesDrawFront();grappleDraw();if(typeof tpadDrawSight==='function')tpadDrawSight();
  // rising lava flood (Lava theme)
  if(levelTheme===2&&lavaRiseSpeed>0){
    const surfY=lavaLevel-camY;
    if(surfY<H){
      const yTop=Math.max(surfY,-4);
      // body
      const lg=cx.createLinearGradient(0,yTop,0,H);
      lg.addColorStop(0,'#FF6622');lg.addColorStop(0.4,'#D83010');lg.addColorStop(1,'#5a0a00');
      cx.fillStyle=lg;cx.fillRect(0,yTop,W,H-yTop);
      // animated wavy surface
      cx.save();cx.shadowBlur=20;cx.shadowColor='#FF6600';
      cx.fillStyle='#FFAA33';cx.beginPath();cx.moveTo(0,surfY);
      for(let x=0;x<=W;x+=12){const wob=Math.sin(x*0.05+frame*0.08)*3+Math.sin(x*0.13+frame*0.05)*2;cx.lineTo(x,surfY+wob);}
      cx.lineTo(W,surfY+8);cx.lineTo(0,surfY+8);cx.closePath();cx.fill();
      // bright crest line
      cx.strokeStyle='#FFE08A';cx.lineWidth=2;cx.beginPath();
      for(let x=0;x<=W;x+=12){const wob=Math.sin(x*0.05+frame*0.08)*3+Math.sin(x*0.13+frame*0.05)*2;if(x===0)cx.moveTo(x,surfY+wob);else cx.lineTo(x,surfY+wob);}
      cx.stroke();cx.restore();
      // rising embers
      cx.fillStyle='rgba(255,180,80,0.8)';
      for(let i=0;i<6;i++){const ex=(i*137+frame*1.3)%W,ey=surfY-((frame*0.6+i*40)%70);if(ey<surfY&&ey>surfY-70){cx.globalAlpha=(ey-(surfY-70))/70*0.7;cx.fillRect(ex,ey,2,2);}}
      cx.globalAlpha=1;
    }
  }
  // particles
  parts.forEach(pt=>{const pr=pt.r||2;const al=pt.life/30;cx.globalAlpha=Math.max(0,al)*0.45;cx.fillStyle=pt.col;cx.beginPath();cx.arc(pt.x-camX,pt.y-camY,pr*1.9,0,Math.PI*2);cx.fill();cx.globalAlpha=Math.max(0,al);cx.beginPath();cx.arc(pt.x-camX,pt.y-camY,pr,0,Math.PI*2);cx.fill();});cx.globalAlpha=1;
  if(won&&winParts.length>0){cx.save();winParts.forEach(wp=>{const al=Math.max(0,wp.life/(wp.maxLife||90));cx.globalAlpha=al*0.5;cx.fillStyle=wp.col;cx.shadowBlur=8;cx.shadowColor=wp.col;cx.beginPath();cx.arc(wp.x,wp.y,wp.r*1.8,0,Math.PI*2);cx.fill();cx.globalAlpha=al;cx.beginPath();cx.arc(wp.x,wp.y,wp.r,0,Math.PI*2);cx.fill();});cx.shadowBlur=0;cx.globalAlpha=1;cx.restore();}
  twistDraw();feelDrawWorld();lightDraw();twistDarkness();
  cx.restore(); // end shake transform
  feelDrawOverlay();
  // death overlay
  if((deathTimer>0||deathSeqTimer>0)&&mode==='play'){drawDeathOverlay();}
  // weapon pickup flash
  if(pickupFlash.t>0){const ft=pickupFlash.t/55;cx.save();cx.globalAlpha=ft*0.22;cx.fillStyle=pickupFlash.col;cx.fillRect(0,0,W,H);if(pickupFlash.t>30){cx.globalAlpha=ft;cx.fillStyle=pickupFlash.col;cx.font='bold 18px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.shadowBlur=14;cx.shadowColor=pickupFlash.col;cx.fillText(pickupFlash.name+' EQUIPPED!',W/2,H/2-40);cx.shadowBlur=0;}cx.restore();}
  // brief control hint at level start (clean, player-facing, auto-fades)
  if(mode==='play'&&MS.tutorials&&startHintTimer>0&&!won&&deathSeqTimer===0){
    const al=Math.min(1,startHintTimer/45);
    cx.save();cx.globalAlpha=al;cx.textAlign='center';cx.textBaseline='middle';
    cx.font='bold 13px monospace';cx.fillStyle='#AFA9EC';cx.shadowBlur=10;cx.shadowColor='#7F77DD';
    cx.fillText(_isTouch()?'\u2190 \u2192 move   \u00b7   \u2191 jump   \u00b7   \u2726 fire   \u00b7   \u21c4 switch weapon':'Move: \u2190 \u2192 / A D   \u00b7   Jump: \u2191 / W / Space   \u00b7   Fire: Z / X   \u00b7   Switch: Q E or 1\u20137',W/2,42);
    cx.shadowBlur=0;cx.restore();
  }
  // weapon HUD
  if(mode==='play'){
    const slotW=50,slotH=34,gap=3,totalW=WLIST.length*(slotW+gap)-gap;
    const hx=Math.floor((W-totalW)/2),hy=H-slotH-6;
    cx.save();
    WLIST.forEach((w,i)=>{
      const def=WDEFS[w],ammo=wAmmo[w],has=ammo>0,active=w===curW;
      const x=hx+i*(slotW+gap),y=hy;
      cx.globalAlpha=has?1:0.28;
      cx.fillStyle=active?'rgba(20,10,30,0.95)':'rgba(8,8,16,0.7)';cx.fillRect(x,y,slotW,slotH);
      if(active){cx.shadowBlur=10;cx.shadowColor=def.col;cx.strokeStyle=def.col;cx.lineWidth=2;}else{cx.shadowBlur=0;cx.strokeStyle='#2a2a44';cx.lineWidth=1;}
      cx.strokeRect(x+.5,y+.5,slotW-1,slotH-1);cx.shadowBlur=0;
      cx.fillStyle='#555';cx.font='7px monospace';cx.textAlign='left';cx.textBaseline='top';cx.fillText(i+1,x+3,y+2);
      cx.font=active?'15px monospace':'13px monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle=has?def.col:'#555';
      if(active){cx.shadowBlur=6;cx.shadowColor=def.col;}cx.fillText(def.icon,x+slotW/2,y+slotH/2-4);cx.shadowBlur=0;
      cx.font='8px monospace';cx.textAlign='center';cx.textBaseline='bottom';cx.fillStyle=active?def.col:'#555';cx.fillText(ammo===Infinity?'∞':ammo,x+slotW/2,y+slotH-2);
      if(w==='plasma'&&plasmaCharging){cx.fillStyle='rgba(255,68,255,0.25)';cx.fillRect(x+2,y+slotH-5,slotW-4,4);cx.fillStyle='#FF44FF';cx.fillRect(x+2,y+slotH-5,(slotW-4)*(plasmaCharge/60),4);}
    });
    cx.globalAlpha=1;cx.restore();
  }
  // edit overlay
  if(mode==='edit'){
    cx.strokeStyle='rgba(127,119,221,0.15)';cx.lineWidth=1;
    for(let r=r0;r<r1;r++)for(let c=c0;c<c1;c++)cx.strokeRect(c*TS-camX,r*TS-camY,TS,TS);
    if(typeof heatDraw==='function')heatDraw();   // playtest heatmap
    if(typeof edDraw==='function')edDraw();   // selection / paste ghost / test-here marker
    if(selPlat!==null&&movPlats[selPlat]){
      const mp=movPlats[selPlat],sx=mp.x-camX,sy=mp.y-camY;
      cx.save();cx.shadowBlur=8;cx.shadowColor='#fff';cx.strokeStyle='#fff';cx.lineWidth=2;cx.strokeRect(sx-2,sy-2,mp.w+4,mp.h+4);cx.shadowBlur=0;
      const pw=184,ph=72,px3=Math.min(sx,W-pw-4),py3=Math.max(4,sy-ph-8);
      cx.fillStyle='rgba(8,8,22,0.92)';cx.strokeStyle='#7F77DD';cx.lineWidth=1;cx.fillRect(px3,py3,pw,ph);cx.strokeRect(px3+.5,py3+.5,pw-1,ph-1);
      cx.fillStyle='#AFA9EC';cx.font='9px monospace';cx.textAlign='left';cx.textBaseline='top';
      cx.fillText(`MOVING PLATFORM · ${mp.axis==='x'?'HORIZONTAL':'VERTICAL'}`,px3+6,py3+6);cx.fillText(`SPD: ${mp.spd.toFixed(1)}`,px3+6,py3+20);
      const st=(mp.spd-0.2)/3.8;cx.fillStyle='#2a2a3a';cx.fillRect(px3+8,py3+32,pw-16,8);cx.fillStyle='#7F77DD';cx.fillRect(px3+8,py3+32,st*(pw-16),8);
      cx.fillText(`RNG: ${Math.round(mp.range/TS)} tiles`,px3+6,py3+46);
      const rt=Math.max(0,Math.min(1,(mp.range/TS-1)/11));cx.fillStyle='#2a2a3a';cx.fillRect(px3+8,py3+58,pw-16,8);cx.fillStyle='#7F77DD';cx.fillRect(px3+8,py3+58,rt*(pw-16),8);
      cx.restore();
    }
    // drip GROUP selection: highlight all cells + a single slider over the group
    if(selDrip!==null&&selDrip.cells){
      // verify group still valid (cells still drip tiles)
      const valid=selDrip.cells.every(p=>grid[p.r]&&(grid[p.r][p.c]===52||grid[p.r][p.c]===53));
      if(valid){
        const lava=selDrip.lava;
        const accent=lava?'#D85A30':'#44DD22', accentLt=lava?'#FF9A5C':'#7CFF3C';
        // outline each cell
        cx.save();cx.shadowBlur=8;cx.shadowColor='#fff';cx.strokeStyle='#fff';cx.lineWidth=2;
        selDrip.cells.forEach(p=>{cx.strokeRect(p.c*TS-camX-1,p.r*TS-camY-1,TS+2,TS+2);});
        cx.shadowBlur=0;
        // slider
        const sr=dripSliderRect(selDrip);
        const eff=selDrip.speed;
        const t=Math.max(0,Math.min(1,(eff-0.3)/2.2));
        // label
        cx.fillStyle=accentLt;cx.font='9px monospace';cx.textAlign='left';cx.textBaseline='bottom';
        cx.fillText(`${lava?'LAVA':'ACID'} DRIP ×${selDrip.cells.length} · ${eff.toFixed(1)}×`,sr.bx,sr.by-3);
        // track + fill
        cx.fillStyle='rgba(8,8,22,0.85)';cx.fillRect(sr.bx-2,sr.by-2,sr.bw+4,sr.bh+4);
        cx.fillStyle='#2a2a3a';cx.fillRect(sr.bx,sr.by,sr.bw,sr.bh);
        cx.fillStyle=accent;cx.fillRect(sr.bx,sr.by,t*sr.bw,sr.bh);
        // knob
        cx.save();cx.shadowBlur=6;cx.shadowColor=accent;cx.fillStyle=accentLt;
        cx.fillRect(sr.bx+t*sr.bw-3,sr.by-2,6,sr.bh+4);cx.restore();
        cx.restore();
      } else selDrip=null;
    }
    // /boss options panel
    if(selBoss!==null){
      const bt=grid[selBoss.r]&&grid[selBoss.r][selBoss.c];
      if(bt===54||bt===58||bt===59){
        const key=selBoss.r+','+selBoss.c;
        const bo=bossOpts[key]||{};
        const accent=bt===54?'#FF4466':(bt===58?'#639922':'#BA7517');
        const accentLt=bt===54?'#FF89A3':(bt===58?'#9CE85A':'#FFAA44');
        // highlight the tile
        cx.save();cx.shadowBlur=8;cx.shadowColor='#fff';cx.strokeStyle='#fff';cx.lineWidth=2;
        cx.strokeRect(selBoss.c*TS-camX-2,selBoss.r*TS-camY-2,TS+4,TS+4);cx.shadowBlur=0;cx.restore();
        const pr=bossPanelRect(selBoss);
        cx.save();
        cx.fillStyle='rgba(8,8,22,0.94)';cx.strokeStyle=accent;cx.lineWidth=1;
        cx.fillRect(pr.px,pr.py,pr.pw,pr.ph);cx.strokeRect(pr.px+.5,pr.py+.5,pr.pw-1,pr.ph-1);
        cx.fillStyle=accentLt;cx.font='9px monospace';cx.textAlign='left';cx.textBaseline='top';
        if(bt===54){
          const arc=bo.arc!=null?bo.arc:BOSS_DEFAULT_ARC, shock=bo.shock!=null?bo.shock:BOSS_DEFAULT_SHOCK;
          cx.fillText('👁 SENTINEL',pr.px+8,pr.py+6);
          cx.fillStyle='#AFA9EC';cx.fillText('FLOAT SPD: '+arc.toFixed(2)+'×',pr.px+8,pr.py+18);
          const t=Math.max(0,Math.min(1,(arc-0.6)/1.0));
          cx.fillStyle='#2a2a3a';cx.fillRect(pr.sx,pr.sy,pr.sw,8);cx.fillStyle='#7F77DD';cx.fillRect(pr.sx,pr.sy,t*pr.sw,8);
          cx.save();cx.shadowBlur=6;cx.shadowColor='#AFA9EC';cx.fillStyle='#AFA9EC';cx.fillRect(pr.sx+t*pr.sw-3,pr.sy-2,6,12);cx.restore();
          cx.fillStyle='#AFA9EC';cx.textBaseline='middle';cx.fillText('BIG VOLLEY',pr.tx,pr.ty+pr.th/2);
          const bw=30,bxp=pr.tx+pr.tw-bw;
          cx.fillStyle=shock?'#3B6D11':'#3a1010';cx.fillRect(bxp,pr.ty,bw,pr.th);
          cx.strokeStyle=shock?'#63c916':'#A32D2D';cx.lineWidth=1;cx.strokeRect(bxp+.5,pr.ty+.5,bw-1,pr.th-1);
          cx.fillStyle=shock?'#63c916':'#E24B4A';cx.font='8px monospace';cx.textAlign='center';cx.fillText(shock?'ON':'OFF',bxp+bw/2,pr.ty+pr.th/2);
        } else if(bt===58){
          const sn=bo.spawnN!=null?bo.spawnN:HIVE_DEFAULT_SPAWN;
          cx.fillText('🐝 THE HIVE',pr.px+8,pr.py+6);
          cx.fillStyle='#AFA9EC';cx.fillText('DRONES / WAVE: '+sn,pr.px+8,pr.py+18);
          const t=Math.max(0,Math.min(1,(sn-1)/3));
          cx.fillStyle='#2a2a3a';cx.fillRect(pr.sx,pr.sy,pr.sw,8);cx.fillStyle=accent;cx.fillRect(pr.sx,pr.sy,t*pr.sw,8);
          cx.save();cx.shadowBlur=6;cx.shadowColor=accentLt;cx.fillStyle=accentLt;cx.fillRect(pr.sx+t*pr.sw-3,pr.sy-2,6,12);cx.restore();
          cx.fillStyle='#555';cx.font='7px monospace';cx.textBaseline='top';cx.fillText('+1 when enraged (≤5hp)',pr.px+8,pr.py+46);
        } else if(bt===59){
          const sw=bo.sweepSpd!=null?bo.sweepSpd:WARDEN_DEFAULT_SWEEP;
          cx.fillText('⚔ WARDEN',pr.px+8,pr.py+6);
          cx.fillStyle='#AFA9EC';cx.fillText('SWEEP SPEED: '+sw.toFixed(3),pr.px+8,pr.py+18);
          const t=Math.max(0,Math.min(1,(sw-0.02)/0.05));
          cx.fillStyle='#2a2a3a';cx.fillRect(pr.sx,pr.sy,pr.sw,8);cx.fillStyle=accent;cx.fillRect(pr.sx,pr.sy,t*pr.sw,8);
          cx.save();cx.shadowBlur=6;cx.shadowColor=accentLt;cx.fillStyle=accentLt;cx.fillRect(pr.sx+t*pr.sw-3,pr.sy-2,6,12);cx.restore();
          cx.fillStyle='#555';cx.font='7px monospace';cx.textBaseline='top';cx.fillText('×1.5 + double-dash when enraged',pr.px+8,pr.py+46);
        }
        cx.restore();
      } else selBoss=null;
    }
  }

  if(_ez!==1){W=_rw;H=_rh;cx.setTransform(DPR,0,0,DPR,0,0);
    cx.save();cx.fillStyle='rgba(175,169,236,0.85)';cx.font='11px monospace';cx.textAlign='right';cx.textBaseline='top';cx.fillText('\u00d7'+editZoom.toFixed(1),W-10,8);cx.restore();}
}

function drawParallax(){
  cx.save();
  const TH=levelTheme||0;
  const GB=Math.round(H*0.10); // baseline lifted ~10% off the bottom
  const baseY=H-GB;
  const pw=2800;
  function sky(stops){var g=cx.createLinearGradient(0,0,0,H);for(var i=0;i<stops.length;i++)g.addColorStop(stops[i][0],stops[i][1]);cx.fillStyle=g;cx.fillRect(0,0,W,H);}
  function hh(i,a,b){return ((i*a)%b);}

  if(TH===1){ // ── ICE FIELDS ──
    sky([[0,'#0a2238'],[0.5,'#16415e'],[1,'#3a7a94']]);
    // aurora wisp
    cx.save();cx.globalAlpha=0.22;cx.fillStyle='#7fe0ff';cx.beginPath();cx.moveTo(0,H*0.28);for(var x=0;x<=W;x+=20)cx.lineTo(x,H*0.28+Math.sin(x*0.03+frame*0.02)*12);cx.lineTo(W,0);cx.lineTo(0,0);cx.fill();cx.restore();
    // mountain ranges (parallax via camX)
    function range(col,top,seed,par){cx.fillStyle=col;cx.beginPath();cx.moveTo(0,H);for(var x=0;x<=W;x+=8){var wx=x+camX*par;var y=top+(Math.abs((((wx*0.7+seed)%80))-40))*0.6;cx.lineTo(x,y);}cx.lineTo(W,H);cx.fill();}
    range('rgba(40,80,110,0.7)',baseY-44,20,0.06);
    range('rgba(70,120,150,0.85)',baseY-16,120,0.13);
    // drifting snow
    for(var i=0;i<90;i++){var spd=0.25+hh(i,7,10)/14;var bx=hh(i,1313,W);var yy=(frame*spd+hh(i,977,H))%(H+10);var sway=Math.sin(frame*0.02+i*1.3)*7;var sxx=(bx+sway+W)%W;var r=0.6+hh(i,5,18)/10;cx.globalAlpha=0.4+hh(i,11,5)/10;cx.fillStyle='#eaf7ff';cx.beginPath();cx.arc(sxx,yy,r,0,Math.PI*2);cx.fill();}
    cx.globalAlpha=1;

  }else if(TH===2){ // ── LAVA ZONE ──
    sky([[0,'#1a0500'],[0.5,'#3a0d02'],[1,'#6e1a05']]);
    cx.save();cx.globalAlpha=0.4;var lg=cx.createRadialGradient(W*0.5,H,10,W*0.5,H,W*0.6);lg.addColorStop(0,'rgba(255,90,20,0.5)');lg.addColorStop(1,'rgba(255,90,20,0)');cx.fillStyle=lg;cx.fillRect(0,0,W,H);cx.restore();
    if(!window._lavaEj)window._lavaEj=[[],[]];
    var vols=[{x:W*0.3,wd:Math.max(40,W*0.13),idx:0,col:'rgba(40,8,2,0.85)',par:0.05},{x:W*0.72,wd:Math.max(54,W*0.17),idx:1,col:'rgba(60,14,4,0.92)',par:0.05}];
    for(var vi=0;vi<vols.length;vi++){var v=vols[vi];
      var vx=v.x-camX*v.par%W;vx=((vx%W)+W)%W;
      var craterY=baseY-v.wd*0.9,craterX=vx;
      cx.fillStyle=v.col;cx.beginPath();cx.moveTo(vx-v.wd,baseY);cx.lineTo(vx-v.wd*0.2,craterY);cx.lineTo(vx+v.wd*0.2,craterY);cx.lineTo(vx+v.wd,baseY);cx.fill();
      cx.save();cx.globalAlpha=0.6+Math.sin(frame*0.1+v.idx)*0.2;cx.fillStyle='#FF6a1a';cx.beginPath();cx.ellipse(craterX,craterY,v.wd*0.2,3,0,0,Math.PI*2);cx.fill();cx.restore();
      var fH=10+Math.abs(Math.sin(frame*0.06+v.idx*2))*22;
      var fg=cx.createLinearGradient(craterX,craterY,craterX,craterY-fH);fg.addColorStop(0,'rgba(255,210,80,0.95)');fg.addColorStop(1,'rgba(255,60,0,0)');cx.fillStyle=fg;cx.fillRect(craterX-3,craterY-fH,6,fH);
      if(frame%4===0&&Math.random()<0.8)window._lavaEj[v.idx].push({x:craterX,y:craterY,vx:(Math.random()-0.5)*3,vy:-(2+Math.random()*2.5),life:50});
      var ej=window._lavaEj[v.idx];for(var e=0;e<ej.length;e++){var p=ej[e];p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.life--;var al=Math.max(0,p.life/50);cx.globalAlpha=al;cx.fillStyle=p.life>30?'#FFD24D':'#FF4400';cx.fillRect(p.x,p.y,2,2);}
      window._lavaEj[v.idx]=ej.filter(function(p){return p.life>0&&p.y<H;});
      cx.globalAlpha=1;
    }
    for(var i=0;i<28;i++){var ex=(hh(i,929,W)+Math.sin(frame*0.02+i)*8),ey=(H-(frame*0.8+hh(i,613,H))%H);cx.globalAlpha=Math.max(0,1-ey/H)*0.8;cx.fillStyle=i%3===0?'#FFD24D':'#FF5522';cx.fillRect(ex,ey,2,2);}
    cx.globalAlpha=1;

  }else if(TH===3){ // ── TOXIC SWAMP ──
    sky([[0,'#06180a'],[0.55,'#0e2e15'],[1,'#1c4a22']]);
    cx.save();cx.globalAlpha=0.3;var tg=cx.createRadialGradient(W*0.6,H*0.8,5,W*0.6,H*0.8,W*0.5);tg.addColorStop(0,'rgba(120,255,120,0.4)');tg.addColorStop(1,'rgba(120,255,120,0)');cx.fillStyle=tg;cx.fillRect(0,0,W,H);cx.restore();
    function tree(x,base,hgt){cx.strokeStyle='rgba(8,24,10,0.9)';cx.lineWidth=3;cx.beginPath();cx.moveTo(x,base);cx.lineTo(x,base-hgt);cx.stroke();cx.lineWidth=1.5;cx.beginPath();cx.moveTo(x,base-hgt*0.7);cx.lineTo(x-8,base-hgt*0.9);cx.moveTo(x,base-hgt*0.5);cx.lineTo(x+9,base-hgt*0.7);cx.moveTo(x,base-hgt*0.8);cx.lineTo(x+6,base-hgt);cx.stroke();}
    for(var j=0;j<Math.ceil(W/60)+2;j++){var tx=((j*60-camX*0.18)%(W+40)+W+40)%(W+40)-20;tree(tx,baseY,34+hh(j,37,28));}
    for(var i=0;i<28;i++){var px=(hh(i,1117,W)+frame*0.3)%W,py=(hh(i,733,H*0.8)+Math.sin(frame*0.03+i)*10);cx.globalAlpha=0.4+Math.sin(frame*0.04+i)*0.3;cx.fillStyle='#9dff6a';cx.beginPath();cx.arc(px,py,1.2,0,Math.PI*2);cx.fill();}
    cx.globalAlpha=1;

  }else if(TH===4){ // ── THE VOID ──
    sky([[0,'#0c0014'],[0.5,'#1a0426'],[1,'#2a0838']]);
    cx.save();cx.globalAlpha=0.25;var vg=cx.createRadialGradient(W*0.4,H*0.4,5,W*0.4,H*0.4,W*0.5);vg.addColorStop(0,'rgba(238,34,238,0.5)');vg.addColorStop(1,'rgba(238,34,238,0)');cx.fillStyle=vg;cx.fillRect(0,0,W,H);cx.restore();
    for(var i=0;i<46;i++){var sx5=((i*1618.03)%pw-camX*0.03%pw+pw*2)%pw;if(sx5>W)continue;var sy5=hh(i,271,H*0.85);cx.globalAlpha=0.3+Math.sin(frame*0.05+i*0.7)*0.3;cx.fillStyle=i%5===0?'#00FFEE':'#FF66FF';cx.fillRect(sx5,sy5,1,1);}
    cx.globalAlpha=1;
    for(var j=0;j<9;j++){var x=((j*55-camX*0.12)%(W+40)+W+40)%(W+40)-20,y=26+hh(j,83,70),s=6+hh(j,13,10),rot=frame*0.01+j;cx.save();cx.translate(x,y+Math.sin(frame*0.02+j)*6);cx.rotate(rot);cx.globalAlpha=0.55;cx.fillStyle='rgba(238,34,238,0.5)';cx.strokeStyle='#FF66FF';cx.lineWidth=1;cx.beginPath();cx.moveTo(0,-s);cx.lineTo(s,0);cx.lineTo(0,s);cx.lineTo(-s,0);cx.closePath();cx.fill();cx.stroke();cx.restore();}
    cx.globalAlpha=1;

  }else if(TH===5){ // ── SOLAR ──
    sky([[0,'#3a1500'],[0.45,'#7a2e00'],[0.8,'#c25a08'],[1,'#e88a1a']]);
    cx.save();var sux=W*0.5,suy=H*0.5;var sg2=cx.createRadialGradient(sux,suy,4,sux,suy,Math.max(46,W*0.16));sg2.addColorStop(0,'#FFEFA0');sg2.addColorStop(0.5,'#FFB733');sg2.addColorStop(1,'rgba(255,150,30,0)');cx.fillStyle=sg2;cx.beginPath();cx.arc(sux,suy,Math.max(46,W*0.16),0,Math.PI*2);cx.fill();cx.fillStyle='#FFE08A';cx.beginPath();cx.arc(sux,suy,Math.max(16,W*0.05),0,Math.PI*2);cx.fill();cx.restore();
    function dune(col,top,amp,seed,par){cx.fillStyle=col;cx.beginPath();cx.moveTo(0,H);for(var x=0;x<=W;x+=10){var wx=x+camX*par;cx.lineTo(x,top+Math.sin((wx+seed)*0.02)*amp);}cx.lineTo(W,H);cx.fill();}
    dune('rgba(120,50,6,0.8)',baseY-20,10,40,0.06);
    dune('rgba(80,32,4,0.92)',baseY,8,160,0.13);
    for(var i=0;i<22;i++){var dx=(hh(i,1313,W)+frame*0.5)%W,dy=baseY-12+Math.sin(frame*0.05+i)*6;cx.globalAlpha=0.25;cx.fillStyle='#FFD27A';cx.fillRect(dx,dy,1.5,1.5);}
    cx.globalAlpha=1;

  }else if(TH===6){ // ── DEEPSEA ──
    sky([[0,'#021a26'],[0.5,'#04303f'],[1,'#065666']]);
    cx.save();cx.globalAlpha=0.12;cx.fillStyle='#9fe8ff';for(var i=0;i<Math.ceil(W/70)+1;i++){var x=40+i*70+Math.sin(frame*0.01+i)*8;cx.beginPath();cx.moveTo(x,0);cx.lineTo(x+26,0);cx.lineTo(x-10,H);cx.lineTo(x-40,H);cx.closePath();cx.fill();}cx.restore();
    function kelp(x,base,hgt){cx.strokeStyle='rgba(4,40,40,0.85)';cx.lineWidth=4;cx.beginPath();cx.moveTo(x,base);for(var y=0;y<hgt;y+=8){cx.lineTo(x+Math.sin((base-y)*0.06+frame*0.04)*6,base-y);}cx.stroke();}
    for(var j=0;j<Math.ceil(W/58)+2;j++){var kx=((j*58-camX*0.15)%(W+30)+W+30)%(W+30)-15;kelp(kx,baseY,40+hh(j,53,34));}
    for(var i=0;i<24;i++){var bx2=hh(i,929,W)+Math.sin(frame*0.03+i)*4,by=(H-(frame*0.6+hh(i,613,H))%H);cx.globalAlpha=0.5;cx.strokeStyle='#bfeeff';cx.lineWidth=1;cx.beginPath();cx.arc(bx2,by,1+hh(i,5,2),0,Math.PI*2);cx.stroke();}
    cx.globalAlpha=1;

  }else{ // ── NEON CITY (default, theme 0) ──
    sky([[0,'#0a0420'],[0.55,'#140a2e'],[1,'#1d1140']]);
    for(var i=0;i<70;i++){var sx5=((i*1618.03)%pw-camX*0.03%pw+pw*2)%pw;if(sx5>W)continue;var sy5=hh(i,2718,H*0.55);cx.globalAlpha=(0.04+((i*0.13)%0.2))*(0.6+Math.sin(frame*0.018+i)*0.4);cx.fillStyle='#AFA9EC';cx.beginPath();cx.arc(sx5,sy5,0.25+((i*0.21)%0.9),0,Math.PI*2);cx.fill();}
    cx.globalAlpha=1;
    // far city (taller) 0.07x
    for(var j=0;j<26;j++){var bx5=((j*185+20-camX*0.07+pw*2)%3700+3700)%3700;if(bx5>W+30)continue;var bh5=80+((j*83)%120),bw5=8+((j*19)%18);cx.fillStyle='rgba(10,6,26,0.8)';cx.fillRect(bx5,baseY-bh5,bw5,bh5+GB);if(j%4===0)cx.fillRect(bx5+Math.floor(bw5/2)-1,baseY-bh5-14,2,14);if(j%4===0&&(frame+j*17)%90<8){cx.fillStyle='rgba(255,60,60,0.65)';cx.beginPath();cx.arc(bx5+Math.floor(bw5/2),baseY-bh5-14,1.5,0,Math.PI*2);cx.fill();}}
    // mid city (taller) 0.17x
    for(var k=0;k<14;k++){var bx6=((k*285+60-camX*0.17+pw*2)%3420+3420)%3420;if(bx6>W+55)continue;var bh6=58+((k*61)%90),bw6=22+((k*41)%48);cx.fillStyle='rgba(20,12,44,0.92)';cx.fillRect(bx6,baseY-bh6,bw6,bh6+GB);cx.fillStyle='rgba(127,119,221,0.06)';cx.fillRect(bx6,baseY-bh6,bw6,2);var wR=Math.floor((bh6-8)/13),wC=Math.floor((bw6-6)/9);for(var wr=0;wr<wR;wr++)for(var wc2=0;wc2<wC;wc2++){if((frame+k*11+wr*7+wc2*3)%180<30)continue;cx.fillStyle=(k+wr+wc2)%3===0?'rgba(175,169,236,0.5)':'rgba(239,159,39,0.35)';cx.fillRect(bx6+4+wc2*9,baseY-bh6+4+wr*13,6,7);}}
    cx.globalAlpha=1;
  }

  // ground fog (all themes)
  var fgc={0:'rgba(22,16,50,0.28)',1:'rgba(120,160,190,0.20)',2:'rgba(80,20,4,0.30)',3:'rgba(20,50,24,0.28)',4:'rgba(40,8,50,0.28)',5:'rgba(90,40,6,0.26)',6:'rgba(6,40,52,0.30)'}[TH]||'rgba(22,16,50,0.28)';
  var fg=cx.createLinearGradient(0,H-24,0,H);fg.addColorStop(0,'rgba(0,0,0,0)');fg.addColorStop(1,fgc);cx.fillStyle=fg;cx.fillRect(0,H-24,W,24);
  cx.restore();
}
