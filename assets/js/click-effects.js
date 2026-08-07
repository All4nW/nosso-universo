// click-effects.js
// Cria um pequeno efeito de "explosão" (corações + brilho) na posição
// de um clique. Usado nos ícones de som e de voltar ao hub.

function criarExplosaoCoracoes(x, y) {
    const quantidade = 6;

    for (let i = 0; i < quantidade; i++) {
        const coracao = document.createElement('span');
        coracao.className = 'click-heart';
        coracao.textContent = '♥';
        coracao.style.left = `${x}px`;
        coracao.style.top = `${y}px`;

        // Cada coração voa numa direção levemente diferente
        coracao.style.setProperty('--tx', `${(Math.random() - 0.5) * 90}px`);
        coracao.style.setProperty('--ty', `${-(Math.random() * 60 + 40)}px`);
        coracao.style.setProperty('--delay', `${Math.random() * 0.15}s`);

        document.body.appendChild(coracao);
        coracao.addEventListener('animationend', () => coracao.remove());
    }

    const brilho = document.createElement('span');
    brilho.className = 'click-glow';
    brilho.style.left = `${x}px`;
    brilho.style.top = `${y}px`;

    document.body.appendChild(brilho);
    brilho.addEventListener('animationend', () => brilho.remove());
}

// Liga o efeito de clique a um elemento específico (botão de som, voltar, etc).
function ativarEfeitoClique(elemento) {
    if (!elemento) return;

    elemento.addEventListener('click', () => {
        const rect = elemento.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        criarExplosaoCoracoes(x, y);
    });
}