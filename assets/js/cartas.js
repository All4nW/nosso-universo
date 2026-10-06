// =====================================================
// NOSSO UNIVERSO — CARTAS PARA NÓS
// Iteração 5: fundo ilustrado, carrosséis, bilhetinhos
// =====================================================

let cartasItens = [];
let cartasFiltroAtivo = "todas";
let cartasBuscaAtual = "";

// Funções que recalculam as setas de cada carrossel
let carrosseisAtualizadores = [];


// =====================================================
// FUNDO DA PÁGINA
// =====================================================
// O caminho é relativo ao HTML (o mesmo do letters.json),
// por isso é aplicado aqui e não no CSS.

const CARTAS_FUNDO_DESKTOP = "assets/images/cartas/fundo_cartas.gif";

// Versão vertical, usada no celular (mesma largura do
// breakpoint mobile do CSS).
const CARTAS_FUNDO_MOBILE = "assets/images/cartas/fundo_cartas_1.gif";

function aplicarFundoCartas() {

    const pagina =
        document.querySelector('.view[data-view="cartas"]');

    if (!pagina) return;

    const mobile =
        window.matchMedia("(max-width: 760px)");

    const aplicar = () => {

        pagina.style.backgroundImage =
            `url("${mobile.matches ? CARTAS_FUNDO_MOBILE : CARTAS_FUNDO_DESKTOP}")`;

    };

    aplicar();

    // Troca sozinho se a janela mudar de tamanho ou o celular girar.
    mobile.addEventListener("change", aplicar);

}


// =====================================================
// CATEGORIAS (só das cartas — bilhetinhos têm "tipo")
// =====================================================

const CARTAS_CATEGORIAS_ORDEM = [
    { chave: "aniversario", titulo: "Aniversário" },
    { chave: "relacionamento", titulo: "Relacionamento" },
    { chave: "outros", titulo: "Outros" }
];

// O símbolo do selo depende de quem escreveu:
// ela = coração rosa, ele = estrela azul.
const SIMBOLOS_AUTOR = {
    ela: "♥",
    eu: "★"
};


// =====================================================
// ÍCONES (SVG de contorno, herdam a cor do CSS)
// =====================================================

const ICONE_ENVELOPE = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5.5" width="18" height="13" rx="2.2"/>
        <path d="M3.8 7.2 12 13.4l8.2-6.2"/>
    </svg>`;

const ICONE_CORACAO = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20.2s-7.4-4.6-7.4-10.1A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.4 2.5c0 5.5-7.4 10.1-7.4 10.1z"/>
    </svg>`;

const ICONE_BOLO = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 20.5h15v-6.2a2 2 0 0 0-2-2h-11a2 2 0 0 0-2 2z"/>
        <path d="M4.5 16.4c1.6 1.3 2.9 1.3 3.8 0 .9 1.3 2.2 1.3 3.7 0 1.5 1.3 2.8 1.3 3.7 0 .9 1.3 2.2 1.3 3.8 0"/>
        <path d="M9 12.3V9.4M12 12.3V8.4M15 12.3V9.4"/>
        <path d="M9 7.6c-.5-.6-.5-1.2 0-1.8.5.6.5 1.2 0 1.8zM12 6.6c-.5-.6-.5-1.2 0-1.8.5.6.5 1.2 0 1.8zM15 7.6c-.5-.6-.5-1.2 0-1.8.5.6.5 1.2 0 1.8z"/>
    </svg>`;

const ICONE_SETA_ESQUERDA = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.5 5.5 8 12l6.5 6.5"/>
    </svg>`;

