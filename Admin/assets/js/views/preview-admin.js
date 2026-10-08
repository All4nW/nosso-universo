// =====================================================
// PREVIEW — PAINEL ADMINISTRATIVO
// Vídeos verticais do feed Preview.
//
// Usa o mesmo esquema das Cartas. Precisa destas funções na
// sua API (api.js / servidor), iguais às de Cartas, só trocando
// o arquivo/pasta de destino:
//
//   API.getPreview()                 -> lista (array)
//   API.savePreview(lista)           -> grava assets/data/preview.json
//   API.uploadVideoPreview(file)     -> { caminho }  (assets/videos/preview/...)
//   API.uploadImagemPreview(file)    -> { caminho }  (assets/images/preview/...)
//
// Se getPreview não existir, a lista é lida do preview.json
// do site (só leitura). Os itens de Assistidos pro select vêm
// de API.getAssistidos() ou, se não existir, do assistidos.json.
// =====================================================

let previewItensAdmin = [];
let previewAssistidosAdmin = [];

let previewVideoArquivo = null;
let previewCapaArquivo = null;
let previewCapaManual = false;
let previewUrlLocal = null;
let previewDuracao = 0;
let previewLargura = 0;
let previewAltura = 0;

// Acima disso o admin pede confirmação (pesa no celular)
const PREVIEW_AVISO_MB = 25;

// Largura máxima da capa gerada a partir do vídeo
const PREVIEW_CAPA_LARGURA = 540;

const PREVIEW_ICONES_CATEGORIA = {
    filmes: "🎬",
    series: "📺",
    animes: "🍿",
    queremos: "✦"
};

const PREVIEW_TEXTO_VIDEO_PADRAO =
    "Ideal: MP4 (H.264), vertical, uns 720×1280, de 2 a 6 MB. " +
    "Arquivos pesados deixam o site lento no celular.";


// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function initPreviewAdmin() {

    const lista =
        document.getElementById("preview-lista");

    if (!lista) return;

    configurarEventosPreviewAdmin();

    if (!apiPreviewPronta()) {

        mostrarStatusPreview(
            "Faltam funções na API: savePreview, uploadVideoPreview e " +
            "uploadImagemPreview (veja o topo do preview-admin.js). " +
            "Dá pra ver a lista, mas ainda não dá pra salvar.",
            "erro",
            true
        );

    }

    await Promise.all([
        carregarAssistidosPreviewAdmin(),
        carregarPreviewAdmin()
    ]);

}

function apiPreviewPronta() {

    return (
        typeof API !== "undefined" &&
        typeof API.savePreview === "function" &&
        typeof API.uploadVideoPreview === "function" &&
        typeof API.uploadImagemPreview === "function"
    );

}


// =====================================================
// CARREGAR
// =====================================================

async function carregarPreviewAdmin() {

    try {

        let lista;

        if (typeof API !== "undefined" && typeof API.getPreview === "function") {

            lista = await API.getPreview();

        } else {

            const resposta =
                await fetch(
                    "../assets/data/preview.json",
                    { cache: "no-cache" }
                );

            lista = resposta.ok ? await resposta.json() : [];

        }

        previewItensAdmin =
            Array.isArray(lista) ? lista : [];

        ordenarPreviewAdmin();

        renderizarPreviewAdmin();

        if (apiPreviewPronta()) {

            mostrarStatusPreview(
                `${previewItensAdmin.length} vídeo(s) carregado(s).`,
                "sucesso"
            );

        }

    }

    catch (erro) {

        console.error(erro);

        mostrarStatusPreview(
            erro.message,
            "erro"
        );

    }

}

async function carregarAssistidosPreviewAdmin() {

    try {

        let lista;

        if (typeof API !== "undefined" && typeof API.getAssistidos === "function") {

            lista = await API.getAssistidos();

        } else {

            const resposta =
                await fetch(
                    "../assets/data/assistidos.json",
                    { cache: "no-cache" }
                );

            lista = resposta.ok ? await resposta.json() : [];

        }

        previewAssistidosAdmin =
            Array.isArray(lista) ? lista : [];

    }

    catch (erro) {

        console.error(erro);

        previewAssistidosAdmin = [];

    }

    preencherSelectAssistidosPreview();

}

