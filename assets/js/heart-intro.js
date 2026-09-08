// heart-intro.js
// Tradução fiel do código Python/Pygame original pro Canvas 2D do navegador.
// Mesma fórmula matemática do coração, mesmas contagens de partículas,
// mesma técnica de "glow" (camadas de texto ampliadas e semi-transparentes
// atrás do texto normal), mesmo timing de frames.
//
// AJUSTES PRA MOBILE (sem perder o visual):
//
// 1. Sizing correto com devicePixelRatio — antes o código usava
//    window.innerWidth/innerHeight direto tanto pro tamanho em CSS
//    quanto pro tamanho real do canvas. Em telas de alta densidade
//    (a maioria dos celulares) e principalmente dentro de navegadores
//    embutidos de outros apps, isso causa uma distorção de escala —
//    o coração acaba desenhado "errado", e o que aparece na tela é só
//    um pedaço ampliado do meio do desenho. Agora o canvas é dimensionado
//    em pixels de CSS (o que a pessoa realmente vê) e a resolução
//    interna é multiplicada pelo devicePixelRatio à parte, do jeito
//    correto — ctx.scale() cuida da conversão.
//
// 2. Menos partículas e menos camadas de brilho em telas pequenas/
//    touch (celular) — o desenho original faz até 3 camadas de texto
//    por partícula (~1260 fillText por frame) mais sombra em 70
//    partículas de poeira, o que é pesado demais pro processador de
//    um celular. Reduzido pra continuar bonito, só mais leve.

