// particles.js
// Desenha um céu estrelado no <canvas id="stars-bg">, atrás de todo o conteúdo.
// Duas camadas de partículas: estrelas fixas (pulsam) e estrelas cadentes (cruzam a tela).

const canvas = document.getElementById('stars-bg');
const ctx = canvas.getContext('2d');

let estrelas = [];
let cadentes = [];

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
            velocidadeBrilho: Math.random() * 0.02 + 0.005
        });
    }
}

// Cria uma única estrela cadente, começando de um ponto aleatório
// fora ou perto da borda superior, viajando na diagonal.
function criarEstrelaCadente() {
    const comecoX = Math.random() * canvas.width;
    const comecoY = Math.random() * (canvas.height * 0.3); // começa no terço superior

    // Ângulo da diagonal (entre 20° e 45°, sempre descendo para a direita)
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

// Decide, a cada frame, se uma nova estrela cadente deve nascer.
// Probabilidade baixa = elas aparecem raramente, de forma imprevisível.
function talvezCriarCadente() {
    const chancePorFrame = 0.006; // ~0.6% de chance a cada frame
    if (Math.random() < chancePorFrame) {
        criarEstrelaCadente();
    }
}

function desenharEstrelasFixas() {
    for (const estrela of estrelas) {
        estrela.fase += estrela.velocidadeBrilho;
        const opacidade = 0.3 + (Math.sin(estrela.fase) + 1) / 2 * 0.7;

        ctx.beginPath();
        ctx.arc(estrela.x, estrela.y, estrela.raio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 245, 245, ${opacidade})`;
        ctx.fill();
    }
}

function desenharCadentes() {
    for (let i = cadentes.length - 1; i >= 0; i--) {
        const c = cadentes[i];

        c.x += c.vx;
        c.y += c.vy;
        c.opacidade -= 0.012; // desaparece gradualmente

        // Desenha o rastro como uma linha com gradiente (brilhante na cabeça, sumindo na cauda)
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

        // Remove a estrela cadente quando ela sai da tela ou termina de desaparecer
        const saiuDaTela = c.x > canvas.width + 100 || c.y > canvas.height + 100;
        if (saiuDaTela || c.opacidade <= 0) {
            cadentes.splice(i, 1);
        }
    }
}

function desenharFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    desenharEstrelasFixas();
    talvezCriarCadente();
    desenharCadentes();

    requestAnimationFrame(desenharFrame);
}

ajustarTamanho();
criarEstrelas();
desenharFrame();

window.addEventListener('resize', () => {
    ajustarTamanho();
    criarEstrelas();
});