// Mesma regra usada no site (preview.js)
function chaveAssistidoPreview(item) {

    return String(item.id ?? item.titulo);

}

function preencherSelectAssistidosPreview() {

    const select =
        document.getElementById("preview-assistido");

    if (!select) return;

    select.innerHTML =
        `<option value="">— Nenhum —</option>`;

    [...previewAssistidosAdmin]
        .sort((a, b) =>
            String(a.titulo).localeCompare(String(b.titulo), "pt-BR")
        )
        .forEach(item => {

            const opcao =
                document.createElement("option");

            opcao.value =
                chaveAssistidoPreview(item);

            opcao.textContent =
                `${PREVIEW_ICONES_CATEGORIA[item.categoria] || "•"} ` +
                `${item.titulo}${item.ano ? " (" + item.ano + ")" : ""}`;

            select.appendChild(opcao);

        });

}


// =====================================================
// ORDEM
// =====================================================

function ordenarPreviewAdmin() {

    previewItensAdmin.sort((a, b) => {

        const ordemA = Number(a.ordem) || Infinity;
        const ordemB = Number(b.ordem) || Infinity;

        return ordemA - ordemB;

    });

    renumerarPreviewAdmin();

}

function renumerarPreviewAdmin() {

    previewItensAdmin.forEach((item, indice) => {

        item.ordem = indice + 1;

    });

}


// =====================================================
// RENDER
// =====================================================

function renderizarPreviewAdmin() {

    const lista =
        document.getElementById("preview-lista");

    if (!lista) return;

    lista.innerHTML = "";

    previewItensAdmin.forEach((item, indice) => {

        lista.appendChild(
            criarItemPreviewAdmin(item, indice)
        );

    });

    if (!lista.children.length) {

        lista.innerHTML = `
            <div class="assistidos-admin-vazio">
                <span>▶</span>

                <h3>Nenhum vídeo ainda</h3>

                <p>
                    Adicione o primeiro edit pra ele aparecer
                    na página Preview.
                </p>
            </div>
        `;

    }

}

function criarItemPreviewAdmin(item, indice) {

    const elemento =
        document.createElement("div");

    elemento.className =
        "assistidos-admin-item";

    const imagem =
        item.capa
            ? `<img src="${resolverCaminhoPreviewAdmin(item.capa)}" alt="">`
            : `<div class="assistidos-sem-capa">▶</div>`;

    const titulo =
        item.titulo || "(sem título)";

    const associado =
        item.assistidoTitulo
            ? `${PREVIEW_ICONES_CATEGORIA[item.assistidoCategoria] || "•"} ${item.assistidoTitulo}`
            : "Sem item de Assistidos";

    const total =
        previewItensAdmin.length;

    elemento.innerHTML = `

        <div class="assistidos-admin-imagem">
            ${imagem}
        </div>


        <div class="assistidos-admin-info">

            <strong>
                ${escaparHTMLPreviewAdmin(titulo)}
            </strong>

            <span>
                ${escaparHTMLPreviewAdmin(associado)}
            </span>

            <div class="assistidos-admin-notas">

                <small>Posição ${indice + 1} de ${total}</small>

            </div>

        </div>


        <div class="assistidos-admin-acoes">

            <button
                type="button"
                data-subir="${escaparAtributoPreviewAdmin(item.id)}"
                title="Subir"
                ${indice === 0 ? "disabled" : ""}
            >
                ↑
            </button>

            <button
                type="button"
                data-descer="${escaparAtributoPreviewAdmin(item.id)}"
                title="Descer"
                ${indice === total - 1 ? "disabled" : ""}
            >
                ↓
            </button>

            <button
                type="button"
                data-editar="${escaparAtributoPreviewAdmin(item.id)}"
                title="Editar"
            >
                ✎
            </button>

            <button
                type="button"
                data-excluir="${escaparAtributoPreviewAdmin(item.id)}"
                title="Excluir"
            >
                🗑
            </button>

        </div>

    `;

    return elemento;

}

// O admin fica dentro de Admin/, então sobe um nível
function resolverCaminhoPreviewAdmin(caminho) {

    if (!caminho) return "";

    return `../${caminho}`;

}


