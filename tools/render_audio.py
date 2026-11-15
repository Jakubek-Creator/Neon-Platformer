"""Renders the game's built-in synth sounds and theme music to audio/*.wav.
Run:  python tools/render_audio.py            (all files)
      python tools/render_audio.py --missing  (only files that don't exist yet)
Needs:  pip install playwright && playwright install chromium"""
import asyncio, base64, os, sys
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS=r"""async(job)=>{
  const SR=job.sr;
  const wav=(buf)=>{const d=buf.getChannelData(0),n=d.length,b=new ArrayBuffer(44+n*2),v=new DataView(b);
    const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
    w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
    v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
    for(let i=0;i<n;i++){const s=Math.max(-1,Math.min(1,d[i]));v.setInt16(44+i*2,s<0?s*0x8000:s*0x7FFF,true);}
    let bin='';const u=new Uint8Array(b);for(let i=0;i<u.length;i+=0x8000)bin+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(bin);};
  const setup=(secs)=>{const c=new OfflineAudioContext(1,Math.ceil(SR*secs),SR);
    AU=c;AU_master=c.createGain();AU_master.connect(c.destination);AU_sfx=AU_master;AU_music=AU_master;
    const len=SR*0.5,nb=c.createBuffer(1,len,SR),d=nb.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;AU_noise=nb;
    deathAudioCtx=null;winAudioCtx=null;return c;};
  // synth helpers bail out unless the context is 'running'; offline contexts aren't
  eval('window.sfx='+sfx.toString().replace("a.state!=='running'","false"));
  eval('window.sfxNoise='+sfxNoise.toString().replace("a.state!=='running'","false"));
  if(job.kind==='sfx'){
    const c=setup(job.secs);
    const m={death:()=>deathBlastSound(),win_tick:()=>winTickSound(),win_fanfare:()=>winFanfareSound(),menu_hover:()=>playTone(700,700,0.07,0.025),menu_click:()=>playTone(880,440,0.12,0.045)};
    if(m[job.name])m[job.name]();else if(job.name.startsWith('shoot_'))SFX_SYNTH.shoot(job.name.slice(6));else SFX_SYNTH[job.name]();
    const buf=await c.startRendering();
    // trim trailing silence
    const d=buf.getChannelData(0);let end=d.length;while(end>1&&Math.abs(d[end-1])<0.0005)end--;
    const out=new AudioBuffer({length:Math.max(1,end+Math.floor(SR*0.01)),sampleRate:SR,numberOfChannels:1});out.copyToChannel(d.subarray(0,out.length),0);
    return wav(out);
  }
  // music: one 32-step period of the theme's loop (with lead), tails folded back so it loops seamlessly
  _mbuild(job.theme);const spb=60/_mpat.tempo/4,period=32*spb,tail=2;
  const c=setup(period+tail);
  for(let i=0;i<32;i++){const step=32+i,t=i*spb,s=step%32,bar=Math.floor(step/8)%4,root=_mpat.root+_mpat.prog[bar];
    if(s%4===0)_mkick(t);if(s%2===1)_mhat(t,0.05);if(s%2===0)_mnote('triangle',_mf(root+(s%8===4?12:0)),t,spb*1.8,0.22);
    const ln=_mpat.lead[s];if(ln!=null)_mnote('square',_mf(_mpat.root+24+ln),t,spb*0.9,0.045);
    if(s%8===0)_mnote('sine',_mf(root+12+_mpat.sc[2]),t,spb*7,0.05);}
  const buf=await c.startRendering(),d=buf.getChannelData(0),n=Math.round(period*SR);
  const out=new AudioBuffer({length:n,sampleRate:SR,numberOfChannels:1}),o=out.getChannelData(0);
  for(let i=0;i<d.length;i++)o[i%n]+=d[i];
  return wav(out);
}"""
async def main():
    only_missing='--missing' in sys.argv
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page()
        await pg.goto('file://'+os.path.join(ROOT,'index.html')); await pg.wait_for_timeout(500)
        names=await pg.evaluate('()=>[SOUND_NAMES,MUSIC_NAMES]')
        jobs=[dict(kind='sfx',name=n,sr=44100,secs=2.5) for n in names[0]]+[dict(kind='music',name=n,theme=i,sr=32000) for i,n in enumerate(names[1])]
        for j in jobs:
            path=os.path.join(ROOT,'audio',j['kind'],j['name']+'.wav')
            if only_missing and os.path.exists(path): continue
            os.makedirs(os.path.dirname(path),exist_ok=True)
            data=base64.b64decode(await pg.evaluate(JS,j))
            open(path,'wb').write(data); print(f"{j['kind']}/{j['name']}.wav  {len(data)//1024} KB")
        await b.close()
asyncio.run(main())
