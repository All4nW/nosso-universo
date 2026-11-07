// caixa-cartas.js
// A caixinha 3D que é a "porta" das Cartas.
//
//   Quando você escolhe o card "Cartas" no hub, em vez do mergulho de estrelas aparece esta caixa:
//   • dá pra GIRAR (arrastar) e dar ZOOM (pinça / rolagem)
//   • tocar na caixa → a tampa abre e as cartinhas aparecem lá dentro
//   • tocar nas cartas → elas sobem pela metade, a câmera mergulha na caixa e você entra nas Cartas (#cartas)
//   • tocar fora (com a caixa aberta) → fecha a tampa · botão "voltar" (ou Esc) → volta pro universo
//
//   CaixaCartas.abrir({ aoEntrar, aoCobrirHub, aoEvento })
//     aoEntrar()        chamada na hora de entrar nas Cartas (normalmente: location.hash = '#cartas')
//     aoCobrirHub(sim)  esconde/mostra o hub 3D por baixo (economiza bateria)
//     aoEvento(nome)    gancho pra sons: 'abrir-caixa' · 'fechar-caixa' · 'entrar-cartas' · 'voltar'
//   Tudo que a caixa precisa (estilos, cena 3D) está neste arquivo só.

(function () {
'use strict';

/* ---------- AJUSTES ---------- */
const TEXTO_TAMPA = ['Nossas cartas', 'e bilhetinhos']; // escrito na parte de dentro da tampa
const NUM_CARTAS = 6;                                                          // quantas cartinhas aparecem dentro
const COR_FUNDO = '#12050f';                                                   // cor do fundo da página de Cartas
const DICA_FECHADA_TOQUE = 'toque na caixinha para abrir · arraste para girar ✦';
const DICA_FECHADA_CLIQUE = 'clique na caixinha para abrir · arraste para girar ✦';
const DICA_ABERTA = 'toque nas cartas para entrar · toque fora para fechar ✦';

let atual = null;
let estilosOk = false;

const ESTILOS = [
    '.caixa-overlay{position:fixed;inset:0;z-index:90;overflow:hidden;opacity:0;transition:opacity .5s ease;',
    '  background:radial-gradient(ellipse 70% 55% at 50% 40%,#4b1239 0%,#26091f 48%,' + COR_FUNDO + ' 100%);',
    '  touch-action:none;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}',
    '.caixa-overlay.visivel{opacity:1}',
    '.caixa-overlay.saindo{opacity:0;pointer-events:none;transition:opacity .8s ease}',
    '.caixa-overlay.saindo-rapido{opacity:0;pointer-events:none;transition:opacity .45s ease}',
    '.caixa-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}',
    '.caixa-canvas:active{cursor:grabbing}',
    '.caixa-dica{position:absolute;left:0;right:0;bottom:calc(58px + env(safe-area-inset-bottom,0px));margin:0;padding:0 18px;',
    "  text-align:center;font:400 .8rem/1.3 'Patrick Hand','Montserrat',cursive;color:rgba(255,226,241,.78);",
    '  text-shadow:0 0 10px #12050f,0 0 3px #12050f;pointer-events:none;opacity:0;transition:opacity .6s ease}',
    '.caixa-voltar{all:unset;box-sizing:border-box;position:absolute;top:calc(20px + env(safe-area-inset-top,0px));right:16px;',
    "  display:flex;align-items:center;gap:6px;height:40px;padding:0 18px 0 14px;border-radius:999px;cursor:pointer;",
    "  font:400 1.02rem/1 'Patrick Hand','Montserrat',cursive;color:rgb(74,29,107);",
    '  background:radial-gradient(circle at 24% 26%,rgba(255,255,255,.55) 0 10%,transparent 11%),#ffb3d9;',
    '  box-shadow:0 4px 0 rgba(20,6,42,.62),0 0 18px -2px #ffb3d9;',
    '  transition:transform .3s cubic-bezier(.3,1.9,.5,1);-webkit-tap-highlight-color:transparent}',
    '.caixa-voltar span{font-size:1.5rem;line-height:.8;margin-top:-2px}',
    '.caixa-voltar:hover{transform:translateY(-2px) rotate(-3deg)}',
    '.caixa-voltar:active{transform:scale(1.1,.86)}',
    '.caixa-voltar:focus-visible{outline:2px solid #fff;outline-offset:3px}',
    '.caixa-cobertura{position:absolute;inset:0;background:' + COR_FUNDO + ';opacity:0;pointer-events:none;transition:opacity .6s ease}'
].join('\n');

const ESTILOS_REVELA = [
    '.caixa-overlay{background:none!important}',
    '.caixa-fundo{position:absolute;inset:0;pointer-events:none;',
    '  background:radial-gradient(ellipse 70% 55% at 50% 40%,#4b1239 0%,#26091f 48%,' + COR_FUNDO + ' 100%)}',
    '.caixa-anel{position:absolute;left:0;top:0;width:0;height:0;border-radius:50%;pointer-events:none;opacity:0;',
    '  transform:translate(-50%,-50%);border:2px solid rgba(255,190,225,.85);',
    '  box-shadow:0 0 36px 6px rgba(255,140,200,.55),inset 0 0 36px 6px rgba(255,140,200,.35)}',
    // a página de cartas "brota" da boca da caixa
    'body.caixa-revelando .view[data-view="cartas"] .cartas-colecao{overflow:visible!important;-webkit-mask-image:none!important;mask-image:none!important}',
    'body.caixa-revelando .carta-envelope{animation:caixa-brota 1s cubic-bezier(.2,1.15,.3,1) var(--bd,0s) backwards,',
    '  envelope-flutuar var(--flutuar-duracao,7s) ease-in-out var(--flutuar-delay,0s) infinite}',
    'body.caixa-revelando .bilhete{animation:caixa-brota 1s cubic-bezier(.2,1.15,.3,1) var(--bd,0s) backwards}',
    'body.caixa-revelando .cartas-intro,body.caixa-revelando .cartas-filtros,body.caixa-revelando .cartas-secao-cabecalho{',
    '  animation:caixa-sobe .9s ease var(--bd,0s) backwards}',
    '@keyframes caixa-brota{from{opacity:0;transform:translate(var(--bx,0px),var(--by,0px)) scale(.12) rotate(-24deg)}60%{opacity:1}}',
    '@keyframes caixa-sobe{from{opacity:0;transform:translateY(26px) scale(.96)}}'
].join('\n');

function injetarEstilos() {
    if (estilosOk) return;
    estilosOk = true;
    const s = document.createElement('style');
    s.id = 'caixa-cartas-estilos';
    s.textContent = ESTILOS + '\n' + ESTILOS_REVELA;
    document.head.appendChild(s);
}

let abrindo = false;

function esperarFonte() {
    if (!(document.fonts && document.fonts.load)) return Promise.resolve();
    return Promise.race([
        document.fonts.load('42px "Caveat Brush"'),
        new Promise((r) => setTimeout(r, 700))
    ]).catch(() => {});
}

// lê o letters.json (o mesmo da página de cartas): quantas cartas e bilhetinhos existem e de quem são
async function lerInfoCartas() {
    try {
        const r = await Promise.race([
            fetch('assets/data/letters.json', { cache: 'no-cache' }),
            new Promise((_, no) => setTimeout(() => no(new Error('demorou')), 900))
        ]);
        if (!r.ok) return null;
        const itens = await r.json();
        if (!Array.isArray(itens)) return null;
        const bilhetes = itens.filter((i) => i && i.tipo === 'bilhete');
        const cartas = itens
            .filter((i) => i && i.tipo !== 'bilhete')
            .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));   // as mais novas primeiro
        return { cartas: cartas, nCartas: cartas.length, nBilhetes: bilhetes.length };
    } catch (e) {
        return null;
    }
}

function abrir(opts) {
    if (atual || abrindo) return;
    opts = opts || {};
    const T = window.THREE;
    if (!T) { if (opts.aoEntrar) opts.aoEntrar(); return; }
    abrindo = true;
    Promise.all([lerInfoCartas(), esperarFonte()]).then((res) => {
        abrindo = false;
        if (atual) return;
        try {
            atual = montar(T, opts, res[0]);
        } catch (e) {
            // sem WebGL (ou qualquer problema): entra direto nas cartas, sem a caixinha
            console.warn('[CaixaCartas] não deu pra montar a caixa:', e);
            atual = null;
            if (opts.aoEntrar) opts.aoEntrar();
        }
    });
}

function fechar() { if (atual) atual.voltar(); }
function aberta() { return !!atual; }


/* =========================================================
   A CAIXA
   ========================================================= */