// =====================================================
// EVENTOS
// =====================================================

function configurarEventosPreviewAdmin() {

    const por = id => document.getElementById(id);

    por("preview-novo")?.addEventListener(
        "click",
        () => abrirModalPreviewAdmin()
    );

    por("preview-sincronizar")?.addEventListener(
        "click",
        sincronizarPreviewAdmin
    );

    por("preview-modal-fechar")?.addEventListener(
        "click",
        fecharModalPreviewAdmin
    );

    por("preview-cancelar")?.addEventListener(
        "click",
        fecharModalPreviewAdmin
    );

    por("preview-form")?.addEventListener(
        "submit",
        salvarPreviewAdmin
    );

    por("preview-video")?.addEventListener(
        "change",
        aoEscolherVideoPreview
    );

    por("preview-capa")?.addEventListener(
        "change",
        aoEscolherCapaPreview
    );

    por("preview-quadro")?.addEventListener(
        "change",
        aoMudarQuadroPreview
    );


    // onclick (e não addEventListener no document) pra não
    // duplicar o clique se o painel for aberto mais de uma vez.

    const lista =
        por("preview-lista");

    if (lista) {

        lista.onclick = evento => {

            const pegar = atributo =>
                evento.target.closest(`[${atributo}]`)?.getAttribute(atributo);

            const editar = pegar("data-editar");
            const excluir = pegar("data-excluir");
            const subir = pegar("data-subir");
            const descer = pegar("data-descer");

            if (editar) editarPreviewAdmin(editar);
            if (excluir) excluirPreviewAdmin(excluir);
            if (subir) moverPreviewAdmin(subir, -1);
            if (descer) moverPreviewAdmin(descer, 1);

        };

    }

}


// =====================================================
// MODAL
// =====================================================

function abrirModalPreviewAdmin(item = null) {

    const modal =
        document.getElementById("preview-modal");

    if (!modal) return;

    limparArquivosPreviewAdmin();

    const por = id => document.getElementById(id);

    por("preview-modal-titulo").textContent =
        item ? "Editar vídeo" : "Adicionar vídeo";

    por("preview-id").value =
        item?.id || "";

    por("preview-titulo").value =
        item?.titulo || "";

    por("preview-assistido").value =
        item?.assistidoId || "";

    // Se o item associado não existe mais, o select fica em "Nenhum"
    if (por("preview-assistido").value !== String(item?.assistidoId || "")) {

        por("preview-assistido").value = "";

    }

    por("preview-posicao").max =
        String(Math.max(previewItensAdmin.length + (item ? 0 : 1), 1));

    por("preview-posicao").value =
        item
            ? String(item.ordem)
            : String(previewItensAdmin.length + 1);

    por("preview-video").value = "";
    por("preview-capa").value = "";

    por("preview-video-info").textContent =
        item
            ? `Vídeo atual: ${item.video}. Deixe vazio pra manter.`
            : PREVIEW_TEXTO_VIDEO_PADRAO;

    por("preview-bloco-quadro").style.display = "none";

    atualizarPreviewCapaAdmin(
        item?.capa
            ? resolverCaminhoPreviewAdmin(item.capa)
            : null
    );

    modal.classList.remove("oculto");

}

function fecharModalPreviewAdmin() {

    limparArquivosPreviewAdmin();

    document
        .getElementById("preview-modal")
        ?.classList.add("oculto");

}

function limparArquivosPreviewAdmin() {

    if (previewUrlLocal) {

        URL.revokeObjectURL(previewUrlLocal);

    }

    previewUrlLocal = null;
    previewVideoArquivo = null;
    previewCapaArquivo = null;
    previewCapaManual = false;
    previewDuracao = 0;
        previewLargura = 0;
    previewAltura = 0;

}

function atualizarPreviewCapaAdmin(url) {

    const caixa =
        document.getElementById("preview-capa-preview");

    if (!caixa) return;

    caixa.innerHTML =
        url
            ? `<img src="${escaparAtributoPreviewAdmin(url)}" alt="">`
            : "▶";

}


// =====================================================
// VÍDEO ESCOLHIDO — lê as medidas e gera a capa sozinho
// =====================================================