const ICONE_SETA_DIREITA = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.5 5.5 16 12l-6.5 6.5"/>
    </svg>`;

const ICONES_CATEGORIA = {
    aniversario: ICONE_BOLO,
    relacionamento: ICONE_CORACAO,
    outros: ICONE_ENVELOPE
};


// =====================================================
// BILHETINHOS
// =====================================================
// No letters.json, um bilhetinho é um item com
//   "tipo": "bilhete"
// Campos usados: id, autor ("eu" | "ela"), data, mensagem
// e, opcionalmente, "cor": rosa | lilas | azul | creme | menta
// Se não tiver cor, ela é escolhida pelo id (sempre a mesma).

const BILHETES_CORES =
    ["rosa", "lilas", "azul", "creme", "menta"];

// Quantos aparecem na visão "Todas". No filtro
// "Bilhetinhos" (ou numa busca) aparecem todos.
const BILHETES_LIMITE_INICIAL = 6;

// Acima disso o bilhete ganha uma folha mais larga.
const BILHETES_CARACTERES_LONGO = 90;

function ehBilhete(item) {

    return item && item.tipo === "bilhete";

}


// =====================================================
// FORMATAR DATA
// =====================================================

function formatarDataCarta(dataString) {

    if (!dataString) return "";

    const data =
        new Date(dataString + "T00:00:00");

    if (Number.isNaN(data.getTime())) return "";

    return data.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );

}

function formatarDataCurta(dataString) {

    if (!dataString) return "";

    const data =
        new Date(dataString + "T00:00:00");

    if (Number.isNaN(data.getTime())) return "";

    return data.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "short"
        }
    );

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTMLCarta(texto) {

    const div =
        document.createElement("div");

    div.textContent =
        texto || "";

    return div.innerHTML;

}


// =====================================================
// FORMATAR MENSAGEM — escapa tudo e depois converte
// **negrito** em <strong>. A ordem importa: escapa
// primeiro (pra texto digitado nunca virar HTML de
// verdade), só depois cria as tags de negrito que a
// gente mesmo controla.
// =====================================================

function formatarMensagemCarta(texto) {

    const escapado =
        escaparHTMLCarta(texto);

    return escapado.replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>"
    );

}


// =====================================================
// HASH DETERMINÍSTICO — pra inclinação/flutuação
// de cada envelope e bilhete ser sempre a mesma
// =====================================================

function hashCarta(texto) {

    let hash = 0;

    texto = String(texto);

    for (let i = 0; i < texto.length; i++) {

        hash =
            (hash * 31 + texto.charCodeAt(i)) % 100000;

    }

    return hash / 100000;

}


// =====================================================
// CARREGAR
// =====================================================

async function carregarCartas() {

    const arquivo =
        document.getElementById("cartas-arquivo");

    if (!arquivo) return;

    aplicarFundoCartas();

    try {

        const resposta =
            await fetch(
                "assets/data/letters.json",
                { cache: "no-cache" }
            );

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível carregar letters.json."
            );
        }

        cartasItens =
            await resposta.json();

    } catch (erro) {

        console.error(
            "Erro ao carregar cartas:",
            erro
        );

        cartasItens = [];

    }

    atualizarContagemCartas();

    configurarEventosCartas();

    renderizarArquivo();

}



// =====================================================
// CONTAGEM
// =====================================================

function atualizarContagemCartas() {

    const contagem =
        document.getElementById("cartas-contagem");

    if (!contagem) return;

    const totalBilhetes =
        cartasItens.filter(ehBilhete).length;

    const totalCartas =
        cartasItens.length - totalBilhetes;

    const textoCartas =
        totalCartas === 1
            ? "1 carta"
            : `${totalCartas} cartas`;

    if (!totalBilhetes) {

        contagem.textContent =
            totalCartas === 1
                ? "1 carta guardada"
                : `${totalCartas} cartas guardadas`;

        return;

    }

    const textoBilhetes =
        totalBilhetes === 1
            ? "1 bilhetinho"
            : `${totalBilhetes} bilhetinhos`;

    contagem.textContent =
        `${textoCartas} e ${textoBilhetes} guardados`;

}


// =====================================================
// FILTRAR + BUSCAR
// =====================================================
// Filtros: todas | eu | ela | bilhetes
// ("destaque" continua aceito como apelido de "bilhetes",
// caso o HTML ainda tenha o data-filtro antigo.)

function obterCartasFiltradas() {

    let itens = [...cartasItens];


    if (cartasFiltroAtivo === "eu") {

        itens =
            itens.filter(
                item => item.autor === "eu"
            );

    } else if (cartasFiltroAtivo === "ela") {

        itens =
            itens.filter(
                item => item.autor === "ela"
            );

    } else if (
        cartasFiltroAtivo === "bilhetes" ||
        cartasFiltroAtivo === "destaque"
    ) {

        itens =
            itens.filter(ehBilhete);

    }


    const termo =
        cartasBuscaAtual
            .trim()
            .toLowerCase();

    if (termo) {

        itens =
            itens.filter(item => {

                const alvo = [
                    item.titulo,
                    item.mensagem,
                    item.categoria
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return alvo.includes(termo);

            });

    }


    return itens;

}


// =====================================================
// NORMALIZAR CATEGORIA
// =====================================================
// Cartas sem categoria válida caem em "Outros" em vez de
// sumirem. Isso inclui as antigas cartas "destaque":
// continuam existindo, só que agora como cartas normais.

function normalizarCategoriaCarta(categoria) {

    const validas =
        ["aniversario", "relacionamento", "outros"];

    return validas.includes(categoria)
        ? categoria
        : "outros";

}


// =====================================================
// MONTAR
// =====================================================
// Bilhetinhos ficam num mural no topo (mais recentes
// primeiro). Cartas viram seções por categoria.

function montarPorCategoria(itens) {

    const ordenados =
        [...itens].sort((a, b) => {

            const dataA = a.data || "";
            const dataB = b.data || "";

            return dataA.localeCompare(dataB);

        });


    const bilhetes =
        ordenados
            .filter(ehBilhete)
            .reverse();


    const cartas =
        ordenados.filter(item => !ehBilhete(item));


    const secoes =
        CARTAS_CATEGORIAS_ORDEM
            .map(categoria => ({
                titulo: categoria.titulo,
                chave: categoria.chave,
                itens: cartas.filter(
                    item =>
                        normalizarCategoriaCarta(item.categoria) ===
                        categoria.chave
                )
            }))
            .filter(secao => secao.itens.length);


    return { bilhetes, secoes };

}


// =====================================================
// CABEÇALHO DE SEÇÃO — linha, ícone, título, ♡, linha
// =====================================================

function criarCabecalhoSecao(iconeSvg, titulo) {

    const cabecalho =
        document.createElement("div");

    cabecalho.className =
        "cartas-secao-cabecalho";

    cabecalho.innerHTML = `

        <span class="cartas-secao-linha cartas-secao-linha-esq"></span>

        <span class="cartas-secao-icone" aria-hidden="true">
            ${iconeSvg}
        </span>

        <h2 class="cartas-secao-titulo">
            ${escaparHTMLCarta(titulo)}
        </h2>

        <span class="cartas-secao-coracao" aria-hidden="true">♡</span>

        <span class="cartas-secao-linha cartas-secao-linha-dir"></span>

    `;

    return cabecalho;

}


// =====================================================
// CARROSSEL — setas que rolam a fileira de envelopes
// =====================================================
// As setas só aparecem se a fileira não couber na tela.
// No celular elas somem e a pessoa desliza o dedo.

function criarCarrossel(colecao) {

    const carrossel =
        document.createElement("div");

    carrossel.className =
        "cartas-carrossel";


    const anterior =
        document.createElement("button");

    anterior.type = "button";

    anterior.className =
        "cartas-seta cartas-seta-anterior";

    anterior.setAttribute("aria-label", "Cartas anteriores");

    anterior.innerHTML = ICONE_SETA_ESQUERDA;


    const proxima =
        document.createElement("button");

    proxima.type = "button";

    proxima.className =
        "cartas-seta cartas-seta-proxima";

    proxima.setAttribute("aria-label", "Próximas cartas");

    proxima.innerHTML = ICONE_SETA_DIREITA;


    carrossel.append(anterior, colecao, proxima);


    const atualizar = () => {

        const maximo =
            colecao.scrollWidth - colecao.clientWidth;

        carrossel.classList.toggle(
            "tem-rolagem",
            maximo > 4
        );

        anterior.disabled =
            colecao.scrollLeft <= 2;

        proxima.disabled =
            colecao.scrollLeft >= maximo - 2;

    };

    const rolar = direcao => {

        colecao.scrollBy({
            left: direcao * colecao.clientWidth * 0.8,
            behavior: "smooth"
        });

    };

    anterior.addEventListener("click", () => rolar(-1));
    proxima.addEventListener("click", () => rolar(1));

    colecao.addEventListener("scroll", atualizar, { passive: true });

    carrosseisAtualizadores.push(atualizar);

    return carrossel;

}


// =====================================================
// RENDER DO ARQUIVO
// =====================================================

function renderizarArquivo() {

    const arquivo =
        document.getElementById("cartas-arquivo");

    if (!arquivo) return;

    const itens =
        obterCartasFiltradas();

    arquivo.innerHTML = "";

    carrosseisAtualizadores = [];


    if (!itens.length) {

        const ehFiltroBilhetes =
            cartasFiltroAtivo === "bilhetes" ||
            cartasFiltroAtivo === "destaque";

        arquivo.innerHTML = `
            <p class="cartas-vazio">
                ${
                    ehFiltroBilhetes
                        ? "Nenhum bilhetinho por aqui ainda."
                        : "Nenhuma carta encontrada por aqui."
                }
            </p>
        `;

        return;

    }


    const { bilhetes, secoes } =
        montarPorCategoria(itens);


    if (bilhetes.length) {

        const mostrarTodos =
            cartasFiltroAtivo !== "todas" ||
            cartasBuscaAtual.trim() !== "";

        arquivo.appendChild(
            criarBlocoBilhetes(bilhetes, mostrarTodos)
        );

    }


    secoes.forEach(secao => {

        arquivo.appendChild(
            criarSecaoCategoria(secao)
        );

    });


    // As medidas só existem depois que tudo entrou na página.

    requestAnimationFrame(() => {

        carrosseisAtualizadores.forEach(atualizar => atualizar());

    });

}


// =====================================================
// BLOCO DE BILHETINHOS
// =====================================================

function criarBlocoBilhetes(bilhetes, mostrarTodos) {

    const wrapper =
        document.createElement("section");

    wrapper.className =
        "bilhetes-bloco";

    wrapper.appendChild(
        criarCabecalhoSecao(
            ICONE_ENVELOPE,
            "Bilhetinhos"
        )
    );


    const visiveis =
        mostrarTodos
            ? bilhetes
            : bilhetes.slice(0, BILHETES_LIMITE_INICIAL);


    const mural =
        document.createElement("div");

    mural.className =
        "bilhetes-mural";

    visiveis.forEach(item => {

        mural.appendChild(
            criarBilhete(item)
        );

    });

    wrapper.appendChild(mural);


    if (visiveis.length < bilhetes.length) {

        const mais =
            document.createElement("button");

        mais.type = "button";

        mais.className =
            "bilhetes-mais";

        mais.textContent =
            `ver todos os ${bilhetes.length} bilhetinhos ♡`;

        mais.addEventListener("click", () => {

            const botaoFiltro =
                document.querySelector(
                    "#cartas-filtros [data-filtro='bilhetes']"
                );

            if (botaoFiltro) {

                botaoFiltro.click();

            } else {

                cartasFiltroAtivo = "bilhetes";

                renderizarArquivo();

            }

        });

        wrapper.appendChild(mais);

    }


    return wrapper;

}


// =====================================================
// BILHETE
// =====================================================

function obterCorBilhete(item) {

    if (BILHETES_CORES.includes(item.cor)) return item.cor;

    const h = hashCarta(item.id + "-b-cor");

    return BILHETES_CORES[
        Math.floor(h * BILHETES_CORES.length)
    ];

}

function nomeAutorCarta(item) {

    return item.autor === "ela"
        ? "Jhennyfer"
        : "Allan";

}

function escaparAtributoCarta(texto) {

    return escaparHTMLCarta(texto).replace(/"/g, "&quot;");

}


function criarBilhete(item) {

    const h1 = hashCarta(item.id + "-b-rot");
    const h2 = hashCarta(item.id + "-b-dy");
    const h4 = hashCarta(item.id + "-b-fita");

    const cor =
        obterCorBilhete(item);

    const variacaoFita =
        Math.floor(h4 * 3) + 1;

    const mensagem =
        item.mensagem || "";

    const nomeAutor =
        nomeAutorCarta(item);

    const temFoto =
        Boolean(item.foto);

    // Com foto o texto é cortado em 3 linhas no mural
    // (inteiro na tela expandida), então a folha larga não precisa.

    const longo =
        !temFoto &&
        mensagem.length > BILHETES_CARACTERES_LONGO;


    const bilhete =
        document.createElement("article");

    bilhete.tabIndex = 0;

    bilhete.setAttribute("role", "button");

    bilhete.setAttribute(
        "aria-label",
        `Abrir bilhetinho de ${nomeAutor}`
    );

    bilhete.className =
        `bilhete bilhete-cor-${cor} bilhete-fita-${variacaoFita}` +
        (longo ? " bilhete-longo" : "") +
        (temFoto ? " bilhete-com-foto" : "");

    bilhete.style.setProperty("--rot", `${(h1 - 0.5) * 8}deg`);
    bilhete.style.setProperty("--dy", `${(h2 - 0.5) * 20}px`);
    bilhete.style.setProperty("--capa-rot", `${(h4 - 0.5) * 5}deg`);

    bilhete.innerHTML = `

        <span class="bilhete-fita"></span>

        <div class="bilhete-papel">

            ${
                temFoto
                    ? `
                        <div class="bilhete-capa">
                            <img
                                src="${escaparAtributoCarta(item.foto)}"
                                alt=""
                                loading="lazy"
                            >
                        </div>
                    `
                    : ""
            }

            <p class="bilhete-texto">
                ${formatarMensagemCarta(mensagem)}
            </p>

            <footer class="bilhete-rodape">

                <span class="bilhete-assinatura">
                    — ${nomeAutor}
                </span>

                <span class="bilhete-data">
                    ${formatarDataCurta(item.data)}
                </span>

            </footer>

        </div>

    `;


    bilhete.addEventListener(
        "click",
        () => abrirBilhete(item, bilhete)
    );

    bilhete.addEventListener("keydown", evento => {

        if (evento.key === "Enter" || evento.key === " ") {

            evento.preventDefault();

            abrirBilhete(item, bilhete);

        }

    });

    return bilhete;

}


// =====================================================
// BILHETE EXPANDIDO — tela de leitura
// =====================================================
// Criado por aqui mesmo (não depende do HTML). Clicar na
// foto abre ela inteira, sem corte (lightbox abaixo).

function garantirOverlayBilhete() {

    let overlay =
        document.getElementById("bilhete-aberto-overlay");

    if (overlay) return overlay;


    overlay =
        document.createElement("div");

    overlay.id =
        "bilhete-aberto-overlay";

    overlay.className =
        "bilhete-aberto-overlay oculto";

    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Bilhetinho");

    overlay.innerHTML = `

        <div class="bilhete-aberto-caixa">

            <span class="bilhete-aberto-fita"></span>

            <div class="bilhete-aberto-folha">

                <button
                    type="button"
                    class="bilhete-aberto-fechar"
                    aria-label="Fechar"
                >×</button>

                <button
                    type="button"
                    class="bilhete-aberto-foto"
                    aria-label="Ver foto inteira"
                    title="Ver foto inteira"
                    hidden
                >
                    <img alt="">
                </button>

                <p class="bilhete-aberto-texto"></p>

                <footer class="bilhete-aberto-rodape">
                    <span class="bilhete-aberto-assinatura"></span>
                    <span class="bilhete-aberto-data"></span>
                </footer>

            </div>

        </div>

    `;

    document.body.appendChild(overlay);


    overlay.addEventListener("click", evento => {

        if (evento.target === overlay) {

            fecharBilhete();

        }

    });

    overlay
        .querySelector(".bilhete-aberto-fechar")
        .addEventListener("click", fecharBilhete);

    overlay
        .querySelector(".bilhete-aberto-foto")
        .addEventListener("click", evento => {

            evento.stopPropagation();

            const img =
                overlay.querySelector(".bilhete-aberto-foto img");

            if (img?.src) abrirLightboxCartas(img.src);

        });

    return overlay;

}


function abrirBilhete(item, elemento) {

    const overlay =
        garantirOverlayBilhete();

    const caixa =
        overlay.querySelector(".bilhete-aberto-caixa");


    const rect =
        elemento.getBoundingClientRect();

    overlay.style.setProperty(
        "--origem-x",
        `${((rect.left + rect.width / 2) / window.innerWidth) * 100}%`
    );

    overlay.style.setProperty(
        "--origem-y",
        `${((rect.top + rect.height / 2) / window.innerHeight) * 100}%`
    );


    caixa.className =
        `bilhete-aberto-caixa bilhete-cor-${obterCorBilhete(item)}`;


    overlay.querySelector(".bilhete-aberto-texto").innerHTML =
        formatarMensagemCarta(item.mensagem || "");

    overlay.querySelector(".bilhete-aberto-assinatura").textContent =
        `— ${nomeAutorCarta(item)} ♡`;

    overlay.querySelector(".bilhete-aberto-data").textContent =
        formatarDataCarta(item.data);


    const botaoFoto =
        overlay.querySelector(".bilhete-aberto-foto");

    if (item.foto) {

        botaoFoto.querySelector("img").src = item.foto;

        botaoFoto.hidden = false;

    } else {

        botaoFoto.hidden = true;

    }


    overlay.classList.remove("oculto");

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            overlay.classList.add("aberta");

        });

    });

    document.body.classList.add("modal-aberto");

    overlay
        .querySelector(".bilhete-aberto-fechar")
        .focus({ preventScroll: true });

}


function fecharBilhete() {

    const overlay =
        document.getElementById("bilhete-aberto-overlay");

    if (!overlay) return;

    overlay.classList.remove("aberta");

    document.body.classList.remove("modal-aberto");

    setTimeout(() => {

        if (!overlay.classList.contains("aberta")) {

            overlay.classList.add("oculto");

        }

    }, 550);

}


// =====================================================
// FOTO INTEIRA (LIGHTBOX) — cartas e bilhetinhos
// =====================================================
// A prévia é cortada (object-fit: cover); aqui a imagem
// aparece inteira, sem corte, numa moldura branca.

function garantirLightboxCartas() {

    let lightbox =
        document.getElementById("cartas-lightbox");

    if (lightbox) return lightbox;


    lightbox =
        document.createElement("div");

    lightbox.id =
        "cartas-lightbox";

    lightbox.className =
        "cartas-lightbox oculto";

    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Foto");

    lightbox.innerHTML = `

        <button
            type="button"
            class="cartas-lightbox-fechar"
            aria-label="Fechar foto"
        >×</button>

        <img class="cartas-lightbox-img" alt="">

    `;

    document.body.appendChild(lightbox);

    // Clicar em qualquer lugar fecha.
    lightbox.addEventListener("click", fecharLightboxCartas);

    return lightbox;

}


function abrirLightboxCartas(src) {

    if (!src) return;

    const lightbox =
        garantirLightboxCartas();

    lightbox.querySelector(".cartas-lightbox-img").src = src;

    lightbox.classList.remove("oculto");

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            lightbox.classList.add("aberta");

        });

    });

}


function fecharLightboxCartas() {

    const lightbox =
        document.getElementById("cartas-lightbox");

    if (!lightbox) return;

    lightbox.classList.remove("aberta");

    setTimeout(() => {

        if (!lightbox.classList.contains("aberta")) {

            lightbox.classList.add("oculto");

        }

    }, 400);

}



// =====================================================
// SEÇÃO POR CATEGORIA
// =====================================================

function criarSecaoCategoria(secao) {

    const wrapper =
        document.createElement("section");

    wrapper.className =
        "cartas-secao";

    wrapper.appendChild(
        criarCabecalhoSecao(
            ICONES_CATEGORIA[secao.chave] || ICONE_ENVELOPE,
            secao.titulo
        )
    );


    const colecao =
        document.createElement("div");

    colecao.className =
        "cartas-colecao";

    secao.itens.forEach(item => {

        colecao.appendChild(
            criarEnvelope(item)
        );

    });

    wrapper.appendChild(
        criarCarrossel(colecao)
    );

    return wrapper;

}


// =====================================================
// ENVELOPE
// =====================================================

function criarEnvelope(item) {

    const botao =
        document.createElement("button");

    botao.type = "button";


    const ehEla =
        item.autor === "ela";

    const h1 = hashCarta(item.id + "-rot");
    const h2 = hashCarta(item.id + "-float");
    const h3 = hashCarta(item.id + "-forma");
    const h4 = hashCarta(item.id + "-hover");

    const classeForma =
        `envelope-forma-${Math.floor(h3 * 3) + 1}`;

    const classeAutor =
        ehEla
            ? "carta-envelope-selo-jhennyfer"
            : "carta-envelope-selo-allan";

    botao.className =
        `carta-envelope ${classeForma} ` +
        (ehEla ? "autor-ela" : "autor-eu");

    botao.style.setProperty("--rot", `${(h1 - 0.5) * 10}deg`);
    botao.style.setProperty("--rot-hover", `${(h4 - 0.5) * 4}deg`);
    botao.style.setProperty("--flutuar-duracao", `${6 + h2 * 4}s`);
    botao.style.setProperty("--flutuar-delay", `${h1 * 3}s`);


    const remetente =
        ehEla
            ? "De: Jhennyfer"
            : "De: Allan";

    const simboloSelo =
        ehEla
            ? SIMBOLOS_AUTOR.ela
            : SIMBOLOS_AUTOR.eu;

    botao.setAttribute(
        "aria-label",
        `Abrir carta ${remetente.toLowerCase()}, ${formatarDataCurta(item.data)}`
    );


    botao.innerHTML = `

        <div class="carta-envelope-pilha"></div>

        <div class="carta-envelope-papel"></div>

        <div class="carta-envelope-corpo"></div>

        <div class="carta-envelope-fita-decorativa"></div>

        <div class="carta-envelope-aba"></div>

        <div class="carta-envelope-selo ${classeAutor}">
            ${simboloSelo}
        </div>

        ${
            item.foto
                ? `
                    <div class="carta-envelope-foto">
                        <img src="${item.foto}" alt="">
                    </div>
                `
                : ""
        }

        <span class="carta-envelope-coracao-canto">♡</span>

        <div class="carta-envelope-frente">
            <span class="carta-envelope-para">
                ${remetente}
            </span>

            <span class="carta-envelope-data">
                ${formatarDataCurta(item.data)}
            </span>
        </div>

    `;


    botao.addEventListener(
        "click",
        () => abrirEnvelope(item, botao)
    );

    return botao;

}


// =====================================================
// ABRIR ENVELOPE — DA CAPA PRA LEITURA
// =====================================================

function abrirEnvelope(item, envelopeElemento) {

    // Primeiro, a animação do próprio envelope abrindo.

    envelopeElemento.classList.add("abrindo");


    setTimeout(() => {

        mostrarLeitura(item, envelopeElemento);

    }, 420);

}


function mostrarLeitura(item, envelopeElemento) {

    const overlay =
        document.getElementById(
            "carta-aberta-overlay"
        );

    if (!overlay) return;


    const rect =
        envelopeElemento.getBoundingClientRect();

    const origemX =
        ((rect.left + rect.width / 2) / window.innerWidth) * 100;

    const origemY =
        ((rect.top + rect.height / 2) / window.innerHeight) * 100;

    overlay.style.setProperty("--origem-x", `${origemX}%`);
    overlay.style.setProperty("--origem-y", `${origemY}%`);


    const nomeAutor =
        item.autor === "ela"
            ? "Jhennyfer"
            : "Allan";


    document.getElementById(
        "carta-aberta-data"
    ).textContent =
        formatarDataCarta(item.data);

    document.getElementById(
        "carta-aberta-titulo"
    ).textContent =
        item.titulo || "";

    document.getElementById(
        "carta-aberta-texto"
    ).innerHTML =
        formatarMensagemCarta(item.mensagem || "");

    document.getElementById(
        "carta-aberta-assinatura"
    ).textContent =
        `— ${nomeAutor} ❤`;


    removerDespedidaAutomatica(overlay);


    inserirFotoNaCarta(item.foto);


    overlay.classList.remove("oculto");

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            overlay.classList.add("aberta");

        });

    });


    document.body.classList.add("modal-aberto");


    envelopeElemento.classList.remove("abrindo");

}


// =====================================================
// SEM DESPEDIDA AUTOMÁTICA
// =====================================================
// O HTML da carta aberta trazia um "Amor," fixo acima da
// assinatura, em todas as cartas. Aqui ele é removido —
// e o CSS também esconde .carta-aberta-despedida. O ideal
// é apagar essa linha do index.html de vez.

function removerDespedidaAutomatica(overlay) {

    overlay
        .querySelectorAll(".carta-aberta-despedida")
        .forEach(elemento => elemento.remove());

    const rodape =
        overlay.querySelector(".carta-aberta-rodape");

    if (!rodape) return;

    // Texto solto dentro do rodapé (fora de qualquer tag)
    [...rodape.childNodes].forEach(no => {

        if (no.nodeType === Node.TEXT_NODE && no.textContent.trim()) {

            no.remove();

        }

    });

}


// =====================================================
// FOTO DENTRO DA CARTA — CRIADA DINAMICAMENTE
// =====================================================
// Não depende de nenhum elemento pré-existente no HTML.
// Se a carta tiver foto, cria (ou reaproveita) a imagem
// logo antes do título. Clicar nela alterna um tamanho
// maior, sem precisar de outro overlay.

function inserirFotoNaCarta(foto) {

    const folha =
        document.getElementById(
            "carta-aberta-folha"
        );

    if (!folha) return;

    let img =
        document.getElementById(
            "carta-aberta-foto"
        );


    if (!foto) {

        img?.remove();

        return;

    }


    if (!img) {

        img =
            document.createElement("img");

        img.id =
            "carta-aberta-foto";

        img.className =
            "carta-aberta-foto";

        img.alt = "";

        img.title = "Ver foto inteira";

        img.addEventListener("click", evento => {

            evento.stopPropagation();

            abrirLightboxCartas(img.src);

        });


        const titulo =
            document.getElementById(
                "carta-aberta-titulo"
            );

        folha.insertBefore(img, titulo);

    }


    img.classList.remove("expandida");

    img.src = foto;

}


// =====================================================
// FECHAR LEITURA
// =====================================================

function fecharCarta() {

    const overlay =
        document.getElementById(
            "carta-aberta-overlay"
        );

    if (!overlay) return;

    overlay.classList.remove("aberta");

    document.body.classList.remove("modal-aberto");

    setTimeout(() => {

        overlay.classList.add("oculto");

    }, 600);

}


// =====================================================
// EVENTOS
// =====================================================

let cartasEventosConfigurados = false;

function configurarEventosCartas() {

    if (cartasEventosConfigurados) return;

    cartasEventosConfigurados = true;


    const busca =
        document.getElementById("cartas-busca");

    busca?.addEventListener("input", evento => {

        cartasBuscaAtual = evento.target.value;

        renderizarArquivo();

    });


    const filtros =
        document.getElementById("cartas-filtros");


    // O botão que antes era "Destaque" vira "Bilhetinhos",
    // sem precisar mexer no HTML.

    const botaoAntigo =
        filtros?.querySelector("[data-filtro='destaque']");

    if (botaoAntigo) {

        botaoAntigo.dataset.filtro = "bilhetes";

        botaoAntigo.textContent = "Bilhetinhos";

    }


    filtros?.addEventListener("click", evento => {

        const botao =
            evento.target.closest(
                "[data-filtro]"
            );

        if (!botao) return;


        filtros
            .querySelectorAll(".cartas-filtro-btn")
            .forEach(btn =>
                btn.classList.remove("ativo")
            );

        botao.classList.add("ativo");


        cartasFiltroAtivo =
            botao.dataset.filtro;

        renderizarArquivo();

    });


    window.addEventListener("resize", () => {

        carrosseisAtualizadores.forEach(atualizar => atualizar());

    });


    const fechar =
        document.getElementById(
            "carta-aberta-fechar"
        );

    fechar?.addEventListener(
        "click",
        fecharCarta
    );


    const overlay =
        document.getElementById(
            "carta-aberta-overlay"
        );

    overlay?.addEventListener("click", evento => {

        if (evento.target === overlay) {

            fecharCarta();

        }

    });


    document.addEventListener("keydown", evento => {

        if (evento.key !== "Escape") return;

        // Fecha primeiro o que estiver por cima.

        const lightbox =
            document.getElementById("cartas-lightbox");

        if (lightbox?.classList.contains("aberta")) {

            fecharLightboxCartas();

            return;

        }

        const bilhete =
            document.getElementById("bilhete-aberto-overlay");

        if (bilhete?.classList.contains("aberta")) {

            fecharBilhete();

            return;

        }

        if (overlay && overlay.classList.contains("aberta")) {

            fecharCarta();

        }

    });

}

// =====================================================
// EFEITOS — corações subindo, cometas, brilhos, estouro
// =====================================================
// Tudo vive numa camada fixa atrás do conteúdo, criada por
// aqui mesmo (não precisa mexer no HTML). Os efeitos pausam
// quando a aba está escondida ou a página de cartas não está
// aberta, e nem começam se a pessoa pediu "reduzir movimento".

const EFEITOS_CORACOES = ["♥", "♡", "♥", "❤︎"];

const EFEITOS_CORES =
    ["#f08bbd", "#f9c4dc", "#b79af2", "#ff80b9", "#d98fae"];

// Máximo de corações subindo ao mesmo tempo
const EFEITOS_MAX_CORACOES = 16;

function aleatorio(min, max) {

    return min + Math.random() * (max - min);

}

function escolher(lista) {

    return lista[Math.floor(Math.random() * lista.length)];

}


function soltarCoracao(camada, aoIniciar) {

    const coracao =
        document.createElement("span");

    const duracao =
        aleatorio(9, 16);

    coracao.className =
        "cartas-efeito-coracao";

    coracao.textContent =
        escolher(EFEITOS_CORACOES);

    coracao.style.setProperty("--x", `${aleatorio(2, 96)}%`);
    coracao.style.setProperty("--tam", `${aleatorio(11, 26)}px`);
    coracao.style.setProperty("--dur", `${duracao}s`);
    coracao.style.setProperty("--deriva", `${aleatorio(-50, 50)}px`);
    coracao.style.setProperty("--op", aleatorio(0.35, 0.7).toFixed(2));
    coracao.style.setProperty("--cor", escolher(EFEITOS_CORES));

    // Na largada, espalha os corações pela tela em vez de
    // todos nascerem juntos lá embaixo.

    if (aoIniciar) {

        coracao.style.animationDelay =
            `-${(Math.random() * duracao).toFixed(2)}s`;

    }

    coracao.addEventListener(
        "animationend",
        () => coracao.remove()
    );

    camada.appendChild(coracao);

}


function lancarCometa(camada) {

    const cometa =
        document.createElement("span");

    cometa.className =
        "cartas-cometa";

    const angulo =
        aleatorio(24, 40);

    const radianos =
        angulo * Math.PI / 180;

    const distancia =
        aleatorio(520, 900);

    // Nasce na metade direita/alta da tela e cruza pra baixo e pra esquerda.

    cometa.style.setProperty("--x0", `${aleatorio(0.45, 1.05) * window.innerWidth}px`);
    cometa.style.setProperty("--y0", `${aleatorio(-0.05, 0.4) * window.innerHeight}px`);
    cometa.style.setProperty("--ang", `${-angulo}deg`);
    cometa.style.setProperty("--dx", `${-Math.cos(radianos) * distancia}px`);
    cometa.style.setProperty("--dy", `${Math.sin(radianos) * distancia}px`);
    cometa.style.setProperty("--comp", `${aleatorio(110, 190)}px`);
    cometa.style.setProperty("--dur", `${aleatorio(1.1, 1.8)}s`);

    cometa.addEventListener(
        "animationend",
        () => cometa.remove()
    );

    camada.appendChild(cometa);

}


function estourarCoracoes(camada, x, y) {

    for (let i = 0; i < 7; i++) {

        const coracao =
            document.createElement("span");

        const direcao =
            aleatorio(0, Math.PI * 2);

        const forca =
            aleatorio(30, 80);

        coracao.className =
            "cartas-efeito-estouro";

        coracao.textContent =
            escolher(EFEITOS_CORACOES);

        coracao.style.setProperty("--x", `${x}px`);
        coracao.style.setProperty("--y", `${y}px`);
        coracao.style.setProperty("--dx", `${Math.cos(direcao) * forca}px`);
        coracao.style.setProperty("--dy", `${Math.sin(direcao) * forca - 24}px`);
        coracao.style.setProperty("--tam", `${aleatorio(10, 20)}px`);
        coracao.style.setProperty("--cor", escolher(EFEITOS_CORES));

        coracao.addEventListener(
            "animationend",
            () => coracao.remove()
        );

        camada.appendChild(coracao);

    }

}


function iniciarEfeitosCartas() {

    const pagina =
        document.querySelector('.view[data-view="cartas"]');

    if (!pagina) return;

    if (pagina.querySelector(".cartas-efeitos")) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;


    const camada =
        document.createElement("div");

    camada.className =
        "cartas-efeitos";

    camada.setAttribute("aria-hidden", "true");

    pagina.prepend(camada);


    // Brilhos parados que piscam em tempos diferentes.

    for (let i = 0; i < 16; i++) {

        const brilho =
            document.createElement("span");

        brilho.className =
            "cartas-efeito-brilho";

        brilho.textContent =
            Math.random() > 0.5 ? "✦" : "✧";

        brilho.style.setProperty("--x", `${aleatorio(2, 97)}%`);
        brilho.style.setProperty("--y", `${aleatorio(4, 94)}%`);
        brilho.style.setProperty("--tam", `${aleatorio(8, 17)}px`);
        brilho.style.setProperty("--dur", `${aleatorio(3, 6.5)}s`);
        brilho.style.setProperty("--delay", `-${aleatorio(0, 6).toFixed(2)}s`);

        camada.appendChild(brilho);

    }


    const rodando = () =>
        !document.hidden && pagina.offsetWidth > 0;


    // Corações subindo.

    for (let i = 0; i < 7; i++) {

        soltarCoracao(camada, true);

    }

    setInterval(() => {

        if (!rodando()) return;

        const total =
            camada.querySelectorAll(".cartas-efeito-coracao").length;

        if (total < EFEITOS_MAX_CORACOES) {

            soltarCoracao(camada, false);

        }

    }, 1100);


    // Cometas, de tempos em tempos (às vezes dois seguidos).

    const agendarCometa = () => {

        setTimeout(() => {

            if (rodando()) {

                lancarCometa(camada);

                if (Math.random() < 0.25) {

                    setTimeout(() => lancarCometa(camada), aleatorio(250, 600));

                }

            }

            agendarCometa();

        }, aleatorio(5000, 12000));

    };

    setTimeout(() => lancarCometa(camada), 1800);

    agendarCometa();


    // Clicar no fundo solta um estouro de corações.

    pagina.addEventListener("pointerdown", evento => {

        if (
            evento.target.closest(
                "button, input, a, article, .cartas-carrossel"
            )
        ) return;

        estourarCoracoes(camada, evento.clientX, evento.clientY);

    });

}


// =====================================================
// INICIAR
// =====================================================

iniciarEfeitosCartas();

carregarCartas();