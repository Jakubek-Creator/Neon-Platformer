// Neon Platformer — Audio engine: sound files with synth fallback, music
// ====== AUDIO ENGINE ======
// One shared AudioContext with master → sfx / music buses, so the settings
// sliders actually work. Gameplay sounds are driven by watching game state
// once per tick (audioWatch), which keeps the physics/enemy code untouched.
var AU=null,AU_master=null,AU_sfx=null,AU_music=null,AU_noise=null;
function AU_ctx(){
  if(AU)return AU;
  try{
    AU=new(window.AudioContext||window.webkitAudioContext)();
    AU_master=AU.createGain();AU_master.connect(AU.destination);
    AU_sfx=AU.createGain();AU_sfx.connect(AU_master);
    AU_music=AU.createGain();AU_music.connect(AU_master);
    var len=AU.sampleRate*0.5,buf=AU.createBuffer(1,len,AU.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
    AU_noise=buf;
    AU_applyVolumes();
  }catch(e){AU=null;}
  return AU;
}
function _sfxBus(){AU_ctx();return AU_sfx||(AU&&AU.destination);}
function AU_applyVolumes(){
  if(!AU)return;
  var t=AU.currentTime;
  AU_master.gain.setTargetAtTime(MS.masterVol,t,0.02);
  AU_sfx.gain.setTargetAtTime(MS.sfxVol,t,0.02);
  var duck=(typeof paused!=='undefined'&&paused)?0.35:1;
  AU_music.gain.setTargetAtTime(MS.musicVol*0.55*duck,t,0.08);
}
function AU_unlock(){var a=AU_ctx();if(a&&a.state==='suspended')a.resume();}
['touchstart','pointerdown','keydown'].forEach(function(ev){window.addEventListener(ev,AU_unlock,{passive:true});});
document.addEventListener('visibilitychange',function(){if(!AU)return;if(document.hidden)AU.suspend();else AU.resume();});

// Small synth voice: oscillator with pitch sweep and a quick envelope.
function sfx(type,f1,f2,dur,vol,delay){
  var a=AU_ctx();if(!a||a.state!=='running')return;
  try{
    var t=a.currentTime+(delay||0),o=a.createOscillator(),g=a.createGain();
    o.type=type;o.frequency.setValueAtTime(f1,t);
    if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g);g.connect(AU_sfx);o.start(t);o.stop(t+dur+0.02);
  }catch(e){}
}
function sfxNoise(dur,vol,hp,delay){
  var a=AU_ctx();if(!a||a.state!=='running'||!AU_noise)return;
  try{
    var t=a.currentTime+(delay||0),s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();
    s.buffer=AU_noise;f.type='highpass';f.frequency.value=hp||800;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(AU_sfx);s.start(t);s.stop(t+dur+0.02);
  }catch(e){}
}
var SFX={
  jump:   function(){sfx('square',330,660,0.11,0.07);},
  bounce: function(){sfx('square',260,1040,0.22,0.08);},
  land:   function(){sfxNoise(0.05,0.05,1500);},
  coin:   function(){sfx('square',988,null,0.06,0.06);sfx('square',1319,null,0.12,0.06,0.06);},
  hurt:   function(){sfx('sawtooth',300,90,0.25,0.12);sfxNoise(0.15,0.08,400);},
  heal:   function(){sfx('triangle',523,null,0.1,0.1);sfx('triangle',784,null,0.15,0.1,0.08);},
  hit:    function(){sfx('square',180,120,0.05,0.05);},
  kill:   function(){sfxNoise(0.18,0.12,300);sfx('square',220,55,0.2,0.08);},
  power:  function(){[523,659,784,1047].forEach(function(f,i){sfx('square',f,null,0.07,0.05,i*0.05);});},
  check:  function(){sfx('triangle',659,null,0.12,0.12);sfx('triangle',988,null,0.25,0.12,0.1);},
  door:   function(){sfx('sawtooth',110,220,0.3,0.08);},
  stomp:  function(){sfx('sawtooth',500,120,0.15,0.06);},
  life:   function(){[392,523,659,784,1047].forEach(function(f,i){sfx('square',f,null,0.09,0.06,i*0.07);});},
  shoot:  function(w){
    if(w==='shotgun'){sfxNoise(0.12,0.12,600);sfx('square',200,80,0.08,0.06);}
    else if(w==='laser'){sfx('sawtooth',1600,400,0.18,0.05);}
    else if(w==='sword'){sfxNoise(0.1,0.08,2500);}
    else if(w==='grenade'){sfx('triangle',400,200,0.12,0.08);}
    else if(w==='freeze'){sfx('sine',1800,900,0.15,0.06);}
    else if(w==='plasma'){sfx('sawtooth',300,900,0.2,0.06);}
    else sfx('square',880,440,0.07,0.045);
  },
  boom:   function(){sfxNoise(0.4,0.18,120);sfx('sine',120,40,0.4,0.15);}
};