async function aoEscolherVideoPreview(evento) {

    const arquivo =
        evento.target.files[0];

    const info =
        document.getElementById("preview-video-info");

    if (previewUrlLocal) {

        URL.revokeObjectURL(previewUrlLocal);

        previewUrlLocal = null;

    }

    previewVideoArquivo =
        arquivo || null;

    if (!arquivo) {

        info.textContent = PREVIEW_TEXTO_VIDEO_PADRAO;

        document.getElementById("preview-bloco-quadro").style.display = "none";

        return;

    }

    previewUrlLocal =
        URL.createObjectURL(arquivo);

    try {

        const meta =
            await lerMetadadosVideoPreview(previewUrlLocal);

        previewDuracao = meta.duracao;
                previewLargura = meta.largura;
        previewAltura = meta.altura;

        const mb =
            arquivo.size / (1024 * 1024);

        const avisos = [];

        if (meta.largura >= meta.altura) {

            avisos.push("não é vertical");

        }

        if (meta.largura > 1080) {

            avisos.push("maior que 1080 de largura");

        }

        if (mb > PREVIEW_AVISO_MB) {

            avisos.push("arquivo pesado");

        }

        info.textContent =
            `${meta.largura}×${meta.altura} · ${mb.toFixed(1)} MB · ` +
            `${meta.duracao.toFixed(0)}s` +
            (avisos.length ? ` — atenção: ${avisos.join(", ")}.` : " — ok.");

        document.getElementById("preview-bloco-quadro").style.display = "";

        // Capa automática (a não ser que você já tenha enviado uma)

        if (!previewCapaManual) {

            const quadro =
                Number(document.getElementById("preview-quadro").value) || 10;

            await gerarCapaDoVideoPreview(quadro);

        }

    }

    catch (erro) {

        console.error(erro);

        info.textContent =
            "Não consegui ler esse vídeo aqui no navegador " +
            "(use MP4 com H.264). Dá pra enviar mesmo assim, mas " +
            "escolha a capa manualmente.";

    }

}

function lerMetadadosVideoPreview(url) {

    return new Promise((resolver, rejeitar) => {

        const video =
            document.createElement("video");

        video.preload = "metadata";
        video.muted = true;

        video.onloadedmetadata = () => {

            resolver({
                duracao: video.duration || 0,
                largura: video.videoWidth,
                altura: video.videoHeight
            });

        };

        video.onerror = () =>
            rejeitar(new Error("Vídeo ilegível."));

        video.src = url;

    });

}

async function aoMudarQuadroPreview(evento) {

    previewCapaManual = false;

    document.getElementById("preview-capa").value = "";

    await gerarCapaDoVideoPreview(Number(evento.target.value) || 0);

}

// percentual: 0 a 100 da duração
async function gerarCapaDoVideoPreview(percentual) {

    if (!previewUrlLocal) return;

    try {

        const tempo =
            Math.min(
                Math.max(previewDuracao * (percentual / 100), 0.1),
                Math.max(previewDuracao - 0.1, 0.1)
            );

        const blob =
            await capturarQuadroPreview(previewUrlLocal, tempo);

        previewCapaArquivo =
            new File(
                [blob],
                "capa.jpg",
                { type: "image/jpeg" }
            );

        atualizarPreviewCapaAdmin(
            URL.createObjectURL(blob)
        );

    }

    catch (erro) {

        console.error("Erro ao gerar a capa:", erro);

    }

}

function capturarQuadroPreview(url, tempo) {

    return new Promise((resolver, rejeitar) => {

        const video =
            document.createElement("video");

        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";

        video.onloadedmetadata = () => {

            video.currentTime = tempo;

        };

        video.onseeked = () => {

            try {

                const escala =
                    Math.min(1, PREVIEW_CAPA_LARGURA / video.videoWidth);

                const canvas =
                    document.createElement("canvas");

                canvas.width =
                    Math.round(video.videoWidth * escala);

                canvas.height =
                    Math.round(video.videoHeight * escala);

                canvas
                    .getContext("2d")
                    .drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(
                    blob =>
                        blob
                            ? resolver(blob)
                            : rejeitar(new Error("Falha ao criar a capa.")),
                    "image/jpeg",
                    0.82
                );

            } catch (erro) {

                rejeitar(erro);

            }

        };

        video.onerror = () =>
            rejeitar(new Error("Vídeo ilegível."));

        video.src = url;

    });

}


