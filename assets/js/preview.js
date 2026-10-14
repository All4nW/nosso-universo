// =====================================================
// NOSSO UNIVERSO — PREVIEW
// Feed de edits em zigue-zague, com o tamanho de cada vídeo
// adaptado à proporção dele (vertical, quadrado ou horizontal).
// Vive dentro da página de Assistidos, como a aba "Preview".
// O preview.json só é buscado quando a aba é aberta pela
// primeira vez (a aba Assistidos continua tão leve quanto era).
//
// Pensado pro celular:
//  - a lista é desenhada em lotes (não cria tudo de uma vez);
//  - cada item mostra só a capa; o <video> só existe quando o
//    item está perto da tela (preload="none": nenhum byte do
//    vídeo é baixado até a pessoa tocar);
//  - longe da tela o <video> é destruído (libera memória);
//  - só um vídeo toca por vez, e sai da tela = pausa;
//  - nada começa sozinho.
//
// Tudo está dentro de uma função anônima pra não esbarrar
// nos nomes de assistidos.js / cartas.js.
// =====================================================

(function () {

    "use strict";


    // =================================================
    // AJUSTES
    // =================================================

    const CAMINHO_PREVIEW = "assets/data/preview.json";
    const CAMINHO_ASSISTIDOS = "assets/data/assistidos.json";

    // Quantos itens entram na página por vez
    const TAMANHO_LOTE = 8;

    // Proporção padrão (vídeo vertical 9:16), usada até o site descobrir
    // a proporção real de cada vídeo.
    const RAZAO_BASE = 9 / 16;

    // Ritmo do mural (grade de 12 colunas): a cada 7 vídeos a composição
    // se repete, espelhada de um ciclo pro outro.
    // [variante, coluna inicial, largura em colunas, desnível em px]
    const RITMO = [
        ["destaque", 1, 7, 0],
        ["medio",    8, 5, 44],
        ["compacto", 1, 6, 0],
        ["compacto", 7, 6, 36],
        ["pequeno",  1, 4, 0],
        ["pequeno",  5, 4, 26],
        ["pequeno",  9, 4, 8]
    ];

    // Composição pra tablet e celular (grade de 6 colunas), em ciclos de 8:
    // [variante, colunas ocupadas, colunas ocupadas nas telas bem estreitas]
    // O destaque ocupa a linha toda; os outros ficam 2 por linha e os
    // pequenos 3 (ou 2, nas telas bem estreitas).
    const RITMO_COMPACTO = [
        ["destaque", 6, 6],
        ["medio",    3, 3],
        ["compacto", 3, 3],
        ["pequeno",  2, 3],
        ["pequeno",  2, 3],
        ["pequeno",  2, 3],
        ["medio",    3, 3],
        ["compacto", 3, 3]
    ];

    // Composição do celular: cada categoria é uma fileira que desliza de lado.
    // O primeiro cartão de cada fileira é um destaque; os outros alternam
    // entre médios e pequenos (assim cabem 2 ou 3 na tela de cada vez).
    // [variante, largura em vw, desnível em px]: tamanhos e alturas variados,
    // pra fileira não virar "1 grandão e vários iguais".
    const RITMO_CARROSSEL = [
        ["destaque", 66, 0],
        ["pequeno",  34, 28],
        ["medio",    46, 8],
        ["pequeno",  30, 36],
        ["medio",    54, 0],
        ["pequeno",  36, 22],
        ["pequeno",  28, 40]
    ];

    // As fileiras do celular, na ordem em que aparecem
    const SECOES_CARROSSEL = [
        { chave: "filmes", titulo: "Filmes" },
        { chave: "series", titulo: "Séries" },
        { chave: "animes", titulo: "Animes" },
        { chave: "queremos", titulo: "Queremos ver" },
        { chave: "outros", titulo: "Outros" }
    ];

    // Larguras (px) onde o layout muda
    const LIMITE_CELULAR = 760;
    const LIMITE_TABLET = 1100;

    const RITMO_ESPELHADO = [
        ["destaque", 6, 7, 0],
        ["medio",    1, 5, 44],
        ["compacto", 7, 6, 0],
        ["compacto", 1, 6, 36],
        ["pequeno",  9, 4, 0],
        ["pequeno",  5, 4, 26],
        ["pequeno",  1, 4, 8]
    ];

    // "larga" (computador): grade de 12 colunas; "compacta" (tablet): grade de
    // 6 colunas; "carrossel" (celular): fileiras que deslizam de lado.
    function modoDeLayout() {

        const largura =
            window.innerWidth;

        if (largura <= LIMITE_CELULAR) return "carrossel";

        if (largura <= LIMITE_TABLET) return "compacta";

        return "larga";

    }

    // Quão antes de aparecer o item "monta" o vídeo / entra o próximo lote
    const MARGEM_MONTAR = "500px 0px";
    const MARGEM_PROXIMO_LOTE = "800px 0px";

    const ROTULOS_CATEGORIA = {
        filmes: "Filme",
        series: "Série",
        animes: "Anime",
        queremos: "Queremos ver"
    };

    const GLIFOS_CORACAO = ["♡", "♡", "♥"];

    // Fontes do mural (títulos serifados + textos): só são buscadas
    // quando a pessoa chega na aba Preview.
    const URL_FONTES =
        "https://fonts.googleapis.com/css2" +
        "?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500" +
        "&family=DM+Sans:wght@400;500;600" +
        "&family=Caveat:wght@500;600;700&display=swap";

    const FILTROS = [
        {
            chave: "todos",
            rotulo: "Todos",
            icone: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z"/></svg>`
        },
        {
            chave: "filmes",
            rotulo: "Filmes",
            icone: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4"/></svg>`
        },
        {
            chave: "series",
            rotulo: "Séries",
            icone: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 21h8M12 18v3"/></svg>`
        },
        {
            chave: "animes",
            rotulo: "Animes",
            icone: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`
        }
    ];


    // =================================================
    // DESENHINHOS DE FUNDO (cinema) e a lua
    // =================================================

    const DOODLES = [
        {
            classe: "doodle-claquete",
            svg: `<svg viewBox="0 0 48 48"><path d="M6 21h36v20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M5 14.8 40 8.6l1.3 7.4L6.3 22z"/><path d="M12.2 13.6l3.4 7.3M21 12l3.4 7.3M29.8 10.5l3.4 7.3"/><path d="M6 29h36"/></svg>`
        },
        {
            classe: "doodle-play",
            svg: `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><path d="M20 16.5v15l12.5-7.5z"/></svg>`
        },
        {
            classe: "doodle-ingresso",
            svg: `<svg viewBox="0 0 48 48"><path d="M5 14h38v7a3 3 0 0 0 0 6v7H5v-7a3 3 0 0 0 0-6z"/><path d="M31 14v20" stroke-dasharray="2 3"/><path d="M13 24h10"/></svg>`
        },
        {
            classe: "doodle-rolo",
            svg: `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="3.2"/><circle cx="24" cy="14.8" r="3.6"/><circle cx="32.7" cy="21.2" r="3.6"/><circle cx="29.4" cy="31.4" r="3.6"/><circle cx="18.6" cy="31.4" r="3.6"/><circle cx="15.3" cy="21.2" r="3.6"/></svg>`
        },
        {
            classe: "doodle-pipoca",
            svg: `<svg viewBox="0 0 48 48"><path d="M13.5 22 17 43h14l3.5-21"/><path d="M21 22l1 21M27 22l-1 21"/><circle cx="17" cy="15" r="5"/><circle cx="24" cy="11.5" r="5.5"/><circle cx="31" cy="15" r="5"/><path d="M12.5 22h23"/></svg>`
        },
        {
            classe: "doodle-camera",
            svg: `<svg viewBox="0 0 48 48"><rect x="5" y="16" width="26" height="20" rx="3.5"/><path d="M31 23.5l12-6v17l-12-6z"/><circle cx="12" cy="10" r="3.6"/><circle cx="23" cy="10" r="3.6"/></svg>`
        }
    ];

    const LUA_SVG =
        `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M33 8a17 17 0 1 0 7 25 14 14 0 0 1-7-25z"/></svg>`;


    // =================================================
    // ESTADO
    // =================================================

    const feed = document.getElementById("preview-feed");

    if (!feed) return;

    // A página de Assistidos (o Preview é uma aba dela)
    const pagina = feed.closest(".view");

    // O painel que guarda os filtros e o feed
    const painel = feed.closest(".preview-painel");

    const entradas = new Map();   // elemento do item -> entrada

    let todosItens = [];          // tudo que está no preview.json
    let itens = [];               // o que está na tela (depois do filtro)
    let filtroAtual = "todos";
    let termoBusca = "";          // o que foi digitado na busca
    let filtroAssistidoId = "";   // vem do selo ▶ da página de Assistidos
let tituloFiltroFilme = "";
    let renderizados = 0;
    let ativo = null;             // entrada que está tocando (ou pausada por último)
    let somLigado = true;
    let volumeVideo = 1;          // 0 a 1, vale pra todos os vídeos
    let sentinela = null;

    let observadorMontar = null;
    let observadorVisibilidade = null;
    let observadorLote = null;

    let assistidosCache = [];

    // Quem ativou "economizar dados" só baixa o vídeo ao tocar
    const economizarDados =
        navigator.connection?.saveData === true;


    // =================================================
    // UTILIDADES
    // =================================================

    function hash(texto) {

        let valor = 0;

        texto = String(texto);

        for (let i = 0; i < texto.length; i++) {

            valor =
                (valor * 31 + texto.charCodeAt(i)) % 100000;

        }

        return valor / 100000;

    }

    function escaparHTML(texto) {

        const div =
            document.createElement("div");

        div.textContent =
            texto || "";

        return div.innerHTML;

    }

    function escaparAtributo(texto) {

        return escaparHTML(texto).replace(/"/g, "&quot;");

    }

    // Mesma regra do painel admin pra identificar um item de Assistidos
    function chaveAssistido(item) {

        return String(item.id ?? item.titulo);

    }

    function acharAssistido(id) {

        return assistidosCache.find(
            item => chaveAssistido(item) === String(id)
        ) || null;

    }

    function formatarDuracao(segundos) {

        const total =
            Math.max(0, Math.round(Number(segundos) || 0));

        const minutos =
            Math.floor(total / 60);

        const resto =
            String(total % 60).padStart(2, "0");

        return `${minutos}:${resto}`;

    }

    // Tempo já assistido: não arredonda pra cima (10,6 s mostra 0:10)
    function formatarTempoCorrido(segundos) {

        const total =
            Math.max(0, Math.floor(Number(segundos) || 0));

        const minutos =
            Math.floor(total / 60);

        const resto =
            String(total % 60).padStart(2, "0");

        return `${minutos}:${resto}`;

    }


    // =================================================
    // PROPORÇÃO — cada vídeo tem o tamanho da própria forma
    // =================================================
    // --razao  largura / altura do vídeo (a moldura usa isso)
    // data-formato  vertical, quadrado ou horizontal (o destaque
    //          muda a posição do texto conforme o formato).

    function razaoSalva(dados) {

        const largura = Number(dados.largura);
        const altura = Number(dados.altura);

        return largura > 0 && altura > 0
            ? largura / altura
            : 0;

    }

    function aplicarRazao(item, razao) {

        const limitada =
            Math.min(Math.max(razao, 0.4), 2.4);

        item.style.setProperty("--razao", limitada.toFixed(4));

        // O destaque, por exemplo, põe o texto ao lado de um vídeo
        // vertical e embaixo de um horizontal.
        item.dataset.formato =
            limitada >= 1.1
                ? "horizontal"
                : limitada <= 0.9
                    ? "vertical"
                    : "quadrado";

    }


    // =================================================
    // CARREGAR
    // =================================================

    async function lerJSON(caminho) {

        try {

            const resposta =
                await fetch(
                    caminho,
                    { cache: "no-cache" }
                );

            if (!resposta.ok) {

                throw new Error(
                    `Não foi possível carregar ${caminho}.`
                );

            }

            const dados =
                await resposta.json();

            return Array.isArray(dados) ? dados : [];

        } catch (erro) {

            console.error(
                "Erro ao carregar o Preview:",
                erro
            );

            return [];

        }

    }

    async function carregar() {

        const [lista, assistidos] =
            await Promise.all([
                lerJSON(CAMINHO_PREVIEW),
                lerJSON(CAMINHO_ASSISTIDOS)
            ]);

        assistidosCache = assistidos;

        todosItens =
            lista
                .filter(item => item && item.video)
                .map((item, indice) => ({
                    ...item,
                    id: item.id ?? `preview-${indice}`,
                    _posicao: indice
                }))
                .sort((a, b) => {

                    const ordemA = Number(a.ordem) || Infinity;
                    const ordemB = Number(b.ordem) || Infinity;

                    return (ordemA - ordemB) || (a._posicao - b._posicao);

                });

        criarLateral();

        mostrarItens(itensFiltrados());

    }

    function mostrarItens(lista) {

        itens = lista;

        if (!itens.length) {

            feed.innerHTML = `
                <p class="preview-vazio">
                    ${termoBusca.trim() ? "nada encontrado por aqui…" : "ainda não há nada por aqui…"}
                </p>
            `;

            return;

        }

        // Celular: fileiras por categoria, que deslizam de lado
        if (modoDeLayout() === "carrossel") {

            sentinela = null;

            iniciarObservadores();

            montarCarrosseis(itens);

            return;

        }

        sentinela =
            document.createElement("div");

        sentinela.className =
            "preview-sentinela";

        feed.appendChild(sentinela);

        iniciarObservadores();

        renderizarLote();

    }

    // Cabeçalho de cada fileira: linha · ícone · título · ♡ · linha
    function criarCabecalhoSecao(icone, titulo) {

        const cabecalho =
            document.createElement("div");

        cabecalho.className = "preview-secao-cabecalho";

        cabecalho.innerHTML = `
            <span class="preview-secao-linha preview-secao-linha-esq"></span>
            <span class="preview-secao-icone" aria-hidden="true">${icone}</span>
            <h2 class="preview-secao-titulo">${escaparHTML(titulo)}</h2>
            <span class="preview-secao-coracao" aria-hidden="true">♡</span>
            <span class="preview-secao-linha preview-secao-linha-dir"></span>
        `;

        return cabecalho;

    }

    // Liga uma fileira do celular: a setinha de aviso (some quando a pessoa
    // desliza), a barra de progresso e o cartão que fica no meio.
    function ligarFaixa(faixa, seta, trilho) {

        const barra =
            trilho.firstElementChild;

        let jaDeslizou = false;
        let quadro = 0;

        const atualizar = () => {

            quadro = 0;

            const maximo =
                faixa.scrollWidth - faixa.clientWidth;

            const temRolagem =
                maximo > 4;

            trilho.hidden = !temRolagem;
            seta.hidden = !temRolagem;

            if (!temRolagem) return;

            const visivel =
                faixa.clientWidth / faixa.scrollWidth;

            barra.style.setProperty("--pl", visivel.toFixed(3));
            barra.style.setProperty("--k", (1 / visivel - 1).toFixed(3));

            barra.style.setProperty(
                "--p",
                Math.min(1, faixa.scrollLeft / maximo).toFixed(3)
            );

            if (faixa.scrollLeft > 36) jaDeslizou = true;

            seta.classList.toggle(
                "some",
                jaDeslizou || faixa.scrollLeft >= maximo - 6
            );

        };

        faixa.addEventListener("scroll", () => {

            if (!quadro) quadro = requestAnimationFrame(atualizar);

        }, { passive: true });

        // tocar na setinha também desliza
        seta.addEventListener("click", () => {

            faixa.scrollBy({
                left: faixa.clientWidth * 0.7,
                behavior: "smooth"
            });

        });

        requestAnimationFrame(atualizar);

        setTimeout(atualizar, 500);

        // o cartão que passa pelo meio da fileira fica um pouquinho maior e reto
        const observadorCentro =
            new IntersectionObserver(registros => {

                registros.forEach(registro => {

                    registro.target.classList.toggle(
                        "centro",
                        registro.isIntersecting
                    );

                });

            }, {
                root: faixa,
                rootMargin: "0px -45% 0px -45%",
                threshold: 0
            });

        faixa
            .querySelectorAll(".preview-item")
            .forEach(item => observadorCentro.observe(item));

        observadoresFaixas.push(observadorCentro);

    }

    // Celular: uma fileira por categoria (Filmes, Séries, Animes...). Cada
    // fileira desliza de lado com o dedo, e a borda do próximo cartão aparece
    // esmaecida no canto da tela.
    function montarCarrosseis(lista) {

        const grupos =
            new Map(SECOES_CARROSSEL.map(secao => [secao.chave, []]));

        lista.forEach(item => {

            const chave =
                grupos.has(item.assistidoCategoria)
                    ? item.assistidoCategoria
                    : "outros";

            grupos.get(chave).push(item);

        });

        const fragmento =
            document.createDocumentFragment();

        // quando uma fileira aparece na tela, os cartões "pousam" e as linhas
        // do título se desenham (uma vez só)
        const observadorSecoes =
            new IntersectionObserver(registros => {

                registros.forEach(registro => {

                    if (!registro.isIntersecting) return;

                    registro.target.classList.add("secao-visivel");

                    observadorSecoes.unobserve(registro.target);

                });

            }, { threshold: 0.12 });

        observadoresFaixas.push(observadorSecoes);

        SECOES_CARROSSEL.forEach(secao => {

            const doGrupo =
                grupos.get(secao.chave);

            if (!doGrupo.length) return;

            const bloco =
                document.createElement("section");

            bloco.className = "preview-secao";

            bloco.appendChild(
                criarCabecalhoSecao(
                    iconeDaCategoria(secao.chave),
                    secao.titulo
                )
            );

            const faixa =
                document.createElement("div");

            faixa.className = "preview-faixa";

            doGrupo.forEach((dados, indice) => {

                faixa.appendChild(
                    criarItem(dados, indice, "carrossel")
                );

            });

            const caixa =
                document.createElement("div");

            caixa.className = "preview-faixa-caixa";

            caixa.appendChild(faixa);

            // setinha que avisa que dá pra deslizar (some quando a pessoa desliza)
            const seta =
                document.createElement("button");

            seta.type = "button";

            seta.className = "preview-faixa-seta";

            seta.setAttribute("aria-label", "Ver mais");

            seta.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9.5 5.5 16 12l-6.5 6.5"/>
                </svg>
            `;

            // barrinha de progresso embaixo da fileira
            const trilho =
                document.createElement("div");

            trilho.className = "preview-faixa-progresso";

            trilho.setAttribute("aria-hidden", "true");

            trilho.innerHTML = "<span></span>";

            caixa.append(seta, trilho);

            bloco.appendChild(caixa);

            ligarFaixa(faixa, seta, trilho);

            observadorSecoes.observe(bloco);

            fragmento.appendChild(bloco);

        });

        feed.appendChild(fragmento);

    }

    // Esvazia o feed (usado ao trocar de filtro)
    function limparFeed() {

        if (ativo?.video) ativo.video.pause();

        ativo = null;

        recolher();

        entradas.forEach(entrada => desmontarVideo(entrada));

        desconectarObservadores();

        entradas.clear();

        feed.innerHTML = "";

        renderizados = 0;

        sentinela = null;

    }


    // =================================================
    // FILTROS — Todos | Filmes | Séries | Animes
    // =================================================
    // Usa a categoria do item de Assistidos associado a cada vídeo.
    // Só aparecem as categorias que têm vídeo.

    function criarFiltros() {

        document.getElementById("preview-filtros")?.remove();

        painel?.classList.remove("sem-filtros");

        const presentes =
            new Set(
                todosItens
                    .map(item => item.assistidoCategoria)
                    .filter(Boolean)
            );

        const disponiveis =
            FILTROS.filter(
                filtro => filtro.chave === "todos" || presentes.has(filtro.chave)
            );

        if (disponiveis.length < 2 || !painel) return null;

        const nav =
            document.createElement("nav");

        nav.id = "preview-filtros";

        nav.className = "preview-filtros";

        nav.setAttribute("aria-label", "Filtrar vídeos");

        nav.innerHTML =
            disponiveis
                .map(filtro => `
                    <button
                        type="button"
                        class="preview-filtro${filtro.chave === filtroAtual ? " ativo" : ""}"
                        data-filtro="${filtro.chave}"
                    >
                        ${filtro.icone}
                        <span>${filtro.rotulo}</span>
                    </button>
                `)
                .join("");

        nav.addEventListener("click", evento => {

            const botao =
                evento.target.closest("[data-filtro]");

            if (botao) aplicarFiltro(botao.dataset.filtro);

        });

        return nav;

    }

    function normalizar(texto) {

        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    }

    // O que aparece no mural: a categoria escolhida + o que foi buscado
    function itensFiltrados() {

        const termo =
            normalizar(termoBusca);

        return todosItens.filter(item => {

            if (
                filtroAtual !== "todos" &&
                item.assistidoCategoria !== filtroAtual
            ) {

                return false;

            }
                        if (
                filtroAssistidoId &&
                String(item.assistidoId) !== filtroAssistidoId
            ) {

                return false;

            }

            if (!termo) return true;

            return normalizar(
                `${item.assistidoTitulo || ""} ${item.titulo || ""}`
            ).includes(termo);

        });

    }

    function atualizarMural(rolarAoTopo = true) {

        limparFeed();

        mostrarItens(itensFiltrados());

        if (rolarAoTopo) pagina?.scrollTo({ top: 0 });

    }

    function aplicarFiltro(chave) {

        if (chave === filtroAtual) return;

        filtroAtual = chave;

        document
            .querySelectorAll("#preview-filtros [data-filtro]")
            .forEach(botao => {

                botao.classList.toggle(
                    "ativo",
                    botao.dataset.filtro === chave
                );

            });

        atualizarMural();

    }

    // Busca: filtra os vídeos pelo nome do filme/série/anime (ou pela frase)
    function criarBusca() {

        document.getElementById("preview-busca")?.remove();

        termoBusca = "";

        if (!painel) return null;

        const caixa =
            document.createElement("label");

        caixa.id = "preview-busca";

        caixa.className = "preview-busca";

        caixa.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5"/>
                <path d="m16 16 4.5 4.5"/>
            </svg>

            <input
                type="search"
                placeholder="buscar filme, série…"
                aria-label="Buscar no Preview"
                autocomplete="off"
            >
        `;

        const campo =
            caixa.querySelector("input");

        let espera = null;

        campo.addEventListener("input", () => {

            clearTimeout(espera);

            espera = setTimeout(() => {

                termoBusca = campo.value;

                atualizarMural();

            }, 220);

        });

        return caixa;

    }
// etiqueta "edits de [filme] ✕" no topo da lateral
function criarChipFilme() {

    if (!filtroAssistidoId) return null;

    const titulo =
        tituloFiltroFilme ||
        todosItens.find(item => String(item.assistidoId) === filtroAssistidoId)?.assistidoTitulo ||
        "";

    const chip =
        document.createElement("div");

    chip.className = "preview-chip-filme";

    chip.innerHTML = `
        <span class="preview-chip-texto">
            <small>edits de</small>
            <b>${escaparHTML(titulo)}</b>
        </span>
        <button type="button" aria-label="Mostrar todos os edits">✕</button>
    `;

    chip
        .querySelector("button")
        .addEventListener("click", () => limparFiltroFilme(true));

    return chip;

}

function limparFiltroFilme(rolarAoTopo = true) {

    if (!filtroAssistidoId) return;

    filtroAssistidoId = "";
    tituloFiltroFilme = "";

    if (previewCarregado && todosItens.length) {

        criarLateral();

        atualizarMural(rolarAoTopo);

    }

}
    // Barra lateral: a busca em cima e os filtros embaixo
    function criarLateral() {

        document.getElementById("preview-lateral")?.remove();

        if (!painel) return;

        const lateral =
            document.createElement("aside");

        lateral.id = "preview-lateral";

        lateral.className = "preview-lateral";

        lateral.setAttribute("aria-label", "Busca e filtros");

        const busca =
            criarBusca();

        const filtros =
            criarFiltros();

            const chip = criarChipFilme();

        if (chip) lateral.appendChild(chip);

        if (busca) lateral.appendChild(busca);

        if (filtros) lateral.appendChild(filtros);

        painel.insertBefore(lateral, feed);

    }


    // =================================================
    // OBSERVADORES
    // =================================================
    // Se a página de Preview é quem rola (overflow auto), ela é
    // a "raiz" dos observadores. Se não, vale a janela inteira.

    function descobrirRaiz() {

        if (!pagina) return null;

        const overflow =
            getComputedStyle(pagina).overflowY;

        return overflow === "auto" || overflow === "scroll"
            ? pagina
            : null;

    }

    // observadores das fileiras do celular (aparecer na tela e "cartão do meio")
    let observadoresFaixas = [];

    function desconectarObservadores() {

        observadoresFaixas.forEach(observador => observador.disconnect());

        observadoresFaixas = [];

        observadorMontar?.disconnect();
        observadorVisibilidade?.disconnect();
        observadorLote?.disconnect();

        observadorMontar = null;
        observadorVisibilidade = null;
        observadorLote = null;

    }

    function iniciarObservadores() {

        const raiz =
            descobrirRaiz();


        // Perto da tela: monta o <video>. Longe: desmonta.

        observadorMontar =
            new IntersectionObserver(registros => {

                registros.forEach(registro => {

                    const entrada =
                        entradas.get(registro.target);

                    if (!entrada) return;

                    if (registro.isIntersecting) {

                        if (!economizarDados) montarVideo(entrada);

                    } else {

                        if (entrada === ativo) {

                            entrada.video?.pause();

                            ativo = null;

                        }

                        desmontarVideo(entrada);

                    }

                });

            }, {
                root: raiz,
                rootMargin: MARGEM_MONTAR,
                threshold: 0
            });


        // Saiu (quase) da tela: pausa. Cobre também a troca de página.

        observadorVisibilidade =
            new IntersectionObserver(registros => {

                registros.forEach(registro => {

                    const entrada =
                        entradas.get(registro.target);

                    if (
                        entrada &&
                        entrada === ativo &&
                        entrada.video &&
                        !entrada.video.paused &&
                        registro.intersectionRatio < 0.2
                    ) {

                        entrada.video.pause();

                    }

                });

            }, {
                root: raiz,
                threshold: [0, 0.2, 0.5]
            });


        // Chegando no fim: entra o próximo lote.

        observadorLote =
            new IntersectionObserver(registros => {

                if (registros.some(r => r.isIntersecting)) {

                    renderizarLote();

                }

            }, {
                root: raiz,
                rootMargin: MARGEM_PROXIMO_LOTE,
                threshold: 0
            });

        if (sentinela) observadorLote.observe(sentinela);

    }


    // =================================================
    // RENDER EM LOTES
    // =================================================

    function renderizarLote() {

        if (!sentinela || renderizados >= itens.length) return;

        const fim =
            Math.min(renderizados + TAMANHO_LOTE, itens.length);

        const fragmento =
            document.createDocumentFragment();

        for (let i = renderizados; i < fim; i++) {

            fragmento.appendChild(
                criarItem(itens[i], i)
            );

        }

        feed.insertBefore(fragmento, sentinela);

        renderizados = fim;


        if (renderizados >= itens.length) {

            observadorLote?.disconnect();

            sentinela.remove();

            return;

        }

        // Se a sentinela continua perto da tela, o observador não
        // dispara de novo sozinho — reobserva pra checar outra vez.

        observadorLote?.unobserve(sentinela);

        requestAnimationFrame(() => {

            if (sentinela && sentinela.isConnected) {

                observadorLote?.observe(sentinela);

            }

        });

    }


    // =================================================
    // ITEM
    // =================================================

    const ICONE_PLAY = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.5 5.6v12.8c0 .8.9 1.3 1.6.8l9.6-6.4c.6-.4.6-1.2 0-1.6L10.1 4.8c-.7-.5-1.6 0-1.6.8z"/>
        </svg>`;

    const ICONE_SOM_LIGADO = `
        <svg class="icone-som-ligado" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/>
            <path d="M15.5 9a4 4 0 0 1 0 6M18 6.8a7.2 7.2 0 0 1 0 10.4"/>
        </svg>`;

    const ICONE_SOM_DESLIGADO = `
        <svg class="icone-som-desligado" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/>
            <path d="m16 9.5 5 5M21 9.5l-5 5"/>
        </svg>`;

    const ICONE_LINK = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/>
            <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>
        </svg>`;


    function posterDe(dados) {

        const alvo =
            acharAssistido(dados.assistidoId);

        return alvo?.capa || alvo?.imagem || alvo?.poster || "";

    }

    function iconeDaCategoria(chave) {

        return (
            FILTROS.find(filtro => filtro.chave === chave) || FILTROS[0]
        ).icone;

    }

    // Sorteio com semente: o mesmo cartão sempre sai igual, e cada cartão
    // sai diferente do outro (rasgo, textura e fita).
    function criarSorteio(texto) {

        let semente = 2166136261;

        for (const letra of String(texto)) {

            semente ^= letra.charCodeAt(0);

            semente = Math.imul(semente, 16777619);

        }

        return () => {

            semente = (semente + 0x6D2B79F5) | 0;

            let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);

            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

        };

    }

    // O contorno "rasgado" do papel, em dois polígonos:
    //  - papel: a borda do papel (um pouco mais rasgada embaixo e em alguns
    //    cantos, que ficam "cortados");
    //  - fibra: a camada clara que aparece um pouquinho pra fora, como a
    //    fibra do papel rasgado (essa camada fica numa caixa 3px maior).
    function contornoDoPapel(sortear) {

        const suavizar = lista =>
            lista.map((valor, i) =>
                (valor + (lista[i - 1] ?? valor) + (lista[i + 1] ?? valor)) / 3
            );

        const gerar = (quantidade, maximo) =>
            suavizar(
                Array.from({ length: quantidade }, () => sortear() * maximo)
            );

        const horizontais = 13;
        const verticais = 7;

        const topo = gerar(horizontais + 1, 3.4);
        const base = gerar(horizontais + 1, 7.5);
        const direita = gerar(verticais + 1, 3.4);
        const esquerda = gerar(verticais + 1, 3.4);

        // um ou dois "dentes" mais fundos, de rasgo de verdade
        base[Math.floor(sortear() * base.length)] += 3 + sortear() * 4;

        if (sortear() < 0.5) {

            topo[Math.floor(sortear() * topo.length)] += 2 + sortear() * 2.5;

        }

        // cantos cortados (chanfro, em px): TL, TR, BR, BL
        const cantos =
            [0, 0, 0, 0].map(() => sortear() < 0.55 ? 2 + sortear() * 9 : 0);

        // quanto a fibra passa pra fora do papel (px)
        const espessura = lista =>
            lista.map(() => 1 + sortear() * 3.6);

        const espTopo = espessura(topo);
        const espBase = espessura(base);
        const espDireita = espessura(direita);
        const espEsquerda = espessura(esquerda);

        const menos = valor =>
            valor >= 0
                ? `calc(100% - ${valor.toFixed(1)}px)`
                : `calc(100% + ${(-valor).toFixed(1)}px)`;

        const px = valor => `${valor.toFixed(1)}px`;

        const poligono = fibra => {

            // distância até a borda; a fibra mora numa caixa 3px maior e sai
            // pra fora pela "espessura"
            const d = (lista, esp, i) =>
                fibra ? lista[i] - esp[i] + 3 : lista[i];

            const c = i =>
                cantos[i] > 0 ? cantos[i] + (fibra ? 2 : 0) : (fibra ? 2 : 0);

            const pontos = [];

            // canto superior esquerdo
            pontos.push(`${px(d(esquerda, espEsquerda, 0))} ${px(c(0))}`);
            pontos.push(`${px(c(0))} ${px(d(topo, espTopo, 0))}`);

            // topo
            for (let i = 1; i < horizontais; i++) {

                pontos.push(`${(i / horizontais * 100).toFixed(1)}% ${px(d(topo, espTopo, i))}`);

            }

            // canto superior direito
            pontos.push(`${menos(c(1))} ${px(d(topo, espTopo, horizontais))}`);
            pontos.push(`${menos(d(direita, espDireita, 0))} ${px(c(1))}`);

            // lado direito
            for (let j = 1; j < verticais; j++) {

                pontos.push(`${menos(d(direita, espDireita, j))} ${(j / verticais * 100).toFixed(1)}%`);

            }

            // canto inferior direito
            pontos.push(`${menos(d(direita, espDireita, verticais))} ${menos(c(2))}`);
            pontos.push(`${menos(c(2))} ${menos(d(base, espBase, horizontais))}`);

            // base (da direita pra esquerda)
            for (let i = horizontais - 1; i >= 1; i--) {

                pontos.push(`${(i / horizontais * 100).toFixed(1)}% ${menos(d(base, espBase, i))}`);

            }

            // canto inferior esquerdo
            pontos.push(`${px(c(3))} ${menos(d(base, espBase, 0))}`);
            pontos.push(`${px(d(esquerda, espEsquerda, verticais))} ${menos(c(3))}`);

            // lado esquerdo (de baixo pra cima)
            for (let j = verticais - 1; j >= 1; j--) {

                pontos.push(`${px(d(esquerda, espEsquerda, j))} ${(j / verticais * 100).toFixed(1)}%`);

            }

            return pontos.join(", ");

        };

        return {
            papel: poligono(false),
            fibra: poligono(true)
        };

    }


    // Informações do vídeo: título manuscrito com coraçãozinho, categoria
    // (com ícone), ano, nota em corações e a frase do vídeo. A capa do filme
    // fica por cima do vídeo no destaque e no médio; nos outros, ao lado.

    function criarInfo(dados, variante) {

        const frase =
            (dados.titulo || "").trim();

        const temAssociacao =
            Boolean(dados.assistidoId) && Boolean(dados.assistidoTitulo);

        if (!frase && !temAssociacao) return "";

        // Sem item de Assistidos: só o título do vídeo
        if (!temAssociacao) {

            return `
                <div class="pc-info">
                    <h3 class="pc-titulo">${escaparHTML(frase)} <span class="pc-coracao" aria-hidden="true">♡</span></h3>
                </div>
            `;

        }

        const alvo =
            acharAssistido(dados.assistidoId);

        const poster =
            variante === "compacto" || variante === "pequeno"
                ? posterDe(dados)
                : "";

        const categoria =
            ROTULOS_CATEGORIA[dados.assistidoCategoria] || "";

        const ano =
            alvo?.ano ? String(alvo.ano) : "";

        // No destaque a frase vira o bilhetinho colado no vídeo
        const fraseNoCartao =
            frase && (variante === "medio" || variante === "compacto");

        return `
            <div class="pc-info">

                <div class="pc-topo">

                    ${
                        poster
                            ? `<img
                                    class="preview-info-poster"
                                    src="${escaparAtributo(poster)}"
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                               >`
                            : ""
                    }

                    <div class="pc-texto">

                        <h3 class="pc-titulo" title="${escaparAtributo(dados.assistidoTitulo)}">${escaparHTML(dados.assistidoTitulo)} <span class="pc-coracao" aria-hidden="true">♡</span></h3>

                        ${
                            categoria || ano
                                ? `<p class="pc-meta">${
                                        categoria
                                            ? `<span class="pc-cat" data-cat="${escaparAtributo(dados.assistidoCategoria)}">${iconeDaCategoria(dados.assistidoCategoria)}${escaparHTML(categoria)}</span>`
                                            : ""
                                    }${
                                        ano
                                            ? `<span class="pc-ano">${escaparHTML(ano)}</span>`
                                            : ""
                                    }</p>`
                                : ""
                        }

                    </div>

                </div>

                ${
                    fraseNoCartao
                        ? `<p class="pc-frase">“${escaparHTML(frase)}”</p>`
                        : ""
                }

                <button
                    type="button"
                    class="preview-info-link"
                    aria-label="Ver detalhes: ${escaparAtributo(dados.assistidoTitulo)}"
                >
                    ver detalhes <span aria-hidden="true">↗</span>
                </button>

            </div>
        `;

    }

    function criarItem(dados, indice, modo = modoDeLayout()) {

        // Variante e lugar no mural, pelo ritmo. No computador é a grade de
        // 12 colunas (espelhada a cada ciclo); no tablet, a de 6; no celular,
        // as fileiras que deslizam de lado (aí o "indice" conta dentro da fileira).
        let variante;
        let coluna = 1;
        let largura = 6;
        let desnivel = 0;
        let colunasMaior = 3;
        let colunasMenor = 3;
        let larguraVw = 40;

        if (modo === "carrossel") {

            [variante, larguraVw, desnivel] =
                RITMO_CARROSSEL[indice % RITMO_CARROSSEL.length];

        } else if (modo === "compacta") {

            [variante, colunasMaior, colunasMenor] =
                RITMO_COMPACTO[indice % RITMO_COMPACTO.length];

        } else {

            const ciclo =
                Math.floor(indice / RITMO.length);

            const tabela =
                ciclo % 2 === 0 ? RITMO : RITMO_ESPELHADO;

            [variante, coluna, largura, desnivel] =
                tabela[indice % RITMO.length];

        }

        // Inclina o vídeo de leve (o compacto fica reto)
        const rotacao =
            variante === "compacto"
                ? 0
                : (indice % 2 === 0 ? -1 : 1) *
                  (0.4 + hash(dados.id + "-rot") * 0.9);

        const item =
            document.createElement("article");

        item.className =
            "preview-item";

        item.dataset.variante = variante;

        item.style.setProperty("--c", coluna);
        item.style.setProperty("--s", largura);
        item.style.setProperty("--dy", `${desnivel}px`);

        if (modo === "compacta") {

            item.style.setProperty("--sm", colunasMaior);
            item.style.setProperty("--sm2", colunasMenor);

        }

        if (modo === "carrossel") {

            item.style.setProperty("--lv", larguraVw);

        }
        item.style.setProperty("--rot", `${rotacao.toFixed(2)}deg`);

        // atraso da animação de entrada: os cartões "pousam" em sequência
        item.style.setProperty("--atraso", `${(indice % 8) * 80 + 120}ms`);

        // O papel: contorno rasgado, qual das 3 texturas e o deslocamento dela.
        // Tudo sorteado a partir do id, então cada cartão é diferente do outro
        // mas sempre igual a si mesmo.
        const sorteio =
            criarSorteio(`${dados.id}-papel`);

        const contorno =
            contornoDoPapel(sorteio);

        item.style.setProperty("--rasgo", contorno.papel);
        item.style.setProperty("--rasgo-fibra", contorno.fibra);

        item.dataset.papel =
            String(1 + Math.floor(sorteio() * 3));

        item.style.setProperty("--tx", `${Math.floor(sorteio() * 480)}px`);
        item.style.setProperty("--ty", `${Math.floor(sorteio() * 480)}px`);


        const titulo =
            (dados.titulo || "").trim();

        // Se a proporção já está salva no preview.json, o layout
        // nasce certo. Senão, ela é descoberta pela capa (ou pelo vídeo).
        const razaoConhecida =
            razaoSalva(dados);

        aplicarRazao(item, razaoConhecida || RAZAO_BASE);

        const duracaoTexto =
            Number(dados.duracao) > 0
                ? formatarDuracao(dados.duracao)
                : "";

        // Fita adesiva translúcida num canto: no destaque, no médio e em
        // alguns pequenos
        const comFita =
            variante === "destaque" ||
            variante === "medio" ||
            (variante === "pequeno" && sorteio() < 0.5);

        const cantoFita =
            sorteio() < 0.5 ? "esq" : "dir";

        const fitaHTML =
            comFita
                ? `<span class="preview-fita" data-canto="${cantoFita}" aria-hidden="true"></span>`
                : "";

        // A capa do filme fica por cima do canto do vídeo (destaque e médio)
        const posterUrl =
            dados.assistidoId && dados.assistidoTitulo
                ? posterDe(dados)
                : "";

        const posterSobre =
            Boolean(posterUrl);

        if (posterSobre) item.dataset.poster = "sim";

        const posterSobreHTML =
            posterSobre
                ? `<img
                        class="preview-info-poster preview-info-poster--sobre"
                        src="${escaparAtributo(posterUrl)}"
                        alt=""
                        loading="lazy"
                        decoding="async"
                   >`
                : "";

        // A frase do vídeo vira um bilhetinho colado no destaque
        const notaAdesivaHTML =
            variante === "destaque" && titulo
                ? `<div class="pc-nota-adesiva" aria-hidden="true"><span class="pc-nota-texto">${escaparHTML(titulo)}</span></div>`
                : "";


        item.innerHTML = `

            <i class="preview-papel-tex" aria-hidden="true"></i>

            <div class="pc-media">

                <div class="preview-quadro">

                    <div class="preview-moldura">

                        ${
                            dados.capa
                                ? `<img
                                        class="preview-capa"
                                        src="${escaparAtributo(dados.capa)}"
                                        alt=""
                                        ${razaoConhecida ? 'loading="lazy"' : ""}
                                        decoding="async"
                                   >`
                                : ""
                        }

                        <button
                            type="button"
                            class="preview-area"
                            aria-label="Reproduzir${titulo ? ": " + escaparAtributo(titulo) : " vídeo"}"
                        ></button>

                        <span class="preview-play" aria-hidden="true">
                            ${ICONE_PLAY}
                        </span>

                        <span class="preview-carregando" aria-hidden="true"></span>

                        <span
                            class="preview-duracao"
                            aria-hidden="true"
                            ${duracaoTexto ? "" : "hidden"}
                        >${duracaoTexto}</span>

                        <div class="preview-som">

                            <input
                                type="range"
                                class="preview-volume"
                                min="0"
                                max="1"
                                step="0.05"
                                value="1"
                                aria-label="Volume"
                            >

                            <button
                                type="button"
                                class="preview-mudo"
                                aria-label="Ligar ou desligar o som"
                            >
                                ${ICONE_SOM_LIGADO}
                                ${ICONE_SOM_DESLIGADO}
                            </button>

                        </div>

                        <span class="preview-erro" role="status">
                            Não foi possível carregar. Toque para tentar de novo.
                        </span>

                        <div class="preview-controles">

                            <span class="preview-tempo preview-tempo-atual">0:00</span>

                            <div
                                class="preview-barra"
                                role="slider"
                                tabindex="0"
                                aria-label="Progresso do vídeo"
                                aria-valuemin="0"
                                aria-valuemax="100"
                                aria-valuenow="0"
                            >
                                <div class="preview-trilho">
                                    <div class="preview-barra-fill"></div>
                                    <div class="preview-barra-bolinha"></div>
                                </div>
                            </div>

                            <span class="preview-tempo preview-tempo-total">${duracaoTexto || "0:00"}</span>

                        </div>

                    </div>

                </div>

                ${posterSobreHTML}

                ${notaAdesivaHTML}

            </div>

            ${criarInfo(dados, variante)}

            ${fitaHTML}

        `;


        // Entrada

        const entrada = {
            dados,
            elemento: item,
            moldura: item.querySelector(".preview-moldura"),
            area: item.querySelector(".preview-area"),
            barra: item.querySelector(".preview-barra-fill"),
            bolinha: item.querySelector(".preview-barra-bolinha"),
            barraEl: item.querySelector(".preview-barra"),
            trilho: item.querySelector(".preview-trilho"),
            tempoAtual: item.querySelector(".preview-tempo-atual"),
            tempoTotal: item.querySelector(".preview-tempo-total"),
            som: item.querySelector(".preview-som"),
            slider: item.querySelector(".preview-volume"),
            somTimer: null,
            arrastando: false,
            duracao: item.querySelector(".preview-duracao"),
            razaoConhecida: razaoConhecida > 0,
            video: null
        };

        entradas.set(item, entrada);


        entrada.area.addEventListener(
            "click",
            () => alternar(entrada)
        );

        ligarControles(entrada);

        item
            .querySelector(".preview-info-link")
            ?.addEventListener(
                "click",
                () => abrirAssistido(dados)
            );

        // Se o pôster não existir, some sem deixar ícone quebrado
        item
            .querySelectorAll(".preview-info-poster")
            .forEach(poster => {

                poster.addEventListener("error", () => poster.remove());

            });

        const capa =
            item.querySelector(".preview-capa");

        if (capa) {

            // Proporção descoberta pela capa (quando não veio salva)
            const usarProporcaoDaCapa = () => {

                if (entrada.razaoConhecida) return;

                if (capa.naturalWidth > 0 && capa.naturalHeight > 0) {

                    entrada.razaoConhecida = true;

                    aplicarRazao(
                        item,
                        capa.naturalWidth / capa.naturalHeight
                    );

                }

            };

            if (capa.complete) {

                usarProporcaoDaCapa();

            } else {

                capa.addEventListener("load", usarProporcaoDaCapa);

            }

            // Se a capa não existir, some sem deixar ícone quebrado
            capa.addEventListener("error", () => {

                capa.remove();

            });

        }


        observadorMontar.observe(item);
        observadorVisibilidade.observe(item);

        return item;

    }


    // =================================================
    // VÍDEO — montar / desmontar
    // =================================================

    function montarVideo(entrada) {

        if (entrada.video) return;

        const item =
            entrada.elemento;

        const video =
            document.createElement("video");

        video.className =
            "preview-video-el";

        // Nada é baixado até a pessoa tocar. (Sem capa, deixa o
        // navegador buscar só o início pra mostrar o primeiro quadro.)
        video.preload =
            entrada.dados.capa ? "none" : "metadata";

        video.loop = true;
        video.playsInline = true;
        video.disablePictureInPicture = true;
        video.muted = !somLigado;
        video.volume = volumeVideo;

        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.setAttribute("aria-hidden", "true");

        if (entrada.dados.capa) {

            video.poster = entrada.dados.capa;

        }

        video.src =
            entrada.dados.video;


        // Duração e proporção reais, assim que o navegador as conhece
        video.addEventListener("loadedmetadata", () => {

            if (isFinite(video.duration) && video.duration > 0) {

                entrada.duracao.textContent =
                    formatarDuracao(video.duration);

                entrada.duracao.hidden = false;

                entrada.tempoTotal.textContent =
                    formatarDuracao(video.duration);

            }

            if (!entrada.razaoConhecida && video.videoWidth > 0) {

                entrada.razaoConhecida = true;

                aplicarRazao(
                    item,
                    video.videoWidth / video.videoHeight
                );

            }

        });

        video.addEventListener("playing", () => {

            item.classList.remove("carregando", "pausado", "erro");
            item.classList.add("tocando", "iniciado");

        });

        video.addEventListener("pause", () => {

            item.classList.remove("tocando", "carregando");
            item.classList.add("pausado");

        });

        video.addEventListener("waiting", () => {

            item.classList.add("carregando");

        });

        video.addEventListener("canplay", () => {

            item.classList.remove("carregando");

        });

        video.addEventListener("play", () => {

            // Qualquer coisa que faça este vídeo tocar pausa o anterior.
            pausarOutros(entrada);

        });

        video.addEventListener("timeupdate", () => {

            if (video.duration && !entrada.arrastando) {

                mostrarProgresso(
                    entrada,
                    video.currentTime / video.duration
                );

            }

        });

        video.addEventListener("error", () => {

            item.classList.remove("carregando", "tocando");
            item.classList.add("erro");

        });

        entrada.moldura.insertBefore(video, entrada.area);

        entrada.video = video;

    }

    function desmontarVideo(entrada) {

        if (!entrada.video || entrada === ativo) return;

        const video =
            entrada.video;

        video.pause();

        // Esvazia o src pra o navegador soltar a conexão e a memória
        video.removeAttribute("src");

        video.load();

        video.remove();

        entrada.video = null;

        entrada.barra.style.transform = "scaleX(0)";
        entrada.bolinha.style.left = "0%";
        entrada.tempoAtual.textContent = "0:00";
        entrada.arrastando = false;

        entrada.elemento.classList.remove(
            "tocando",
            "pausado",
            "carregando",
            "erro",
            "iniciado",
            "em-foco",
            "arrastando"
        );

    }

    // Vídeos pequenos crescem quando você clica, pra dar pra assistir (no
    // celular, todos). O VÍDEO sai do cartão e vai pra um lugar fixo na tela,
    // já no tamanho final de verdade (então não perde nitidez e os controles
    // têm o tamanho normal); o papel e o texto ficam parados e o lugar do
    // vídeo no cartão fica reservado. A entrada e a volta são animadas com
    // transform (FLIP). Clicar fora, rolar a tela ou apertar Esc recolhe.

    const VARIANTES_QUE_EXPANDEM = ["pequeno", "compacto"];

    function expandirSePequeno(entrada) {

        const item =
            entrada.elemento;

        // No computador só os pequenos crescem (os grandes já são grandes);
        // no celular todos podem crescer, porque lá todos são pequenos.
        const podeExpandir =
            VARIANTES_QUE_EXPANDEM.includes(item.dataset.variante) ||
            window.innerWidth <= LIMITE_CELULAR;

        if (!podeExpandir) return;

        if (item.classList.contains("expandido")) return;

        const quadro =
            entrada.moldura.parentElement;

        const media =
            quadro.parentElement;

        const largura = entrada.moldura.offsetWidth;
        const altura = entrada.moldura.offsetHeight;

        if (!largura || !altura) return;

        // Tamanho do vídeo aberto: até 680 x 580 no computador (menos no
        // celular), mantendo a proporção e cabendo na tela. Nunca passa da
        // largura original do vídeo (quando a gente sabe qual é).
        const estreito = window.innerWidth <= LIMITE_CELULAR;

        const larguraMaxima = estreito ? window.innerWidth - 40 : 680;
        const alturaMaxima = estreito ? 480 : 580;

        const razao = largura / altura;

        const larguraOriginal =
            entrada.video?.videoWidth ||
            Number(entrada.dados.largura) ||
            Infinity;

        const margem = 16;

        let topoMinimo = 84;       // não passa por baixo dos botões do topo

        const lateral =
            document.getElementById("preview-lateral");

        if (estreito && lateral) {

            const caixaLateral =
                lateral.getBoundingClientRect();

            if (caixaLateral.bottom > 0 && caixaLateral.top < window.innerHeight) {

                topoMinimo = Math.max(topoMinimo, caixaLateral.bottom + 18);

            }

        }

        const alturaDisponivel =
            window.innerHeight - margem - topoMinimo;

        const alvoLargura =
            Math.min(
                larguraMaxima,
                alturaMaxima * razao,
                window.innerWidth - 32,
                alturaDisponivel * razao,
                larguraOriginal
            );

        // Já é grande o bastante: não mexe
        if (alvoLargura / largura < 1.12) return;

        const alvoAltura = alvoLargura / razao;

        // Onde o vídeo está agora, e onde vai ficar (perto de onde estava,
        // mas inteiro dentro da tela)
        const origem =
            quadro.getBoundingClientRect();


        const esquerda =
            Math.min(
                Math.max(origem.left + origem.width / 2 - alvoLargura / 2, margem),
                window.innerWidth - margem - alvoLargura
            );

        const topo =
            Math.min(
                Math.max(origem.top + origem.height / 2 - alvoAltura / 2, topoMinimo),
                window.innerHeight - margem - alvoAltura
            );

        // o lugar do vídeo no cartão fica reservado
        media.style.height = `${origem.height}px`;

        item.classList.add("expandido");

        feed.classList.add("tem-expandido");

        quadro.closest(".preview-faixa")?.classList.add("faixa-com-expandido");
                quadro.closest(".preview-secao")?.classList.add("secao-com-expandido");

        // 1) já no tamanho e no lugar finais, mas desenhado como estava (FLIP)
        quadro.style.transition = "none";
        quadro.style.position = "fixed";
        quadro.style.left = `${esquerda}px`;
        quadro.style.top = `${topo}px`;
        quadro.style.width = `${alvoLargura}px`;
        quadro.style.transformOrigin = "0 0";

        quadro.style.transform =
            `translate(${origem.left - esquerda}px, ${origem.top - topo}px) ` +
            `scale(${origem.width / alvoLargura})`;

        // força o navegador a aplicar o passo 1
        void quadro.offsetWidth;

        // 2) anima até o tamanho real
        quadro.style.transition = "";
        quadro.style.transform = "none";

        entrada.expandido = {
            esquerda,
            topo,
            largura: alvoLargura,
            iniciadoEm: performance.now()
        };

    }

    // "exceto" é o cartão que está abrindo agora: ele não pode ser recolhido
    // junto com o anterior.
    function recolher(exceto = null) {

        const abertos =
            [...feed.querySelectorAll(".preview-item.expandido:not(.recolhendo)")]
                .filter(item => item !== exceto);

        if (!exceto || !exceto.classList.contains("expandido")) {

            feed.classList.remove("tem-expandido");

        }

        abertos.forEach(item => {

            const entrada =
                entradas.get(item);

            if (!entrada || !entrada.expandido) {

                item.classList.remove("expandido");

                return;

            }

            const quadro =
                entrada.moldura.parentElement;

            const media =
                quadro.parentElement;

            const { esquerda, topo, largura } =
                entrada.expandido;

            const destino =
                media.getBoundingClientRect();

            item.classList.add("recolhendo");

            quadro.style.transformOrigin = "0 0";

            quadro.style.transform =
                `translate(${destino.left - esquerda}px, ${destino.top - topo}px) ` +
                `scale(${destino.width / largura})`;

            setTimeout(() => {

                quadro.style.cssText = "";

                media.style.height = "";

                item.classList.remove("expandido", "recolhendo");

                quadro.closest(".preview-faixa")?.classList.remove("faixa-com-expandido");
                quadro.closest(".preview-secao")?.classList.remove("secao-com-expandido");

                entrada.expandido = null;

            }, 520);

        });

    }
    function pausarOutros(entrada) {

        recolher(entrada.elemento);

        if (ativo && ativo !== entrada) {

            // O vídeo anterior perde o "foco" (volta ao tamanho normal)
            ativo.elemento.classList.remove("em-foco");

            if (ativo.video && !ativo.video.paused) {

                ativo.video.pause();

            }

        }

        ativo = entrada;

        // O vídeo tocado ganha a leve expandidinha e os controles
        entrada.elemento.classList.add("em-foco");

    }


    // =================================================
    // TOCAR / PAUSAR
    // =================================================

    function alternar(entrada) {

        expandirSePequeno(entrada);

        const video =
            entrada.video;

        if (video && !video.paused && !video.ended) {

            video.pause();

            return;

        }

        tocar(entrada);

    }

    async function tocar(entrada) {

        // Tentar de novo depois de um erro: recomeça do zero
        if (entrada.elemento.classList.contains("erro")) {

            const eraAtivo = entrada === ativo;

            if (eraAtivo) ativo = null;

            desmontarVideo(entrada);

            if (eraAtivo) ativo = entrada;

            entrada.elemento.classList.remove("erro");

        }

        // Chamado direto do toque (necessário no iOS pra liberar o som)
        montarVideo(entrada);

        pausarOutros(entrada);

        const video =
            entrada.video;

        video.muted = !somLigado;
        video.volume = volumeVideo;

        entrada.elemento.classList.add("carregando");

        try {

            await video.play();

        } catch (erro) {

            if (erro && erro.name === "NotAllowedError" && !video.muted) {

                // O navegador não deixou tocar com som: toca mudo.
                video.muted = true;

                try {

                    await video.play();

                } catch (_) {

                    entrada.elemento.classList.remove("carregando");

                }

            } else if (!erro || erro.name !== "AbortError") {

                entrada.elemento.classList.remove("carregando");

            }

        }

    }

    function alternarSom() {

        somLigado = !somLigado;

        atualizarSom();

    }

    // Põe o som (mudo + volume) igual em todos os vídeos e controles
    function atualizarSom() {

        feed.classList.toggle("preview-sem-som", !somLigado);

        feed
            .querySelectorAll(".preview-volume")
            .forEach(sincronizarSlider);

        entradas.forEach(entrada => {

            if (entrada.video) {

                entrada.video.muted = !somLigado;
                entrada.video.volume = volumeVideo;

            }

        });

    }

    function sincronizarSlider(slider) {

        const valor =
            somLigado ? volumeVideo : 0;

        slider.value = valor;

        slider.style.setProperty("--v", `${valor * 100}%`);

    }

    // Mantém o controle de volume aberto por uns segundos (celular)
    function abrirVolume(entrada) {

        entrada.som.classList.add("aberto");

        clearTimeout(entrada.somTimer);

        entrada.somTimer =
            setTimeout(
                () => entrada.som.classList.remove("aberto"),
                3500
            );

    }

    // Barra de progresso + tempo
    function mostrarProgresso(entrada, fracao) {

        const f =
            Math.min(Math.max(fracao, 0), 1);

        entrada.barra.style.transform = `scaleX(${f})`;

        entrada.bolinha.style.left = `${f * 100}%`;

        entrada.tempoAtual.textContent =
            formatarTempoCorrido(f * (entrada.video?.duration || 0));

        entrada.barraEl.setAttribute(
            "aria-valuenow",
            String(Math.round(f * 100))
        );

    }

    // Pula pra um ponto do vídeo (0 a 1 da duração)
    function buscar(entrada, fracao) {

        const video =
            entrada.video;

        if (!video || !isFinite(video.duration) || video.duration <= 0) {

            return;

        }

        const f =
            Math.min(Math.max(fracao, 0), 1);

        video.currentTime = f * video.duration;

        mostrarProgresso(entrada, f);

    }

    function ligarControles(entrada) {

        const { barraEl, trilho, slider, elemento } = entrada;

        // ----- som: botão e volume -----

        entrada.som
            .querySelector(".preview-mudo")
            .addEventListener("click", evento => {

                evento.stopPropagation();

                alternarSom();

                abrirVolume(entrada);

            });

        sincronizarSlider(slider);

        slider.addEventListener("input", () => {

            const valor =
                Number(slider.value);

            if (valor > 0) {

                volumeVideo = valor;

                somLigado = true;

            } else {

                somLigado = false;

            }

            atualizarSom();

            abrirVolume(entrada);

        });

        // ----- progresso: clicar ou arrastar pula pro ponto -----

        const fracaoDoPonteiro = evento => {

            const caixa =
                trilho.getBoundingClientRect();

            return (evento.clientX - caixa.left) / caixa.width;

        };

        barraEl.addEventListener("pointerdown", evento => {

            if (!entrada.video) return;

            evento.preventDefault();

            evento.stopPropagation();

            entrada.arrastando = true;

            elemento.classList.add("arrastando");

            try {

                barraEl.setPointerCapture(evento.pointerId);

            } catch (_) {

                // sem captura, o arrasto só segue enquanto o ponteiro estiver na barra

            }

            buscar(entrada, fracaoDoPonteiro(evento));

        });

        barraEl.addEventListener("pointermove", evento => {

            if (entrada.arrastando) {

                buscar(entrada, fracaoDoPonteiro(evento));

            }

        });

        const soltar = () => {

            entrada.arrastando = false;

            elemento.classList.remove("arrastando");

        };

        barraEl.addEventListener("pointerup", soltar);
        barraEl.addEventListener("pointercancel", soltar);

        // Teclado: setas pulam 5 segundos
        barraEl.addEventListener("keydown", evento => {

            const video =
                entrada.video;

            if (!video || !video.duration) return;

            if (evento.key === "ArrowRight" || evento.key === "ArrowLeft") {

                evento.preventDefault();

                const passo =
                    evento.key === "ArrowRight" ? 5 : -5;

                buscar(
                    entrada,
                    (video.currentTime + passo) / video.duration
                );

            }

        });

    }


    // =================================================
    // ABRIR O ITEM DE ASSISTIDOS ASSOCIADO
    // =================================================
    // Reaproveita o modal que já existe em assistidos.js.

    async function abrirAssistido(dados) {

        if (typeof abrirDetalhesAssistido !== "function") return;

        try {

            if (!assistidosCache.length) {

                assistidosCache =
                    await lerJSON(CAMINHO_ASSISTIDOS);

            }

            const alvo =
                acharAssistido(dados.assistidoId);

            if (!alvo) return;

            if (ativo?.video) ativo.video.pause();

            const notas =
                typeof lerNotasDoItem === "function"
                    ? lerNotasDoItem(alvo)
                    : { notaEu: 0, notaEla: 0 };

            abrirDetalhesAssistido(alvo, {
                notaEu: notas.notaEu,
                notaEla: notas.notaEla,
                notaMedia: 0,
                ehListaFutura: alvo.categoria === "queremos",
                ehContinuar:
                    alvo.status === "assistindo" &&
                    alvo.categoria !== "queremos"
            });

        } catch (erro) {

            console.error(
                "Erro ao abrir o item de Assistidos:",
                erro
            );

        }

    }


    // =================================================
    // ATMOSFERA — pontinhos de luz fixos, bem discretos
    // =================================================

    function criarAtmosfera() {

        if (!pagina) return;

        const camada =
            pagina.querySelector(".preview-atmosfera");

        if (!camada || camada.children.length) return;

        const fragmento =
            document.createDocumentFragment();

        // estrelinhas
        for (let i = 0; i < 14; i++) {

            const ponto =
                document.createElement("span");

            ponto.className =
                "preview-brilho";

            ponto.style.setProperty("--x", `${(2 + Math.random() * 96).toFixed(1)}%`);
            ponto.style.setProperty("--y", `${(3 + Math.random() * 92).toFixed(1)}%`);
            ponto.style.setProperty("--tam", `${(2 + Math.random() * 2.2).toFixed(1)}px`);
            ponto.style.setProperty("--dur", `${(4 + Math.random() * 4).toFixed(1)}s`);
            ponto.style.setProperty("--delay", `-${(Math.random() * 6).toFixed(1)}s`);

            fragmento.appendChild(ponto);

        }

        // corações pequenos, quase parados
        for (let i = 0; i < 6; i++) {

            const coracao =
                document.createElement("span");

            coracao.className =
                "preview-coracao";

            coracao.setAttribute("aria-hidden", "true");

            coracao.textContent =
                GLIFOS_CORACAO[Math.floor(Math.random() * GLIFOS_CORACAO.length)];

            coracao.style.setProperty("--x", `${(3 + Math.random() * 94).toFixed(1)}%`);
            coracao.style.setProperty("--y", `${(6 + Math.random() * 88).toFixed(1)}%`);
            coracao.style.setProperty("--tam", `${(11 + Math.random() * 6).toFixed(0)}px`);
            coracao.style.setProperty("--dur", `${(10 + Math.random() * 6).toFixed(1)}s`);
            coracao.style.setProperty("--delay", `-${(Math.random() * 10).toFixed(1)}s`);

            fragmento.appendChild(coracao);

        }

        // desenhinhos de cinema (claquete, rolo de filme, pipoca, câmera...)
        DOODLES.forEach(doodle => {

            const desenho =
                document.createElement("span");

            desenho.className =
                `preview-doodle ${doodle.classe}`;

            desenho.setAttribute("aria-hidden", "true");

            desenho.innerHTML = doodle.svg;

            fragmento.appendChild(desenho);

        });

        // cometas que cruzam o céu de vez em quando
        for (let i = 0; i < 5; i++) {

            const cometa =
                document.createElement("span");

            cometa.className = "preview-cometa";

            cometa.setAttribute("aria-hidden", "true");

            const angulo = 18 + Math.random() * 22;      // desce pra direita
            const distancia = 38 + Math.random() * 22;   // em vw

            const radianos = angulo * Math.PI / 180;

            cometa.style.setProperty("--x", `${(Math.random() * 60).toFixed(0)}%`);
            cometa.style.setProperty("--y", `${(4 + Math.random() * 40).toFixed(0)}%`);
            cometa.style.setProperty("--ang", `${angulo.toFixed(0)}deg`);
            cometa.style.setProperty("--dx", `${(Math.cos(radianos) * distancia).toFixed(1)}vw`);
            cometa.style.setProperty("--dy", `${(Math.sin(radianos) * distancia).toFixed(1)}vw`);
            cometa.style.setProperty("--dur", `${(9 + Math.random() * 9).toFixed(1)}s`);
            cometa.style.setProperty("--delay", `-${(Math.random() * 14).toFixed(1)}s`);
            cometa.style.setProperty("--cauda", `${(110 + Math.random() * 90).toFixed(0)}px`);

            fragmento.appendChild(cometa);

        }

        // brilhos grandes, de quatro pontas
        for (let i = 0; i < 7; i++) {

            const brilho =
                document.createElement("span");

            brilho.className = "preview-brilho-grande";

            brilho.setAttribute("aria-hidden", "true");

            brilho.textContent = "✦";

            brilho.style.setProperty("--x", `${(3 + Math.random() * 94).toFixed(1)}%`);
            brilho.style.setProperty("--y", `${(4 + Math.random() * 90).toFixed(1)}%`);
            brilho.style.setProperty("--tam", `${(10 + Math.random() * 10).toFixed(0)}px`);
            brilho.style.setProperty("--dur", `${(5 + Math.random() * 4).toFixed(1)}s`);
            brilho.style.setProperty("--delay", `-${(Math.random() * 8).toFixed(1)}s`);

            fragmento.appendChild(brilho);

        }

        // a lua
        const lua =
            document.createElement("span");

        lua.className = "preview-lua";

        lua.setAttribute("aria-hidden", "true");

        lua.innerHTML = LUA_SVG;

        fragmento.appendChild(lua);

        camada.appendChild(fragmento);

    }


    // =================================================
    // ABAS — Assistidos | Preview
    // =================================================

    let previewCarregado = false;

    let fontesCarregadas = false;

    function carregarFontes() {

        if (fontesCarregadas) return;

        fontesCarregadas = true;

        const link =
            document.createElement("link");

        link.rel = "stylesheet";

        link.href = URL_FONTES;

        document.head.appendChild(link);

    }

    function aoAbrirPreview() {

        carregarFontes();

        if (previewCarregado) return;

        previewCarregado = true;

        carregar();

    }

    // Faíscas que saem do botão quando você abre o Preview
    function faiscas(botao) {

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const caixa =
            botao.getBoundingClientRect();

        const centroX = caixa.left + caixa.width / 2;
        const centroY = caixa.top + caixa.height / 2;

        const glifos = ["✦", "♡", "✧", "✦", "♥", "✧", "✦", "♡", "✧", "✦"];

        glifos.forEach((glifo, indice) => {

            const faisca =
                document.createElement("span");

            faisca.className = "preview-faisca";

            faisca.textContent = glifo;

            const angulo =
                (Math.PI * 2 * indice) / glifos.length +
                Math.random() * 0.5;

            const distancia =
                44 + Math.random() * 56;

            faisca.style.left = `${centroX}px`;
            faisca.style.top = `${centroY}px`;

            faisca.style.setProperty("--dx", `${(Math.cos(angulo) * distancia).toFixed(1)}px`);
            faisca.style.setProperty("--dy", `${(Math.sin(angulo) * distancia).toFixed(1)}px`);
            faisca.style.setProperty("--tam", `${(11 + Math.random() * 9).toFixed(0)}px`);

            faisca.style.color =
                indice % 3 === 0 ? "#f5c2d1" : "#dccbfa";

            document.body.appendChild(faisca);

            setTimeout(() => faisca.remove(), 1050);

        });

    }

    function iniciarAbas() {

        const abas =
            document.getElementById("assistidos-abas");

        if (!abas || !pagina) return;

        // Começa a buscar as fontes assim que a pessoa chega perto das abas
        ["pointerenter", "pointerdown", "focusin"].forEach(nome => {

            abas.addEventListener(nome, carregarFontes, { once: true });

        });

        const titulo =
            pagina.querySelector(".section-title");

        const tituloOriginal =
            titulo ? titulo.innerHTML : "";

        const paineis =
            pagina.querySelectorAll("[data-painel]");

        const selecionar = (nome, botaoClicado) => {

            const jaEstava =
                pagina.classList.contains("aba-preview");

            abas.querySelectorAll("[data-aba]").forEach(botao => {

                const ativa =
                    botao.dataset.aba === nome;

                botao.classList.toggle("ativa", ativa);

                botao.setAttribute("aria-selected", String(ativa));

            });

            paineis.forEach(painelAba => {

                painelAba.hidden =
                    painelAba.dataset.painel !== nome;

            });

            // O botão "Continuar assistindo" é só da aba Assistidos
            pagina.classList.toggle("aba-preview", nome === "preview");

            if (titulo) {

                titulo.innerHTML =
                    nome === "preview" ? "Preview" : tituloOriginal;

            }

            recolher();

            pagina.scrollTo({ top: 0 });

            if (nome === "preview") {

                aoAbrirPreview();

                if (!jaEstava && botaoClicado) faiscas(botaoClicado);

            } else {

                // saiu do Preview: limpa o filtro por filme
                limparFiltroFilme(false);

                if (ativo?.video) ativo.video.pause();

            }

        };

        abas.addEventListener("click", evento => {

            const botao =
                evento.target.closest("[data-aba]");

            if (botao) selecionar(botao.dataset.aba, botao);

        });

    }


    // =================================================
    // QUANDO A ABA FICA ESCONDIDA
    // =================================================

    document.addEventListener("visibilitychange", () => {

        if (document.hidden && ativo?.video) {

            ativo.video.pause();

        }

    });


    // =================================================
    // INICIAR
    // =================================================

    // Clicar fora do vídeo expandido, apertar Esc ou redimensionar a janela recolhe
    document.addEventListener("pointerdown", evento => {

        if (!feed.classList.contains("tem-expandido")) return;

        // tocar no vídeo aberto não recolhe; em qualquer outro lugar, sim
        if (evento.target.closest(".preview-item.expandido .preview-quadro")) return;

        recolher();

    });

    document.addEventListener("keydown", evento => {

        if (evento.key === "Escape") recolher();

    });

    // Rolar a página (ou deslizar uma fileira) recolhe o vídeo aberto, porque
    // ele fica fixo na tela. (O "capture" pega a rolagem de qualquer elemento.)
    document.addEventListener("scroll", () => {

        if (!feed.classList.contains("tem-expandido")) return;

        const aberto =
            feed.querySelector(".preview-item.expandido");

        const entrada =
            aberto && entradas.get(aberto);

        if (!entrada?.expandido) return;

        // ignora a rolagem que sobra de antes do toque (inércia)
        if (performance.now() - entrada.expandido.iniciadoEm < 500) return;

        recolher();

    }, true);

    let modoAtual = modoDeLayout();
    let esperaRedimensionar = null;

    window.addEventListener("resize", () => {

        recolher();

        // Passou de computador pra tablet/celular (ou o contrário): refaz o mural
        clearTimeout(esperaRedimensionar);

        esperaRedimensionar = setTimeout(() => {

            const agora = modoDeLayout();

            if (agora !== modoAtual) {

                modoAtual = agora;

                if (previewCarregado && todosItens.length) atualizarMural(false);

            }

        }, 250);

    });
// chamado pela página de Assistidos (selo ▶ e botão "ver edit")
window.abrirPreviewDoFilme = function (id, titulo) {

    const aba =
        document.querySelector('#assistidos-abas [data-aba="preview"]');

    if (!aba) return;

    filtroAssistidoId = String(id);
    tituloFiltroFilme = titulo || "";
    filtroAtual = "todos";

    aba.click();

    // se o Preview já tinha carregado, refaz a lateral e o mural já filtrados
    // (na primeira vez, o próprio carregar() desenha tudo filtrado)
    if (previewCarregado && todosItens.length) {

        criarLateral();

        atualizarMural();

    }

};
    criarAtmosfera();

    iniciarAbas();

})();