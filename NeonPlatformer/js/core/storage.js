// Neon Platformer — Error reporter and safe browser storage
// V4.1 mobile diagnostics: surface any load/runtime error visibly instead of a silent dead page
window.addEventListener('error',function(ev){
  try{
    var d=document.getElementById('__errbox');
    if(!d){d=document.createElement('div');d.id='__errbox';
      d.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;background:rgba(120,0,0,0.92);color:#fff;font:11px monospace;padding:8px 10px;border-radius:6px;max-height:40vh;overflow:auto;white-space:pre-wrap';
      (document.body||document.documentElement).appendChild(d);}
    d.textContent+=(ev.message||'Script error')+' @ line '+(ev.lineno||'?')+'\n';
  }catch(e){}
});
// V4.1 safe-storage shim: sandboxed mobile contexts (file viewers, in-app browsers,
// private modes) throw SecurityError on ANY localStorage access, which would kill
// the whole script. Fall back to in-memory storage so the game always runs.
var LS=(function(){
  try{
    var t=window['localStorage'];
    t.setItem('__ls_test','1');t.removeItem('__ls_test');
    return t;
  }catch(e){
    var m={};
    return{
      getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null;},
      setItem:function(k,v){m[k]=String(v);},
      removeItem:function(k){delete m[k];},
      clear:function(){m={};}
    };
  }
})();
