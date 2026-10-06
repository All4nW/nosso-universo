// =====================================================
// CARTAS — PAINEL ADMINISTRATIVO
// Cartas + bilhetinhos (tipo: "bilhete")
// =====================================================

let cartasItensAdmin = [];

// Categorias válidas pra cartas. "destaque" não existe mais
// pra criar, mas cartas antigas com essa categoria continuam
// aparecendo na lista (e no site, dentro de "Outros").
const LABELS_CATEGORIA = {
    aniversario: "✦ Aniversário",
    relacionamento: "❤ Relacionamento",
    outros: "✉ Outros",
    destaque: "★ Destaque (antigo — aparece em Outros)"
};

const CATEGORIAS_VALIDAS =
    ["aniversario", "relacionamento", "outros"];

// Cores dos bilhetinhos — as mesmas que o site aceita.
const LABELS_COR_BILHETE = {
    rosa: "🌸 Rosa",
    lilas: "💜 Lilás",
    azul: "💙 Azul",
    creme: "🌼 Creme",
    menta: "🌿 Menta"
};

const CORES_BILHETE_VALIDAS =
    Object.keys(LABELS_COR_BILHETE);

function ehBilheteAdmin(item) {

    return item && item.tipo === "bilhete";

}


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
            textoContagemAdmin(),
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


