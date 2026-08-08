let timelineAdminItens = [];
let timelineEditandoId = null;
let timelineDragId = null;


// ======================================================
// INIT
// ======================================================

async function initTimeline() {

    console.log("[TIMELINE ADMIN] Inicializando...");

    // Primeiro tenta carregar os dados.
    // Assim, um problema em algum botão do formulário
    // não impede a lista de aparecer.
    await carregarTimelineAdmin();

    // Depois registra os eventos do formulário.
    registrarEventosTimeline();

}


// ======================================================
// API - CARREGAR
// ======================================================

async function carregarTimelineAdmin() {

    const container =
        document.getElementById(
            "timeline-admin-itens"
        );

    if (!container) {

        console.error(
            "[TIMELINE ADMIN] Elemento #timeline-admin-itens não encontrado."
        );

        return;

    }


    try {

        console.log(
            "[TIMELINE ADMIN] Buscando dados..."
        );


        const resposta =
            await fetch(
                "http://localhost:3000/api/timeline?admin=true"
            );


        console.log(
            "[TIMELINE ADMIN] Status:",
            resposta.status
        );


        if (!resposta.ok) {

            throw new Error(
                `HTTP ${resposta.status}`
            );

        }


        timelineAdminItens =
            await resposta.json();


        console.log(
            "[TIMELINE ADMIN] Itens recebidos:",
            timelineAdminItens
        );


        renderizarTimelineAdmin();


    }

    catch (erro) {

        console.error(
            "[TIMELINE ADMIN] Erro ao carregar:",
            erro
        );


        container.innerHTML = `
            <div class="timeline-admin-vazio">
                ❌ Não foi possível carregar a Timeline.
            </div>
        `;

    }

}


// ======================================================
// RENDER
// ======================================================

function renderizarTimelineAdmin() {

    const container =
        document.getElementById(
            "timeline-admin-itens"
        );


    if (!container) {

        console.error(
            "[TIMELINE ADMIN] Container não encontrado."
        );

        return;

    }


    if (!timelineAdminItens.length) {

        container.innerHTML = `
            <div class="timeline-admin-vazio">
                ❤️ Nenhum momento criado ainda.
            </div>
        `;

        return;

    }


    container.innerHTML = "";


    timelineAdminItens.forEach(
        (item) => {

            const elemento =
                document.createElement("div");


            elemento.className =
                "timeline-admin-item";


            elemento.draggable = true;


            elemento.dataset.id =
                item.id;


            const foto =
                item.foto
                    ? resolverImagem(item.foto)
                    : "";


            elemento.innerHTML = `

                <div class="timeline-admin-arrastar">
                    ⋮⋮
                </div>


                ${
                    foto
                        ? `
                            <img
                                class="timeline-admin-thumb"
                                src="${foto}"
                                alt=""
                                onerror="this.style.display='none'"
                            >
                        `
                        : `
                            <div class="timeline-admin-thumb timeline-admin-thumb-vazio">
                                ✦
                            </div>
                        `
                }


                <div class="timeline-admin-info">

                    <div class="timeline-admin-data">

                        ${formatarDataAdmin(item.data)}

                        ${
                            item.hora
                                ? ` • ${escaparHtml(item.hora)}`
                                : ""
                        }

                    </div>


                    <h3>
                        ${escaparHtml(item.titulo)}
                    </h3>


                    <p>
                        ${escaparHtml(item.resumo || "")}
                    </p>


                    <div class="timeline-admin-tags">

                        ${
                            item.tipo
                                ? `
                                    <span>
                                        ${escaparHtml(item.tipo)}
                                    </span>
                                `
                                : ""
                        }


                        ${
                            item.categoria
                                ? `
                                    <span>
                                        ${escaparHtml(item.categoria)}
                                    </span>
                                `
                                : ""
                        }


                        ${
                            item.ativo
                                ? `
                                    <span class="ativo">
                                        ● Ativo
                                    </span>
                                `
                                : `
                                    <span class="inativo">
                                        ● Oculto
                                    </span>
                                `
                        }

                    </div>

                </div>


                <div class="timeline-admin-acoes">

                    <button
                        type="button"
                        class="timeline-admin-btn"
                        data-acao="editar"
                        data-id="${escaparHtml(item.id)}"
                        title="Editar"
                    >
                        ✎
                    </button>


                    <button
                        type="button"
                        class="timeline-admin-btn timeline-admin-excluir"
                        data-acao="excluir"
                        data-id="${escaparHtml(item.id)}"
                        title="Excluir"
                    >
                        🗑
                    </button>

                </div>

            `;


            adicionarEventosDrag(elemento);


            container.appendChild(elemento);

        }
    );

}


