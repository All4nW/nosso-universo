// hub-sons.js
// Sons do universo (hub 3D):
//   • som-espaco.mp3          -> ambiente, em loop suave (sem "corte" na emenda)
//   • som-coracao-batendo.mp3 -> o coração do hub BATE NO RITMO desse áudio (sincronizado)
//   • som-click-entrar        -> toca quando você toca num card e ele expande
//   • som-click-sair          -> toca quando você toca fora e o card volta
//
// Regras:
//   • começa no primeiro toque/clique na tela (o navegador não deixa tocar antes disso)
//   • ambiente e coração são baixinhos (ajuste os VOL_ logo abaixo)
//   • quando a música do player toca, ambiente e coração somem devagarinho (e voltam quando ela pausa)
//   • ao ENTRAR numa seção (ou sair do hub por qualquer caminho), todos os sons do hub cortam rápido
//   • a batida visual continua sincronizada mesmo quando o som está mudo

(function () {
'use strict';

/* ---------- AJUSTES ---------- */
const PASTA = 'assets/audio/hub-card/';
const ARQUIVO_ESPACO  = PASTA + 'som-espaco.mp3';
const ARQUIVO_CORACAO = PASTA + 'som-coracao-batendo.mp3';
const BASE_CLICK_ENTRAR = PASTA + 'som-click-entrar';   // a extensão é descoberta sozinha (.mp3, .wav, .ogg, .m4a)
const BASE_CLICK_SAIR   = PASTA + 'som-click-sair';
const VOL_ESPACO  = 0.16;     // 0 a 1 — ambiente
const VOL_CORACAO = 0.09;     // 0 a 1 — coração batendo (baixinho)
const VOL_CLICK   = 0.35;     // 0 a 1 — cliques de entrar/sair do card
const CHAVE = 'nossoUniversoAmbiente';   // guarda 'off' se a pessoa silenciar

let ctx = null, mestre = null, analyser = null, gEspaco = null, gCoracao = null, gClick = null;
let bufEspaco = null, bufCoracao = null, bufEntrar = null, bufSair = null, dados = null;
let iniciou = false, loopsIniciados = false, coracaoTocando = false;
let hubVisivel = false, musicaTocando = false, saindo = false;
let silenciado = false;
let proxInicio = 0, timerSaindo = 0;
let pico = 0.02, piso = 1, env = 0;
const historico = [];          // (tempo, nível) pra compensar o atraso da saída de áudio

try { silenciado = localStorage.getItem(CHAVE) === 'off'; } catch (e) { /* sem storage */ }

function naHome() {
    const h = location.hash;
    return h === '' || h === '#' || h === '#hub';
}

// ambiente/coração só tocam com o hub na tela, na página inicial, sem entrar numa seção e sem música tocando
function alvo() {
    return hubVisivel && naHome() && !saindo && !musicaTocando && !silenciado ? 1 : 0;
}

function aplicar() {
    if (!ctx || !mestre) return;
    const t = ctx.currentTime;
    const a = alvo();
    const saiuDoHome = !hubVisivel || !naHome() || saindo;
    mestre.gain.cancelScheduledValues(t);
    // saiu do hub: corta rápido (~0,4s). Música começou ou voltou ao hub: transição suave (~2s)
    mestre.gain.setTargetAtTime(a, t, a === 0 && saiuDoHome ? 0.12 : 0.7);
}

function carregar(url) {
    return fetch(url)
        .then((r) => { if (!r.ok) throw new Error(url + ' (' + r.status + ')'); return r.arrayBuffer(); })
        .then((ab) => new Promise((ok, erro) => ctx.decodeAudioData(ab, ok, erro)));
}

async function carregarBase(base) {
    const exts = ['mp3', 'wav', 'ogg', 'm4a'];
    for (let i = 0; i < exts.length; i++) {
        try { return await carregar(base + '.' + exts[i]); } catch (e) { /* tenta a próxima extensão */ }
    }
    console.warn('[HubSons] não achei o áudio:', base);
    return null;
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

// só começa os loops depois do primeiro toque E com os arquivos já carregados
function iniciarLoops() {
    if (loopsIniciados || !iniciou || !ctx) return;
    if (bufEspaco === undefined || bufCoracao === undefined) return;   // ainda carregando
    loopsIniciados = true;
    if (bufEspaco) {
        cicloEspaco(ctx.currentTime + 0.1);
        setInterval(() => {
            if (ctx && ctx.state === 'running' && ctx.currentTime >= proxInicio - 1.2) cicloEspaco(proxInicio);
        }, 400);
    }
    if (bufCoracao) iniciarCoracao();
    aplicar();
}

// prepara tudo já na abertura da página (o áudio fica "dormindo" até o primeiro toque)
function preparar() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    mestre = ctx.createGain();
    mestre.gain.value = 0;
    mestre.connect(ctx.destination);

    gEspaco = ctx.createGain();
    gEspaco.gain.value = VOL_ESPACO;
    gEspaco.connect(mestre);

    gCoracao = ctx.createGain();
    gCoracao.gain.value = VOL_CORACAO;
    gCoracao.connect(mestre);

    gClick = ctx.createGain();          // cliques vão direto pra saída: não somem quando a música toca
    gClick.gain.value = VOL_CLICK;
    gClick.connect(ctx.destination);

    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    dados = new Float32Array(analyser.fftSize);

    const falhou = (e) => { console.warn('[HubSons] não consegui carregar:', (e && e.message) || e); return null; };
    bufEspaco = undefined;
    bufCoracao = undefined;
    carregar(ARQUIVO_ESPACO).catch(falhou).then((b) => { bufEspaco = b; iniciarLoops(); });
    carregar(ARQUIVO_CORACAO).catch(falhou).then((b) => { bufCoracao = b; iniciarLoops(); });
    carregarBase(BASE_CLICK_ENTRAR).then((b) => { bufEntrar = b; });
    carregarBase(BASE_CLICK_SAIR).then((b) => { bufSair = b; });
}

function iniciar() {
    if (iniciou || !ctx) return;
    iniciou = true;
    ctx.resume().catch(() => {});
    iniciarLoops();
}

function tocarClick(buf) {
    if (!ctx || !iniciou || !buf || silenciado || !hubVisivel || !naHome()) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gClick);
    src.start();
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

try { preparar(); } catch (e) { console.warn('[HubSons] áudio indisponível:', e); }

// primeiro toque/tecla: libera o áudio
['pointerdown', 'touchstart', 'keydown'].forEach((ev) => {
    window.addEventListener(ev, iniciar, { once: true, capture: true, passive: true });
});

// o player de música avisa quando toca/pausa (menu.js)
window.addEventListener('nosso:musica', (e) => {
    musicaTocando = !!(e.detail && e.detail.tocando);
    aplicar();
});

// trocou de página (hash): se saiu do hub, corta os sons do hub
window.addEventListener('hashchange', aplicar);

// aba escondida: pausa o motor de áudio (economiza bateria)
document.addEventListener('visibilitychange', () => {
    if (!ctx || !iniciou) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
});

window.HubSons = {
    // o hub 3D avisa aqui o que acontece (visivel, selecionar, soltar, entrar...)
    evento(nome, d) {
        if (nome === 'visivel') {
            hubVisivel = !!(d && d.sim);
            if (hubVisivel) { saindo = false; clearTimeout(timerSaindo); }
            aplicar();
        } else if (nome === 'selecionar') {
            tocarClick(bufEntrar);                     // card expandiu
        } else if (nome === 'soltar') {
            tocarClick(bufSair);                       // tocou fora: card voltou
        } else if (nome === 'entrar') {
            saindo = true;                             // entrando numa seção: corta ambiente e coração já
            aplicar();
            clearTimeout(timerSaindo);
            timerSaindo = setTimeout(() => { saindo = false; aplicar(); }, 4500);   // se a seção não abrir, volta
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