// Watches game state each tick and plays the matching sound.
var _aw=null;
function audioWatch(){
  if(mode!=='play'){_aw=null;return;}
  var p=player,s={vy:p.vy,gr:p.grounded,score:score,hp:hp,lives:lives,en:enemies.length,
    bl:bullets.length,lb:laserBeams.length,gn:grenades.length,sw:swordSwing,ex:explosions.length,
    cp:activatedCPs.size,dr:doorState.red,db:doorState.blue,st:p._stomping,
    pu:(pups.speed>0)+(pups.shield>0)+(pups.jump>0),inv:0,won:won};
  for(var i=0;i<enemies.length;i++)if(enemies[i].inv>s.inv)s.inv=enemies[i].inv;
  var o=_aw;_aw=s;if(!o||deathSeqTimer>0)return;
  if(s.vy<-13&&o.vy>-6)SFX.bounce();else if(s.vy<-6&&o.vy>-3)SFX.jump();
  if(s.gr&&!o.gr&&o.vy>7)SFX.land();
  if(s.score>o.score)SFX.coin();
  if(s.hp<o.hp)SFX.hurt();else if(s.hp>o.hp)SFX.heal();
  if(s.lives>o.lives)SFX.life();
  if(s.en<o.en)SFX.kill();else if(s.inv>o.inv)SFX.hit();
  if(s.bl>o.bl||s.lb>o.lb||s.gn>o.gn||(s.sw>0&&o.sw===0))SFX.shoot(curW);
  if(s.ex>o.ex)SFX.boom();
  if(s.cp>o.cp)SFX.check();
  if((s.dr&&!o.dr)||(s.db&&!o.db))SFX.door();
  if(s.st&&!o.st)SFX.stomp();
  if(s.pu>o.pu)SFX.power();
}

// ── Procedural chiptune music: a 32-step loop per theme ──
// [root midi note, scale, tempo]
var MUSIC_THEMES=[
  [45,[0,3,5,7,10],118],  // NEON   – A minor pentatonic
  [50,[0,2,3,7,9],104],   // ICE    – D dorian-ish, slower
  [40,[0,1,4,5,7,8],132], // LAVA   – E phrygian dominant, driving
  [43,[0,3,5,6,7,10],112],// TOXIC  – G blues
  [42,[0,2,3,6,7],96],    // VOID   – F# hungarian-ish
  [48,[0,2,4,7,9],124],   // SOLAR  – C major pentatonic
  [46,[0,3,5,7,10],100]   // DEEPSEA
];
var MU={on:false,theme:-1,step:0,next:0,timer:null,seed:1};
function _mrand(){MU.seed=(MU.seed*16807)%2147483647;return MU.seed/2147483647;}
function _mf(n){return 440*Math.pow(2,(n-69)/12);}
function _mnote(type,f,t,dur,vol){
  var o=AU.createOscillator(),g=AU.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(AU_music);o.start(t);o.stop(t+dur+0.02);
}
function _mhat(t,vol){
  var s=AU.createBufferSource(),f=AU.createBiquadFilter(),g=AU.createGain();
  s.buffer=AU_noise;f.type='highpass';f.frequency.value=7000;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.04);
  s.connect(f);f.connect(g);g.connect(AU_music);s.start(t);s.stop(t+0.06);
}
function _mkick(t){
  var o=AU.createOscillator(),g=AU.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+0.12);
  g.gain.setValueAtTime(0.35,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.15);o.connect(g);g.connect(AU_music);o.start(t);o.stop(t+0.17);
}
var _mpat=null;
function _mbuild(th){
  var d=MUSIC_THEMES[th]||MUSIC_THEMES[0],sc=d[1];MU.seed=th*977+13;
  var prog=[0,0,3,4].map(function(i){return sc[i%sc.length];}),lead=[];
  for(var i=0;i<32;i++)lead.push(_mrand()<0.55?sc[Math.floor(_mrand()*sc.length)]+(_mrand()<0.3?12:0):null);
  _mpat={root:d[0],sc:sc,tempo:d[2],prog:prog,lead:lead};
}
function _mtick(){
  if(!AU||AU.state!=='running'||!_mpat)return;
  var spb=60/_mpat.tempo/4;
  while(MU.next<AU.currentTime+0.15){
    var t=Math.max(MU.next,AU.currentTime),s=MU.step%32,bar=Math.floor(MU.step/8)%4,root=_mpat.root+_mpat.prog[bar];
    if(s%4===0)_mkick(t);
    if(s%2===1)_mhat(t,0.05);
    if(s%2===0)_mnote('triangle',_mf(root+(s%8===4?12:0)),t,spb*1.8,0.22);
    var ln=_mpat.lead[s];if(ln!=null&&MU.step>=32)_mnote('square',_mf(_mpat.root+24+ln),t,spb*0.9,0.045);
    if(s%8===0)_mnote('sine',_mf(root+12+_mpat.sc[2]),t,spb*7,0.05);
    MU.next=t+spb;MU.step++;
  }
}
function musicPlay(th){
  if(!AU_ctx())return;
  if(MU.on&&MU.theme===th)return;
  MU.theme=th;MU.step=0;MU.next=AU.currentTime+0.05;_mbuild(th);MU.on=true;
  if(!MU.timer)MU.timer=setInterval(_mtick,40);
}
function musicStop(){MU.on=false;MU.theme=-1;_mpat=null;if(MU.timer){clearInterval(MU.timer);MU.timer=null;}}
// Keeps the right track playing for whatever screen is up.
function musicSync(){
  var want=(typeof mOn!=='undefined'&&mOn)?0:(mode==='play'&&!won?levelTheme:-1);
  if(want<0){if(MU.on)musicStop();}else musicPlay(want);
  AU_applyVolumes();
}
