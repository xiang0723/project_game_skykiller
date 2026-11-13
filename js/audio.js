/* 噁男殺手：音效（Web Audio 即時合成，沒有音效檔）
   遊戲（index.html）和開發用的 _samples/sfx-test.html 共用這個檔案。
   槍聲 = 超音速彈頭的「啪」+ 槍口爆音的低頻衝擊 + 寬頻爆炸噪音 + 街道建築的回音殘響。
   消音器 / 亞音速彈會讓槍聲變悶變小。開槍後依槍機速度播放拉栓上膛聲。
   SFX_CFG 是各類音效的音量倍率，sfx-test.html 可以即時調整並匯出。 */
const SFX_CFG = { master:1, reverb:0.55, gun:1, bolt:1, tick:1, alarm:1 };
let VK = 1;   // 目前這個音效的音量倍率（各音效函式開頭設定）
let actx=null, sfxMaster=null, sfxVerb=null, sfxGain=null, sfxVerbGain=null, muted=false;
try{ muted = localStorage.getItem('nmk_mute')==='1'; }catch(e){}
function audio(){
  if(!actx){
    actx = new (window.AudioContext||window.webkitAudioContext)();
    sfxMaster = actx.createDynamicsCompressor();   // 壓住峰值，大聲時不破音
    sfxMaster.threshold.value=-10; sfxMaster.ratio.value=6;
    sfxMaster.connect(sfxGain = actx.createGain()); sfxGain.gain.value=SFX_CFG.master; sfxGain.connect(actx.destination);
    // 程式產生的城市殘響：衰減的雜訊 + 幾次離散的建築反射
    const sr=actx.sampleRate, len=Math.floor(sr*2.2), ir=actx.createBuffer(2,len,sr);
    for(let c=0;c<2;c++){
      const d=ir.getChannelData(c);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)*0.35;
      for(const [t,a] of [[0.09,.5],[0.17,.35],[0.31,.25],[0.52,.15]]){ const k=Math.floor((t+c*0.013)*sr); for(let j=0;j<600;j++) d[k+j]+=(Math.random()*2-1)*a*(1-j/600); }
    }
    sfxVerb = actx.createConvolver(); sfxVerb.buffer=ir;
    sfxVerbGain=actx.createGain(); sfxVerbGain.gain.value=SFX_CFG.reverb; sfxVerb.connect(sfxVerbGain).connect(sfxMaster);
  }
  sfxGain.gain.value=SFX_CFG.master; sfxVerbGain.gain.value=SFX_CFG.reverb;
  if(actx.state==='suspended') actx.resume();
  return actx;
}
function noiseBuf(sec){
  const a=audio(), len=Math.max(1,Math.floor(a.sampleRate*sec)), b=a.createBuffer(1,len,a.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  return b;
}
// 一段濾波雜訊：t0 起始時間、dur 長度、type/freq/q 濾波、vol 音量、decay 衰減曲線、wet 送殘響比例
function nz(t0, dur, type, freq, q, vol, decay=4, wet=0){
  const a=audio(), s=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain();
  s.buffer=noiseBuf(dur); f.type=type; f.frequency.value=freq; f.Q.value=q;
  g.gain.setValueAtTime(vol*VK, t0); g.gain.setTargetAtTime(0.0001, t0, dur/decay);
  s.connect(f).connect(g).connect(sfxMaster);
  if(wet){ const w=a.createGain(); w.gain.value=wet; g.connect(w).connect(sfxVerb); }
  s.start(t0); s.stop(t0+dur+0.05);
  return f;
}
// 短促音調：金屬撞擊、提示音
function tone(t0, dur, type, f0, f1, vol, wet=0){
  const a=audio(), o=a.createOscillator(), g=a.createGain();
  o.type=type; o.frequency.setValueAtTime(f0, t0); if(f1!==f0) o.frequency.exponentialRampToValueAtTime(f1, t0+dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol*VK), t0+0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g).connect(sfxMaster);
  if(wet){ const w=a.createGain(); w.gain.value=wet; g.connect(w).connect(sfxVerb); }
  o.start(t0); o.stop(t0+dur+0.02);
}
function gunSound(loud){   // loud：子彈槍聲倍率 × 消音器（1 = 沒消音的標準彈）
  if(muted) return; VK=SFX_CFG.gun;
  try{
    const a=audio(), t=a.currentTime, L=Math.max(0.15, Math.min(1.6, loud));
    if(L>=0.5){
      const v=Math.min(1, 0.45+0.4*L);
      nz(t, 0.012, 'highpass', 3000, 0.7, 1.0*v, 2, 0.3);              // 超音速彈頭「啪」
      tone(t, 0.45, 'sine', 140, 38, 1.0*v, 0.4);                       // 槍口低頻衝擊
      tone(t, 0.18, 'triangle', 260, 70, 0.5*v);
      const f=nz(t, 0.9, 'lowpass', 5200, 0.6, 0.9*v, 6, 0.9);           // 寬頻爆炸噪音，高頻迅速收掉
      f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(500, t+0.5);
      nz(t+0.02, 1.6, 'bandpass', 380, 0.8, 0.22*v, 3, 1.2);             // 遠處建築回音
    }else{   // 消音 / 亞音速：悶悶的「噗」+ 槍機金屬聲
      nz(t, 0.09, 'lowpass', 900, 0.8, 0.55, 3, 0.15);
      tone(t, 0.12, 'sine', 120, 50, 0.45);
      nz(t+0.01, 0.03, 'bandpass', 2400, 4, 0.18, 3);
    }
  }catch(e){}
}
function boltSound(sec){   // 拉栓上膛：依槍機速度 sec 秒內完成
  if(muted) return; VK=SFX_CFG.bolt;
  try{
    const a=audio(), t=a.currentTime + Math.min(0.35, sec*0.25), k=Math.max(0.6, sec/1.2);
    nz(t, 0.025, 'bandpass', 2600, 6, 0.35, 3);                         // 槍栓上抬「喀」
    tone(t, 0.04, 'square', 1800, 1500, 0.05);
    const pull=nz(t+0.07*k, 0.14*k, 'bandpass', 1400, 2, 0.22, 2);       // 往後拉「唰」
    pull.frequency.setValueAtTime(1100, t+0.07*k); pull.frequency.linearRampToValueAtTime(2200, t+0.21*k);
    nz(t+0.22*k, 0.03, 'bandpass', 3200, 5, 0.32, 3);                   // 拉到底「喀」
    const ct=t+0.32*k;                                                 // 彈殼落地「叮…叮」
    tone(ct, 0.12, 'sine', 4100, 4000, 0.09); tone(ct+0.11, 0.08, 'sine', 3900, 3850, 0.05); tone(ct+0.18, 0.05, 'sine', 4000, 3950, 0.03);
    const push=nz(t+0.42*k, 0.11*k, 'bandpass', 1800, 2, 0.22, 2);       // 往前推「唰」
    push.frequency.setValueAtTime(2200, t+0.42*k); push.frequency.linearRampToValueAtTime(1200, t+0.53*k);
    nz(t+0.55*k, 0.035, 'bandpass', 2000, 4, 0.45, 3);                  // 推入膛室、壓下鎖定「喀嚓」
    tone(t+0.55*k, 0.05, 'square', 900, 700, 0.06);
    nz(t+0.63*k, 0.02, 'bandpass', 3400, 6, 0.3, 3);
  }catch(e){}
}
// 倒數計時：滴答聲；剩 30 秒先「逼逼逼」警示，之後滴答加快，最後 10 秒再加快、音調變高
function tickSound(urgency){
  if(muted) return; VK=SFX_CFG.tick;
  try{
    const a=audio(), t=a.currentTime;
    if(urgency===0) nz(t, 0.02, 'bandpass', 2800, 8, 0.12, 3);
    else tone(t, 0.05, 'square', urgency===1 ? 1250 : 1650, urgency===1 ? 1250 : 1650, urgency===1 ? 0.06 : 0.09);
  }catch(e){}
}
function alarmSound(){
  if(muted) return; VK=SFX_CFG.alarm;
  try{ const a=audio(), t=a.currentTime; for(let i=0;i<3;i++) tone(t+i*0.17, 0.11, 'square', 2000, 2000, 0.16); }catch(e){}
}
// 靜音開關（和遊戲的 M 鍵是同一個設定，存在 localStorage）
const Sound = {
  get muted(){ return muted; },
  toggle(){ muted=!muted; try{ localStorage.setItem('nmk_mute', muted?'1':'0'); }catch(e){} return muted; },
};
