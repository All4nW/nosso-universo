// ========================================
// TIMELINE — SITE PRINCIPAL
// ========================================
// Tenta buscar os dados ao vivo da API (SQLite via backend).
// Se a API não responder (backend desligado, ou site publicado
// no GitHub Pages), usa assets/data/timeline.json como plano B.
// ========================================

// ========================================
// MAPA DE TIPO
// ========================================
// Cada tipo tem uma classe (usada pra colorir borda/marcador do
// card e pro selo circular sobreposto na foto) e um ícone.

const TIPOS_TIMELINE = {
    "Especial": { icone: "⭐", classe: "marco" },
    "Marco":    { icone: "⭐", classe: "marco" }, // compatibilidade com itens salvos antes da renomeação
    "Momento":  { icone: "🎀", classe: "momento" },
    "Jogo":     { icone: "🎮", classe: "jogo" },
    "Encontro": { icone: "💞", classe: "encontro" },
    "Sonho":    { icone: "🪄", classe: "sonho" }
};


async function carregarTimeline() {

    const container =
        document.getElementById("timeline-container");


    if (!container) {
        return;
    }


    let itens;


    try {

        const resposta =
            await fetch(
                "http://localhost:3000/api/timeline"
            );

        if (!resposta.ok) {
            throw new Error("API indisponível.");
        }

        itens = await resposta.json();

    }

    catch (erroApi) {

        console.warn(
            "API indisponível, usando timeline.json como backup:",
            erroApi
        );

        try {

            const respostaBackup =
                await fetch("assets/data/timeline.json");

            itens = await respostaBackup.json();

        }

        catch (erroBackup) {

            console.error(
                "Erro ao carregar Timeline (API e backup falharam):",
                erroBackup
            );

            container.innerHTML = `
                <div class="timeline-vazio">
                    Não foi possível carregar nossa Timeline. ❤️
                </div>
            `;

            return;

        }

    }


    container.innerHTML = "";


    if (!Array.isArray(itens) || itens.length === 0) {

        container.innerHTML = `
            <div class="timeline-vazio">
                Ainda não existem momentos na nossa história. ❤️
            </div>
        `;

        return;
    }
    // divisores de ano e o marcador "estamos aqui" entram entre os cards
    let anoAnterior = null;
    let anteriorFuturo = null;

    itens.forEach((item, indice) => {

        const futuro = verificarSeEhFuturo(item.data, item.hora);
        const ano = String(item.data || "").slice(0, 4);

        // "estamos aqui": entre o último que já passou e o primeiro que ainda vem
        if (indice > 0 && futuro && anteriorFuturo === false) {
            container.appendChild(criarMarcadorHojeTimeline());
        }

        if (ano && ano !== anoAnterior) {
            container.appendChild(criarDivisorAnoTimeline(ano));
            anoAnterior = ano;
        }

        container.appendChild(criarItemTimeline(item, indice));

        anteriorFuturo = futuro;

    });

    montarDockTimeline(container, itens);

    // Preenche os contadores já na primeira exibição
    atualizarContagensTimeline();

    atualizarProgressoTimeline();
 
}


// ========================================
// CRIAR ITEM
// ========================================

