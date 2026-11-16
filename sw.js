// Neon Platformer offline cache. Bump VERSION on every release so players get the update.
const VERSION = 'neon-2.0-a9a7ae2d59';
const FILES = ["./", "audio/music/deepsea.wav", "audio/music/ice.wav", "audio/music/lava.wav", "audio/music/neon.wav", "audio/music/solar.wav", "audio/music/toxic.wav", "audio/music/void.wav", "audio/sfx/boom.wav", "audio/sfx/bounce.wav", "audio/sfx/check.wav", "audio/sfx/coin.wav", "audio/sfx/death.wav", "audio/sfx/door.wav", "audio/sfx/heal.wav", "audio/sfx/hit.wav", "audio/sfx/hurt.wav", "audio/sfx/jump.wav", "audio/sfx/kill.wav", "audio/sfx/land.wav", "audio/sfx/life.wav", "audio/sfx/menu_click.wav", "audio/sfx/menu_hover.wav", "audio/sfx/power.wav", "audio/sfx/shoot_blaster.wav", "audio/sfx/shoot_freeze.wav", "audio/sfx/shoot_grenade.wav", "audio/sfx/shoot_laser.wav", "audio/sfx/shoot_plasma.wav", "audio/sfx/shoot_shotgun.wav", "audio/sfx/shoot_sword.wav", "audio/sfx/stomp.wav", "audio/sfx/win_fanfare.wav", "audio/sfx/win_tick.wav", "css/game.css", "index.html", "js/audio/audio.js", "js/audio/sound-files.js", "js/core/loop.js", "js/core/smooth.js", "js/core/state.js", "js/core/storage.js", "js/editor/heat.js", "js/editor/medit.js", "js/editor/saves.js", "js/editor/tools.js", "js/game/campaign.js", "js/game/enemies.js", "js/game/grapple.js", "js/game/level.js", "js/game/moves.js", "js/game/physics.js", "js/game/twists.js", "js/game/update.js", "js/game/weapons.js", "js/input/gamepad.js", "js/input/input.js", "js/input/touch.js", "js/input/touchpad.js", "js/main.js", "js/render/backgrounds.js", "js/render/draw.js", "js/render/enemies.js", "js/render/feel.js", "js/render/light.js", "js/render/player.js", "js/render/skins.js", "js/render/tiles.js", "js/ui/hud.js", "js/ui/menu.js", "levels/Level_Test_Neon.json", "levels/campaign.js", "levels/campaign.json", "manifest.webmanifest", "textures/icons/icon-192.png", "textures/icons/icon-512.png"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Network first for the page (so updates arrive), cache first for everything else.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate';
  e.respondWith(isPage
    ? fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; })
        .catch(() => caches.match('./index.html'))
    : caches.match(e.request).then(hit => hit || fetch(e.request)));
});
