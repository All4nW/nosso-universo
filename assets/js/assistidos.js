// =====================================================
// NOSSO UNIVERSO — COISAS QUE JÁ ASSISTIMOS
// =====================================================

const CATEGORIAS_ORDEM = [
    { chave: "filmes", titulo: "🎬 Filmes" },
    { chave: "series", titulo: "📺 Séries" },
    { chave: "animes", titulo: "🍿 Animes" }
];

const CATEGORIA_QUEREMOS = "queremos";

let painelLateralCriado = false;


// =====================================================
// LER NOTAS DO ITEM
// =====================================================

function lerNotasDoItem(item) {
    const notaEu = Number(item.notaEu ?? item.minhaNota) || 0;
    const notaEla = Number(item.notaEla ?? item.notaDela) || 0;
    return { notaEu, notaEla };
}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto || "";
    return div.innerHTML;
}


// =====================================================
// FORMATAR NOTA
// =====================================================

function formatarNota(nota) {
    return Number.isInteger(nota) ? nota : nota.toFixed(1);
}


// =====================================================
// PROGRESSO — CÁLCULO E SELOS
// =====================================================

function calcularProgressoItem(item) {

    const progresso = item.progresso || {};

    if (item.categoria === "filmes") {

        const minutoAtual = Number(progresso.minutoAtual) || 0;
        const duracaoTotal = Number(progresso.duracaoTotal) || 0;

        if (!duracaoTotal) return 0;

        return Math.min(100, Math.round((minutoAtual / duracaoTotal) * 100));

    }

    const minutoAtualEpisodio = Number(progresso.minutoAtualEpisodio) || 0;
    const duracaoEpisodio = Number(progresso.duracaoEpisodio) || 0;

    if (!duracaoEpisodio) return 0;

    return Math.min(100, Math.round((minutoAtualEpisodio / duracaoEpisodio) * 100));

}

function selarInfoTopo(item) {

    const progresso = item.progresso || {};

    if (item.categoria === "filmes") {
        const minutoAtual = Number(progresso.minutoAtual) || 0;
        const duracaoTotal = Number(progresso.duracaoTotal) || 0;
        return `${minutoAtual}min / ${duracaoTotal}min`;
    }

    const { temporada, episodio } = progresso;

    if (!temporada && !episodio) return "";

    return `T${temporada || "?"} · EP${episodio || "?"}`;

}


// =====================================================
// COR AMBIENTE — extrai a cor dominante da capa
// =====================================================

function extrairCorAmbiente(src) {

    return new Promise((resolve) => {

        if (!src) {
            resolve(null);
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {

            try {

                const canvas = document.createElement("canvas");
                const tamanho = 24;

                canvas.width = tamanho;
                canvas.height = tamanho;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, tamanho, tamanho);

                const { data } = ctx.getImageData(0, 0, tamanho, tamanho);

                let r = 0, g = 0, b = 0, total = 0;

                for (let i = 0; i < data.length; i += 4) {

                    const alpha = data[i + 3];
                    if (alpha < 100) continue;

                    const pr = data[i];
                    const pg = data[i + 1];
                    const pb = data[i + 2];

                    const luminancia = (pr + pg + pb) / 3;
                    if (luminancia < 20 || luminancia > 235) continue;

                    const max = Math.max(pr, pg, pb);
                    const min = Math.min(pr, pg, pb);
                    const saturacao = max === 0 ? 0 : (max - min) / max;
                    const peso = 1 + saturacao * 3;

                    r += pr * peso;
                    g += pg * peso;
                    b += pb * peso;
                    total += peso;

                }

                if (!total) {
                    resolve(null);
                    return;
                }

                r = Math.round(r / total);
                g = Math.round(g / total);
                b = Math.round(b / total);

                console.log("🎨 Cor extraída:", { r, g, b }, "de", src);

                resolve({ r, g, b });

            } catch (erro) {

                console.warn("Não deu pra extrair cor da capa:", erro);
                resolve(null);

            }

        };

        img.onerror = () => resolve(null);

        img.src = src;

    });

}

function aplicarCorAmbienteModal(cor) {

    const conteudo = document.getElementById("modal-content");
    if (!conteudo) return;

    if (!cor) {
        conteudo.style.removeProperty("--cor-ambiente-r");
        conteudo.style.removeProperty("--cor-ambiente-g");
        conteudo.style.removeProperty("--cor-ambiente-b");
        return;
    }

    let { r, g, b } = cor;

    // Aumenta a saturação — afasta cada canal da média, deixando
    // a cor mais "viva" em vez de cinza/apagada.
    const media = (r + g + b) / 3;
    const fatorSaturacao = 1.4;

    r = media + (r - media) * fatorSaturacao;
    g = media + (g - media) * fatorSaturacao;
    b = media + (b - media) * fatorSaturacao;

    // Garante um brilho mínimo (capas muito escuras ainda geram reflexo visível)
    const max = Math.max(r, g, b);
    if (max < 150) {
        const fator = 150 / (max || 1);
        r *= fator;
        g *= fator;
        b *= fator;
    }

    r = Math.round(Math.min(255, Math.max(0, r)));
    g = Math.round(Math.min(255, Math.max(0, g)));
    b = Math.round(Math.min(255, Math.max(0, b)));

    conteudo.style.setProperty("--cor-ambiente-r", r);
    conteudo.style.setProperty("--cor-ambiente-g", g);
    conteudo.style.setProperty("--cor-ambiente-b", b);

}


