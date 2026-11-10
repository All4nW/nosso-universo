/* =====================================================================
   MICROFONE DA SALINHA (só o Allan do PC)  —  js/salinha-mic.js
   Carregue ANTES do salinha.js (veja a ordem dos <script> no salinha.html).

   Como funciona:
   • O microfone vai numa chamada de áudio SEPARADA (metadata.kind = 'mic'),
     então funciona com ou sem transmissão de tela, e a chamada da tela
     não é tocada.
   • Cadeia de áudio: navegador (cancelamento de eco + supressão de ruído +
     ganho automático) → filtro anti-grave → NOISE GATE (AudioWorklet, com
     lookahead de 12 ms, attack/hold/release suaves) → compressor leve → envio.
   • O noise gate roda na thread de áudio: continua preciso mesmo com a
     aba da Salinha em segundo plano (enquanto você joga/assiste em outra janela).
   • Quem fala ganha um brilho verde no avatar (nos dois lados).
   • Atalho: tecla M liga / muta / desmuta.
   ===================================================================== */
(function(){
'use strict';

const g = id => document.getElementById(id);
const say = t => { try{ toast(t); }catch(e){} };
const isA = () => { try{ return role === 'a'; }catch(e){ return false; } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- preferências (guardadas só neste aparelho) ---------- */
const KEY = 'nu:mic';
let S = {dev:'', ns:'strong', sens:55};
try{ Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); }catch(e){}
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} };

/* sensibilidade 0..100  →  limite do gate em dB (maior sensibilidade = pega sons mais baixos) */
const thFromSens = s => -25 - s * 0.45;

/* ---------- estado ---------- */
const M = {ctx:null, dest:null, out:null, hp:null, comp:null, gate:null, an:null, fb:0,
           src:null, stream:null, live:false, muted:false, starting:false,
           call:null, callAt:0, connRef:null, dis:0, level:-90, open:false};

/* =====================================================================
   1) RECEBER (lado da Jhennyfer): intercepta a chamada de microfone
      antes do tratamento normal de chamadas da tela
   ===================================================================== */
const BasePeer = window.Peer;
if (BasePeer){
  class MicPeer extends BasePeer{
    on(ev, fn, ctx){
      if (ev === 'call' && typeof fn === 'function'){
        const orig = fn;
        fn = c => { if (c && c.metadata && c.metadata.kind === 'mic') incoming(c); else orig(c); };
      }
      return super.on(ev, fn, ctx);
    }
  }
  window.Peer = MicPeer;
}

let inCall = null, inCtx = null, inTimer = 0;
function incoming(c){
  let ok = false; try{ ok = c.peer === otherId; }catch(e){}
  if (!ok) return;
  if (inCall && inCall !== c){ const o = inCall; inCall = null; try{ o.close(); }catch(e){} }
  inCall = c;
  try{ c.answer(); }catch(e){ return; }
  c.on('stream', playIn);
  c.on('close', () => { if (inCall === c){ inCall = null; stopIn(); } });
  c.on('error', () => {});
}
function playIn(st){
  const a = g('micIn'); if (!a) return;
  if (a.srcObject !== st) a.srcObject = st;
  a.muted = false;
  a.play().catch(() => {
    say('Toque na tela para ouvir o microfone 🎙');
    document.addEventListener('pointerdown', () => a.play().catch(() => {}), {once:true});
  });
  watchIn(st);
}
/* brilho no avatar de quem está falando (analisa o áudio que chega; o som sai pelo <audio>) */
function watchIn(st){
  if (inCtx) return;
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    inCtx = new AC();
    const src = inCtx.createMediaStreamSource(st), an = inCtx.createAnalyser();
    an.fftSize = 512; src.connect(an);
    document.addEventListener('pointerdown', () => { if (inCtx && inCtx.state === 'suspended') inCtx.resume(); }, {once:true, passive:true});
    if (inCtx.state === 'suspended') inCtx.resume().catch(() => {});
    const buf = new Float32Array(an.fftSize); let hold = 0;
    inTimer = setInterval(() => {
      an.getFloatTimeDomainData(buf);
      let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      if (20 * Math.log10(Math.sqrt(s / buf.length) + 1e-9) > -50) hold = Date.now() + 250;
      const seat = g('seatO'); if (seat) seat.classList.toggle('talk', Date.now() < hold);
    }, 100);
  }catch(e){ inCtx = null; }
}
function stopIn(){
  clearInterval(inTimer); inTimer = 0;
  if (inCtx){ try{ inCtx.close(); }catch(e){} inCtx = null; }
  const a = g('micIn'); if (a) a.srcObject = null;
  const seat = g('seatO'); if (seat) seat.classList.remove('talk');
}

