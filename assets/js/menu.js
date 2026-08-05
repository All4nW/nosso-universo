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

    // Define o volume em 30% (a escala vai de 0 a 1)
    audio.volume = 0.3;

    // Assim que os metadados do áudio carregarem (duração, etc.),
    // já posiciona o play em 00:12 — antes mesmo do primeiro clique.
    audio.addEventListener('loadedmetadata', () => {
        audio.currentTime = 12;
    }, { once: true }); // "once" garante que isso só rode uma vez

    let tocando = false;

    botaoSom.addEventListener('click', () => {
        if (tocando) {
            audio.pause();
            botaoSom.textContent = '🔇';
        } else {
            audio.play().catch(() => {
                console.warn('Áudio indisponível (arquivo ausente ou bloqueado pelo navegador).');
            });
            botaoSom.textContent = '🔊';
        }
        tocando = !tocando;
    });
}

carregarNavbar();

