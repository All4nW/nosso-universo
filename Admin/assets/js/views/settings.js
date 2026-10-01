let configuracoesOriginais = {};


async function initSettings() {

    try {

        registrarBotoes();

        // Música
        iniciarGerenciadorMusicas();

        // Cards do Hub
        iniciarGerenciadorHub();

    }

    catch (erro) {

        console.error(erro);

        alert("Erro ao carregar configurações.");

    }

}



function atualizarHex(input, elemento) {

    elemento.textContent =
        input.value.toUpperCase();

}



function registrarBotoes() {

    const salvar =
        document.getElementById("btn-salvar-settings");

    const cancelar =
        document.getElementById("btn-cancelar-settings");


    if (salvar) {

        salvar.onclick =
            salvarConfiguracoes;

    }


    if (cancelar) {

        cancelar.onclick =
            cancelarConfiguracoes;

    }

}



async function salvarConfiguracoes() {

    const dados = {

        corPrincipal:
            document.getElementById(
                "campo-cor-destaque"
            ).value,

        corFundo:
            document.getElementById(
                "campo-cor-fundo"
            ).value

    };


    try {

        await API.saveSettings(dados);

        configuracoesOriginais = {
            ...dados
        };

        alert("❤️ Configurações salvas com sucesso!");

    }

    catch (erro) {

        console.error(erro);

        alert("Erro ao salvar configurações.");

    }

}



function cancelarConfiguracoes() {

    const corDestaque =
        document.getElementById("campo-cor-destaque");

    const corFundo =
        document.getElementById("campo-cor-fundo");


    corDestaque.value =
        configuracoesOriginais.corPrincipal;

    corFundo.value =
        configuracoesOriginais.corFundo;


    atualizarHex(
        corDestaque,
        document.getElementById("valor-cor-destaque")
    );


    atualizarHex(
        corFundo,
        document.getElementById("valor-cor-fundo")
    );

}



// ======================================================
// ======================================================
// GERENCIADOR DE MÚSICAS (conectado à API)
// ======================================================
// ======================================================

let musicasAdmin = [];
let musicaEditandoId = null;
let musicaArquivoSelecionado = null;
let musicaDragId = null;


// ======================================================
// INIT
// ======================================================

function iniciarGerenciadorMusicas() {

    carregarMusicas();


    const area =
        document.getElementById("area-upload-musica");

    const input =
        document.getElementById("input-musica");


    if (area && input) {

        area.addEventListener("click", () => {
            input.click();
        });


        input.addEventListener("change", (event) => {

            const arquivo =
                event.target.files[0];

            if (!arquivo) return;

            musicaArquivoSelecionado =
                arquivo;

            musicaEditandoId =
                null;

            abrirFormularioMusica(
                arquivo.name.replace(/\.[^/.]+$/, "")
            );

        });


    const sincronizar =
        document.getElementById("btn-sincronizar-musicas");

    if (sincronizar) {

        sincronizar.onclick = sincronizarMusicas;

    }
    }


    const cancelar =
        document.getElementById("musica-btn-cancelar");

    const salvar =
        document.getElementById("musica-btn-salvar");


    if (cancelar) cancelar.onclick = fecharFormularioMusica;
    if (salvar) salvar.onclick = salvarMusica;


    const lista =
        document.getElementById("lista-musicas");


    if (lista) {

        lista.addEventListener("click", (event) => {

            const botao =
                event.target.closest("[data-acao]");

            if (!botao) return;

            const id =
                botao.dataset.id;

            if (botao.dataset.acao === "editar") {
                editarMusica(id);
            }

            if (botao.dataset.acao === "excluir") {
                excluirMusica(id);
            }

            if (botao.dataset.acao === "tocar") {
                tocarPreviaMusica(id, botao);
            }

        });

    }

}


// ======================================================
// API - CARREGAR
// ======================================================

