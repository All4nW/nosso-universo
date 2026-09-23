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


// =====================================================
// COR POR MÚSICA — hash determinístico (mesma música =
// sempre a mesma cor), sem precisar de nenhuma imagem.
// =====================================================

function hashStringParaNumero(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        hash = (hash << 5) - hash + texto.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function hslParaRgb(h, s, l) {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

function corDaMusica(musica) {
    const chave = (musica.titulo || musica.arquivo || 'musica');
    const hash = hashStringParaNumero(chave);

    const matiz = hash % 360;
    // Saturação e luminosidade fixas em uma faixa que combina
    // com a paleta lilás/rosa do site — só o matiz (a "cor" em
    // si) varia de música pra música.
    const saturacao = 55 + (hash % 20);
    const luminosidade = 62 + (hash % 10);

    return hslParaRgb(matiz, saturacao, luminosidade);
}

function aplicarCorDaMusica(musica) {
    const popup = document.getElementById('player-popup');
    if (!popup || !musica) return;

    const { r, g, b } = corDaMusica(musica);

    popup.style.setProperty('--player-cor-r', r);
    popup.style.setProperty('--player-cor-g', g);
    popup.style.setProperty('--player-cor-b', b);
}
// =====================================================
// CORAÇÕES FLUTUANTES DENTRO DO PLAYER
// =====================================================

let intervaloCoracoesPlayer = null;

function garantirContainerCoracoesPlayer() {
    const popupEl = document.getElementById('player-popup');
    if (!popupEl) return null;

    let container = popupEl.querySelector('.player-coracoes-flutuantes');

    if (!container) {
        container = document.createElement('div');
        container.className = 'player-coracoes-flutuantes';
        popupEl.insertBefore(container, popupEl.firstChild);
    }

    return container;
}

function criarCoracaoFlutuantePlayer() {
    const container = garantirContainerCoracoesPlayer();
    if (!container) return;

    const emojis = ['💗', '💜', '♡', '💕'];
    const cores = ['#f5c2d1', '#c9a7f5', '#f0a8c9', '#dcc6fb'];

    const coracao = document.createElement('span');
    coracao.className = 'player-coracao-flutuante';
    coracao.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const esquerda = 10 + Math.random() * 80;
    const tamanho = 0.7 + Math.random() * 0.5;
    const duracao = 3 + Math.random() * 2.5;
    const deriva = (Math.random() - 0.5) * 40;
    const rotacao = (Math.random() - 0.5) * 40;

    coracao.style.left = `${esquerda}%`;
    coracao.style.setProperty('--pc-tamanho', `${tamanho}rem`);
    coracao.style.setProperty('--pc-cor', cores[Math.floor(Math.random() * cores.length)]);
    coracao.style.setProperty('--pc-duracao', `${duracao}s`);
    coracao.style.setProperty('--pc-deriva', `${deriva}px`);
    coracao.style.setProperty('--pc-rotacao', `${rotacao}deg`);

    container.appendChild(coracao);

    setTimeout(() => coracao.remove(), duracao * 1000 + 200);
}

function iniciarCoracoesPlayer() {
    if (intervaloCoracoesPlayer) return;

    criarCoracaoFlutuantePlayer();
    intervaloCoracoesPlayer = setInterval(criarCoracaoFlutuantePlayer, 900);
}

function pararCoracoesPlayer() {
    if (intervaloCoracoesPlayer) {
        clearInterval(intervaloCoracoesPlayer);
        intervaloCoracoesPlayer = null;
    }
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

    // Barra de progresso
    const barraProgresso = document.getElementById('player-barra-progresso');
    const progressoPreenchimento = document.getElementById('player-progresso-preenchimento');
    const progressoBolinha = document.getElementById('player-progresso-bolinha');
    const tempoAtualEl = document.getElementById('player-tempo-atual');
    const tempoTotalEl = document.getElementById('player-tempo-total');

    if (!botaoSom) return;

    let playlist = [];
    let indiceAtual = 0;
    let audio = new Audio();
    let tocando = false;
    let mutado = false;
    let arrastandoProgresso = false;

    let usuarioJaInteragiu = false;

    let volumeAtual =
        parseFloat(localStorage.getItem('nossoUniversoVolume')) || 0.25;

    function aplicarVolume() {
        audio.volume = mutado ? 0 : volumeAtual;

        if (volumeTexto) {
            volumeTexto.textContent = `${Math.round(volumeAtual * 100)}%`;
        }

        const volCheio = document.getElementById('player-volume-coracao-cheio');
        if (volCheio) {
            volCheio.style.width = mutado ? '0%' : `${volumeAtual * 100}%`;
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
            ajustarRolagemTitulo();
        }
    }

    function ajustarRolagemTitulo() {
        if (!tituloEl) return;

        const wrapper = tituloEl.parentElement;
        if (!wrapper) return;

        tituloEl.classList.remove('titulo-rolando');
        tituloEl.style.removeProperty('--scroll-distance');
        tituloEl.style.removeProperty('--scroll-duration');

        requestAnimationFrame(() => {
            const larguraWrapper = wrapper.clientWidth;
            const larguraTexto = tituloEl.scrollWidth;

            if (larguraTexto > larguraWrapper + 2) {
                const distancia = larguraTexto - larguraWrapper + 6;
                const duracao = Math.max(4, distancia / 22);

                tituloEl.style.setProperty('--scroll-distance', `-${distancia}px`);
                tituloEl.style.setProperty('--scroll-duration', `${duracao}s`);
                tituloEl.classList.add('titulo-rolando');
            }
        });
    }

    function atualizarBotaoPlayPause() {
        if (btnPlayPause) {
            btnPlayPause.textContent = tocando ? '⏸' : '▶';
        }
        botaoSom.textContent = tocando ? '🔊' : '🎵';
    }


    // =================================================
    // BARRA DE PROGRESSO — cálculo do intervalo da faixa
    // (respeitando inicioSegundos/fimSegundos definidos
    // no admin) e formatação de tempo
    // =================================================

    function formatarTempo(segundos) {
        if (!isFinite(segundos) || segundos < 0) segundos = 0;
        const min = Math.floor(segundos / 60);
        const seg = Math.floor(segundos % 60);
        return `${min}:${String(seg).padStart(2, '0')}`;
    }

    function obterIntervaloFaixa() {
        const musica = playlist[indiceAtual];
        if (!musica) return { inicio: 0, fim: audio.duration || 0 };

        const inicio = musica.inicioSegundos || 0;
        const fim = musica.fimSegundos > 0 ? musica.fimSegundos : (audio.duration || 0);

        return { inicio, fim };
    }

    function atualizarBarraProgresso() {
        if (arrastandoProgresso) return;
        if (!barraProgresso) return;

        const { inicio, fim } = obterIntervaloFaixa();
        const duracaoEfetiva = Math.max(0.001, fim - inicio);

        const posicaoAtual = Math.min(
            duracaoEfetiva,
            Math.max(0, audio.currentTime - inicio)
        );

        const percentual = (posicaoAtual / duracaoEfetiva) * 100;

        if (progressoPreenchimento) progressoPreenchimento.style.width = `${percentual}%`;
        if (progressoBolinha) progressoBolinha.style.left = `${percentual}%`;

        if (tempoAtualEl) tempoAtualEl.textContent = formatarTempo(posicaoAtual);
        if (tempoTotalEl) tempoTotalEl.textContent = formatarTempo(duracaoEfetiva);
    }

    function buscarPosicaoPelaBarra(clientX) {
        if (!barraProgresso) return;

        const rect = barraProgresso.getBoundingClientRect();
        const fracao = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));

        const { inicio, fim } = obterIntervaloFaixa();
        const duracaoEfetiva = Math.max(0.001, fim - inicio);

        const novoTempo = inicio + fracao * duracaoEfetiva;

        audio.currentTime = novoTempo;

        // Atualiza visualmente na hora, sem esperar o próximo timeupdate
        const percentual = fracao * 100;
        if (progressoPreenchimento) progressoPreenchimento.style.width = `${percentual}%`;
        if (progressoBolinha) progressoBolinha.style.left = `${percentual}%`;
        if (tempoAtualEl) tempoAtualEl.textContent = formatarTempo(novoTempo - inicio);
    }

    if (barraProgresso) {

        const iniciarArrasto = (evento) => {
            evento.stopPropagation();
            arrastandoProgresso = true;
            barraProgresso.classList.add('progresso-arrastando');

            const clientX = evento.touches ? evento.touches[0].clientX : evento.clientX;
            buscarPosicaoPelaBarra(clientX);
        };

        const moverArrasto = (evento) => {
            if (!arrastandoProgresso) return;
            const clientX = evento.touches ? evento.touches[0].clientX : evento.clientX;
            buscarPosicaoPelaBarra(clientX);
        };

        const finalizarArrasto = () => {
            if (!arrastandoProgresso) return;
            arrastandoProgresso = false;
            barraProgresso.classList.remove('progresso-arrastando');
        };

        barraProgresso.addEventListener('mousedown', iniciarArrasto);
        barraProgresso.addEventListener('touchstart', iniciarArrasto, { passive: true });

        window.addEventListener('mousemove', moverArrasto);
        window.addEventListener('touchmove', moverArrasto, { passive: true });

        window.addEventListener('mouseup', finalizarArrasto);
        window.addEventListener('touchend', finalizarArrasto);

    }

    audio.addEventListener('timeupdate', () => {
        const musica = playlist[indiceAtual];
        if (musica && musica.fimSegundos > 0 && audio.currentTime >= musica.fimSegundos) {
            proximaFaixa();
            return;
        }
        atualizarBarraProgresso();
    });

    audio.addEventListener('loadedmetadata', () => {
        atualizarBarraProgresso();
    });

    audio.addEventListener('ended', () => {
        proximaFaixa();
    });

    function tocarFaixaAtual() {
        if (!playlist.length) return;

        const musica = playlist[indiceAtual];

        audio.src = resolverCaminhoAudio(musica.arquivo);

        aplicarVolume();
        aplicarCorDaMusica(musica);

        audio.addEventListener('loadedmetadata', () => {
            audio.currentTime = musica.inicioSegundos || 0;
            atualizarBarraProgresso();
        }, { once: true });

        atualizarTitulo();
        renderizarListaMusicas();

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

        // Começa em uma música aleatória, pra não ficar sempre
        // repetindo a primeira da lista a cada visita.
        if (playlist.length) {
            indiceAtual = Math.floor(Math.random() * playlist.length);
            atualizarTitulo();
            aplicarCorDaMusica(playlist[indiceAtual]);
            renderizarListaMusicas();
        }

        if (usuarioJaInteragiu && !tocando && playlist.length) {
            alternarPlayPause();
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

    if (btnPlayPause) btnPlayPause.addEventListener('click', (e) => { e.stopPropagation(); alternarPlayPause(); dispararCoracaoNoBotao(btnPlayPause); });
    if (btnProximo) btnProximo.addEventListener('click', (e) => { e.stopPropagation(); proximaFaixa(); dispararCoracaoNoBotao(btnProximo); });
    if (btnAnterior) btnAnterior.addEventListener('click', (e) => { e.stopPropagation(); faixaAnterior(); dispararCoracaoNoBotao(btnAnterior); });
    if (btnMute) btnMute.addEventListener('click', (e) => { e.stopPropagation(); alternarMute(); dispararCoracaoNoBotao(btnMute); });
    if (btnVolMenos) btnVolMenos.addEventListener('click', (e) => { e.stopPropagation(); ajustarVolume(-0.1); });
    if (btnVolMais) btnVolMais.addEventListener('click', (e) => { e.stopPropagation(); ajustarVolume(0.1); });
    if (btnListaToggle) {
        btnListaToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            listaContainer.classList.toggle('oculto');
            btnListaToggle.classList.toggle('player-lista-aberta');
        });
    }

    function dispararCoracaoNoBotao(botao) {
        if (typeof criarExplosaoCoracoes !== 'function' || !botao) return;

        const rect = botao.getBoundingClientRect();
        criarExplosaoCoracoes(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    const eventosDeInteracao = ['click', 'scroll', 'wheel', 'touchstart', 'keydown'];

    function primeiraInteracao() {

        usuarioJaInteragiu = true;

        audio.play().catch(() => {});

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