function textoContagemAdmin() {

    const bilhetes =
        cartasItensAdmin.filter(ehBilheteAdmin).length;

    const cartas =
        cartasItensAdmin.length - bilhetes;

    if (!bilhetes) {

        return `${cartas} carta(s) carregada(s).`;

    }

    return `${cartas} carta(s) e ${bilhetes} bilhetinho(s) carregado(s).`;

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

                <h3>Nada por aqui ainda</h3>

                <p>
                    Adicione a primeira carta ou o primeiro
                    bilhetinho que vocês guardaram.
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


    const ehBilhete =
        ehBilheteAdmin(item);

    const nomeAutor =
        item.autor === "ela"
            ? "Jhennyfer"
            : "Allan";

    const dataFormatada =
        formatarDataCartaAdmin(item.data);


    // Imagem: a foto, ou um ícone quando não tem

    let imagem;

    if (item.foto) {

        imagem = `<img src="${resolverImagemCartaAdmin(item.foto)}" alt="">`;

    } else if (ehBilhete) {

        imagem = `<div class="assistidos-sem-capa">📝</div>`;

    } else {

        imagem = `<div class="assistidos-sem-capa">✉</div>`;

    }


    // Título: o da carta, ou o começo da mensagem no bilhetinho

    const titulo =
        ehBilhete
            ? resumirTextoCartaAdmin(item.mensagem, 70)
            : item.titulo;


    const rotulo =
        ehBilhete
            ? `📝 Bilhetinho${item.cor && LABELS_COR_BILHETE[item.cor] ? " · " + LABELS_COR_BILHETE[item.cor] : ""}`
            : (
                LABELS_CATEGORIA[item.categoria] ||
                "Sem categoria"
            );


    elemento.innerHTML = `

        <div class="assistidos-admin-imagem">
            ${imagem}
        </div>


        <div class="assistidos-admin-info">

            <strong>
                ${escaparHTMLCartaAdmin(titulo)}
            </strong>

            <span>
                ${nomeAutor}
                ${dataFormatada ? " · " + dataFormatada : ""}
            </span>

            <div class="assistidos-admin-notas">

                <small>${escaparHTMLCartaAdmin(rotulo)}</small>

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


function resumirTextoCartaAdmin(texto, limite) {

    const limpo =
        (texto || "")
            .replace(/\*\*/g, "")
            .replace(/\s+/g, " ")
            .trim();

    return limpo.length > limite
        ? limpo.slice(0, limite).trimEnd() + "…"
        : limpo;

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

    const novoBilhete =
        document.getElementById(
            "cartas-novo-bilhete"
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

    const negrito =
        document.getElementById(
            "cartas-negrito"
        );

    const tipo =
        document.getElementById(
            "cartas-tipo"
        );

    const lista =
        document.getElementById(
            "cartas-lista"
        );


    novo?.addEventListener(
        "click",
        () => abrirModalCarta(null, "carta")
    );

    novoBilhete?.addEventListener(
        "click",
        () => abrirModalCarta(null, "bilhete")
    );

    negrito?.addEventListener(
        "click",
        aplicarNegritoCarta
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


    tipo?.addEventListener(
        "change",
        atualizarCamposPorTipo
    );


    // Editar / excluir. Usa onclick (e não addEventListener no
    // document) pra não duplicar o clique se o painel for
    // inicializado mais de uma vez.

    if (lista) {

        lista.onclick = evento => {

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

        };

    }

}


// =====================================================
// MOSTRAR / ESCONDER (inline, pra não depender de CSS)
// =====================================================

function mostrarCampoCarta(id, visivel) {

    const elemento =
        document.getElementById(id);

    if (!elemento) return;

    elemento.style.display =
        visivel ? "" : "none";

}


// =====================================================
// CAMPOS QUE MUDAM CONFORME O TIPO
// Carta: título, foto, categoria, mensagem livre.
// Bilhetinho: cor, foto opcional e mensagem (sem limite de tamanho).
// =====================================================

function atualizarCamposPorTipo() {

    const tipo =
        document.getElementById(
            "cartas-tipo"
        )?.value || "carta";

    const ehBilhete =
        tipo === "bilhete";


    // A foto vale pra cartas (espia atrás do envelope) e pra
    // bilhetinhos (vira a capa), então o bloco fica sempre à vista.
    mostrarCampoCarta("cartas-bloco-foto", true);
    mostrarCampoCarta("cartas-bloco-titulo", !ehBilhete);
    mostrarCampoCarta("cartas-bloco-categoria", !ehBilhete);
    mostrarCampoCarta("cartas-bloco-cor", ehBilhete);


    // Campo escondido não pode continuar "required",
    // senão o navegador trava o envio do formulário.

    const titulo =
        document.getElementById(
            "cartas-titulo"
        );

    if (titulo) {

        titulo.required = !ehBilhete;

    }


    const mensagem =
        document.getElementById(
            "cartas-mensagem"
        );

    if (mensagem) {

        if (ehBilhete) {

            mensagem.rows = 5;

            mensagem.placeholder =
                "Escreva a mensagem do bilhetinho...";

        } else {

            mensagem.rows = 8;

            mensagem.placeholder =
                "Cole aqui o texto original da carta ou mensagem...";

        }

    }


    const titulosModal =
        document.getElementById(
            "cartas-modal-titulo"
        );

    if (titulosModal) {

        const editando =
            Boolean(
                document.getElementById(
                    "cartas-id"
                )?.value
            );

        titulosModal.textContent =
            ehBilhete
                ? (editando ? "Editar bilhetinho" : "Adicionar bilhetinho")
                : (editando ? "Editar carta" : "Adicionar carta");

    }


}


// =====================================================
// MODAL
// =====================================================

function abrirModalCarta(item = null, tipoInicial = "carta") {

    const modal =
        document.getElementById(
            "cartas-modal"
        );

    if (!modal) return;


    const tipo =
        item
            ? (ehBilheteAdmin(item) ? "bilhete" : "carta")
            : tipoInicial;


    document.getElementById(
        "cartas-id"
    ).value =
        item?.id || "";


    document.getElementById(
        "cartas-tipo"
    ).value =
        tipo;


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


    // Cartas antigas com categoria "destaque" (ou sem categoria)
    // caem em "Outros", igual ao site.

    document.getElementById(
        "cartas-categoria"
    ).value =
        CATEGORIAS_VALIDAS.includes(item?.categoria)
            ? item.categoria
            : (item ? "outros" : "aniversario");


    document.getElementById(
        "cartas-cor"
    ).value =
        CORES_BILHETE_VALIDAS.includes(item?.cor)
            ? item.cor
            : "";


    document.getElementById(
        "cartas-mensagem"
    ).value =
        item?.mensagem || "";


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


    atualizarCamposPorTipo();


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
// NEGRITO NA MENSAGEM
// =====================================================
// Envolve o trecho selecionado na textarea com **, que o
// site depois converte em <strong>. Se nada estiver
// selecionado, só insere ** ** com o cursor no meio.
// (Funciona igual em cartas e bilhetinhos.)

function aplicarNegritoCarta() {

    const campo =
        document.getElementById(
            "cartas-mensagem"
        );

    if (!campo) return;

    const inicio =
        campo.selectionStart;

    const fim =
        campo.selectionEnd;

    const textoSelecionado =
        campo.value.slice(inicio, fim);

    const antes =
        campo.value.slice(0, inicio);

    const depois =
        campo.value.slice(fim);

    const novoTexto =
        `${antes}**${textoSelecionado}**${depois}`;

    campo.value = novoTexto;

    campo.focus();


    if (textoSelecionado) {

        // Mantém o trecho selecionado (agora com ** em volta)
        campo.setSelectionRange(
            inicio,
            fim + 4
        );

    } else {

        // Cursor entre os asteriscos, pronto pra digitar
        campo.setSelectionRange(
            inicio + 2,
            inicio + 2
        );

    }

}


// =====================================================
// ID ÚNICO
// =====================================================
// Antes, duas cartas com o mesmo título gerariam o mesmo id
// e a segunda sobrescreveria a primeira. Agora ganha -2, -3...

function gerarIdUnicoCarta(base) {

    const raiz =
        base || `item-${Date.now()}`;

    let candidato = raiz;

    let contador = 2;

    while (
        cartasItensAdmin.some(
            item => item.id === candidato
        )
    ) {

        candidato = `${raiz}-${contador}`;

        contador++;

    }

    return candidato;

}


function dataDeHojeCarta() {

    // YYYY-MM-DD no fuso local
    return new Date().toLocaleDateString("sv-SE");

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

    const tipo =
        document.getElementById(
            "cartas-tipo"
        ).value;

    const ehBilhete =
        tipo === "bilhete";

    const titulo =
        document.getElementById(
            "cartas-titulo"
        ).value.trim();

    const mensagem =
        document.getElementById(
            "cartas-mensagem"
        ).value.trim();


    if (ehBilhete) {

        if (!mensagem) {

            alert(
                "Escreva a mensagem do bilhetinho."
            );

            return;

        }

    } else if (!titulo || !mensagem) {

        alert(
            "Preencha ao menos o título e a mensagem."
        );

        return;

    }


    const existente =
        cartasItensAdmin.find(
            item => item.id === id
        );


    // =================================================
    // UPLOAD DA IMAGEM (opcional — carta ou bilhetinho)
    // =================================================

    let foto =
        existente?.foto || "";

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


    const autor =
        document.getElementById(
            "cartas-autor"
        ).value;

    const dataCampo =
        document.getElementById(
            "cartas-data"
        ).value;


    // Bilhetinho sem data ganha a de hoje, pra entrar
    // na ordem certa (mais recentes primeiro) no site.

    const data =
        dataCampo ||
        (ehBilhete ? dataDeHojeCarta() : null);


    let novoItem;

    if (ehBilhete) {

        const cor =
            document.getElementById(
                "cartas-cor"
            ).value;

        novoItem = {

            id:
                id ||
                gerarIdUnicoCarta(
                    "bilhete-" +
                    criarSlugCarta(mensagem).slice(0, 30)
                ),

            tipo: "bilhete",

            titulo: "",

            autor,

            data,

            categoria: "outros",

            mensagem,

            foto

        };

        // Sem cor escolhida = o site escolhe uma (sempre a mesma)

        if (CORES_BILHETE_VALIDAS.includes(cor)) {

            novoItem.cor = cor;

        }

    } else {

        novoItem = {

            id:
                id ||
                gerarIdUnicoCarta(
                    criarSlugCarta(titulo)
                ),

            tipo: "carta",

            titulo,

            autor,

            data,

            categoria:
                document.getElementById(
                    "cartas-categoria"
                ).value,

            mensagem,

            foto

        };

    }


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
            ehBilhete
                ? "Bilhetinho salvo com sucesso."
                : "Carta salva com sucesso.",
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


    const descricao =
        ehBilheteAdmin(item)
            ? `o bilhetinho "${resumirTextoCartaAdmin(item.mensagem, 50)}"`
            : `a carta "${item.titulo}"`;

    const confirmar =
        confirm(
            `Excluir ${descricao}?`
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
            ehBilheteAdmin(item)
                ? "Bilhetinho excluído."
                : "Carta excluída.",
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
            "✓ Sincronizado! As cartas e os bilhetinhos foram gravados no site.",
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