// ======================================================
// EVENTOS
// ======================================================

function registrarEventosTimeline() {

    console.log(
        "[TIMELINE ADMIN] Registrando eventos..."
    );


    const novo =
        document.getElementById(
            "btn-novo-momento"
        );


    const cancelar =
        document.getElementById(
            "timeline-btn-cancelar"
        );


    const salvar =
        document.getElementById(
            "timeline-btn-salvar"
        );


    // --------------------------------------
    // NOVO
    // --------------------------------------

    if (novo) {

        novo.onclick =
            abrirFormularioNovo;

    }

    else {

        console.warn(
            "[TIMELINE ADMIN] #btn-novo-momento não encontrado."
        );

    }


    // --------------------------------------
    // CANCELAR
    // --------------------------------------

    if (cancelar) {

        cancelar.onclick =
            fecharFormulario;

    }

    else {

        console.warn(
            "[TIMELINE ADMIN] #timeline-btn-cancelar não encontrado."
        );

    }


    // --------------------------------------
    // SALVAR
    // --------------------------------------

    if (salvar) {

        salvar.onclick =
            salvarMomento;

    }

    else {

        console.warn(
            "[TIMELINE ADMIN] #timeline-btn-salvar não encontrado."
        );

    }


    // --------------------------------------
    // AÇÕES DOS MOMENTOS
    // --------------------------------------

    const lista =
        document.getElementById(
            "timeline-admin-itens"
        );


    if (lista) {

        lista.addEventListener(
            "click",
            (event) => {

                const botao =
                    event.target.closest(
                        "[data-acao]"
                    );


                if (!botao) return;


                const id =
                    botao.dataset.id;


                if (
                    botao.dataset.acao ===
                    "editar"
                ) {

                    editarMomento(id);

                }


                if (
                    botao.dataset.acao ===
                    "excluir"
                ) {

                    excluirMomento(id);

                }

            }
        );

    }

}


// ======================================================
// NOVO
// ======================================================

function abrirFormularioNovo() {

    timelineEditandoId = null;


    limparFormulario();


    const titulo =
        document.getElementById(
            "timeline-form-titulo"
        );


    if (titulo) {

        titulo.textContent =
            "Novo momento";

    }


    const salvar =
        document.getElementById(
            "timeline-btn-salvar"
        );


    if (salvar) {

        salvar.textContent =
            "Salvar momento";

    }


    const formulario =
        document.getElementById(
            "timeline-formulario"
        );


    if (formulario) {

        formulario.style.display =
            "block";

    }


    const campoTitulo =
        document.getElementById(
            "timeline-titulo"
        );


    if (campoTitulo) {

        campoTitulo.focus();

    }

}


// ======================================================
// EDITAR
// ======================================================

function editarMomento(id) {

    const item =
        timelineAdminItens.find(
            item => item.id === id
        );


    if (!item) {

        console.error(
            "[TIMELINE ADMIN] Item não encontrado:",
            id
        );

        return;

    }


    timelineEditandoId =
        id;


    definirValor(
        "timeline-titulo",
        item.titulo
    );


    definirValor(
        "timeline-data",
        item.data
    );


    definirValor(
        "timeline-hora",
        item.hora
    );


    definirValor(
        "timeline-resumo",
        item.resumo
    );


    definirValor(
        "timeline-descricao",
        item.descricao
    );


    definirValor(
        "timeline-tipo",
        item.tipo
    );


    definirValor(
        "timeline-categoria",
        item.categoria
    );


    definirValor(
        "timeline-sugerido",
        item.sugeridoPor
    );


    const ativo =
        document.getElementById(
            "timeline-ativo"
        );


    if (ativo) {

        ativo.checked =
            Boolean(item.ativo);

    }


    const fotoAtual =
        document.getElementById(
            "timeline-foto-atual"
        );


    if (fotoAtual) {

        if (item.foto) {

            fotoAtual.innerHTML = `
                Foto atual:

                <img
                    src="${resolverImagem(item.foto)}"
                    alt=""
                >
            `;

        }

        else {

            fotoAtual.innerHTML =
                "Nenhuma foto adicionada.";

        }

    }


    const tituloForm =
        document.getElementById(
            "timeline-form-titulo"
        );


    if (tituloForm) {

        tituloForm.textContent =
            "Editar momento";

    }


    const botaoSalvar =
        document.getElementById(
            "timeline-btn-salvar"
        );


    if (botaoSalvar) {

        botaoSalvar.textContent =
            "Salvar alterações";

    }


    const formulario =
        document.getElementById(
            "timeline-formulario"
        );


    if (formulario) {

        formulario.style.display =
            "block";

    }

}


