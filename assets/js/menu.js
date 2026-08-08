// menu.js
// Injeta o link fixo de "voltar ao universo" (components/navbar.html)
// em qualquer página que tenha o elemento #navbar-placeholder.

async function carregarNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    try {
        const resposta = await fetch('components/navbar.html');
        const html = await resposta.text();
        placeholder.innerHTML = html;

        ativarComportamentoDoSom(); // NOVO
        ativarEfeitoClique(document.getElementById('sound-toggle'));
ativarEfeitoClique(document.querySelector('.home-link'));
    } catch (erro) {
        console.error('Erro ao carregar o navbar:', erro);
    }
}
async function carregarNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    try {
        const resposta = await fetch('components/navbar.html');
        const html = await resposta.text();
        placeholder.innerHTML = html;

        ativarComportamentoDoSom();
        ativarEfeitoClique(document.getElementById('sound-toggle'));
        ativarEfeitoClique(document.querySelector('.home-link'));

        mostrarLinkAdminSeLocal(); // NOVO
    } catch (erro) {
        console.error('Erro ao carregar o navbar:', erro);
    }
}

// Mostra o link do painel administrativo apenas quando o site
// está rodando localmente (seu PC) — nunca na versão pública do GitHub Pages.
function mostrarLinkAdminSeLocal() {
    const ehLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const linkAdmin = document.getElementById('admin-link');

    if (ehLocal && linkAdmin) {
        linkAdmin.classList.remove('oculto');
    }
}

function ativarComportamentoDoSom() {
    const botaoSom = document.getElementById('sound-toggle');
    const audio = document.getElementById('trilha-fundo');
    
    if (!botaoSom || !audio) return;

    audio.volume = 0.3;

    audio.addEventListener('loadedmetadata', () => {
        audio.currentTime = 12;
    }, { once: true });

    // Sempre pergunta ao próprio elemento de áudio se está pausado,
    // em vez de confiar numa variável separada que pode dessincronizar.
    function alternarSom() {
        if (audio.paused) {
            audio.play().then(() => {
                botaoSom.textContent = '🔊';
            }).catch(() => {
                console.warn('Áudio indisponível (arquivo ausente ou bloqueado pelo navegador).');
            });
        } else {
            audio.pause();
            botaoSom.textContent = '🔇';
        }
    }

    const eventosDeInteracao = ['click', 'scroll', 'wheel', 'touchstart', 'keydown'];

    function primeiraInteracao() {
        if (audio.paused) alternarSom();
        eventosDeInteracao.forEach(ev => window.removeEventListener(ev, primeiraInteracao));
    }

    eventosDeInteracao.forEach(ev => {
        window.addEventListener(ev, primeiraInteracao, { once: true, passive: true });
    });

    botaoSom.addEventListener('click', (evento) => {
        evento.stopPropagation();
        alternarSom();
    });

    botaoSom.classList.add('sound-toggle-glow');
    setTimeout(() => {
        botaoSom.classList.remove('sound-toggle-glow');
    }, 3000);
}

carregarNavbar();