// =====================================================
// CARREGAR
// =====================================================

async function carregarAssistidos() {

    const container = document.getElementById("assistidos-categorias");
    if (!container) return;

    let itens = [];

    try {

        const resposta = await fetch("assets/data/assistidos.json", { cache: "no-cache" });

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar assistidos.json.");
        }

        itens = await resposta.json();

    } catch (erro) {

        console.error("Erro ao carregar itens assistidos:", erro);
        itens = [];

    }

    container.innerHTML = "";


    CATEGORIAS_ORDEM.forEach((categoria) => {

        const itensDaCategoria = itens.filter(
            item =>
                item.categoria === categoria.chave &&
                item.status !== "assistindo"
        );

        if (!itensDaCategoria.length) return;

        container.appendChild(criarEstante(categoria.titulo, itensDaCategoria));

    });


    const queremos = itens.filter(item => item.categoria === CATEGORIA_QUEREMOS);

    const assistindo = itens.filter(
        item =>
            item.status === "assistindo" &&
            item.categoria !== CATEGORIA_QUEREMOS
    );

    montarPainelLateral(assistindo, queremos);


    if (!container.children.length) {

        container.innerHTML = `
            <p class="galeria-vazio">
                Ainda não há nada por aqui.
            </p>
        `;

    }

    ativarBotaoTopoAssistidos();

}


// =====================================================
// ESTANTE NORMAL
// =====================================================

function criarEstante(tituloCategoria, itens) {

    const secao = document.createElement("section");
    secao.className = "assistidos-estante";

    const titulo = document.createElement("h2");
    titulo.className = "assistidos-estante-titulo";

    titulo.innerHTML = `
        <span class="assistidos-estante-titulo-texto">${tituloCategoria}</span>
        <span class="assistidos-estante-contagem">${itens.length}</span>
    `;

    secao.appendChild(titulo);

    const grid = document.createElement("div");
    grid.className = "assistidos-grid";

    itens.forEach((item, indice) => {
        grid.appendChild(criarCardAssistido(item, indice));
    });

    secao.appendChild(grid);

    return secao;

}


// =====================================================
// CARD NORMAL
// =====================================================

function criarCardAssistido(item, indice, ehListaFutura = false) {

    const card = document.createElement("article");
    card.className = "assistido-card";
    card.style.setProperty("--delay", `${indice * 0.06}s`);

    const temAvaliacao = !ehListaFutura && item.categoria !== "queremos";
    const { notaEu, notaEla } = lerNotasDoItem(item);

    let notaMedia = 0;

    if (notaEu && notaEla) {
        notaMedia = (notaEu + notaEla) / 2;
    } else if (notaEu) {
        notaMedia = notaEu;
    } else if (notaEla) {
        notaMedia = notaEla;
    }

    const notaMediaFormatada = Number.isInteger(notaMedia) ? notaMedia : notaMedia.toFixed(1);

    const temNotaEu = notaEu > 0;
    const temNotaEla = notaEla > 0;
    const temAlgumaNota = temAvaliacao && (temNotaEu || temNotaEla);

    card.innerHTML = `

        <div class="assistido-capa">
            <img src="${item.capa || ""}" alt="${item.titulo}" onerror="this.style.display='none'">
            ${
                ehListaFutura
                    ? `
                        <div class="assistido-futuro-indicador">
                            <span>✦</span>
                            <small>Quero ver</small>
                        </div>
                    `
                    : ""
            }
        </div>

        <span class="assistido-titulo">${item.titulo}</span>

        <div class="assistido-info">
            ${item.ano ? `<span class="assistido-ano">${item.ano}</span>` : ""}
            ${
                temAlgumaNota
                    ? `
                        <span class="assistido-notas-info">
                            ${temNotaEu ? `<span class="nota-chip nota-chip-eu nota-chip-mini">★ ${formatarNota(notaEu)}</span>` : ""}
                            ${temNotaEla ? `<span class="nota-chip nota-chip-ela nota-chip-mini">★ ${formatarNota(notaEla)}</span>` : ""}
                        </span>
                    `
                    : ""
            }
        </div>

    `;

    card.addEventListener("click", () =>
        abrirDetalhesAssistido(item, {
            notaEu,
            notaEla,
            notaMedia: notaMediaFormatada,
            ehListaFutura
        })
    );

    return card;

}


