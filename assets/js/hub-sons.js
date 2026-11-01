// hub-sons.js
// Sons ambiente do universo (hub 3D):
//   • som-espaco.mp3          -> ambiente, em loop suave (sem "corte" na emenda)
//   • som-coracao-batendo.mp3 -> o coração do hub BATE NO RITMO desse áudio (sincronizado)
//
// Regras:
//   • começa no primeiro toque/clique na tela (o navegador não deixa tocar antes disso)
//   • bem baixinho (ajuste VOL_ESPACO e VOL_CORACAO logo abaixo)
//   • quando a música do player toca, os sons ambiente somem devagarinho (e voltam quando ela pausa)
//   • só tocam enquanto o hub está na tela; ao entrar numa seção, somem
//   • a batida visual continua sincronizada mesmo quando o som está mudo

(function () {
'use strict';

/* ---------- AJUSTES ---------- */
const ARQUIVO_ESPACO  = 'assets/audio/hub-card/som-espaco.mp3';
const ARQUIVO_CORACAO = 'assets/audio/hub-card/som-coracao-batendo.mp3';
const VOL_ESPACO  = 0.10;     // 0 a 1 — baixinho, só pra "sentir" o ambiente
const VOL_CORACAO = 0.12;     // 0 a 1 — dá pra perceber sem incomodar
const CHAVE = 'nossoUniversoAmbiente';   // guarda 'off' se a pessoa silenciar

let ctx = null, mestre = null, analyser = null, gEspaco = null, gCoracao = null;
let bufEspaco = null, bufCoracao = null, dados = null;
let iniciou = false, coracaoTocando = false;
let hubVisivel = false, musicaTocando = false;
let silenciado = false;
let proxInicio = 0;
let pico = 0.02, piso = 1, env = 0;
const historico = [];          // (tempo, nível) pra compensar o atraso da saída de áudio

try { silenciado = localStorage.getItem(CHAVE) === 'off'; } catch (e) { /* sem storage */ }

function alvo() {
    return hubVisivel && !musicaTocando && !silenciado ? 1 : 0;
}

function aplicar() {
    if (!ctx || !mestre) return;
    const t = ctx.currentTime;
    mestre.gain.cancelScheduledValues(t);
    mestre.gain.setTargetAtTime(alvo(), t, 0.7);      // sobe/desce em ~2 segundos, bem suave
}

function carregar(url) {
    return fetch(url)
        .then((r) => { if (!r.ok) throw new Error(url + ' (' + r.status + ')'); return r.arrayBuffer(); })
        .then((ab) => new Promise((ok, erro) => ctx.decodeAudioData(ab, ok, erro)));
}

// ambiente: cada volta nasce enquanto a anterior ainda está sumindo (emenda invisível)
function cicloEspaco(inicio) {
    const dur = bufEspaco.duration;
    const fade = Math.min(2.5, dur * 0.2);
    const src = ctx.createBufferSource();
    src.buffer = bufEspaco;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, inicio);
    g.gain.linearRampToValueAtTime(1, inicio + fade);
    g.gain.setValueAtTime(1, inicio + dur - fade);
    g.gain.linearRampToValueAtTime(0, inicio + dur);
    src.connect(g);
    g.connect(gEspaco);
    src.start(inicio);
    src.stop(inicio + dur + 0.1);
    proxInicio = inicio + dur - fade;
}

function iniciarCoracao() {
    const src = ctx.createBufferSource();
    src.buffer = bufCoracao;
    src.loop = true;
    src.connect(analyser);            // o "medidor" fica ANTES do volume: a animação não depende do quão baixo está o som
    analyser.connect(gCoracao);
    src.start();
    coracaoTocando = true;
}

async function iniciar() {
    if (iniciou) return;
    iniciou = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    ctx = new AC();
    ctx.resume().catch(() => {});

    mestre = ctx.createGain();
    mestre.gain.value = 0;
    mestre.connect(ctx.destination);

    gEspaco = ctx.createGain();
    gEspaco.gain.value = VOL_ESPACO;
    gEspaco.connect(mestre);

    gCoracao = ctx.createGain();
    gCoracao.gain.value = VOL_CORACAO;
    gCoracao.connect(mestre);

    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    dados = new Float32Array(analyser.fftSize);

    const falhou = (e) => { console.warn('[HubSons] não consegui carregar:', e.message || e); return null; };
    const r = await Promise.all([carregar(ARQUIVO_ESPACO).catch(falhou), carregar(ARQUIVO_CORACAO).catch(falhou)]);
    bufEspaco = r[0];
    bufCoracao = r[1];

    if (bufEspaco) {
        cicloEspaco(ctx.currentTime + 0.1);
        setInterval(() => {
            if (ctx && ctx.state === 'running' && ctx.currentTime >= proxInicio - 1.2) cicloEspaco(proxInicio);
        }, 400);
    }
    if (bufCoracao) iniciarCoracao();
    aplicar();
}

// nível da batida (0 a 1) lido DO PRÓPRIO ÁUDIO; -1 = sem áudio ainda (a animação usa o relógio dela)
function nivelCoracao(dt) {
    if (!coracaoTocando || !ctx || ctx.state !== 'running') return -1;

    analyser.getFloatTimeDomainData(dados);
    let s = 0;
    for (let i = 0; i < dados.length; i++) s += dados[i] * dados[i];
    const rms = Math.sqrt(s / dados.length);

    pico = Math.max(rms, pico * Math.pow(0.5, dt / 10));   // "teto": desce devagar
    piso = Math.min(rms, piso + 0.0004 * dt);               // "chão": sobe devagar
    const n = Math.min(1, Math.max(0, (rms - piso) / Math.max(0.003, pico - piso)));
    env = Math.max(n, env - dt * 6);                         // sobe na hora, desce suave

    // fones bluetooth demoram a tocar: atrasa o visual pelo mesmo tempo, pra ficar junto do que se ouve
    const agora = performance.now() / 1000;
    historico.push([agora, env]);
    const atraso = Math.min(0.35, (ctx.outputLatency || 0) + (ctx.baseLatency || 0));
    const quando = agora - atraso;
    while (historico.length > 2 && historico[1][0] <= quando) historico.shift();
    return Math.pow(historico[0][1], 1.25);
}

/* ---------- ligações com o resto do site ---------- */

// primeiro toque/tecla: libera o áudio
['pointerdown', 'touchstart', 'keydown'].forEach((ev) => {
    window.addEventListener(ev, iniciar, { once: true, capture: true, passive: true });
});

// o player de música avisa quando toca/pausa (menu.js)
window.addEventListener('nosso:musica', (e) => {
    musicaTocando = !!(e.detail && e.detail.tocando);
    aplicar();
});

// aba escondida: pausa o motor de áudio (economiza bateria)
document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
});

window.HubSons = {
    // o hub 3D avisa aqui o que acontece (visivel, selecionar, entrar...)
    evento(nome, d) {
        if (nome === 'visivel') {
            hubVisivel = !!(d && d.sim);
            aplicar();
        }
    },
    nivelCoracao: nivelCoracao,
    silenciar(sim) {
        silenciado = !!sim;
        try { localStorage.setItem(CHAVE, silenciado ? 'off' : 'on'); } catch (e) { /* sem storage */ }
        aplicar();
    },
    alternar() { this.silenciar(!silenciado); return silenciado; },
    get silenciado() { return silenciado; }
};

})();