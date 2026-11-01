// hub-loader.js
// Monta o universo 3D no hub. (O hub clássico em 2D foi removido.)
// Se o aparelho não conseguir abrir o 3D (WebGL), mostra uma lista simples de links.

(function () {
    'use strict';

    const container = document.getElementById('hub-container');
    if (!container) return;

    // a data em que vocês começaram (a mesma que o contador sempre usou)
    const DATA_INICIO = '2025-08-05T00:00:00';

    async function mostrarLinksSimples() {
        let cards = [];
        try {
            const r = await fetch('assets/data/hub.json', { cache: 'no-cache' });
            if (!r.ok) throw new Error('hub.json');
            cards = await r.json();
        } catch (e) {
            cards = [
                { titulo: 'Mural', link: 'timeline' },
                { titulo: 'Galeria', link: 'galeria' },
                { titulo: 'Assistidos', link: 'assistidos' },
                { titulo: 'Cartas', link: 'cartas' }
            ];
        }
        container.innerHTML =
            '<nav class="hub-simples" aria-label="Seções">' +
            cards.map((c) => '<a href="#' + c.link + '">' + c.titulo + '</a>').join('') +
            '</nav>';
    }

    if (!window.Hub3D) {
        mostrarLinksSimples();
        return;
    }

    window.Hub3D.montar(container, {
        dataInicio: DATA_INICIO,
        aoEvento: function (nome, dados) {
            if (window.HubSons) window.HubSons.evento(nome, dados);
        },
        aoFalhar: function (erro) {
            console.warn('Hub3D indisponível, mostrando links simples:', erro);
            mostrarLinksSimples();
        }
    });
})();