// router.js
// Controla qual <section> fica visível, baseado no hash da URL (#timeline, #galeria...).
// Isso é o "coração" da navegação sem reload de página.

function mostrarView(nomeDaView) {
    // Pega TODAS as seções marcadas como "view"
    const todasAsViews = document.querySelectorAll('.view');

    // Esconde todas...
    todasAsViews.forEach(view => {
        view.classList.remove('view-ativa');
    });

    // ...e mostra só a que foi pedida
    const viewAlvo = document.querySelector(`[data-view="${nomeDaView}"]`);

    if (viewAlvo) {
        viewAlvo.classList.add('view-ativa');
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