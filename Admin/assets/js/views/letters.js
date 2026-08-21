// =====================================================
// CARTAS — PAINEL ADMINISTRATIVO
// =====================================================

let cartasItensAdmin = [];


// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function initLetters() {

    const lista =
        document.getElementById(
            "cartas-lista"
        );

    if (!lista) return;

    configurarEventosCartasAdmin();

    await carregarCartasAdmin();

}


// =====================================================
// CARREGAR
// =====================================================

async function carregarCartasAdmin() {

    mostrarStatusCartas(
        "Carregando...",
        "info"
    );

    try {

        cartasItensAdmin =
            await API.getCartas();

        renderizarCartasAdmin();

        mostrarStatusCartas(
            `${cartasItensAdmin.length} carta(s) carregada(s).`,
            "sucesso"
        );

    }

    catch (erro) {

        console.error(erro);

        mostrarStatusCartas(
            erro.message,
            "erro"
        );

    }

}


// =====================================================
// RENDER
// =====================================================

function renderizarCartasAdmin() {

    const lista =
        document.getElementById(
            "cartas-lista"
        );

    if (!lista) return;

    lista.innerHTML = "";


    const ordenadas =
        [...cartasItensAdmin].sort((a, b) => {

            const dataA = a.data || "";
            const dataB = b.data || "";

            return dataB.localeCompare(dataA);

        });


    ordenadas.forEach(item => {

        lista.appendChild(
            criarItemCartaAdmin(item)
        );

    });


    if (!lista.children.length) {

        lista.innerHTML = `
            <div class="assistidos-admin-vazio">
                <span>✉</span>

                <h3>Nenhuma carta ainda</h3>

                <p>
                    Adicione a primeira carta ou mensagem
                    que vocês guardaram.
                </p>
            </div>
        `;

    }

}


// =====================================================
// ITEM
// =====================================================

function criarItemCartaAdmin(item) {

    const elemento =
        document.createElement("div");

    elemento.className =
        "assistidos-admin-item";


    const imagem =
        item.foto
            ? `<img src="${resolverImagemCartaAdmin(item.foto)}" alt="">`
            : `<div class="assistidos-sem-capa">✉</div>`;


    const nomeAutor =
        item.autor === "ela"
            ? "Ela"
            : "Você";

    const dataFormatada =
        formatarDataCartaAdmin(item.data);


    elemento.innerHTML = `

        <div class="assistidos-admin-imagem">
            ${imagem}
        </div>


        <div class="assistidos-admin-info">

            <strong>
                ${escaparHTMLCartaAdmin(item.titulo)}
            </strong>

            <span>
                ${nomeAutor}
                ${dataFormatada ? " · " + dataFormatada : ""}
            </span>

            <div class="assistidos-admin-notas">

                ${
                    item.especial
                        ? `<small>✦ Especial</small>`
                        : ""
                }

                ${
                    item.destaque
                        ? `<small>★ Em destaque</small>`
                        : ""
                }

            </div>

        </div>


        <div class="assistidos-admin-acoes">

            <button
                type="button"
                data-editar="${item.id}"
            >
                ✎
            </button>

            <button
                type="button"
                data-excluir="${item.id}"
            >
                🗑
            </button>

        </div>

    `;


    return elemento;

}


// =====================================================
// RESOLVER IMAGEM (mesmo esquema do admin de Assistidos —
// o admin fica dentro de Admin/, então sobe um nível)
// =====================================================

function resolverImagemCartaAdmin(caminho) {

    if (!caminho) return "";

    return `../${caminho}`;

}


// =====================================================
// EVENTOS
// =====================================================

