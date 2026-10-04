/* ===== CÓDIGO FIXO DA SALINHA ===== troque por algo só de vocês (só letras minúsculas e números)
   Pra testar uma sala "limpa" (sem conflito com abas antigas), abra o link com ?sala=teste1 nos dois aparelhos. */
const SALA = 'nu-salinha-' + ((new URLSearchParams(location.search).get('sala') || 'k7q2x9').toLowerCase().replace(/[^a-z0-9]/g, '') || 'k7q2x9');

const $ = id => document.getElementById(id);
const store = {
  get(k, d){ try{ const v = localStorage.getItem('nu:' + k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('nu:' + k, JSON.stringify(v)); }catch(e){} }
};
const AVATARS = ['🐻','🐰','🐱','🦊','🐼','🐸','🐥','🌙','⭐','🍓'];

let role = new URLSearchParams(location.search).get('eu');
if (role === 'a' || role === 'b') store.set('role', role); else role = store.get('role', null);

let cfg, myId, otherId;
let peer = null, conn = null, call = null, localStream = null;
let everSeen = false, meLost = false, leaving = false, lastSeen = 0, dialAt = 0, tt, lastErr = '';
const canShare = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

/* ---------- interface ---------- */
function toast(t){ const d = $('toast'); d.textContent = t; d.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => d.classList.remove('show'), 3200); }
function setSeat(w, s){ $('seat' + w).dataset.s = s; $('st' + w).textContent = {on:'aqui', off:'fora', re:'reconectando…'}[s]; }
function pop(w){ const e = $('seat' + w); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }
function setAv(el, img, emoji){
  if (img){ el.style.backgroundImage = 'url("' + img + '")'; el.textContent = ''; }
  else { el.style.backgroundImage = ''; el.textContent = emoji; }
}
function paintNames(){
  $('nmMe').textContent = cfg.myName; setAv($('avMe'), cfg.myImg, cfg.myAv);
  $('nmO').textContent = cfg.otherName; setAv($('avO'), cfg.otherImg, cfg.otherAv);
}
function renderWait(){
  const live = $('screen').classList.contains('live');
  let h = '';
  if (localStream) h = '<h2>Você está transmitindo ✨</h2><p>Preview escondido. Quem está na sala vê a sua tela.</p>';
  else if (!live){
    h = '<span class="led"></span><h2>desligado</h2>';
    if (canShare) h += '<button class="pill" id="bShare">Transmitir minha tela</button>';
  }
  $('wait').innerHTML = h;
  if ($('bStop')) $('bStop').onclick = stopShare;
  if ($('bShare')) $('bShare').onclick = share;
  updPrev();
}
let prevOn = true;
function updPrev(){
  const sc = $('screen'), pv = $('pv'), on = !!localStream;
  sc.classList.toggle('sharing', on);
  sc.classList.toggle('prev', on && prevOn);
  if (on){ if (pv.srcObject !== localStream) pv.srcObject = localStream; pv.play().catch(() => {}); }
  else pv.srcObject = null;
}

/* ---------- chat ---------- */
let msgs = [];
function addMsg(from, text, save = true, ts = Date.now(), img = null, stk = null){
  const me = from === 'me', w = document.createElement('div'); w.className = 'row' + (me ? ' me' : '');
  w.innerHTML = '<i></i><div class="' + (me ? 'm me' : 'm') + '"></div>';
  setAv(w.querySelector('i'), me ? cfg.myImg : cfg.otherImg, me ? cfg.myAv : cfg.otherAv);
  const m = w.querySelector('.m');
  if (!me){ const n = document.createElement('b'); n.className = 'nm'; n.textContent = cfg.otherName + ((img || stk) ? '' : ':'); m.appendChild(n); }
  if (stk){
    const im = document.createElement('img'); im.className = 'stk'; im.src = STK_DIR + stk; im.alt = 'figurinha';
    im.onerror = () => im.replaceWith(document.createTextNode('🎟 figurinha'));
    m.appendChild(im); m.classList.add('pic');
  }
  else if (img){ const im = document.createElement('img'); im.src = img; im.onclick = () => { $('lbi').src = img; $('lb').classList.add('on'); }; m.appendChild(im); m.classList.add('pic'); }
  else m.appendChild(document.createTextNode(text));
  $('msgs').appendChild(w); $('msgs').scrollTop = 1e9;
  if (save){ msgs.push({from, text: stk ? '' : (img ? '📷 foto' : text), stk: stk || undefined, ts}); store.set('chat' + role, msgs.slice(-60)); }
  if (!me && !$('pad').classList.contains('open')){ $('dot').classList.add('on'); peek(stk ? '🎟 mandou uma figurinha' : (img ? '📷 mandou uma foto' : text)); }
}
function addSys(t){
  const d = document.createElement('div'); d.className = 'sys'; d.textContent = t;
  $('msgs').appendChild(d); $('msgs').scrollTop = 1e9;
}
function sendMsg(){
  const x = $('txt').value.trim(); if (!x) return;
  if (!conn || !conn.open){ toast('Sem conexão agora, tenta de novo já já'); return; }
  conn.send({t:'chat', x}); addMsg('me', x); $('txt').value = ''; closeTrays();
}

