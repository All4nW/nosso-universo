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

        // FIX: força o navegador a recalcular o layout imediatamente
        void viewAlvo.offsetHeight;

        viewAlvo.scrollTop = 0; // sempre começa do topo ao entrar na seção

        // =========================================================
        // FUNDO ESPECIAL DA TIMELINE
        // =========================================================
        // Liga/desliga a classe no body, que o CSS usa pra mostrar
        // a imagem de fundo (#timeline-fundo). Feito aqui, direto
        // no momento da troca de view, em vez de depender de um
        // seletor CSS reagindo sozinho (:has, etc).
        document.body.classList.toggle(
            'fundo-timeline',
            nomeDaView === 'timeline'
        );

        // Reforço: força o navegador a repintar o #timeline-fundo
        // agora mesmo, lendo uma propriedade de layout dele. Isso
        // evita qualquer chance do elemento "esperar" um evento de
        // mouse/scroll pra atualizar visualmente.
        const fundoTimeline =
            document.getElementById('timeline-fundo');

        if (fundoTimeline) {
            void fundoTimeline.offsetHeight;
        }

        // =========================================================
        // EFEITO ESPECIAL: Timeline — replay da animação de entrada
        // =========================================================
        if (nomeDaView === 'timeline') {

            if (typeof window.reproduzirEntradaTimeline === 'function') {
                window.reproduzirEntradaTimeline();
            }

        }

        // =========================================================
        // EFEITO ESPECIAL: mergulho no universo, só ao entrar em #estrelas
        // =========================================================
        if (nomeDaView === 'estrelas') {

            viewAlvo.classList.remove('estrelas-entrando');
            void viewAlvo.offsetWidth;
            viewAlvo.classList.add('estrelas-entrando');

            // Reproduz a entrada escalonada de cada estrela, se já existirem
            if (typeof window.reproduzirEntradaEstrelas === 'function') {
                window.reproduzirEntradaEstrelas();
            }

        }

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