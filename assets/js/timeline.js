// ========================================
// TIMELINE — SITE PRINCIPAL
// ========================================
// Tenta buscar os dados ao vivo da API (SQLite via backend).
// Se a API não responder (backend desligado, ou site publicado
// no GitHub Pages), usa assets/data/timeline.json como plano B.
// ========================================

// ========================================
// MAPA DE TIPO
// ========================================
// Cada tipo tem uma classe (usada pra colorir borda/marcador do
// card e pro selo circular sobreposto na foto) e um ícone.

const TIPOS_TIMELINE = {
    "Especial": { icone: "⭐", classe: "marco" },
    "Marco":    { icone: "⭐", classe: "marco" }, // compatibilidade com itens salvos antes da renomeação
    "Momento":  { icone: "🎀", classe: "momento" },
    "Jogo":     { icone: "🎮", classe: "jogo" },
    "Encontro": { icone: "💞", classe: "encontro" },
    "Sonho":    { icone: "🪄", classe: "sonho" }
};


async function carregarTimeline() {

    const container =
        document.getElementById("timeline-container");


    if (!container) {
        return;
    }


    let itens;


    try {

        const resposta =
            await fetch(
                "http://localhost:3000/api/timeline"
            );

        if (!resposta.ok) {
            throw new Error("API indisponível.");
        }

        itens = await resposta.json();

    }

    catch (erroApi) {

        console.warn(
            "API indisponível, usando timeline.json como backup:",
            erroApi
        );

        try {

            const respostaBackup =
                await fetch("assets/data/timeline.json");

            itens = await respostaBackup.json();

        }

        catch (erroBackup) {

            console.error(
                "Erro ao carregar Timeline (API e backup falharam):",
                erroBackup
            );

            container.innerHTML = `
                <div class="timeline-vazio">
                    Não foi possível carregar nossa Timeline. ❤️
                </div>
            `;

            return;

        }

    }


    container.innerHTML = "";


    if (!Array.isArray(itens) || itens.length === 0) {

        container.innerHTML = `
            <div class="timeline-vazio">
                Ainda não existem momentos na nossa história. ❤️
            </div>
        `;

        return;
    }


    itens.forEach(
        (item, indice) => {

            const elemento =
                criarItemTimeline(
                    item,
                    indice
                );


            container.appendChild(
                elemento
            );

        }
    );

}


// ========================================
// CRIAR ITEM
// ========================================

