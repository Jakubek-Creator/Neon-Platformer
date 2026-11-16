// Neon Platformer — Boot: offline support and startup
// ── offline / installable (only when served over http/https) ──
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)){
  window.addEventListener('load',function(){try{navigator.serviceWorker.register('sw.js').catch(function(){});}catch(e){}});
}
// ── BOOT ──
resize();
openFolds.forEach(name=>{const fh=document.querySelector('#fld-'+name+' .fh'),fb=document.getElementById('fb-'+name);if(fh&&fb){fh.classList.add('open');fb.classList.add('open');}});
pick(0);
updateSlotBtn();
startAutoSave();
loadCampaignFolder(); // read levels/ when served online
initMenu();
