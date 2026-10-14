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
// EDITS — quais filmes têm vídeo no Preview
// =====================================================

let idsComEdit = new Set();

async function carregarIdsComEdit() {

    try {

        const resposta = await fetch("assets/data/preview.json", { cache: "no-cache" });

        if (!resposta.ok) return;

        const lista = await resposta.json();

        idsComEdit = new Set(
            (Array.isArray(lista) ? lista : [])
                .filter(v => v && v.video && v.assistidoId)
                .map(v => String(v.assistidoId))
        );

    } catch (erro) {

        idsComEdit = new Set();

    }

}

function temEdit(item) {

    return idsComEdit.has(String(item.id ?? item.titulo));

}

function irParaEdit(item) {

    // fecha o modal de detalhes, se estiver aberto
    const fechar = document.querySelector(".modal-fechar");

    if (fechar) fechar.click();
    else if (typeof fecharModal === "function") fecharModal();

    if (typeof window.abrirPreviewDoFilme === "function") {

        window.abrirPreviewDoFilme(item.id ?? item.titulo, item.titulo);

    }

}

// =====================================================
// GRADE — botão que muda quantas colunas aparecem
// =====================================================

const GRADE_CHAVE = "nu:grade:";

let gradesAtivas = [];

// 4 níveis por tamanho de tela (o primeiro é o padrão de hoje)
function colunasDisponiveis() {

    const w = window.innerWidth;

    if (w <= 520) return [2, 3, 4, 5];
    if (w <= 760) return [3, 4, 5, 6];
    if (w <= 1050) return [4, 5, 6, 7];

    return [5, 6, 7, 8];

}

function lerNivelGrade(chave) {

    try {

        const n = Number(localStorage.getItem(GRADE_CHAVE + chave));

        return n >= 0 && n <= 3 ? n : 0;

    } catch (e) {

        return 0;

    }

}

function salvarNivelGrade(chave, nivel) {

    try {

        localStorage.setItem(GRADE_CHAVE + chave, String(nivel));

    } catch (e) { /* sem armazenamento: só não lembra */ }

}
// desenha as colunas que estão ativas (mais colunas = quadradinhos menores)
function iconeGrade(cols) {

    const gap = 1.6;
    const lado = (20 - (cols - 1) * gap) / cols;
    const linhas = cols <= 3 ? 2 : 3;
    const alto = Math.min(lado * 1.4, (20 - (linhas - 1) * gap) / linhas);
    const y0 = (24 - (linhas * alto + (linhas - 1) * gap)) / 2;

    let retangulos = "";

    for (let l = 0; l < linhas; l++) {
        for (let c = 0; c < cols; c++) {
            retangulos += `<rect x="${(2 + c * (lado + gap)).toFixed(2)}" y="${(y0 + l * (alto + gap)).toFixed(2)}" width="${lado.toFixed(2)}" height="${alto.toFixed(2)}" rx="${Math.min(1.2, lado / 3).toFixed(2)}"/>`;
        }
    }

    return `<svg viewBox="0 0 24 24" aria-hidden="true">${retangulos}</svg>`;

}
function aplicarGrade(registro) {

    const cols = colunasDisponiveis()[registro.nivel];

    registro.grid.style.setProperty("--cols", cols);
    registro.grid.dataset.nivel = registro.nivel;

    registro.botao.querySelector(".grade-icone").innerHTML = iconeGrade(cols);
    registro.botao.querySelector(".grade-num").textContent = cols;

    registro.botao.setAttribute(
        "aria-label",
        `Mostrar ${cols} por linha. Toque para mudar.`
    );

}

function criarBotaoGrade(chave, grid) {

    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "assistidos-grade-btn";

    botao.innerHTML = `
        <span class="grade-icone" aria-hidden="true"></span>
        <span class="grade-num"></span>
    `;

    const registro = { chave, grid, botao, nivel: lerNivelGrade("global") };

    gradesAtivas.push(registro);

    aplicarGrade(registro);

    botao.addEventListener("click", () => {

        const novo = (registro.nivel + 1) % 4;

        salvarNivelGrade("global", novo);

        // muda todas as categorias de uma vez
        gradesAtivas.forEach(r => {
            r.nivel = novo;
            aplicarGrade(r);
        });

    });

    return botao;

}