function configurarEventosCartasAdmin() {

    const novo =
        document.getElementById(
            "cartas-novo"
        );

    const sincronizar =
        document.getElementById(
            "cartas-sincronizar"
        );

    const fechar =
        document.getElementById(
            "cartas-modal-fechar"
        );

    const cancelar =
        document.getElementById(
            "cartas-cancelar"
        );

    const form =
        document.getElementById(
            "cartas-form"
        );

    const imagem =
        document.getElementById(
            "cartas-imagem"
        );


    novo?.addEventListener(
        "click",
        () => abrirModalCarta()
    );


    sincronizar?.addEventListener(
        "click",
        sincronizarCartas
    );


    fechar?.addEventListener(
        "click",
        fecharModalCarta
    );


    cancelar?.addEventListener(
        "click",
        fecharModalCarta
    );


    form?.addEventListener(
        "submit",
        salvarCarta
    );


    imagem?.addEventListener(
        "change",
        previewImagemCarta
    );


    document.addEventListener(
        "click",
        evento => {

            const editar =
                evento.target.closest(
                    "[data-editar]"
                );

            const excluir =
                evento.target.closest(
                    "[data-excluir]"
                );


            if (editar) {

                editarCarta(
                    editar.dataset.editar
                );

            }


            if (excluir) {

                excluirCarta(
                    excluir.dataset.excluir
                );

            }

        }
    );

}


// =====================================================
// MODAL
// =====================================================

function abrirModalCarta(item = null) {

    const modal =
        document.getElementById(
            "cartas-modal"
        );

    if (!modal) return;


    document.getElementById(
        "cartas-modal-titulo"
    ).textContent =
        item
            ? "Editar carta"
            : "Adicionar carta";


    document.getElementById(
        "cartas-id"
    ).value =
        item?.id || "";


    document.getElementById(
        "cartas-titulo"
    ).value =
        item?.titulo || "";


    document.getElementById(
        "cartas-autor"
    ).value =
        item?.autor || "eu";


    document.getElementById(
        "cartas-data"
    ).value =
        item?.data || "";


    document.getElementById(
        "cartas-categoria"
    ).value =
        item?.categoria || "";


    document.getElementById(
        "cartas-mensagem"
    ).value =
        item?.mensagem || "";


    document.getElementById(
        "cartas-especial"
    ).checked =
        Boolean(item?.especial);


    document.getElementById(
        "cartas-destaque"
    ).checked =
        Boolean(item?.destaque);


    const preview =
        document.getElementById(
            "cartas-preview"
        );

    if (item?.foto) {

        preview.innerHTML = `
            <img
                src="${resolverImagemCartaAdmin(item.foto)}"
                alt=""
            >
        `;

    } else {

        preview.innerHTML = "✉";

    }


    document.getElementById(
        "cartas-imagem"
    ).value = "";


    modal.classList.remove(
        "oculto"
    );

}


// =====================================================
// FECHAR MODAL
// =====================================================

function fecharModalCarta() {

    document
        .getElementById("cartas-modal")
        ?.classList.add("oculto");

}


// =====================================================
// PREVIEW DA IMAGEM
// =====================================================

function previewImagemCarta(evento) {

    const arquivo =
        evento.target.files[0];

    if (!arquivo) return;

    const preview =
        document.getElementById(
            "cartas-preview"
        );

    const url =
        URL.createObjectURL(arquivo);

    preview.innerHTML = `
        <img src="${url}" alt="">
    `;

}


// =====================================================
// SALVAR
// =====================================================