// =====================================================
// CARD "CONTINUAR ASSISTINDO"
// =====================================================

function criarCardContinuar(item, indice) {

    const card = document.createElement("article");
    card.className = "assistido-card assistido-card--continuar";
    card.style.setProperty("--delay", `${indice * 0.06}s`);

    const progresso = calcularProgressoItem(item);
    const infoTopo = selarInfoTopo(item);
    const { notaEu, notaEla } = lerNotasDoItem(item);

    card.innerHTML = `

        <div class="assistido-capa">

            <img src="${item.capa || ""}" alt="${item.titulo}" onerror="this.style.display='none'">

            <span class="assistido-continuar-selo">A continuar</span>

            ${
                infoTopo
                    ? `<span class="assistido-continuar-topo-info">${infoTopo}</span>`
                    : ""
            }

            <div class="assistido-progresso-barra">
                <div class="assistido-progresso-preenchimento" style="width: ${progresso}%"></div>
            </div>

        </div>

        <span class="assistido-titulo">${item.titulo}</span>

        <div class="assistido-info">
            ${item.ano ? `<span class="assistido-ano">${item.ano}</span>` : ""}
        </div>

    `;

    card.addEventListener("click", () =>
        abrirDetalhesAssistido(item, {
            notaEu,
            notaEla,
            notaMedia: 0,
            ehListaFutura: false,
            ehContinuar: true
        })
    );

    return card;

}


// =====================================================
// DETALHES (MODAL) — LAYOUT NOVO + COR AMBIENTE
// =====================================================

function abrirDetalhesAssistido(item, dados) {

    const { notaEu, notaEla, ehListaFutura, ehContinuar = false } = dados;

    if (typeof abrirModal !== "function") {
        console.warn("abrirModal() não foi encontrado.");
        return;
    }

    if (ehListaFutura) {

        abrirModal({
            titulo: item.titulo,
            dataExibicao: "Ainda queremos assistir ✦",
            descricao: "Está na nossa lista de coisas que ainda queremos assistir. ❤️",
            fotos: item.capa ? [item.capa] : [],
            layoutModal: "assistido"
        });

        if (item.capa) {
            extrairCorAmbiente(item.capa).then((cor) => aplicarCorAmbienteModal(cor));
        } else {
            aplicarCorAmbienteModal(null);
        }

        return;

    }

    let linhaProgresso = "";

    if (ehContinuar) {

        const progresso = item.progresso || {};
        const percentual = calcularProgressoItem(item);

        const textoProgresso =
            item.categoria === "filmes"
                ? `${progresso.minutoAtual || 0}min de ${progresso.duracaoTotal || 0}min`
                : `Temporada ${progresso.temporada || "?"}, Episódio ${progresso.episodio || "?"} — ${progresso.minutoAtualEpisodio || 0}min de ${progresso.duracaoEpisodio || 0}min`;

        linhaProgresso = `
            <div class="assistido-modal-progresso">
                <div class="assistido-modal-progresso-texto">
                    <strong>Onde paramos:</strong> ${textoProgresso}
                </div>
                <div class="assistido-modal-progresso-barra">
                    <div class="assistido-modal-progresso-preenchimento" style="width: ${percentual}%"></div>
                </div>
            </div>
        `;

    }

    const temNotaEu = notaEu > 0;
    const temNotaEla = notaEla > 0;

    const notasHtml = `
        <div class="assistido-modal-divisor">
            <span class="assistido-modal-divisor-icone">♡</span>
        </div>

        <div class="assistido-modal-notas">

            <div class="assistido-modal-nota-item">
                <span class="assistido-modal-nota-icone assistido-modal-nota-icone-eu">★</span>
                <span class="assistido-modal-nota-label">Minha nota:</span>
                <span class="assistido-modal-nota-valor assistido-modal-nota-valor-eu">
                    ${temNotaEu ? formatarNota(notaEu) + "/10" : "Ainda não avaliado"}
                </span>
            </div>

            <div class="assistido-modal-nota-item">
                <span class="assistido-modal-nota-icone assistido-modal-nota-icone-ela">★</span>
                <span class="assistido-modal-nota-label">Nota dela:</span>
                <span class="assistido-modal-nota-valor assistido-modal-nota-valor-ela">
                    ${temNotaEla ? formatarNota(notaEla) + "/10" : "Ainda não avaliado"}
                </span>
            </div>

        </div>
    `;

    const citacaoHtml = item.memoria
        ? `
            <p class="assistido-modal-citacao">
                “${escaparHTML(item.memoria)}”
            </p>

            <div class="assistido-modal-divisor assistido-modal-divisor-fim">
                <span class="assistido-modal-divisor-icone">✦</span>
            </div>
        `
        : "";

    const eyebrow =
        ehContinuar
            ? "Assistindo agora ♥"
            : `Assistido juntos ♥ ${item.ano || ""}`;

    abrirModal({
        titulo: item.titulo,
        dataExibicao: eyebrow,
        descricao: linhaProgresso + notasHtml + citacaoHtml,
        fotos: item.capa ? [item.capa] : [],
        layoutModal: "assistido"
    });

    if (item.capa) {
        extrairCorAmbiente(item.capa).then((cor) => aplicarCorAmbienteModal(cor));
    } else {
        aplicarCorAmbienteModal(null);
    }

}