// girou o celular / mudou a janela: refaz as colunas do nível salvo
window.addEventListener("resize", () => {

    gradesAtivas.forEach(aplicarGrade);

});

// =====================================================
// ANO ASSISTIDO (divisores, filtro por ano) E SORTEIO
// =====================================================

const LINHA_MAIS_RECENTE_PRIMEIRO = true;

let itensCache = [];
let queremosCache = [];
let ultimoSorteado = null;
let anoFiltro = "todos";   // "todos", um ano (ex.: "2025") ou "sem"

function anoDe(item) {
    return Number(item.anoAssistido) || 0;
}

function passaFiltroAno(item) {

    if (anoFiltro === "todos") return true;
    if (anoFiltro === "sem") return !anoDe(item);

    return String(anoDe(item)) === anoFiltro;

}

function ordenarPorAno(itens) {

    const dir = LINHA_MAIS_RECENTE_PRIMEIRO ? -1 : 1;

    return itens
        .map((item, i) => ({ item, i, ano: anoDe(item) }))
        .sort((a, b) => {
                       if (!a.ano && !b.ano) return b.i - a.i;
            if (!a.ano) return 1;
            if (!b.ano) return -1;
                       return ((a.ano - b.ano) * dir) || (b.i - a.i);
        })
        .map(x => x.item);

}

function criarDivisorAno(ano) {

    const div = document.createElement("div");

    div.className = "assistidos-ano-divisor";

    div.innerHTML = ano
        ? `<span>${ano}</span><span class="assistidos-ano-coracao">♥</span>`
        : `<span>Sem data</span>`;

    return div;

}

function montarFiltroAno(container) {

    document.getElementById("assistidos-anos")?.remove();

    anoFiltro = "todos";

    const assistidos = itensCache.filter(item =>
        CATEGORIAS_ORDEM.some(c => c.chave === item.categoria) &&
        item.status !== "assistindo"
    );

    const anos = [...new Set(assistidos.map(anoDe).filter(Boolean))]
        .sort((a, b) => LINHA_MAIS_RECENTE_PRIMEIRO ? b - a : a - b);

    const temSem = assistidos.some(item => !anoDe(item));

    const opcoes = [["todos", "Todos"], ...anos.map(a => [String(a), String(a)])];

    if (temSem && anos.length) opcoes.push(["sem", "Sem data"]);

    // só aparece se tiver mais de um ano pra escolher
    if (opcoes.length < 3) return;

    const barra = document.createElement("div");

    barra.id = "assistidos-anos";
    barra.className = "assistidos-visao assistidos-anos";

    barra.innerHTML = opcoes
        .map(([valor, rotulo]) =>
            `<button type="button" data-ano="${valor}">${rotulo}</button>`
        )
        .join("");

    const marcar = () => {
        barra.querySelectorAll("[data-ano]").forEach(b => {
            const ativa = b.dataset.ano === anoFiltro;
            b.classList.toggle("ativa", ativa);
            b.setAttribute("aria-pressed", String(ativa));
        });
    };

    barra.addEventListener("click", evento => {

        const botao = evento.target.closest("[data-ano]");

        if (!botao || botao.dataset.ano === anoFiltro) return;

        anoFiltro = botao.dataset.ano;

        marcar();

        desenharAssistidos();

    });

    marcar();

    container.parentNode.insertBefore(barra, container);

}
// =====================================================
// CATEGORIA (barra) E ANO (menu dos três pontinhos)
// =====================================================

const NOMES_CATEGORIA = { filmes: "Filmes", series: "Séries", animes: "Animes" };

