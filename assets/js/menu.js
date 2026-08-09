// menu.js
// Injeta o navbar (components/navbar.html) e ativa os comportamentos
// de som e do link de admin (visível apenas localmente).

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

        mostrarLinkAdminSeLocal();
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
    if (!botaoSom) return;

    let playlist = [];
    let indiceAtual = 0;
    let audio = new Audio();
    let tocando = false;

    audio.addEventListener('ended', () => {
        indiceAtual = (indiceAtual + 1) % playlist.length;
        tocarFaixaAtual();
    });

    function tocarFaixaAtual() {
        if (!playlist.length) return;

        const musica = playlist[indiceAtual];

        audio.src = musica.arquivo.startsWith('http')
            ? musica.arquivo
            : `http://localhost:3000${musica.arquivo}`;

        audio.volume = (musica.volume || 80) / 100;

        audio.addEventListener('loadedmetadata', () => {
            audio.currentTime = musica.inicioSegundos || 0;
        }, { once: true });

        if (tocando) {
            audio.play().catch(() => {
                console.warn('Não foi possível tocar a próxima faixa.');
            });
        }
    }

    async function carregarPlaylist() {
        try {
            const resposta = await fetch('http://localhost:3000/api/music');
            if (!resposta.ok) throw new Error('API indisponível.');

            const dados = await resposta.json();
            playlist = dados.filter(m => m.ativo);

        } catch (erro) {
            console.warn('API de música indisponível, usando trilha estática como backup:', erro);

            // Plano B: áudio estático, se existir
            playlist = [{
                arquivo: 'assets/audio/trilha.mp3',
                volume: 30,
                inicioSegundos: 12
            }];
        }

        if (playlist.length) {
            tocarFaixaAtual();
        }
    }

    function alternarSom() {
        if (!playlist.length) return;

        if (tocando) {
            audio.pause();
            botaoSom.textContent = '🔇';
            tocando = false;
        } else {
            tocando = true;

            if (!audio.src) {
                tocarFaixaAtual();
            } else {
                audio.play().catch(() => {
                    console.warn('Áudio indisponível ou bloqueado pelo navegador.');
                });
            }

            botaoSom.textContent = '🔊';
        }
    }

    carregarPlaylist();

    const eventosDeInteracao = ['click', 'scroll', 'wheel', 'touchstart', 'keydown'];

    function primeiraInteracao() {
        if (!tocando) alternarSom();
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