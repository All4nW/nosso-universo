// ========================================
// TIMELINE — SITE PRINCIPAL
// ========================================
// Os dados vêm do SQLite através da API.
// Endpoint público:
// http://localhost:3000/api/timeline
// ========================================


async function carregarTimeline() {

    const container =
        document.getElementById("timeline-container");


    if (!container) {
        return;
    }


    try {

        const resposta =
            await fetch(
                "http://localhost:3000/api/timeline"
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar timeline."
            );

        }


        const itens =
            await resposta.json();


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

    catch (erro) {

        console.error(
            "Erro ao carregar Timeline:",
            erro
        );


        container.innerHTML = `
            <div class="timeline-vazio">
                Não foi possível carregar nossa Timeline. ❤️
            </div>
        `;

    }

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


    const primeiraFoto =
        item.foto || null;


    const textoData =
        formatarDataTimeline(
            item.data,
            item.hora
        );


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

    let seloSugestao = "";


    if (
        item.sugeridoPor === "ela"
    ) {

        seloSugestao = `
            <span class="timeline-badge-sugestao timeline-badge-sugestao-ela">
                💗 Sugestão dela
            </span>
        `;

    }

    else if (
        item.sugeridoPor === "mim"
    ) {

        seloSugestao = `
            <span class="timeline-badge-sugestao timeline-badge-sugestao-mim">
                💙 Sugestão minha
            </span>
        `;

    }


    // ====================================
    // FOTO
    // ====================================

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


    // ====================================
    // CARD
    // ====================================

    elemento.innerHTML = `

        <div class="timeline-marker"></div>

        <div class="timeline-card">

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


            <span class="timeline-card-data">
                ${textoData}
            </span>


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
    data,
    hora
) {

    if (!data) {
        return "";
    }


    const partes =
        data.split("-");


    if (partes.length !== 3) {
        return data;
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


    if (hora) {

        resultado +=
            ` • ${hora}`;

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