async function carregarMusicas() {

    try {

        const resposta =
            await fetch("http://localhost:3000/api/music?admin=true");

        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status}`);
        }

        musicasAdmin =
            await resposta.json();

        renderizarMusicas();

    }

    catch (erro) {

        console.error("[MUSICAS ADMIN] Erro ao carregar:", erro);

        const lista =
            document.getElementById("lista-musicas");

        if (lista) {

            lista.innerHTML = `
                <div class="musicas-vazia">
                    ❌
                    <p>Não foi possível carregar as músicas.</p>
                </div>
            `;

        }

    }

}


// ======================================================
// RENDER
// ======================================================

function renderizarMusicas() {

    const lista =
        document.getElementById("lista-musicas");

    const contador =
        document.getElementById("contador-musicas");

    if (!lista) return;


    if (contador) {

        contador.textContent =
            `${musicasAdmin.length} ${musicasAdmin.length === 1 ? "música" : "músicas"}`;

    }


    if (!musicasAdmin.length) {

        lista.innerHTML = `
            <div class="musicas-vazia">
                🎵
                <p>Nenhuma música adicionada ainda.</p>
            </div>
        `;

        return;

    }


    lista.innerHTML = "";


    musicasAdmin.forEach((item) => {

        const el =
            document.createElement("div");

        el.className = "musica-item";
        el.dataset.id = item.id;

        el.innerHTML = `

            <div class="timeline-admin-arrastar">⋮⋮</div>

            <div class="musica-item-info">

                <span class="musica-item-nome">
                    ${escaparHtmlMusica(item.titulo)}
                </span>

<span class="musica-item-duracao">
    Início: ${formatarSegundos(item.inicioSegundos)}
    ${item.fimSegundos ? `• Fim: ${formatarSegundos(item.fimSegundos)}` : ""} •
    Volume: ${item.volume}% •
    ${item.ativo ? "Ativa" : "Oculta"}
</span>

            </div>

            <div class="musica-item-acoes">

                <button class="musica-item-botao" type="button" data-acao="tocar" data-id="${item.id}">▶</button>
                <button class="musica-item-botao" type="button" data-acao="editar" data-id="${item.id}">✎</button>
                <button class="musica-item-botao" type="button" data-acao="excluir" data-id="${item.id}">🗑</button>

            </div>

        `;

        adicionarEventosDragMusica(el);

        lista.appendChild(el);

    });

}


// ======================================================
// FORMULÁRIO
// ======================================================

function abrirFormularioMusica(tituloSugerido) {

    document.getElementById("musica-titulo").value = tituloSugerido || "";
    document.getElementById("musica-inicio").value = 0;
    document.getElementById("musica-fim").value = 0;
    document.getElementById("musica-ativa").checked = true;

    document.getElementById("musica-arquivo-atual").innerHTML =
        musicaArquivoSelecionado
            ? `Arquivo selecionado: ${musicaArquivoSelecionado.name}`
            : "";

    const preview = document.getElementById("musica-audio-preview");

    if (musicaArquivoSelecionado) {
        preview.src = URL.createObjectURL(musicaArquivoSelecionado);
    } else {
        preview.src = "";
    }

    document.getElementById("musica-formulario").style.display = "block";

}


function fecharFormularioMusica() {

    musicaEditandoId = null;
    musicaArquivoSelecionado = null;

    document.getElementById("musica-formulario").style.display = "none";
    document.getElementById("input-musica").value = "";

}


function editarMusica(id) {

    const item = musicasAdmin.find((m) => m.id === id);
    if (!item) return;

    musicaEditandoId = id;
    musicaArquivoSelecionado = null;

    document.getElementById("musica-titulo").value = item.titulo;
    document.getElementById("musica-inicio").value = item.inicioSegundos;
    document.getElementById("musica-fim").value = item.fimSegundos || 0;
    document.getElementById("musica-ativa").checked = Boolean(item.ativo);

    document.getElementById("musica-arquivo-atual").innerHTML =
        `Arquivo atual mantido (escolha um novo arquivo acima só se quiser trocar).`;

    const preview = document.getElementById("musica-audio-preview");
    preview.src = `http://localhost:3000${item.arquivo}`;

    document.getElementById("musica-formulario").style.display = "block";

}


// ======================================================
// SALVAR
// ======================================================

async function salvarMusica() {

    const titulo =
        document.getElementById("musica-titulo").value.trim();

    if (!titulo) {
        alert("Digite o nome da música.");
        return;
    }

    if (!musicaEditandoId && !musicaArquivoSelecionado) {
        alert("Escolha um arquivo de áudio.");
        return;
    }


    const formulario = new FormData();

    formulario.append("titulo", titulo);
    formulario.append("ativo", document.getElementById("musica-ativa").checked);
    formulario.append("inicioSegundos", document.getElementById("musica-inicio").value);
    formulario.append("fimSegundos", document.getElementById("musica-fim").value);

    if (musicaArquivoSelecionado) {
        formulario.append("arquivo", musicaArquivoSelecionado);
    }


    try {

        let url = "http://localhost:3000/api/music";
        let metodo = "POST";

        if (musicaEditandoId) {
            url += `/${musicaEditandoId}`;
            metodo = "PUT";
        }

        const resposta =
            await fetch(url, { method: metodo, body: formulario });

        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status}`);
        }

        fecharFormularioMusica();
        await carregarMusicas();

    }

    catch (erro) {

        console.error("[MUSICAS ADMIN] Erro ao salvar:", erro);
        alert("❌ Não foi possível salvar a música.");

    }

}


// ======================================================
// EXCLUIR
// ======================================================

async function excluirMusica(id) {

    const item =
        musicasAdmin.find((m) => m.id === id);

    if (!item) return;

    if (!confirm(`Excluir "${item.titulo}"?`)) return;

    try {

        const resposta =
            await fetch(`http://localhost:3000/api/music/${id}`, { method: "DELETE" });

        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status}`);
        }

        await carregarMusicas();

    }

    catch (erro) {

        console.error("[MUSICAS ADMIN] Erro ao excluir:", erro);
        alert("Erro ao excluir música.");

    }

}


// ======================================================
// PRÉVIA (tocar/pausar dentro do admin)
// ======================================================

let audioPreviaAtual = null;

function tocarPreviaMusica(id, botao) {

    const item = musicasAdmin.find((m) => m.id === id);
    if (!item) return;

    if (audioPreviaAtual && !audioPreviaAtual.paused) {
        audioPreviaAtual.pause();
        audioPreviaAtual = null;
        botao.textContent = "▶";
        return;
    }

    audioPreviaAtual = new Audio(`http://localhost:3000${item.arquivo}`);
    audioPreviaAtual.currentTime = item.inicioSegundos || 0;
    audioPreviaAtual.volume = (item.volume || 80) / 100;
    audioPreviaAtual.play();

    botao.textContent = "⏸";

    if (item.fimSegundos > 0) {

        audioPreviaAtual.addEventListener("timeupdate", () => {

            if (audioPreviaAtual.currentTime >= item.fimSegundos) {
                audioPreviaAtual.pause();
                botao.textContent = "▶";
            }

        });

    }

    audioPreviaAtual.addEventListener("ended", () => {
        botao.textContent = "▶";
    });

}


