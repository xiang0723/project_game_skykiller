/* 噁男殺手：音效（Web Audio 即時合成，沒有音效檔）
   遊戲（index.html）和開發用的 _samples/sfx-test.html 共用這個檔案。
   槍聲 = 超音速彈頭的「啪」+ 槍口爆音的低頻衝擊 + 寬頻爆炸噪音 + 街道建築的回音殘響。
   消音器 / 亞音速彈會讓槍聲變悶變小。開槍後依槍機速度播放拉栓上膛聲。
   SFX_CFG 是各類音效的音量倍率，sfx-test.html 可以即時調整並匯出。 */
const SFX_CFG = { master:1, reverb:0.55, gun:1, bolt:1, tick:1, alarm:1, shop:1 };
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
/* ---------- 拉栓上膛（擬真版） ----------
   真實的手動槍機聲是「金屬撞擊的共振」＋「金屬滑動的摩擦」：
   抬栓「喀」→ 往後拉「唰—」→ 撞到底「鏗」→ 彈殼彈出落地「叮、叮叮…」→ 往前推「唰—」
   → 子彈從彈匣剝離「喀擦」→ 推入膛室「咚」→ 壓下槍栓鎖定「喀」
   金屬聲用幾個不成倍數的正弦波（非諧波共振）做出硬金屬的質感；彈殼是黃銅，音更高更亮、會彈跳 */
