// Neon Platformer — Difficulty values and gamepad support
// ── V5.0 difficulty: starting hearts and lives ──
function DIFF_HP(){var d=(typeof MS!=='undefined')?MS.difficulty:'normal';return d==='easy'?5:d==='hard'?2:3;}
function DIFF_LIVES(){var d=(typeof MS!=='undefined')?MS.difficulty:'normal';return d==='easy'?5:d==='hard'?2:3;}

// ── V5.0 gamepad: mapped onto the same key codes the keyboard uses ──
var _gpPrev={},_gpOff=false;
var GP_MAP=[[14,'ArrowLeft'],[15,'ArrowRight'],[13,'ArrowDown'],[12,'ArrowUp'],[0,'Space'],[2,'KeyZ'],[1,'KeyZ'],[4,'KeyQ'],[5,'KeyE'],[9,'Escape'],[3,'KeyC'],[6,'KeyC'],[7,'KeyC']];
function pollGamepad(){
  if(_gpOff||!navigator.getGamepads)return;
  // Embedded viewers (app previews, iframes) can forbid gamepad access and throw;
  // switch the gamepad off for the session instead of letting it stop the game.
  var gp=null,list;try{list=navigator.getGamepads()||[];}catch(e){_gpOff=true;return;}
  for(var i=0;i<list.length;i++)if(list[i]){gp=list[i];break;}
  if(!gp)return;
  var now={},ax=gp.axes[0]||0,ay=gp.axes[1]||0;
  GP_MAP.forEach(function(m){if(gp.buttons[m[0]]&&gp.buttons[m[0]].pressed)now[m[1]]=true;});
  if(ax<-0.45)now.ArrowLeft=true;if(ax>0.45)now.ArrowRight=true;if(ay>0.6)now.ArrowDown=true;
  ['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','KeyZ','KeyQ','KeyE','Escape'].forEach(function(c){
    if(!!now[c]!==!!_gpPrev[c])document.dispatchEvent(new KeyboardEvent(now[c]?'keydown':'keyup',{code:c,key:c==='Escape'?'Escape':c}));
  });
  _gpPrev=now;
}