function criarItemTimeline(
    item,
    indice
) {

    const lado =
        indice % 2 === 0
            ? "esquerda"
            : "direita";


    const elemento =
        document.createElement("div");


    elemento.className =
        `timeline-item timeline-item-${lado}`;


    // Aceita tanto o formato novo da API (item.foto, singular)
    // quanto o formato antigo do JSON estático (item.fotos, array)
    const primeiraFoto =
        item.foto ||
        (item.fotos && item.fotos[0]) ||
        null;


    const textoData =
        formatarDataTimeline(item);


    const ehFuturo =
        verificarSeEhFuturo(
            item.data,
            item.hora
        );


    if (ehFuturo) {

        elemento.classList.add(
            "timeline-item-futuro"
        );

    }


    // ====================================
    // SELO DE SUGESTÃO
    // ====================================
    // A cor e o emoji continuam fixos por quem sugeriu
    // (ela = rosa/💗, mim = azul/💙), mas o TEXTO dentro
    // do selo agora é livre (item.sugeridoTexto). Se não
    // tiver texto customizado, cai no texto padrão.

    let seloSugestao = "";


    if (
        item.sugeridoPor === "ela"
    ) {

        const textoSelo =
            (item.sugeridoTexto && item.sugeridoTexto.trim())
                ? item.sugeridoTexto
                : "Sugestão dela";

        seloSugestao = `
            <span class="timeline-badge-sugestao timeline-badge-sugestao-ela">
                💗 ${escaparHtmlTimeline(textoSelo)}
            </span>
        `;

    }

    else if (
        item.sugeridoPor === "mim"
    ) {

        const textoSelo =
            (item.sugeridoTexto && item.sugeridoTexto.trim())
                ? item.sugeridoTexto
                : "Sugestão minha";

        seloSugestao = `
            <span class="timeline-badge-sugestao timeline-badge-sugestao-mim">
                💙 ${escaparHtmlTimeline(textoSelo)}
            </span>
        `;

    }


    // ====================================
    // TIPO — selo circular com ícone
    // ====================================
    // Categoria não gera mais selo/cor — é só uma anotação livre
    // sua no Admin, sem representação visual no site.

    let iconeCirculo = "";
    let classeCorCirculo = "";
    let estiloCirculo = "";

    if (item.tipo && TIPOS_TIMELINE[item.tipo]) {

        const infoTipo =
            TIPOS_TIMELINE[item.tipo];

        iconeCirculo = infoTipo.icone;
        classeCorCirculo = `timeline-selo-tipo-${infoTipo.classe}`;

        elemento.classList.add(
            `timeline-item-tipo-${infoTipo.classe}`
        );

    }


    const seloCirculoHtml =
        iconeCirculo
            ? `
                <span
                    class="timeline-selo-circulo ${classeCorCirculo}"
                    style="${estiloCirculo}"
                    title="${escaparHtmlTimeline(item.tipo || item.categoria || '')}"
                >
                    ${iconeCirculo}
                </span>
            `
            : "";


    // ====================================
    // FOTO
    // ====================================
    // Quando existe foto, ela já se basta — sem selo sobreposto.
    // O selo circular só aparece quando NÃO há foto, como um
    // "avatar" inline, logo antes da data.

    const fotoHtml =
        primeiraFoto
            ? `
                <div class="timeline-card-thumb">

                    <img
                        src="${resolverImagemTimeline(primeiraFoto)}"
                        alt="${escaparHtmlTimeline(item.titulo)}"
                        onerror="this.parentElement.remove()"
                    >

                </div>
            `
            : "";


    const avatarHtml =
        (!primeiraFoto && seloCirculoHtml)
            ? `<span class="timeline-selo-circulo-avatar">${seloCirculoHtml}</span>`
            : "";


    // ====================================
    // CARD
    // ====================================

    elemento.innerHTML = `

        <div class="timeline-marker"></div>

        <div class="timeline-card">

            ${avatarHtml}

            ${
                ehFuturo
                    ? `
                        <span class="timeline-badge-futuro">
                            💗 Um sonho a caminho
                        </span>
                    `
                    : ""
            }

            ${seloSugestao}

            ${fotoHtml}


            ${
                textoData
                    ? `
                        <span class="timeline-card-data">
                            ${textoData}
                        </span>
                    `
                    : ""
            }


            <h3 class="timeline-card-titulo">
                ${escaparHtmlTimeline(item.titulo)}
            </h3>


            <p class="timeline-card-resumo">
                ${escaparHtmlTimeline(
                    item.resumo || ""
                )}
            </p>

        </div>

    `;


    elemento.addEventListener(
        "click",
        () => {

            if (
                typeof abrirModal === "function"
            ) {

                abrirModal(item);

            }

        }
    );


    return elemento;

}


// ========================================
// VERIFICAR FUTURO
// ========================================

function verificarSeEhFuturo(
    data,
    hora
) {

    if (!data) {
        return false;
    }


    const horario =
        hora || "00:00";


    const dataEvento =
        new Date(
            `${data}T${horario}`
        );


    return dataEvento > new Date();

}


// ========================================
// FORMATAR DATA
// ========================================

function formatarDataTimeline(
    item
) {

    // Se existir um texto customizado (ex: "Dezembro de 2026"),
    // usa ele em vez de calcular a data exata.
    if (item.dataExibicao) {
        return item.dataExibicao;
    }


    if (!item.data) {
        return "";
    }


    const partes =
        item.data.split("-");


    if (partes.length !== 3) {
        return item.data;
    }


    const dataObj =
        new Date(
            Number(partes[0]),
            Number(partes[1]) - 1,
            Number(partes[2])
        );


    let resultado =
        dataObj.toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );


    if (item.hora) {

        resultado +=
            ` • ${item.hora}`;

    }


    return resultado;

}


// ========================================
// RESOLVER IMAGEM
// ========================================

function resolverImagemTimeline(
    caminho
) {

    if (!caminho) {
        return "";
    }


    if (
        caminho.startsWith("http://") ||
        caminho.startsWith("https://")
    ) {

        return caminho;

    }


    // Fotos enviadas pelo Admin
    if (
        caminho.startsWith("/uploads/")
    ) {

        return (
            "http://localhost:3000" +
            caminho
        );

    }


    // Fotos antigas que ainda estão
    // dentro de assets/
    return caminho;

}


// ========================================
// ESCAPAR HTML
// ========================================

function escaparHtmlTimeline(
    texto
) {

    return String(texto || "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


// ========================================
// BOTÃO VOLTAR AO TOPO
// ========================================

function ativarBotaoTopoTimeline() {

    const botao =
        document.getElementById(
            "timeline-topo-btn"
        );


    const view =
        document.querySelector(
            '.view[data-view="timeline"]'
        );


    if (!botao || !view) {
        return;
    }


    botao.addEventListener(
        "click",
        () => {

            view.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );

}


// ========================================
// INICIALIZAÇÃO
// ========================================

ativarBotaoTopoTimeline();

carregarTimeline();