/* ---------- qualidade ---------- */
function boost(sdp){
  const k = cfg.mbps * 1000;
  sdp = sdp.replace(/(m=video[^\r\n]*\r\nc=[^\r\n]*\r\n)(b=[^\r\n]*\r\n)?/, '$1b=AS:' + k + '\r\n');
  [...sdp.matchAll(/a=rtpmap:(\d+) (?:VP8|VP9|H264|AV1)\/90000/g)].forEach(m => {
    const id = m[1], add = 'x-google-min-bitrate=1500;x-google-start-bitrate=' + Math.round(k * .6) + ';x-google-max-bitrate=' + k;
    const ex = new RegExp('(a=fmtp:' + id + ' [^\\r\\n]*)');
    sdp = ex.test(sdp) ? sdp.replace(ex, '$1;' + add) : sdp.replace(new RegExp('(a=rtpmap:' + id + ' [^\\r\\n]*\\r\\n)'), '$1a=fmtp:' + id + ' ' + add + '\r\n');
  });
  return sdp;
}
/* diagnóstico: mostra no console (F12) o motivo real de uma eventual
   baixa qualidade — "bandwidth" (rede), "cpu" (processamento) ou "none" (tudo ok) */
async function diagQualidade(c){
  const pc = c && c.peerConnection; if (!pc) return;
  for (const s of pc.getSenders()){
    if (!s.track || s.track.kind !== 'video') continue;
    const stats = await s.getStats();
    stats.forEach(r => {
      if (r.type === 'outbound-rtp' && r.kind === 'video'){
        console.log('[qualidade]', {
          resolucaoEnviada: r.frameWidth + 'x' + r.frameHeight,
          fpsEnviado: r.framesPerSecond,
          motivoLimitacao: r.qualityLimitationReason,
          bitrateKbps: Math.round((r.bytesSent * 8) / 1000)
        });
      }
    });
  }
}
async function tune(c){
  const pc = c && c.peerConnection; if (!pc) return;
  for (const s of pc.getSenders()){
    if (!s.track || s.track.kind !== 'video') continue;
    try{
      s.track.contentHint = cfg.quality;
      const p = s.getParameters();
      if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      p.encodings[0].maxBitrate = cfg.mbps * 1e6;
      p.encodings[0].maxFramerate = cfg.fps;
      p.encodings[0].scaleResolutionDownBy = 1;
      p.degradationPreference = cfg.quality === 'detail' ? 'maintain-resolution' : 'balanced';
      await s.setParameters(p);
    }catch(e){}
  }
}

/* ---------- transmissão ---------- */
async function share(){
  try{
    const s = await navigator.mediaDevices.getDisplayMedia({
      video:{frameRate:{ideal:cfg.fps, max:cfg.fps}, width:{ideal:1920}, height:{ideal:1080}},
      audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}
    });
    const vt = s.getVideoTracks()[0]; vt.contentHint = cfg.quality; vt.onended = stopShare;
    localStream = s; renderWait(); startCall();
  }catch(e){ toast('Transmissão cancelada'); }
}
function stopShare(){
  if (localStream){ localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (call){ const c = call; call = null; try{ c.close(); }catch(e){} }
  renderWait();
}
function startCall(){
  if (!localStream || !conn || !conn.open || !peer || !peer.open) return;
  const c = peer.call(otherId, localStream, {sdpTransform: boost});
  setCall(c);
  [400, 2500, 7000].forEach(ms => setTimeout(() => { if (call === c) tune(c); }, ms));
  setInterval(() => { if (call === c) diagQualidade(c); }, 5000);
  const pc = c.peerConnection;
  if (pc) pc.addEventListener('connectionstatechange', () => {
    if (pc.connectionState === 'failed' && call === c) setTimeout(startCall, 1500);
  });
}
function setCall(c){
  if (call && call !== c){ const o = call; call = null; try{ o.close(); }catch(e){} }
  call = c;
  c.on('stream', showRemote);
  c.on('close', () => { if (call === c){ call = null; hideRemote(); } });
  c.on('error', () => {});
}
const vid = $('vid');
function showRemote(st){
  vid.srcObject = st; vid.muted = false;
  vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); updSnd(); });
  $('screen').classList.add('live'); renderWait(); updSnd();
}
function hideRemote(){ vid.srcObject = null; $('screen').classList.remove('live'); renderWait(); updSnd(); }
function updSnd(){ $('snd').hidden = !($('screen').classList.contains('live') && vid.muted); }
vid.onvolumechange = updSnd;
$('snd').onclick = () => { vid.muted = false; vid.play().catch(() => {}); updSnd(); };
$('screen').ondblclick = () => {
  const f = $('screen');
  if (document.fullscreenElement) document.exitFullscreen();
  else if (f.requestFullscreen) f.requestFullscreen();
  else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen();
};

