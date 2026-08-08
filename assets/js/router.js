// router.js
// Controla qual <section> fica visível, baseado no hash da URL (#timeline, #galeria...).
// Isso é o "coração" da navegação sem reload de página.

function mostrarView(nomeDaView) {
    const todasAsViews = document.querySelectorAll('.view');

    todasAsViews.forEach(view => {
        view.classList.remove('view-ativa');
    });

    const viewAlvo = document.querySelector(`[data-view="${nomeDaView}"]`);

    if (viewAlvo) {
        viewAlvo.classList.add('view-ativa');
        viewAlvo.scrollTop = 0; // sempre começa do topo ao entrar na seção
    } else {
        console.warn(`View "${nomeDaView}" não encontrada.`);
    }
}

function rotearPelaURL() {
    // Pega o que vem depois do "#" na URL. Se não tiver nada, usa "welcome" como padrão.
    const hashAtual = window.location.hash.replace('#', '') || 'welcome';
    mostrarView(hashAtual);
}

// Roda uma vez assim que a página carrega
rotearPelaURL();

// Roda toda vez que o hash da URL mudar (usuário clicou em um link, ou usou voltar/avançar)
window.addEventListener('hashchange', rotearPelaURL);