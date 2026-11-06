// hub3d.js
// Hub em 3D: uma galáxia espiral com halo de poeira, um coração de partículas
// e os cards do hub (assets/data/hub.json) orbitando em volta.
//
//   Hub3D.montar(container, opcoes)   -> cria o hub 3D dentro do container
//   Hub3D.desmontar()                 -> remove e libera memória
//
// Opções (todas opcionais):
//   jsonUrl      caminho do hub.json            (padrão 'assets/data/hub.json')
//   cards        lista de cards já pronta (ignora o jsonUrl)
//   dataInicio   '2025-08-05T00:00:00' -> mostra o contador "estamos juntos há"
//   textoCentro  texto dentro do coração    (padrão 'Nosso Universo')
//   aoEntrar     função(card) chamada ao entrar numa seção (por padrão muda o hash)
//   aoFalhar     função(erro) chamada se o aparelho não abrir WebGL
//   aoEvento     função(nome, dados) — gancho pra SONS. Nomes:
//                'selecionar' {card} · 'soltar' · 'entrar' {card, cor} · 'pulso'

(function () {
'use strict';

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

// usados só se o hub.json não carregar
const CARDS_PADRAO = [
    { titulo: 'Mural', link: 'timeline', descricao: 'nossos gostos, colados num só lugar' },
    { titulo: 'Galeria', link: 'galeria', descricao: 'as fotos que contam a nossa história' },
    { titulo: 'Assistidos', link: 'assistidos', descricao: 'tudo o que já vimos juntos' },
    { titulo: 'Cartas', link: 'cartas', descricao: 'palavras guardadas com carinho' }
];

// cor do "mergulho" de cada seção (a chave é o campo "link" do card)
const COR_CARD = {
    timeline: '#ff8fbf', galeria: '#7ec8ff', assistidos: '#b58cff',
    cartas: '#ff6f91', estrelas: '#ffd36e', futuro: '#8ee6c8'
};

let instancia = null;
let montagem = 0;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.732;

function carregarThree() {
    if (window.THREE) return Promise.resolve();
    return new Promise((resolve, reject) => {
        let s = document.querySelector('script[data-three-hub]');
        if (!s) {
            s = document.createElement('script');
            s.src = THREE_URL;
            s.dataset.threeHub = '1';
            document.head.appendChild(s);
        }
        s.addEventListener('load', () => (window.THREE ? resolve() : reject(new Error('THREE ausente'))));
        s.addEventListener('error', () => reject(new Error('Falha ao baixar a biblioteca 3D')));
    });
}

async function montar(container, opcoes) {
    desmontar();
    if (!container) return null;
    const token = ++montagem;
    const cfg = Object.assign({
        jsonUrl: 'assets/data/hub.json',
        cards: null,
        dataInicio: null,
        textoCentro: 'Nosso Universo',
        aoEntrar: null,
        aoFalhar: null,
        aoEvento: null
    }, opcoes || {});

    try {
        await carregarThree();
    } catch (e) {
        if (cfg.aoFalhar) cfg.aoFalhar(e);
        return null;
    }
    if (token !== montagem) return null;

    let cards = cfg.cards;
    if (!cards) {
        try {
            const r = await fetch(cfg.jsonUrl, { cache: 'no-cache' });
            if (!r.ok) throw new Error('hub.json indisponível');
            cards = await r.json();
        } catch (e) {
            console.warn('Hub3D: usando cards padrão.', e);
            cards = CARDS_PADRAO;
        }
    }
    if (!Array.isArray(cards) || !cards.length) cards = CARDS_PADRAO;
    if (token !== montagem) return null;

    instancia = criar(container, cards, cfg);
    return instancia;
}

function desmontar() {
    montagem++;
    if (instancia) {
        instancia.destruir();
        instancia = null;
    }
}


/* =========================================================
   O HUB EM SI
   ========================================================= */

function criar(container, cards, cfg) {
    const T = window.THREE;
    const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 768;
    const REDUZIR = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // gancho pra sons e afins (nunca deixa um erro de fora quebrar o hub)
    const evento = (nome, dados) => {
        try { if (cfg.aoEvento) cfg.aoEvento(nome, dados || {}); } catch (e) { console.warn('aoEvento:', e); }
    };

    /* ---------- DOM ---------- */
    const raiz = document.createElement('div');
    raiz.className = 'h3d-raiz';
    raiz.innerHTML =
        '<canvas class="h3d-canvas"></canvas>' +
        '<p class="h3d-dica"></p>' +
        '<div class="h3d-acao"><span class="h3d-toque"></span></div>' +
        '<div class="h3d-flash"></div>';
    container.appendChild(raiz);

    const $ = (s) => raiz.querySelector(s);
    const canvas = $('.h3d-canvas');
    const elDica = $('.h3d-dica');
    const elAcao = $('.h3d-acao');
    const elFlash = $('.h3d-flash');
    const elToque = $('.h3d-toque');
    elToque.textContent = MOBILE ? 'toque de novo para entrar' : 'clique de novo para entrar';
    Object.assign(elToque.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        transform: 'translate(-50%, 0)',
        whiteSpace: 'nowrap',
        font: "500 .62rem/1 'Montserrat', system-ui, sans-serif",
        letterSpacing: '.14em',
        color: 'rgba(255, 226, 241, .85)',
        textShadow: '0 0 10px rgba(255, 150, 205, .7), 0 0 3px #05030d',
        pointerEvents: 'none'
    });

    let renderer;
    try {
        renderer = new T.WebGLRenderer({ canvas: canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
    } catch (e) {
        raiz.remove();
        if (cfg.aoFalhar) cfg.aoFalhar(e);
        return { destruir() {} };
    }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const DPR = renderer.getPixelRatio();

    /* ---------- texturas desenhadas na hora ---------- */
    function novoCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }
    function viraTextura(c) {
        const t = new T.CanvasTexture(c);
        t.generateMipmaps = false;
        t.minFilter = T.LinearFilter;
        t.magFilter = T.LinearFilter;
        return t;
    }
    function texBrilho(rgb) {
        const c = novoCanvas(128, 128), g = c.getContext('2d');
        const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(' + rgb + ',1)');
        gr.addColorStop(0.35, 'rgba(' + rgb + ',0.35)');
        gr.addColorStop(1, 'rgba(' + rgb + ',0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 128, 128);
        return viraTextura(c);
    }
    function texPonto() {
        const c = novoCanvas(64, 64), g = c.getContext('2d');
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.4, 'rgba(255,255,255,0.8)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 64);
        return viraTextura(c);
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
    function rr(g, x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
    }
    function batida(t, periodo) {
        const fase = (t % periodo) / periodo;
        const b1 = Math.exp(-Math.pow((fase - 0.06) / 0.045, 2));
        const b2 = 0.65 * Math.exp(-Math.pow((fase - 0.2) / 0.055, 2));
        return Math.min(1, b1 + b2);
    }

    /* ---------- cena, câmera, órbita ---------- */
    const cena = new T.Scene();
  cena.background = new T.Color(0x000000);
    const FOV = 55;
    const camera = new T.PerspectiveCamera(FOV, 1, 0.1, 500);
    cena.add(camera);                       // precisa estar na cena: o "mergulho" é filho da câmera
    const alvo = new T.Vector3(0, 2.6, 0);
    const orb = {
        theta: 0.55, phi: 1.0, dist: 17, base: 17, vTheta: 0, arrastando: false, ultima: 0,
        min: 8, max: 42, phiMin: 0.3, phiMax: 2.2, auto: REDUZIR ? 0.01 : 0.05, zoomou: false
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
            if (orb.auto && performance.now() - orb.ultima > 2500 && sel < 0) orb.theta += dt * orb.auto;
        }
        orb.phi = clamp(orb.phi, orb.phiMin, orb.phiMax);
        orb.dist = clamp(orb.dist, orb.min, orb.max);
    }

    /* ---------- estado ---------- */
    let tempo = 0, pulso = 99, sel = -1, entrando = false, proxCoracao = 1.5;
    let tEntrar = 0, warp = 0, distWarp = 0, overlayAtual = 0;
    let visivel = true, rodando = false, ultimo = 0, rafId = 0, destruido = false;
    let aspecto = 1, ladoA = 1;       // aspecto da tela
    const itens = [];
    const voando = [];
    const tmp = new T.Vector3();
    const dirCam = new T.Vector3();
    const vUp = new T.Vector3();
    const alvoFoco = new T.Vector3();
    const DICA = MOBILE
        ? 'arraste: girar · pinça: zoom · toque: escolher'
        : 'arraste: girar · role: zoom · clique: escolher';
    elDica.textContent = DICA;

    /* ---------- a galáxia principal (espiral definida) ---------- */
    const RAIO = 7.5, RAMOS = 3, TORCAO = 0.85;
    const N = MOBILE ? 45000 : 120000;
    const N_HALO = MOBILE ? 32000 : 85000;
    const HALO_BRILHO = 0.3;          // mais alto = poeira em volta mais visível
    const BRILHO_GALAXIA = 0.7;       // brilho da espiral

    const VERTICE = [
        'uniform float uTempo; uniform float uTam; uniform float uPulso; uniform float uGiro;',
        'attribute vec3 aCor; attribute float aTam; attribute float aAleat;',
        'varying vec3 vCor; varying float vBrilho;',
        'void main() {',
        '  vec3 p = position;',
        '  float r = length(p.xz);',
        '  float ang = uTempo * 0.06 + uGiro / (1.0 + r * 0.25);',   // gira inteira (os braços não "enrolam")
        '  float c = cos(ang); float s = sin(ang);',
        '  p.xz = vec2(c * p.x - s * p.z, s * p.x + c * p.z);',
        '  p.y += sin(uTempo * 0.6 + r * 1.3 + aAleat * 6.2831) * 0.03 * r;',
        '  float frente = uPulso * 7.0;',
        '  float onda = exp(-pow((r - frente) / 0.9, 2.0)) * step(uPulso, 3.0);',
        '  p.y += onda * 0.35;',
        '  vBrilho = onda;',
        '  vCor = aCor;',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  float pisca = 0.85 + 0.15 * sin(uTempo * 2.0 + aAleat * 50.0);',
        '  gl_PointSize = aTam * uTam * pisca * (1.0 + onda * 1.6) / -mv.z;',
        '  gl_Position = projectionMatrix * mv;',
        '}'
    ].join('\n');
    const FRAGMENTO = [
        'uniform float uBrilho;',
        'varying vec3 vCor; varying float vBrilho;',
        'void main() {',
        '  float d = length(gl_PointCoord - vec2(0.5));',
        '  if (d > 0.5) discard;',
        '  float a = pow(1.0 - d * 2.0, 2.2);',
        '  vec3 cor = vCor + vec3(1.0, 0.55, 0.8) * vBrilho * 0.9;',
        '  gl_FragColor = vec4(cor, a * uBrilho);',
        '}'
    ].join('\n');

    let matGalaxia, estrelas, grupoCoracao;
    const recursos = [];   // tudo que precisa de dispose()

    function construirGalaxia() {
        const pos = new Float32Array(N * 3), cor = new Float32Array(N * 3);
        const tam = new Float32Array(N), alea = new Float32Array(N);
        const cDentro = new T.Color('#fff1da'), cFora = new T.Color('#5a8cff');
        const cRosa = new T.Color('#ff7ab6'), cRoxo = new T.Color('#9b7bff');
        const c = new T.Color();

        for (let i = 0; i < N; i++) {
            const r = Math.pow(Math.random(), 1.7) * RAIO;
            const f = r / RAIO;
            const braco = (i % RAMOS) / RAMOS * Math.PI * 2;
            // largura do braço em ângulo: fina no centro, mais larga fora = braços bem definidos
            let ang = braco + r * TORCAO + gauss() * (0.16 + 0.3 * f);
            if (Math.random() < 0.1) ang = Math.random() * Math.PI * 2;   // um pouco de "névoa" entre os braços
            pos[i * 3] = Math.cos(ang) * r;
            pos[i * 3 + 1] = gauss() * (0.04 + 0.45 * Math.exp(-r * 0.8));
            pos[i * 3 + 2] = Math.sin(ang) * r;

            c.copy(cDentro).lerp(cFora, Math.pow(f, 0.7));
            const sorte = Math.random();
            if (sorte < 0.14) c.lerp(cRosa, 0.7);
            else if (sorte < 0.24) c.lerp(cRoxo, 0.65);
            // a borda se dissolve (some aos poucos) em vez de terminar "cortada"
            const luz = (0.55 + 0.9 * Math.exp(-r * 0.7)) * (1 - Math.pow(f, 2.4));
            cor[i * 3] = c.r * luz;
            cor[i * 3 + 1] = c.g * luz;
            cor[i * 3 + 2] = c.b * luz;
            tam[i] = (Math.random() < 0.03 ? 1.8 : 0.35) + Math.random() * 0.85;
            alea[i] = Math.random();
        }

        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('aCor', new T.BufferAttribute(cor, 3));
        geo.setAttribute('aTam', new T.BufferAttribute(tam, 1));
        geo.setAttribute('aAleat', new T.BufferAttribute(alea, 1));
        matGalaxia = new T.ShaderMaterial({
            uniforms: {
                uTempo: { value: 0 },
                uTam: { value: 62 * DPR },
                uPulso: { value: 99 },
                uGiro: { value: 0 },
                uBrilho: { value: BRILHO_GALAXIA }
            },
            vertexShader: VERTICE,
            fragmentShader: FRAGMENTO,
            transparent: true,
            depthWrite: false,
            blending: T.AdditiveBlending
        });
        const galaxia = new T.Points(geo, matGalaxia);
        galaxia.frustumCulled = false;
        const grupo = new T.Group();
        grupo.rotation.z = 0.15;
        grupo.add(galaxia);
        cena.add(grupo);
        recursos.push(geo, matGalaxia);

        const nucleo = new T.Sprite(new T.SpriteMaterial({ map: texBrilho('255,236,246'), transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
        nucleo.scale.set(4, 4, 1);
        cena.add(nucleo);
        const halo = new T.Sprite(new T.SpriteMaterial({ map: texBrilho('120,150,255'), transparent: true, opacity: 0.04, blending: T.AdditiveBlending, depthWrite: false }));
        halo.scale.set(15, 15, 1);
        cena.add(halo);

        // estrelas de fundo
const nE = MOBILE ? 1200 : 2600;
        const ep = new Float32Array(nE * 3), ec = new Float32Array(nE * 3);
        for (let i = 0; i < nE; i++) {
            const r = rand(50, 110), u = rand(-1, 1), th = rand(0, Math.PI * 2);
            const s = Math.sqrt(1 - u * u);
            ep[i * 3] = r * s * Math.cos(th);
            ep[i * 3 + 1] = r * u;
            ep[i * 3 + 2] = r * s * Math.sin(th);
            const q = Math.random();
            const tom = q < 0.6 ? [1, 1, 1] : q < 0.85 ? [0.75, 0.85, 1] : [1, 0.8, 0.9];
            ec[i * 3] = tom[0]; ec[i * 3 + 1] = tom[1]; ec[i * 3 + 2] = tom[2];
        }
        const eg = new T.BufferGeometry();
        eg.setAttribute('position', new T.BufferAttribute(ep, 3));
        eg.setAttribute('color', new T.BufferAttribute(ec, 3));
        estrelas = new T.Points(eg, new T.PointsMaterial({ size: 0.55, map: texPonto(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true, sizeAttenuation: true }));
        cena.add(estrelas);
                estrelas.renderOrder = -30;
        recursos.push(eg);

        // nuvens de cor ao fundo (bem sutis)
        [['255,120,190', 0.02, [-40, 10, -30], 70], ['120,140,255', 0.018, [45, -5, -40], 80], ['170,110,255', 0.015, [5, 25, -60], 90]].forEach((n) => {
            const sp = new T.Sprite(new T.SpriteMaterial({ map: texBrilho(n[0]), transparent: true, opacity: n[1], blending: T.AdditiveBlending, depthWrite: false }));
            sp.position.set(n[2][0], n[2][1], n[2][2]);
            sp.scale.set(n[3], n[3], 1);
            cena.add(sp);
        });

        // coração de partículas
        grupoCoracao = new T.Group();
        grupoCoracao.position.set(0, 3.1, 0);
        cena.add(grupoCoracao);
        const nH = MOBILE ? 3400 : 7000;
        const hp = new Float32Array(nH * 3), hc = new Float32Array(nH * 3);
        const paleta = ['#ffffff', '#ffd6ec', '#ffb3d9', '#e3c4ff'].map((x) => new T.Color(x));
        for (let i = 0; i < nH; i++) {
            const t = rand(0, Math.PI * 2);
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            const dentro = Math.random() < 0.15;
            const k = dentro ? Math.random() * 0.9 : 0.9 + Math.pow(Math.random(), 3) * 0.14;
            const s = 0.11;
            hp[i * 3] = x * k * s;
            hp[i * 3 + 1] = (y + 2.5) * k * s;
            hp[i * 3 + 2] = (Math.random() + Math.random() + Math.random() - 1.5) * 0.7 * (0.5 + 0.5 * Math.abs(Math.sin(t)));
            const cc = pick(paleta);
            hc[i * 3] = cc.r; hc[i * 3 + 1] = cc.g; hc[i * 3 + 2] = cc.b;
        }
        const hg = new T.BufferGeometry();
        hg.setAttribute('position', new T.BufferAttribute(hp, 3));
        hg.setAttribute('color', new T.BufferAttribute(hc, 3));
        grupoCoracao.add(new T.Points(hg, new T.PointsMaterial({ size: 0.07, map: texPonto(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true, sizeAttenuation: true })));
        recursos.push(hg);

        const aura = new T.Sprite(new T.SpriteMaterial({ map: texBrilho('255,120,190'), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
        aura.scale.set(6.5, 6.5, 1);
        grupoCoracao.add(aura);

        const cc = novoCanvas(1280, 720);
        ctxContador = cc.getContext('2d');
        ctxContador.scale(2, 2);
        texContador = viraTextura(cc);
        const spTexto = new T.Sprite(new T.SpriteMaterial({ map: texContador, transparent: true, depthTest: false, depthWrite: false }));
        spTexto.scale.set(3.5, 3.5 * 360 / 640, 1);
        spTexto.renderOrder = 3;
        spTexto.position.set(0, 0.2, 0);
        grupoCoracao.add(spTexto);
        desenharContador();
    }

    /* ---------- universo extra: estrelas piscando, galáxias longe, cadentes ---------- */
    const camadasEstrelas = [];
    const galaxiasLonge = [];
    const cometas = [];

    function espiral(n, raio, cor1, cor2) {
        const p = new Float32Array(n * 3), col = new Float32Array(n * 3);
        const a = new T.Color(cor1), b = new T.Color(cor2), c = new T.Color();
        for (let i = 0; i < n; i++) {
            const r = Math.pow(Math.random(), 1.2) * raio;
            const f = r / raio;
            const ang = (i % 2) * Math.PI + f * 5;
            const esp = raio * 0.18 * (0.25 + f);
            p[i * 3] = Math.cos(ang) * r + (Math.random() - 0.5) * esp;
            p[i * 3 + 1] = (Math.random() - 0.5) * raio * 0.06 * Math.exp(-f * 2);
            p[i * 3 + 2] = Math.sin(ang) * r + (Math.random() - 0.5) * esp;
            c.copy(a).lerp(b, f).multiplyScalar(0.6 + Math.random() * 0.5);
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(p, 3));
        geo.setAttribute('color', new T.BufferAttribute(col, 3));
        return geo;
    }

    function construirUniverso() {
        const ponto = texPonto();

        // duas camadas de estrelas que piscam em fases opostas
for (let k = 0; k < 2; k++) {
const n = MOBILE ? 1300 : 2800;
            const p = new Float32Array(n * 3), col = new Float32Array(n * 3);
            for (let i = 0; i < n; i++) {
                const r = rand(40, 130), u = rand(-1, 1), th = rand(0, Math.PI * 2), s = Math.sqrt(1 - u * u);
                p[i * 3] = r * s * Math.cos(th);
                p[i * 3 + 1] = r * u;
                p[i * 3 + 2] = r * s * Math.sin(th);
                const q = Math.random();
                const tom = q < 0.55 ? [1, 1, 1] : q < 0.8 ? [0.7, 0.82, 1] : q < 0.93 ? [1, 0.8, 0.92] : [0.85, 0.75, 1];
                col[i * 3] = tom[0]; col[i * 3 + 1] = tom[1]; col[i * 3 + 2] = tom[2];
            }
            const geo = new T.BufferGeometry();
            geo.setAttribute('position', new T.BufferAttribute(p, 3));
            geo.setAttribute('color', new T.BufferAttribute(col, 3));
            const pts = new T.Points(geo, new T.PointsMaterial({ size: k ? 0.42 : 0.3, map: ponto, transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true }));
            cena.add(pts);
                        pts.renderOrder = -29;
            camadasEstrelas.push(pts);
            recursos.push(geo);
        }

        // galáxias bem distantes (apagadas, só pra indicar que existem)
        [
            [-42, 16, -60, 9, '#fff1f8', '#7aa8ff', 0.6, 0.3, '120,160,255'],
            [52, -8, -70, 12, '#ffe6f2', '#c58bff', 1.0, -0.4, '190,140,255'],
            [16, 38, -90, 14, '#fff6e6', '#ff8fbf', 0.4, 0.6, '255,140,190']
        ].forEach((d) => {
            const geo = espiral(MOBILE ? 3500 : 7000, d[3], d[4], d[5]);
            const pts = new T.Points(geo, new T.PointsMaterial({ size: 0.3, opacity: 0.28, map: ponto, transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true }));
            const gr = new T.Group();
            gr.position.set(d[0], d[1], d[2]);
            gr.rotation.set(d[6], 0, d[7]);
            gr.add(pts);
            cena.add(gr);
            const halo = new T.Sprite(new T.SpriteMaterial({ map: texBrilho(d[8]), transparent: true, opacity: 0.05, blending: T.AdditiveBlending, depthWrite: false }));
            halo.position.set(d[0], d[1], d[2]);
            halo.scale.set(d[3] * 2.8, d[3] * 2.8, 1);
            cena.add(halo);
            galaxiasLonge.push(pts);
            recursos.push(geo);
        });

        // estrelas cadentes
        const cabecaTex = texBrilho('255,235,250');
        for (let i = 0; i < 3; i++) {
            const geo = new T.BufferGeometry();
            geo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
            geo.setAttribute('color', new T.BufferAttribute(new Float32Array([0, 0, 0, 1, 0.92, 1]), 3));
            const linha = new T.Line(geo, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
            linha.frustumCulled = false;
            linha.visible = false;
            const cabeca = new T.Sprite(new T.SpriteMaterial({ map: cabecaTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
            cabeca.scale.set(1.1, 1.1, 1);
            cabeca.visible = false;
            cena.add(linha);
            cena.add(cabeca);
            recursos.push(geo);
            cometas.push({ linha: linha, cabeca: cabeca, vida: 0, dur: 1, espera: rand(1.5, 5), p: new T.Vector3(), v: new T.Vector3() });
        }
    }

    function lancarCometa(c) {
        const r = rand(55, 80), u = rand(-0.2, 0.9), th = rand(0, Math.PI * 2), s = Math.sqrt(1 - u * u);
        c.p.set(r * s * Math.cos(th), r * u, r * s * Math.sin(th));
        c.v.set(rand(-1, 1), rand(-0.7, -0.1), rand(-1, 1)).normalize().multiplyScalar(rand(40, 60));
        c.dur = c.vida = rand(0.9, 1.5);
        c.linha.visible = true;
        c.cabeca.visible = true;
    }

    /* ---------- detalhes da galáxia: poeira, neblina colorida, núcleo, fio do coração ---------- */
    let grupoSpin = null, espinho = null, matFio = null;

    function texEspinho() {
        const c = novoCanvas(256, 256), g = c.getContext('2d');
        g.translate(128, 128);
        [0, Math.PI / 2].forEach((a) => {
            g.save();
            g.rotate(a);
            const gr = g.createLinearGradient(-128, 0, 128, 0);
            gr.addColorStop(0, 'rgba(255,220,240,0)');
            gr.addColorStop(0.5, 'rgba(255,245,250,0.9)');
            gr.addColorStop(1, 'rgba(255,220,240,0)');
            g.fillStyle = gr;
            g.beginPath();
            g.ellipse(0, 0, 128, 3.5, 0, 0, Math.PI * 2);
            g.fill();
            g.restore();
        });
        return viraTextura(c);
    }

    function construirDetalhesGalaxia() {
        const ponto = texPonto();
        const inclina = new T.Group();
        inclina.rotation.z = 0.15;
        cena.add(inclina);
        grupoSpin = new T.Group();
        inclina.add(grupoSpin);

        // 1) halo de poeira fina: é o que faz a galáxia "dissolver" no céu (como na referência)
        const hp = new Float32Array(N_HALO * 3), hc = new Float32Array(N_HALO * 3);
        const manchas = [   // [x, z, cor] — regiões de neblina colorida
            [-5.5, 2.5, [0.25, 0.9, 0.75]], [2.0, -6.0, [1.0, 0.8, 0.35]], [-3.0, -4.5, [0.55, 0.35, 0.95]],
            [5.5, 3.5, [1.0, 0.45, 0.75]], [0.5, 6.5, [0.35, 0.5, 1.0]]
        ];
        for (let i = 0; i < N_HALO; i++) {
            const r = -Math.log(1 - Math.random() * 0.995) * 5.2 + 0.4;
            const a = Math.random() * Math.PI * 2;
            const x = Math.cos(a) * r, z = Math.sin(a) * r;
            hp[i * 3] = x;
            hp[i * 3 + 1] = gauss() * (0.5 + 0.22 * r);
            hp[i * 3 + 2] = z;
            let cr = 0.85 * 0.7, cg = 0.88 * 0.7, cb = 1.0 * 0.7;
            for (let m = 0; m < manchas.length; m++) {
                const mm = manchas[m];
                const d2 = (x - mm[0]) * (x - mm[0]) + (z - mm[1]) * (z - mm[1]);
                const w = Math.exp(-d2 / (2 * 3.2 * 3.2)) * 0.8;
                cr = cr * (1 - w) + mm[2][0] * w * 0.85;
                cg = cg * (1 - w) + mm[2][1] * w * 0.85;
                cb = cb * (1 - w) + mm[2][2] * w * 0.85;
            }
            const k = 0.45 + 0.55 * Math.exp(-r / 9);
            hc[i * 3] = cr * k; hc[i * 3 + 1] = cg * k; hc[i * 3 + 2] = cb * k;
        }
        const hg = new T.BufferGeometry();
        hg.setAttribute('position', new T.BufferAttribute(hp, 3));
        hg.setAttribute('color', new T.BufferAttribute(hc, 3));
        grupoSpin.add(new T.Points(hg, new T.PointsMaterial({
            size: MOBILE ? 0.07 : 0.05, map: ponto, transparent: true, opacity: HALO_BRILHO,
            depthWrite: false, blending: T.AdditiveBlending, vertexColors: true, sizeAttenuation: true
        })));
        recursos.push(hg);

        // 2) neblina colorida bem suave (verde-água, dourado, roxo, rosa, azul)
        [['60,210,180', -5.5, 2.5, 11], ['255,200,90', 2.0, -6.0, 10], ['150,90,230', -3.0, -4.5, 12], ['255,110,190', 5.5, 3.5, 10], ['80,120,255', 0.5, 6.5, 12]].forEach((n) => {
            const sp = new T.Sprite(new T.SpriteMaterial({ map: texBrilho(n[0]), transparent: true, opacity: 0.04, blending: T.AdditiveBlending, depthWrite: false }));
            sp.position.set(n[1], 0, n[2]);
            sp.scale.set(n[3], n[3], 1);
            grupoSpin.add(sp);
        });

        // 3) bulbo do núcleo: denso e quente
        const nB = MOBILE ? 5000 : 10000;
        const bp = new Float32Array(nB * 3), bc = new Float32Array(nB * 3);
        const quente = ['#fff1dc', '#ffd0e6', '#ffffff', '#ffc2a8'].map((x) => new T.Color(x));
        for (let i = 0; i < nB; i++) {
            bp[i * 3] = gauss() * 0.9;
            bp[i * 3 + 1] = gauss() * 0.5;
            bp[i * 3 + 2] = gauss() * 0.9;
            const cc = quente[i % quente.length];
            const l = 0.5 + Math.random() * 0.6;
            bc[i * 3] = cc.r * l; bc[i * 3 + 1] = cc.g * l; bc[i * 3 + 2] = cc.b * l;
        }
        const bg = new T.BufferGeometry();
        bg.setAttribute('position', new T.BufferAttribute(bp, 3));
        bg.setAttribute('color', new T.BufferAttribute(bc, 3));
        grupoSpin.add(new T.Points(bg, new T.PointsMaterial({ size: 0.09, map: ponto, transparent: true, opacity: 0.8, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true })));
        recursos.push(bg);

        // 4) nós de formação de estrelas nos braços (pontinhos rosa e azuis)
        const nN = MOBILE ? 18 : 30, porNo = MOBILE ? 70 : 130, tot = nN * porNo;
        const kp = new Float32Array(tot * 3), kc = new Float32Array(tot * 3);
        const kt = new Float32Array(tot), ka = new Float32Array(tot);
        const rosaN = new T.Color('#ff7ab6'), azulN = new T.Color('#7fb2ff'), brancoN = new T.Color('#ffffff'), c = new T.Color();
        let idx = 0;
        for (let n = 0; n < nN; n++) {
            const ramo = ((n % RAMOS) / RAMOS) * Math.PI * 2;
            const r = rand(1.6, RAIO * 0.85);
            const ang = ramo + r * TORCAO + rand(-0.12, 0.12);
            const cx = Math.cos(ang) * r, cz = Math.sin(ang) * r;
            const raioNo = rand(0.12, 0.3);
            const cor = Math.random() < 0.6 ? rosaN : azulN;
            for (let j = 0; j < porNo; j++, idx++) {
                const d = Math.pow(Math.random(), 1.6) * raioNo;
                const a2 = rand(0, Math.PI * 2);
                kp[idx * 3] = cx + Math.cos(a2) * d;
                kp[idx * 3 + 1] = rand(-0.05, 0.05);
                kp[idx * 3 + 2] = cz + Math.sin(a2) * d;
                c.copy(cor).lerp(brancoN, Math.random() * 0.5 + (1 - d / raioNo) * 0.3);
                kc[idx * 3] = c.r; kc[idx * 3 + 1] = c.g; kc[idx * 3 + 2] = c.b;
                kt[idx] = 0.8 + Math.random() * 1.4;
                ka[idx] = Math.random();
            }
        }
        const kg = new T.BufferGeometry();
        kg.setAttribute('position', new T.BufferAttribute(kp, 3));
        kg.setAttribute('aCor', new T.BufferAttribute(kc, 3));
        kg.setAttribute('aTam', new T.BufferAttribute(kt, 1));
        kg.setAttribute('aAleat', new T.BufferAttribute(ka, 1));
        const nos = new T.Points(kg, matGalaxia);   // mesmo shader da galáxia: gira junto
        nos.frustumCulled = false;
        inclina.add(nos);
        recursos.push(kg);

        // 5) estrela de 4 pontas no centro, pulsando
        espinho = new T.Sprite(new T.SpriteMaterial({ map: texEspinho(), transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false }));
        espinho.scale.set(9, 9, 1);
        cena.add(espinho);

        // 6) fio de partículas subindo do núcleo até a ponta do coração (como na referência)
        const nF = MOBILE ? 700 : 1500;
        const fp = new Float32Array(nF * 3), fa = new Float32Array(nF);
        for (let i = 0; i < nF; i++) {
            fp[i * 3] = gauss() * 0.16;
            fp[i * 3 + 1] = Math.random();           // altura relativa (0 a 1)
            fp[i * 3 + 2] = gauss() * 0.16;
            fa[i] = Math.random();
        }
        const fg = new T.BufferGeometry();
        fg.setAttribute('position', new T.BufferAttribute(fp, 3));
        fg.setAttribute('aAleat', new T.BufferAttribute(fa, 1));
        matFio = new T.ShaderMaterial({
            uniforms: { uTempo: { value: 0 }, uTam: { value: 30 * DPR }, uBase: { value: 0.4 }, uAlt: { value: 1.9 } },
            vertexShader: [
                'uniform float uTempo; uniform float uTam; uniform float uBase; uniform float uAlt;',
                'attribute float aAleat; varying float vA;',
                'void main() {',
                '  float h = fract(position.y + uTempo * (0.07 + aAleat * 0.09));',
                '  vec3 p;',
                '  p.x = position.x * (0.3 + 1.0 * h) + sin(uTempo * 1.2 + aAleat * 20.0) * 0.05 * h;',
                '  p.z = position.z * (0.3 + 1.0 * h) + cos(uTempo * 1.0 + aAleat * 17.0) * 0.05 * h;',
                '  p.y = uBase + h * uAlt;',
                '  vA = smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(0.8, 1.0, h)) * (0.4 + 0.6 * aAleat);',
                '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
                '  gl_PointSize = uTam * (0.5 + aAleat * 0.8) / -mv.z;',
                '  gl_Position = projectionMatrix * mv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying float vA;',
                'void main() {',
                '  float d = length(gl_PointCoord - vec2(0.5));',
                '  if (d > 0.5) discard;',
                '  gl_FragColor = vec4(1.0, 0.86, 0.95, pow(1.0 - d * 2.0, 2.0) * vA);',
                '}'
            ].join('\n'),
            transparent: true, depthWrite: false, blending: T.AdditiveBlending
        });
        const fio = new T.Points(fg, matFio);
        fio.frustumCulled = false;
        cena.add(fio);
        recursos.push(fg, matFio);
    }

    /* ---------- o sol: bem longe, suave, com um brilho delicado ---------- */
    let sol = null, matSol = null, solRaios = null;
    const solHalos = [];
    const SOL_BRILHO = 0.8;      // brilho do disco (menor = mais discreto)

    // raios finos e transparentes, de tamanhos variados
    function texRaiosSol() {
        const c = novoCanvas(256, 256), g = c.getContext('2d');
        g.translate(128, 128);
        const n = 14;
        for (let i = 0; i < n; i++) {
            g.save();
            g.rotate((i / n) * Math.PI * 2 + (i % 2) * 0.1);
            const comp = 70 + (i % 3) * 22;
            const gr = g.createLinearGradient(0, 0, comp, 0);
            gr.addColorStop(0, 'rgba(255,236,190,0.55)');
            gr.addColorStop(1, 'rgba(255,236,190,0)');
            g.fillStyle = gr;
            g.beginPath();
            g.moveTo(10, -2.2);
            g.lineTo(comp, 0);
            g.lineTo(10, 2.2);
            g.closePath();
            g.fill();
            g.restore();
        }
        return viraTextura(c);
    }

    function construirSol() {
        matSol = new T.ShaderMaterial({
            uniforms: { uT: { value: 0 } },
            transparent: true,
            depthWrite: false,
            blending: T.AdditiveBlending,
            vertexShader: [
                'varying vec3 vN; varying vec3 vP; varying vec3 vV;',
                'void main() {',
                '  vN = normalize(normalMatrix * normal);',
                '  vP = position;',
                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
                '  vV = normalize(-mv.xyz);',
                '  gl_Position = projectionMatrix * mv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform float uT;',
                'varying vec3 vN; varying vec3 vP; varying vec3 vV;',
                'float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
                'float noise(vec3 x) {',
                '  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);',
                '  float a = hash(i);',
                '  float b = hash(i + vec3(1.0, 0.0, 0.0));',
                '  float c = hash(i + vec3(0.0, 1.0, 0.0));',
                '  float d = hash(i + vec3(1.0, 1.0, 0.0));',
                '  float e = hash(i + vec3(0.0, 0.0, 1.0));',
                '  float f1 = hash(i + vec3(1.0, 0.0, 1.0));',
                '  float g1 = hash(i + vec3(0.0, 1.0, 1.0));',
                '  float h = hash(i + vec3(1.0, 1.0, 1.0));',
                '  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, f1, f.x), mix(g1, h, f.x), f.y), f.z);',
                '}',
                'float fbm(vec3 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 3; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }',
                'void main() {',
                '  vec3 p = normalize(vP);',
                '  float t = uT * 0.03;',
                '  float g = fbm(p * 4.0 + vec3(t, -t * 0.6, t * 0.4));',
                '  float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);',
                '  float limb = pow(mu, 0.45);',
                '  vec3 borda = vec3(1.0, 0.58, 0.42);',     // laranja-rosado nas bordas
                '  vec3 miolo = vec3(1.0, 0.95, 0.80);',     // creme quente no centro
                '  vec3 col = mix(borda, miolo, limb);',
                '  col *= 0.92 + 0.14 * g;',
                '  float a = smoothstep(0.0, 0.55, mu);',    // a borda se dissolve, sem contorno duro
                '  gl_FragColor = vec4(col, a * ' + SOL_BRILHO.toFixed(2) + ');',
                '}'
            ].join('\n')
        });
        sol = new T.Mesh(new T.SphereGeometry(3.0, 40, 30), matSol);
        sol.position.set(72, 27, 75);
        cena.add(sol);

        // brilho quente em volta (três camadas bem suaves, a última puxa pro rosa do site)
        [['255,226,170', 0.30, 12], ['255,170,120', 0.10, 26], ['255,150,170', 0.05, 46]].forEach((h) => {
            const s = new T.Sprite(new T.SpriteMaterial({ map: texBrilho(h[0]), transparent: true, opacity: h[1], blending: T.AdditiveBlending, depthWrite: false }));
            s.position.copy(sol.position);
            s.scale.set(h[2], h[2], 1);
            s.userData.base = h[1];
            cena.add(s);
            solHalos.push(s);
        });

        solRaios = new T.Sprite(new T.SpriteMaterial({ map: texRaiosSol(), transparent: true, opacity: 0.13, blending: T.AdditiveBlending, depthWrite: false }));
        solRaios.position.copy(sol.position);
        solRaios.scale.set(34, 34, 1);
        cena.add(solRaios);

        recursos.push(sol.geometry, matSol);
    }

        /* ---------- sistema solar: planetinhas orbitando o sol, lá no fundo ---------- */
    let sistema = null, cinturao = null, oclusorSol = null;
    const planetas = [];
    const luas = [];
    const vSolDir = new T.Vector3();
    const ESCALA_PLANETAS = 0.8;     // tamanho dos planetas (menor = mais discretos)
    const ESCALA_ORBITAS = 1.0;      // tamanho das órbitas
    const PERIODO_TERRA = 70;        // segundos pra Terra dar uma volta (os outros seguem a proporção real)

    // raio e órbita em "tamanhos de sol" (o sol do código tem raio 3.0): Júpiter = 0.38 sóis, Terra = 0.14...
    const PLANETAS = [
        { nome: 'Mercúrio', raio: 0.075, orbita: 1.9,  tipo: 0, bandas: 0, c1: [0.62, 0.60, 0.58], c2: [0.34, 0.32, 0.31], atm: [0.0, 0.0, 0.0], spin: 0.2,  tilt: 0.0 },
        { nome: 'Vênus',    raio: 0.13,  orbita: 2.5,  tipo: 0, bandas: 0, c1: [0.98, 0.86, 0.60], c2: [0.86, 0.66, 0.40], atm: [1.0, 0.8, 0.5],   spin: -0.1, tilt: 0.1 },
        { nome: 'Terra',    raio: 0.14,  orbita: 3.2,  tipo: 2, bandas: 0, c1: [0.08, 0.27, 0.66], c2: [0.24, 0.52, 0.24], atm: [0.35, 0.6, 1.0],  spin: 0.9,  tilt: 0.41, lua: true },
        { nome: 'Marte',    raio: 0.10,  orbita: 4.0,  tipo: 0, bandas: 0, c1: [0.80, 0.38, 0.22], c2: [0.52, 0.22, 0.14], atm: [0.7, 0.35, 0.25], spin: 0.85, tilt: 0.44 },
        { nome: 'Júpiter',  raio: 0.38,  orbita: 5.6,  tipo: 1, bandas: 7, c1: [0.90, 0.76, 0.60], c2: [0.66, 0.44, 0.32], atm: [0.9, 0.7, 0.5],   spin: 1.6,  tilt: 0.05 },
        { nome: 'Saturno',  raio: 0.33,  orbita: 7.2,  tipo: 1, bandas: 6, c1: [0.94, 0.85, 0.62], c2: [0.76, 0.64, 0.44], atm: [0.9, 0.8, 0.55],  spin: 1.4,  tilt: 0.47, aneis: true },
        { nome: 'Urano',    raio: 0.22,  orbita: 8.7,  tipo: 1, bandas: 3, c1: [0.62, 0.86, 0.88], c2: [0.46, 0.74, 0.80], atm: [0.5, 0.85, 0.9],  spin: -1.0, tilt: 1.4 },
        { nome: 'Netuno',   raio: 0.21,  orbita: 10.0, tipo: 1, bandas: 4, c1: [0.30, 0.44, 0.92], c2: [0.16, 0.26, 0.70], atm: [0.35, 0.5, 1.0],  spin: 1.0,  tilt: 0.5 }
    ];

    // anéis de Saturno: faixas finas com um vão no meio
    function texAneis() {
        const c = novoCanvas(256, 256), g = c.getContext('2d');
        const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        [[0.54, 0], [0.56, 0.55], [0.66, 0.4], [0.68, 0.06], [0.70, 0.5], [0.84, 0.55], [0.855, 0.12], [0.94, 0.38], [1.0, 0]].forEach((s) => {
            gr.addColorStop(s[0], 'rgba(236,222,190,' + s[1] + ')');
        });
        g.fillStyle = gr;
        g.fillRect(0, 0, 256, 256);
        return viraTextura(c);
    }

    // planeta com luz vinda do sol: lado de lá escurece, borda ganha um fio de atmosfera
    function materialPlaneta(d, semente) {
        return new T.ShaderMaterial({
            uniforms: {
                uC1: { value: new T.Vector3(d.c1[0], d.c1[1], d.c1[2]) },
                uC2: { value: new T.Vector3(d.c2[0], d.c2[1], d.c2[2]) },
                uAtm: { value: new T.Vector3(d.atm[0], d.atm[1], d.atm[2]) },
                uSol: { value: sol.position },
                uTipo: { value: d.tipo },
                uBandas: { value: d.bandas },
                uSeed: { value: semente * 7.3 }
            },
            vertexShader: [
                'varying vec3 vN; varying vec3 vW; varying vec3 vP;',
                'void main() {',
                '  vP = position;',
                '  vN = normalize(mat3(modelMatrix) * normal);',
                '  vec4 w = modelMatrix * vec4(position, 1.0);',
                '  vW = w.xyz;',
                '  gl_Position = projectionMatrix * viewMatrix * w;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uAtm; uniform vec3 uSol;',
                'uniform float uTipo; uniform float uBandas; uniform float uSeed;',
                'varying vec3 vN; varying vec3 vW; varying vec3 vP;',
                'float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
                'float noise(vec3 x) {',
                '  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);',
                '  float a = hash(i);',
                '  float b = hash(i + vec3(1.0, 0.0, 0.0));',
                '  float c = hash(i + vec3(0.0, 1.0, 0.0));',
                '  float d = hash(i + vec3(1.0, 1.0, 0.0));',
                '  float e = hash(i + vec3(0.0, 0.0, 1.0));',
                '  float f1 = hash(i + vec3(1.0, 0.0, 1.0));',
                '  float g1 = hash(i + vec3(0.0, 1.0, 1.0));',
                '  float h = hash(i + vec3(1.0, 1.0, 1.0));',
                '  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, f1, f.x), mix(g1, h, f.x), f.y), f.z);',
                '}',
                'float fbm(vec3 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }',
                'void main() {',
                '  vec3 n = normalize(vN);',
                '  vec3 L = normalize(uSol - vW);',
                '  vec3 V = normalize(cameraPosition - vW);',
                '  vec3 p = normalize(vP);',
                '  float rr = fbm(p * 3.0 + uSeed);',
                '  vec3 base;',
                '  if (uTipo > 1.5) {',
                '    base = mix(uC1, uC2, smoothstep(0.50, 0.56, rr));',
                '    float nuvem = smoothstep(0.55, 0.75, fbm(p * 4.5 + uSeed * 2.0 + 7.0));',
                '    base = mix(base, vec3(1.0), nuvem * 0.75);',
                '    base = mix(base, vec3(0.95, 0.97, 1.0), smoothstep(0.82, 0.95, abs(p.y)));',
                '  } else if (uTipo > 0.5) {',
                '    float lat = p.y + (rr - 0.5) * 0.18;',
                '    base = mix(uC1, uC2, 0.5 + 0.5 * sin(lat * uBandas * 6.2831));',
                '  } else {',
                '    base = mix(uC1, uC2, rr);',
                '  }',
                '  float luz = smoothstep(-0.08, 0.30, dot(n, L));',
                '  vec3 col = base * (0.03 + 0.97 * luz);',
                '  float borda = pow(1.0 - max(dot(n, V), 0.0), 3.0);',
                '  col += uAtm * borda * (0.15 + 0.85 * luz) * 0.9;',
                '  gl_FragColor = vec4(col, 1.0);',
                '}'
            ].join('\n')
        });
    }

    function construirSistemaSolar() {
        if (!sol) return;
        const RS = sol.geometry.parameters.radius;           // raio do sol = referência de tamanho
        sistema = new T.Group();
        sistema.position.copy(sol.position);                 // o sistema acompanha a posição do sol
        sistema.rotation.set(0.55, 0.3, -0.2);               // plano das órbitas, levemente inclinado
        cena.add(sistema);

        // disco invisível (só profundidade) que esconde os planetas quando passam ATRÁS do sol
        oclusorSol = new T.Mesh(new T.CircleGeometry(RS * 0.99, 40), new T.MeshBasicMaterial({ colorWrite: false, side: T.DoubleSide }));
        oclusorSol.renderOrder = -100;
        cena.add(oclusorSol);
        recursos.push(oclusorSol.geometry, oclusorSol.material);

        PLANETAS.forEach((d, i) => {
            const raio = d.raio * RS * ESCALA_PLANETAS;
            const distOrb = d.orbita * RS * ESCALA_ORBITAS;

            // linha da órbita, bem fininha
            const pts = [];
            for (let k = 0; k < 120; k++) {
                const a = (k / 120) * Math.PI * 2;
                pts.push(new T.Vector3(Math.cos(a) * distOrb, 0, Math.sin(a) * distOrb));
            }
            const lg = new T.BufferGeometry().setFromPoints(pts);
            const linha = new T.LineLoop(lg, new T.LineBasicMaterial({ color: 0xc9a7f5, transparent: true, opacity: 0.08, depthWrite: false }));
            sistema.add(linha);
            recursos.push(lg, linha.material);

            const pivo = new T.Group();                       // gira = o planeta anda na órbita
            pivo.rotation.y = rand(0, Math.PI * 2);
            sistema.add(pivo);
            const pos = new T.Group();
            pos.position.x = distOrb;
            pivo.add(pos);
            const inclinado = new T.Group();                  // inclinação do eixo do planeta
            inclinado.rotation.z = d.tilt;
            pos.add(inclinado);

            const geo = new T.SphereGeometry(raio, 28, 20);
            const corpo = new T.Mesh(geo, materialPlaneta(d, i + 1));
            inclinado.add(corpo);
            recursos.push(geo, corpo.material);

            // brilhinho: garante que dê pra ver o planeta como um pontinho mesmo bem longe
            const rgb = Math.round(d.c1[0] * 255) + ',' + Math.round(d.c1[1] * 255) + ',' + Math.round(d.c1[2] * 255);
            const brilho = new T.Sprite(new T.SpriteMaterial({ map: texBrilho(rgb), transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false }));
            const e = Math.max(raio * 7, 1.1);
            brilho.scale.set(e, e, 1);
            pos.add(brilho);

            if (d.aneis) {
                const ext = raio * 2.1;
                const ag = new T.RingGeometry(ext * 0.55, ext, 72);
                const am = new T.MeshBasicMaterial({ map: texAneis(), color: 0xe8e0d0, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false });
                const aneis = new T.Mesh(ag, am);
                aneis.rotation.x = -Math.PI / 2;
                inclinado.add(aneis);
                recursos.push(ag, am);
            }

            if (d.lua) {                                      // a Lua da Terra
                const luaPivo = new T.Group();
                luaPivo.rotation.z = 0.09;
                pos.add(luaPivo);
                const lg2 = new T.SphereGeometry(raio * 0.27, 14, 10);
                const lua = new T.Mesh(lg2, materialPlaneta({ tipo: 0, bandas: 0, c1: [0.78, 0.78, 0.76], c2: [0.45, 0.45, 0.45], atm: [0, 0, 0] }, 9));
                lua.position.x = raio * 2.6;
                luaPivo.add(lua);
                luas.push(luaPivo);
                recursos.push(lg2, lua.material);
            }

            // órbita proporcional (3ª lei de Kepler): quanto mais longe, mais devagar
            const omega = (Math.PI * 2 / PERIODO_TERRA) * Math.pow(d.orbita / 3.2, -1.5);
            planetas.push({ pivo: pivo, corpo: corpo, omega: omega, spin: d.spin });
        });

        // cinturão de asteroides entre Marte e Júpiter
        const nA = MOBILE ? 500 : 1100;
        const ap = new Float32Array(nA * 3);
        for (let k = 0; k < nA; k++) {
            const a = Math.random() * Math.PI * 2;
            const r = (4.75 + gauss() * 0.22) * RS * ESCALA_ORBITAS;
            ap[k * 3] = Math.cos(a) * r;
            ap[k * 3 + 1] = gauss() * 0.25;
            ap[k * 3 + 2] = Math.sin(a) * r;
        }
        const cg = new T.BufferGeometry();
        cg.setAttribute('position', new T.BufferAttribute(ap, 3));
        cinturao = new T.Points(cg, new T.PointsMaterial({ color: 0xb8a99a, size: 0.09, map: texPonto(), transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending }));
        sistema.add(cinturao);
        recursos.push(cg, cinturao.material);
    }

    function atualizarSistema(dt) {
        // o disco "escondedor" fica sempre de frente pra câmera, um tiquinho atrás do centro do sol
        vSolDir.copy(sol.position).sub(camera.position).normalize();
        oclusorSol.position.copy(sol.position).addScaledVector(vSolDir, 0.3);
        oclusorSol.quaternion.copy(camera.quaternion);

        planetas.forEach((p) => {
            p.pivo.rotation.y += dt * p.omega;
            p.corpo.rotation.y += dt * p.spin;
        });
        luas.forEach((l) => { l.rotation.y += dt * 1.0; });
        if (cinturao) cinturao.rotation.y += dt * 0.02;
    }
 
    /* ---------- buraco negro: lá no alto, bem longe, estilo Interstellar ---------- */
    let buracoNegro = null, matBN = null;
    const BRILHO_BN = 1.0;        // intensidade (0.6 = discreto · 1.3 = forte)
    const BN_TAMANHO = 64;        // tamanho da "folha" onde ele é desenhado (maior = buraco negro maior)
    // posição FIXA no espaço (x, y, z), como o sol e as galáxias distantes
    // sol: (72, 27, 75) · galáxias: (-42, 16, -60) · (52, -8, -70) · (16, 38, -90)
const BN_POS = new T.Vector3(-252, -16, 95);


    // fica parado no espaço; só vira a "folha" de frente pra câmera (ele é desenhado em 2D)
    function posicionarBuracoNegro() {
        if (!buracoNegro) return;
        buracoNegro.position.copy(BN_POS);
        buracoNegro.quaternion.copy(camera.quaternion);
    }

    function construirBuracoNegro() {
        matBN = new T.ShaderMaterial({
            uniforms: { uT: { value: 0 }, uInt: { value: BRILHO_BN } },
            transparent: true,
            depthWrite: false,
            blending: T.CustomBlending,             // soma a luz, e a sombra esconde as estrelas de trás
            blendEquation: T.AddEquation,
            blendSrc: T.OneFactor,
            blendDst: T.OneMinusSrcAlphaFactor,
            vertexShader: [
                'varying vec2 vUv;',
                'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
            ].join('\n'),
            fragmentShader: [
                'uniform float uT; uniform float uInt;',
                'varying vec2 vUv;',
                'float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
                'float noise(vec3 x) {',
                '  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);',
                '  float a = hash(i);',
                '  float b = hash(i + vec3(1.0, 0.0, 0.0));',
                '  float c = hash(i + vec3(0.0, 1.0, 0.0));',
                '  float d = hash(i + vec3(1.0, 1.0, 0.0));',
                '  float e = hash(i + vec3(0.0, 0.0, 1.0));',
                '  float f1 = hash(i + vec3(1.0, 0.0, 1.0));',
                '  float g1 = hash(i + vec3(0.0, 1.0, 1.0));',
                '  float h = hash(i + vec3(1.0, 1.0, 1.0));',
                '  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, f1, f.x), mix(g1, h, f.x), f.y), f.z);',
                '}',
                'float fbm(vec3 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 3; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }',
                'vec3 gas(float k) {',
                '  k = clamp(k, 0.0, 1.0);',
                '  vec3 c0 = vec3(0.20, 0.04, 0.10); vec3 c1 = vec3(0.85, 0.28, 0.14);',
                '  vec3 c2 = vec3(1.00, 0.66, 0.28); vec3 c3 = vec3(1.00, 0.93, 0.78);',
                '  vec3 c = mix(c0, c1, smoothstep(0.0, 0.35, k));',
                '  c = mix(c, c2, smoothstep(0.30, 0.68, k));',
                '  c = mix(c, c3, smoothstep(0.62, 1.0, k));',
                '  return c;',
                '}',
                'float riscas(float rr, float ang, float rot) {',
                '  return fbm(vec3(rr * 60.0, cos(ang - rot) * 1.3, sin(ang - rot) * 1.3));',
                '}',
                'void main() {',
                '  vec2 p = (vUv - 0.5) * 2.0;',
                '  if (length(p) > 0.985) { gl_FragColor = vec4(0.0); return; }',
                '  float roll = -0.20;',
                '  p = vec2(cos(roll) * p.x - sin(roll) * p.y, sin(roll) * p.x + cos(roll) * p.y);',
                '  float R = 0.14;',
                '  float r = length(p) + 1e-5;',
                '  float ang = atan(p.y, p.x);',
                '  float sombra = 1.0 - smoothstep(R * 0.975, R, r);',
                // disco de gás visto quase de lado, em fios que giram (mais rápido perto do centro)
                '  vec2 d = vec2(p.x, p.y / 0.16);',
                '  float rd = length(d) + 1e-5;',
                '  float rIn = R * 1.22; float rOut = R * 5.0;',
                '  float u = (rd - rIn) / (rOut - rIn);',
                '  float uc = clamp(u, 0.0, 1.0);',
                '  float faixa = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.55, 1.0, u));',
                '  vec3 disco = vec3(0.0);',
                '  if (faixa > 0.001) {',
                '    float angD = atan(d.y, d.x);',
                '    float rot = uT * 0.35 / pow(max(rd / R, 1.0), 1.5);',
                '    float tex = 0.45 + 1.05 * riscas(rd, angD, rot);',
                '    float fino = pow(1.0 - uc, 1.7);',
                '    float beam = 1.0 + 0.6 * clamp(-d.x / rd, -1.0, 1.0);',
                '    disco = gas((1.0 - uc) * 0.95 + 0.1 * tex) * (faixa * fino * 2.3 * tex * beam);',
                '    disco *= 1.0 - sombra * step(0.0, p.y);',
                '  }',
                // luz do disco curvada por cima (grande) e por baixo (menor) da sombra
                '  float h = (r - R) / R;',
                '  float sY = p.y / r;',
                '  float topo = smoothstep(-0.25, 0.85, sY);',
                '  float base = smoothstep(-0.25, 0.85, -sY);',
                '  float larg = 0.12 + 0.25 * pow(max(sY, 0.0), 1.3);',
                '  float larg2 = 0.08 + 0.10 * pow(max(-sY, 0.0), 1.3);',
                '  float t1 = (h - 0.06) / larg; float t2 = (h - 0.05) / larg2;',
                '  float entra = smoothstep(0.0, 0.05, h);',
                '  float luzArco = (exp(-t1 * t1) * topo * 1.8 + exp(-t2 * t2) * base * 0.9) * entra;',
                '  vec3 arcos = vec3(0.0);',
                '  if (luzArco > 0.002) {',
                '    float ta = 0.5 + 1.0 * riscas(r, ang, uT * 0.2 / (1.0 + h * 2.0));',
                '    float lado = 1.0 + 0.4 * clamp(-p.x / r, -1.0, 1.0);',
                '    arcos = gas(0.62 + 0.38 * exp(-max(h, 0.0) * 2.5)) * (luzArco * ta * lado);',
                '  }',
                // anel fininho de luz colado na sombra
                '  float z = (r - R * 1.015) / (R * 0.02);',
                '  float anel = exp(-z * z) * (0.8 + 0.2 * sin(uT * 1.3 + ang * 2.0));',
                '  vec3 aneis = vec3(1.0, 0.94, 0.82) * anel * 1.5;',
                // jatos azuis finos, bem discretos
                '  float ay = abs(p.y);',
                '  float jx = (p.x + sin(p.y * 11.0 + uT * 0.7) * 0.006) / (0.006 + 0.03 * ay);',
                '  float jato = exp(-jx * jx) * smoothstep(R * 1.15, R * 2.2, ay) * exp(-ay * 2.6);',
                '  vec3 jatos = vec3(0.45, 0.72, 1.0) * jato * 0.75 * (0.75 + 0.25 * sin(p.y * 30.0 - uT * 2.0));',
                // brilho suave em volta
                '  float resp = exp(-max(r - R, 0.0) / (R * 3.2)) * step(R, r);',
                '  vec3 brilho = (vec3(0.9, 0.45, 0.18) + vec3(0.28, 0.1, 0.32)) * resp * 0.0;',
                '  vec3 col = disco + arcos + aneis + jatos + brilho;',
                '  col *= 1.0 - smoothstep(0.80, 0.985, r);',
                '  col = min(col, vec3(1.5)) * uInt;',
                '  gl_FragColor = vec4(col, sombra);',
                '}'
            ].join('\n')
        });
        const geo = new T.PlaneGeometry(BN_TAMANHO, BN_TAMANHO);
        buracoNegro = new T.Mesh(geo, matBN);
        buracoNegro.renderOrder = -10;               // desenha depois das estrelas de fundo, antes do resto
        buracoNegro.frustumCulled = false;
        cena.add(buracoNegro);
        posicionarBuracoNegro();
        recursos.push(geo, matBN);
    }

    function atualizarUniverso(dt) {
        if (buracoNegro) { posicionarBuracoNegro(); matBN.uniforms.uT.value = tempo; }
        if (camadasEstrelas[2]) camadasEstrelas[2].material.opacity = 0.8 + 0.2 * Math.sin(tempo * 0.9 + 1.7);

        camadasEstrelas[0].material.opacity = 0.65 + 0.35 * Math.sin(tempo * 1.3);
        camadasEstrelas[1].material.opacity = 0.65 + 0.35 * Math.sin(tempo * 1.3 + Math.PI);
        galaxiasLonge.forEach((g, i) => { g.rotation.y += dt * (0.015 + i * 0.006); });
        if (sol) {
            sol.rotation.y += dt * 0.02;
            matSol.uniforms.uT.value = tempo;
            const respira = 0.5 + 0.5 * Math.sin(tempo * 0.5);
            if (solRaios) {
                solRaios.material.rotation += dt * 0.012;
                solRaios.material.opacity = 0.11 + 0.05 * respira;
            }

            solHalos.forEach((h, i) => {
                h.material.opacity = h.userData.base * (0.9 + 0.2 * Math.sin(tempo * 0.5 + i));
            });
        }
                if (sistema) atualizarSistema(dt);
        if (grupoSpin) grupoSpin.rotation.y -= dt * 0.06;   // mesmo sentido e velocidade da espiral
        if (espinho) {
            espinho.material.rotation += dt * 0.04;
                        espinho.material.opacity = 0.1 + 0.03 * Math.sin(tempo * 1.1);
        }
        if (matFio) matFio.uniforms.uTempo.value = tempo;
        matGalaxia.uniforms.uBrilho.value = BRILHO_GALAXIA - 0.12 + 0.05 * Math.sin(tempo * 0.7);
        cometas.forEach((c) => {
            if (c.vida <= 0) {
                c.espera -= dt;
                if (c.espera <= 0) lancarCometa(c);
                return;
            }
            c.vida -= dt;
            c.p.addScaledVector(c.v, dt);
            const f = clamp(c.vida / c.dur, 0, 1);
            const alfa = Math.sin(f * Math.PI);
            const pos = c.linha.geometry.attributes.position;
            pos.setXYZ(0, c.p.x - c.v.x * 0.3, c.p.y - c.v.y * 0.3, c.p.z - c.v.z * 0.3);
            pos.setXYZ(1, c.p.x, c.p.y, c.p.z);
            pos.needsUpdate = true;
            c.linha.material.opacity = alfa;
            c.cabeca.position.copy(c.p);
            c.cabeca.material.opacity = alfa;
            if (c.vida <= 0) {
                c.linha.visible = false;
                c.cabeca.visible = false;
                c.espera = rand(3, 9);
            }
        });
    }

    /* ---------- "mergulho" ao entrar numa seção: estrelas disparando em volta da câmera ---------- */
    let matWarp = null, linhasWarp = null;

    function construirWarp() {
        const NS = MOBILE ? 420 : 800;
        const pos = new Float32Array(NS * 2 * 3);
        const fim = new Float32Array(NS * 2), vel = new Float32Array(NS * 2), comp = new Float32Array(NS * 2);
        for (let i = 0; i < NS; i++) {
            const a = rand(0, Math.PI * 2);
            const rho = 0.35 + Math.pow(Math.random(), 0.6) * 9;
            const z = rand(0, 60), v = Math.random(), l = rand(0.6, 1.6);
            for (let k = 0; k < 2; k++) {
                const j = i * 2 + k;
                pos[j * 3] = Math.cos(a) * rho;
                pos[j * 3 + 1] = Math.sin(a) * rho;
                pos[j * 3 + 2] = z;
                fim[j] = k; vel[j] = v; comp[j] = l;
            }
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('aFim', new T.BufferAttribute(fim, 1));
        geo.setAttribute('aVel', new T.BufferAttribute(vel, 1));
        geo.setAttribute('aLen', new T.BufferAttribute(comp, 1));
        matWarp = new T.ShaderMaterial({
            uniforms: { uWarp: { value: 0 }, uD: { value: 0 }, uCor: { value: new T.Color('#ff8fbf') } },
            vertexShader: [
                'uniform float uWarp; uniform float uD;',
                'attribute float aFim; attribute float aVel; attribute float aLen;',
                'varying float vA; varying float vF;',
                'void main() {',
                '  float L = 60.0;',
                '  float z = mod(position.z - uD * (14.0 + aVel * 50.0), L);',
                '  float depth = z + 0.8;',
                '  float len = aLen * (0.3 + uWarp * 7.0);',
                '  float zz = depth + (1.0 - aFim) * len;',          // aFim=1: ponta da frente (mais perto)
                '  vec4 mv = modelViewMatrix * vec4(position.x, position.y, -zz, 1.0);',
                '  float perto = smoothstep(0.8, 4.0, depth);',
                '  float longe = 1.0 - smoothstep(30.0, 60.0, depth);',
                '  vA = clamp(uWarp * 1.6, 0.0, 1.0) * perto * longe * (0.25 + 0.75 * aFim);',
                '  vF = aFim;',
                '  gl_Position = projectionMatrix * mv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 uCor; varying float vA; varying float vF;',
                'void main() { gl_FragColor = vec4(mix(uCor, vec3(1.0), vF * 0.7), vA); }'
            ].join('\n'),
            transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending
        });
        linhasWarp = new T.LineSegments(geo, matWarp);
        linhasWarp.frustumCulled = false;
        linhasWarp.renderOrder = 20;
        linhasWarp.visible = false;
        camera.add(linhasWarp);                 // filho da câmera: as estrelas sempre vêm "na sua direção"
        recursos.push(geo, matWarp);
    }

    /* ---------- os cards do hub, orbitando ---------- */
    const CARD_W = 512, CARD_H = 640, CARD_ASPECT = CARD_W / CARD_H;
    const FONTE_TITULO = 'italic 700 64px "Cormorant Garamond", Georgia, serif';
        const AURA_CARD = 0;          // luz rosa atrás dos cards (0 = sem luz · 0.15 = suave · 0.34 = como era)

    // card 3D delicado: fotos empilhadas translúcidas, foto da frente com cantos suaves e brilho rosado,
    // título solto com um halo escuro suave (sem plaquinha)
    function desenharCard(it) {
        const g = it.ctx;
        g.clearRect(0, 0, CARD_W, CARD_H);
        const cx = CARD_W / 2, cy = 262, w = 366, h = 438, r = 42;

        function camada(l) {
            g.save();
            g.globalAlpha = l.alpha;
            g.translate(cx + l.dx, cy + l.dy);
            g.rotate(l.rot);
            rr(g, -w / 2, -h / 2, w, h, r);
            g.clip();
            if (l.im && l.im.naturalWidth) {
                const s = Math.max(w / l.im.naturalWidth, h / l.im.naturalHeight);
                const dw = l.im.naturalWidth * s, dh = l.im.naturalHeight * s;
                g.drawImage(l.im, -dw / 2, -dh / 2, dw, dh);
            } else {
                const gr = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
                gr.addColorStop(0, l.c1);
                gr.addColorStop(1, l.c2);
                g.fillStyle = gr;
                g.fillRect(-w / 2, -h / 2, w, h);
            }
            g.restore();
        }

        // fotos de trás (translúcidas, levemente inclinadas)
        camada({ im: it.imgs[2], rot: -0.1, dx: -20, dy: 10, alpha: 0, c1: '#b58cff', c2: '#6b3fa8' });
        camada({ im: it.imgs[1], rot: 0.07, dx: 16, dy: 6, alpha: 0, c1: '#ff9ccb', c2: '#a8467a' });

        // brilho rosado por trás da foto da frente
        g.save();
        g.shadowColor = 'rgba(255,170,215,0)';
        g.shadowBlur = 0;
        rr(g, cx - w / 2, cy - h / 2, w, h, r);
        g.fillStyle = '#1a0c33';
        g.fill();
        g.restore();

        // foto da frente
        g.save();
        rr(g, cx - w / 2, cy - h / 2, w, h, r);
        g.clip();
        const im = it.imgs[0];
        if (im && im.naturalWidth) {
            const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
            const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
            g.drawImage(im, cx - dw / 2, cy - dh / 2, dw, dh);
        } else {
            const hue = (325 + it.indice * 37) % 360;
            const gr = g.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
            gr.addColorStop(0, 'hsl(' + hue + ',70%,70%)');
            gr.addColorStop(1, 'hsl(' + ((hue + 60) % 360) + ',60%,40%)');
            g.fillStyle = gr;
            g.fillRect(cx - w / 2, cy - h / 2, w, h);
            g.fillStyle = 'rgba(255,255,255,0.85)';
            caminhoCoracao(g, cx, cy - 20, 7);
            g.fill();
        }
        // escurece só o pé da foto, bem de leve, pra ela "assentar" no cenário
        const vg = g.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
        vg.addColorStop(0.6, 'rgba(10,3,30,0)');
        vg.addColorStop(1, 'rgba(10,3,30,0.4)');
        g.fillStyle = vg;
        g.fillRect(cx - w / 2, cy - h / 2, w, h);
        g.restore();

        // contorno fino e translúcido (nada de moldura grossa)
        g.lineWidth = 2.5;
        g.strokeStyle = 'rgba(255,235,247,0.7)';
        rr(g, cx - w / 2, cy - h / 2, w, h, r);
        g.stroke();

        // título solto, com halo escuro bem suave pra ler sobre a galáxia
        const ty = 590;
        const halo = g.createRadialGradient(cx, ty, 8, cx, ty, 190);
        halo.addColorStop(0, 'rgba(1,1,5,0.55)');
        halo.addColorStop(1, 'rgba(1,1,5,0)');
        g.fillStyle = halo;
        g.fillRect(0, ty - 70, CARD_W, 140);

        let f = 60;
        const fonte = (n) => 'italic 700 ' + n + 'px "Cormorant Garamond", Georgia, serif';
        g.font = fonte(f);
        while (g.measureText(it.card.titulo).width > 300 && f > 28) { f -= 2; g.font = fonte(f); }
        const tw = g.measureText(it.card.titulo).width;
        [-1, 1].forEach((lado) => {
            const x1 = cx + lado * (tw / 2 + 18), x2 = cx + lado * (tw / 2 + 80);
            const lg = g.createLinearGradient(x1, 0, x2, 0);
            lg.addColorStop(0, 'rgba(255,200,230,0.8)');
            lg.addColorStop(1, 'rgba(255,200,230,0)');
            g.strokeStyle = lg;
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(x1, ty + 2);
            g.lineTo(x2, ty + 2);
            g.stroke();
        });
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#ffffff';
        g.shadowColor = '#ff9ccb';
        g.shadowBlur = 18;
        g.fillText(it.card.titulo, cx, ty);
        g.shadowBlur = 6;
        g.fillText(it.card.titulo, cx, ty);
        g.shadowBlur = 0;
        it.tex.needsUpdate = true;
    }

    function construirCards() {
        const n = cards.length;
        const raio = ladoA < 1 ? 3.7 : 5.6;
        const alturas = [0.2, 0.9, 0.4, 1.1, 0.3, 0.8, 0.6];
        const texAura = texBrilho('255,130,200');
        cards.forEach((card, i) => {
            const c = novoCanvas(CARD_W, CARD_H);
            const tex = viraTextura(c);
            const mat = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 1 });
            const sprite = new T.Sprite(mat);
            sprite.renderOrder = 6;
            const aura = new T.Sprite(new T.SpriteMaterial({ map: texAura, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.35 }));
            aura.renderOrder = 5;
            cena.add(aura);
            cena.add(sprite);
            const it = {
                card: card, indice: i, canvas: c, ctx: c.getContext('2d'), tex: tex, sprite: sprite, aura: aura,
                imgs: [null, null, null],
                ang: (i / n) * Math.PI * 2 + 0.5,
                raio: raio, altura: alturas[i % alturas.length],
                fase: Math.random() * 6.28,
                esc: 3, escAtual: 3, op: 1
            };
            sprite.position.set(Math.cos(it.ang) * raio, it.altura, Math.sin(it.ang) * raio);
            itens.push(it);
            desenharCard(it);
            ['imagem1', 'imagem2', 'imagem3'].forEach((chave, k) => {
                if (!card[chave]) return;
                const im = new Image();
                im.onload = () => { if (!destruido) { it.imgs[k] = im; desenharCard(it); } };
                im.src = card[chave];
            });
        });
        ajustarEscalaCards();
    }

    function ajustarEscalaCards() {
        const base = ladoA < 1 ? 3.5 : 3.6;
        itens.forEach((it) => {
            it.esc = base;
            if (it.escAtual === 3) it.escAtual = base;
        });
    }

    /* ---------- seleção e entrada ---------- */
    // mostra/esconde o botão "Entrar" (classe + estilo direto, pra funcionar mesmo com cache de CSS antigo)
    function mostrarAcao(sim) {
        elAcao.classList.toggle('h3d-acao-aberta', sim);
        elAcao.style.opacity = sim ? '1' : '0';
        elAcao.style.visibility = sim ? 'visible' : 'hidden';
    }
    mostrarAcao(false);

    function selecionar(i) {
        if (entrando || !itens[i]) return;
        sel = i;
        orb.ultima = performance.now();                 // pausa a rotação automática um tempinho
        elDica.textContent = itens[i].card.descricao || DICA;
        mostrarAcao(true);
        soltarCoracoes(itens[i].sprite.position, 6);
        evento('selecionar', { card: itens[i].card });
    }

    function soltar() {
        sel = -1;
        elDica.textContent = DICA;
        mostrarAcao(false);
        evento('soltar');
    }

    function aplicarOverlay(v) {
        overlayAtual = v;
        elFlash.style.opacity = String(v);
    }

    // volta o hub ao normal (depois de entrar numa seção e voltar)
    function resetar() {
        entrando = false;
        tEntrar = 0;
        sel = -1;
        elDica.textContent = DICA;
        mostrarAcao(false);
        aplicarOverlay(0);
    }

    function entrar() {
        if (entrando || sel < 0) return;
        const it = itens[sel];
        const card = it.card;
        const cor = COR_CARD[card.link] || '#ff8fbf';
                // a página pode cuidar da entrada de um card (ex.: a caixinha das cartas), sem o mergulho de estrelas
        if (cfg.aoEntrarEspecial && cfg.aoEntrarEspecial(card)) {
            evento('entrar', { card: card, cor: cor });
            return;
        }
        entrando = true;
        tEntrar = 0;
        mostrarAcao(false);

        // cor do mergulho = cor da seção
        matWarp.uniforms.uCor.value.set(cor);
        elFlash.style.transition = 'none';
        elFlash.style.background = 'radial-gradient(circle at 50% 46%, #ffffff 0%, ' + cor + ' 6%, rgba(5,3,13,0.97) 40%, #05030d 100%)';

        soltarCoracoes(it.sprite.position, card.link === 'cartas' ? 26 : 10);
        evento('entrar', { card: card, cor: cor });

        // quando o mergulho termina, abre a seção
        setTimeout(() => {
            if (destruido) return;
            if (cfg.aoEntrar) cfg.aoEntrar(card);
            else if (card.link) location.hash = '#' + String(card.link).replace(/^#/, '');
        }, 1200);

        // se a seção não abrir, o hub volta ao normal sozinho
        setTimeout(() => { if (!destruido && entrando) resetar(); }, 3400);
    }



    /* ---------- corações que sobem ---------- */
    const texCor = texCoracao('#ff7ab8', '#ff4f9a');
    function soltarCoracoes(origem, n) {
        for (let i = 0; i < n; i++) {
            const s = new T.Sprite(new T.SpriteMaterial({ map: texCor, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 1 }));
            const e = rand(0.28, 0.5);
            s.scale.set(e, e, 1);
            s.position.copy(origem);
            cena.add(s);
            voando.push({ s: s, vx: rand(-1.2, 1.2), vy: rand(0.6, 2.2), vz: rand(-1.2, 1.2), vida: 1, dec: rand(0.35, 0.6) });
        }
    }

    /* ---------- controles: arrastar, pinça, rolagem, toque ---------- */
    const raycaster = new T.Raycaster();
    const ndc = new T.Vector2();
    const ponteiros = new Map();
    let inicioToque = null, distPinca = 0;

    function aoToque(x, y) {
        if (entrando) return;
        const r = canvas.getBoundingClientRect();
        ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        raycaster.camera = camera;
        const alvos = itens.filter((it) => it.op > 0.3).map((it) => it.sprite);
        const hits = raycaster.intersectObjects(alvos, false);
        if (hits.length) {
            const idx = itens.findIndex((it) => it.sprite === hits[0].object);
                        if (idx >= 0 && cfg.entradaDireta && cfg.entradaDireta(itens[idx].card)) {
                // entrada direta (ex.: a caixinha das cartas): o card não expande
                if (sel >= 0) { sel = -1; elDica.textContent = DICA; mostrarAcao(false); }
                evento('entrar', { card: itens[idx].card, cor: COR_CARD[itens[idx].card.link] || '#ff8fbf' });
                return;
            }
            if (idx === sel) entrar();
            else if (idx >= 0) selecionar(idx);
            return;
        }
        if (sel >= 0) { soltar(); return; }
        pulso = 0;
        tmp.set(0, grupoCoracao.position.y, 0);
        soltarCoracoes(tmp, 10);
        evento('pulso');
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
        if (!p) return;
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
        orb.dist = clamp(orb.dist * Math.exp(e.deltaY * 0.0011), orb.min, orb.max);
        orb.zoomou = true;
    }, { passive: false });

    /* ---------- tamanho da tela ---------- */
    function redimensionar() {
        const w = Math.max(1, raiz.clientWidth), h = Math.max(1, raiz.clientHeight);
        renderer.setSize(w, h, false);
        aspecto = w / h;
        camera.aspect = aspecto;
        camera.updateProjectionMatrix();
        ladoA = aspecto;
        // em tela de celular (em pé) afasta a câmera pra tudo caber
  if (!orb.zoomou) orb.dist = aspecto >= 1 ? orb.base : Math.max(orb.base, 10.8 / (1.04 * aspecto));
        if (itens.length) {
            ajustarEscalaCards();
            const raio = ladoA < 1 ? 3.7 : 5.6;
            itens.forEach((it) => { it.raio = raio; });
        }
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(redimensionar) : null;
    if (ro) ro.observe(raiz);
    else addEventListener('resize', redimensionar);

    /* ---------- contador dentro do coração ---------- */
    let relogio = 0;
    let ctxContador = null, texContador = null, ultimoSeg = -1;
    const inicioMs = cfg.dataInicio ? new Date(cfg.dataInicio).getTime() : NaN;

    function desenharContador() {
        if (!ctxContador) return;
        const g = ctxContador, W = 640, H = 360;
        g.clearRect(0, 0, W, H);

        // sombra escura bem suave atrás, pras partículas não brigarem com o texto
        const fundo = g.createRadialGradient(W / 2, 170, 10, W / 2, 170, 240);
        fundo.addColorStop(0, 'rgba(2,1,8,0.6)');
        fundo.addColorStop(1, 'rgba(2,1,8,0)');
        g.fillStyle = fundo;
        g.fillRect(0, 0, W, H);

        g.textBaseline = 'middle';
        g.lineJoin = 'round';
        // contorno escuro fino + preenchimento = texto sempre legível
        const texto = (str, x, y, cor, brilho) => {
            g.lineWidth = 6;
            g.strokeStyle = 'rgba(3,1,10,0.85)';
            g.shadowBlur = 0;
            g.strokeText(str, x, y);
            g.fillStyle = cor;
            g.shadowColor = '#ff9ccb';
            g.shadowBlur = brilho;
            g.fillText(str, x, y);
            g.shadowBlur = 0;
        };

        if (isNaN(inicioMs)) {
            g.textAlign = 'center';
            g.font = 'italic 600 84px "Cormorant Garamond", Georgia, serif';
            texto(cfg.textoCentro, W / 2, H / 2, '#ffffff', 8);
        } else {
            const ms = Math.max(0, Date.now() - inicioMs);
            const d = Math.floor(ms / 864e5);
            const h = Math.floor(ms / 36e5) % 24;
            const m = Math.floor(ms / 6e4) % 60;
            const s = Math.floor(ms / 1e3) % 60;

            g.textAlign = 'center';
            g.font = '600 21px Montserrat, system-ui, sans-serif';
            if ('letterSpacing' in g) g.letterSpacing = '4px';
            texto('♡ ESTAMOS JUNTOS HÁ ♡', W / 2, 80, '#ffe3f1', 4);
            if ('letterSpacing' in g) g.letterSpacing = '0px';

            g.textAlign = 'left';
            g.font = 'italic 700 140px "Cormorant Garamond", Georgia, serif';
            const nw = g.measureText(String(d)).width;
            g.font = 'italic 600 52px "Cormorant Garamond", Georgia, serif';
            const dw = g.measureText('dias').width;
            const x0 = (W - (nw + 14 + dw)) / 2;
            g.font = 'italic 700 140px "Cormorant Garamond", Georgia, serif';
            texto(String(d), x0, 170, '#ffffff', 10);
            g.font = 'italic 600 52px "Cormorant Garamond", Georgia, serif';
            texto('dias', x0 + nw + 14, 190, '#ffd6ec', 5);

            g.textAlign = 'center';
            g.font = '600 26px Montserrat, system-ui, sans-serif';
            texto(h + 'h   ' + m + 'min   ' + s + 's', W / 2, 256, '#f6ecff', 4);
        }
        texContador.needsUpdate = true;
    }

    /* ---------- laço de animação ---------- */
    function atualizar(dt) {
        tempo += dt;
        pulso += dt;
        passoOrbita(dt);
        posicionarCamera();
        camera.updateMatrixWorld();

        // mergulho: sobe suave em ~1.1s; ao voltar ao hub, desce suave
        if (entrando) tEntrar += dt;
        const wl = entrando ? Math.min(1, tEntrar / 1.1) : 0;
        warp = entrando ? wl * wl * (3 - 2 * wl) : lerp(warp, 0, 1 - Math.exp(-4 * dt));
        distWarp += dt * (0.4 + warp * 2.2);
        const fovAlvo = FOV + 38 * warp;
        if (Math.abs(camera.fov - fovAlvo) > 0.02) { camera.fov = fovAlvo; camera.updateProjectionMatrix(); }

        matGalaxia.uniforms.uTempo.value = tempo;
        matGalaxia.uniforms.uGiro.value = warp * warp * 6;
        matGalaxia.uniforms.uPulso.value = Math.min(pulso, 9);
        estrelas.rotation.y += dt * (0.004 + warp * 1.2);
        atualizarUniverso(dt);

        linhasWarp.visible = warp > 0.01;
        matWarp.uniforms.uWarp.value = warp;
        matWarp.uniforms.uD.value = distWarp;

        // escurece a tela (com um brilho no centro) bem no final do mergulho
        const ov = entrando ? clamp((tEntrar - 0.85) / 0.4, 0, 1) : 0;
        if (Math.abs(ov - overlayAtual) > 0.01 || (ov === 0 && overlayAtual !== 0)) aplicarOverlay(ov);

        // contador no coração: redesenha 1x por segundo
        if (!isNaN(inicioMs)) {
            const seg = Math.floor(Date.now() / 1000);
            if (seg !== ultimoSeg) { ultimoSeg = seg; desenharContador(); }
        }

        const nv = window.HubSons ? window.HubSons.nivelCoracao(dt) : -1;   // batida lida do áudio
        const b = nv >= 0 ? nv : batida(tempo, 1.25);                       // sem áudio: relógio
        grupoCoracao.scale.setScalar(1.9 * (1 + 0.07 * b));
        grupoCoracao.position.y = 5.4 + Math.sin(tempo * 0.9) * 0.14;
        grupoCoracao.rotation.y = Math.sin(tempo * 0.5) * 0.5;

        // posição de "card em destaque": na frente da câmera, um pouco acima do centro
        camera.getWorldDirection(dirCam);
        vUp.setFromMatrixColumn(camera.matrixWorld, 1);
        const dFoco = 7;
        const visH = 2 * dFoco * Math.tan((FOV * Math.PI) / 360);
        const visW = visH * aspecto;
        const hFoco = Math.min(visH * 0.44, (visW * 0.8) / CARD_ASPECT);
        alvoFoco.copy(camera.position).addScaledVector(dirCam, dFoco).addScaledVector(vUp, visH * 0.1);

        const k = 1 - Math.exp(-6.5 * dt);
        const velOrbita = REDUZIR ? 0.015 : 0.055;
        itens.forEach((it, i) => {
            const emFoco = i === sel;
            if (emFoco) {
                tmp.copy(alvoFoco);
            } else {
                const a = it.ang + tempo * velOrbita;
                tmp.set(Math.cos(a) * it.raio, it.altura + Math.sin(tempo * 0.8 + it.fase) * 0.22, Math.sin(a) * it.raio);
            }
            it.sprite.position.lerp(tmp, k);
            it.escAtual = lerp(it.escAtual, emFoco ? hFoco * (1 + warp * 1.8) : it.esc, k);
            it.sprite.scale.set(it.escAtual * CARD_ASPECT, it.escAtual, 1);

            const prof = tmp.copy(it.sprite.position).sub(camera.position).dot(dirCam) - orb.dist;
            let op = clamp(1 - prof / (it.raio * 5), 0.6, 1);
            if (sel >= 0 && !emFoco) op = 0.38;
            if (entrando) op = emFoco ? 1 - clamp((tEntrar - 0.75) / 0.4, 0, 1) : 0;
            it.op = lerp(it.op, op, entrando ? 1 - Math.exp(-12 * dt) : k);
            it.sprite.material.opacity = it.op;

            it.aura.position.copy(it.sprite.position);
            const ae = it.escAtual * 2.1;
            it.aura.scale.set(ae, ae, 1);
            it.aura.material.opacity = AURA_CARD * it.op * (emFoco ? 1.4 : 1);
        });

        // botão "Entrar" acompanha a parte de baixo do card escolhido
        if (sel >= 0) {
            const it = itens[sel];
            tmp.copy(it.sprite.position).addScaledVector(vUp, -it.escAtual * 0.47);
            tmp.project(camera);
            const px = (tmp.x * 0.5 + 0.5) * raiz.clientWidth;
            const py = (-tmp.y * 0.5 + 0.5) * raiz.clientHeight;
            elAcao.style.transform = 'translate(' + px.toFixed(1) + 'px,' + (py + 10).toFixed(1) + 'px)';
        }

        for (let i = voando.length - 1; i >= 0; i--) {
            const h = voando[i];
            h.s.position.x += h.vx * dt;
            h.s.position.y += h.vy * dt;
            h.s.position.z += h.vz * dt;
            h.vida -= h.dec * dt;
            h.s.material.opacity = Math.max(0, h.vida);
            if (h.vida <= 0) {
                cena.remove(h.s);
                h.s.material.dispose();
                voando.splice(i, 1);
            }
        }

        proxCoracao -= dt;
        if (proxCoracao <= 0) {
            proxCoracao = rand(1.4, 2.8);
            tmp.set(rand(-1, 1), grupoCoracao.position.y + rand(-0.5, 0.5), rand(-1, 1));
            soltarCoracoes(tmp, 1);
        }
    }

      function frame(agora) {
        if (destruido || !visivel || document.hidden) { rodando = false; return; }
        const dt = Math.min(0.05, (agora - ultimo) / 1000);
        ultimo = agora;
        try {
            atualizar(dt);
            renderer.render(cena, camera);
        } catch (e) {
            console.error('[Hub3D] erro no quadro:', e);
            rodando = false;
            return;
        }
        rafId = requestAnimationFrame(frame);
    }
    function iniciarLaco() {
        if (rodando || destruido || !visivel || document.hidden) return;
        rodando = true;
        ultimo = performance.now();
        rafId = requestAnimationFrame(frame);
    }

    // só gasta bateria quando o hub está na tela
    const io = typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((es) => {
            const v = es[0].isIntersecting;
            if (v && !visivel && entrando) resetar();   // voltou de outra seção
            visivel = v;
            evento('visivel', { sim: v });
            if (v) iniciarLaco();
        })
        : null;
    if (io) io.observe(raiz);
    const aoVisibilidade = () => { if (!document.hidden) iniciarLaco(); };
    document.addEventListener('visibilitychange', aoVisibilidade);

    /* ---------- partida ---------- */
    evento('visivel', { sim: true });
    construirGalaxia();
    construirUniverso();
    try { construirSol(); } catch (e) { console.warn('[Hub3D] sol falhou:', e); }
        try { construirSistemaSolar(); } catch (e) { console.warn('[Hub3D] sistema solar falhou:', e); }
    try { construirBuracoNegro(); } catch (e) { console.warn('[Hub3D] buraco negro falhou:', e); }
    construirDetalhesGalaxia();
    construirWarp();
    redimensionar();
    construirCards();
    redimensionar();
    orb.ultima = performance.now();

    // quando a fonte carregar, redesenha os títulos e o contador
    if (document.fonts && document.fonts.load) {
        Promise.race([
            document.fonts.load(FONTE_TITULO),
            new Promise((r) => setTimeout(r, 1500))
        ]).then(() => { if (!destruido) { itens.forEach(desenharCard); desenharContador(); } }).catch(() => {});
    }
    iniciarLaco();

    return {
        destruir() {
            destruido = true;
            cancelAnimationFrame(rafId);
            clearInterval(relogio);
            if (io) io.disconnect();
            if (ro) ro.disconnect(); else removeEventListener('resize', redimensionar);
            document.removeEventListener('visibilitychange', aoVisibilidade);
            recursos.forEach((r) => r.dispose && r.dispose());
            itens.forEach((it) => { it.tex.dispose(); it.sprite.material.dispose(); it.aura.material.dispose(); });
            renderer.dispose();
            raiz.remove();
        }
    };
}

window.Hub3D = { montar: montar, desmontar: desmontar };

})();