/* ---------- conexão ---------- */
function refreshMe(){
  const ok = !!(peer && peer.open && !peer.disconnected && navigator.onLine);
  setSeat('Me', ok ? 'on' : 're');
  if (!ok && lastErr === 'unavailable-id') $('stMe').textContent = 'lugar ocupado';
  if (!ok && !meLost){ meLost = true; toast('Reconectando...'); if (refreshMe.was) addSys('Você ficou sem conexão'); }
  if (ok && meLost){ meLost = false; toast('Conectado novamente'); if (refreshMe.was) addSys('Você reconectou'); }
  if (ok) refreshMe.was = true;
}
function setConn(c){
  if (conn && conn !== c){ const o = conn; conn = null; try{ o.close(); }catch(e){} }
  conn = c;
  const opened = () => {
    if (conn !== c) return;
    lastSeen = Date.now();
    const again = everSeen; everSeen = true;
    setSeat('O', 'on'); pop('O'); sendProfile();
    toast(again ? 'Conectado novamente' : cfg.otherName + ' entrou na Salinha 💗');
        addSys(again ? cfg.otherName + ' reconectou' : cfg.otherName + ' entrou na Salinha 💗');
    if (localStream) startCall();
  };
  c.on('open', opened);
  c.on('data', d => {
    lastSeen = Date.now(); if (!d) return;
    if (d.t === 'chat' && d.x) addMsg('o', String(d.x).slice(0, 500));
    else if (d.t === 'img' && typeof d.x === 'string' && d.x.length < 900000 && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(d.x)) addMsg('o', '', true, Date.now(), d.x);
        else if (d.t === 'stk' && typeof d.x === 'string' && /^[A-Za-z0-9_-]{1,40}\.(jpg|jpeg|png|webp|gif)$/i.test(d.x)) addMsg('o', '', true, Date.now(), null, d.x);
        else if (d.t === 'prof'){
      cfg.otherName = String(d.n || cfg.otherName).slice(0, 20);
      cfg.otherImg = (typeof d.i === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(d.i) && d.i.length < 80000) ? d.i : null;
      store.set('cfg' + role, cfg); paintNames();
    }
  });
  c.on('close', () => dropConn(c));
  c.on('error', () => dropConn(c));
  if (c.open) opened();
}
function dropConn(c){
  try{ c.close(); }catch(e){}
  if (conn === c){
    conn = null;
    setSeat('O', everSeen ? 're' : 'off');
       if (everSeen){ toast('Reconectando...'); addSys(cfg.otherName + ' saiu'); }
  }
}
function start(){
  if (leaving) return;
  if (peer){ try{ peer.destroy(); }catch(e){} }
  peer = new Peer(myId, {config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]}});
  peer.on('open', () => { lastErr = ''; refreshMe(); });
  peer.on('disconnected', refreshMe);
  peer.on('connection', c => { if (c.peer !== otherId){ c.close(); return; } setConn(c); });
  peer.on('call', c => { if (c.peer !== otherId) return; c.answer(undefined, {sdpTransform: boost}); setCall(c); });
  /* o supervisor abaixo refaz a conexão; aqui só avisa o motivo (uma vez por tipo de erro) */
  peer.on('error', e => {
    if (e.type !== lastErr){
      lastErr = e.type;
      if (e.type === 'unavailable-id') toast('Esse lugar já está ocupado: tem outra aba ou aparelho aberto como ' + cfg.myName);
      else if (e.type !== 'peer-unavailable') toast('Erro de conexão: ' + e.type);
    }
    refreshMe();
  });
  refreshMe();
}
/* supervisor: a cada 3s confere tudo e refaz o que caiu */
setInterval(() => {
  if (leaving || !role) return;
  if (!peer || peer.destroyed){ start(); return; }
  if (peer.disconnected && navigator.onLine){ try{ peer.reconnect(); }catch(e){} }
  refreshMe();
  if (conn && conn.open){
    try{ conn.send({t:'p'}); }catch(e){}
    if (Date.now() - lastSeen > 10000) dropConn(conn);
  } else if (role === 'a' && peer.open && Date.now() - dialAt > 6000){
    dialAt = Date.now(); setConn(peer.connect(otherId, {reliable:true}));
  }
}, 3000);
window.addEventListener('offline', refreshMe);
window.addEventListener('online', () => { if (peer && peer.disconnected){ try{ peer.reconnect(); }catch(e){} } refreshMe(); });
/* ao fechar a aba, libera o lugar na hora (senão o servidor segura o lugar por um tempo) */
addEventListener('pagehide', () => { try{ peer && peer.destroy(); }catch(e){} });

