// =====================================================
// NOSSO UNIVERSO — COISAS QUE JÁ ASSISTIMOS
// =====================================================

const CATEGORIAS_ORDEM = [
    {
        chave: "filmes",
        titulo: "🎬 Filmes"
    },
    {
        chave: "series",
        titulo: "📺 Séries"
    },
    {
        chave: "animes",
        titulo: "🍿 Animes"
    }
];

const CATEGORIA_QUEREMOS = "queremos";


// =====================================================
// LER NOTAS DO ITEM
// =====================================================
// O painel admin grava "notaEu" / "notaEla". Alguns itens
// mais antigos foram criados com "minhaNota" / "notaDela".
// Aqui a gente aceita os dois formatos, pra nunca perder
// uma avaliação já cadastrada.

function lerNotasDoItem(item) {

    const notaEu =
        Number(
            item.notaEu ??
            item.minhaNota
        ) || 0;

    const notaEla =
        Number(
            item.notaEla ??
            item.notaDela
        ) || 0;

    return { notaEu, notaEla };

}


// =====================================================
// ESCAPAR HTML
// =====================================================
// Usado antes de inserir texto livre (memórias) dentro do
// HTML da descrição do modal, pra nunca quebrar o layout
// caso o texto contenha < > & etc.

function escaparHTML(texto) {

    const div =
        document.createElement("div");

    div.textContent =
        texto || "";

    return div.innerHTML;

}


// =====================================================
// FORMATAR NOTA
// =====================================================

function formatarNota(nota) {

    return Number.isInteger(nota)
        ? nota
        : nota.toFixed(1);

}


// =====================================================
// CARREGAR
// =====================================================

async function carregarAssistidos() {

    const container =
        document.getElementById("assistidos-categorias");

    if (!container) return;

    let itens = [];

    try {

        const resposta = await fetch(
            "assets/data/assistidos.json",
            { cache: "no-cache" }
        );

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível carregar assistidos.json."
            );
        }

        itens = await resposta.json();

    } catch (erro) {

        console.error(
            "Erro ao carregar itens assistidos:",
            erro
        );

        itens = [];

    }

    container.innerHTML = "";


    // =================================================
    // CATEGORIAS PRINCIPAIS
    // =================================================

    CATEGORIAS_ORDEM.forEach((categoria) => {

        const itensDaCategoria =
            itens.filter(
                item => item.categoria === categoria.chave
            );

        if (!itensDaCategoria.length) return;

        container.appendChild(
            criarEstante(
                categoria.titulo,
                itensDaCategoria
            )
        );

    });


    // =================================================
    // AINDA QUEREMOS ASSISTIR
    // =================================================

    const queremos =
        itens.filter(
            item => item.categoria === CATEGORIA_QUEREMOS
        );

    if (queremos.length) {

        container.appendChild(
            criarSecaoQueremos(queremos)
        );

    }


    if (!container.children.length) {

        container.innerHTML = `
            <p class="galeria-vazio">
                Ainda não há nada por aqui.
            </p>
        `;

    }

    ativarBotaoTopoAssistidos();

}


// =====================================================
// ESTANTE NORMAL
// =====================================================

function criarEstante(tituloCategoria, itens) {

    const secao =
        document.createElement("section");

    secao.className =
        "assistidos-estante";


    const titulo =
        document.createElement("h2");

    titulo.className =
        "assistidos-estante-titulo";

    titulo.textContent =
        tituloCategoria;

    secao.appendChild(titulo);


    const grid =
        document.createElement("div");

    grid.className =
        "assistidos-grid";


    itens.forEach((item, indice) => {

        grid.appendChild(
            criarCardAssistido(item, indice)
        );

    });


    secao.appendChild(grid);

    return secao;

}


// =====================================================
// SEÇÃO "AINDA QUEREMOS ASSISTIR"
// =====================================================

