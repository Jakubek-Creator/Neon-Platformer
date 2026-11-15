// Neon Platformer — Sound files: plays audio/sfx/*.wav and audio/music/*.wav.
// Every sound has a built-in synth fallback, so a missing or broken file never
// silences the game. Replace any .wav (same name) to change that sound.
//
//   audio/sfx/<name>.wav     names listed in SOUND_NAMES below
//   audio/music/<theme>.wav  neon, ice, lava, toxic, void, solar, deepsea (seamless loops)
//
// Served online, files are decoded into Web Audio buffers (gapless, low latency).
// Opened straight from disk, browsers block that, so plain <audio> elements are used.
var SOUND_NAMES=['jump','bounce','land','coin','hurt','heal','hit','kill','power','check','door','stomp','life','boom',
  'shoot_blaster','shoot_shotgun','shoot_laser','shoot_sword','shoot_grenade','shoot_freeze','shoot_plasma',
  'death','win_tick','win_fanfare','menu_hover','menu_click'];
var MUSIC_NAMES=['neon','ice','lava','toxic','void','solar','deepsea'];
var SF={buf:{},el:{},state:{},started:false};
function _sfUrl(kind,name){
  var emb=window.NEON_AUDIO&&window.NEON_AUDIO[kind+'/'+name];  // single-file build embeds data URIs
  return emb||('audio/'+kind+'/'+name+'.wav');
}
function _sfLoad(kind,name){
  var key=kind+'/'+name,url=_sfUrl(kind,name);
  SF.state[key]='loading';
  var viaElement=function(){
    if(!/^https?:|^data:/.test(url)&&location.protocol!=='file:'){SF.state[key]='missing';return;}
    try{
      var a=new Audio();a.preload='auto';
      a.addEventListener('canplaythrough',function(){if(SF.state[key]!=='buffer'){SF.el[key]=a;SF.state[key]='element';}},{once:true});
      a.addEventListener('error',function(){if(SF.state[key]==='loading')SF.state[key]='missing';},{once:true});
      a.src=url;a.load();
    }catch(e){SF.state[key]='missing';}
  };
  var ac=AU_ctx();
  if(!ac||!window.fetch||(location.protocol==="file:"&&!/^data:/.test(url))){viaElement();return;} // browsers block fetch() from disk
  fetch(url).then(function(r){if(!r.ok)throw 0;return r.arrayBuffer();})
    .then(function(ab){return new Promise(function(res,rej){var r=ac.decodeAudioData(ab,res,rej);if(r&&r.catch)r.catch(function(){});});})
    .then(function(b){SF.buf[key]=b;SF.state[key]='buffer';})
    .catch(viaElement);
}
function soundFilesStart(){
  if(SF.started)return;SF.started=true;
  SOUND_NAMES.forEach(function(n){_sfLoad('sfx',n);});
  MUSIC_NAMES.forEach(function(n){_sfLoad('music',n);});
}
// Plays a sound file if one loaded; returns false so the caller falls back to synth.
function playSoundFile(name,vol){
  var key='sfx/'+name,ac=AU;
  if(SF.state[key]==='buffer'&&ac&&ac.state==='running'){
    try{var s=ac.createBufferSource(),g=ac.createGain();s.buffer=SF.buf[key];g.gain.value=vol==null?1:vol;s.connect(g);g.connect(AU_sfx);s.start();return true;}catch(e){return false;}
  }
  if(SF.state[key]==='element'){
    try{var a=SF.el[key].cloneNode();a.volume=Math.max(0,Math.min(1,MS.masterVol*MS.sfxVol*(vol==null?1:vol)));var p=a.play();if(p&&p.catch)p.catch(function(){});return true;}catch(e){return false;}
  }
  return false;
}

// ── route every game sound through the files first ──
var SFX_SYNTH=SFX;
SFX={};
Object.keys(SFX_SYNTH).forEach(function(k){
  SFX[k]=function(arg){
    var name=k==='shoot'?'shoot_'+(WDEFS[arg]?arg:'blaster'):k;
    if(!playSoundFile(name))SFX_SYNTH[k](arg);
  };
});
(function(){
  var wrap=function(name,fn){return function(){if(!playSoundFile(name))return fn.apply(this,arguments);};};
  deathBlastSound=wrap('death',deathBlastSound);
  winTickSound=wrap('win_tick',winTickSound);
  winFanfareSound=wrap('win_fanfare',winFanfareSound);
  mhov=wrap('menu_hover',mhov);
  mcl=wrap('menu_click',mcl);
})();

// ── music: theme file if available, otherwise the procedural tracks ──
var MF={theme:-1,src:null,el:null};
function _mfStop(){
  if(MF.src){try{MF.src.stop();}catch(e){}MF.src=null;}
  if(MF.el){try{MF.el.pause();}catch(e){}MF.el=null;}
  MF.theme=-1;
}
var _synthMusicPlay=musicPlay,_synthMusicStop=musicStop;
musicPlay=function(th){
  var key='music/'+(MUSIC_NAMES[th]||MUSIC_NAMES[0]),st=SF.state[key];
  if(st==='buffer'||st==='element'){
    if(MF.theme===th)return;
    _synthMusicStop();_mfStop();MF.theme=th;
    if(st==='buffer'){
      try{var s=AU.createBufferSource();s.buffer=SF.buf[key];s.loop=true;s.connect(AU_music);s.start();MF.src=s;}catch(e){}
    }else{
      var a=SF.el[key];a.loop=true;a.currentTime=0;MF.el=a;var p=a.play();if(p&&p.catch)p.catch(function(){});
    }
    return;
  }
  if(st==='loading')return;            // wait for the file before choosing
  if(MF.theme>=0)_mfStop();
  _synthMusicPlay(th);
};
musicStop=function(){_mfStop();_synthMusicStop();};
// <audio> elements don't go through the Web Audio buses, so set their volume directly.
var _mfApply=AU_applyVolumes;
AU_applyVolumes=function(){
  _mfApply();
  if(MF.el){var duck=(typeof paused!=='undefined'&&paused)?0.35:1;MF.el.volume=Math.max(0,Math.min(1,MS.masterVol*MS.musicVol*0.55*duck));}
};
// start loading on the first tap/click/key, when audio is allowed to start
['touchstart','pointerdown','keydown'].forEach(function(ev){window.addEventListener(ev,function(){AU_ctx();soundFilesStart();},{passive:true});});
musicSync=function(){
  var want=(typeof mOn!=='undefined'&&mOn)?0:(mode==='play'&&!won?levelTheme:-1);
  if(want<0){if(MU.on||MF.theme>=0)musicStop();}else musicPlay(want);
  AU_applyVolumes();
};
