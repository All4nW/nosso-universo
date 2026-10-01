// =====================================================
// NOSSO FUTURO — ÁRVORE DE SONHOS
// =====================================================

const CATEGORIAS_SONHOS = {
    nos: { label: "Nós dois", emoji: "💍" },
    familia: { label: "Nossa família", emoji: "👨‍👩‍👧‍👦" },
    vida: { label: "Nossa vida", emoji: "🏠" },
    lugares: { label: "Nossos lugares", emoji: "✈️" },
    bobos: { label: "Sonhos bobos", emoji: "🎮" },
    umdia: { label: "Um dia...", emoji: "✨" }
};

const STATUS_SONHOS = {
    sonhando: { label: "Sonhando", icone: "♡" },
    caminho: { label: "A caminho", icone: "✦" },
    vivido: { label: "Vivido", icone: "✓" },
    reimaginado: { label: "Reimaginado", icone: "↻" }
};

let sonhosCarregados = [];
let sonhosPorCategoria = {};
let paginaAtual = 0;
let totalPaginas = 1;


// =====================================================
// CARREGAR
// =====================================================

async function carregarFuturo() {

    const container =
        document.getElementById("futuro-sonhos");

    if (!container) return;

    try {

        const resposta =
            await fetch("assets/data/future.json", { cache: "no-cache" });

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar future.json.");
        }

        sonhosCarregados = await resposta.json();

    } catch (erro) {

        console.error("Erro ao carregar sonhos:", erro);
        sonhosCarregados = [];

    }

    agruparPorCategoria();

    paginaAtual = 0;

    renderizarPagina();

}


// =====================================================
// AGRUPAR SONHOS POR CATEGORIA
// =====================================================

function agruparPorCategoria() {

    sonhosPorCategoria = {};

    sonhosCarregados.forEach((sonho) => {

        if (!sonhosPorCategoria[sonho.categoria]) {
            sonhosPorCategoria[sonho.categoria] = [];
        }

        sonhosPorCategoria[sonho.categoria].push(sonho);

    });

    const tamanhos =
        Object.values(sonhosPorCategoria).map((lista) => lista.length);

    totalPaginas =
        tamanhos.length ? Math.max(...tamanhos) : 1;

}


// =====================================================
// RENDERIZAR A PÁGINA ATUAL (um sonho por galho)
// =====================================================

function renderizarPagina() {

    const container =
        document.getElementById("futuro-sonhos");

    if (!container) return;

    container.innerHTML = "";

    let indiceGlobal = 0;

    Object.keys(CATEGORIAS_SONHOS).forEach((categoria) => {

        const lista =
            sonhosPorCategoria[categoria];

        if (!lista || !lista.length) return;

        const sonho =
            lista[paginaAtual % lista.length];

        const zona =
            document.querySelector(
                `.futuro-zona[data-categoria="${categoria}"]`
            );

        if (!zona) return;

        container.appendChild(
            criarNuvemSonho(sonho, zona, indiceGlobal)
        );

        indiceGlobal++;

    });

    atualizarControlesDePagina();

}


// =====================================================
// SETAS GLOBAIS E INDICADOR DE PÁGINA
// =====================================================

function atualizarControlesDePagina() {

    const setaEsq = document.getElementById("futuro-seta-esq");
    const setaDir = document.getElementById("futuro-seta-dir");
    const indicador = document.getElementById("futuro-pagina-indicador");

    const mostrarControles = totalPaginas > 1;

    setaEsq?.classList.toggle("oculto", !mostrarControles);
    setaDir?.classList.toggle("oculto", !mostrarControles);

    if (indicador) {
        indicador.textContent = mostrarControles
            ? `${(paginaAtual % totalPaginas) + 1} / ${totalPaginas}`
            : "";
    }

}

function irParaPagina(delta) {

    if (totalPaginas <= 1) return;

    paginaAtual =
        (paginaAtual + delta + totalPaginas) % totalPaginas;

    renderizarPagina();

}


// =====================================================
// CRIAR NUVEM (SONHO)
// =====================================================

function criarNuvemSonho(sonho, zona, indice) {

    const zx = zona.style.getPropertyValue("--zx");
    const zy = zona.style.getPropertyValue("--zy");

    const info =
        CATEGORIAS_SONHOS[sonho.categoria] ||
        { emoji: "☁️", label: sonho.categoria };

    const statusInfo =
        STATUS_SONHOS[sonho.status] ||
        STATUS_SONHOS.sonhando;

    const nuvem =
        document.createElement("div");

    nuvem.className =
        `futuro-nuvem futuro-nuvem-status-${sonho.status || "sonhando"}`;

    nuvem.style.setProperty("--nx", zx);
    nuvem.style.setProperty("--ny", zy);
    nuvem.style.setProperty("--delay", `${(indice * 0.18).toFixed(2)}s`);
    nuvem.style.setProperty("--float-delay", `${(indice * 0.5).toFixed(2)}s`);

    const fotoHtml = sonho.imagem
        ? `
            <span class="futuro-nuvem-foto">
                <img src="${sonho.imagem}" alt="" onerror="this.closest('.futuro-nuvem-foto').remove()">
            </span>
        `
        : "";

    nuvem.innerHTML = `
        <button type="button" class="futuro-nuvem-conteudo">
            <span class="futuro-nuvem-texto">
                <span class="futuro-nuvem-cabecalho">
                    <span class="futuro-nuvem-emoji">${info.emoji}</span>
                    <span class="futuro-nuvem-titulo">${sonho.titulo || ""}</span>
                </span>
                ${sonho.frase ? `<span class="futuro-nuvem-frase">${sonho.frase}</span>` : ""}
                <span class="futuro-nuvem-status">${statusInfo.icone} ${statusInfo.label}</span>
            </span>
            ${fotoHtml}
        </button>
    `;

    nuvem
        .querySelector(".futuro-nuvem-conteudo")
        .addEventListener("click", () => abrirSonho(sonho));

    return nuvem;

}