/* =====================================================================
   2) ENVIAR (lado do Allan no PC): motor de áudio
   ===================================================================== */
const WORKLET = `
class MicGate extends AudioWorkletProcessor{
  constructor(){
    super();
    this.th = -50; this.gateOn = true;
    this.lvl = 0; this.g = 0; this.hold = 0; this.isOpen = false; this.above = 0;
    this.l1 = 0; this.l2 = 0;
    this.k = 1 - Math.exp(-2 * Math.PI * 250 / sampleRate);
    this.N = 4096; this.buf = new Float32Array(this.N); this.w = 0;
    this.D = Math.round(sampleRate * 0.025);
    this.cnt = 0;
    this.port.onmessage = e => {
      const d = e.data || {};
      if (d.th !== undefined) this.th = d.th;
      if (d.on !== undefined) this.gateOn = d.on;
    };
  }
  process(inputs, outputs){
    const out = outputs[0] && outputs[0][0];
    if (!out) return true;
    const inp = inputs[0] && inputs[0][0], n = out.length;
    if (!inp){ out.fill(0); return true; }
    let s = 0;
    for (let i = 0; i < n; i++){
      const x = inp[i];
      this.l1 += this.k * (x - this.l1);
      const h1 = x - this.l1;
      this.l2 += this.k * (h1 - this.l2);
      const d = h1 - this.l2;
      s += d * d;
    }
    const rms = Math.sqrt(s / n);
    this.lvl = rms > this.lvl ? rms : this.lvl * 0.93 + rms * 0.07;
    const db = 20 * Math.log10(this.lvl + 1e-9);
    const raw = 20 * Math.log10(rms + 1e-9);
    if (this.isOpen){
      if (db > this.th - 5) this.hold = sampleRate * 0.25;
      else { this.hold -= n; if (this.hold <= 0) this.isOpen = false; }
    } else {
      if (raw > this.th) this.above += n; else this.above = Math.max(0, this.above - n / 2);
      if (this.above >= sampleRate * 0.015){ this.isOpen = true; this.hold = sampleRate * 0.25; this.above = 0; }
    }
    const target = (!this.gateOn || this.isOpen) ? 1 : 0;
    const ca = 1 - Math.exp(-1 / (sampleRate * 0.004));
    const cr = 1 - Math.exp(-1 / (sampleRate * 0.12));
    for (let i = 0; i < n; i++){
      this.buf[this.w] = inp[i];
      const r = (this.w - this.D + this.N) % this.N;
      this.g += (target - this.g) * (target > this.g ? ca : cr);
      out[i] = this.buf[r] * this.g;
      this.w = (this.w + 1) % this.N;
    }
    if (++this.cnt >= 16){ this.cnt = 0; this.port.postMessage({db: db, open: this.isOpen}); }
    return true;
  }
}
registerProcessor('mic-gate', MicGate);
`;