function criarItemTimeline(
    item,
    indice
) {

    const lado =
        indice % 2 === 0
            ? "esquerda"
            : "direita";


    const elemento =
        document.createElement("div");


    elemento.className =
        `timeline-item timeline-item-${lado} timeline-item-entrando`;


    // Escalona a entrada: cada card cai um pouquinho depois do
    // anterior, criando o efeito de "cascata" ao carregar a Timeline.
    elemento.style.setProperty(
        "--delay",
        `${indice * 0.09}s`
    );


    // Aceita tanto o formato novo da API (item.foto, singular)
    // quanto o formato antigo do JSON estático (item.fotos, array)
    const primeiraFoto =
        item.foto ||
        (item.fotos && item.fotos[0]) ||
        null;


    const textoData =
        formatarDataTimeline(item);


    const ehFuturo =
        verificarSeEhFuturo(
            item.data,
            item.hora
        );


    if (ehFuturo) {

        elemento.classList.add(
            "timeline-item-futuro"
        );

    }

        // Momento exato do evento (usado pelo contador regressivo)
    const alvoContagem =
        new Date(
            `${item.data}T${item.hora || "00:00"}`
        ).getTime();


    // ====================================
    // SELO DE SUGESTÃO
    // ====================================
    // A cor e o emoji continuam fixos por quem sugeriu
    // (ela = rosa/💗, mim = azul/💙), mas o TEXTO dentro
    // do selo agora é livre (item.sugeridoTexto). Se não
    // tiver texto customizado, cai no texto padrão.

    let seloSugestao = "";


    if (
        item.sugeridoPor === "ela"
    ) {

        const textoSelo =
            (item.sugeridoTexto && item.sugeridoTexto.trim())
                ? item.sugeridoTexto
                : "Sugestão dela";

        seloSugestao = `
            <span class="timeline-badge-sugestao timeline-badge-sugestao-ela">
                💗 ${escaparHtmlTimeline(textoSelo)}
            </span>
        `;

    }

    else if (
        item.sugeridoPor === "mim"
    ) {

        const textoSelo =
            (item.sugeridoTexto && item.sugeridoTexto.trim())
                ? item.sugeridoTexto
                : "Sugestão minha";

        seloSugestao = `
            <span class="timeline-badge-sugestao timeline-badge-sugestao-mim">
                💙 ${escaparHtmlTimeline(textoSelo)}
            </span>
        `;

    }


    // ====================================
    // TIPO — selo circular com ícone
    // ====================================
    // Categoria não gera mais selo/cor — é só uma anotação livre
    // sua no Admin, sem representação visual no site.

    let iconeCirculo = "";
    let classeCorCirculo = "";
    let estiloCirculo = "";

    if (item.tipo && TIPOS_TIMELINE[item.tipo]) {

        const infoTipo =
            TIPOS_TIMELINE[item.tipo];

        iconeCirculo = infoTipo.icone;
        classeCorCirculo = `timeline-selo-tipo-${infoTipo.classe}`;

        elemento.classList.add(
            `timeline-item-tipo-${infoTipo.classe}`
        );

    }


    const seloCirculoHtml =
        iconeCirculo
            ? `
                <span
                    class="timeline-selo-circulo ${classeCorCirculo}"
                    style="${estiloCirculo}"
                    title="${escaparHtmlTimeline(item.tipo || item.categoria || '')}"
                >
                    ${iconeCirculo}
                </span>
            `
            : "";


    // ====================================
    // FOTO
    // ====================================
    // Quando existe foto, ela já se basta — sem selo sobreposto.
    // O selo circular só aparece quando NÃO há foto, como um
    // "avatar" inline, logo antes da data.

    const fotoHtml =
        primeiraFoto
            ? `
                <div class="timeline-card-thumb">

                    <img
                        src="${resolverImagemTimeline(primeiraFoto)}"
                        alt="${escaparHtmlTimeline(item.titulo)}"
                        onerror="this.parentElement.remove()"
                    >

                </div>
            `
            : "";


    const avatarHtml =
        (!primeiraFoto && seloCirculoHtml)
            ? `<span class="timeline-selo-circulo-avatar">${seloCirculoHtml}</span>`
            : "";


    // ====================================
    // CARD
    // ====================================

    elemento.innerHTML = `

        <div class="timeline-marker"></div>

        <span class="timeline-entrada-estrela">✨</span>

        <div class="timeline-card">

            ${avatarHtml}

            ${
                ehFuturo && item.tipo === "Sonho"
                    ? `
                        <span class="timeline-badge-futuro">
                            💗 Um sonho a caminho
                        </span>
                    `
                    : ""
            }

            ${
                ehFuturo
                    ? `
                        <span
                            class="timeline-contagem"
                            data-alvo="${alvoContagem}"
                            role="timer"
                        >
                            ⏳ <span class="timeline-contagem-tempo"></span>
                        </span>
                    `
                    : ""
            }

            ${seloSugestao}

            ${fotoHtml}


            ${
                textoData
                    ? `
                        <span class="timeline-card-data">
                            ${textoData}
                        </span>
                    `
                    : ""
            }


            <h3 class="timeline-card-titulo">
                ${escaparHtmlTimeline(item.titulo)}
            </h3>


            <p class="timeline-card-resumo">
                ${escaparHtmlTimeline(
                    item.resumo || ""
                )}
            </p>

        </div>

    `;


    elemento.addEventListener(
        "click",
        () => {

            if (
                typeof abrirModal === "function"
            ) {

                abrirModal(item);

            }

        }
    );


    return elemento;

}


