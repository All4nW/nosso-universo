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

    const RITMO_ESPELHADO = [
        ["destaque", 6, 7, 0],
        ["medio",    1, 5, 44],
        ["compacto", 7, 6, 0],
        ["compacto", 1, 6, 36],
        ["pequeno",  9, 4, 0],
        ["pequeno",  5, 4, 26],
        ["pequeno",  1, 4, 8]
    ];

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
        "&family=DM+Sans:wght@400;500;600&display=swap";

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

        criarFiltros();

        mostrarItens(todosItens);

    }

    function mostrarItens(lista) {

        itens = lista;

        if (!itens.length) {

            feed.innerHTML = `
                <p class="preview-vazio">
                    Ainda não há nada por aqui.
                </p>
            `;

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

        if (disponiveis.length < 2 || !painel) {

            painel?.classList.add("sem-filtros");

            return;

        }

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

        painel.insertBefore(nav, feed);

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

        limparFeed();

        mostrarItens(
            chave === "todos"
                ? todosItens
                : todosItens.filter(
                    item => item.assistidoCategoria === chave
                )
        );

        pagina?.scrollTo({ top: 0 });

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

    function desconectarObservadores() {

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

        observadorLote.observe(sentinela);

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


    // Informações do vídeo: título, "categoria · ano", a frase do vídeo
    // (como uma anotação à mão) e o pôster do filme em todas as variantes.

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
                    <h3 class="pc-titulo">${escaparHTML(frase)}</h3>
                </div>
            `;

        }

        const alvo =
            acharAssistido(dados.assistidoId);

        const poster =
            alvo?.capa || alvo?.imagem || alvo?.poster || "";

        const categoria =
            ROTULOS_CATEGORIA[dados.assistidoCategoria] || "";

        const ano =
            alvo?.ano ? String(alvo.ano) : "";

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

                        <h3 class="pc-titulo" title="${escaparAtributo(dados.assistidoTitulo)}">${escaparHTML(dados.assistidoTitulo)}</h3>

                        ${
                            categoria || ano
                                ? `<p class="pc-meta">
                                        ${
                                            categoria
                                                ? `<span class="pc-cat" data-cat="${escaparAtributo(dados.assistidoCategoria)}">${escaparHTML(categoria)}</span>`
                                                : ""
                                        }
                                        ${
                                            ano
                                                ? `<span class="pc-ano">${escaparHTML(ano)}</span>`
                                                : ""
                                        }
                                   </p>`
                                : ""
                        }

                    </div>

                </div>

                ${
                    frase
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

    function criarItem(dados, indice) {

        // Variante e lugar no mural, pelo ritmo (espelhado a cada ciclo)
        const ciclo =
            Math.floor(indice / RITMO.length);

        const tabela =
            ciclo % 2 === 0 ? RITMO : RITMO_ESPELHADO;

        const [variante, coluna, largura, desnivel] =
            tabela[indice % RITMO.length];

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
        item.style.setProperty("--rot", `${rotacao.toFixed(2)}deg`);

        // atraso da animação de entrada: os cartões "pousam" em sequência
        item.style.setProperty("--atraso", `${(indice % 8) * 80 + 120}ms`);


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

        // Fita adesiva: no destaque, no médio e em alguns pequenos
        const comFita =
            variante === "destaque" ||
            variante === "medio" ||
            (variante === "pequeno" && hash(dados.id + "-ft") < 0.5);

        const cantoFita =
            hash(dados.id + "-fita") < 0.5 ? "esq" : "dir";

        const corFita =
            hash(dados.id + "-fitacor") < 0.5 ? "lilas" : "rosa";


        item.innerHTML = `

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

            </div>

            ${criarInfo(dados, variante)}

            ${
                comFita
                    ? `<span
                            class="preview-fita"
                            data-canto="${cantoFita}"
                            data-cor="${corFita}"
                            aria-hidden="true"
                       ></span>`
                    : ""
            }

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
            .querySelector(".preview-info-poster")
            ?.addEventListener("error", evento => {

                evento.target.remove();

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

    // Vídeos pequenos (miniatura e bilhete) crescem quando você clica,
    // pra dar pra assistir. Só o VÍDEO cresce: o papel e o texto ficam
    // parados, e o vídeo mantém a própria proporção. É só um zoom
    // (transform), então o layout em volta não muda e nada abre numa tela
    // nova. Clicar fora ou Esc recolhe.

    const VARIANTES_QUE_EXPANDEM = ["pequeno", "compacto"];

    function expandirSePequeno(entrada) {

        const item =
            entrada.elemento;

        if (!VARIANTES_QUE_EXPANDEM.includes(item.dataset.variante)) return;

        if (item.classList.contains("expandido")) return;

        const quadro =
            entrada.moldura.parentElement;

        const largura = entrada.moldura.offsetWidth;
        const altura = entrada.moldura.offsetHeight;

        if (!largura || !altura) return;

        // O vídeo expande bem maior que os cards grandes: até 680 x 580 no
        // computador (menos no celular), sempre mantendo a proporção dele e
        // cabendo na tela. Só ele cresce; o vídeo em si é desenhado na
        // resolução original, então não perde nitidez. Pra não "esticar"
        // além do que o arquivo tem, o tamanho nunca passa da largura
        // original do vídeo (quando a gente sabe qual é).
        const estreito = window.innerWidth <= 760;

        const larguraMaxima = estreito ? window.innerWidth - 40 : 680;
        const alturaMaxima = estreito ? 480 : 580;

        const razao = largura / altura;

        const larguraOriginal =
            entrada.video?.videoWidth ||
            Number(entrada.dados.largura) ||
            Infinity;

        const alvoLargura =
            Math.min(
                larguraMaxima,
                alturaMaxima * razao,
                window.innerWidth - 32,
                window.innerHeight * 0.85 * razao,
                larguraOriginal
            );

        const zoom = alvoLargura / largura;

        // Já é grande o bastante: não mexe
        if (zoom < 1.12) return;

        // Mantém o vídeo ampliado dentro da tela
        const caixa =
            quadro.getBoundingClientRect();

        const centroX = caixa.left + caixa.width / 2;
        const centroY = caixa.top + caixa.height / 2;

        const larguraFinal = largura * zoom;
        const alturaFinal = altura * zoom;

        const margem = 16;
        const topoMinimo = 84;       // não passa por baixo dos botões do topo

        let deslocX = 0;
        let deslocY = 0;

        const esquerda = centroX - larguraFinal / 2;
        const direita = centroX + larguraFinal / 2;

        if (esquerda < margem) {

            deslocX = margem - esquerda;

        } else if (direita > window.innerWidth - margem) {

            deslocX = window.innerWidth - margem - direita;

        }

        const topo = centroY - alturaFinal / 2;
        const base = centroY + alturaFinal / 2;

        if (topo < topoMinimo) {

            deslocY = topoMinimo - topo;

        } else if (base > window.innerHeight - margem) {

            deslocY = window.innerHeight - margem - base;

        }

        item.style.setProperty("--zoom", zoom.toFixed(3));
        item.style.setProperty("--zx", `${deslocX.toFixed(1)}px`);
        item.style.setProperty("--zy", `${deslocY.toFixed(1)}px`);

        item.classList.add("expandido");

        feed.classList.add("tem-expandido");

    }

    function recolher() {

        feed
            .querySelectorAll(".preview-item.expandido")
            .forEach(item => {

                item.classList.remove("expandido");

                // esconde os controles enquanto o vídeo volta ao tamanho normal
                item.classList.add("recolhendo");

                setTimeout(() => item.classList.remove("recolhendo"), 520);

            });

        feed.classList.remove("tem-expandido");

    }

    function pausarOutros(entrada) {

        const expandido =
            feed.querySelector(".preview-item.expandido");

        if (expandido && expandido !== entrada.elemento) recolher();

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

            } else if (ativo?.video) {

                ativo.video.pause();

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

        if (evento.target.closest(".preview-item.expandido")) return;

        recolher();

    });

    document.addEventListener("keydown", evento => {

        if (evento.key === "Escape") recolher();

    });

    window.addEventListener("resize", recolher);

    criarAtmosfera();

    iniciarAbas();

})();