async function salvarCarta(evento) {

    evento.preventDefault();


    const id =
        document.getElementById(
            "cartas-id"
        ).value.trim();

    const titulo =
        document.getElementById(
            "cartas-titulo"
        ).value.trim();

    const mensagem =
        document.getElementById(
            "cartas-mensagem"
        ).value.trim();


    if (!titulo || !mensagem) {

        alert(
            "Preencha ao menos o título e a mensagem."
        );

        return;

    }


    const existente =
        cartasItensAdmin.find(
            item => item.id === id
        );


    let foto =
        existente?.foto || "";


    // =================================================
    // UPLOAD DA IMAGEM (opcional)
    // =================================================

    const arquivo =
        document.getElementById(
            "cartas-imagem"
        ).files[0];

    if (arquivo) {

        mostrarStatusCartas(
            "Enviando imagem...",
            "info"
        );

        try {

            const resultado =
                await API.uploadImagemCarta(
                    arquivo
                );

            foto =
                resultado.caminho;

        }

        catch (erro) {

            alert(
                "Erro ao enviar imagem: " +
                erro.message
            );

            return;

        }

    }


    const novoItem = {

        id:
            id ||
            criarSlugCarta(titulo),

        titulo,

        autor:
            document.getElementById(
                "cartas-autor"
            ).value,

        data:
            document.getElementById(
                "cartas-data"
            ).value || null,

        categoria:
            document.getElementById(
                "cartas-categoria"
            ).value.trim(),

        mensagem,

        especial:
            document.getElementById(
                "cartas-especial"
            ).checked,

        destaque:
            document.getElementById(
                "cartas-destaque"
            ).checked,

        foto

    };


    const indice =
        cartasItensAdmin.findIndex(
            item => item.id === novoItem.id
        );

    if (indice >= 0) {

        cartasItensAdmin[indice] =
            novoItem;

    } else {

        cartasItensAdmin.push(
            novoItem
        );

    }


    try {

        await API.saveCartas(
            cartasItensAdmin
        );

        fecharModalCarta();

        renderizarCartasAdmin();

        mostrarStatusCartas(
            "Carta salva com sucesso.",
            "sucesso"
        );

    }

    catch (erro) {

        console.error(erro);

        alert(erro.message);

    }

}


// =====================================================
// EDITAR
// =====================================================

function editarCarta(id) {

    const item =
        cartasItensAdmin.find(
            item => item.id === id
        );

    if (!item) return;

    abrirModalCarta(item);

}


// =====================================================
// EXCLUIR
// =====================================================

async function excluirCarta(id) {

    const item =
        cartasItensAdmin.find(
            item => item.id === id
        );

    if (!item) return;


    const confirmar =
        confirm(
            `Excluir a carta "${item.titulo}"?`
        );

    if (!confirmar) return;


    cartasItensAdmin =
        cartasItensAdmin.filter(
            item => item.id !== id
        );


    try {

        await API.saveCartas(
            cartasItensAdmin
        );

        renderizarCartasAdmin();

        mostrarStatusCartas(
            "Carta excluída.",
            "sucesso"
        );

    }

    catch (erro) {

        alert(erro.message);

    }

}


// =====================================================
// SINCRONIZAR
// =====================================================

async function sincronizarCartas() {

    const botao =
        document.getElementById(
            "cartas-sincronizar"
        );

    if (botao) {

        botao.disabled = true;

        botao.textContent =
            "🔄 Sincronizando...";

    }

    try {

        await API.saveCartas(
            cartasItensAdmin
        );

        mostrarStatusCartas(
            "✓ Sincronizado! As cartas foram gravadas no site.",
            "sucesso"
        );

    }

    catch (erro) {

        console.error(erro);

        mostrarStatusCartas(
            erro.message,
            "erro"
        );

    }

    finally {

        if (botao) {

            botao.disabled = false;

            botao.textContent =
                "🔄 Sincronizar com o site";

        }

    }

}


// =====================================================
// STATUS
// =====================================================

function mostrarStatusCartas(mensagem, tipo) {

    const status =
        document.getElementById(
            "cartas-status"
        );

    if (!status) return;

    status.textContent = mensagem;

    status.className =
        `assistidos-status ${tipo}`;

    clearTimeout(
        mostrarStatusCartas.timer
    );

    mostrarStatusCartas.timer =
        setTimeout(() => {

            status.textContent = "";

            status.className =
                "assistidos-status";

        }, 4000);

}


// =====================================================
// UTILIDADES
// =====================================================

function criarSlugCarta(texto) {

    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

}


function formatarDataCartaAdmin(dataString) {

    if (!dataString) return "";

    const data =
        new Date(dataString + "T00:00:00");

    if (Number.isNaN(data.getTime())) return "";

    return data.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function escaparHTMLCartaAdmin(texto) {

    const div =
        document.createElement("div");

    div.textContent = texto || "";

    return div.innerHTML;

}


window.initLetters = initLetters;