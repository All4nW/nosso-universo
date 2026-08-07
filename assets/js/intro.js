// intro.js
// Controla três coisas independentes:
// 1. A tela de "preparando" que cobre a página ao carregar
// 2. A transição cinematográfica ao clicar em "Entrar"
// 3. O contador ao vivo de tempo de relacionamento

// ===== 1. Preloader =====

window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    setTimeout(() => {
        preloader.classList.add('oculto');
    }, 1200);
});

// ===== 2. Transição cinematográfica ao entrar =====

const botaoEntrar = document.querySelector('.welcome-button');
const overlayTransicao = document.getElementById('transition-overlay');

if (botaoEntrar && overlayTransicao) {
    botaoEntrar.addEventListener('click', (evento) => {
        evento.preventDefault(); // impede a navegação instantânea
        overlayTransicao.classList.remove('oculto');

        setTimeout(() => {
            window.location.hash = 'hub';

            // Some o overlay logo depois de já estar na nova seção
            setTimeout(() => {
                overlayTransicao.classList.add('oculto');
            }, 400);
        }, 1000);
    });
}

// ===== 3. Contador ao vivo =====

// intro.js
// Controla o contador ao vivo de tempo de relacionamento,
// visível em todas as seções do site (elemento fixo, fora do sistema de views).

// 🔧 TROQUE pela data e hora reais do início do relacionamento de vocês
// 🔧 TROQUE pela data e hora reais do início do relacionamento de vocês
const inicioRelacionamento = new Date('2025-08-05T00:00:00');

let segundosAnterior = null; // guarda o valor do segundo anterior, para detectar a "virada" de minuto

function atualizarContador() {
    const elDias = document.getElementById('counter-dias');
    if (!elDias) return;

    const agora = new Date();
    const diferencaMs = agora - inicioRelacionamento;

    if (diferencaMs < 0) return;

    const segundosTotais = Math.floor(diferencaMs / 1000);
    const dias = Math.floor(segundosTotais / 86400);
    const horas = Math.floor((segundosTotais % 86400) / 3600);
    const minutos = Math.floor((segundosTotais % 3600) / 60);
    const segundos = segundosTotais % 60;

    elDias.textContent = String(dias).padStart(3, '0');
    document.getElementById('counter-horas').textContent = String(horas).padStart(2, '0');
    document.getElementById('counter-minutos').textContent = String(minutos).padStart(2, '0');

    const elSegundos = document.getElementById('counter-segundos');
    elSegundos.textContent = String(segundos).padStart(2, '0');

    elSegundos.classList.remove('counter-pulse');
    void elSegundos.offsetWidth;
    elSegundos.classList.add('counter-pulse');

    // Detecta a virada de um minuto completo (segundos passou de >0 para 0)
    // e dispara o efeito de coração em cima do bloco de minutos.
    if (segundosAnterior !== null && segundosAnterior !== 0 && segundos === 0) {
        const elMinutos = document.getElementById('counter-minutos');
        if (elMinutos && typeof criarExplosaoCoracoes === 'function') {
            const rect = elMinutos.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top;
            criarExplosaoCoracoes(x, y);
        }
    }

    segundosAnterior = segundos;
}

atualizarContador();
setInterval(atualizarContador, 1000);