// =====================================================
// CAPA ENVIADA À MÃO
// =====================================================

function aoEscolherCapaPreview(evento) {

    const arquivo =
        evento.target.files[0];

    if (!arquivo) return;

    previewCapaArquivo = arquivo;

    previewCapaManual = true;

    atualizarPreviewCapaAdmin(
        URL.createObjectURL(arquivo)
    );

}


// =====================================================
// SALVAR
// =====================================================

async function salvarPreviewAdmin(evento) {

    evento.preventDefault();

    if (!apiPreviewPronta()) {

        alert(
            "A API ainda não tem as funções do Preview " +
            "(savePreview, uploadVideoPreview, uploadImagemPreview)."
        );

        return;

    }

    const por = id => document.getElementById(id);

    const id =
        por("preview-id").value.trim();

    const existente =
        previewItensAdmin.find(item => item.id === id);

    if (!existente && !previewVideoArquivo) {

        alert("Escolha o vídeo.");

        return;

    }


    // Avisos antes de enviar um arquivo ruim pro celular

    if (previewVideoArquivo) {

        const mb =
            previewVideoArquivo.size / (1024 * 1024);

        if (mb > PREVIEW_AVISO_MB) {

            const continuar =
                confirm(
                    `Esse vídeo tem ${mb.toFixed(0)} MB. Pesa muito no celular. ` +
                    "Enviar mesmo assim?"
                );

            if (!continuar) return;

        }

    }


    let video =
        existente?.video || "";

    let capa =
        existente?.capa || "";

    try {

        if (previewVideoArquivo) {

            mostrarStatusPreview("Enviando vídeo...", "info", true);

            const resultado =
                await API.uploadVideoPreview(previewVideoArquivo);

            video = resultado.caminho;

        }

        if (previewCapaArquivo) {

            mostrarStatusPreview("Enviando capa...", "info", true);

            const resultado =
                await API.uploadImagemPreview(previewCapaArquivo);

            capa = resultado.caminho;

        }

    }

    catch (erro) {

        console.error(erro);

        alert("Erro ao enviar arquivo: " + erro.message);

        mostrarStatusPreview(erro.message, "erro");

        return;

    }


    // Item de Assistidos associado (guarda também o título e a
    // categoria, pra o site mostrar a etiqueta sem buscar nada)

    const chave =
        por("preview-assistido").value;

    const associado =
        chave
            ? previewAssistidosAdmin.find(
                item => chaveAssistidoPreview(item) === chave
            )
            : null;


    const novoItem = {

        id:
            id ||
            gerarIdUnicoPreviewAdmin(
                criarSlugPreviewAdmin(por("preview-titulo").value) ||
                `video-${Date.now()}`
            ),

        titulo:
            por("preview-titulo").value.trim(),

        video,

        capa,
                largura:
            previewVideoArquivo ? previewLargura : (existente?.largura || 0),

        altura:
            previewVideoArquivo ? previewAltura : (existente?.altura || 0),

        duracao:
            previewVideoArquivo ? Math.round(previewDuracao) : (existente?.duracao || 0),

        assistidoId:
            associado ? chaveAssistidoPreview(associado) : "",

        assistidoTitulo:
            associado ? associado.titulo : "",

        assistidoCategoria:
            associado ? associado.categoria : ""

    };


    // Posição escolhida: tira o item da lista (se já existia) e
    // coloca de novo no lugar pedido.

    previewItensAdmin =
        previewItensAdmin.filter(item => item.id !== novoItem.id);

    const posicao =
        Math.min(
            Math.max(Number(por("preview-posicao").value) || previewItensAdmin.length + 1, 1),
            previewItensAdmin.length + 1
        );

    previewItensAdmin.splice(posicao - 1, 0, novoItem);

    renumerarPreviewAdmin();


    try {

        await API.savePreview(previewItensAdmin);

        fecharModalPreviewAdmin();

        renderizarPreviewAdmin();

        mostrarStatusPreview(
            "Vídeo salvo com sucesso.",
            "sucesso"
        );

    }

    catch (erro) {

        console.error(erro);

        alert(erro.message);

        // Recarrega do disco pra não ficar com uma lista que não foi gravada
        await carregarPreviewAdmin();

    }

}