// =====================================================
// LEGENDA DE STATUS
// =====================================================

function renderizarLegenda() {

    const legenda =
        document.getElementById("futuro-legenda");

    if (!legenda) return;

    legenda.innerHTML =
        Object.values(STATUS_SONHOS)
            .map((info) => `
                <span class="futuro-legenda-item">
                    <i class="futuro-legenda-icone">${info.icone}</i>
                    ${info.label}
                </span>
            `)
            .join("");

}


// =====================================================
// ABRIR / FECHAR CARTÃO DO SONHO
// =====================================================

function abrirSonho(sonho) {

    const overlay =
        document.getElementById("sonho-aberto-overlay");

    if (!overlay) return;

    const info =
        CATEGORIAS_SONHOS[sonho.categoria] ||
        { emoji: "☁️", label: sonho.categoria };

    const statusInfo =
        STATUS_SONHOS[sonho.status] ||
        STATUS_SONHOS.sonhando;

    const fotoEl =
        document.getElementById("sonho-aberto-foto");

    if (fotoEl) {
        if (sonho.imagem) {
            fotoEl.src = sonho.imagem;
            fotoEl.style.display = "block";
        } else {
            fotoEl.removeAttribute("src");
            fotoEl.style.display = "none";
        }
    }

    document.getElementById("sonho-aberto-categoria").textContent =
        `${info.emoji} ${info.label}`;

    document.getElementById("sonho-aberto-status").textContent =
        `${statusInfo.icone} ${statusInfo.label}`;

    document.getElementById("sonho-aberto-titulo").textContent =
        sonho.titulo || "";

    document.getElementById("sonho-aberto-frase").textContent =
        sonho.frase ? `“${sonho.frase}”` : "";

    document.getElementById("sonho-aberto-descricao").textContent =
        sonho.descricao || "";

    const datasEl =
        document.getElementById("sonho-aberto-datas");

    let textoDatas = "";

    if (sonho.dataCriacao) {
        textoDatas += `Sonho criado em ${formatarDataSonho(sonho.dataCriacao)}`;
    }

    if (sonho.dataRealizacao) {
        textoDatas += textoDatas
            ? ` · Realizado em ${formatarDataSonho(sonho.dataRealizacao)}`
            : `Realizado em ${formatarDataSonho(sonho.dataRealizacao)}`;
    }

    datasEl.textContent = textoDatas;

    overlay.classList.remove("oculto");
    document.body.classList.add("modal-aberto");

}

function fecharSonho() {

    const overlay =
        document.getElementById("sonho-aberto-overlay");

    overlay?.classList.add("oculto");

    document.body.classList.remove("modal-aberto");

}


// =====================================================
// FORMATAR DATA (mês/ano, mais poético que dia exato)
// =====================================================

function formatarDataSonho(dataString) {

    if (!dataString) return "";

    const data =
        new Date(dataString + "T00:00:00");

    return data.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

}


// =====================================================
// EVENTOS FIXOS (setas, cartão, indicador)
// =====================================================

document
    .getElementById("futuro-seta-esq")
    ?.addEventListener("click", () => irParaPagina(-1));

document
    .getElementById("futuro-seta-dir")
    ?.addEventListener("click", () => irParaPagina(1));

document
    .getElementById("sonho-aberto-fechar")
    ?.addEventListener("click", fecharSonho);

document
    .getElementById("sonho-aberto-overlay")
    ?.addEventListener("click", (evento) => {
        if (evento.target.id === "sonho-aberto-overlay") {
            fecharSonho();
        }
    });


// =====================================================
// RETOCAR A ANIMAÇÃO DE ENTRADA TODA VEZ QUE VOLTAR A
// #futuro (o site é uma SPA — sem isso, os balões só
// animariam na primeira vez que a página carregasse)
// =====================================================

window.addEventListener("hashchange", () => {
    if (window.location.hash === "#futuro") {
        paginaAtual = 0;
        renderizarPagina();
    }
});


// =====================================================
// INICIAR
// =====================================================

renderizarLegenda();
carregarFuturo();