// ======================================================
// SALVAR
// ======================================================

async function salvarMomento() {

    const titulo =
        obterValor(
            "timeline-titulo"
        ).trim();


    const data =
        obterValor(
            "timeline-data"
        );


    if (!titulo || !data) {

        alert(
            "Preencha pelo menos o título e a data."
        );

        return;

    }


    const formulario =
        new FormData();


    formulario.append(
        "titulo",
        titulo
    );


    formulario.append(
        "data",
        data
    );


    formulario.append(
        "hora",
        obterValor("timeline-hora")
    );


    formulario.append(
        "resumo",
        obterValor("timeline-resumo")
    );


    formulario.append(
        "descricao",
        obterValor("timeline-descricao")
    );


    formulario.append(
        "tipo",
        obterValor("timeline-tipo")
    );


    formulario.append(
        "categoria",
        obterValor("timeline-categoria")
    );


    formulario.append(
        "sugeridoPor",
        obterValor("timeline-sugerido")
    );


    const ativo =
        document.getElementById(
            "timeline-ativo"
        );


    formulario.append(
        "ativo",
        ativo
            ? ativo.checked
            : true
    );


    const foto =
        document.getElementById(
            "timeline-foto"
        );


    if (
        foto &&
        foto.files &&
        foto.files[0]
    ) {

        formulario.append(
            "foto",
            foto.files[0]
        );

    }


    try {

        let url =
            "http://localhost:3000/api/timeline";


        let metodo =
            "POST";


        if (timelineEditandoId) {

            url +=
                `/${timelineEditandoId}`;

            metodo =
                "PUT";

        }


        console.log(
            "[TIMELINE ADMIN] Salvando:",
            url,
            metodo
        );


        const resposta =
            await fetch(
                url,
                {
                    method: metodo,
                    body: formulario
                }
            );


        if (!resposta.ok) {

            const texto =
                await resposta.text();

            console.error(
                "[TIMELINE ADMIN] Resposta do servidor:",
                texto
            );


            throw new Error(
                `HTTP ${resposta.status}`
            );

        }


        alert(
            "❤️ Momento salvo com sucesso!"
        );


        fecharFormulario();


        await carregarTimelineAdmin();

    }

    catch (erro) {

        console.error(
            "[TIMELINE ADMIN] Erro ao salvar:",
            erro
        );


        alert(
            "❌ Não foi possível salvar o momento."
        );

    }

}


// ======================================================
// EXCLUIR
// ======================================================

async function excluirMomento(id) {

    const item =
        timelineAdminItens.find(
            item => item.id === id
        );


    if (!item) return;


    const confirmar =
        confirm(
            `Excluir "${item.titulo}"?`
        );


    if (!confirmar) return;


    try {

        const resposta =
            await fetch(
                `http://localhost:3000/api/timeline/${id}`,
                {
                    method: "DELETE"
                }
            );


        if (!resposta.ok) {

            throw new Error(
                `HTTP ${resposta.status}`
            );

        }


        await carregarTimelineAdmin();

    }

    catch (erro) {

        console.error(
            "[TIMELINE ADMIN] Erro ao excluir:",
            erro
        );


        alert(
            "Erro ao excluir momento."
        );

    }

}


// ======================================================
// DRAG & DROP
// ======================================================

function adicionarEventosDrag(elemento) {

    elemento.addEventListener(
        "dragstart",
        () => {

            timelineDragId =
                elemento.dataset.id;


            elemento.classList.add(
                "timeline-admin-dragging"
            );

        }
    );


    elemento.addEventListener(
        "dragend",
        () => {

            elemento.classList.remove(
                "timeline-admin-dragging"
            );


            timelineDragId =
                null;

        }
    );


    elemento.addEventListener(
        "dragover",
        (event) => {

            event.preventDefault();


            const elementoAtual =
                event.currentTarget;


            if (
                timelineDragId &&
                timelineDragId !==
                    elementoAtual.dataset.id
            ) {

                elementoAtual.classList.add(
                    "timeline-admin-drag-over"
                );

            }

        }
    );


    elemento.addEventListener(
        "dragleave",
        (event) => {

            event.currentTarget.classList.remove(
                "timeline-admin-drag-over"
            );

        }
    );


    elemento.addEventListener(
        "drop",
        async (event) => {

            event.preventDefault();


            const destino =
                event.currentTarget;


            destino.classList.remove(
                "timeline-admin-drag-over"
            );


            if (
                !timelineDragId ||
                timelineDragId ===
                    destino.dataset.id
            ) {

                return;

            }


            const lista =
                document.getElementById(
                    "timeline-admin-itens"
                );


            if (!lista) return;


            const arrastado =
                lista.querySelector(
                    `[data-id="${CSS.escape(timelineDragId)}"]`
                );


            if (!arrastado) return;


            const todos =
                [
                    ...lista.children
                ];


            const indiceArrastado =
                todos.indexOf(
                    arrastado
                );


            const indiceDestino =
                todos.indexOf(
                    destino
                );


            if (
                indiceArrastado <
                indiceDestino
            ) {

                destino.after(
                    arrastado
                );

            }

            else {

                destino.before(
                    arrastado
                );

            }


            await salvarNovaOrdem();

        }
    );

}