// =====================================================
// PAINEL LATERAL — CRIAÇÃO E CONTROLE
// =====================================================

function garantirPainelLateral() {

    if (painelLateralCriado) return;

    const view = document.querySelector('.view[data-view="assistidos"]');
    if (!view) return;

    const overlay = document.createElement("div");
    overlay.className = "continuar-lateral-overlay";

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "continuar-lateral-btn";
    botao.id = "continuar-lateral-btn";
    botao.innerHTML = `
        <span class="continuar-lateral-btn-icone">▶</span>
        <span class="continuar-lateral-btn-texto">Continuar assistindo</span>
        <span class="continuar-lateral-btn-contagem" id="continuar-lateral-contagem">0</span>
    `;

    const painel = document.createElement("aside");
    painel.className = "continuar-lateral-painel";
    painel.innerHTML = `
        <div class="continuar-lateral-cabecalho">
            <span class="continuar-lateral-titulo">Pra depois ✦</span>
            <button type="button" class="continuar-lateral-fechar" id="continuar-lateral-fechar">✕</button>
        </div>
        <div class="continuar-lateral-corpo">
            <div class="continuar-lateral-secao">
                <div class="continuar-lateral-secao-titulo">▶ Continuar assistindo</div>
                <div class="continuar-lateral-grid" id="continuar-lateral-grid-assistindo"></div>
            </div>
            <div class="continuar-lateral-secao">
                <div class="continuar-lateral-secao-titulo">✦ Ainda queremos assistir</div>
                <div class="continuar-lateral-grid" id="continuar-lateral-grid-queremos"></div>
            </div>
        </div>
    `;

    view.appendChild(overlay);
    view.appendChild(botao);
    view.appendChild(painel);

    const abrirPainel = () => {
        painel.classList.add("painel-aberto");
        overlay.classList.add("overlay-visivel");
    };

    const fecharPainel = () => {
        painel.classList.remove("painel-aberto");
        overlay.classList.remove("overlay-visivel");
    };

    botao.addEventListener("click", abrirPainel);
    overlay.addEventListener("click", fecharPainel);
    painel.querySelector("#continuar-lateral-fechar").addEventListener("click", fecharPainel);

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") fecharPainel();
    });

    painelLateralCriado = true;

}

function montarPainelLateral(itensAssistindo, itensQueremos) {

    garantirPainelLateral();

    const botao = document.getElementById("continuar-lateral-btn");
    const contagem = document.getElementById("continuar-lateral-contagem");
    const gridAssistindo = document.getElementById("continuar-lateral-grid-assistindo");
    const gridQueremos = document.getElementById("continuar-lateral-grid-queremos");

    const total = itensAssistindo.length + itensQueremos.length;

    if (!total) {
        botao.style.display = "none";
        return;
    }

    botao.style.display = "flex";
    contagem.textContent = total;

    gridAssistindo.innerHTML = "";

    if (itensAssistindo.length) {
        itensAssistindo.forEach((item, indice) => {
            gridAssistindo.appendChild(criarCardContinuar(item, indice));
        });
    } else {
        gridAssistindo.innerHTML = `<p class="continuar-lateral-vazio">Nada em andamento agora.</p>`;
    }

    gridQueremos.innerHTML = "";

    if (itensQueremos.length) {
        itensQueremos.forEach((item, indice) => {
            gridQueremos.appendChild(criarCardAssistido(item, indice, true));
        });
    } else {
        gridQueremos.innerHTML = `<p class="continuar-lateral-vazio">Lista vazia por enquanto.</p>`;
    }

}


// =====================================================
// BOTÃO VOLTAR AO TOPO
// =====================================================

function ativarBotaoTopoAssistidos() {

    const view = document.querySelector('.view[data-view="assistidos"]');
    if (!view) return;

    const botao = document.getElementById("assistidos-topo-btn");
    if (!botao) return;

    botao.onclick = () => {
        view.scrollTo({ top: 0, behavior: "smooth" });
    };

}


// =====================================================
// INICIAR
// =====================================================

carregarAssistidos();