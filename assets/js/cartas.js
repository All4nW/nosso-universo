// =====================================================
// NOSSO UNIVERSO — CARTAS PARA NÓS
// Iteração 3: uma caixa de correspondência
// =====================================================

let cartasItens = [];
let cartasFiltroAtivo = "todas";
let cartasBuscaAtual = "";


// =====================================================
// CATEGORIAS
// =====================================================

const CATEGORIAS_ORDEM = [
    { chave: "aniversario", titulo: "Aniversário" },
    { chave: "relacionamento", titulo: "Relacionamento" },
    { chave: "outros", titulo: "Outros" }
];

const SIMBOLOS_CATEGORIA = {
    aniversario: "✦",
    destaque: "★",
    relacionamento: "❤",
    outros: "✉"
};


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
// HASH DETERMINÍSTICO — pra inclinação/flutuação
// de cada envelope ser sempre a mesma
// =====================================================

function hashCarta(texto) {

    let hash = 0;

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

    const total =
        cartasItens.length;

    contagem.textContent =
        total === 1
            ? "1 carta guardada"
            : `${total} cartas guardadas`;

}


// =====================================================
// FILTRAR + BUSCAR
// =====================================================

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

    } else if (cartasFiltroAtivo === "destaque") {

        itens =
            itens.filter(
                item => item.categoria === "destaque"
            );

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
// MONTAR POR CATEGORIA
// =====================================================
// "destaque" vira um bloco especial no topo (até 3 cartas).
// As demais categorias (aniversário, relacionamento, outros)
// viram seções tituladas — dessa vez fazem sentido, porque
// são escolhidas por vocês, não uma divisão automática.

function montarPorCategoria(itens) {

    const ordenados =
        [...itens].sort((a, b) => {

            const dataA = a.data || "";
            const dataB = b.data || "";

            return dataA.localeCompare(dataB);

        });


    const destaque =
        ordenados
            .filter(item => item.categoria === "destaque")
            .slice(-3);


    const secoes =
        CATEGORIAS_ORDEM
            .map(categoria => ({
                titulo: categoria.titulo,
                itens: ordenados.filter(
                    item => item.categoria === categoria.chave
                )
            }))
            .filter(secao => secao.itens.length);


    return { destaque, secoes };

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


    if (!itens.length) {

        arquivo.innerHTML = `
            <p class="cartas-vazio">
                Nenhuma carta encontrada por aqui.
            </p>
        `;

        return;

    }


    const { destaque, secoes } =
        montarPorCategoria(itens);


    if (destaque.length) {

        arquivo.appendChild(
            criarBlocoDestaque(destaque)
        );

    }


    secoes.forEach(secao => {

        arquivo.appendChild(
            criarSecaoCategoria(secao)
        );

    });

}


// =====================================================
// BLOCO DE DESTAQUE (até 3 cartas)
// =====================================================

function criarBlocoDestaque(itensDestaque) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "cartas-destaque-bloco";

    wrapper.innerHTML = `
        <span class="cartas-destaque-legenda">
            Cartas que guardamos com carinho especial
        </span>
    `;

    const colecao =
        document.createElement("div");

    colecao.className =
        "cartas-colecao cartas-colecao-destaque";

    itensDestaque.forEach(item => {

        colecao.appendChild(
            criarEnvelope(item, true)
        );

    });

    wrapper.appendChild(colecao);

    return wrapper;

}


// =====================================================
// SEÇÃO POR CATEGORIA
// =====================================================

function criarSecaoCategoria(secao) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "cartas-secao";


    const titulo =
        document.createElement("h2");

    titulo.className =
        "cartas-secao-titulo";

    titulo.textContent =
        secao.titulo;

    wrapper.appendChild(titulo);


    const linha =
        document.createElement("span");

    linha.className =
        "cartas-secao-linha";

    wrapper.appendChild(linha);


    const colecao =
        document.createElement("div");

    colecao.className =
        "cartas-colecao";

    secao.itens.forEach(item => {

        colecao.appendChild(
            criarEnvelope(item, false)
        );

    });

    wrapper.appendChild(colecao);

    return wrapper;

}


// =====================================================
// ENVELOPE
// =====================================================

function criarEnvelope(item, ehDestaque) {

    const botao =
        document.createElement("button");

    botao.type = "button";

    botao.className =
        "carta-envelope" +
        (item.especial ? " carta-especial" : "");


    const h1 = hashCarta(item.id + "-rot");
    const h2 = hashCarta(item.id + "-float");

    botao.style.setProperty("--rot", `${(h1 - 0.5) * 10}deg`);
    botao.style.setProperty("--flutuar-duracao", `${6 + h2 * 4}s`);
    botao.style.setProperty("--flutuar-delay", `${h1 * 3}s`);


    const remetente =
        item.autor === "ela"
            ? "De: Jhennyfer"
            : "De: Allan";

    const simboloSelo =
        SIMBOLOS_CATEGORIA[item.categoria] || "✉";


    botao.innerHTML = `

        <div class="carta-envelope-corpo">

            <span class="carta-envelope-para">
                ${remetente}
            </span>

        </div>

        <div class="carta-envelope-aba"></div>

        <div class="carta-envelope-selo">
            ${simboloSelo}
        </div>

        ${ehDestaque ? `<div class="carta-envelope-fita"></div>` : ""}

        ${
            item.foto
                ? `
                    <div class="carta-envelope-foto">
                        <img src="${item.foto}" alt="">
                    </div>
                `
                : ""
        }

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
    ).textContent =
        item.mensagem || "";

    document.getElementById(
        "carta-aberta-assinatura"
    ).textContent =
        `— ${nomeAutor} ❤`;


    const fotoContainer =
        document.getElementById(
            "carta-aberta-foto-container"
        );

    if (fotoContainer) {

        fotoContainer.innerHTML =
            item.foto
                ? `<img src="${item.foto}" alt="" class="carta-aberta-foto">`
                : "";

    }


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

        if (
            evento.key === "Escape" &&
            overlay &&
            overlay.classList.contains("aberta")
        ) {

            fecharCarta();

        }

    });

}


// =====================================================
// INICIAR
// =====================================================

carregarCartas();