// ========================================
// VERIFICAR FUTURO
// ========================================

function verificarSeEhFuturo(
    data,
    hora
) {

    if (!data) {
        return false;
    }


    const horario =
        hora || "00:00";


    const dataEvento =
        new Date(
            `${data}T${horario}`
        );


    return dataEvento > new Date();

}
// ========================================
// CONTADOR REGRESSIVO (eventos futuros)
// ========================================
// Cada card "Um sonho a caminho" tem um .timeline-contagem com a
// data/hora do evento em data-alvo (milissegundos). O relógio abaixo
// recalcula todos a cada segundo, pelo horário do aparelho.

function formatarContagemTimeline(ms) {

    if (ms <= 0) {
        return "chegou o dia!";
    }

    const total = Math.floor(ms / 1000);
    const dias = Math.floor(total / 86400);
    const horas = Math.floor((total % 86400) / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const segundos = total % 60;

    const dois = (n) => String(n).padStart(2, "0");

    return `<b>${dias}</b>d <b>${dois(horas)}</b>h <b>${dois(minutos)}</b>m <b>${dois(segundos)}</b>s`;

}


function atualizarContagensTimeline() {

    const agora = Date.now();

    document
        .querySelectorAll(".timeline-contagem, .timeline-painel-contagem")
        .forEach((contagem) => {

            const tempo =
                contagem.querySelector(".timeline-contagem-tempo");

            if (tempo) {

                tempo.innerHTML =
                    formatarContagemTimeline(
                        Number(contagem.dataset.alvo) - agora
                    );

            }

        });

}


function iniciarContagemTimeline() {

    atualizarContagensTimeline();

    // próximo tique alinhado ao começo do segundo (não acumula atraso)
    setTimeout(
        iniciarContagemTimeline,
        1000 - (Date.now() % 1000)
    );

}

// ========================================
// FORMATAR DATA
// ========================================

function formatarDataTimeline(
    item
) {

    // Se existir um texto customizado (ex: "Dezembro de 2026"),
    // usa ele em vez de calcular a data exata.
    if (item.dataExibicao) {
        return item.dataExibicao;
    }


    if (!item.data) {
        return "";
    }


    const partes =
        item.data.split("-");


    if (partes.length !== 3) {
        return item.data;
    }


    const dataObj =
        new Date(
            Number(partes[0]),
            Number(partes[1]) - 1,
            Number(partes[2])
        );


    let resultado =
        dataObj.toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );


    if (item.hora) {

        resultado +=
            ` • ${item.hora}`;

    }


    return resultado;

}


// ========================================
// RESOLVER IMAGEM
// ========================================

function resolverImagemTimeline(
    caminho
) {

    if (!caminho) {
        return "";
    }


    if (
        caminho.startsWith("http://") ||
        caminho.startsWith("https://")
    ) {

        return caminho;

    }


    // Fotos enviadas pelo Admin
    if (
        caminho.startsWith("/uploads/")
    ) {

        return (
            "http://localhost:3000" +
            caminho
        );

    }


    // Fotos antigas que ainda estão
    // dentro de assets/
    return caminho;

}


// ========================================
// ESCAPAR HTML
// ========================================

