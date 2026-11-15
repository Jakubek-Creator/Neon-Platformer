# Neon Platformer V5.5

## Play
- **On this computer:** double-click `index.html`.
- **Send to someone:** run the build (below) and send `build/NeonPlatformer.html`. It's the whole game in one file.
- **Online:** upload the folder to GitHub Pages or itch.io (see the end of this file).

## What's in the folder
```
NeonPlatformer/
├── index.html            the game page (start here)
├── manifest.webmanifest  lets phones install it as an app
├── sw.js                 offline support (updated by the build)
├── css/game.css          all the styling
├── js/                   the code, one file per job
│   ├── core/       storage, game state and constants, the game loop
│   ├── game/       levels, campaign, player physics, enemies, weapons, game update
│   ├── render/     everything that draws to the screen
│   ├── input/      keyboard/mouse, touch buttons, gamepad
│   ├── audio/      sound engine + sound file loading
│   ├── editor/     level library, import/export, campaign builder
│   ├── ui/         HUD and main menu
│   └── main.js     starts the game
├── levels/
│   ├── campaign.json     the campaign: level files in play order
│   ├── 01-....json       one file per level
│   └── campaign.js       made by the build, don't edit
├── audio/
│   ├── sfx/        sound effects (jump.wav, coin.wav, shoot_laser.wav ...)
│   └── music/      one looping track per theme (neon.wav, lava.wav ...)
├── textures/
│   └── icons/      app icons
├── tools/          helper scripts (Python)
└── build/          output of the build (not part of the source)
```

## Levels
Make levels in the editor (main menu → LEVEL EDITOR), then export them:
- one level: **⬇ Save As…**
- a whole campaign: **🏆 Campaign → ⬇ Export Campaign**

Add them to the game:
```
python tools/add_levels.py my_campaign.json            add a campaign export
python tools/add_levels.py level1.json level2.json     add single levels in this order
python tools/add_levels.py --replace my_campaign.json  replace the whole campaign
python tools/build.py
```
To reorder or remove levels, edit the list in `levels/campaign.json`, then run the build.

Levels saved to slots in your own browser (📌 Slot / ▶ Push to Slots) still override the campaign there. That's handy for testing, but other players only get what's in `levels/`.

## Sounds and music
Every sound is a normal `.wav` file. To change one, replace the file and keep the same name, e.g. put your own `audio/sfx/jump.wav` in place. Music tracks loop, so make them loop cleanly. `.wav` is the safe choice; other formats only work if the file is still named `.wav` and the browser can play it.

If a file is missing or broken, the game uses its built-in synth sound instead, so nothing ever goes silent. To get the original sounds back, delete your file and run:
```
python tools/render_audio.py --missing
```

## Art
The tiles, player, enemies and effects are drawn by code (`js/render/draw.js`), not image files. That's why `textures/` only holds the app icons for now.

## Build
```
python tools/build.py
```
This updates `levels/campaign.js` and `sw.js`, then creates:
- `build/NeonPlatformer.html`: the single-file game
- `build/NeonPlatformer-web.zip`: the folder, ready to upload

You only need Python 3. `render_audio.py` also needs `pip install playwright` and `playwright install chromium`.

## Putting it online
**GitHub Pages:** push the folder to a repo → Settings → Pages → deploy from `main` / root. Online, the game reads `levels/` and `audio/` directly, so a new level or sound only needs uploading (plus the build for the offline copy).

**itch.io:** new project → Kind: HTML → upload `build/NeonPlatformer-web.zip` → tick "played in the browser", viewport 960×540, enable fullscreen and mobile-friendly (landscape).