async function ensureCtx(){
  if (M.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error('sem WebAudio');
  let ctx; try{ ctx = new AC({latencyHint:'playback', sampleRate:48000}); }catch(e){ ctx = new AC({latencyHint:'playback'}); }
  M.ctx = ctx;
  M.dest = ctx.createMediaStreamDestination();
  M.out = ctx.createGain(); M.out.gain.value = 1;

  M.hp = ctx.createBiquadFilter(); M.hp.type = 'highpass'; M.hp.frequency.value = 120; M.hp.Q.value = .707;

  M.comp = ctx.createDynamicsCompressor();
  M.comp.threshold.value = -20; M.comp.knee.value = 30; M.comp.ratio.value = 2;
  M.comp.attack.value = .004; M.comp.release.value = .2;

  M.an = ctx.createAnalyser(); M.an.fftSize = 1024; M.hp.connect(M.an);   /* só leitura (reserva do medidor) */

  try{
    const url = URL.createObjectURL(new Blob([WORKLET], {type:'application/javascript'}));
    await ctx.audioWorklet.addModule(url); URL.revokeObjectURL(url);
    M.gate = new AudioWorkletNode(ctx, 'mic-gate', {numberOfInputs:1, numberOfOutputs:1, channelCount:1, channelCountMode:'explicit', outputChannelCount:[1]});
    M.gate.port.onmessage = e => onLevel(e.data);
    M.hp.connect(M.gate); M.gate.connect(M.comp);
  }catch(e){
    console.warn('[mic] AudioWorklet indisponível; seguindo só com a supressão do navegador', e);
    M.gate = null; M.hp.connect(M.comp); startFallbackMeter();
  }
  M.comp.connect(M.out); M.out.connect(M.dest);
  M.dest.stream.getAudioTracks().forEach(t => { try{ t.contentHint = 'speech'; }catch(e){} });
}

function startFallbackMeter(){
  if (M.fb) return;
  const buf = new Float32Array(1024);
  M.fb = setInterval(() => {
    if (!M.an || !M.live) return;
    M.an.getFloatTimeDomainData(buf);
    let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const db = 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-9);
    onLevel({db, open: db > thFromSens(S.sens)});
  }, 50);
}

function constraints(useDev){
  const off = S.ns === 'off';
  const a = {echoCancellation: !off, noiseSuppression: !off, autoGainControl: S.ns === 'std',
             channelCount:{ideal:1}, sampleRate:{ideal:48000}};
  if (useDev && S.dev) a.deviceId = {exact: S.dev};
  return a;
}
async function openInput(){
  const gum = c => navigator.mediaDevices.getUserMedia({audio: c});
  let st;
  try{ st = await gum(constraints(true)); }
  catch(e){
    if (S.dev && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')){ S.dev = ''; save(); st = await gum(constraints(false)); }
    else throw e;
  }
  if (M.src){ try{ M.src.disconnect(); }catch(e){} }
  if (M.stream) M.stream.getTracks().forEach(t => t.stop());
  M.stream = st; M.src = M.ctx.createMediaStreamSource(st); M.src.connect(M.hp);
  st.getAudioTracks()[0].addEventListener('ended', () => { if (M.stream === st){ stop(); say('Microfone desconectado'); } });
  applyGate();
}
function applyGate(sens){
  if (!M.gate) return;
  M.gate.port.postMessage({th: thFromSens(sens === undefined ? S.sens : sens), on: S.ns === 'strong'});
}
function setOutGain(){
  if (!M.out) return;
  M.out.gain.setTargetAtTime(M.muted ? 0 : 1, M.ctx.currentTime, .015);
}
function blip(f1, f2){      /* bip curtinho só pra você (não vai pra ela) */
  const c = M.ctx; if (!c || c.state !== 'running') return;
  const t = c.currentTime + .01;
  [f1, f2].forEach((f, i) => {
    const o = c.createOscillator(), gn = c.createGain(), t0 = t + i * .09;
    o.frequency.value = f;
    gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(.06, t0 + .01); gn.gain.exponentialRampToValueAtTime(.0001, t0 + .12);
    o.connect(gn); gn.connect(c.destination); o.start(t0); o.stop(t0 + .14);
  });
}

/* ---------- ligar / mutar / desligar ---------- */
async function start(){
  if (M.starting || M.live || !isA()) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ say('O navegador não liberou o microfone aqui (o site precisa estar em HTTPS)'); return; }
  M.starting = true; paint();
  try{
    await ensureCtx();
    if (M.ctx.state === 'suspended') await M.ctx.resume();
    await openInput();
    M.live = true; M.muted = false; setOutGain();
    say('Microfone ligado 🎙'); blip(520, 780);
    refreshDevices(); ensureCall();
  }catch(e){
    console.warn('[mic] erro ao ligar', e);
    say(e && e.name === 'NotAllowedError' ? 'Permissão do microfone negada. Libere no cadeado da barra de endereço.'
      : e && e.name === 'NotFoundError' ? 'Nenhum microfone encontrado'
      : e && e.name === 'NotReadableError' ? 'Outro programa está usando o microfone'
      : 'Não consegui ligar o microfone');
  }
  M.starting = false; paint();
}
function toggleMute(){
  if (!M.live) return;
  M.muted = !M.muted; setOutGain(); paint();
  blip(M.muted ? 780 : 520, M.muted ? 520 : 780);
  say(M.muted ? 'Microfone no mudo 🔇' : 'Microfone ligado 🎙');
}
function stop(){
  M.live = false; M.muted = false;
  closeCall();
  if (M.src){ try{ M.src.disconnect(); }catch(e){} M.src = null; }
  if (M.stream){ M.stream.getTracks().forEach(t => t.stop()); M.stream = null; }
  setOutGain();
  const seat = g('seatMe'); if (seat) seat.classList.remove('talk');
  const b = g('bMic'); if (b) b.classList.remove('talk');
  paint();
}