function ring(t0, parts, vol, wet=0){   // parts：[[頻率, 相對音量, 衰減秒數], …]
  const a=audio();
  for(const [f, amp, dec] of parts){
    const o=a.createOscillator(), g=a.createGain();
    o.type='sine'; o.frequency.setValueAtTime(f*(1+(Math.random()-.5)*0.01), t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol*amp*VK), t0+0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dec);
    o.connect(g).connect(sfxMaster);
    if(wet){ const w=a.createGain(); w.gain.value=wet; g.connect(w).connect(sfxVerb); }
    o.start(t0); o.stop(t0+dec+0.02);
  }
}
function scrape(t0, dur, f0, f1, vol){   // 金屬滑動摩擦：掃頻帶通雜訊＋不規則的顆粒感
  const a=audio(), s=a.createBufferSource(), f=a.createBiquadFilter(), hp=a.createBiquadFilter(), g=a.createGain();
  s.buffer=noiseBuf(dur+0.05); f.type='bandpass'; f.Q.value=3.5; hp.type='highpass'; hp.frequency.value=700;
  f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0+dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol*VK, t0+dur*0.15);
  for(let x=t0+dur*0.15; x<t0+dur*0.9; x+=0.006) g.gain.setValueAtTime(vol*VK*(0.45+Math.random()*0.75), x);   // 摩擦顆粒
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  s.connect(f).connect(hp).connect(g).connect(sfxMaster);
  s.start(t0); s.stop(t0+dur+0.05);
}
function clack(t0, vol, parts, thump=0){   // 金屬撞擊：瞬間的喀聲＋共振＋（可選）低頻厚度
  nz(t0, 0.012, 'highpass', 2500, 0.8, vol, 2);
  nz(t0, 0.02, 'bandpass', 1800, 2, vol*0.5, 3);
  ring(t0, parts, vol*0.35, 0.04);
  if(thump) tone(t0, 0.07, 'sine', thump, thump*0.7, vol*0.45);
}
function casingDrop(t0, vol){   // 黃銅彈殼落在柏油／水泥地：亮的高音，彈跳越來越快、越來越小聲
  const BRASS = [[3150,1,.22],[4870,.7,.16],[7020,.45,.1],[9330,.25,.07]];
  let t=t0, v=vol, gap=0.13;
  for(let i=0;i<5;i++){
    nz(t, 0.006, 'highpass', 5000, 0.7, v*0.6, 2, 0.12);
    ring(t, BRASS.map(([f,a,d])=>[f*(1+(Math.random()-.5)*0.02), a, d*(1-i*0.12)]), v, 0.15);
    t += gap; gap *= 0.62; v *= 0.55;
  }
  scrape(t, 0.12, 6000, 4500, vol*0.06);   // 最後在地上滾一下
}
function boltSound(sec){   // 拉栓上膛：依槍機速度 sec 秒內完成（1.4 / 1.15 / 0.95）
  if(muted) return; VK=SFX_CFG.bolt;
  try{
    const a=audio(), t=a.currentTime + Math.min(0.3, sec*0.2), k=Math.max(0.6, sec/1.2);
    const STEEL  = [[2870,1,.06],[4630,.6,.045],[6810,.35,.03]];
    const STEEL2 = [[1930,1,.09],[3340,.7,.07],[5180,.4,.05],[7400,.2,.03]];
    clack(t, 0.42, STEEL, 260);                                   // 抬栓「喀」
    scrape(t+0.05*k, 0.15*k, 1300, 2700, 0.16);                    // 往後拉「唰—」
    clack(t+0.2*k, 0.55, STEEL2, 170);                             // 撞到底「鏗」
    nz(t+0.21*k, 0.01, 'bandpass', 4200, 6, 0.18, 2);              // 拋殼挺把彈殼踢出去
    casingDrop(t+0.2*k+0.33, 0.16);                                // 彈殼飛出去約 0.3 秒後落地（不受槍機速度影響）
    scrape(t+0.36*k, 0.13*k, 2500, 1250, 0.15);                    // 往前推「唰—」
    nz(t+0.42*k, 0.025, 'bandpass', 3600, 3, 0.22, 3);             // 子彈從彈匣剝離「喀擦」
    nz(t+0.43*k, 0.05, 'lowpass', 700, 1, 0.3, 3);
    clack(t+0.5*k, 0.5, STEEL2, 140);                              // 推入膛室「咚」
    clack(t+0.58*k, 0.48, [[3420,1,.05],[5610,.6,.035],[8100,.3,.02]], 300);   // 壓下鎖定「喀」
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
/* 購買：收銀機（擬真版）
   抽屜彈開「喀—咚」＋收銀機鈴「叮」＋一把硬幣掉進零錢盒互相碰撞「鏘啷啷」。
   硬幣是薄金屬圓片，振動的泛音不是整數倍（約 1 : 1.48 : 1.9 : 2.4 : 2.9），所以聽起來是「叮」而不是「嗶」；
   每枚硬幣大小不同、基頻不同，碰撞時間隨機、越來越小聲 */
function coin(t0, base, vol){
  nz(t0, 0.005, 'highpass', 6000, 0.7, vol*0.7, 2, 0.05);   // 碰撞瞬間的「喀」
  ring(t0, [[base,1,.42],[base*1.48,.75,.3],[base*1.89,.5,.22],[base*2.38,.35,.15],[base*2.91,.2,.1]], vol, 0.12);
}
function buySound(){
  if(muted) return; VK=SFX_CFG.shop;
  try{
    const a=audio(), t=a.currentTime;
    clack(t, 0.35, [[1450,1,.05],[2600,.5,.035]], 120);              // 抽屜卡榫彈開「喀」
    scrape(t+0.015, 0.09, 900, 500, 0.08);                            // 抽屜滑出來
    tone(t+0.1, 0.09, 'sine', 95, 70, 0.25);                          // 抽屜撞到底「咚」
    ring(t+0.03, [[2093,1,.9],[2093*2.76,.35,.5],[2093*5.4,.15,.25]], 0.14, 0.2);   // 收銀機鈴「叮」
    let ct=t+0.16, v=0.13;                                            // 一把硬幣掉進零錢盒
    for(let i=0;i<9;i++){
      coin(ct, 2400+Math.random()*2200, v);
      if(Math.random()<0.4) coin(ct+0.008+Math.random()*0.01, 2600+Math.random()*2000, v*0.6);   // 兩枚同時碰在一起
      ct += 0.025 + Math.random()*0.05; v *= 0.84;
    }
    scrape(t+0.18, 0.28, 7000, 5200, 0.025);                          // 硬幣在盒子裡滑動的沙沙聲
  }catch(e){}
}
// 錢不夠：低沉的兩聲「嗶嗶」
function denySound(){
  if(muted) return; VK=SFX_CFG.shop;
  try{ const a=audio(), t=a.currentTime; tone(t, 0.12, 'square', 220, 200, 0.1); tone(t+0.16, 0.16, 'square', 180, 160, 0.1); }catch(e){}
}
// 靜音開關（和遊戲的 M 鍵是同一個設定，存在 localStorage）
const Sound = {
  get muted(){ return muted; },
  toggle(){ muted=!muted; try{ localStorage.setItem('nmk_mute', muted?'1':'0'); }catch(e){} return muted; },
};
