// particles.js
// Desenha um céu estrelado no <canvas id="stars-bg">, atrás de todo o conteúdo.
// Comportamentos combinados:
// 1. Estrelas fixas que pulsam (brilho)
// 2. Estrelas cadentes que cruzam a tela ocasionalmente
// 3. Corações ambiente subindo suavemente
// 4. Parallax sutil: as estrelas reagem ao movimento do mouse

const canvas = document.getElementById('stars-bg');
const ctx = canvas.getContext('2d');

let estrelas = [];
let cadentes = [];
let coracoes = [];

let mouseX = 0;
let mouseY = 0;

// Captura a posição do mouse, normalizada entre -1 e 1
// (-1 = borda esquerda/topo, 0 = centro, 1 = borda direita/baixo)
window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

function ajustarTamanho() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function criarEstrelas() {
    estrelas = [];
    const quantidade = Math.floor((canvas.width * canvas.height) / 8000);

    for (let i = 0; i < quantidade; i++) {
        estrelas.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            raio: Math.random() * 1.3 + 0.3,
            fase: Math.random() * Math.PI * 2,
            velocidadeBrilho: Math.random() * 0.02 + 0.005,

            // Quanto maior, mais a estrela se move com o mouse
            // (simula estar "mais perto" da câmera)
            profundidade: Math.random() * 0.6 + 0.4
        });
    }
}

function criarEstrelaCadente() {
    const comecoX = Math.random() * canvas.width;
    const comecoY = Math.random() * (canvas.height * 0.3);

    const angulo = (Math.random() * 25 + 20) * (Math.PI / 180);
    const velocidade = Math.random() * 6 + 10;

    cadentes.push({
        x: comecoX,
        y: comecoY,
        vx: Math.cos(angulo) * velocidade,
        vy: Math.sin(angulo) * velocidade,
        comprimento: Math.random() * 80 + 60,
        opacidade: 1
    });
}

function talvezCriarCadente() {
    const chancePorFrame = 0.006;
    if (Math.random() < chancePorFrame) {
        criarEstrelaCadente();
    }
}

// Cria um coração ambiente, subindo a partir da base da tela.
function criarCoracaoAmbiente() {
    coracoes.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 20,
        velocidade: Math.random() * 0.4 + 0.2,
        amplitude: Math.random() * 20 + 10,
        faseSway: Math.random() * Math.PI * 2,
        velocidadeSway: Math.random() * 0.02 + 0.01,
        tamanho: Math.random() * 8 + 10,
        opacidadeMax: Math.random() * 0.2 + 0.12
    });
}

// Decide se um novo coração deve nascer. Limite de 4 na tela
// ao mesmo tempo garante que o efeito continue discreto.
function talvezCriarCoracao() {
    if (coracoes.length < 4 && Math.random() < 0.003) {
        criarCoracaoAmbiente();
    }
}

function desenharEstrelasFixas() {
    for (const estrela of estrelas) {
        estrela.fase += estrela.velocidadeBrilho;
        const opacidade = 0.3 + (Math.sin(estrela.fase) + 1) / 2 * 0.7;

        const deslocamentoX = mouseX * estrela.profundidade * 12;
        const deslocamentoY = mouseY * estrela.profundidade * 12;

        ctx.beginPath();
        ctx.arc(estrela.x + deslocamentoX, estrela.y + deslocamentoY, estrela.raio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 245, 245, ${opacidade})`;
        ctx.fill();
    }
}

function desenharCadentes() {
    for (let i = cadentes.length - 1; i >= 0; i--) {
        const c = cadentes[i];

        c.x += c.vx;
        c.y += c.vy;
        c.opacidade -= 0.012;

        const anguloRastro = Math.atan2(c.vy, c.vx);
        const caudaX = c.x - Math.cos(anguloRastro) * c.comprimento;
        const caudaY = c.y - Math.sin(anguloRastro) * c.comprimento;

        const gradiente = ctx.createLinearGradient(c.x, c.y, caudaX, caudaY);
        gradiente.addColorStop(0, `rgba(255, 255, 255, ${c.opacidade})`);
        gradiente.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(caudaX, caudaY);
        ctx.strokeStyle = gradiente;
        ctx.lineWidth = 2;
        ctx.stroke();

        const saiuDaTela = c.x > canvas.width + 100 || c.y > canvas.height + 100;
        if (saiuDaTela || c.opacidade <= 0) {
            cadentes.splice(i, 1);
        }
    }
}

function desenharCoracoes() {
    for (let i = coracoes.length - 1; i >= 0; i--) {
        const c = coracoes[i];

        c.y -= c.velocidade;
        c.faseSway += c.velocidadeSway;
        const xAtual = c.x + Math.sin(c.faseSway) * c.amplitude;

        // Aparece suavemente ao nascer, e desaparece suavemente perto do topo
        const alturaPercorrida = (canvas.height + 20) - c.y;
        let opacidade = c.opacidadeMax;

        if (alturaPercorrida < 60) {
            opacidade = c.opacidadeMax * (alturaPercorrida / 60);
        } else if (c.y < canvas.height * 0.15) {
            opacidade = c.opacidadeMax * (c.y / (canvas.height * 0.15));
        }

        ctx.font = `${c.tamanho}px sans-serif`;
        ctx.fillStyle = `rgba(245, 194, 209, ${Math.max(opacidade, 0)})`;
        ctx.textAlign = 'center';
        ctx.fillText('♥', xAtual, c.y);

        if (c.y < -20) {
            coracoes.splice(i, 1);
        }
    }
}

function desenharFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    desenharEstrelasFixas();
    talvezCriarCadente();
    desenharCadentes();

    talvezCriarCoracao();
    desenharCoracoes();

    requestAnimationFrame(desenharFrame);
}

ajustarTamanho();
criarEstrelas();
desenharFrame();

window.addEventListener('resize', () => {
    ajustarTamanho();
    criarEstrelas();
});