/* ---------- chamada de áudio pra ela ---------- */
function opusTune(sdp){
  const m = sdp.match(/a=rtpmap:(\d+) opus\/48000/i); if (!m) return sdp;
  const id = m[1], add = 'stereo=0;maxaveragebitrate=64000';
  const re = new RegExp('(a=fmtp:' + id + ' [^\\r\\n]*)');
  return re.test(sdp) ? sdp.replace(re, '$1;' + add)
                      : sdp.replace(new RegExp('(a=rtpmap:' + id + ' [^\\r\\n]*\\r\\n)'), '$1a=fmtp:' + id + ' ' + add + '\r\n');
}
function ensureCall(){
  if (!M.live || !M.dest || M.call) return;
  try{
    if (!conn || !conn.open || !peer || !peer.open) return;
    const c = peer.call(otherId, M.dest.stream, {metadata:{kind:'mic'}, sdpTransform: opusTune});
    M.call = c; M.callAt = Date.now(); M.connRef = conn; M.dis = 0;
        setTimeout(() => { try{ c.peerConnection.getSenders().forEach(s => {
      const p = s.getParameters(); if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      p.encodings[0].priority = 'high'; p.encodings[0].networkPriority = 'high';
      s.setParameters(p).catch(() => {});
    }); }catch(e){} }, 500);
    const gone = () => { if (M.call === c) M.call = null; };
    c.on('close', gone); c.on('error', gone);
    const pc = c.peerConnection;
    if (pc) pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed'){ if (M.call === c){ M.call = null; try{ c.close(); }catch(e){} } }
    });
  }catch(e){ M.call = null; }
}
function closeCall(){
  if (M.call){ const c = M.call; M.call = null; try{ c.close(); }catch(e){} }
}
/* supervisor: refaz a chamada se ela caiu, se a conexão com ela foi refeita ou se ela voltou à sala */
setInterval(() => {
  if (!M.live) return;
  try{
    if (M.call){
      const st = M.call.peerConnection && M.call.peerConnection.connectionState;
      if (st === 'disconnected'){ M.dis = M.dis || Date.now(); if (Date.now() - M.dis > 8000) closeCall(); } else M.dis = 0;
      if (conn && conn.open && M.connRef !== conn) closeCall();
    }
  }catch(e){}
  ensureCall();
}, 1500);