function escaparHtmlTimeline(
    texto
) {

    return String(texto || "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


// ========================================
// REPRODUZIR ENTRADA (replay da animação)
// ========================================
// Toda vez que o usuário sai e volta pra Timeline, os cards já
// existem no DOM (não são recriados), então a animação de queda
// não tocaria de novo sozinha. Essa função reinicia ela na marra:
// tira a classe, força o navegador a recalcular (reflow), e põe
// a classe de volta — reiniciando o @keyframes do zero.

function reproduzirEntradaTimeline() {

    const itens =
        document.querySelectorAll(
            "#timeline-container .timeline-item"
        );


    itens.forEach(
        (item) => {

            item.classList.remove(
                "timeline-item-entrando"
            );


            void item.offsetWidth;


            item.classList.add(
                "timeline-item-entrando"
            );

        }
    );

}


window.reproduzirEntradaTimeline =
    reproduzirEntradaTimeline;

// ========================================
// DIVISOR DE ANO E MARCADOR "ESTAMOS AQUI"
// ========================================

function criarDivisorAnoTimeline(ano) {

    const div = document.createElement("div");

    div.className = "timeline-ano-divisor";

    div.innerHTML = `
        <span class="timeline-ano-pilula">
            <i>✦</i><b>${escaparHtmlTimeline(ano)}</b><i>♥</i>
        </span>
    `;

    return div;

}

function criarMarcadorHojeTimeline() {

    const hoje = new Date().toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long"
    });

    const div = document.createElement("div");

    div.className = "timeline-hoje";

    div.setAttribute("aria-label", `Estamos aqui, ${hoje}`);

    div.innerHTML = `
        <span class="th-esq">estamos</span>

        <span class="th-farol" aria-hidden="true">
            <i class="th-anel"></i>
            <i class="th-anel th-anel-2"></i>
            <i class="th-anel th-anel-3"></i>
            <span class="th-orbita"><b>✦</b></span>
            <i class="th-sobe th-sobe-1">♥</i>
            <i class="th-sobe th-sobe-2">♥</i>
            <span class="th-nucleo">♥</span>
        </span>

        <span class="th-aqui">aqui</span>

        <span class="th-data">${hoje}</span>
    `;

    return div;

}


// ========================================
// MENU FLUTUANTE: ☰ FILTRO E ⏳ CONTADORES
// ========================================

const FILTROS_TIMELINE = [
    ["marco", "Especiais"],
    ["momento", "Momentos"],
    ["jogo", "Jogos"],
    ["encontro", "Encontros"],
    ["sonho", "Sonhos"]
];

let filtroTimeline = "todos";
let dockTimelineEventos = false;

function fecharPaineisTimeline(exceto = null) {

    document
        .querySelectorAll("#timeline-dock .timeline-dock-item.aberto")
        .forEach((el) => {

            if (el === exceto) return;

            el.classList.remove("aberto");

            el.querySelector(".timeline-dock-btn")
                ?.setAttribute("aria-expanded", "false");

        });

}

