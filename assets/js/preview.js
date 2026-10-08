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

    // Deslocamentos, em % da largura do feed.
    // PRECISAM ser iguais ao --desl e ao --shift do preview.css.
    const DESLOCAMENTO_DESKTOP = 15;
    const DESLOCAMENTO_MOBILE = 7.5;
    const DESLOCAMENTO_INFO = 12;     // só no desktop (--shift)

    // Proporção de referência (vídeo vertical 9:16) e quanto um
    // vídeo pode crescer/encolher em relação ao tamanho-base.
    const RAZAO_BASE = 9 / 16;
    const FATOR_MIN = 0.85;
    const FATOR_MAX = 1.6;

    // Quão antes de aparecer o item "monta" o vídeo / entra o próximo lote
    const MARGEM_MONTAR = "700px 0px";
    const MARGEM_PROXIMO_LOTE = "900px 0px";

    const ROTULOS_CATEGORIA = {
        filmes: "Filme",
        series: "Série",
        animes: "Anime",
        queremos: "Queremos ver"
    };

    const GLIFOS_ENFEITE = ["✦", "✧", "♡", "✦", "♥"];
    const CORES_ENFEITE = ["#c9a7f5", "#f5c2d1", "#b9a0f5"];

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

    // Amplitude do deslocamento (0.72 a 1): deixa a onda menos mecânica
    function amplitude(item) {

        return 0.72 + hash(item.id + "-amp") * 0.28;

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


    // =================================================
    // PROPORÇÃO — cada vídeo tem o tamanho da própria forma
    // =================================================
    // --razao  largura / altura do vídeo (a moldura usa isso)
    // --fator  quanto o vídeo cresce em relação ao vertical:
    //          mantém a "área" parecida (um horizontal fica
    //          mais largo, mas não gigante).

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

        const fator =
            Math.min(
                Math.max(Math.sqrt(limitada / RAZAO_BASE), FATOR_MIN),
                FATOR_MAX
            );

        item.style.setProperty("--razao", razao.toFixed(4));
        item.style.setProperty("--fator", fator.toFixed(3));

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

            if (i > 0) {

                fragmento.appendChild(
                    criarFio(itens[i - 1], itens[i], i)
                );

            }

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
    // FIO — linha pontilhada que liga um vídeo ao próximo
    // =================================================
    // Desenhada em SVG esticado (viewBox 100x100, sem manter
    // proporção): x em % da largura do feed, igual ao CSS.

    function criarFio(anterior, atual, indiceAtual) {

        const posicaoX = (item, indice, deslocamento, deslocamentoInfo) =>
            50 -
            deslocamentoInfo +
            (indice % 2 === 0 ? -1 : 1) *
            deslocamento *
            amplitude(item);

        const caminho = (deslocamento, deslocamentoInfo) => {

            const x1 =
                posicaoX(anterior, indiceAtual - 1, deslocamento, deslocamentoInfo).toFixed(2);

            const x2 =
                posicaoX(atual, indiceAtual, deslocamento, deslocamentoInfo).toFixed(2);

            return `M ${x1} 0 C ${x1} 58, ${x2} 42, ${x2} 100`;

        };

        const fio =
            document.createElement("div");

        fio.className =
            "preview-fio";

        fio.setAttribute("aria-hidden", "true");

        fio.innerHTML = `
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <path class="fio-desktop" d="${caminho(DESLOCAMENTO_DESKTOP, DESLOCAMENTO_INFO)}"/>
                <path class="fio-mobile" d="${caminho(DESLOCAMENTO_MOBILE, 0)}"/>
            </svg>
        `;

        return fio;

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


    // Cartão de informações ao lado do vídeo (embaixo, no celular)

    function criarInfo(dados) {

        const frase =
            (dados.titulo || "").trim();

        const temAssociacao =
            Boolean(dados.assistidoId) && Boolean(dados.assistidoTitulo);

        if (!frase && !temAssociacao) return "";

        // Sem item de Assistidos: só o título do vídeo
        if (!temAssociacao) {

            return `
                <div class="preview-info">
                    <p class="preview-info-titulo">${escaparHTML(frase)}</p>
                </div>
            `;

        }

        const alvo =
            acharAssistido(dados.assistidoId);

        const poster =
            alvo?.capa || alvo?.imagem || alvo?.poster || "";

        const categoria =
            ROTULOS_CATEGORIA[dados.assistidoCategoria] || "";

        const meta =
            [categoria, alvo?.ano].filter(Boolean).join(" • ");

        return `
            <div class="preview-info">

                <div class="preview-info-topo">

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

                    <div class="preview-info-texto">

                        <p class="preview-info-titulo">${escaparHTML(dados.assistidoTitulo)}</p>

                        ${
                            meta
                                ? `<p class="preview-info-meta">${escaparHTML(meta)}</p>`
                                : ""
                        }

                    </div>

                </div>

                ${
                    frase
                        ? `<p class="preview-info-frase">“${escaparHTML(frase)}”</p>`
                        : ""
                }

                <button
                    type="button"
                    class="preview-info-link"
                    aria-label="Ver detalhes: ${escaparAtributo(dados.assistidoTitulo)}"
                >
                    ${ICONE_LINK}
                </button>

            </div>
        `;

    }

    function criarItem(dados, indice) {

        const esquerda =
            indice % 2 === 0;

        const lado =
            esquerda ? -1 : 1;

        // Inclina o vídeo de leve pra dentro da diagonal
        const rotacao =
            -lado * (0.5 + hash(dados.id + "-rot") * 1.1);

        const item =
            document.createElement("article");

        item.className =
            "preview-item";

        item.dataset.lado =
            esquerda ? "esq" : "dir";

        item.style.setProperty("--lado", lado);
        item.style.setProperty("--amp", amplitude(dados).toFixed(3));
        item.style.setProperty("--rot", `${rotacao.toFixed(2)}deg`);


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

        const cantoFita =
            hash(dados.id + "-fita") < 0.5 ? "esq" : "dir";

        const corFita =
            hash(dados.id + "-fitacor") < 0.5 ? "lilas" : "rosa";


        item.innerHTML = `

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

                    <button
                        type="button"
                        class="preview-mudo"
                        aria-label="Ligar ou desligar o som"
                    >
                        ${ICONE_SOM_LIGADO}
                        ${ICONE_SOM_DESLIGADO}
                    </button>

                    <span class="preview-erro" role="status">
                        Não foi possível carregar. Toque para tentar de novo.
                    </span>

                    <div class="preview-barra" aria-hidden="true">
                        <div class="preview-barra-fill"></div>
                    </div>

                </div>

                <span
                    class="preview-fita"
                    data-canto="${cantoFita}"
                    data-cor="${corFita}"
                    aria-hidden="true"
                ></span>

            </div>

            ${criarInfo(dados)}

        `;


        // Enfeites: um à esquerda do vídeo, outro à direita do cartão

        for (let n = 0; n < 2; n++) {

            const enfeite =
                document.createElement("span");

            enfeite.className =
                "preview-enfeite " + (n === 0 ? "enfeite-esq" : "enfeite-dir");

            enfeite.setAttribute("aria-hidden", "true");

            enfeite.textContent =
                GLIFOS_ENFEITE[
                    Math.floor(hash(dados.id + "-g" + n) * GLIFOS_ENFEITE.length)
                ];

            enfeite.style.setProperty(
                "--ey",
                `${n === 0 ? 8 + hash(dados.id + "-y0") * 22 : 58 + hash(dados.id + "-y1") * 28}%`
            );

            enfeite.style.setProperty(
                "--ed",
                `${22 + hash(dados.id + "-d" + n) * 46}px`
            );

            enfeite.style.setProperty(
                "--tam",
                `${12 + hash(dados.id + "-t" + n) * 12}px`
            );

            enfeite.style.setProperty(
                "--cor",
                CORES_ENFEITE[
                    Math.floor(hash(dados.id + "-c" + n) * CORES_ENFEITE.length)
                ]
            );

            enfeite.style.setProperty(
                "--dur",
                `${4.5 + hash(dados.id + "-u" + n) * 3}s`
            );

            enfeite.style.setProperty(
                "--delay",
                `-${(hash(dados.id + "-l" + n) * 5).toFixed(2)}s`
            );

            item.appendChild(enfeite);

        }


        // Entrada

        const entrada = {
            dados,
            elemento: item,
            moldura: item.querySelector(".preview-moldura"),
            area: item.querySelector(".preview-area"),
            barra: item.querySelector(".preview-barra-fill"),
            duracao: item.querySelector(".preview-duracao"),
            razaoConhecida: razaoConhecida > 0,
            video: null
        };

        entradas.set(item, entrada);


        entrada.area.addEventListener(
            "click",
            () => alternar(entrada)
        );

        item
            .querySelector(".preview-mudo")
            .addEventListener("click", evento => {

                evento.stopPropagation();

                alternarSom();

            });

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

            if (video.duration) {

                entrada.barra.style.transform =
                    `scaleX(${video.currentTime / video.duration})`;

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

        entrada.elemento.classList.remove(
            "tocando",
            "pausado",
            "carregando",
            "erro",
            "iniciado"
        );

    }

    function pausarOutros(entrada) {

        if (
            ativo &&
            ativo !== entrada &&
            ativo.video &&
            !ativo.video.paused
        ) {

            ativo.video.pause();

        }

        ativo = entrada;

    }


    // =================================================
    // TOCAR / PAUSAR
    // =================================================

    function alternar(entrada) {

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

        feed.classList.toggle("preview-sem-som", !somLigado);

        if (ativo?.video) {

            ativo.video.muted = !somLigado;

        }

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

        for (let i = 0; i < 16; i++) {

            const ponto =
                document.createElement("span");

            ponto.className =
                "preview-brilho";

            // No desktop, concentra nas laterais (o centro é do feed)
            const lateral =
                Math.random() < 0.5
                    ? 2 + Math.random() * 20
                    : 78 + Math.random() * 20;

            ponto.style.setProperty("--x", `${lateral.toFixed(1)}%`);
            ponto.style.setProperty("--y", `${(3 + Math.random() * 92).toFixed(1)}%`);
            ponto.style.setProperty("--tam", `${(2 + Math.random() * 2.4).toFixed(1)}px`);
            ponto.style.setProperty("--dur", `${(4 + Math.random() * 4).toFixed(1)}s`);
            ponto.style.setProperty("--delay", `-${(Math.random() * 6).toFixed(1)}s`);

            fragmento.appendChild(ponto);

        }

        camada.appendChild(fragmento);

    }


    // =================================================
    // ABAS — Assistidos | Preview
    // =================================================

    let previewCarregado = false;

    function aoAbrirPreview() {

        if (previewCarregado) return;

        previewCarregado = true;

        carregar();

    }

    function iniciarAbas() {

        const abas =
            document.getElementById("assistidos-abas");

        if (!abas || !pagina) return;

        const titulo =
            pagina.querySelector(".section-title");

        const tituloOriginal =
            titulo ? titulo.innerHTML : "";

        const paineis =
            pagina.querySelectorAll("[data-painel]");

        const selecionar = nome => {

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

            pagina.scrollTo({ top: 0 });

            if (nome === "preview") {

                aoAbrirPreview();

            } else if (ativo?.video) {

                ativo.video.pause();

            }

        };

        abas.addEventListener("click", evento => {

            const botao =
                evento.target.closest("[data-aba]");

            if (botao) selecionar(botao.dataset.aba);

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

    criarAtmosfera();

    iniciarAbas();

})();