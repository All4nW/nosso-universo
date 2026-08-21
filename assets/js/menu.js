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
function resolverCaminhoAudio(caminho) {
    if (!caminho) return '';
    if (caminho.startsWith('http://') || caminho.startsWith('https://')) return caminho;
    if (caminho.startsWith('/uploads/')) return `http://localhost:3000${caminho}`;
    return caminho;
}

function ativarComportamentoDoSom() {
    const botaoSom = document.getElementById('sound-toggle');
    const popup = document.getElementById('player-popup');
    const tituloEl = document.getElementById('player-titulo');
    const btnPlayPause = document.getElementById('player-play-pause');
    const btnAnterior = document.getElementById('player-anterior');
    const btnProximo = document.getElementById('player-proximo');
    const btnMute = document.getElementById('player-mute');
    const btnVolMenos = document.getElementById('player-vol-menos');
    const btnVolMais = document.getElementById('player-vol-mais');
    const volumeTexto = document.getElementById('player-volume-valor');
        const btnListaToggle = document.getElementById('player-lista-toggle');
    const listaContainer = document.getElementById('player-lista');

    if (!botaoSom) return;

    let playlist = [];
    let indiceAtual = 0;
    let audio = new Audio();
    let tocando = false;
    let mutado = false;

    // Volume global (0 a 1), padrão 25%. Guardado no navegador para lembrar entre visitas.
    let volumeAtual =
        parseFloat(localStorage.getItem('nossoUniversoVolume')) || 0.25;

    function aplicarVolume() {
        audio.volume = mutado ? 0 : volumeAtual;

        if (volumeTexto) {
            volumeTexto.textContent = `${Math.round(volumeAtual * 100)}%`;
        }

        if (btnMute) {
            btnMute.textContent = mutado ? '🔇' : '🔊';
        }
    }

    function ajustarVolume(delta) {
        volumeAtual = Math.min(1, Math.max(0, volumeAtual + delta));
        localStorage.setItem('nossoUniversoVolume', volumeAtual);
        if (mutado && volumeAtual > 0) mutado = false;
        aplicarVolume();
    }

    function alternarMute() {
        mutado = !mutado;
        aplicarVolume();
    }

    function atualizarTitulo() {
        if (tituloEl && playlist.length) {
            tituloEl.textContent = playlist[indiceAtual].titulo || 'Sem título';
        }
    }

    function atualizarBotaoPlayPause() {
        if (btnPlayPause) {
            btnPlayPause.textContent = tocando ? '⏸' : '▶';
        }
        botaoSom.textContent = tocando ? '🔊' : '🎵';
    }

    audio.addEventListener('timeupdate', () => {
        const musica = playlist[indiceAtual];
        if (musica && musica.fimSegundos > 0 && audio.currentTime >= musica.fimSegundos) {
            proximaFaixa();
        }
    });

    audio.addEventListener('ended', () => {
        proximaFaixa();
    });

    function tocarFaixaAtual() {
        if (!playlist.length) return;

        const musica = playlist[indiceAtual];

        audio.src = resolverCaminhoAudio(musica.arquivo);

        aplicarVolume();

        audio.addEventListener('loadedmetadata', () => {
            audio.currentTime = musica.inicioSegundos || 0;
        }, { once: true });

        atualizarTitulo();
        renderizarListaMusicas(); // NOVO

        if (tocando) {
            audio.play().catch(() => {
                console.warn('Não foi possível tocar a faixa.');
            });
        }
    }

    function proximaFaixa() {
        if (!playlist.length) return;
        indiceAtual = (indiceAtual + 1) % playlist.length;
        tocarFaixaAtual();
    }

    function faixaAnterior() {
        if (!playlist.length) return;
        indiceAtual = (indiceAtual - 1 + playlist.length) % playlist.length;
        tocarFaixaAtual();
    }

    async function carregarPlaylist() {
        try {
            const resposta = await fetch('http://localhost:3000/api/music');
            if (!resposta.ok) throw new Error('API indisponível.');

            const dados = await resposta.json();
            playlist = dados.filter(m => m.ativo);

        } catch (erro) {
            console.warn('API de música indisponível, tentando music.json:', erro);

            try {
                const respostaBackup = await fetch('assets/data/music.json');
                playlist = await respostaBackup.json();
            } catch {
                playlist = [];
            }
        }

        if (playlist.length) {
            atualizarTitulo();
            renderizarListaMusicas(); // NOVO
        }
    }

    function alternarPlayPause() {
        if (!playlist.length) return;

        if (tocando) {
            audio.pause();
            tocando = false;
        } else {
            tocando = true;

            if (!audio.src) {
                tocarFaixaAtual();
            } else {
                audio.play().catch(() => {
                    console.warn('Áudio bloqueado pelo navegador.');
                });
            }
        }

        atualizarBotaoPlayPause();
        renderizarListaMusicas();
    }

    carregarPlaylist();

    botaoSom.addEventListener('click', (evento) => {
        evento.stopPropagation();
        popup.classList.toggle('oculto');
    });

    document.addEventListener('click', (evento) => {
        if (popup && !popup.contains(evento.target) && evento.target !== botaoSom) {
            popup.classList.add('oculto');
        }
    });

    if (btnPlayPause) btnPlayPause.addEventListener('click', (e) => { e.stopPropagation(); alternarPlayPause(); });
    if (btnProximo) btnProximo.addEventListener('click', (e) => { e.stopPropagation(); proximaFaixa(); });
    if (btnAnterior) btnAnterior.addEventListener('click', (e) => { e.stopPropagation(); faixaAnterior(); });
    if (btnMute) btnMute.addEventListener('click', (e) => { e.stopPropagation(); alternarMute(); });
    if (btnVolMenos) btnVolMenos.addEventListener('click', (e) => { e.stopPropagation(); ajustarVolume(-0.1); });
    if (btnVolMais) btnVolMais.addEventListener('click', (e) => { e.stopPropagation(); ajustarVolume(0.1); });
        if (btnListaToggle) {
        btnListaToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            listaContainer.classList.toggle('oculto');
        });
    }

    const eventosDeInteracao = ['click', 'scroll', 'wheel', 'touchstart', 'keydown'];

    function primeiraInteracao() {
        if (!tocando && playlist.length) alternarPlayPause();
        eventosDeInteracao.forEach(ev => window.removeEventListener(ev, primeiraInteracao));
    }

    eventosDeInteracao.forEach(ev => {
        window.addEventListener(ev, primeiraInteracao, { once: true, passive: true });
    });

    botaoSom.classList.add('sound-toggle-glow');
    setTimeout(() => {
        botaoSom.classList.remove('sound-toggle-glow');
    }, 3000);

        function renderizarListaMusicas() {
        if (!listaContainer) return;

        listaContainer.innerHTML = '';

        playlist.forEach((musica, indice) => {
            const item = document.createElement('div');
            item.className = 'player-lista-item';
            if (indice === indiceAtual) {
                item.classList.add('player-lista-item-ativa');
            }

            item.innerHTML = `
                <span class="player-lista-play">${indice === indiceAtual && tocando ? '⏸' : '▶'}</span>
                <span class="player-lista-nome">${musica.titulo || 'Sem título'}</span>
            `;

            item.addEventListener('click', (e) => {
                e.stopPropagation();

                if (indice === indiceAtual) {
                    alternarPlayPause();
                } else {
                    indiceAtual = indice;
                    tocando = true;
                    tocarFaixaAtual();
                    atualizarBotaoPlayPause();
                }

                renderizarListaMusicas();
            });

            listaContainer.appendChild(item);
        });
    }
}

carregarNavbar();