function montarDockTimeline(container, itens) {

    document.getElementById("timeline-dock")?.remove();

    filtroTimeline = "todos";

    // quantos itens existem de cada tipo
    const contagem = {};

    itens.forEach((item) => {

        const info = TIPOS_TIMELINE[item.tipo];

        if (info) contagem[info.classe] = (contagem[info.classe] || 0) + 1;

    });

    const opcoes = FILTROS_TIMELINE.filter(([chave]) => contagem[chave]);

    // os cards na mesma ordem dos itens: serve pra achar o card de cada evento futuro
    const cartoes = container.querySelectorAll(".timeline-item");

    const futuros = [];

    itens.forEach((item, i) => {

        if (cartoes[i] && verificarSeEhFuturo(item.data, item.hora)) {
            futuros.push({ item, cartao: cartoes[i] });
        }

    });

    const temFiltro = opcoes.length >= 2;
    const temContador = futuros.length > 0;

    if (!temFiltro && !temContador) return;

    const dock = document.createElement("div");

    dock.id = "timeline-dock";
    dock.className = "timeline-dock";

    dock.innerHTML = `

              ${temFiltro ? `
            <div class="timeline-dock-item">

                <button type="button" class="timeline-dock-btn timeline-dock-btn-filtro" aria-label="Filtrar momentos" aria-haspopup="true" aria-expanded="false">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path class="gj-l1" d="M4 7h16"/>
                        <path class="gj-l2" d="M4 12h16"/>
                        <path class="gj-l3" d="M4 17h16"/>
                    </svg>
                    <span class="timeline-dock-ponto"></span>
                </button>

                <span class="timeline-dock-chip" hidden></span>

                <div class="timeline-dock-painel" role="menu">

                    <p class="timeline-dock-titulo">Filtrar momentos</p>

                    ${[["todos", "Tudo"], ...opcoes].map(([chave, nome], i) => `
                        <button type="button" class="timeline-dock-opcao ${chave === "todos" ? "ativa timeline-dock-todos" : ""}"
                                data-filtro="${chave}" style="--n:${i}" role="menuitemradio" aria-checked="${chave === "todos"}">
                            <span>${nome}</span>
                            <small>${chave === "todos" ? itens.length : contagem[chave]}</small>
                            <i aria-hidden="true">♥</i>
                        </button>
                    `).join("")}

                </div>

            </div>
        ` : ""}

        ${temContador ? `
            <div class="timeline-dock-item">

                <button type="button" class="timeline-dock-btn" aria-label="Contagens regressivas" aria-haspopup="true" aria-expanded="false">
                    <span class="timeline-dock-icone" aria-hidden="true">⏳</span>
                    <span class="timeline-dock-badge">${futuros.length}</span>
                </button>

                <div class="timeline-dock-painel">

                    <p class="timeline-dock-titulo">Contagem regressiva</p>

                    ${futuros.map(({ item }, n) => `
                        <button type="button" class="timeline-dock-contador" data-ir="${n}">
                            <span class="timeline-dock-contador-nome">${escaparHtmlTimeline(item.titulo)}</span>
                            <span class="timeline-painel-contagem"
                                  data-alvo="${new Date(`${item.data}T${item.hora || "00:00"}`).getTime()}">
                                <span class="timeline-contagem-tempo"></span>
                            </span>
                            <small>${escaparHtmlTimeline(formatarDataTimeline(item))} ↓</small>
                        </button>
                    `).join("")}

                </div>

            </div>
        ` : ""}

    `;

    container.appendChild(dock);

    dock.addEventListener("click", (evento) => {

        // abrir / fechar um painel
        const botao = evento.target.closest(".timeline-dock-btn");

        if (botao) {

            const caixa = botao.closest(".timeline-dock-item");
            const abrir = !caixa.classList.contains("aberto");

            fecharPaineisTimeline(caixa);

            caixa.classList.toggle("aberto", abrir);

            botao.setAttribute("aria-expanded", String(abrir));

            return;

        }

        // escolheu um filtro
        const opcao = evento.target.closest("[data-filtro]");

        if (opcao) {

            definirFiltroTimeline(opcao.dataset.filtro);

            fecharPaineisTimeline();

            return;

        }

        // clicou num contador: desce até o card
        const ir = evento.target.closest("[data-ir]");

        if (ir) {

            irParaCartaoTimeline(futuros[Number(ir.dataset.ir)].cartao);

            fecharPaineisTimeline();

        }

    });

    // clicar fora (ou Esc) fecha os painéis — registrado uma vez só
    if (!dockTimelineEventos) {

        dockTimelineEventos = true;

        document.addEventListener("click", (evento) => {

            if (evento.target.closest("#timeline-dock")) return;

            fecharPaineisTimeline();

        });

        document.addEventListener("keydown", (evento) => {

            if (evento.key === "Escape") fecharPaineisTimeline();

        });

    }

    atualizarContagensTimeline();

}