function montar(T, opts, info) {
    const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 768;
    const REDUZIR = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (l) => l[Math.floor(Math.random() * l.length)];
    const evento = (nome) => { try { if (opts.aoEvento) opts.aoEvento(nome, {}); } catch (e) { console.warn('aoEvento:', e); } };
    const timers = [];
    const depois = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

    injetarEstilos();

    /* ---------- DOM ---------- */
    const overlay = document.createElement('div');
    overlay.className = 'caixa-overlay';
    overlay.innerHTML =
        '<div class="caixa-fundo"></div>' +
        '<canvas class="caixa-canvas"></canvas>' +
        '<div class="caixa-anel"></div>' +
        '<button type="button" class="caixa-voltar" aria-label="Voltar ao universo"><span>‹</span>voltar</button>' +
        '<p class="caixa-dica"></p>' +
        '<div class="caixa-cobertura"></div>';
    document.body.appendChild(overlay);
    const canvas = overlay.querySelector('.caixa-canvas');
    const elDica = overlay.querySelector('.caixa-dica');
    const elCobertura = overlay.querySelector('.caixa-cobertura');
    const botaoVoltar = overlay.querySelector('.caixa-voltar');

    let renderer;
    try {
        renderer = new T.WebGLRenderer({ canvas: canvas, antialias: !MOBILE, alpha: true });
    } catch (e) {
        overlay.remove();
        throw e;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
        renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    const DPR = renderer.getPixelRatio();

    /* ---------- texturas desenhadas na hora ---------- */
    function novoCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function viraTextura(c) {
        const t = new T.CanvasTexture(c);
        t.generateMipmaps = false;
        t.minFilter = T.LinearFilter;
        t.magFilter = T.LinearFilter;
        return t;
    }
    function caminhoCoracao(g, cx, cy, s) {
        g.beginPath();
        for (let i = 0; i <= 90; i++) {
            const t = (i / 90) * Math.PI * 2;
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            if (i === 0) g.moveTo(cx + x * s, cy + y * s);
            else g.lineTo(cx + x * s, cy + y * s);
        }
        g.closePath();
    }
    function texCoracao(cor, brilho) {
        const c = novoCanvas(128, 128), g = c.getContext('2d');
        g.shadowColor = brilho || cor;
        g.shadowBlur = 10;
        g.fillStyle = cor;
        caminhoCoracao(g, 64, 56, 3.1);
        g.fill();
        return viraTextura(c);
    }
    function texBrilhoRosa(rgb, a) {
        const c = novoCanvas(256, 256), g = c.getContext('2d');
        const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
        gr.addColorStop(0.45, 'rgba(' + rgb + ',' + (a * 0.35) + ')');
        gr.addColorStop(1, 'rgba(' + rgb + ',0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 256, 256);
        return viraTextura(c);
    }
    function rr(g, x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
    }
    // estrelinha de 4 pontas (brilho de cinema)
    function texCruz() {
        const c = novoCanvas(128, 128), g = c.getContext('2d');
        g.translate(64, 64);
        [0, Math.PI / 2].forEach((a) => {
            g.save();
            g.rotate(a);
            const gr = g.createLinearGradient(-64, 0, 64, 0);
            gr.addColorStop(0, 'rgba(255,255,255,0)');
            gr.addColorStop(0.5, 'rgba(255,255,255,1)');
            gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr;
            g.beginPath();
            g.ellipse(0, 0, 64, 4.5, 0, 0, Math.PI * 2);
            g.fill();
            g.restore();
        });
        const r = g.createRadialGradient(0, 0, 0, 0, 0, 16);
        r.addColorStop(0, 'rgba(255,255,255,1)');
        r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r;
        g.fillRect(-16, -16, 32, 32);
        return viraTextura(c);
    }
    // envelopezinho que flutua pelo cenário
    function texEnvelopinho() {
        const c = novoCanvas(160, 120), g = c.getContext('2d');
        g.shadowColor = 'rgba(255,140,200,0.6)';
        g.shadowBlur = 12;
        g.fillStyle = '#fadcd9';
        rr(g, 14, 20, 132, 86, 8);
        g.fill();
        g.shadowColor = 'transparent';
        g.fillStyle = '#efc3cf';
        g.beginPath();
        g.moveTo(14, 26); g.lineTo(146, 26); g.lineTo(80, 72);
        g.closePath();
        g.fill();
        g.fillStyle = '#d6487f';
        caminhoCoracao(g, 80, 68, 1.5);
        g.fill();
        return viraTextura(c);
    }
    // feixe de luz que sobe da boca da caixa (mais forte embaixo, some em cima)
    function texFeixe() {
        const c = novoCanvas(128, 256), g = c.getContext('2d');
        const h = g.createLinearGradient(0, 0, 128, 0);
        h.addColorStop(0, 'rgba(255,190,225,0)');
        h.addColorStop(0.5, 'rgba(255,200,230,0.9)');
        h.addColorStop(1, 'rgba(255,190,225,0)');
        g.fillStyle = h;
        g.fillRect(0, 0, 128, 256);
        g.globalCompositeOperation = 'destination-in';
        const v = g.createLinearGradient(0, 0, 0, 256);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,1)');
        g.fillStyle = v;
        g.fillRect(0, 0, 128, 256);
        return viraTextura(c);
    }
    // selinho de cera: coração rosa (Jhennyfer) ou estrela índigo (Allan), igual aos envelopes da página de cartas
    function texSelo(tipo) {
        const c = novoCanvas(256, 256), g = c.getContext('2d');
        const cores = tipo === 'star' ? ['#8a90ee', '#4a4fb8'] : ['#ff80b9', '#c22a7a'];
        const gr = g.createRadialGradient(96, 88, 10, 128, 128, 122);
        gr.addColorStop(0, cores[0]);
        gr.addColorStop(1, cores[1]);
        g.shadowColor = 'rgba(0,0,0,0.35)';
        g.shadowBlur = 14;
        g.shadowOffsetY = 4;
        g.fillStyle = gr;
        g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.fill();
        g.shadowColor = 'transparent';
        g.lineWidth = 7;
        g.strokeStyle = 'rgba(255,255,255,0.28)';
        g.beginPath(); g.arc(128, 128, 88, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#ffffff';
        if (tipo === 'star') {
            g.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = -Math.PI / 2 + (i * Math.PI) / 5;
                const r = i % 2 === 0 ? 52 : 23;
                const x = 128 + Math.cos(a) * r, y = 132 + Math.sin(a) * r;
                if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.closePath();
            g.fill();
        } else {
            caminhoCoracao(g, 128, 118, 3.9);
            g.fill();
        }
        return viraTextura(c);
    }

        // forro da caixa: papel rosa com listras suaves e corações miudinhos (tipo papel de presente)
    function texForro() {
        const c = novoCanvas(256, 256), g = c.getContext('2d');
        g.fillStyle = '#f4a9c9';
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 32, 256);
        for (let fila = 0; fila < 4; fila++) {
            for (let col = 0; col < 4; col++) {
                const x = col * 64 + (fila % 2 ? 32 : 0) + 16;
                const y = fila * 64 + 32;
                g.fillStyle = fila % 2 ? 'rgba(255,255,255,0.7)' : 'rgba(214,72,127,0.6)';
                caminhoCoracao(g, x, y, 0.7);
                g.fill();
            }
        }
        g.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 16; i++) {
            g.beginPath();
            g.arc((i % 4) * 64 + 48, Math.floor(i / 4) * 64 + 64, 2.2, 0, Math.PI * 2);
            g.fill();
        }
        const t = viraTextura(c);
        t.wrapS = t.wrapT = T.RepeatWrapping;
        t.repeat.set(4, 3);
        t.generateMipmaps = true;
        t.minFilter = T.LinearMipmapLinearFilter;
        t.anisotropy = 4;
        return t;
    }


    // recado dentro da tampa
    const cPainel = novoCanvas(512, 360);
    function desenharPainel() {
        const g = cPainel.getContext('2d');
        g.fillStyle = '#ffd6e6';
        g.fillRect(0, 0, 512, 360);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 0; i < 18; i++) {
            g.beginPath();
            g.arc((i * 97) % 512, (i * 53) % 360, 6 + (i % 4) * 3, 0, Math.PI * 2);
            g.fill();
        }
        g.lineWidth = 12;
        g.strokeStyle = '#f0589a';
        g.fillStyle = '#ffffff';
        caminhoCoracao(g, 256, 172, 9);
        g.fill();
        g.stroke();
        g.fillStyle = '#d6487f';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        function linha(txt, tamIni, maxLarg, y) {
            let f = tamIni;
            g.font = f + 'px "Caveat Brush", "Caveat", "Patrick Hand", cursive';
            while (g.measureText(txt).width > maxLarg && f > 22) {
                f -= 2;
                g.font = f + 'px "Caveat Brush", "Caveat", "Patrick Hand", cursive';
            }
            g.fillText(txt, 256, y);
        }
        linha(TEXTO_TAMPA[0], 62, 250, 138);
        linha(TEXTO_TAMPA[1], 50, 200, 196);
    }
    desenharPainel();
    const texPainel = viraTextura(cPainel);
    if (document.fonts && document.fonts.load) {
        Promise.race([document.fonts.load('42px "Caveat Brush"'), new Promise((r) => setTimeout(r, 900))])
            .then(() => { desenharPainel(); texPainel.needsUpdate = true; })
            .catch(() => {});
    }

    /* ---------- cena, câmera, órbita ---------- */
    const cena = new T.Scene();
    const camera = new T.PerspectiveCamera(38, 1, 0.1, 200);
    const alvo = new T.Vector3(0, 1.5, 0);
    const alvoEntrada = new T.Vector3(0, 2.5, 0.2);
    const orb = {
        theta: 0.5, phi: 1.1, dist: 15, base: 15, vTheta: 0, arrastando: false, ultima: 0,
        min: 8, max: 30, phiMin: 0.5, phiMax: 1.5, auto: REDUZIR ? 0 : 0.16, zoomou: false
    };
    function posicionarCamera() {
        const sp = Math.sin(orb.phi);
        camera.position.set(
            alvo.x + orb.dist * sp * Math.sin(orb.theta),
            alvo.y + orb.dist * Math.cos(orb.phi),
            alvo.z + orb.dist * sp * Math.cos(orb.theta)
        );
        camera.lookAt(alvo);
    }
    function passoOrbita(dt) {
        if (!orb.arrastando) {
            orb.theta += orb.vTheta * dt;
            orb.vTheta *= Math.pow(0.05, dt);
            if (orb.auto && performance.now() - orb.ultima > 2500) orb.theta += dt * orb.auto;
        }
        orb.phi = clamp(orb.phi, orb.phiMin, orb.phiMax);
        orb.dist = clamp(orb.dist, orb.min, orb.max);
    }

    /* ---------- estado ---------- */
    let tempo = 0, c = 0, velC = 0, introBurst = false;
    let aberta = false, abertura = 0, velAb = 0, tConfete = 99, entrando = false, destruido = false;
    let rafId = 0, ultimo = 0, aspecto = 1, proxAmbiente = 0.4, tOnda = 99;
    const tmp2 = new T.Vector3(), tmp3 = new T.Vector3();
    const subindo = [];
    const tmp = new T.Vector3();

    /* ---------- luzes ---------- */
