// Neon Platformer — On-screen touch buttons (multitouch)
// ====== TOUCH CONTROLS ======
// true multitouch: every finger is tracked on its own, buttons are hit-tested
// with a forgiving margin, and a finger can slide from one button to another
// (e.g. ← to →) without lifting. Run + jump + fire all work at the same time.
var _tBtns=[['tb-left','left'],['tb-right','right'],['tb-down','down'],['tb-jump','jump'],['tb-fire','fire'],['tb-cycle','cycle'],['tb-hook','hook']];
var _tTouches={};   // touch identifier -> key name (or null when between buttons)
var _tHook={};      // hook button: tap = throw, hold+drag = aim, release = throw that way
var _tFire={};      // fire button doubles as an aim stick: touch id -> start point
function _tHit(x,y){
  var best=null,bestD=1e9,M=14;
  for(var i=0;i<_tBtns.length;i++){
    var el=document.getElementById(_tBtns[i][0]);if(!el||!el.offsetParent)continue;
    var r=el.getBoundingClientRect();
    if(x<r.left-M||x>r.right+M||y<r.top-M||y>r.bottom+M)continue;
    var dx=x-(r.left+r.width/2),dy=y-(r.top+r.height/2),d=dx*dx+dy*dy;
    if(d<bestD){bestD=d;best=_tBtns[i][1];}
  }
  return best;
}
function _tSync(){
  var fa=null;for(var fid in _tFire)if(_tFire[fid].aim)fa=_tFire[fid].aim;touchKeys.aimV2=fa;
  var on={};for(var id in _tTouches){if(_tTouches[id])on[_tTouches[id]]=true;}
  _tBtns.forEach(function(b){
    var k=b[1],was=touchKeys[k];touchKeys[k]=!!on[k]||!!(typeof TPAD!=='undefined'&&TPAD.on&&TPAD.keys[k]);
    var el=document.getElementById(b[0]);if(el)el.classList.toggle('th',!!on[k]);
    if(!was&&on[k]&&k==='jump'&&MS.haptics&&navigator.vibrate){try{navigator.vibrate(8);}catch(e){}}
  });
  var hh=false,hr=0;for(var hid in _tHook){hh=true;hr=_tHook[hid].reel;}touchKeys.hook=hh;touchKeys.reel=hr;   // hook button held = swing, drag up/down = reel
  var he=document.getElementById('tb-hook');if(he)he.classList.toggle('th',hh);
}
function releaseTouches(){_tTouches={};_tFire={};_tHook={};touchKeys.hookAim=null;if(typeof TPAD!=='undefined'){TPAD.ptr={};_tpApply();}_tSync();}
function setupTouch(){
  var tc=document.getElementById('touchCtrl');
  function onT(e){
    e.preventDefault();
    for(var i=0;i<e.changedTouches.length;i++){
      var t=e.changedTouches[i];
      var id=t.identifier;
      var HK=_tHook[id];
      if(HK){
        if(e.type==='touchend'||e.type==='touchcancel'){delete _tHook[id];delete _tTouches[id];}
        else{var hy=t.clientY-HK.y;HK.reel=Math.abs(hy)<10?0:Math.max(-1,Math.min(1,(hy-Math.sign(hy)*10)/30));}
        continue;
      }
      if(e.type==='touchstart'&&_tHit(t.clientX,t.clientY)==='hook'){_tHook[id]={x:t.clientX,y:t.clientY,reel:0};_tTouches[id]=null;continue;}
      if(e.type==='touchend'||e.type==='touchcancel'){delete _tTouches[id];delete _tFire[id];}
      else{
        var F=_tFire[id];
        if(F){ // finger that started on fire: drag it to aim, it keeps firing / stays "fire"
          var dx=t.clientX-F.x,dy=t.clientY-F.y,L=Math.sqrt(dx*dx+dy*dy);
          if(L>16){dx/=L;dy/=L;if(dy>0.35){dy=0.35;var n=Math.sqrt(dx*dx+dy*dy);dx/=n;dy/=n;}F.aim={x:dx,y:dy};}
          _tTouches[id]='fire';
        }else{
          _tTouches[id]=_tHit(t.clientX,t.clientY);
          if(e.type==='touchstart'&&_tTouches[id]==='fire')_tFire[id]={x:t.clientX,y:t.clientY,aim:null};
        }
      }
    }
    _tSync();
  }
  ['touchstart','touchmove','touchend','touchcancel'].forEach(function(ev){tc.addEventListener(ev,onT,{passive:false});});
  // never leave a button stuck down when the app loses focus or a dialog opens
  window.addEventListener('blur',releaseTouches);
  document.addEventListener('visibilitychange',function(){if(document.hidden)releaseTouches();});
  if('ontouchstart' in window||navigator.maxTouchPoints>0){
    document.getElementById('touchCtrl').classList.add('show');
  }
  if(typeof tpadSetup==='function')tpadSetup();
}

function initMenu(){
  document.getElementById('wrap').style.display = 'none';
  mBg.width=window.innerWidth; mBg.height=window.innerHeight;
  initPts(); goMS('intro');
  if('ontouchstart' in window||navigator.maxTouchPoints>0){
    var pk=document.querySelector('.pkey');if(pk)pk.innerHTML='&#8212; TAP TO START &#8212;';
  }
  var p=lastProf();
  var b=document.getElementById('miCont');
  if(b) b.className = 'mi c-cont' + (p ? '' : ' off');
  mRafId = requestAnimationFrame(mLoop);
}