/* ---------- botões ---------- */
$('bChat').onclick = () => { $('pad').classList.toggle('open'); $('dot').classList.remove('on'); if ($('pad').classList.contains('open')) $('txt').focus(); };
$('send').onclick = sendMsg;
$('txt').onkeydown = e => { if (e.key === 'Enter') sendMsg(); };
$('bExit').onclick = () => { leaving = true; stopShare(); try{ peer && peer.destroy(); }catch(e){} location.href = 'index.html'; };
$('bSet').onclick = () => {
  $('cMy').value = cfg.myName; $('cMyAv').value = cfg.myAv; $('cO').value = cfg.otherName; $('cOAv').value = cfg.otherAv;
  $('cQ').value = cfg.quality; $('cB').value = cfg.mbps; $('cF').value = cfg.fps; $('dlg').showModal();
};
$('cOk').onclick = () => {
  cfg = {myName:$('cMy').value.trim() || (role === 'a' ? 'Allan' : 'Jhennyfer'), myAv:$('cMyAv').value, otherName:$('cO').value.trim() || 'Ela', otherAv:$('cOAv').value,
         quality:$('cQ').value, mbps:+$('cB').value, fps:+$('cF').value};
  store.set('cfg' + role, cfg); paintNames(); $('dlg').close();
  if (localStream){ const vt = localStream.getVideoTracks()[0]; if (vt){ vt.contentHint = cfg.quality; vt.applyConstraints({frameRate:{ideal:cfg.fps, max:cfg.fps}}).catch(() => {}); } tune(call); }
};
$('bPrev').onclick = () => { prevOn = !prevOn; renderWait(); };
$('bStop2').onclick = stopShare;
$('cWho').onclick = () => { store.set('role', null); location.href = location.pathname; };

/* ---------- tela ampliada, chat sobre o vídeo, teclado ---------- */
let pk, uiT;
function peek(t){
  const p = $('peek'); p.innerHTML = '<i></i><span><b></b><em></em></span>';
  setAv(p.querySelector('i'), cfg.otherImg, cfg.otherAv); p.querySelector('b').textContent = cfg.otherName; p.querySelector('em').textContent = t;
  p.classList.add('show'); clearTimeout(pk); pk = setTimeout(() => p.classList.remove('show'), 5000);
}
function showUi(){
  document.body.classList.add('ui'); clearTimeout(uiT);
  uiT = setTimeout(() => { if (document.activeElement !== $('txt') && !$('dlg').open) document.body.classList.remove('ui'); }, 3500);
}
function setChat(open){
  $('pad').classList.toggle('open', open); $('bChat').classList.toggle('on', open); document.body.classList.toggle('chatopen', open);
  if (open){ $('dot').classList.remove('on'); $('peek').classList.remove('show'); $('msgs').scrollTop = 1e9; showUi(); }
}
$('bChat').onclick = () => {

  /* Se as figurinhas estiverem abertas,
     primeiro fecha só as figurinhas */
  if ($('emo').classList.contains('show')){
    $('emo').classList.remove('show');
    $('bEmo').focus?.();
    return;
  }

  /* Se a galeria/foto estiver aberta,
     fecha somente ela */
  if ($('att').classList.contains('show')){
    $('att').classList.remove('show');
    return;
  }

  /* Caso contrário, abre/fecha o chat normalmente */
  const o = !$('pad').classList.contains('open');

  setChat(o);

  if (o && !matchMedia('(pointer:coarse)').matches){
    $('txt').focus();
  }
};
$('padX').onclick = () => setChat(false);
$('peek').onclick = () => setChat(true);
function toggleFs(){
  const d = document;
  if (d.fullscreenElement){ d.exitFullscreen(); try{ screen.orientation.unlock(); }catch(e){} }
  else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().then(() => { try{ screen.orientation.lock('landscape').catch(() => {}); }catch(e){} }).catch(() => {});
  else if (vid.webkitEnterFullscreen && vid.srcObject) vid.webkitEnterFullscreen();
  else toast('Deite o celular para ampliar');
}
$('bFs').onclick = toggleFs;
$('screen').ondblclick = null;
$('screen').addEventListener('click', e => {
  if (e.target.closest('button')) return;
  if (document.body.classList.contains('imm') && document.body.classList.contains('ui')){ document.body.classList.remove('ui'); clearTimeout(uiT); } else showUi();
});
document.querySelector('.base').addEventListener('pointerdown', showUi);
document.addEventListener('pointermove', () => { if (document.body.classList.contains('imm') && matchMedia('(hover:hover)').matches) showUi(); });
function chkImm(){ document.body.classList.toggle('imm', matchMedia('(orientation:landscape) and (max-height:520px)').matches || !!document.fullscreenElement); }
function vv(){
  const v = window.visualViewport; if (!v) return;
  const kb = Math.max(0, innerHeight - v.height - v.offsetTop), r = document.documentElement.style;
  r.setProperty('--vvh', v.height + 'px');
}
['resize','orientationchange'].forEach(e => addEventListener(e, chkImm));
document.addEventListener('fullscreenchange', chkImm);
if (window.visualViewport){ visualViewport.addEventListener('resize', vv); visualViewport.addEventListener('scroll', vv); }
chkImm(); vv();

/* ---------- emojis e fotos no chat ---------- */
/* ---------- emojis e fotos no chat ---------- */

function closeTrays(){
  $('emo').classList.remove('show');
  $('att').classList.remove('show');
}