/* ---------- nível, brilho no avatar, avisos ---------- */
let spokeMuted = 0, lastWarn = 0;
function onLevel(d){
  M.level = d.db; M.open = !!d.open;
  const talk = M.live && !M.muted && M.open;
  const seat = g('seatMe'), b = g('bMic');
  if (seat) seat.classList.toggle('talk', talk);
  if (b) b.classList.toggle('talk', talk);
  if (M.live && M.muted && M.open){
    if (!spokeMuted) spokeMuted = Date.now();
    else if (Date.now() - spokeMuted > 1500 && Date.now() - lastWarn > 20000){ lastWarn = Date.now(); say('Você está no mudo 🔇 (tecla M)'); }
  } else spokeMuted = 0;
  const dl = g('dlg');
  if (dl && dl.open){
    const m = g('micMeter');
    if (m){ m.firstElementChild.style.width = clamp((d.db + 80) / 80 * 100, 0, 100) + '%'; m.classList.toggle('hot', M.open); }
  }
}

/* ---------- botão da barra ---------- */
function paint(){
  const b = g('bMic'); if (!b) return;
  b.classList.toggle('live', M.live && !M.muted);
  b.classList.toggle('muted', M.live && M.muted);
  b.classList.toggle('busy', M.starting);
  b.title = !M.live ? 'Ligar microfone (M)' : M.muted ? 'Tirar do mudo (M)' : 'Silenciar (M)';
  b.setAttribute('aria-pressed', String(M.live && !M.muted));
  const off = g('cMicOff'); if (off) off.hidden = !M.live;
  syncHint();
}
g('bMic').addEventListener('click', () => { if (!M.live) start(); else toggleMute(); });
document.addEventListener('keydown', e => {
  if ((e.key !== 'm' && e.key !== 'M') || e.repeat || e.ctrlKey || e.altKey || e.metaKey || !isA()) return;
  const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  const d = g('dlg'); if (d && d.open) return;
  e.preventDefault(); if (!M.live) start(); else toggleMute();
});
addEventListener('pagehide', () => { try{ stop(); }catch(e){} });

/* ---------- configurações ---------- */
async function refreshDevices(){
  const sel = g('cMicDev'); if (!sel || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  let list = []; try{ list = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput'); }catch(e){}
  sel.innerHTML = '';
  const o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Padrão do sistema'; sel.appendChild(o0);
  list.forEach((d, i) => {
    if (d.deviceId === 'default' || d.deviceId === 'communications') return;
    const o = document.createElement('option'); o.value = d.deviceId; o.textContent = d.label || ('Microfone ' + (i + 1)); sel.appendChild(o);
  });
  sel.value = S.dev; if (sel.value !== S.dev) sel.value = '';
}
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', refreshDevices);

function updThr(){
  const v = +g('cMicSens').value, t = g('micThr');
  if (t) t.style.left = clamp((thFromSens(v) + 80) / 80 * 100, 0, 100) + '%';
}
function syncHint(){
  const h = g('micHint'), w = g('cMicSensWrap'), ns = g('cMicNs') ? g('cMicNs').value : S.ns;
  if (w) w.style.opacity = ns === 'strong' ? '' : '.5';
  if (!h) return;
  h.textContent = ns !== 'strong' ? 'A sensibilidade só age na redução Forte.'
    : M.live ? 'Fale normalmente: a barra deve passar da linha rosa. Em silêncio, deve ficar abaixo dela.'
             : 'Ligue o microfone (botão 🎙 na barra) para testar a sensibilidade.';
}
g('bSet').addEventListener('click', () => {
  if (!isA()) return;
  g('cMicNs').value = S.ns; g('cMicSens').value = S.sens;
  refreshDevices(); updThr(); paint();
});
g('cMicSens').addEventListener('input', () => { updThr(); applyGate(+g('cMicSens').value); });
g('cMicNs').addEventListener('change', syncHint);
g('cMicOff').addEventListener('click', () => { stop(); say('Microfone desligado'); });
g('cOk').addEventListener('click', () => {
  if (!isA()) return;
  const dev = g('cMicDev').value, ns = g('cMicNs').value, sens = +g('cMicSens').value;
  const mudou = dev !== S.dev || ns !== S.ns;
  S.dev = dev; S.ns = ns; S.sens = sens; save();
  applyGate();
  if (M.live && mudou) openInput().catch(() => say('Não consegui trocar o microfone'));
});
g('dlg').addEventListener('close', () => applyGate());   /* cancelou? volta à sensibilidade salva */

paint();
})();