function criarSecaoQueremos(itens) {

    const secao = document.createElement("section");
    secao.className = "assistidos-queremos";

    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "assistidos-queremos-cabecalho";
    botao.setAttribute("aria-expanded", "false");

    botao.innerHTML = `
        <span class="assistidos-queremos-icone">
            ✦
        </span>

        <span class="assistidos-queremos-texto">
            <strong>Ainda queremos assistir</strong>
            <small>
                Clique para descobrir o que está na nossa lista
            </small>
        </span>

        <span class="assistidos-queremos-seta">
            ↓
        </span>
    `;

    const conteudo = document.createElement("div");
    conteudo.className = "assistidos-queremos-conteudo";

    const grid = document.createElement("div");
    grid.className =
        "assistidos-grid assistidos-grid-queremos";

    itens.forEach((item, indice) => {

        grid.appendChild(
            criarCardAssistido(
                item,
                indice,
                true
            )
        );

    });

    conteudo.appendChild(grid);

    secao.appendChild(botao);
    secao.appendChild(conteudo);


    // =================================================
    // ABRIR / FECHAR
    // =================================================

    botao.addEventListener("click", () => {

        const aberto =
            secao.classList.contains("queremos-aberto");

        if (aberto) {

            // FECHAR
            secao.classList.remove(
                "queremos-aberto"
            );

            botao.setAttribute(
                "aria-expanded",
                "false"
            );

        } else {

            // ABRIR
            secao.classList.add(
                "queremos-aberto"
            );

            botao.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    });


    return secao;
}


// =====================================================
// CARD
// =====================================================

function criarCardAssistido(
    item,
    indice,
    ehListaFutura = false
) {

    const card =
        document.createElement("article");

    card.className =
        "assistido-card";

    card.style.setProperty(
        "--delay",
        `${indice * 0.06}s`
    );


    const temAvaliacao =
        !ehListaFutura &&
        item.categoria !== "queremos";


    const { notaEu, notaEla } =
        lerNotasDoItem(item);


    // Média calculada só para o modal (ao clicar).
    // O card em si mostra as duas notas separadas.
    let notaMedia = 0;

    if (notaEu && notaEla) {

        notaMedia =
            (notaEu + notaEla) / 2;

    } else if (notaEu) {

        notaMedia = notaEu;

    } else if (notaEla) {

        notaMedia = notaEla;

    }


    const notaMediaFormatada =
        Number.isInteger(notaMedia)
            ? notaMedia
            : notaMedia.toFixed(1);


    const temNotaEu = notaEu > 0;
    const temNotaEla = notaEla > 0;
    const temAlgumaNota =
        temAvaliacao && (temNotaEu || temNotaEla);


    card.innerHTML = `

        <div class="assistido-capa">

            <img
                src="${item.capa || ""}"
                alt="${item.titulo}"
                onerror="this.style.display='none'"
            >

            ${
                ehListaFutura
                    ? `
                        <div class="assistido-futuro-indicador">
                            <span>✦</span>
                            <small>Quero ver</small>
                        </div>
                    `
                    : ""
            }

        </div>


        <span class="assistido-titulo">
            ${item.titulo}
        </span>


        <div class="assistido-info">

            ${
                item.ano
                    ? `
                        <span class="assistido-ano">
                            ${item.ano}
                        </span>
                    `
                    : ""
            }

            ${
                temAlgumaNota
                    ? `
                        <span class="assistido-notas-info">

                            ${
                                temNotaEu
                                    ? `
                                        <span class="nota-chip nota-chip-eu nota-chip-mini">
                                            ★ ${formatarNota(notaEu)}
                                        </span>
                                    `
                                    : ""
                            }

                            ${
                                temNotaEla
                                    ? `
                                        <span class="nota-chip nota-chip-ela nota-chip-mini">
                                            ★ ${formatarNota(notaEla)}
                                        </span>
                                    `
                                    : ""
                            }

                        </span>
                    `
                    : ""
            }

        </div>

    `;


    card.addEventListener(
        "click",
        () => abrirDetalhesAssistido(
            item,
            {
                notaEu,
                notaEla,
                notaMedia: notaMediaFormatada,
                ehListaFutura
            }
        )
    );


    return card;

}


// =====================================================
// DETALHES
// =====================================================

function abrirDetalhesAssistido(
    item,
    dados
) {

    const {
        notaEu,
        notaEla,
        notaMedia,
        ehListaFutura
    } = dados;


    // Reaproveita o modal existente
    if (typeof abrirModal === "function") {

        let descricao = "";


        if (ehListaFutura) {

            descricao =
                "Está na nossa lista de coisas que ainda queremos assistir. ❤️";

        } else {

            descricao =
                `<div class="assistido-modal-nota-linha"><span class="nota-chip nota-chip-eu">★</span><span><strong>Minha nota:</strong> ${notaEu ? formatarNota(notaEu) + "/10" : "Ainda não avaliado"}</span></div>` +
                `<div class="assistido-modal-nota-linha"><span class="nota-chip nota-chip-ela">★</span><span><strong>Nota dela:</strong> ${notaEla ? formatarNota(notaEla) + "/10" : "Ainda não avaliado"}</span></div>` +
                (
                    item.memoria
                        ? `<p class="assistido-modal-memoria">${escaparHTML(item.memoria)}</p>`
                        : ""
                );

        }


        abrirModal({

            titulo:
                item.titulo,

            dataExibicao:
                item.ano
                    ? `${item.ano}`
                    : "",

            descricao,

            fotos:
                item.capa
                    ? [item.capa]
                    : []

        });

        return;

    }


    // =================================================
    // FALLBACK
    // =================================================

    console.warn(
        "abrirModal() não foi encontrado."
    );

}


// =====================================================
// BOTÃO VOLTAR AO TOPO
// =====================================================

function ativarBotaoTopoAssistidos() {

    const view =
        document.querySelector(
            '.view[data-view="assistidos"]'
        );

    if (!view) return;


    const botao =
        document.getElementById(
            "assistidos-topo-btn"
        );


    if (!botao) return;


    botao.onclick = () => {

        view.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    };

}


// =====================================================
// INICIAR
// =====================================================

carregarAssistidos();