// ======================================================
// DRAG & DROP (mesmo padrão da Timeline)
// ======================================================

function adicionarEventosDragMusica(elemento) {

    // Só permite arrastar quando o clique começa na alcinha (⋮⋮),
    // evitando que o navegador confunda cliques nos botões com um arraste.
    elemento.draggable = false;

    const alcinha =
        elemento.querySelector(".timeline-admin-arrastar");

    if (alcinha) {

        alcinha.addEventListener("mousedown", () => {
            elemento.draggable = true;
        });

        elemento.addEventListener("dragend", () => {
            elemento.draggable = false;
        });

    }


    elemento.addEventListener("dragstart", () => {
        musicaDragId = elemento.dataset.id;
        elemento.classList.add("timeline-admin-dragging");
    });

    elemento.addEventListener("dragend", () => {
        elemento.classList.remove("timeline-admin-dragging");
        musicaDragId = null;
    });

    elemento.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (musicaDragId && musicaDragId !== elemento.dataset.id) {
            elemento.classList.add("timeline-admin-drag-over");
        }
    });

    elemento.addEventListener("dragleave", (event) => {
        event.currentTarget.classList.remove("timeline-admin-drag-over");
    });

    elemento.addEventListener("drop", async (event) => {

        event.preventDefault();

        const destino = event.currentTarget;
        destino.classList.remove("timeline-admin-drag-over");

        if (!musicaDragId || musicaDragId === destino.dataset.id) return;

        const lista = document.getElementById("lista-musicas");
        const arrastado = lista.querySelector(`[data-id="${CSS.escape(musicaDragId)}"]`);

        if (!arrastado) return;

        const todos = [...lista.children];
        const indiceArrastado = todos.indexOf(arrastado);
        const indiceDestino = todos.indexOf(destino);

        if (indiceArrastado < indiceDestino) {
            destino.after(arrastado);
        } else {
            destino.before(arrastado);
        }

        await salvarNovaOrdemMusicas();

    });

}


async function salvarNovaOrdemMusicas() {

    const itens = [...document.querySelectorAll(".musica-item")];
    const ids = itens.map((item) => item.dataset.id);

    try {

        const resposta = await fetch(
            "http://localhost:3000/api/music/reordenar",
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids })
            }
        );

        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        musicasAdmin = ids.map((id) => musicasAdmin.find((m) => m.id === id));

    }

    catch (erro) {

        console.error("[MUSICAS ADMIN] Erro ao reordenar:", erro);
        alert("Não foi possível salvar a nova ordem.");
        await carregarMusicas();

    }

}


// ======================================================
// UTILITÁRIOS
// ======================================================

function formatarSegundos(segundos) {

    segundos = Number(segundos) || 0;

    const min = Math.floor(segundos / 60);
    const seg = String(segundos % 60).padStart(2, "0");

    return `${min}:${seg}`;

}


function escaparHtmlMusica(texto) {

    return String(texto || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
// ======================================================
// SINCRONIZAR COM O SITE
// ======================================================

async function sincronizarMusicas() {

    try {

        const resposta =
            await fetch("http://localhost:3000/api/music/exportar");

        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        const resultado = await resposta.json();

        alert(
            `✅ Músicas sincronizadas! ${resultado.quantidade} exportadas.\n\nAgora é só fazer o commit/push para publicar.`
        );

    }

    catch (erro) {

        console.error("[MUSICAS ADMIN] Erro ao sincronizar:", erro);
        alert("❌ Não foi possível sincronizar com o site.");

    }

}

window.initSettings = initSettings;