// =====================================================
// EDITAR / EXCLUIR / MOVER
// =====================================================

function editarPreviewAdmin(id) {

    const item =
        previewItensAdmin.find(item => item.id === id);

    if (!item) return;

    abrirModalPreviewAdmin(item);

}

async function excluirPreviewAdmin(id) {

    const item =
        previewItensAdmin.find(item => item.id === id);

    if (!item) return;

    if (!apiPreviewPronta()) {

        alert("A API ainda não tem savePreview.");

        return;

    }

    const confirmar =
        confirm(
            `Remover "${item.titulo || "este vídeo"}" do Preview?\n\n` +
            "Os arquivos (vídeo e capa) continuam na pasta do site; " +
            "só saem da página."
        );

    if (!confirmar) return;

    previewItensAdmin =
        previewItensAdmin.filter(i => i.id !== id);

    renumerarPreviewAdmin();

    try {

        await API.savePreview(previewItensAdmin);

        renderizarPreviewAdmin();

        mostrarStatusPreview("Vídeo removido.", "sucesso");

    }

    catch (erro) {

        alert(erro.message);

        await carregarPreviewAdmin();

    }

}

async function moverPreviewAdmin(id, direcao) {

    const indice =
        previewItensAdmin.findIndex(item => item.id === id);

    const destino =
        indice + direcao;

    if (indice < 0 || destino < 0 || destino >= previewItensAdmin.length) return;

    if (!apiPreviewPronta()) {

        alert("A API ainda não tem savePreview.");

        return;

    }

    [previewItensAdmin[indice], previewItensAdmin[destino]] =
        [previewItensAdmin[destino], previewItensAdmin[indice]];

    renumerarPreviewAdmin();

    renderizarPreviewAdmin();

    try {

        await API.savePreview(previewItensAdmin);

        mostrarStatusPreview("Ordem atualizada.", "sucesso");

    }

    catch (erro) {

        alert(erro.message);

        await carregarPreviewAdmin();

    }

}


// =====================================================
// SINCRONIZAR
// =====================================================

async function sincronizarPreviewAdmin() {

    const botao =
        document.getElementById("preview-sincronizar");

    if (!apiPreviewPronta()) {

        alert("A API ainda não tem savePreview.");

        return;

    }

    if (botao) {

        botao.disabled = true;

        botao.textContent = "🔄 Sincronizando...";

    }

    try {

        await API.savePreview(previewItensAdmin);

        mostrarStatusPreview(
            "✓ Sincronizado! O Preview foi gravado no site.",
            "sucesso"
        );

    }

    catch (erro) {

        console.error(erro);

        mostrarStatusPreview(erro.message, "erro");

    }

    finally {

        if (botao) {

            botao.disabled = false;

            botao.textContent = "🔄 Sincronizar com o site";

        }

    }

}


// =====================================================
// STATUS
// =====================================================

function mostrarStatusPreview(mensagem, tipo, fixo = false) {

    const status =
        document.getElementById("preview-status");

    if (!status) return;

    status.textContent = mensagem;

    status.className =
        `assistidos-status ${tipo}`;

    clearTimeout(mostrarStatusPreview.timer);

    if (fixo) return;

    mostrarStatusPreview.timer =
        setTimeout(() => {

            status.textContent = "";

            status.className = "assistidos-status";

        }, 4000);

}


// =====================================================
// UTILIDADES
// =====================================================

function gerarIdUnicoPreviewAdmin(base) {

    let candidato = base;

    let contador = 2;

    while (previewItensAdmin.some(item => item.id === candidato)) {

        candidato = `${base}-${contador}`;

        contador++;

    }

    return candidato;

}

function criarSlugPreviewAdmin(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

}

function escaparHTMLPreviewAdmin(texto) {

    const div =
        document.createElement("div");

    div.textContent = texto || "";

    return div.innerHTML;

}

function escaparAtributoPreviewAdmin(texto) {

    return escaparHTMLPreviewAdmin(String(texto ?? "")).replace(/"/g, "&quot;");

}


window.initPreviewAdmin = initPreviewAdmin;