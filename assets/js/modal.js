// modal.js
// Componente reutilizável: qualquer seção pode chamar abrirModal(item)
// passando um objeto { titulo, data, descricao, fotos } ou { ..., foto }.
// ========================================
// MAPAS DE TIPO E CATEGORIA (usados quando o item vem da Timeline)
// ========================================

const TIPOS_MODAL = {
    "Marco":    { icone: "🏆", label: "Marco",    classe: "marco" },
    "Momento":  { icone: "🌙", label: "Momento",  classe: "momento" },
    "Jogo":     { icone: "🎮", label: "Jogo",      classe: "jogo" },
    "Encontro": { icone: "📍", label: "Encontro", classe: "encontro" },
    "Sonho":    { icone: "💗", label: "Sonho",     classe: "sonho" }
};

const CATEGORIAS_CONHECIDAS_MODAL = {
    "roblox": "🎮", "jogo": "🎮", "jogos": "🎮",
    "relacionamento": "💞",
    "viagem": "✈️", "viagens": "✈️",
    "família": "👨‍👩‍👧‍👦", "familia": "👨‍👩‍👧‍👦",
    "amizade": "🤍",
    "trabalho": "💼",
    "presente": "🎁", "surpresa": "🎁",
    "comida": "🍽️",
    "filme": "🎬", "filmes": "🎬",
    "música": "🎵", "musica": "🎵"
};

function gerarMatizCategoriaModal(texto) {

    let hash = 0;

    for (let i = 0; i < texto.length; i++) {
        hash = texto.charCodeAt(i) + ((hash << 5) - hash);
    }

    return Math.abs(hash) % 360;

}

function obterIconeCategoriaModal(categoria) {

    const chave = categoria.trim().toLowerCase();

    return CATEGORIAS_CONHECIDAS_MODAL[chave] || "🏷️";

}

function escaparHtmlModal(texto) {

    return String(texto || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

async function carregarModal() {
    const placeholder = document.getElementById('modal-placeholder');
    if (!placeholder) return;

    try {
        const resposta = await fetch('components/modal.html');
        const html = await resposta.text();
        placeholder.innerHTML = html;

        ativarFechamentoModal();
    } catch (erro) {
        console.error('Erro ao carregar o modal:', erro);
    }
}

function ativarFechamentoModal() {
    const overlay = document.getElementById('modal-overlay');
    const botaoFechar = document.getElementById('modal-fechar');
    if (!overlay || !botaoFechar) return;

    botaoFechar.addEventListener('click', fecharModal);

    overlay.addEventListener('click', (evento) => {
        if (evento.target === overlay) fecharModal();
    });

    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') fecharModal();
    });
}

function formatarData(dataString) {
    const data = new Date(dataString + 'T00:00:00');
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Resolve o caminho da imagem tanto pra fotos enviadas pelo Admin
// (/uploads/... precisa do host do backend) quanto pra fotos estáticas.
function resolverImagemModal(caminho) {
    if (!caminho) return '';

    if (caminho.startsWith('http://') || caminho.startsWith('https://')) {
        return caminho;
    }

    if (caminho.startsWith('/uploads/')) {
        return `http://localhost:3000${caminho}`;
    }

    return caminho;
}

function abrirModal(item) {

    const overlay = document.getElementById('modal-overlay');
    const conteudo = document.getElementById('modal-content');

    if (!overlay) return;

    document.getElementById('modal-titulo').textContent = item.titulo;
    document.getElementById('modal-data').textContent = item.dataExibicao || formatarData(item.data);
    document.getElementById('modal-descricao').innerHTML = item.descricao;

    // ====================================
    // BADGES — Tipo / Categoria / Sugestão
    // (só existem em itens vindos da Timeline; em outras seções
    // o item simplesmente não tem esses campos e nada é mostrado)
    // ====================================

    const badgesContainer = document.getElementById('modal-badges');

    if (badgesContainer) {

        let badgesHtml = '';

        if (item.tipo && TIPOS_MODAL[item.tipo]) {

            const infoTipo = TIPOS_MODAL[item.tipo];

            badgesHtml += `
                <span class="modal-badge-tipo modal-badge-tipo-${infoTipo.classe}">
                    ${infoTipo.icone} ${escaparHtmlModal(infoTipo.label)}
                </span>
            `;

        }

        if (item.categoria && item.categoria.trim()) {

            const matiz = gerarMatizCategoriaModal(item.categoria.trim().toLowerCase());
            const icone = obterIconeCategoriaModal(item.categoria);

            const estilo =
                `--cor-categoria: hsl(${matiz}, 65%, 75%); ` +
                `--cor-categoria-fraca: hsla(${matiz}, 65%, 60%, 0.15); ` +
                `--cor-categoria-borda: hsla(${matiz}, 65%, 60%, 0.35);`;

            badgesHtml += `
                <span class="modal-badge-categoria" style="${estilo}">
                    ${icone} ${escaparHtmlModal(item.categoria)}
                </span>
            `;

        }

        if (item.sugeridoPor === 'ela' || item.sugeridoPor === 'mim') {

            const ehEla = item.sugeridoPor === 'ela';
            const textoPadrao = ehEla ? 'Sugestão dela' : 'Sugestão minha';
            const texto = (item.sugeridoTexto && item.sugeridoTexto.trim()) ? item.sugeridoTexto : textoPadrao;

            badgesHtml += `
                <span class="modal-badge-sugestao modal-badge-sugestao-${ehEla ? 'ela' : 'mim'}">
                    ${ehEla ? '💗' : '💙'} ${escaparHtmlModal(texto)}
                </span>
            `;

        }

        badgesContainer.innerHTML = badgesHtml;
        badgesContainer.style.display = badgesHtml ? 'flex' : 'none';

    }

    // ====================================
    // LAYOUT POR TIPO
    // ====================================

    if (conteudo) {

        // limpa a classe de tipo da abertura anterior antes de aplicar a nova
        conteudo.className = 'modal-content';

        if (item.tipo && TIPOS_MODAL[item.tipo]) {

            conteudo.classList.add(
                `modal-content-tipo-${TIPOS_MODAL[item.tipo].classe}`
            );

        }

    }

    const fotosContainer = document.getElementById('modal-fotos');
    fotosContainer.innerHTML = '';

    const fotos =
        item.fotos && item.fotos.length
            ? item.fotos
            : (item.foto ? [item.foto] : []);

    fotos.forEach((src) => {
        const img = document.createElement('img');
        img.src = resolverImagemModal(src);
        img.alt = item.titulo;
        img.onerror = () => img.remove();
        fotosContainer.appendChild(img);
    });

    overlay.classList.remove('oculto');
    document.body.classList.add('modal-aberto');

}

function fecharModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.classList.add('oculto');
    document.body.classList.remove('modal-aberto');
}

carregarModal();