(function () {

    const canvas = document.getElementById('heart-intro-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');


    // ===== Detecta se é um dispositivo "leve" (celular/touch) =====
    // Usado só pra ajustar quantidade de partículas e camadas de
    // brilho — a lógica e o visual continuam os mesmos.

    const DISPOSITIVO_LEVE =
        window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth <= 768;


    // ===== Constantes (equivalentes às do Python) =====

    const WORDS = ['love you', 'Love You', 'LOVE YOU'];
    const CENTER_TEXT = ' Love You ';

    // Mesmas cores do Python, em hexadecimal
    const COLORS = [
        '#4682b4', // (70, 130, 180)
        '#1e90ff', // (30, 144, 255)
        '#00bfff', // (0, 191, 255)
        '#6495ed', // (100, 149, 237)
        '#4169e1'  // (65, 105, 225)
    ];

    // Em celular, menos partículas — o coração continua reconhecível
    // e bonito, só com uma densidade um pouco menor.
    const N_OUTLINE = DISPOSITIVO_LEVE ? 150 : 220;
    const N_FILL = DISPOSITIVO_LEVE ? 130 : 200;
    const FRAMES_PER_STEP = 0.9;


    // ===== Poeira ambiente (flutua sempre, dá profundidade/volume) =====

    const FLOAT_COUNT = DISPOSITIVO_LEVE ? 26 : 70;
    let particulasAmbiente = [];

    function criarParticulasAmbiente() {

        particulasAmbiente = [];

        for (let i = 0; i < FLOAT_COUNT; i++) {

            particulasAmbiente.push({
                x: Math.random() * largura,
                y: Math.random() * altura,
                raio: 0.6 + Math.random() * 1.8,
                cor: escolherAleatorio(COLORS),
                fase: Math.random() * Math.PI * 2,
                velocidade: 0.15 + Math.random() * 0.25,
                deriva: (Math.random() - 0.5) * 0.3
            });

        }

    }

    function desenharParticulasAmbiente() {

        particulasAmbiente.forEach((p) => {

            p.fase += 0.015;
            p.y -= p.velocidade;
            p.x += p.deriva;

            // Reaparece do outro lado quando sai da tela
            if (p.y < -10) p.y = altura + 10;
            if (p.x < -10) p.x = largura + 10;
            if (p.x > largura + 10) p.x = -10;

            const brilho =
                0.35 + 0.45 * (0.5 + 0.5 * Math.sin(p.fase));

            ctx.save();
            ctx.globalAlpha = brilho;
            ctx.fillStyle = p.cor;

            // shadowBlur é uma das operações mais caras em Canvas 2D —
            // em celular, pula (mantém a poeira, só sem o glow extra).
            if (!DISPOSITIVO_LEVE) {
                ctx.shadowColor = p.cor;
                ctx.shadowBlur = 6;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

        });

    }


    // ===== Explosão de faíscas (equivalente a spawnHeartBurst) =====
    // Disparada uma vez, no momento em que o coração termina de se
    // formar — espalha partículas rápidas saindo do centro do
    // coração em todas as direções, dando aquele "estouro" de luz.

    let particulasExplosao = [];
    let explosaoDisparada = false;

    function spawnHeartBurst(x, y, quantidade) {

        for (let i = 0; i < quantidade; i++) {

            const angulo = Math.random() * Math.PI * 2;
            const velocidade = 1.5 + Math.random() * 4;

            particulasExplosao.push({
                x, y,
                vx: Math.cos(angulo) * velocidade,
                vy: Math.sin(angulo) * velocidade,
                raio: 1 + Math.random() * 2.2,
                cor: escolherAleatorio(COLORS),
                vida: 1
            });

        }

    }

    function desenharParticulasExplosao() {

        for (let i = particulasExplosao.length - 1; i >= 0; i--) {

            const p = particulasExplosao[i];

            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.vida -= 0.012;

            if (p.vida <= 0) {
                particulasExplosao.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.vida);
            ctx.fillStyle = p.cor;

            if (!DISPOSITIVO_LEVE) {
                ctx.shadowColor = p.cor;
                ctx.shadowBlur = 10;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

        }

    }

    // ===== Dimensionamento correto do canvas =====
    //
    // "largura"/"altura" são sempre em PIXELS DE CSS — é o que a
    // fórmula do coração e todo o resto do código usa pra posicionar
    // as coisas, exatamente como antes. A diferença é que agora o
    // canvas tem uma resolução INTERNA multiplicada pelo
    // devicePixelRatio (nítido em qualquer tela), e ctx.scale() faz
    // a conversão — então o resto do código nem percebe a mudança.

    let largura = 0;
    let altura = 0;
    let escala = 20;
    let fatorGap = 1; // ajusta o "min_gap" proporcionalmente à escala

    function ajustarTamanho() {

        // window.visualViewport é mais confiável que innerWidth/innerHeight
        // em navegadores mobile (principalmente os embutidos de outros
        // apps), porque reflete o que está REALMENTE visível na tela.
        const viewport = window.visualViewport;

        largura = viewport ? viewport.width : window.innerWidth;
        altura = viewport ? viewport.height : window.innerHeight;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = largura * dpr;
        canvas.height = altura * dpr;

        canvas.style.width = largura + 'px';
        canvas.style.height = altura + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Coração ocupa ~92% da menor dimensão da tela (largura ou altura)
        const menorLado = Math.min(largura, altura);
        escala = (menorLado * 0.92) / 32;

        // No Python, escala=20 tinha min_gap=30 (outline) e 46 (fill).
        // Mantém essa mesma proporção relativa à escala atual.
        fatorGap = escala / 20;

        criarParticulasAmbiente();
    }

    ajustarTamanho();
    window.addEventListener('resize', ajustarTamanho);
    window.addEventListener('orientationchange', ajustarTamanho);

    // Navegadores mobile às vezes ainda ajustam a barra de endereço
    // (mostrando/escondendo) um instante depois do carregamento —
    // essa segunda medição pega esse ajuste tardio.
    window.setTimeout(ajustarTamanho, 300);


    // ===== Fórmula matemática do coração (idêntica ao Python) =====

    function heartXY(t) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        return { x, y: -y };
    }

    function toScreen(x, y) {
        return {
            sx: x * escala + largura / 2,
            sy: y * escala + altura / 2
        };
    }

    function dist(x1, y1, x2, y2) {
        return Math.hypot(x1 - x2, y1 - y2);
    }

    function escolherAleatorio(lista) {
        return lista[Math.floor(Math.random() * lista.length)];
    }


    // ===== Partícula (equivalente à classe Particle) =====

    function criarParticula(x, y, order, kind) {
        return {
            x, y, order, kind,
            word: escolherAleatorio(WORDS),
            color: escolherAleatorio(COLORS),
            alpha: 0,
            flicker: Math.random() * Math.PI * 2,
            delay: 0,
            sizeMult: 0.85 + Math.random() * 0.3 // random.uniform(0.85, 1.15)
        };
    }


    // ===== Contorno (equivalente a build_outline_particles) =====

    function buildOutlineParticles(nOutline, minGap) {

        const particles = [];
        const placed = [];

        for (let i = 0; i < nOutline; i++) {

            const t = (i / nOutline) * 2 * Math.PI;
            const base = heartXY(t);
            const { sx, sy } = toScreen(base.x, base.y);

            if (placed.some(p => dist(sx, sy, p.x, p.y) < minGap)) continue;

            placed.push({ x: sx, y: sy });
            particles.push(criarParticula(sx, sy, i, 'outline'));

        }

        return particles;

    }


    // ===== Preenchimento (equivalente a build_fill_particles) =====

    function buildFillParticles(nFill, minGap) {

        const particles = [];
        const placed = [];
        let attempts = 0;
        const maxAttempts = nFill * 80;

        while (particles.length < nFill && attempts < maxAttempts) {

            attempts++;

            const t = Math.random() * 2 * Math.PI;
            const r = Math.random() * 0.86;
            const base = heartXY(t);
            const { sx, sy } = toScreen(base.x * r, base.y * r);

            if (placed.some(p => dist(sx, sy, p.x, p.y) < minGap)) continue;

            placed.push({ x: sx, y: sy });
            particles.push(
                criarParticula(sx, sy, Math.floor(Math.random() * 321), 'fill')
            );

        }

        return particles;

    }


    // ===== Glow em camadas (equivalente a draw_glow_text) =====
    // Desenha uma camada ampliada e bem transparente atrás (efeito
    // de brilho "vazando"), outra um pouco menos ampliada e um
    // pouco mais opaca, e por cima o texto no tamanho normal.
    //
    // Em celular, pula a camada mais externa (a mais cara, fonte até
    // 2.9x maior) — mantém a camada média + o texto normal, então
    // ainda existe glow, só um pouco mais discreto.

    function drawGlowText(word, color, x, y, alpha, sizeMult, tamanhoFonteBase) {

        if (alpha <= 0) return;

        const tamanhoFonte = tamanhoFonteBase * sizeMult;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;

        if (alpha > 10) {

            if (!DISPOSITIVO_LEVE) {

                // Camada grande (2.9x) — só no desktop
                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha / 4.5) / 255;
                ctx.font = `bold ${tamanhoFonte * 2.9}px Arial`;
                ctx.fillText(word, x, y);
                ctx.restore();

            }

            // Camada média (1.9x), bem mais forte (alpha // 2)
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha / 2) / 255;
            ctx.font = `bold ${tamanhoFonte * 1.9}px Arial`;
            ctx.fillText(word, x, y);
            ctx.restore();

        }

        // Texto no tamanho normal, com o alpha real
        ctx.save();
        ctx.globalAlpha = alpha / 255;
        ctx.font = `bold ${tamanhoFonte}px Arial`;
        ctx.fillText(word, x, y);
        ctx.restore();

    }


    // ===== Monta as partículas =====

    const outline = buildOutlineParticles(N_OUTLINE, 20 * fatorGap);
    const fill = buildFillParticles(N_FILL, 30 * fatorGap);

    const outlineSpan = outline.length
        ? Math.max(...outline.map(p => p.order))
        : 0;

    const fillStartFrame = Math.floor(outlineSpan * FRAMES_PER_STEP) + 30;

    fill.forEach(p => { p.delay = fillStartFrame + p.order; });
    outline.forEach(p => { p.delay = Math.floor(p.order * FRAMES_PER_STEP); });

    const particles = [...outline, ...fill];

    const FONT_OUTLINE = 20;
    const FONT_FILL = 17;

    particles.forEach(p => {
        p.fontBase = p.kind === 'outline' ? FONT_OUTLINE : FONT_FILL;
    });


    // ===== Cometinhas caindo no fundo (atrás do coração) =====

    let cometas = [];

    function talvezCriarCometa() {

        if (cometas.length >= 4) return;

        if (Math.random() < 0.012) {

            cometas.push({
                x: Math.random() * largura,
                y: -20,
                vx: (Math.random() - 0.5) * 1.5,
                vy: 3 + Math.random() * 3,
                comprimento: 60 + Math.random() * 60,
                opacidade: 1
            });

        }

    }

    function desenharCometas() {

        talvezCriarCometa();

        for (let i = cometas.length - 1; i >= 0; i--) {

            const c = cometas[i];

            c.x += c.vx;
            c.y += c.vy;
            c.opacidade -= 0.006;

            const angulo = Math.atan2(c.vy, c.vx);
            const caudaX = c.x - Math.cos(angulo) * c.comprimento;
            const caudaY = c.y - Math.sin(angulo) * c.comprimento;

            const gradiente = ctx.createLinearGradient(c.x, c.y, caudaX, caudaY);
            gradiente.addColorStop(0, `rgba(180, 200, 255, ${c.opacidade})`);
            gradiente.addColorStop(1, 'rgba(180, 200, 255, 0)');

            ctx.save();
            ctx.strokeStyle = gradiente;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(caudaX, caudaY);
            ctx.stroke();
            ctx.restore();

            if (c.opacidade <= 0 || c.y > altura + 100) {
                cometas.splice(i, 1);
            }

        }

    }


    // ===== Loop principal =====

    let frame = 0;
    let estado = 'formando'; // 'formando' -> 'formado' -> 'saindo'
    const centerStart = fillStartFrame + 90;
    const frameFormado = centerStart + 90; // quando o coração+texto já estão 100% visíveis

    function desenharParticulas() {

        particles.forEach((p) => {

            if (frame > p.delay && p.alpha < 255) {
                p.alpha = Math.min(255, p.alpha + 14 + Math.floor(Math.random() * 5));
            }

            let flick = 1.0;

            if (p.alpha >= 255) {
                flick = 0.75 + 0.25 * Math.sin(frame * 0.04 + p.flicker);
            }

            const alpha = p.alpha * flick;

            if (alpha <= 0) return;

            drawGlowText(p.word, p.color, p.x, p.y, alpha, p.sizeMult, p.fontBase);

        });

    }

    function desenharTextoCentral() {

        if (frame <= centerStart) return;

        const progresso = Math.min(1, (frame - centerStart) / 60);
        const alpha = 255 * (1 - Math.exp(-progresso * 8));
        const pulso = 1 + 0.04 * Math.sin(frame * 0.05);

        const tamanhoFonte = 30 * pulso;
        const corTexto = '#9b8cf0'; // roxo-azulado

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = corTexto;

        if (alpha > 10) {

            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha / 5) / 255;
            ctx.font = `bold ${tamanhoFonte * 1.4}px Georgia, serif`;
            ctx.fillText('Click', largura / 2, altura / 2);
            ctx.restore();

        }

        ctx.save();
        ctx.globalAlpha = alpha / 255;
        ctx.font = `bold ${tamanhoFonte}px Georgia, serif`;
        ctx.fillText('Click', largura / 2, altura / 2);
        ctx.restore();

    }

    function loop() {

        if (estado === 'saindo') return;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, largura, altura);

        desenharParticulasAmbiente();
        desenharCometas();
        desenharParticulas();
        desenharTextoCentral();
        desenharParticulasExplosao();

        frame++;

        if (estado === 'formando' && frame > frameFormado) {

            estado = 'formado';
            canvas.style.cursor = 'pointer';

            if (!explosaoDisparada) {
                explosaoDisparada = true;
                spawnHeartBurst(largura / 2, altura / 2, 140);
            }

        }

        requestAnimationFrame(loop);

    }

    // Clicar só funciona depois que o coração já se formou de vez —
    // é o "Entrar": funde a tela e navega pro hub (o universo).
    function entrarNoUniverso() {

        if (estado !== 'formado') return;

        estado = 'saindo';

        canvas.classList.add('heart-intro-oculto');

        document.getElementById('live-counter')
            ?.classList.add('live-counter-visivel');

        window.setTimeout(
            () => {
                window.location.hash = 'hub';
            },
            900
        );

    }

    canvas.addEventListener('click', entrarNoUniverso);

    requestAnimationFrame(loop);

})();