/* botão X da aba de figurinhas */
function ensureStickerClose(){
  const emo = $('emo');

  if (emo.querySelector('.emoClose')) return;

  const x = document.createElement('button');

  x.type = 'button';
  x.className = 'emoClose';
  x.innerHTML = '✕';
  x.setAttribute('aria-label', 'Fechar figurinhas');

  x.onclick = e => {
    e.stopPropagation();
    emo.classList.remove('show');
  };

  emo.prepend(x);
}

/* Figurinhas */
$('bEmo').onclick = e => {
  e.stopPropagation();

  const aberto = $('emo').classList.contains('show');

  /* clicou de novo no botão de figurinha = fecha */
  if (aberto){
    $('emo').classList.remove('show');
    return;
  }

  /* abre somente figurinhas */
  $('att').classList.remove('show');
  $('emo').classList.add('show');

  ensureStickerClose();
  stkAbrir();
};

/* Galeria/foto */
$('bAtt').onclick = e => {
  e.stopPropagation();

  const aberto = $('att').classList.contains('show');

  if (aberto){
    $('att').classList.remove('show');
    return;
  }

  $('emo').classList.remove('show');
  $('att').classList.add('show');
};

$('aGal').onclick = () => $('fGal').click();
$('aCam').onclick = () => $('fCam').click();
$('aGal').onclick = () => $('fGal').click();
$('aCam').onclick = () => $('fCam').click();
async function pickImg(e){
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try{
    const b = await createImageBitmap(f), sc = Math.min(1, 1280 / Math.max(b.width, b.height)), c = document.createElement('canvas');
    c.width = Math.round(b.width * sc); c.height = Math.round(b.height * sc); c.getContext('2d').drawImage(b, 0, 0, c.width, c.height);
    let q = .8, d = c.toDataURL('image/jpeg', q); while (d.length > 350000 && q > .4){ q -= .1; d = c.toDataURL('image/jpeg', q); }
    if (!conn || !conn.open){ toast('Sem conexão agora, tenta de novo já já'); return; }
    conn.send({t:'img', x:d}); addMsg('me', '', true, Date.now(), d); closeTrays();
  }catch(err){ toast('Não consegui enviar essa imagem'); }
}
$('fGal').onchange = $('fCam').onchange = pickImg;
$('lb').onclick = () => $('lb').classList.remove('on');

/* ---------- perfil e configurações ---------- */
let tmpImg = null;
function sendProfile(){ if (conn && conn.open){ try{ conn.send({t:'prof', n:cfg.myName, i:cfg.myImg || null}); }catch(e){} } }
function paintPrev(){ setAv($('cPrev'), tmpImg, cfg.myAv); }
$('bSet').onclick = () => {
  $('cMy').value = cfg.myName; $('cCount').textContent = cfg.myName.length + '/20'; tmpImg = cfg.myImg || null; paintPrev();
  $('cQ').value = cfg.quality; $('cB').value = cfg.mbps; $('cF').value = cfg.fps; $('dlg').showModal();
};
$('cMy').oninput = () => { $('cCount').textContent = $('cMy').value.length + '/20'; };
$('cPick').onclick = () => $('cFile').click();
$('cFile').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try{
    const b = await createImageBitmap(f), n = Math.min(b.width, b.height), c = document.createElement('canvas'); c.width = c.height = 160;
    c.getContext('2d').drawImage(b, (b.width - n) / 2, (b.height - n) / 2, n, n, 0, 0, 160, 160);
    tmpImg = c.toDataURL('image/jpeg', .85); paintPrev();
  }catch(err){ toast('Não consegui ler essa imagem'); }
  e.target.value = '';
};
$('cCancel').onclick = $('cX').onclick = () => $('dlg').close();
$('cOk').onclick = () => {
  Object.assign(cfg, {myName:$('cMy').value.trim() || 'Você', myImg:tmpImg, quality:$('cQ').value, mbps:+$('cB').value, fps:+$('cF').value});
  store.set('cfg' + role, cfg); paintNames(); $('dlg').close(); sendProfile();
  if (localStream){ const vt = localStream.getVideoTracks()[0]; if (vt){ vt.contentHint = cfg.quality; vt.applyConstraints({frameRate:{ideal:cfg.fps, max:cfg.fps}}).catch(() => {}); } tune(call); }
};

/* economia de dados: sem o gif de fundo */
if (navigator.connection && navigator.connection.saveData){ const g = document.querySelector('.bg'); if (g) g.remove(); }


/* ---------- figurinhas ---------- */
const STK_DIR = 'assets/images/salinha/figurinhas/';
/* Cada tipo = prefixo + número + extensão (figurinha1.jpg, figurinhagif1.gif...).
   A página procura de 1 até "max"; o que ainda não existe some sozinho (não quebra nada).
   Passou de 30? É só aumentar o max. Outro formato (png, webp)? Copie uma linha e troque a ext. */
const STK_TIPOS = [
  { prefixo: 'figurinha',    ext: 'jpg', max: 30 },
  { prefixo: 'figurinhagif', ext: 'gif', max: 30 }
];
let STK_LIST = null, stkLP = null, stkLongo = false, stkEsperando = false;