cena.add(new T.HemisphereLight(0xffe6f1, 0x7a2a5a, 0.5));
const sol = new T.DirectionalLight(0xffffff, 0.65);
    sol.position.set(4, 9, 6);

        sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.camera.left = -6;
    sol.shadow.camera.right = 6;
    sol.shadow.camera.top = 6;
    sol.shadow.camera.bottom = -6;
    sol.shadow.camera.near = 1;
    sol.shadow.camera.far = 30;
    sol.shadow.bias = -0.0006;
    sol.shadow.normalBias = 0.02;
    cena.add(sol);
const luzRosa = new T.DirectionalLight(0xff9cc9, 0.3);
    luzRosa.position.set(-6, 3, -4);
    cena.add(luzRosa);
    const luzDentro = new T.PointLight(0xff9cc9, 0, 9);
  luzDentro.position.set(0, 2.7, 0.4);
    cena.add(luzDentro);

    /* ---------- chão: poça de luz rosa + sombrinha ---------- */
    const chao = new T.Group();
    cena.add(chao);
    const luzChao = new T.Mesh(new T.PlaneGeometry(17, 17), new T.MeshBasicMaterial({ map: texBrilhoRosa('255,110,180', 0.5), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    luzChao.rotation.x = -Math.PI / 2;
    luzChao.position.y = 0.01;
    chao.add(luzChao);
    const csh = novoCanvas(128, 128), gsh = csh.getContext('2d');
    const grsh = gsh.createRadialGradient(64, 64, 0, 64, 64, 64);
    grsh.addColorStop(0, 'rgba(8,0,10,0.7)');
    grsh.addColorStop(1, 'rgba(8,0,10,0)');
    gsh.fillStyle = grsh;
    gsh.fillRect(0, 0, 128, 128);
    const sombra = new T.Mesh(new T.PlaneGeometry(8, 6), new T.MeshBasicMaterial({ map: viraTextura(csh), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.02;
    chao.add(sombra);

    /* ---------- a caixa ---------- */
    const W = 4, D = 2.8, H = 2.2, E = 0.14;
    const branco = new T.MeshStandardMaterial({ color: 0xfff4f7, roughness: 0.42 });
       const interior = new T.MeshStandardMaterial({ map: texForro(), roughness: 0.85 });
    const rosa = new T.MeshStandardMaterial({ color: 0xf06a9f, roughness: 0.4 });

    const caixa = new T.Group();
    cena.add(caixa);

    function painel(w, hh, d, x, y, z, faceInterna) {
        const mats = [branco, branco, branco, branco, branco, branco];
        if (faceInterna !== undefined) mats[faceInterna] = interior;
        const m = new T.Mesh(new T.BoxGeometry(w, hh, d), mats);
        m.position.set(x, y, z);
        caixa.add(m);
        return m;
    }
    painel(W, E, D, 0, E / 2, 0, 2);
    painel(W, H, E, 0, H / 2, D / 2 - E / 2, 5);
    painel(W, H, E, 0, H / 2, -D / 2 + E / 2, 4);
    painel(E, H, D - 2 * E, -W / 2 + E / 2, H / 2, 0, 0);
    painel(E, H, D - 2 * E, W / 2 - E / 2, H / 2, 0, 1);

    // fita rosa na frente + os dois selinhos (estrela = Allan · coração = Jhennyfer)
    const fitaF = new T.Mesh(new T.BoxGeometry(0.55, H + 0.02, 0.03), rosa);
    fitaF.position.set(0, H / 2, D / 2 + 0.015);
    caixa.add(fitaF);
    [['star', -1.3], ['heart', 1.3]].forEach((s) => {
        const m = new T.Mesh(new T.PlaneGeometry(0.95, 0.95), new T.MeshBasicMaterial({ map: texSelo(s[0]), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
        m.position.set(s[1], H * 0.48, D / 2 + 0.012);
        caixa.add(m);
    });

    // tampa (gira em volta da dobradiça, atrás)
    const tampa = new T.Group();
    tampa.position.set(0, H, -D / 2);
    tampa.userData = { tipo: 'tampa' };
    caixa.add(tampa);
    const WL = W + 0.26, DL = D + 0.18, ZC = D / 2 + 0.04;
    const topo = new T.Mesh(new T.BoxGeometry(WL, 0.16, DL), [branco, branco, branco, interior, branco, branco]);
    topo.position.set(0, 0.08, ZC);
    tampa.add(topo);
    const labioF = new T.Mesh(new T.BoxGeometry(WL, 0.46, 0.1), branco);
    labioF.position.set(0, -0.07, D + 0.08);
    tampa.add(labioF);
    [-1, 1].forEach((lado) => {
        const lb = new T.Mesh(new T.BoxGeometry(0.1, 0.46, DL), branco);
        lb.position.set(lado * (W / 2 + 0.08), -0.07, ZC);
        tampa.add(lb);
    });
    const fitaTopo = new T.Mesh(new T.BoxGeometry(0.55, 0.03, DL), rosa);
    fitaTopo.position.set(0, 0.175, ZC);
    tampa.add(fitaTopo);
    const fitaLabio = new T.Mesh(new T.BoxGeometry(0.55, 0.46, 0.03), rosa);
    fitaLabio.position.set(0, -0.07, D + 0.145);
    tampa.add(fitaLabio);
    [-1, 1].forEach((lado) => {
        const lc = new T.Mesh(new T.SphereGeometry(0.34, 20, 14), rosa);
        lc.scale.set(1.2, 0.5, 0.7);
        lc.position.set(lado * 0.42, 0.28, ZC);
        lc.rotation.z = lado * 0.35;
        tampa.add(lc);
    });
    const nozinho = new T.Mesh(new T.SphereGeometry(0.17, 16, 12), rosa);
    nozinho.position.set(0, 0.26, ZC);
    tampa.add(nozinho);
    const recado = new T.Mesh(new T.PlaneGeometry(W - 0.2, D - 0.1), new T.MeshBasicMaterial({ map: texPainel }));
    recado.rotation.x = Math.PI / 2;
    recado.position.set(0, -0.004, ZC);
    tampa.add(recado);

    /* ---------- as cartinhas lá dentro ---------- */
const Y_FECHADA = 0, Y_ABERTA = 0.45, Y_SAI = 1.2;     // altura da base de cada carta (a borda da caixa fica em 2.2)
    const CORES_CARTA = [0xfadcd9, 0xf6cfdc, 0xefc3cf, 0xf3d6e8, 0xe8d3f4];
    const CORES_ABA = [0xeeb9c3, 0xe9afc6, 0xe3a8bd, 0xe6b9d6, 0xd2b6e6];

        // etiquetinha com o nome de quem escreveu, colada no cantinho da carta
    function texEtiqueta(nome) {
        const c = novoCanvas(256, 112), g = c.getContext('2d');
        g.shadowColor = 'rgba(0,0,0,0.3)';
        g.shadowBlur = 8;
        g.shadowOffsetY = 3;
        g.fillStyle = '#fff8f6';
        g.beginPath();
        g.moveTo(40, 12); g.lineTo(240, 12); g.lineTo(240, 100); g.lineTo(40, 100); g.lineTo(12, 56);
        g.closePath();
        g.fill();
        g.shadowColor = 'transparent';
        g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(40, 56, 7, 0, Math.PI * 2); g.fill();     // furinho do barbante
        g.globalCompositeOperation = 'source-over';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#b53a73';
        let f = 46;
        const fonte = (n) => n + 'px "Caveat Brush", "Caveat", "Patrick Hand", cursive';
        g.font = fonte(f);
        while (g.measureText(nome).width > 160 && f > 22) { f -= 2; g.font = fonte(f); }
        g.fillText(nome, 146, 58);
        return viraTextura(c);
    }


    function criarCarta(i, autor) {
        const w = 1.2, h = 0.82;
        const g = new T.Group();
        const folha = new T.Mesh(new T.BoxGeometry(w * 0.88, 0.22, 0.02), new T.MeshStandardMaterial({ color: 0xfff8f6, roughness: 0.7 }));
        folha.position.set(0, h + 0.07, -0.03);                  // papelzinho pautado espiando por trás
        g.add(folha);
        const corpo = new T.Mesh(new T.BoxGeometry(w, h, 0.05), new T.MeshStandardMaterial({ color: (autor === 'eu' ? 0x9aa6f2 : 0xf4a3c6), roughness: 0.6 }));
        corpo.position.y = h / 2;
        g.add(corpo);
        const forma = new T.Shape();
        forma.moveTo(-w / 2, 0);
        forma.lineTo(w / 2, 0);
        forma.lineTo(0, -h * 0.6);
        forma.closePath();
        const aba = new T.Mesh(new T.ShapeGeometry(forma), new T.MeshStandardMaterial({ color: (autor === 'eu' ? 0x7f8cdc : 0xe07fa9), roughness: 0.6, side: T.DoubleSide }));
        aba.position.set(0, h, 0.027);
        g.add(aba);
        const selo = new T.Mesh(new T.CircleGeometry(0.14, 28), new T.MeshBasicMaterial({ map: texSelo(autor === 'eu' ? 'star' : 'heart'), transparent: true }));
        selo.position.set(0, h - h * 0.6 + 0.03, 0.034);
        g.add(selo);
                const etiqueta = new T.Mesh(new T.PlaneGeometry(0.5, 0.22), new T.MeshBasicMaterial({ map: texEtiqueta(autor === 'eu' ? 'Allan' : 'Jhennyfer'), transparent: true, depthWrite: false }));
        etiqueta.position.set(w * 0.28, h * 0.9, 0.045);
        etiqueta.rotation.z = -0.12;
        g.add(etiqueta);
        return g;
    }

    const cartas = [];
    const lista = (info && info.cartas.length)
        ? info.cartas.slice(0, 8).reverse()                          // até 8 cartas, as mais novas por último (na frente)
        : [{ autor: 'eu' }, { autor: 'ela' }, { autor: 'eu' }, { autor: 'ela' }, { autor: 'eu' }, { autor: 'ela' }];
    const metade = Math.ceil(lista.length / 2);
    const filas = [lista.slice(0, metade), lista.slice(metade)];     // fileira de trás (mais alta) e fileira da frente
    let idx = 0;
    filas.forEach((fila, f) => {
        const costas = f === 0;
        const base = costas ? 1.15 : 0.75;                           // altura do pé das cartas: degrau vinho / piso lilás
        const z0 = costas ? -0.9 : -0.3;
        const passo = fila.length > 1 ? Math.min(0.8, 2.3 / (fila.length - 1)) : 0;
        fila.forEach((c, j) => {
            const t = j - (fila.length - 1) / 2;
            const g = criarCarta(idx, c.autor);
            g.position.set(t * passo, base + Y_FECHADA, z0 + j * 0.03);
            g.rotation.z = -t * 0.05;
            g.rotation.x = -0.2;                                     // encostadas pra trás, com a frente virada pra cima
            g.userData = { tipo: 'envelope' };
            caixa.add(g);
            cartas.push({ g: g, i: idx, y: Y_FECHADA, base: base, v: 0, alvo: Y_FECHADA, espera: 0, rotZ: -t * 0.05, off: 0 });
            idx++;
        });
    });


  
    let luzesBrilho = null;

    (function interiorArrumado() {

        const Y_B = 0.75;                                            // altura do piso (a bandeja) onde tudo fica arrumado
        const corEnv = (autor) => (autor === 'eu' ? 0x9aa6f2 : 0xf4a3c6);
        const corSelo = (autor) => (autor === 'eu' ? 0x4a4fb8 : 0xc22a7a);
        const peca = (w, h, d, x, y, z, cor, rough) => {
            const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color: cor, roughness: rough === undefined ? 0.85 : rough }));
            m.position.set(x, y, z);
            caixa.add(m);
            return m;
        };

        // ---- piso lilás, degrau vinho pra fileira de trás e trilhos rosa-choque na frente de cada fileira ----
        peca(3.7, Y_B - E, 2.5, 0, (E + Y_B) / 2, 0, 0xa68be0, 1);
        peca(3.6, 0.4, 0.7, 0, Y_B + 0.2, -0.85, 0x9c2f67);
        peca(3.5, 0.5, 0.07, 0, Y_B + 0.25, -0.05, 0xd9457f);
        peca(3.5, 0.45, 0.06, 0, Y_B + 0.4 + 0.225, -0.62, 0xd9457f);

        // ---- dois tapetes na frente: menta (bilhetinhos) e azul (envelopes soltos) ----
        const tapete = (x, cor) => {
            const m = new T.Mesh(new T.PlaneGeometry(1.3, 0.9), new T.MeshStandardMaterial({ color: cor, roughness: 1 }));
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, Y_B + 0.004, 0.7);
            caixa.add(m);
        };
        tapete(-1.15, 0x6fd0bd);
        tapete(1.15, 0x6fa8ea);

        // bilhetinhos coloridos (estilo post-it) no tapete menta
        const postit = [0xff9cc2, 0xb99cf0, 0x8ec1f5, 0xffd666, 0xff9f7a, 0x7fd8b5];
        for (let i = 0; i < 6; i++) {
            const b = new T.Group();
            b.add(new T.Mesh(new T.BoxGeometry(0.4, 0.02, 0.4), new T.MeshStandardMaterial({ color: postit[i % postit.length], roughness: 0.7 })));
            const fita = new T.Mesh(new T.BoxGeometry(0.17, 0.025, 0.06), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, transparent: true, opacity: 0.8 }));
            fita.position.set(0, 0.012, -0.18);
            fita.rotation.y = rand(-0.25, 0.25);
            b.add(fita);
            const col = i % 3, fila = Math.floor(i / 3);
            b.position.set(-1.15 + (col - 1) * 0.4 + rand(-0.05, 0.05), Y_B + 0.02 + fila * 0.02, 0.7 + (fila - 0.5) * 0.4 + rand(-0.04, 0.04));
            b.rotation.y = rand(-0.5, 0.5);
            caixa.add(b);
        }

        // envelopes soltos no tapete azul (rosa = Jhennyfer · azul-lilás = Allan)
        [['ela', -1], ['eu', 0], ['ela', 1]].forEach((d, i) => {
            const e = new T.Group();
            e.add(new T.Mesh(new T.BoxGeometry(0.8, 0.03, 0.55), new T.MeshStandardMaterial({ color: corEnv(d[0]), roughness: 0.6 })));
            const selo = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 0.02, 20), new T.MeshStandardMaterial({ color: corSelo(d[0]), roughness: 0.4 }));
            selo.position.set(0, 0.025, 0.06);
            e.add(selo);
            e.position.set(1.15 + d[1] * 0.36, Y_B + 0.02 + i * 0.02, 0.7 + rand(-0.05, 0.05));
            e.rotation.y = d[1] * 0.35 + rand(-0.1, 0.1);
            caixa.add(e);
        });

        // maço de cartinhas amarrado com fitinha, no meio
        const maco = new T.Group();
        for (let i = 0; i < 5; i++) {
            const e = new T.Mesh(new T.BoxGeometry(0.9, 0.05, 0.62), new T.MeshStandardMaterial({ color: corEnv(i % 2 ? 'eu' : 'ela'), roughness: 0.6 }));
            e.position.y = 0.03 + i * 0.055;
            e.rotation.y = (i - 2) * 0.07;
            maco.add(e);
        }
        const fitaM = new T.Mesh(new T.BoxGeometry(0.1, 0.34, 0.66), rosa);
        fitaM.position.y = 0.16;
        maco.add(fitaM);
        [-1, 1].forEach((lado) => {
            const lc = new T.Mesh(new T.SphereGeometry(0.1, 14, 10), rosa);
            lc.scale.set(1.5, 0.6, 0.9);
            lc.position.set(lado * 0.1, 0.36, 0);
            lc.rotation.z = lado * 0.4;
            maco.add(lc);
        });
        maco.position.set(0, Y_B, 0.78);
        maco.rotation.y = 0.2;
        caixa.add(maco);

        // ---- fio de luzinhas piscando ao longo do topo das paredes ----
        const cores = [0xffd36e, 0xff9ccb, 0xffffff, 0xc9a7f5].map((x) => new T.Color(x));
        const posicoes = [], corVert = [];
        const bulbo = (x, y, z, i) => {
            const cor = cores[i % cores.length];
            const m = new T.Mesh(new T.SphereGeometry(0.05, 10, 8), new T.MeshBasicMaterial({ color: cor }));
            m.position.set(x, y, z);
            caixa.add(m);
            posicoes.push(x, y, z);
            corVert.push(cor.r, cor.g, cor.b);
        };
        for (let i = 0; i <= 10; i++) {
            const u = i / 10;
            bulbo(-1.7 + u * 3.4, 2.04 - 0.12 * Math.sin(u * Math.PI), -1.2, i);
        }
        [-1, 1].forEach((lado) => {
            for (let i = 1; i <= 4; i++) {
                const u = i / 5;
                bulbo(lado * 1.78, 2.04 - 0.1 * Math.sin(u * Math.PI), -1.2 + u * 2.3, i + 3);
            }
        });
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(posicoes, 3));
        geo.setAttribute('color', new T.Float32BufferAttribute(corVert, 3));
        luzesBrilho = new T.Points(geo, new T.PointsMaterial({ size: 0.5, map: texBrilhoRosa('255,255,255', 0.9), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.8 }));
        caixa.add(luzesBrilho);

        // ---- no chão, ao lado da caixa: envelopes soltos e coraçõezinhos de papel ----
        [[-3.0, 1.4, 0.5, 'ela'], [-2.5, 2.1, -0.3, 'eu'], [3.5, -1.2, 0.8, 'ela'], [3.1, 1.6, -0.4, 'eu']].forEach((d) => {
            const env = new T.Group();
            const corpo = new T.Mesh(new T.BoxGeometry(0.85, 0.03, 0.58), new T.MeshStandardMaterial({ color: corEnv(d[3]), roughness: 0.6 }));
            corpo.position.y = 0.02;
            env.add(corpo);
            const selo = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.02, 20), new T.MeshStandardMaterial({ color: corSelo(d[3]), roughness: 0.4 }));
            selo.position.set(0, 0.045, 0.06);
            env.add(selo);
            env.position.set(d[0], 0, d[1]);
            env.rotation.y = d[2];
            chao.add(env);
        });

        const forma = new T.Shape();
        for (let i = 0; i <= 60; i++) {
            const t = (i / 60) * Math.PI * 2;
            const x = (16 * Math.pow(Math.sin(t), 3)) / 16;
            const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
            if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
        }
        const geoCor = new T.ExtrudeGeometry(forma, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3, curveSegments: 1 });
        geoCor.center();
        [[1.3, 2.3, 0.2], [-0.9, 2.5, 0.16], [2.4, 2.0, 0.14], [-1.9, 2.6, 0.13], [0.2, 2.8, 0.12]].forEach((h) => {
            const m = new T.Mesh(geoCor, new T.MeshStandardMaterial({ color: pick([0xff5c9d, 0xff8fbf, 0xf06a9f, 0xc9a7f5]), roughness: 0.3 }));
            m.scale.setScalar(h[2]);
            m.rotation.x = -Math.PI / 2;
            m.rotation.z = rand(-0.6, 0.6);
            m.position.set(h[0], h[2] * 0.5, h[1]);
            chao.add(m);
        });

    })();


    /* ---------- brilhinhos, corações subindo, confete ---------- */
    let matBrilhos = null, matConfete = null;
    (function construirBrilhos() {
        const n = MOBILE ? 70 : 120;
        const pos = new Float32Array(n * 3), fase = new Float32Array(n), cor = new Float32Array(n * 3);
        const paleta = ['#ffffff', '#ffd6ec', '#ffb3d9', '#e3c4ff'].map((x) => new T.Color(x));
        for (let i = 0; i < n; i++) {
            pos[i * 3] = rand(-7, 7);
            pos[i * 3 + 1] = rand(0.2, 7);
            pos[i * 3 + 2] = rand(-5, 4);
            fase[i] = Math.random();
            const cc = pick(paleta);
            cor[i * 3] = cc.r; cor[i * 3 + 1] = cc.g; cor[i * 3 + 2] = cc.b;
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('aFase', new T.BufferAttribute(fase, 1));
        geo.setAttribute('aCor', new T.BufferAttribute(cor, 3));
        matBrilhos = new T.ShaderMaterial({
            uniforms: { uT: { value: 0 }, uTam: { value: 90 * DPR } },
            vertexShader: [
                'uniform float uT; uniform float uTam;',
                'attribute float aFase; attribute vec3 aCor; varying vec3 vCor; varying float vA;',
                'void main() {',
                '  vec3 p = position;',
                '  p.y += sin(uT * 0.4 + aFase * 6.2831) * 0.25;',
                '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
                '  float t = 0.5 + 0.5 * sin(uT * (0.8 + aFase) * 1.6 + aFase * 40.0);',
                '  vA = 0.15 + 0.85 * t * t;',
                '  vCor = aCor;',
                '  gl_PointSize = uTam * (0.4 + 0.6 * t) / -mv.z;',
                '  gl_Position = projectionMatrix * mv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vCor; varying float vA;',
                'void main() {',
                '  float d = length(gl_PointCoord - vec2(0.5));',
                '  if (d > 0.5) discard;',
                '  gl_FragColor = vec4(vCor, pow(1.0 - d * 2.0, 1.6) * vA);',
                '}'
            ].join('\n'),
            transparent: true, depthWrite: false, blending: T.AdditiveBlending
        });
        const pts = new T.Points(geo, matBrilhos);
        pts.frustumCulled = false;
        cena.add(pts);
    })();

    (function construirConfete() {
        const NC = MOBILE ? 130 : 220;
        const cp = new Float32Array(NC * 3), cv = new Float32Array(NC * 3), cf = new Float32Array(NC), cc = new Float32Array(NC * 3);
        const paleta = ['#ff5c9d', '#ffffff', '#ffd25a', '#c9a7f5', '#ff9ac4', '#ffd6ec'].map((x) => new T.Color(x));
        for (let i = 0; i < NC; i++) {
            cp[i * 3] = rand(-0.6, 0.6);
            cp[i * 3 + 1] = H + 0.4;
            cp[i * 3 + 2] = rand(-0.4, 0.8);
            cv[i * 3] = rand(-3.2, 3.2);
            cv[i * 3 + 1] = rand(4.2, 8.5);
            cv[i * 3 + 2] = rand(-2.4, 3.2);
            cf[i] = Math.random();
            const col = pick(paleta);
            cc[i * 3] = col.r; cc[i * 3 + 1] = col.g; cc[i * 3 + 2] = col.b;
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(cp, 3));
        geo.setAttribute('aVel', new T.BufferAttribute(cv, 3));
        geo.setAttribute('aFase', new T.BufferAttribute(cf, 1));
        geo.setAttribute('aCor', new T.BufferAttribute(cc, 3));
        matConfete = new T.ShaderMaterial({
            uniforms: { uT: { value: 99 }, uTam: { value: 120 * DPR } },
            vertexShader: [
                'uniform float uT; uniform float uTam;',
                'attribute vec3 aVel; attribute float aFase; attribute vec3 aCor;',
                'varying vec3 vCor; varying float vA;',
                'void main() {',
                '  float t = uT;',
                '  float k = 1.7;',
                '  vec3 p = position + aVel * ((1.0 - exp(-k * t)) / k);',
                '  p.y -= 1.2 * t * t;',
                '  p.x += sin(t * 3.0 + aFase * 6.2831) * 0.18 * min(t, 1.5);',
                '  p.z += cos(t * 2.5 + aFase * 8.0) * 0.18 * min(t, 1.5);',
                '  p.y = max(p.y, 0.05 + aFase * 0.03);',
                '  vA = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(5.0, 8.0, t));',
                '  vCor = aCor;',
                '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
                '  float vira = 0.45 + 0.55 * abs(sin(t * 9.0 + aFase * 6.2831));',
                '  gl_PointSize = uTam * vira / -mv.z;',
                '  gl_Position = projectionMatrix * mv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vCor; varying float vA;',
                'void main() { if (vA < 0.01) discard; gl_FragColor = vec4(vCor, vA); }'
            ].join('\n'),
            transparent: true, depthWrite: false
        });
        const pts = new T.Points(geo, matConfete);
        pts.frustumCulled = false;
        cena.add(pts);
    })();

    const texesCoracao = [texCoracao('#ff7ab8', '#ff4f9a'), texCoracao('#ffb3d9', '#ff8fbf'), texCoracao('#c9a7f5', '#b58cff')];
    function soltarCoracoes(origem, n, forte) {
        for (let i = 0; i < n; i++) {
            const m = new T.SpriteMaterial({ map: pick(texesCoracao), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 });
            const s = new T.Sprite(m);
            const e = rand(0.3, 0.55);
            s.scale.set(e, e, 1);
            s.position.copy(origem);
            cena.add(s);
            subindo.push({ s: s, vx: rand(-0.8, 0.8), vy: rand(forte ? 1.2 : 0.5, forte ? 2.8 : 1.3), vz: rand(-0.6, 0.6), vida: 1, dec: forte ? rand(0.35, 0.6) : rand(0.12, 0.22), pico: forte ? 1 : 0.7 });
        }
    }

    // brilho suave saindo da boca da caixa quando abre
    const brilhoTopo = new T.Sprite(new T.SpriteMaterial({ map: texBrilhoRosa('255,170,215', 0.8), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
    brilhoTopo.position.set(0, H + 0.2, 0.2);
    brilhoTopo.scale.set(7, 7, 1);
    cena.add(brilhoTopo);

    /* ---------- decoração cósmica ---------- */
    // feixe de luz saindo da caixa quando abre
    const feixe = new T.Sprite(new T.SpriteMaterial({ map: texFeixe(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
    feixe.center.set(0.5, 0);
    feixe.position.set(0, H, 0.2);
    feixe.scale.set(2.6, 7.5, 1);
    cena.add(feixe);

    // onda de luz que se espalha pelo chão (ao abrir e ao entrar)
    const onda = new T.Mesh(new T.RingGeometry(0.94, 1.0, 72), new T.MeshBasicMaterial({ color: 0xff9ccb, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0, side: T.DoubleSide }));
    onda.rotation.x = -Math.PI / 2;
    onda.position.y = 0.05;
    cena.add(onda);

    // céu estrelado (casca de estrelas ao redor, que piscam e giram devagarinho)
    let matCeu = null, ceu = null;
    (function construirCeu() {
        const n = MOBILE ? 520 : 1200;
        const pos = new Float32Array(n * 3), fase = new Float32Array(n), cor = new Float32Array(n * 3), tam = new Float32Array(n);
        const paleta = ['#ffffff', '#ffffff', '#ffd6ec', '#ffb3d9', '#e3c4ff', '#bcd4ff'].map((x) => new T.Color(x));
        for (let i = 0; i < n; i++) {
            const r = rand(40, 70), u = rand(-1, 1), th = rand(0, Math.PI * 2), sn = Math.sqrt(1 - u * u);
            pos[i * 3] = r * sn * Math.cos(th);
            pos[i * 3 + 1] = r * u;
            pos[i * 3 + 2] = r * sn * Math.sin(th);
            fase[i] = Math.random();
            tam[i] = 0.5 + Math.pow(Math.random(), 3) * 1.4;
            const cc = pick(paleta);
            cor[i * 3] = cc.r; cor[i * 3 + 1] = cc.g; cor[i * 3 + 2] = cc.b;
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('aFase', new T.BufferAttribute(fase, 1));
        geo.setAttribute('aCor', new T.BufferAttribute(cor, 3));
        geo.setAttribute('aTam', new T.BufferAttribute(tam, 1));
        matCeu = new T.ShaderMaterial({
            uniforms: { uT: { value: 0 }, uTam: { value: 110 * DPR } },
            vertexShader: [
                'uniform float uT; uniform float uTam;',
                'attribute float aFase; attribute float aTam; attribute vec3 aCor; varying vec3 vCor; varying float vA;',
                'void main() {',
                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
                '  float t = 0.5 + 0.5 * sin(uT * (0.5 + aFase * 1.5) + aFase * 40.0);',
                '  vA = 0.25 + 0.75 * t;',
                '  vCor = aCor;',
                '  gl_PointSize = uTam * aTam * (0.6 + 0.4 * t) / -mv.z;',
                '  gl_Position = projectionMatrix * mv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vCor; varying float vA;',
                'void main() {',
                '  float d = length(gl_PointCoord - vec2(0.5));',
                '  if (d > 0.5) discard;',
                '  gl_FragColor = vec4(vCor, pow(1.0 - d * 2.0, 1.6) * vA);',
                '}'
            ].join('\n'),
            transparent: true, depthWrite: false, blending: T.AdditiveBlending
        });
        ceu = new T.Points(geo, matCeu);
        ceu.frustumCulled = false;
        cena.add(ceu);
    })();

    // estrelinhas de 4 pontas espalhadas, piscando
    const cruzes = [];
    const texDaCruz = texCruz();
    (function () {
        const cores = [0xffffff, 0xffd6ec, 0xe3c4ff, 0xffb3d9];
        const n = MOBILE ? 10 : 16;
        for (let i = 0; i < n; i++) {
            const m = new T.SpriteMaterial({ map: texDaCruz, color: pick(cores), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 });
            const sp = new T.Sprite(m);
            const r = rand(9, 22), th = rand(0, Math.PI * 2), e = rand(0.7, 1.7);
            sp.position.set(Math.cos(th) * r, rand(0.5, 12), Math.sin(th) * r);
            sp.scale.set(e, e, 1);
            cena.add(sp);
            cruzes.push({ s: sp, base: e, fase: Math.random() * 6.28, vel: rand(0.6, 1.6) });
        }
    })();

    // nebulosas bem ao fundo (manchas de cor suaves)
    const nebulosas = [];
    [['255,90,170', 0.14, [-30, 12, -34], 46], ['150,100,255', 0.13, [34, 8, -28], 50], ['90,140,255', 0.10, [4, 24, -46], 56], ['255,150,200', 0.10, [-6, -2, 38], 52]].forEach((d, i) => {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: texBrilhoRosa(d[0], 1), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: d[1] }));
        sp.position.set(d[2][0], d[2][1], d[2][2]);
        sp.scale.set(d[3], d[3], 1);
        cena.add(sp);
        nebulosas.push({ s: sp, base: d[1], fase: i * 1.7 });
    });

    // embaixo da caixa: poeira cósmica em espiral + órbitas com planetinhas
    let pontosDisco = null;
    const planetinhas = [];
    (function () {
        const n = MOBILE ? 800 : 1700;
        const pos = new Float32Array(n * 3), cor = new Float32Array(n * 3);
        const dentro = new T.Color('#ffd6ec'), fora = new T.Color('#9a8cff'), cx = new T.Color();
        for (let i = 0; i < n; i++) {
            const r = 3.3 + Math.pow(Math.random(), 0.8) * 6;
            const a = (i % 2) * Math.PI + r * 0.55 + (Math.random() + Math.random() - 1) * 0.7;
            pos[i * 3] = Math.cos(a) * r;
            pos[i * 3 + 1] = 0.04 + (Math.random() - 0.5) * 0.12;
            pos[i * 3 + 2] = Math.sin(a) * r;
            cx.copy(dentro).lerp(fora, (r - 3.3) / 6).multiplyScalar(0.6 + Math.random() * 0.6);
            cor[i * 3] = cx.r; cor[i * 3 + 1] = cx.g; cor[i * 3 + 2] = cx.b;
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('color', new T.BufferAttribute(cor, 3));
        pontosDisco = new T.Points(geo, new T.PointsMaterial({ size: 0.09, map: texBrilhoRosa('255,255,255', 1), transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true, opacity: 0.85 }));
        chao.add(pontosDisco);

        [[4.3, 0xff9ccb, 0.18], [6.6, 0xc9a7f5, 0.14]].forEach((a) => {
            const pts = [];
            for (let k = 0; k < 96; k++) {
                const t = (k / 96) * Math.PI * 2;
                pts.push(new T.Vector3(Math.cos(t) * a[0], 0.03, Math.sin(t) * a[0]));
            }
            const lg = new T.BufferGeometry().setFromPoints(pts);
            chao.add(new T.LineLoop(lg, new T.LineBasicMaterial({ color: a[1], transparent: true, opacity: a[2], depthWrite: false, blending: T.AdditiveBlending })));
        });

        [[4.3, 0.35, '255,160,210', 0.55], [6.6, -0.22, '190,160,255', 0.7], [5.4, 0.28, '255,220,150', 0.48]].forEach((d) => {
            const sp = new T.Sprite(new T.SpriteMaterial({ map: texBrilhoRosa(d[2], 1), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.95 }));
            sp.scale.set(d[3], d[3], 1);
            chao.add(sp);
            planetinhas.push({ g: sp, raio: d[0], vel: d[1], ang: rand(0, Math.PI * 2) });
        });
    })();

    // estrelinhas girando em volta da caixa
    const orbitantes = [];
    (function () {
        const n = MOBILE ? 7 : 10;
        for (let i = 0; i < n; i++) {
            const m = new T.SpriteMaterial({ map: texDaCruz, color: i % 2 ? 0xffd6ec : 0xffffff, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 });
            const sp = new T.Sprite(m);
            const e = rand(0.35, 0.65);
            sp.scale.set(e, e, 1);
            cena.add(sp);
            orbitantes.push({ s: sp, ang: (i / n) * Math.PI * 2, raio: rand(3.2, 3.9), y: rand(0.5, 3.0), vel: rand(0.35, 0.6), fase: Math.random() * 6.28 });
        }
    })();

    // envelopezinhos flutuando (tema das cartas)
    const flutuantes = [];
    (function () {
        const tex = texEnvelopinho();
        const n = MOBILE ? 4 : 6;
        for (let i = 0; i < n; i++) {
            const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85 }));
            const e = rand(0.9, 1.3);
            sp.scale.set(e, e * 0.75, 1);
            cena.add(sp);
            flutuantes.push({ s: sp, ang: (i / n) * Math.PI * 2 + rand(-0.3, 0.3), raio: rand(6, 11), y0: rand(1.5, 6), vel: rand(0.04, 0.09) * (i % 2 ? 1 : -1), fase: Math.random() * 6.28 });
        }
    })();

    // estrelas cadentes (passam sempre na frente da câmera)
    const cometas = [];
    (function () {
        const cabecaTex = texBrilhoRosa('255,235,250', 1);
        for (let i = 0; i < 2; i++) {
            const g = new T.BufferGeometry();
            g.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
            g.setAttribute('color', new T.BufferAttribute(new Float32Array([0, 0, 0, 1, 0.9, 1]), 3));
            const linha = new T.Line(g, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
            linha.frustumCulled = false;
            linha.visible = false;
            const cabeca = new T.Sprite(new T.SpriteMaterial({ map: cabecaTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
            cabeca.scale.set(1.3, 1.3, 1);
            cabeca.visible = false;
            cena.add(linha);
            cena.add(cabeca);
            cometas.push({ linha: linha, cabeca: cabeca, vida: 0, dur: 1, espera: rand(2, 5), p: new T.Vector3(), v: new T.Vector3() });
        }
    })();
    function lancarCometa(k) {
        const f = tmp2.copy(alvo).sub(camera.position).normalize();
        const dir = tmp3.set(f.z, 0, -f.x).normalize();                       // "pra direita" da câmera
        const lado = Math.random() < 0.5 ? 1 : -1;
        k.p.copy(camera.position).addScaledVector(f, 40).addScaledVector(dir, lado * rand(14, 24));
        k.p.y += rand(6, 16);
        k.v.set(0, 0, 0).addScaledVector(dir, -lado * rand(26, 40));
        k.v.y = -rand(6, 14);
        k.dur = k.vida = rand(1.0, 1.7);
        k.linha.visible = true;
        k.cabeca.visible = true;
    }

    /* ---------- ações ---------- */
     const resumo = info
        ? (info.nCartas === 1 ? '1 carta' : info.nCartas + ' cartas') +
          (info.nBilhetes ? ' e ' + (info.nBilhetes === 1 ? '1 bilhetinho' : info.nBilhetes + ' bilhetinhos') : '') +
          ' guardados'
        : '';
    function dica(txt) {
        elDica.innerHTML = (resumo ? resumo + '<br>' : '') + txt;
        elDica.style.opacity = '1';
    }
    const dicaFechada = MOBILE ? DICA_FECHADA_TOQUE : DICA_FECHADA_CLIQUE;

    function abrirTampa() {
        if (aberta || entrando) return;
        aberta = true;
        tConfete = 0;
        tOnda = 0;
        cartas.forEach((k, i) => { k.alvo = Y_ABERTA; k.espera = 0.15 + i * 0.06; });
        tmp.set(0, H + 0.3, 0.3);
        soltarCoracoes(tmp, 8, true);
        dica(DICA_ABERTA);
        evento('abrir-caixa');
    }
    function fecharTampa() {
        if (!aberta || entrando) return;
        aberta = false;
        cartas.forEach((k, i) => { k.alvo = Y_FECHADA; k.espera = i * 0.03; });
        dica(dicaFechada);
        evento('fechar-caixa');
    }
    const elFundo = overlay.querySelector('.caixa-fundo');
    const elAnel = overlay.querySelector('.caixa-anel');
    let revelando = false, tRev = 0, raioMax = 2000, pxBoca = 0, pyBoca = 0;
    let paginaTocada = [];
    const SEL_PAGINA = '.cartas-intro, .cartas-filtros, .cartas-secao-cabecalho, .carta-envelope, .bilhete';

    function limparRevelacao() {
        document.body.classList.remove('caixa-revelando');
        paginaTocada.forEach((el) => {
            el.style.removeProperty('--bx');
            el.style.removeProperty('--by');
            el.style.removeProperty('--bd');
        });
        paginaTocada = [];
    }

    // a página de cartas "se forma" a partir da boca da caixa
    function iniciarRevelacao() {
        const view = document.querySelector('.view[data-view="cartas"]');
        const w = overlay.clientWidth, h = overlay.clientHeight;
        tmp.set(0, H + 0.4, 0.3).project(camera);                  // onde a boca da caixa está na tela
        pxBoca = (tmp.x * 0.5 + 0.5) * w;
        pyBoca = (-tmp.y * 0.5 + 0.5) * h;
        raioMax = Math.hypot(Math.max(pxBoca, w - pxBoca), Math.max(pyBoca, h - pyBoca)) + 140;

        if (view && view.offsetWidth > 0) {
            view.scrollTop = 0;
            paginaTocada = Array.from(view.querySelectorAll(SEL_PAGINA)).filter((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
            });
            document.body.classList.add('caixa-revelando');
            paginaTocada.forEach((el) => {
                const r = el.getBoundingClientRect();
                const dx = pxBoca - (r.left + r.width / 2);
                const dy = pyBoca - (r.top + r.height / 2);
                el.style.setProperty('--bx', dx.toFixed(1) + 'px');
                el.style.setProperty('--by', dy.toFixed(1) + 'px');
                el.style.setProperty('--bd', Math.min(0.9, Math.hypot(dx, dy) / 1500 + Math.random() * 0.12).toFixed(2) + 's');
            });
            // fora da lista de timers: precisa rodar mesmo depois que a caixa sumir
            setTimeout(limparRevelacao, 3600);
        }

        elAnel.style.left = pxBoca.toFixed(1) + 'px';
        elAnel.style.top = pyBoca.toFixed(1) + 'px';
        revelando = true;
        tRev = 0;
    }

    function passoRevelacao(dt) {
        tRev += dt;
        const p = clamp(tRev / 1.35, 0, 1);
        const R = (1 - Math.pow(1 - p, 3)) * raioMax;
        const mascara = 'radial-gradient(circle at ' + pxBoca.toFixed(1) + 'px ' + pyBoca.toFixed(1) + 'px, transparent ' + R.toFixed(1) + 'px, #000 ' + (R + 90).toFixed(1) + 'px)';
        elFundo.style.webkitMaskImage = mascara;
        elFundo.style.maskImage = mascara;
        elAnel.style.width = elAnel.style.height = (R * 2).toFixed(1) + 'px';
        elAnel.style.opacity = R > 8 ? String(clamp(1 - p * 1.15, 0, 0.9)) : '0';

        // as cartinhas 3D dão um "pop" e somem: é nesse momento que viram a página
        const pc = clamp(tRev / 0.5, 0, 1);
        cartas.forEach((k) => k.g.scale.setScalar(Math.max(0.001, (1 - pc) * (1 + 0.3 * Math.sin(pc * Math.PI)))));

        // depois a caixa se desfaz
        canvas.style.opacity = String(1 - clamp((tRev - 0.5) / 0.9, 0, 1));

        if (p >= 1 && elFundo.style.display !== 'none') {
            elFundo.style.display = 'none';
            overlay.style.pointerEvents = 'none';                      // a página já pode ser clicada
        }
    }

    function entrar() {
        if (entrando || !aberta) return;
        entrando = true;
        orb.auto = 0;
        orb.min = 3;
        tOnda = 0;
        elDica.style.opacity = '0';
        botaoVoltar.style.opacity = '0';
        botaoVoltar.style.pointerEvents = 'none';
        cartas.forEach((k, i) => { k.alvo = Y_SAI; k.espera = i * 0.07; });     // as cartas sobem pela metade
        tmp.set(0, H + 0.6, 0.3);
        soltarCoracoes(tmp, 16, true);
        evento('entrar-cartas');
        depois(450, () => { if (opts.aoEntrar) opts.aoEntrar(); });             // troca pra #cartas por baixo, escondida
        depois(900, iniciarRevelacao);                                          // a página brota da boca da caixa
        depois(3300, () => destruir());
    }
    function voltar() {
        if (entrando || destruido) return;
        evento('voltar');
        if (opts.aoCobrirHub) opts.aoCobrirHub(false);                           // o universo reaparece por baixo
        overlay.classList.add('saindo-rapido');
        depois(500, () => destruir());
    }

    /* ---------- controles: arrastar, pinça, rolagem, toque ---------- */
    const raycaster = new T.Raycaster();
    const ndc = new T.Vector2();
    const ponteiros = new Map();
    let inicioToque = null, distPinca = 0;

    function aoToque(x, y) {
        if (entrando || destruido) return;
        const r = canvas.getBoundingClientRect();
        ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        raycaster.camera = camera;
        const hits = raycaster.intersectObjects([caixa], true);
        let tipo = '';
        if (hits.length) {
            let o = hits[0].object;
            while (o && !(o.userData && o.userData.tipo) && o.parent) o = o.parent;
            tipo = (o && o.userData && o.userData.tipo) || 'caixa';
        }
        if (!aberta) {
            if (tipo) abrirTampa();
            else { tmp.set(rand(-1, 1), 1.5, rand(-1, 1)); soltarCoracoes(tmp, 5, true); }
        } else if (tipo === 'envelope' || tipo === 'caixa') {
            entrar();                       // tocou nas cartas / na caixa aberta
        } else {
            fecharTampa();                  // tocou na tampa levantada ou fora
        }
    }

    canvas.addEventListener('pointerdown', (e) => {
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
        orb.arrastando = true;
        orb.ultima = performance.now();
        if (ponteiros.size === 1) {
            inicioToque = { x: e.clientX, y: e.clientY, t: performance.now(), moveu: false };
            orb.vTheta = 0;
        } else {
            inicioToque = null;
            const pts = Array.from(ponteiros.values());
            distPinca = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        }
    });
    canvas.addEventListener('pointermove', (e) => {
        const p = ponteiros.get(e.pointerId);
        if (!p || entrando) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        p.x = e.clientX; p.y = e.clientY;
        orb.ultima = performance.now();
        if (ponteiros.size >= 2) {
            const pts = Array.from(ponteiros.values());
            const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            if (distPinca > 0 && d > 0) {
                orb.dist = clamp(orb.dist * (distPinca / d), orb.min, orb.max);
                orb.zoomou = true;
            }
            distPinca = d;
            return;
        }
        if (inicioToque && Math.hypot(e.clientX - inicioToque.x, e.clientY - inicioToque.y) > 8) inicioToque.moveu = true;
        orb.theta -= dx * 0.0055;
        orb.phi = clamp(orb.phi - dy * 0.0045, orb.phiMin, orb.phiMax);
        orb.vTheta = -dx * 0.0055 * 60;
    });
    function soltarPonteiro(e) {
        if (!ponteiros.has(e.pointerId)) return;
        ponteiros.delete(e.pointerId);
        if (ponteiros.size === 0) {
            orb.arrastando = false;
            const foi = inicioToque && !inicioToque.moveu && performance.now() - inicioToque.t < 500 && e.type === 'pointerup';
            if (foi) aoToque(e.clientX, e.clientY);
            inicioToque = null;
        }
    }
    canvas.addEventListener('pointerup', soltarPonteiro);
    canvas.addEventListener('pointercancel', soltarPonteiro);
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (entrando) return;
        orb.dist = clamp(orb.dist * Math.exp(e.deltaY * 0.0011), orb.min, orb.max);
        orb.zoomou = true;
    }, { passive: false });
    botaoVoltar.addEventListener('click', voltar);
    const aoTecla = (e) => { if (e.key === 'Escape') voltar(); };
    window.addEventListener('keydown', aoTecla);

    /* ---------- tamanho ---------- */
    function redimensionar() {
        const w = Math.max(1, overlay.clientWidth), h = Math.max(1, overlay.clientHeight);
        renderer.setSize(w, h, false);
        aspecto = w / h;
        camera.aspect = aspecto;
        camera.updateProjectionMatrix();
        // celular em pé: afasta a câmera pra a caixa caber na largura
        if (!orb.zoomou && !entrando) orb.dist = orb.base = aspecto >= 1 ? 15 : clamp(7.6 / (0.69 * aspecto), 15, 28);
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(redimensionar) : null;
    if (ro) ro.observe(overlay); else window.addEventListener('resize', redimensionar);

    /* ---------- animação ---------- */
    function atualizar(dt) {
        tempo += dt;
        passoOrbita(dt);

        if (entrando) {                      // a câmera mergulha na boca da caixa, olhando de frente
            const k = 1 - Math.exp(-3.2 * dt);
            alvo.lerp(alvoEntrada, k);
            orb.dist = lerp(orb.dist, 7.5, k);
            orb.phi = lerp(orb.phi, 0.95, k);
            const frente = Math.round(orb.theta / (Math.PI * 2)) * Math.PI * 2;
            orb.theta = lerp(orb.theta, frente, k);
        }
        posicionarCamera();

        // surgimento: a caixa "pula" pra dentro da cena, com um quiquezinho
        if (tempo > 0.3) {
            velC += (1 - c) * 60 * dt;
            velC *= Math.exp(-7 * dt);
            c += velC * dt;
        }
        const cc = clamp(c, 0, 1);
        caixa.scale.setScalar(Math.max(c, 0.001));
        chao.scale.setScalar(Math.max(cc, 0.001));
        caixa.position.y = (1 - cc) * 2.2 + Math.sin(tempo * 1.3) * 0.04 * cc;
        caixa.rotation.y = (1 - cc) * -1.6;
        if (!introBurst && c > 0.55) {
            introBurst = true;
            tmp.set(0, 1.5, 0.5);
            soltarCoracoes(tmp, 10, true);
        }
        if (c > 0.9 && !aberta && elDica.style.opacity !== '1' && !entrando) dica(dicaFechada);

        // tampa: mola com quiquezinho
        velAb += ((aberta ? 1 : 0) - abertura) * 70 * dt;
        velAb *= Math.exp(-7 * dt);
        abertura += velAb * dt;
        // fechada e parada: a tampinha dá uma "tremidinha" de vez em quando, chamando pra abrir
        const convite = (!aberta && !entrando && c > 0.95)
            ? Math.pow(Math.max(0, Math.sin(tempo * 1.2)), 12) * Math.sin(tempo * 22) * 0.035
            : 0;
        tampa.rotation.x = -abertura * 2.05 + convite;

        // cartinhas: cada uma sobe um pouquinho depois da outra
        cartas.forEach((k) => {
            if (k.espera > 0) k.espera -= dt;
            else {
                k.v += (k.alvo - k.y) * (entrando ? 90 : 60) * dt;
                k.v *= Math.exp(-8 * dt);
                k.y += k.v * dt;
            }
            k.g.position.y = k.base + k.y + k.off * clamp(abertura, 0, 1);
            k.g.rotation.z = k.rotZ + (aberta ? Math.sin(tempo * 1.4 + k.i) * 0.02 : 0);
        });

        luzDentro.intensity = lerp(luzDentro.intensity, entrando ? 1.4 : (aberta ? 0.9 : 0), 1 - Math.exp(-5 * dt));
        brilhoTopo.material.opacity = lerp(brilhoTopo.material.opacity, entrando ? 0.45 : (aberta ? 0.22 : 0), 1 - Math.exp(-4 * dt));

        // ---- decoração cósmica ----
        const vel = aberta ? 2.2 : 1;                                   // com a caixa aberta, tudo gira mais animado
        matCeu.uniforms.uT.value = tempo;
        ceu.rotation.y += dt * 0.012;
        pontosDisco.rotation.y += dt * 0.07 * vel;
        planetinhas.forEach((p) => {
            p.ang += p.vel * vel * dt;
            p.g.position.set(Math.cos(p.ang) * p.raio, 0.28 + Math.sin(tempo * 1.2 + p.ang) * 0.08, Math.sin(p.ang) * p.raio);
        });
        orbitantes.forEach((o) => {
            o.ang += o.vel * vel * dt;
            o.s.position.set(Math.cos(o.ang) * o.raio, o.y + Math.sin(tempo * 1.5 + o.fase) * 0.25, Math.sin(o.ang) * o.raio);
            o.s.material.opacity = (0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(tempo * 2.2 + o.fase), 2)) * cc;
            o.s.material.rotation += dt * 0.6;
        });
        cruzes.forEach((k) => {
            const pisca = Math.pow(0.5 + 0.5 * Math.sin(tempo * k.vel + k.fase), 3);
            k.s.material.opacity = 0.12 + 0.88 * pisca;
            k.s.material.rotation += dt * 0.12;
            const e = k.base * (0.8 + 0.3 * pisca);
            k.s.scale.set(e, e, 1);
        });
        flutuantes.forEach((f) => {
            f.ang += f.vel * dt;
            f.s.position.set(Math.cos(f.ang) * f.raio, f.y0 + Math.sin(tempo * 0.8 + f.fase) * 0.45, Math.sin(f.ang) * f.raio);
            f.s.material.rotation = Math.sin(tempo * 0.6 + f.fase) * 0.25;
        });
        nebulosas.forEach((n) => { n.s.material.opacity = n.base * (0.8 + 0.2 * Math.sin(tempo * 0.35 + n.fase)); });
        cometas.forEach((k) => {
            if (k.vida <= 0) {
                if (!entrando) { k.espera -= dt; if (k.espera <= 0) lancarCometa(k); }
                return;
            }
            k.vida -= dt;
            k.p.addScaledVector(k.v, dt);
            const alfa = Math.sin(clamp(k.vida / k.dur, 0, 1) * Math.PI);
            const ps = k.linha.geometry.attributes.position;
            ps.setXYZ(0, k.p.x - k.v.x * 0.3, k.p.y - k.v.y * 0.3, k.p.z - k.v.z * 0.3);
            ps.setXYZ(1, k.p.x, k.p.y, k.p.z);
            ps.needsUpdate = true;
            k.linha.material.opacity = alfa;
            k.cabeca.position.copy(k.p);
            k.cabeca.material.opacity = alfa;
            if (k.vida <= 0) { k.linha.visible = false; k.cabeca.visible = false; k.espera = rand(3, 7); }
        });
        feixe.material.opacity = lerp(feixe.material.opacity, entrando ? 0.5 : (aberta ? 0.22 : 0), 1 - Math.exp(-4 * dt));
        tOnda += dt;
        const qo = clamp(tOnda / 1.3, 0, 1);
        onda.scale.setScalar(1 + qo * 7.5);
        onda.material.opacity = (1 - qo) * (1 - qo) * 0.7;

        tConfete += dt;
        matConfete.uniforms.uT.value = Math.min(tConfete, 99);
        matBrilhos.uniforms.uT.value = tempo;

                if (luzesBrilho) luzesBrilho.material.opacity = 0.55 + 0.3 * Math.sin(tempo * 2.2);

        // corações subindo (de vez em quando, mesmo parado)
        proxAmbiente -= dt;
        if (proxAmbiente <= 0 && subindo.length < 18) {
            proxAmbiente = rand(0.7, 1.5);
            tmp.set(rand(-5, 5), 0.2, rand(-3, 2));
            soltarCoracoes(tmp, 1, false);
        }
        for (let i = subindo.length - 1; i >= 0; i--) {
            const h = subindo[i];
            h.s.position.x += h.vx * dt;
            h.s.position.y += h.vy * dt;
            h.s.position.z += h.vz * dt;
            h.vida -= h.dec * dt;
            const entra = clamp((1 - h.vida) * 8, 0, 1);
            h.s.material.opacity = Math.max(0, Math.min(h.vida * 1.4, entra)) * h.pico;
            if (h.vida <= 0) {
                cena.remove(h.s);
                h.s.material.dispose();
                subindo.splice(i, 1);
            }
        }

                if (revelando) passoRevelacao(dt);
    }

    function frame(agora) {
        if (destruido) return;
        const dt = Math.min(0.05, (agora - ultimo) / 1000);
        ultimo = agora;
        try {
            atualizar(dt);
            renderer.render(cena, camera);
        } catch (e) {
            console.error('[CaixaCartas] erro no quadro:', e);
            // se quebrar, não deixa a pessoa presa: entra direto nas cartas
            if (opts.aoEntrar) opts.aoEntrar();
            destruir();
            return;
        }
        rafId = requestAnimationFrame(frame);
    }

    function destruir() {
        if (destruido) return;
        destruido = true;
        timers.forEach(clearTimeout);
        cancelAnimationFrame(rafId);
        window.removeEventListener('keydown', aoTecla);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', redimensionar);
        cena.traverse((o) => {
            if (o.geometry && o.geometry.dispose) o.geometry.dispose();
            const m = o.material;
            if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => { if (mm.map && mm.map.dispose) mm.map.dispose(); if (mm.dispose) mm.dispose(); });
        });
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        overlay.remove();
        if (opts.aoCobrirHub) opts.aoCobrirHub(false);
        if (atual === api) atual = null;
    }

    const api = { voltar: voltar, destruir: destruir };

    /* ---------- partida ---------- */

        // sombras: dão volume e deixam cada coisa lá dentro "separada" das outras
    caixa.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (m && m.isMeshStandardMaterial) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
    redimensionar();
    orb.ultima = performance.now();
    overlay.getBoundingClientRect();                    // força o navegador a "ver" o overlay antes da transição
    overlay.classList.add('visivel');
    depois(520, () => { if (opts.aoCobrirHub && !destruido) opts.aoCobrirHub(true); });   // o hub por baixo descansa
    ultimo = performance.now();
    rafId = requestAnimationFrame(frame);
    evento('caixa-aparece');

    return api;
}

window.CaixaCartas = { abrir: abrir, fechar: fechar, aberta: aberta };

})();