function definirFiltroTimeline(chave) {

    filtroTimeline = chave;

    const dock = document.getElementById("timeline-dock");

    dock?.querySelectorAll(".timeline-dock-opcao").forEach((b) => {

        const ativa = b.dataset.filtro === chave;

        b.classList.toggle("ativa", ativa);
        b.setAttribute("aria-checked", String(ativa));

    });

    // pontinho rosa no botão enquanto tiver filtro ligado
    dock?.querySelector(".timeline-dock-item .timeline-dock-btn")
        ?.classList.toggle("filtrando", chave !== "todos");

            // nome do filtro ligado, ao lado do botão
    const chip = dock?.querySelector(".timeline-dock-chip");

    if (chip) {

        const nomeFiltro = (FILTROS_TIMELINE.find(([c]) => c === chave) || [])[1] || "";

        chip.hidden = chave === "todos";
        chip.textContent = chave === "todos" ? "" : nomeFiltro;

    }

    aplicarFiltroTimeline(chave);

}

function aplicarFiltroTimeline(chave) {

    const container = document.getElementById("timeline-container");

    if (!container) return;

    const filtrando = chave !== "todos";

    let visivel = 0;

    container.querySelectorAll(":scope > *").forEach((el) => {

        // o menu flutuante não entra na conta
        if (el.id === "timeline-dock") return;

        if (el.classList.contains("timeline-item")) {

            const bate =
                !filtrando ||
                el.classList.contains(`timeline-item-tipo-${chave}`);

            el.hidden = !bate;

            // refaz o zigue-zague só com os que ficaram
            if (bate) {

                el.classList.remove("timeline-item-esquerda", "timeline-item-direita");

                el.classList.add(
                    visivel % 2 === 0
                        ? "timeline-item-esquerda"
                        : "timeline-item-direita"
                );

                visivel++;

            }

        } else {

            // divisores de ano e "estamos aqui" somem enquanto filtra
            el.hidden = filtrando;

        }

    });

    reproduzirEntradaTimeline();

}

function irParaCartaoTimeline(cartao) {

    // se o filtro estiver escondendo esse card, volta pra "Tudo"
    if (cartao.hidden) definirFiltroTimeline("todos");

    cartao.scrollIntoView({ behavior: "smooth", block: "center" });

    // faz o card brilhar um instante
    cartao.classList.remove("timeline-item-destaque");

    void cartao.offsetWidth;

    cartao.classList.add("timeline-item-destaque");

    setTimeout(() => cartao.classList.remove("timeline-item-destaque"), 2600);

}


// ========================================
// LINHA QUE ACENDE CONFORME VOCÊ ROLA
// ========================================

function atualizarProgressoTimeline() {

    const view = document.querySelector('.view[data-view="timeline"]');
    const container = document.getElementById("timeline-container");

    if (!view || !container) return;

    const v = view.getBoundingClientRect();
    const c = container.getBoundingClientRect();

    // página escondida: nada pra calcular
    if (!c.height) return;

    // a "linha de leitura" fica um pouco abaixo do meio da tela
    const leitura = v.top + v.height * 0.55;

    const altura = Math.min(c.height, Math.max(0, leitura - c.top));

    container.style.setProperty("--prog", `${altura}px`);

    container.querySelectorAll(".timeline-item").forEach((item) => {

        item.classList.toggle(
            "timeline-item-passou",
            item.getBoundingClientRect().top < leitura
        );

    });

}

function ativarProgressoTimeline() {

    const view = document.querySelector('.view[data-view="timeline"]');

    if (!view) return;

    let esperando = false;

    const pedir = () => {

        if (esperando) return;

        esperando = true;

        requestAnimationFrame(() => {
            esperando = false;
            atualizarProgressoTimeline();
        });

    };

    view.addEventListener("scroll", pedir, { passive: true });

    window.addEventListener("resize", pedir);

}
// ========================================
// BOTÃO VOLTAR AO TOPO
// ========================================

function ativarBotaoTopoTimeline() {

    const botao =
        document.getElementById(
            "timeline-topo-btn"
        );


    const view =
        document.querySelector(
            '.view[data-view="timeline"]'
        );


    if (!botao || !view) {
        return;
    }


    botao.addEventListener(
        "click",
        () => {

            view.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );

}


// ========================================
// INICIALIZAÇÃO
// ======================================== 

ativarProgressoTimeline();

carregarTimeline();

iniciarContagemTimeline();