const stkFavs = () => store.get('stkfav' + role, []);
const stkUso = () => store.get('stkuse' + role, {});

/* confere (só os cabeçalhos, sem baixar a imagem) quais arquivos existem na pasta */
async function stkProbe(){
  const nomes = [];
  STK_TIPOS.forEach(t => { for (let n = 1; n <= t.max; n++) nomes.push(t.prefixo + n + '.' + t.ext); });
  const ok = await Promise.all(nomes.map(nome =>
    fetch(STK_DIR + nome, {method:'HEAD', cache:'no-cache'}).then(r => r.ok).catch(() => false)));
  STK_LIST = nomes.filter((_, i) => ok[i]);
}

/* "Mais usadas" = as favoritas (primeiro) + as que você mais manda */
function stkListaTop(){
  const favs = stkFavs().filter(n => STK_LIST.includes(n)), uso = stkUso();
  const resto = Object.keys(uso).filter(n => STK_LIST.includes(n) && !favs.includes(n)).sort((a, b) => uso[b] - uso[a]).slice(0, 12);
  return [...favs, ...resto];
}

function stkGrid(g, lista, vazioTexto){
  g.innerHTML = '';
  if (!lista.length){
    const d = document.createElement('div'); d.className = 'vazio'; d.textContent = vazioTexto; g.appendChild(d);
    return;
  }
  const favs = stkFavs();
  lista.forEach(nome => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'sk' + (favs.includes(nome) ? ' fav' : '');
    const im = document.createElement('img'); im.src = STK_DIR + nome; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.draggable = false;
    b.appendChild(im); stkBind(b, nome); g.appendChild(b);
  });
}

function stkRender(){
  if (STK_LIST === null){ stkGrid($('sgAll'), [], 'carregando…'); return; }
  stkGrid($('sgTop'), stkListaTop(), 'Nenhuma ainda. Segure numa figurinha pra favoritar.');
  stkGrid($('sgAll'), STK_LIST, 'Nenhuma figurinha encontrada na pasta.');
}

function stkToggleFav(nome, btn){
  const f = stkFavs(), tem = f.includes(nome);
  store.set('stkfav' + role, tem ? f.filter(n => n !== nome) : [nome, ...f]);
  btn.classList.toggle('fav', !tem);
  toast(tem ? 'Tirada das mais usadas' : '⭐ Adicionada às mais usadas');
}

/* toque = envia · segurar (meio segundo) = favoritar / desfavoritar */
function stkBind(btn, nome){
  const cancela = () => clearTimeout(stkLP);
  btn.addEventListener('pointerdown', () => {
    stkLongo = false; clearTimeout(stkLP);
    stkLP = setTimeout(() => { stkLongo = true; stkToggleFav(nome, btn); if (navigator.vibrate) navigator.vibrate(25); }, 520);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancela));
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('click', () => {
       if (stkLongo){ stkLongo = false; stkRender(); return; }
    sendSticker(nome);
  });
}

function sendSticker(nome){
  if (!conn || !conn.open){ toast('Sem conexão agora, tenta de novo já já'); return; }
  conn.send({t:'stk', x:nome});
  addMsg('me', '', true, Date.now(), null, nome);
  const u = stkUso(); u[nome] = (u[nome] || 0) + 1; store.set('stkuse' + role, u);
  closeTrays();
}

/* alterna entre as abas Emojis / Figurinhas e entre Todas / Mais usadas */
function stkAbrir(){
  stkRender();
  if (STK_LIST === null && !stkEsperando){
    stkEsperando = true;
    stkProbe().then(() => { stkEsperando = false; stkRender(); });
  }
}


/* ---------- entrada ---------- */
function boot(){
  myId = SALA + '-' + role; otherId = SALA + '-' + (role === 'a' ? 'b' : 'a');
  cfg = Object.assign({myName: role === 'a' ? 'Allan' : 'Jhennyfer', otherName: role === 'a' ? 'Jhennyfer' : 'Allan', myAv: role === 'a' ? '🐻' : '🐰', otherAv: role === 'a' ? '🐰' : '🐻',
                       quality:'motion', mbps:10, fps:30}, store.get('cfg' + role, {}));
  paintNames(); setSeat('O', 'off'); renderWait();
    store.get('chat' + role, []).forEach(m => addMsg(m.from, m.text, false, m.ts || Date.now(), null, m.stk || null)); msgs = store.get('chat' + role, []);
  $('dot').classList.remove('on');
  start();
}


/* ===== ATUALIZAÇÃO AUTOMÁTICA (bloco independente: pode ser apagado sem afetar o resto) =====
   Depois de um git push que mude a Salinha, quem estiver com ela aberta recarrega sozinho,
   libera o lugar na sala e volta para a escolha "Sou o Allan / Sou a Jhennyfer".
   Confere a cada 3 minutos e quando a aba volta a ficar visível. Não roda no Live Server. */