// ======================================================
// SALVAR ORDEM
// ======================================================

async function salvarNovaOrdem() {

    const itens =
        [
            ...document.querySelectorAll(
                ".timeline-admin-item"
            )
        ];


    const ids =
        itens.map(
            item => item.dataset.id
        );


    try {

        const resposta =
            await fetch(
                "http://localhost:3000/api/timeline/reordenar",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        ids
                    })

                }
            );


        if (!resposta.ok) {

            throw new Error(
                `HTTP ${resposta.status}`
            );

        }


        timelineAdminItens =
            ids.map(
                id =>
                    timelineAdminItens.find(
                        item =>
                            item.id === id
                    )
            );

    }

    catch (erro) {

        console.error(
            "[TIMELINE ADMIN] Erro ao salvar ordem:",
            erro
        );


        alert(
            "Não foi possível salvar a nova ordem."
        );


        await carregarTimelineAdmin();

    }

}


// ======================================================
// FORMULÁRIO
// ======================================================

function limparFormulario() {

    definirValor(
        "timeline-titulo",
        ""
    );


    definirValor(
        "timeline-data",
        ""
    );


    definirValor(
        "timeline-hora",
        ""
    );


    definirValor(
        "timeline-resumo",
        ""
    );


    definirValor(
        "timeline-descricao",
        ""
    );


    definirValor(
        "timeline-tipo",
        ""
    );


    definirValor(
        "timeline-categoria",
        ""
    );


    definirValor(
        "timeline-sugerido",
        ""
    );


    const ativo =
        document.getElementById(
            "timeline-ativo"
        );


    if (ativo) {

        ativo.checked =
            true;

    }


    const foto =
        document.getElementById(
            "timeline-foto"
        );


    if (foto) {

        foto.value =
            "";

    }


    const fotoAtual =
        document.getElementById(
            "timeline-foto-atual"
        );


    if (fotoAtual) {

        fotoAtual.innerHTML =
            "";

    }

}


function fecharFormulario() {

    timelineEditandoId =
        null;


    const formulario =
        document.getElementById(
            "timeline-formulario"
        );


    if (formulario) {

        formulario.style.display =
            "none";

    }


    limparFormulario();

}


// ======================================================
// UTILITÁRIOS
// ======================================================

function definirValor(id, valor) {

    const elemento =
        document.getElementById(id);


    if (elemento) {

        elemento.value =
            valor || "";

    }

}


function obterValor(id) {

    const elemento =
        document.getElementById(id);


    return elemento
        ? elemento.value
        : "";

}


function formatarDataAdmin(data) {

    if (!data) return "";


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


    return dataObj.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );

}


function resolverImagem(caminho) {

    if (!caminho) return "";


    if (
        caminho.startsWith("http://") ||
        caminho.startsWith("https://")
    ) {

        return caminho;

    }


    if (
        caminho.startsWith("/uploads/")
    ) {

        return (
            "http://localhost:3000" +
            caminho
        );

    }


    return caminho;

}


function escaparHtml(texto) {

    return String(texto || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ======================================================
// EXPOR PARA O SISTEMA DO PAINEL
// ======================================================

window.initTimeline =
    initTimeline;


// ======================================================
// INICIALIZAÇÃO AUTOMÁTICA
// ======================================================

function iniciarTimelineAutomaticamente() {

    const container =
        document.getElementById(
            "timeline-admin-itens"
        );


    if (!container) {

        // Não estamos na view da Timeline.
        return;

    }


    initTimeline();

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        iniciarTimelineAutomaticamente
    );

}

else {

    iniciarTimelineAutomaticamente();

}