const ICONES_CATEGORIA = {
    filmes: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4"/></svg>`,
    series: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 21h8M12 18v3"/></svg>`,
    animes: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`
};

let categoriaVisivel = "filmes";

function montarBarraCategoria(container) {

    document.getElementById("assistidos-cats")?.remove();

    const barra = document.createElement("div");

    barra.id = "assistidos-cats";
    barra.className = "assistidos-cats";
    barra.setAttribute("role", "tablist");

    barra.innerHTML =
        `<span class="assistidos-cats-marca" aria-hidden="true"></span>` +
        CATEGORIAS_ORDEM.map(c => `
            <button type="button" role="tab" data-cat="${c.chave}">
                ${ICONES_CATEGORIA[c.chave] || ""}
                <span>${NOMES_CATEGORIA[c.chave] || c.chave}</span>
            </button>
        `).join("");

    const marcar = () => {

        const indice = Math.max(
            0,
            CATEGORIAS_ORDEM.findIndex(c => c.chave === categoriaVisivel)
        );

        barra.style.setProperty("--i", indice);

        barra.querySelectorAll("[data-cat]").forEach(b => {
            b.setAttribute("aria-selected", String(b.dataset.cat === categoriaVisivel));
        });

    };

    barra.addEventListener("click", evento => {

        const botao = evento.target.closest("[data-cat]");

        if (!botao || botao.dataset.cat === categoriaVisivel) return;

        categoriaVisivel = botao.dataset.cat;

        marcar();

        desenharAssistidos();

    });

    marcar();

    container.parentNode.insertBefore(barra, container);

}

// três pontinhos: filtro por ano
function criarMenuAno() {

    const assistidos = itensCache.filter(item =>
        CATEGORIAS_ORDEM.some(c => c.chave === item.categoria) &&
        item.status !== "assistindo"
    );

    const anos = [...new Set(assistidos.map(anoDe).filter(Boolean))]
        .sort((a, b) => LINHA_MAIS_RECENTE_PRIMEIRO ? b - a : a - b);

    if (!anos.length) return null;

    const daCategoria = assistidos.filter(item => item.categoria === categoriaVisivel);

    const opcoes = [
        ["todos", "Todos os anos", daCategoria.length],
        ...anos.map(a => [String(a), String(a), daCategoria.filter(i => anoDe(i) === a).length])
    ];

    if (assistidos.some(item => !anoDe(item))) {
        opcoes.push(["sem", "Sem data", daCategoria.filter(i => !anoDe(i)).length]);
    }

    const filtrando = anoFiltro !== "todos";

    const rotuloAtivo = anoFiltro === "sem" ? "Sem data" : anoFiltro;

    const caixa = document.createElement("span");

    caixa.className = "assistidos-ano-menu";

    caixa.innerHTML = `
        <button type="button" class="assistidos-ano-btn" aria-label="Filtrar por ano" aria-haspopup="menu" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="5" cy="12" r="1.9"/>
                <circle cx="12" cy="12" r="1.9"/>
                <circle cx="19" cy="12" r="1.9"/>
            </svg>
            ${filtrando ? `<span class="assistidos-ano-chip">${rotuloAtivo}</span>` : ""}
        </button>
        <div class="assistidos-ano-popover" role="menu">
            <p class="assistidos-ano-titulo">Ano em que assistimos</p>
            ${opcoes.map(([valor, rotulo, qtd]) => `
                <button type="button" role="menuitemradio"
                        aria-checked="${valor === anoFiltro}"
                        data-ano="${valor}"
                        class="${valor === anoFiltro ? "ativa" : ""}">
                    <span class="assistidos-ano-rotulo">${rotulo}</span>
                    <span class="assistidos-ano-qtd">${qtd}</span>
                    <span class="assistidos-ano-marca" aria-hidden="true">♥</span>
                </button>
            `).join("")}
        </div>
    `;

    const botao = caixa.querySelector(".assistidos-ano-btn");

    botao.addEventListener("click", () => {

        const abrir = !caixa.classList.contains("aberto");

        caixa.classList.toggle("aberto", abrir);

        botao.setAttribute("aria-expanded", String(abrir));

    });

    caixa.querySelector(".assistidos-ano-popover").addEventListener("click", evento => {

        const opcao = evento.target.closest("[data-ano]");

        if (!opcao) return;

        if (opcao.dataset.ano === anoFiltro) {

            caixa.classList.remove("aberto");

            return;

        }

        anoFiltro = opcao.dataset.ano;

        desenharAssistidos();

    });

    return caixa;

}

// tocar fora do menu (ou Esc) fecha
document.addEventListener("click", evento => {

    if (evento.target.closest(".assistidos-ano-menu")) return;

    document
        .querySelectorAll(".assistidos-ano-menu.aberto")
        .forEach(menu => menu.classList.remove("aberto"));

});

document.addEventListener("keydown", evento => {

    if (evento.key !== "Escape") return;

    document
        .querySelectorAll(".assistidos-ano-menu.aberto")
        .forEach(menu => menu.classList.remove("aberto"));

});

function desenharAssistidos() {

    const container = document.getElementById("assistidos-categorias");

    if (!container) return;

    container.innerHTML = "";

    gradesAtivas = [];

    const categoria =
        CATEGORIAS_ORDEM.find(c => c.chave === categoriaVisivel) ||
        CATEGORIAS_ORDEM[0];

    const doGrupo = itensCache.filter(item =>
        item.categoria === categoria.chave &&
        item.status !== "assistindo" &&
        passaFiltroAno(item)
    );

    // a estante (e os botões do título) aparece sempre, pra dar pra limpar o filtro
    container.appendChild(
        criarEstante(categoria.titulo, doGrupo, categoria.chave, true)
    );

    if (!doGrupo.length) {

        const vazio = document.createElement("p");

        vazio.className = "galeria-vazio";

        vazio.textContent =
            anoFiltro === "todos"
                ? "Ainda não há nada por aqui."
                : "Nada desse ano por aqui ainda.";

        container.appendChild(vazio);

    }

}

// sorteia um da lista "Ainda queremos assistir" e abre os detalhes
function sortearUm(fecharPainel) {

    if (!queremosCache.length) return;

    let opcoes = queremosCache.filter(item => item !== ultimoSorteado);

    if (!opcoes.length) opcoes = queremosCache;

    const item = opcoes[Math.floor(Math.random() * opcoes.length)];

    ultimoSorteado = item;

    if (fecharPainel) fecharPainel();

    setTimeout(() => {

        abrirDetalhesAssistido(item, {
            notaEu: 0,
            notaEla: 0,
            notaMedia: 0,
            ehListaFutura: true
        });

    }, 350);

}

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
// Converte minutos (49.98333…) em "49:59" ou "1:16:41"
function formatarTempoAssistido(minutosTotais) {

    const totalSegundos =
        Math.max(0, Math.round((Number(minutosTotais) || 0) * 60));

    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    const dois = n => String(n).padStart(2, "0");

    return horas > 0
        ? `${horas}:${dois(minutos)}:${dois(segundos)}`
        : `${minutos}:${dois(segundos)}`;

}

function selarInfoTopo(item) {

    const progresso = item.progresso || {};

    if (item.categoria === "filmes") {
        const minutoAtual = Number(progresso.minutoAtual) || 0;
        const duracaoTotal = Number(progresso.duracaoTotal) || 0;
        return `${formatarTempoAssistido(minutoAtual)} / ${formatarTempoAssistido(duracaoTotal)}`;
    }

    const { temporada, episodio } = progresso;

    if (!temporada && !episodio) return "";

    return `T${temporada || "?"} · EP${episodio || "?"}`;

}


// =====================================================
// COR AMBIENTE — lê a cor pronta do JSON (calculada no admin),
// sem canvas e sem esperar imagem carregar
// =====================================================

function resetarCorAmbienteModal() {

    const conteudo = document.getElementById("modal-content");
    if (!conteudo) return;

    conteudo.style.removeProperty("--cor-ambiente-r");
    conteudo.style.removeProperty("--cor-ambiente-g");
    conteudo.style.removeProperty("--cor-ambiente-b");

}

function aplicarCorDoItem(item) {

    // Sem cor no JSON (capa clara ou item ainda não sincronizado):
    // fica no lilás neutro padrão.
    aplicarCorAmbienteModal(item && item.cor ? item.cor : null);

}

function aplicarCorAmbienteModal(cor) {

    const conteudo = document.getElementById("modal-content");
    if (!conteudo) return;

    if (!cor) {
        resetarCorAmbienteModal();
        return;
    }

    let { r, g, b } = cor;

    const media = (r + g + b) / 3;
    const fatorSaturacao = 1.4;

    r = media + (r - media) * fatorSaturacao;
    g = media + (g - media) * fatorSaturacao;
    b = media + (b - media) * fatorSaturacao;

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

    itensCache = itens;

    queremosCache = itens.filter(item => item.categoria === CATEGORIA_QUEREMOS);

    const assistindo = itens.filter(
        item =>
            item.status === "assistindo" &&
            item.categoria !== CATEGORIA_QUEREMOS
    );
    await carregarIdsComEdit();

    montarBarraCategoria(container);

    desenharAssistidos();

    montarPainelLateral(assistindo, queremosCache);

    ativarBotaoTopoAssistidos();

}


// =====================================================
// ESTANTE NORMAL
// =====================================================

function criarEstante(tituloCategoria, itens, chave, porAno = false) {

    const secao = document.createElement("section");
    secao.className = "assistidos-estante";

    const titulo = document.createElement("h2");
    titulo.className = "assistidos-estante-titulo";

    titulo.innerHTML = `
        <span class="assistidos-estante-titulo-texto">${tituloCategoria}</span>
        <span class="assistidos-estante-contagem">${itens.length}</span>
    `;

    const grid = document.createElement("div");
    grid.className = "assistidos-grid";

    const controles = document.createElement("div");

    controles.className = "assistidos-controles";

    const menuAno = criarMenuAno();

    if (menuAno) controles.appendChild(menuAno);

    controles.appendChild(criarBotaoGrade(chave, grid));

    titulo.appendChild(controles);

    secao.appendChild(titulo);

    const usarAno = porAno && itens.some(item => anoDe(item));

    const lista = usarAno ? ordenarPorAno(itens) : itens;

    let anoAnterior;
    let indice = 0;

    lista.forEach(item => {

        if (usarAno) {

            const ano = anoDe(item);

            if (ano !== anoAnterior) {
                grid.appendChild(criarDivisorAno(ano));
                anoAnterior = ano;
            }

        }

        grid.appendChild(criarCardAssistido(item, Math.min(indice, 14)));

        indice++;

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
    if (!ehListaFutura && temEdit(item)) {

        const selo = document.createElement("button");

        selo.type = "button";
        selo.className = "assistido-edit-selo";
        selo.title = "Ver o edit";

        selo.setAttribute("aria-label", "Ver o edit de " + item.titulo);

        selo.innerHTML = `<span aria-hidden="true">▶</span>`;

        selo.addEventListener("click", evento => {

            evento.stopPropagation();

            irParaEdit(item);

        });

        card.querySelector(".assistido-capa").appendChild(selo);

    }
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

aplicarCorDoItem(item);

        return;

    }

    let linhaProgresso = "";

    if (ehContinuar) {

        const progresso = item.progresso || {};
        const percentual = calcularProgressoItem(item);

        const textoProgresso =
            item.categoria === "filmes"
                ? `${formatarTempoAssistido(progresso.minutoAtual)} de ${formatarTempoAssistido(progresso.duracaoTotal)}`
                : `Temporada ${progresso.temporada || "?"}, Episódio ${progresso.episodio || "?"} — ${formatarTempoAssistido(progresso.minutoAtualEpisodio)} de ${formatarTempoAssistido(progresso.duracaoEpisodio)}`;

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
    const editHtml = temEdit(item)
        ? `<button type="button" class="assistido-modal-edit-btn"><span aria-hidden="true">▶</span> ver edit</button>`
        : "";
    const eyebrow =
        ehContinuar
            ? "Assistindo agora ♥"
            : `Assistido juntos ♥ ${item.ano || ""}`;

    abrirModal({
        titulo: item.titulo,
        dataExibicao: eyebrow,
          descricao: linhaProgresso + notasHtml + editHtml + citacaoHtml,
        fotos: item.capa ? [item.capa] : [],
        layoutModal: "assistido"
    });

aplicarCorDoItem(item);
    document
        .querySelector("#modal-descricao .assistido-modal-edit-btn")
        ?.addEventListener("click", () => irParaEdit(item));
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
                <div class="continuar-lateral-secao-titulo">✦ Ainda queremos assistir
                    <button type="button" class="sortear-btn" id="continuar-lateral-sortear">🎲 Sortear</button>
                </div>
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

        painel.querySelector("#continuar-lateral-sortear").addEventListener("click", () => {
        sortearUm(fecharPainel);
    });

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

        document.getElementById("continuar-lateral-sortear").hidden = !itensQueremos.length;

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