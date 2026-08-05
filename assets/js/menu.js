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
    } catch (erro) {
        console.error('Erro ao carregar o navbar:', erro);
    }
}

function ativarComportamentoDoSom() {
    const botaoSom = document.getElementById('sound-toggle');
    const audio = document.getElementById('trilha-fundo');
    if (!botaoSom || !audio) return;

    audio.volume = 0.3;
    let tocando = false;

    audio.addEventListener('loadedmetadata', () => {
        audio.currentTime = 12;
    }, { once: true });

    function iniciarAudio() {
        audio.play().then(() => {
            tocando = true;
            botaoSom.textContent = '🔊';
        }).catch(() => {
            console.warn('Autoplay bloqueado pelo navegador — aguardando primeira interação.');
        });
    }

    // Tenta tocar assim que a página carrega (pode ser bloqueado pelo navegador)
    iniciarAudio();

    // Se for bloqueado, a primeira vez que a pessoa clicar em QUALQUER lugar
    // da página, o áudio começa a tocar automaticamente
    document.addEventListener('click', function primeiraInteracao() {
        if (!tocando) iniciarAudio();
        document.removeEventListener('click', primeiraInteracao);
    }, { once: true });

    // O próprio botão continua funcionando para ligar/desligar manualmente
    botaoSom.addEventListener('click', (evento) => {
        evento.stopPropagation(); // evita conflito com o listener de "primeira interação"

        if (tocando) {
            audio.pause();
            botaoSom.textContent = '🔇';
            tocando = false;
        } else {
            iniciarAudio();
        }
    });

    // Brilho temporário no botão, chamando atenção por 3 segundos
    botaoSom.classList.add('sound-toggle-glow');
    setTimeout(() => {
        botaoSom.classList.remove('sound-toggle-glow');
    }, 3000);
}

carregarNavbar();

