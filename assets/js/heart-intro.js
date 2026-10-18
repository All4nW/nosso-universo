// =====================================================
// heart-intro.js — tela de abertura (coração de "love you")
//
// Sequência:
//   0.0s  luzes e estrelas surgem
//   0.25s duas faíscas nascem na ponta do coração e sobem
//         pelos dois lados, desenhando o contorno
//   1.1s  o miolo "floresce" do centro pra fora
//   1.9s  aparece o título
//   2.9s  o coração está pronto: flash, faíscas e batimento
//
// O clique é liberado em menos de 1 segundo — não precisa
// esperar a animação terminar.
// =====================================================

(function () {

    const canvas = document.getElementById('heart-intro-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;


    // =================================================
    // AJUSTES — pode mexer aqui
    // =================================================

    const PALETA = 'romantica';          // 'romantica' (azul → lilás → rosa) ou 'azul' (a original)
    const TITULO = 'Nosso Universo';     // texto no meio do coração
    const LIBERA_CLIQUE_EM = 0.8;        // segundos até poder clicar

    // momentos da animação (em segundos)
    const T_TRACO_INI = 0.25;            // começa a desenhar o contorno
    const T_TRACO = 2.0;                 // quanto leva pra fechar o contorno
    const T_MIOLO_INI = 1.1;             // começa o preenchimento
    const T_MIOLO = 1.6;                 // quanto leva o preenchimento
    const T_TITULO = 1.9;                // aparece o título
    const T_FORMADO = 2.9;               // coração pronto (flash + batimento)
    const PERIODO = 1.25;                // tempo de cada batimento


    // =================================================
    // DETECÇÕES
    // =================================================

    const DISPOSITIVO_LEVE =
        window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth <= 768;

    const REDUZIR =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const TEXTO_DICA =
        DISPOSITIVO_LEVE ? 'toque para entrar' : 'clique para entrar';


    // =================================================
    // CORES E TEXTOS
    // =================================================

    const PALETAS = {
        romantica: ['#8ecbff', '#7ea6ff', '#a99bff', '#c9a7f5', '#f6b3d6', '#f08cc0'],
        azul: ['#4682b4', '#1e90ff', '#00bfff', '#6495ed', '#4169e1']
    };

    const CORES = PALETAS[PALETA] || PALETAS.romantica;

    const GRADIENTE_TRACO = PALETA === 'azul'
        ? ['#8ecbff', '#6aa9ff', '#8ecbff']
        : ['#8ecbff', '#c9a7f5', '#f6b3d6'];

    const WORDS = ['love you', 'Love You', 'LOVE YOU'];

    const FONTE_SERIF = '"Cormorant Garamond", Georgia, serif';

    // carrega as fontes do site (se ainda não chegaram, os textos se corrigem sozinhos)
    let fontesChegaram = false;

    if (document.fonts && document.fonts.load) {

        Promise.all([
            document.fonts.load('italic 600 40px "Cormorant Garamond"'),
            document.fonts.load('600 14px Montserrat')
        ])
            .then(() => {
                fontesChegaram = true;
                spriteCache.clear();
            })
            .catch(() => { /* usa a fonte reserva */ });

    }


    // =================================================
    // ESTADO
    // =================================================

    let largura = 0;
    let altura = 0;
    let cx = 0;
    let cy = 0;
    let menor = 0;
    let dpr = 1;

    let escala = 20;
    let fatorGap = 1;
    let fatorLinha = 1;
    let fonteContorno = 20;
    let fonteMiolo = 17;

    const DESLOC_Y = 2.5;   // centraliza o coração na vertical (ele é mais "baixo" que alto)

    let tempo = 0;
    let ultimoAgora = performance.now();

    let estado = 'abrindo';   // 'abrindo' -> 'saindo'
    let tSaida = 0;
    let alphaGrupo = 1;

    let particulas = [];
    let estrelas = [];
    let bokehs = [];
    let flutuantes = [];
    let cadentes = [];
    let proximaCadente = 3.5;
    let explosao = [];
    let ondas = [];
    let ultimaFase = 0;

    let eventoTraco = false;
    let eventoFormado = false;

    const ponteiro = { x: 0, y: 0, alvoX: 0, alvoY: 0, ativo: false };

    const spriteCache = new Map();
    const medidor = document.createElement('canvas').getContext('2d');


    // =================================================
    // UTILIDADES
    // =================================================

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const easeOut = (x) => 1 - Math.pow(1 - x, 3);
    const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const escolher = (lista) => lista[Math.floor(Math.random() * lista.length)];
    const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

    // fórmula do coração
    function heartXY(t) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        return { x, y: -y };
    }

    function paraTela(x, y) {
        return {
            sx: x * escala + cx,
            sy: (y - DESLOC_Y) * escala + cy
        };
    }

    // desenha o caminho de um coraçãozinho (s = meia largura)
    function formaCoracao(g, x, y, s) {
        g.beginPath();
        g.moveTo(x, y + s * 0.9);
        g.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.8, y - s * 1.1, x, y - s * 0.35);
        g.bezierCurveTo(x + s * 0.8, y - s * 1.1, x + s * 1.6, y - s * 0.1, x, y + s * 0.9);
        g.closePath();
    }

    // progresso do traço (começa rápido e desacelera ao chegar no topo)
    const progTraco = (x) => 1 - Math.pow(1 - x, 2);

    function batida() {

        if (tempo < T_FORMADO - 0.3) return 0;

        const fase = (Math.max(0, tempo - T_FORMADO) % PERIODO) / PERIODO;

        const b1 = Math.exp(-Math.pow((fase - 0.06) / 0.045, 2));
        const b2 = 0.65 * Math.exp(-Math.pow((fase - 0.2) / 0.055, 2));

        return Math.min(1, b1 + b2);

    }

    function zoomSaida() {

        if (estado !== 'saindo') return 1;

        return 1 + 1.3 * Math.pow(clamp((tempo - tSaida) / 0.9, 0, 1), 2.2);

    }


    // =================================================
    // TAMANHO (com devicePixelRatio, como antes)
    // =================================================

    function ajustarTamanho() {

        const viewport = window.visualViewport;

        largura = viewport ? viewport.width : window.innerWidth;
        altura = viewport ? viewport.height : window.innerHeight;

        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(largura * dpr);
        canvas.height = Math.round(altura * dpr);

        canvas.style.width = largura + 'px';
        canvas.style.height = altura + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cx = largura / 2;
        cy = altura / 2;

        menor = Math.min(largura, altura);

        // o coração ocupa ~86% da menor dimensão (sobra margem pro texto de baixo)
        escala = (menor * 0.86) / 32;

        fatorGap = escala / 20;
        fatorLinha = clamp(escala / 22, 0.7, 1.4);

        // as palavras acompanham o tamanho do coração (antes tinham tamanho fixo)
        fonteContorno = clamp(escala * 0.78, 11, 24);
        fonteMiolo = fonteContorno * 0.86;

        construirCena();

    }

    let timerResize = null;

    function aoRedimensionar() {
        clearTimeout(timerResize);
        timerResize = setTimeout(ajustarTamanho, 120);
    }

    window.addEventListener('resize', aoRedimensionar);
    window.addEventListener('orientationchange', aoRedimensionar);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', aoRedimensionar);
    }

    // navegadores de celular ajustam a barra de endereço um instante depois
    setTimeout(ajustarTamanho, 300);


    // =================================================
    // MONTAGEM DA CENA
    // =================================================

    function corPorPosicao(sx, sy) {

        if (PALETA === 'azul') return escolher(CORES);

        // azul no canto de cima/esquerda → rosa embaixo/direita
        const nx = clamp((sx - (cx - 16 * escala)) / (32 * escala), 0, 1);
        const ny = clamp((sy - (cy - 14.5 * escala)) / (29 * escala), 0, 1);

        const n = clamp(nx * 0.55 + ny * 0.45 + (Math.random() - 0.5) * 0.28, 0, 0.999);

        return CORES[Math.floor(n * CORES.length)];

    }

    function novaParticula(x, y, tipo, delay) {

        return {
            x, y, tipo, delay,
            word: escolher(WORDS),
            cor: corPorPosicao(x, y),
            flicker: Math.random() * Math.PI * 2,
            mult: 0.88 + Math.random() * 0.26
        };

    }

    function construirCena() {

        spriteCache.clear();

        particulas = [];

        const N_CONTORNO = DISPOSITIVO_LEVE ? 150 : 220;
        const N_MIOLO = DISPOSITIVO_LEVE ? 130 : 200;

        // ---- contorno: aparece conforme as faíscas sobem pelos dois lados ----
        const colocados = [];
        const gapC = 20 * fatorGap;

        for (let i = 0; i < N_CONTORNO; i++) {

            const t = (i / N_CONTORNO) * 2 * Math.PI;
            const b = heartXY(t);
            const { sx, sy } = paraTela(b.x, b.y);

            if (colocados.some(p => dist(sx, sy, p.x, p.y) < gapC)) continue;

            colocados.push({ x: sx, y: sy });

            // distância até a ponta de baixo (0 = ponta, 1 = notch de cima)
            const d = Math.abs(t - Math.PI) / Math.PI;
            const x = 1 - Math.sqrt(Math.max(0, 1 - d));

            particulas.push(novaParticula(sx, sy, 'contorno', T_TRACO_INI + x * T_TRACO));

        }

        // ---- miolo: floresce do centro pra fora ----
        const colocadosMiolo = [];
        const gapM = 30 * fatorGap;

        let tentativas = 0;
        let criados = 0;

        while (criados < N_MIOLO && tentativas < N_MIOLO * 80) {

            tentativas++;

            const t = Math.random() * 2 * Math.PI;
            const r = Math.random() * 0.86;
            const b = heartXY(t);
            const { sx, sy } = paraTela(b.x * r, b.y * r);

            if (colocadosMiolo.some(p => dist(sx, sy, p.x, p.y) < gapM)) continue;

            colocadosMiolo.push({ x: sx, y: sy });
            criados++;

            const rn = r / 0.86;

            particulas.push(
                novaParticula(sx, sy, 'miolo', T_MIOLO_INI + (rn * 0.85 + Math.random() * 0.15) * T_MIOLO)
            );

        }

        // ---- estrelas ----
        estrelas = [];

        const nEstrelas = DISPOSITIVO_LEVE ? 38 : 80;

        for (let i = 0; i < nEstrelas; i++) {

            estrelas.push({
                x: Math.random() * largura,
                y: Math.random() * altura,
                r: 0.4 + Math.random() * 1.1,
                fase: Math.random() * Math.PI * 2,
                vel: 0.8 + Math.random() * 1.8
            });

        }

        // ---- bokeh (luzes grandes e desfocadas ao fundo) ----
        bokehs = [];

        const cores = [[240, 140, 192], [150, 130, 255], [110, 170, 255]];

        const nBokeh = DISPOSITIVO_LEVE ? 5 : 10;

        for (let i = 0; i < nBokeh; i++) {

            bokehs.push({
                x: Math.random() * largura,
                y: Math.random() * altura,
                r: menor * (0.04 + Math.random() * 0.07),
                vx: (Math.random() - 0.5) * 6,
                vy: -2 - Math.random() * 5,
                cor: escolher(cores),
                fase: Math.random() * Math.PI * 2
            });

        }

        // ---- coraçõezinhos subindo ----
        flutuantes = [];

        const nFlutuantes = DISPOSITIVO_LEVE ? 8 : 16;

        for (let i = 0; i < nFlutuantes; i++) {

            flutuantes.push({
                x: Math.random() * largura,
                y: Math.random() * altura,
                tam: 3 + Math.random() * 5,
                vy: 10 + Math.random() * 16,
                fase: Math.random() * Math.PI * 2,
                balanco: 8 + Math.random() * 18,
                cor: escolher(['#f6b3d6', '#f08cc0', '#c9a7f5']),
                alpha: 0.12 + Math.random() * 0.22
            });

        }

    }


    // =================================================
    // PALAVRAS "love you" (desenhadas uma vez e reaproveitadas,
    // com brilho já embutido — fica bonito e leve)
    // =================================================

    function obterSprite(tipo, word, cor) {

        const chave = tipo + '|' + word + '|' + cor;

        let sprite = spriteCache.get(chave);

        if (sprite) return sprite;

        const tam = tipo === 'contorno' ? fonteContorno : fonteMiolo;
        const fonte = `italic 600 ${tam}px ${FONTE_SERIF}`;

        medidor.font = fonte;

        const larguraTexto = Math.ceil(medidor.measureText(word).width);
        const pad = Math.ceil(tam * 0.8);

        const w = larguraTexto + pad * 2;
        const h = Math.ceil(tam * 1.5) + pad * 2;

        const c = document.createElement('canvas');

        c.width = Math.ceil(w * dpr);
        c.height = Math.ceil(h * dpr);

        const g = c.getContext('2d');

        g.scale(dpr, dpr);
        g.font = fonte;
        g.textAlign = 'center';
        g.textBaseline = 'middle';

        // brilho
        g.fillStyle = cor;
        g.shadowColor = cor;
        g.shadowBlur = tam * 0.9;
        g.fillText(word, w / 2, h / 2);
        g.fillText(word, w / 2, h / 2);

        // miolo mais claro, pra letra ficar nítida
        g.shadowBlur = 0;
        g.globalAlpha = 0.55;
        g.fillStyle = '#ffffff';
        g.fillText(word, w / 2, h / 2);

        sprite = { canvas: c, w, h };

        spriteCache.set(chave, sprite);

        return sprite;

    }

    function desenharParticulas() {

        ctx.save();

        particulas.forEach((p) => {

            const a = clamp((tempo - p.delay) / 0.45, 0, 1);

            if (a <= 0) return;

            const piscar = a >= 1 ? 0.78 + 0.22 * Math.sin(tempo * 2.4 + p.flicker) : 1;

            const sprite = obterSprite(p.tipo, p.word, p.cor);

            // "pop": nasce um pouco menor e cresce
            const s = p.mult * (0.7 + 0.3 * easeOut(a));

            ctx.globalAlpha = a * piscar * (p.tipo === 'miolo' ? 0.88 : 1) * alphaGrupo;

            ctx.drawImage(
                sprite.canvas,
                p.x - (sprite.w * s) / 2,
                p.y - (sprite.h * s) / 2,
                sprite.w * s,
                sprite.h * s
            );

        });

        ctx.restore();

    }


    // =================================================
    // FUNDO
    // =================================================

    function desenharFundo() {

        const g = ctx.createRadialGradient(cx, cy * 0.9, 0, cx, cy, Math.max(largura, altura) * 0.75);

        g.addColorStop(0, '#140a26');
        g.addColorStop(0.55, '#07040f');
        g.addColorStop(1, '#020106');

        ctx.fillStyle = g;
        ctx.fillRect(0, 0, largura, altura);

        // nebulosas que passeiam bem devagar
        const intro = easeOut(clamp(tempo / 1.2, 0, 1));

        const manchas = [
            [240, 140, 192, 0.13, 0.30, 0.07, 0.0],
            [120, 150, 255, 0.12, 0.34, 0.05, 2.1],
            [170, 120, 240, 0.11, 0.28, 0.06, 4.2]
        ];

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        manchas.forEach(([r, gg, b, alfa, raio, vel, fase]) => {

            const x = cx + Math.cos(tempo * vel + fase) * largura * 0.28;
            const y = cy + Math.sin(tempo * vel * 1.3 + fase) * altura * 0.22;
            const rr = Math.max(largura, altura) * raio;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, rr);

            grad.addColorStop(0, `rgba(${r},${gg},${b},${alfa * intro})`);
            grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, largura, altura);

        });

        ctx.restore();

    }

    function desenharEstrelas(dt) {

        const intro = easeOut(clamp(tempo / 1.0, 0, 1));

        ctx.save();
        ctx.fillStyle = '#e3ebff';

        estrelas.forEach((e) => {

            const brilho = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(tempo * e.vel + e.fase));

            ctx.globalAlpha = brilho * intro;

            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.fill();

        });

        ctx.restore();

    }

    function desenharBokeh(dt) {

        const intro = easeOut(clamp(tempo / 1.6, 0, 1));

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        bokehs.forEach((b) => {

            b.x += b.vx * dt;
            b.y += b.vy * dt;

            if (b.y < -b.r) { b.y = altura + b.r; b.x = Math.random() * largura; }
            if (b.x < -b.r) b.x = largura + b.r;
            if (b.x > largura + b.r) b.x = -b.r;

            const pulso = 0.6 + 0.4 * Math.sin(tempo * 0.6 + b.fase);
            const [r, g, bl] = b.cor;

            ctx.globalAlpha = intro * pulso;

            ctx.fillStyle = `rgba(${r},${g},${bl},0.05)`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `rgba(${r},${g},${bl},0.12)`;
            ctx.lineWidth = 1;
            ctx.stroke();

        });

        ctx.restore();

    }

    function desenharFlutuantes(dt) {

        const intro = easeOut(clamp((tempo - 0.6) / 1.5, 0, 1));

        ctx.save();

        flutuantes.forEach((f) => {

            f.y -= f.vy * dt;

            if (f.y < -20) { f.y = altura + 20; f.x = Math.random() * largura; }

            const x = f.x + Math.sin(tempo * 0.8 + f.fase) * f.balanco;

            ctx.globalAlpha = f.alpha * intro * alphaGrupo;
            ctx.fillStyle = f.cor;

            formaCoracao(ctx, x, f.y, f.tam);
            ctx.fill();

        });

        ctx.restore();

    }

    function desenharCadentes(dt) {

        if (!REDUZIR && tempo > proximaCadente && cadentes.length < 2) {

            proximaCadente = tempo + 3 + Math.random() * 5;

            cadentes.push({
                x: largura * (0.3 + Math.random() * 0.8),
                y: -20 + Math.random() * altura * 0.25,
                vx: -(260 + Math.random() * 200),
                vy: 170 + Math.random() * 110,
                comp: 90 + Math.random() * 90,
                vida: 1
            });

        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        for (let i = cadentes.length - 1; i >= 0; i--) {

            const c = cadentes[i];

            c.x += c.vx * dt;
            c.y += c.vy * dt;
            c.vida -= dt * 0.55;

            if (c.vida <= 0 || c.y > altura + 40 || c.x < -200) {
                cadentes.splice(i, 1);
                continue;
            }

            const ang = Math.atan2(c.vy, c.vx);
            const caudaX = c.x - Math.cos(ang) * c.comp;
            const caudaY = c.y - Math.sin(ang) * c.comp;

            const grad = ctx.createLinearGradient(c.x, c.y, caudaX, caudaY);

            grad.addColorStop(0, `rgba(255,235,250,${c.vida})`);
            grad.addColorStop(1, 'rgba(180,200,255,0)');

            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.8;
            ctx.globalAlpha = alphaGrupo;

            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(caudaX, caudaY);
            ctx.stroke();

        }

        ctx.restore();

    }

    function desenharPonteiro() {

        if (!ponteiro.ativo || DISPOSITIVO_LEVE) return;

        ponteiro.x += (ponteiro.alvoX - ponteiro.x) * 0.12;
        ponteiro.y += (ponteiro.alvoY - ponteiro.y) * 0.12;

        const g = ctx.createRadialGradient(ponteiro.x, ponteiro.y, 0, ponteiro.x, ponteiro.y, 170);

        g.addColorStop(0, 'rgba(246,179,214,0.16)');
        g.addColorStop(1, 'rgba(246,179,214,0)');

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alphaGrupo;
        ctx.fillStyle = g;
        ctx.fillRect(ponteiro.x - 170, ponteiro.y - 170, 340, 340);
        ctx.restore();

    }


    // =================================================
    // O CORAÇÃO (contorno de luz, brilho interno, faíscas)
    // =================================================

    function preencherCoracao(b) {

        const a = easeOut(clamp((tempo - 1.4) / 1.6, 0, 1)) * (0.8 + 0.2 * b) * alphaGrupo;

        if (a <= 0) return;

        const caminho = new Path2D();

        for (let i = 0; i <= 120; i++) {

            const t = (i / 120) * 2 * Math.PI;
            const bb = heartXY(t);
            const p = paraTela(bb.x, bb.y);

            if (i === 0) caminho.moveTo(p.sx, p.sy);
            else caminho.lineTo(p.sx, p.sy);

        }

        caminho.closePath();

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, escala * 17);

        g.addColorStop(0, `rgba(240,140,192,${0.20 * a})`);
        g.addColorStop(0.55, `rgba(150,110,240,${0.10 * a})`);
        g.addColorStop(1, `rgba(100,150,255,${0.02 * a})`);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.fill(caminho);
        ctx.restore();

    }

    // faixa de luz entre t = π - s e t = π + s (as duas metades subindo juntas)
    function tracoLuz(s, intensidade) {

        if (s < 0.02) return;

        const passos = Math.max(24, Math.round(s * 34));
        const caminho = new Path2D();

        for (let k = 0; k <= passos; k++) {

            const t = Math.PI - s + (2 * s * k) / passos;
            const b = heartXY(t);
            const p = paraTela(b.x, b.y);

            if (k === 0) caminho.moveTo(p.sx, p.sy);
            else caminho.lineTo(p.sx, p.sy);

        }

        const grad = ctx.createLinearGradient(cx - 16 * escala, cy, cx + 16 * escala, cy);

        grad.addColorStop(0, GRADIENTE_TRACO[0]);
        grad.addColorStop(0.5, GRADIENTE_TRACO[1]);
        grad.addColorStop(1, GRADIENTE_TRACO[2]);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = grad;

        [[16, 0.05], [9, 0.10], [4, 0.34], [1.8, 0.95]].forEach(([larg, alfa]) => {

            ctx.lineWidth = larg * fatorLinha;
            ctx.globalAlpha = alfa * intensidade * alphaGrupo;
            ctx.stroke(caminho);

        });

        ctx.restore();

    }

    function brilhoPonto(x, y, raio, forca) {

        const g = ctx.createRadialGradient(x, y, 0, x, y, raio);

        g.addColorStop(0, `rgba(255,255,255,${0.95 * forca})`);
        g.addColorStop(0.25, `rgba(246,179,214,${0.55 * forca})`);
        g.addColorStop(1, 'rgba(246,179,214,0)');

        ctx.fillStyle = g;
        ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);

    }

    // as duas faíscas que sobem desenhando o coração
    function desenharPontasDeLuz(s) {

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alphaGrupo;

        [Math.PI - s, Math.PI + s].forEach((t) => {

            const b = heartXY(t);
            const p = paraTela(b.x, b.y);

            brilhoPonto(p.sx, p.sy, 26 * fatorLinha, 1);

        });

        ctx.restore();

    }

    // depois de pronto, duas faíscas continuam orbitando
    function desenharFaiscas() {

        const f = ((tempo - (T_TRACO_INI + T_TRACO)) * 1.1) % (Math.PI * 2);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        [1, -1].forEach((lado) => {

            for (let i = 7; i >= 0; i--) {

                const t = lado * (f - i * 0.05);
                const b = heartXY(t);
                const p = paraTela(b.x, b.y);

                const cabeca = i === 0;

                ctx.globalAlpha = (cabeca ? 1 : 0.55 * (1 - i / 8)) * alphaGrupo;

                if (cabeca) {
                    brilhoPonto(p.sx, p.sy, 18 * fatorLinha, 1);
                } else {
                    ctx.fillStyle = '#d7e8ff';
                    ctx.beginPath();
                    ctx.arc(p.sx, p.sy, Math.max(0.6, 2.4 - i * 0.28), 0, Math.PI * 2);
                    ctx.fill();
                }

            }

        });

        ctx.restore();

    }

    function desenharGrupo() {

        const b = batida();

        const pulso = REDUZIR ? 1 : 1 + 0.045 * b;
        const camera = REDUZIR ? 1 : 1 + 0.035 * Math.min(1, tempo / 9);
        const sc = pulso * camera * zoomSaida();

        ctx.save();

        ctx.translate(cx, cy);
        ctx.scale(sc, sc);
        ctx.translate(-cx, -cy);

        preencherCoracao(b);

        desenharParticulas();

        const fimTraco = T_TRACO_INI + T_TRACO;

        const s = Math.PI * progTraco(clamp((tempo - T_TRACO_INI) / T_TRACO, 0, 1));

        tracoLuz(s, tempo < fimTraco ? 1 : 0.55 + 0.4 * b);

        if (tempo < fimTraco) desenharPontasDeLuz(s);
        else desenharFaiscas();

        ctx.restore();

    }

    // ondas de luz em forma de coração, saindo a cada batida
    function desenharOndas() {

        if (REDUZIR) return;

        if (estado !== 'saindo' && tempo >= T_FORMADO) {

            const fase = ((tempo - T_FORMADO) % PERIODO) / PERIODO;

            if (fase < ultimaFase) ondas.push(tempo);

            ultimaFase = fase;

        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineJoin = 'round';

        for (let i = ondas.length - 1; i >= 0; i--) {

            const prog = (tempo - ondas[i]) / 1.5;

            if (prog >= 1) { ondas.splice(i, 1); continue; }

            const sc = 1 + 0.45 * easeOut(prog);

            const caminho = new Path2D();

            for (let k = 0; k <= 120; k++) {

                const t = (k / 120) * 2 * Math.PI;
                const bb = heartXY(t);
                const p = paraTela(bb.x, bb.y);

                const x = cx + (p.sx - cx) * sc;
                const y = cy + (p.sy - cy) * sc;

                if (k === 0) caminho.moveTo(x, y);
                else caminho.lineTo(x, y);

            }

            ctx.strokeStyle = '#f6b3d6';
            ctx.lineWidth = 1.5 * fatorLinha;
            ctx.globalAlpha = Math.pow(1 - prog, 1.6) * 0.38 * alphaGrupo;
            ctx.stroke(caminho);

        }

        ctx.restore();

    }


    // =================================================
    // FAÍSCAS (explosões)
    // =================================================

    function explodir(x, y, quantidade, grande) {

        for (let i = 0; i < quantidade; i++) {

            const ang = Math.random() * Math.PI * 2;
            const vel = (grande ? 90 : 60) + Math.random() * (grande ? 340 : 240);

            explosao.push({
                x, y,
                vx: Math.cos(ang) * vel,
                vy: Math.sin(ang) * vel,
                r: 1 + Math.random() * 2.4,
                cor: escolher(CORES),
                vida: 1,
                dec: 0.45 + Math.random() * 0.55,
                coracao: Math.random() < 0.12
            });

        }

    }

    function desenharExplosao(dt) {

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = explosao.length - 1; i >= 0; i--) {

            const p = explosao[i];

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            const atrito = Math.pow(0.12, dt);

            p.vx *= atrito;
            p.vy *= atrito;
            p.vida -= p.dec * dt;

            if (p.vida <= 0) { explosao.splice(i, 1); continue; }

            ctx.globalAlpha = Math.max(0, p.vida) * 0.95;
            ctx.fillStyle = p.cor;

            if (p.coracao) {
                formaCoracao(ctx, p.x, p.y, p.r * 2.4);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }

        }

        ctx.restore();

    }

    // riscado de luz horizontal, tipo cinema, quando o coração fica pronto
    function desenharFlare() {

        if (REDUZIR || tempo < T_FORMADO) return;

        const d = (tempo - T_FORMADO) / 1.3;

        if (d >= 1) return;

        const a = (1 - d) * (1 - d);
        const y = cy - escala * 0.5;
        const larg = largura * 0.85 * (0.4 + 0.6 * easeOut(d));

        const g = ctx.createLinearGradient(cx - larg / 2, 0, cx + larg / 2, 0);

        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, `rgba(255,230,245,${0.85 * a})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alphaGrupo;
        ctx.fillStyle = g;
        ctx.fillRect(cx - larg / 2, y - 1.5, larg, 3);
        ctx.restore();

    }


    // =================================================
    // TEXTOS
    // =================================================

    function desenharTitulo() {

        const a = clamp((tempo - T_TITULO) / 1.2, 0, 1);

        if (a <= 0) return;

        const e = easeOut(a) * alphaGrupo;

        const fonte = clamp(menor * 0.068, 26, 62);
        const y = cy - escala * 0.5 + (1 - easeOut(a)) * 12;

        ctx.save();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // halo suave atrás
        ctx.globalCompositeOperation = 'lighter';

        const raio = fonte * 3.4;
        const halo = ctx.createRadialGradient(cx, y, 0, cx, y, raio);

        halo.addColorStop(0, `rgba(190,150,250,${0.32 * e})`);
        halo.addColorStop(1, 'rgba(190,150,250,0)');

        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, y, raio, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';

        // título com o mesmo degradê dos títulos do site
        ctx.font = `italic 600 ${fonte}px ${FONTE_SERIF}`;

        const larguraTexto = ctx.measureText(TITULO).width;
        const grad = ctx.createLinearGradient(cx - larguraTexto / 2, 0, cx + larguraTexto / 2, 0);

        grad.addColorStop(0, '#ffe6c2');
        grad.addColorStop(0.5, '#f6b3d6');
        grad.addColorStop(1, '#c9a7f5');

        ctx.globalAlpha = e;

        if (!DISPOSITIVO_LEVE) {
            ctx.shadowColor = 'rgba(240,140,192,0.75)';
            ctx.shadowBlur = fonte * 0.45;
        }

        ctx.fillStyle = grad;
        ctx.fillText(TITULO, cx, y);

        ctx.restore();

        // ornamento: fio com um coraçãozinho no meio
        const yo = y + fonte * 0.78;
        const comp = fonte * 2.2;

        ctx.save();
        ctx.globalAlpha = e * 0.9;
        ctx.lineWidth = 1;

        const esq = ctx.createLinearGradient(cx - comp - 14, 0, cx - 14, 0);

        esq.addColorStop(0, 'rgba(240,140,192,0)');
        esq.addColorStop(1, 'rgba(240,140,192,0.75)');

        ctx.strokeStyle = esq;
        ctx.beginPath();
        ctx.moveTo(cx - comp - 14, yo);
        ctx.lineTo(cx - 14, yo);
        ctx.stroke();

        const dir = ctx.createLinearGradient(cx + 14, 0, cx + comp + 14, 0);

        dir.addColorStop(0, 'rgba(240,140,192,0.75)');
        dir.addColorStop(1, 'rgba(240,140,192,0)');

        ctx.strokeStyle = dir;
        ctx.beginPath();
        ctx.moveTo(cx + 14, yo);
        ctx.lineTo(cx + comp + 14, yo);
        ctx.stroke();

        ctx.fillStyle = '#f08cc0';
        formaCoracao(ctx, cx, yo, fonte * 0.13);
        ctx.fill();

        ctx.restore();

    }

    function desenharDica() {

        const a = clamp((tempo - (LIBERA_CLIQUE_EM + 0.25)) / 0.9, 0, 1);

        if (a <= 0) return;

        const pulso = 0.5 + 0.5 * Math.sin(tempo * 2.6);
        const tam = clamp(menor * 0.03, 11, 14);
        const y = altura - clamp(altura * 0.055, 26, 46);

        ctx.save();

        ctx.font = `600 ${tam}px Montserrat, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        try { ctx.letterSpacing = '4px'; } catch (erro) { /* navegador sem suporte */ }

        ctx.globalAlpha = a * (0.42 + 0.5 * pulso) * alphaGrupo;
        ctx.fillStyle = '#f6b3d6';
        ctx.fillText(TEXTO_DICA.toUpperCase(), cx, y);

        ctx.restore();

    }


    // =================================================
    // LOOP
    // =================================================

    function quadro(agora) {

        // tempo em segundos, igual em qualquer tela (60Hz, 120Hz...)
        const dt = Math.min(0.05, (agora - ultimoAgora) / 1000);

        ultimoAgora = agora;
        tempo += dt;

        alphaGrupo = estado === 'saindo'
            ? 1 - easeInOut(clamp((tempo - tSaida) / 0.7, 0, 1))
            : 1;

        // momentos especiais
        if (!eventoTraco && tempo >= T_TRACO_INI + T_TRACO) {

            eventoTraco = true;

            const topo = heartXY(0);
            const p = paraTela(topo.x, topo.y);

            explodir(p.sx, p.sy, DISPOSITIVO_LEVE ? 14 : 26, false);

        }

        if (!eventoFormado && tempo >= T_FORMADO) {

            eventoFormado = true;

            explodir(cx, cy, DISPOSITIVO_LEVE ? 60 : 110, false);

        }

        desenharFundo();
        desenharEstrelas(dt);
        desenharBokeh(dt);
        desenharFlutuantes(dt);
        desenharCadentes(dt);
        desenharPonteiro();

        desenharGrupo();
        desenharOndas();

        desenharTitulo();
        desenharExplosao(dt);
        desenharFlare();
        desenharDica();

        // clarão rosado na hora de entrar
        if (estado === 'saindo') {

            const d = clamp((tempo - tSaida) / 0.9, 0, 1);

            ctx.save();
            ctx.globalAlpha = Math.sin(d * Math.PI) * 0.45;
            ctx.fillStyle = '#ffe3f1';
            ctx.fillRect(0, 0, largura, altura);
            ctx.restore();

        }

        if (tempo >= LIBERA_CLIQUE_EM && estado === 'abrindo') {
            canvas.style.cursor = 'pointer';
        }

        // terminou de sair: para o desenho
        if (estado === 'saindo' && tempo - tSaida > 1.3) return;

        requestAnimationFrame(quadro);

    }


    // =================================================
    // ENTRAR NO SITE
    // =================================================

    function entrar() {

        if (estado !== 'abrindo' || tempo < LIBERA_CLIQUE_EM) return;

        estado = 'saindo';
        tSaida = tempo;

        document.getElementById('live-counter')
            ?.classList.add('live-counter-visivel');

        // o coração "abre": zoom, faíscas e clarão
        explodir(cx, cy, DISPOSITIVO_LEVE ? 90 : 170, true);

        window.setTimeout(() => canvas.classList.add('heart-intro-oculto'), 320);

        window.setTimeout(() => { window.location.hash = 'hub'; }, 1000);

    }

    canvas.addEventListener('click', entrar);

    canvas.addEventListener('pointermove', (evento) => {

        if (evento.pointerType !== 'mouse') return;

        ponteiro.alvoX = evento.clientX;
        ponteiro.alvoY = evento.clientY;

        if (!ponteiro.ativo) {
            ponteiro.x = evento.clientX;
            ponteiro.y = evento.clientY;
            ponteiro.ativo = true;
        }

    });

    canvas.addEventListener('pointerleave', () => { ponteiro.ativo = false; });


    // =================================================
    // COMEÇAR
    // =================================================

    ajustarTamanho();

    requestAnimationFrame((agora) => {
        ultimoAgora = agora;
        quadro(agora);
    });

})();