(function(){
  if (/^(localhost|127\.|\[::1\])/.test(location.hostname)) return;
  const files = ['salinha.html', 'css/salinha.css', 'js/salinha.js'];
  let base = null, busy = false, last = 0;
  async function sig(){
    let t = '';
    for (const f of files){
      const r = await fetch(f + '?_=' + Date.now(), {cache:'no-store'});
      if (!r.ok) throw new Error(f);
      t += await r.text();
    }
    let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
    return h + ':' + t.length;
  }
  async function check(){
    if (busy) return; busy = true; last = Date.now();
    try{
      const s = await sig();
      if (base === null) base = s;
      else if (s !== base){
        leaving = true; try{ peer && peer.destroy(); }catch(e){}
        store.set('role', null); toast('Salinha atualizada. Recarregando…');
        const q = new URLSearchParams(location.search); q.delete('eu');
        setTimeout(() => location.replace(location.pathname + (q.toString() ? '?' + q : '')), 1500);
      }
    }catch(e){}
    busy = false;
  }
  check(); setInterval(check, 180000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - last > 120000) check(); });
})();
/* ---------- janela flutuante (quando sair do site) ---------- */
(function(){
  const v = $('vid'), b = $('bPip');
  async function pip(){
    try{
      if (!v.srcObject){ toast('Ainda não tem transmissão para flutuar'); return; }
      if (document.pictureInPictureElement){ await document.exitPictureInPicture(); return; }
      if (document.pictureInPictureEnabled && v.requestPictureInPicture) await v.requestPictureInPicture();
      else if (v.requestFullscreen){ await v.requestFullscreen(); toast('Aperte o botão Início e o vídeo fica flutuando'); }
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    }catch(e){ toast('Seu navegador não deixou abrir a janela flutuante'); }
  }
  if (b) b.onclick = pip;
  try{ v.autoPictureInPicture = true; navigator.mediaSession.setActionHandler('enterpictureinpicture', pip); }catch(e){}
})();
/* ===== EXTRAS DO CHAT: responder mensagem, "digitando…", fechar bandeja ao tocar fora, teclado na tela ampliada ===== */
(function(){
  const nid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let reply = null, lastSent = null, lastRecv = null, typHide = 0, typT = 0;

  /* --- barra "respondendo a…" acima do campo de mensagem --- */
  const bar = document.createElement('div'); bar.id = 'replyBar';
  bar.innerHTML = '<span class="rbq"><b></b><em></em></span><button type="button" aria-label="Cancelar resposta">✕</button>';
  $('pad').insertBefore(bar, document.querySelector('#pad .say'));
  bar.querySelector('button').onclick = () => setReply(null);
  function setReply(r){
    reply = r; bar.classList.toggle('on', !!r);
    if (r){ bar.querySelector('b').textContent = 'Respondendo a ' + r.n; bar.querySelector('em').textContent = r.s; if (!matchMedia('(pointer:coarse)').matches) $('txt').focus(); }
  }

  /* --- envio: cada mensagem ganha um id e, se houver resposta pendente, leva a citação --- */
  const _setConn = setConn;
  setConn = function(c){
    const send = c.send.bind(c);
    c.send = d => {
      if (d && (d.t === 'chat' || d.t === 'img' || d.t === 'stk')){
        d.id = nid(); lastSent = {id: d.id, r: reply};
        if (reply){ d.r = reply; setReply(null); }
      }
      return send(d);
    };
    c.on('data', d => {                       /* roda antes do tratamento original */
      if (!d) return;
      if (d.t === 'typ'){ showTyping(!!d.on); return; }
      if (d.t === 'chat' || d.t === 'img' || d.t === 'stk'){ showTyping(false); lastRecv = d; }
    });
    return _setConn(c);
  };

  /* --- mensagens: botão "↩ Responder", segurar = responder, citação clicável --- */
  const _addMsg = addMsg;
  addMsg = function(from, text, save, ts, img, stk){
    _addMsg.apply(null, arguments);
    const row = $('msgs').lastElementChild; if (!row || !row.classList.contains('row')) return;
    const m = row.querySelector('.m'); if (!m) return;
    const me = from === 'me', meta = me ? lastSent : lastRecv; if (me) lastSent = null; else lastRecv = null;
    const id = (meta && meta.id) || nid(); row.dataset.id = id;
    const info = {id, n: me ? cfg.myName : cfg.otherName, s: stk ? '🏷️ figurinha' : img ? '📷 foto' : String(text || '').slice(0, 80)};
    const q = meta && meta.r;
    if (q && q.s){
      const rq = document.createElement('div'); rq.className = 'rq';
      rq.innerHTML = '<b></b><span></span>'; rq.firstChild.textContent = String(q.n || '').slice(0, 20); rq.lastChild.textContent = String(q.s).slice(0, 80);
      rq.onclick = e => { e.stopPropagation(); const t = $('msgs').querySelector('[data-id="' + String(q.id).replace(/[^A-Za-z0-9]/g, '') + '"]'); if (t){ t.scrollIntoView({block:'center', behavior:'smooth'}); t.classList.add('hl'); setTimeout(() => t.classList.remove('hl'), 1400); } };
      const nm = m.querySelector('.nm'); nm ? nm.after(rq) : m.prepend(rq);
    }
    const col = document.createElement('div'); col.className = 'col'; m.replaceWith(col); col.appendChild(m);

     const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rb'; btn.textContent = '↩'; btn.title = 'Responder'; btn.setAttribute('aria-label', 'Responder'); btn.onclick = () => setReply(info);

    const horaTxt = new Date(ts || Date.now()).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const timeEl = document.createElement('time'); timeEl.className = 'tm'; timeEl.textContent = horaTxt;

    const metaRow = document.createElement('div'); metaRow.className = 'meta';
    metaRow.append(btn, timeEl);
    col.appendChild(metaRow);

    /* a hora fica escondida até tocar na mensagem */
    m.addEventListener('click', () => { if (!held) row.classList.toggle('showtm'); });
    let lp, sx = 0, sy = 0, held = false;
    m.addEventListener('pointerdown', e => { held = false; sx = e.clientX; sy = e.clientY; clearTimeout(lp); lp = setTimeout(() => { held = true; setReply(info); if (navigator.vibrate) navigator.vibrate(20); }, 500); });
    m.addEventListener('pointermove', e => { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 10) clearTimeout(lp); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => m.addEventListener(ev, () => clearTimeout(lp)));
    m.addEventListener('click', e => { if (held){ e.stopPropagation(); e.preventDefault(); held = false; } }, true);
    m.addEventListener('contextmenu', e => e.preventDefault());
  };

  /* --- "fulano está digitando…" --- */
  function showTyping(on){
    let el = $('typ'); clearTimeout(typHide);
    if (!on){ if (el) el.remove(); return; }
    if (!el){
      el = document.createElement('div'); el.id = 'typ'; el.className = 'row';
      el.innerHTML = '<i></i><div class="m"><b class="nm"></b><span class="dots"><s></s><s></s><s></s></span></div>';
      setAv(el.querySelector('i'), cfg.otherImg, cfg.otherAv); el.querySelector('.nm').textContent = cfg.otherName + ' digitando';
    }
    $('msgs').appendChild(el); $('msgs').scrollTop = 1e9;
    typHide = setTimeout(() => showTyping(false), 4500);
  }
  const typOff = () => { typT = 0; if (conn && conn.open){ try{ conn.send({t:'typ', on:0}); }catch(e){} } };
  $('txt').addEventListener('input', () => {
    if (!$('txt').value){ typOff(); return; }
    const now = Date.now();
    if (conn && conn.open && now - typT > 2000){ typT = now; try{ conn.send({t:'typ', on:1}); }catch(e){} }
  });
  $('txt').addEventListener('blur', typOff);

  /* --- toque fora das bandejas (figurinhas / foto) fecha elas --- */
  document.addEventListener('click', e => {
    if (!$('emo').classList.contains('show') && !$('att').classList.contains('show')) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (path.some(n => n && n.id && ['emo', 'att', 'bEmo', 'bAtt'].includes(n.id))) return;
    closeTrays();
  });

  /* --- tela ampliada + teclado: o vídeo não encolhe e o chat cabe acima do teclado --- */
  const setFh = () => { if (!document.body.classList.contains('typing')) document.documentElement.style.setProperty('--fh', innerHeight + 'px'); };
  $('txt').addEventListener('focus', () => document.body.classList.add('typing'));
  $('txt').addEventListener('blur', () => { document.body.classList.remove('typing'); setTimeout(setFh, 400); });
  ['resize', 'orientationchange'].forEach(ev => addEventListener(ev, () => setTimeout(setFh, 150)));
  document.addEventListener('fullscreenchange', () => setTimeout(setFh, 300));
  setFh();
})();
/* ---------- Enter leva direto pro campo de mensagem (PC, chat aberto, sem ampliar) ----------
   Clicou em qualquer lugar do site e apertou Enter? Se o chat estiver aberto, o cursor já vai
   pro "Escreve aqui…". Não mexe na tela ampliada, nem se você já estiver digitando, nem se
   estiver com um botão selecionado (pra não disparar o botão sem querer). */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey || e.isComposing) return;
  const pad = document.getElementById('pad'), txt = document.getElementById('txt');
  if (!pad || !txt || !pad.classList.contains('open')) return;           // chat fechado
  if (document.body.classList.contains('imm')) return;                   // tela ampliada: fica como está
  const dlg = document.getElementById('dlg'), lb = document.getElementById('lb');
  if ((dlg && dlg.open) || (lb && lb.classList.contains('on'))) return;  // configurações ou foto aberta
  const a = document.activeElement;
  if (a && a !== document.body && a !== document.documentElement) return; // já está num campo ou botão
  e.preventDefault();
  txt.focus();
});
if (role) boot();
else{
  $('who').classList.add('on');
  $('who').querySelectorAll('button').forEach(b => b.onclick = () => { role = b.dataset.r; store.set('role', role); $('who').classList.remove('on'); boot(); });
}