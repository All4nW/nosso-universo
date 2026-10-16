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

async function irParaEdit(item) {

    // fecha o modal de detalhes, se estiver aberto
    if (typeof fecharModal === "function") fecharModal();

    if (!window.Edits) return;

    const lista = await window.Edits.doFilme(item.id ?? item.titulo);

    if (lista.length) window.Edits.abrir(lista, 0);

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

// série/anime com temporada nova lançada (assistimos até a 2, já saiu a 3...)
function temNovaTemporada(item) {

    return (item.categoria === "series" || item.categoria === "animes") &&
        item.status !== "assistindo" &&
        Number(item.tempAssistida) > 0 &&
        Number(item.tempTotal) > Number(item.tempAssistida);

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

// =====================================================
// COR AMBIENTE — usa a cor pronta do JSON (item.cor, salva pelo admin)
// =====================================================

const COR_NEUTRA = { r: 236, g: 232, b: 244 };

function rgbParaHsl(r, g, b) {

    r /= 255; g /= 255; b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (d) {

        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;

        h *= 60;

    }

    return { h, s, l };

}

function hslParaRgb(h, s, l) {

    h = (((h % 360) + 360) % 360) / 360;

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const f = t => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    return {
        r: Math.round(f(h + 1 / 3) * 255),
        g: Math.round(f(h) * 255),
        b: Math.round(f(h - 1 / 3) * 255)
    };

}

function resetarCorAmbienteModal() {

    const conteudo = document.getElementById("modal-content");
    if (!conteudo) return;

    ["r", "g", "b"].forEach(c => {
        conteudo.style.removeProperty("--cor-ambiente-" + c);
        conteudo.style.removeProperty("--cor-ambiente2-" + c);
    });

    delete conteudo.dataset.aura;

}

// pega a cor que mais aparece (e mais "colorida") na capa, em vez da média
const cacheCorCapa = new Map();
let tokenCor = 0;

function extrairCorDominante(src) {

    if (!src) return Promise.resolve(null);

    if (cacheCorCapa.has(src)) return Promise.resolve(cacheCorCapa.get(src));

    return new Promise(resolve => {

        const img = new Image();

        img.crossOrigin = "anonymous";

        img.onload = () => {

            try {

                const W = 40, H = 60;

                const canvas = document.createElement("canvas");
                canvas.width = W;
                canvas.height = H;

                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, W, H);

                const dados = ctx.getImageData(0, 0, W, H).data;

                const grupos = Array.from({ length: 12 }, () => ({ n: 0, r: 0, g: 0, b: 0 }));

                const total = W * H;

                let somaLuz = 0;
                let escuros = 0;

                for (let i = 0; i < dados.length; i += 4) {

                    const r = dados[i], g = dados[i + 1], b = dados[i + 2];

                    const { h, s, l } = rgbParaHsl(r, g, b);

                    somaLuz += l;

                    if (l < 0.2) escuros++;

                    // preto, branco e cinza não contam como cor
                    if (s < 0.2 || l < 0.14 || l > 0.9) continue;

                    const grupo = grupos[Math.floor(h / 30) % 12];

                    grupo.n++;
                    grupo.r += r;
                    grupo.g += g;
                    grupo.b += b;

                }

                const melhor = grupos.reduce((a, b) => (b.n > a.n ? b : a));

                const escura = somaLuz / total < 0.32 || escuros / total > 0.5;

                if (!melhor.n) {

                    const vazio = { neutra: true, escura };

                    cacheCorCapa.set(src, vazio);

                    return resolve(vazio);

                }

                const r = Math.round(melhor.r / melhor.n);
                const g = Math.round(melhor.g / melhor.n);
                const b = Math.round(melhor.b / melhor.n);

                // força da cor (0 a 1): cresce com a área que ela ocupa e com o quanto é viva
                const area = Math.min(1, (melhor.n / total) * 3);
                const viva = Math.min(1, rgbParaHsl(r, g, b).s * 2);

                const resultado = { r, g, b, escura, forca: area * viva };

                cacheCorCapa.set(src, resultado);

                resolve(resultado);

            } catch (erro) {

                resolve(null);

            }

        };

        img.onerror = () => resolve(null);

        img.src = src;

    });

}

function aplicarCorDoItem(item) {

    const meu = ++tokenCor;

    // escolha manual no JSON: "aura": "branca"  ou  "aura": "#c0392b"
    const manual = item && typeof item.aura === "string" ? item.aura.trim().toLowerCase() : "";

    if (manual) {

        if (manual === "branca" || manual === "neutra") {

            aplicarCorAmbienteModal({ neutra: true });

            return;

        }

        const m = manual.match(/^#?([0-9a-f]{6})$/);

        if (m) {

            const n = parseInt(m[1], 16);

            aplicarCorAmbienteModal({ r: n >> 16, g: (n >> 8) & 255, b: n & 255, forca: 1 });

            return;

        }

    }

    // na hora: usa o que já tiver (cache, cor do admin ou prateado)
    const pronta = item && item.capa && cacheCorCapa.get(item.capa);

    aplicarCorAmbienteModal(pronta || (item && item.cor) || { neutra: true });

    if (pronta || !item || !item.capa) return;

    // depois: lê a cor da capa e refina
    extrairCorDominante(item.capa).then(cor => {

        if (cor && meu === tokenCor) aplicarCorAmbienteModal(cor);

    });

}

function aplicarCorAmbienteModal(cor) {

    const conteudo = document.getElementById("modal-content");
    if (!conteudo) return;

    if (!cor) {
        resetarCorAmbienteModal();
        return;
    }

    let principal = COR_NEUTRA;
    let aura = "neutra";

    if (!cor.neutra) {

        const { h, s, l } = rgbParaHsl(cor.r, cor.g, cor.b);

        // cor vinda do admin não tem "forca": usa um valor médio
        const forca = typeof cor.forca === "number" ? cor.forca : 0.7;

        if (s >= 0.14 && forca >= 0.12) {

            const luz = cor.escura ? 0.42 : Math.min(0.58, Math.max(0.48, l));
            const sat = Math.min(0.8, Math.max(0.5, s));

            const viva = hslParaRgb(h, sat, luz);

            // mistura gradual: quanto mais fraca a cor, mais perto do branco prateado
            principal = {
                r: Math.round(COR_NEUTRA.r + (viva.r - COR_NEUTRA.r) * forca),
                g: Math.round(COR_NEUTRA.g + (viva.g - COR_NEUTRA.g) * forca),
                b: Math.round(COR_NEUTRA.b + (viva.b - COR_NEUTRA.b) * forca)
            };

            aura = forca > 0.45 ? "cor" : "neutra";

        }

    }

    if (cor.escura) aura += " escura";

    conteudo.dataset.aura = aura;

    conteudo.style.setProperty("--cor-ambiente-r", principal.r);
    conteudo.style.setProperty("--cor-ambiente-g", principal.g);
    conteudo.style.setProperty("--cor-ambiente-b", principal.b);

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
        selo.title = "Ver o preview";

        selo.setAttribute("aria-label", "Ver o preview de " + item.titulo);

        selo.innerHTML = `<span aria-hidden="true">▶</span>`;

        selo.addEventListener("click", evento => {

            evento.stopPropagation();

            irParaEdit(item);

        });

        card.querySelector(".assistido-capa").appendChild(selo);

    }

        if (
        !ehListaFutura &&
        (item.categoria === "series" || item.categoria === "animes") &&
        Number(item.tempAssistida) > 0
    ) {

        card.querySelector(".assistido-capa").insertAdjacentHTML(
            "beforeend",
            `<span class="assistido-temp-selo">Temp. ${Number(item.tempAssistida)}</span>`
        );

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

    // tira o botão de edit do modal anterior
    document.querySelector("#modal-content .assistido-modal-edit-topo")?.remove();

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

    const eyebrow =
        ehContinuar
            ? "Assistindo agora ♥"
            : `Assistido juntos ♥ ${item.ano || ""}`;
    let temporadaHtml = "";

    const ehSerieOuAnime = item.categoria === "series" || item.categoria === "animes";

    if (ehSerieOuAnime && (Number(item.tempAssistida) > 0 || item.status === "concluido")) {

        temporadaHtml = `
            <div class="assistido-modal-temporada">
                ${Number(item.tempAssistida) > 0
                    ? `<p>Última temporada assistida: <strong>Temp. ${Number(item.tempAssistida)}</strong></p>`
                    : ""}
                ${item.status === "concluido"
                    ? `<div class="assistido-modal-concluido-pilula">✔ Concluído</div>`
                    : ""}
            </div>
        `;

    }

    abrirModal({
        titulo: item.titulo,
        dataExibicao: eyebrow,
                descricao: linhaProgresso + temporadaHtml + notasHtml + citacaoHtml,
        fotos: item.capa ? [item.capa] : [],
        layoutModal: "assistido"
    });

    aplicarCorDoItem(item);

    // botão de edit no canto de cima, ao lado do ✕
    if (temEdit(item)) {

        const botaoEdit = document.createElement("button");

        botaoEdit.type = "button";
        botaoEdit.className = "assistido-modal-edit-topo";
        botaoEdit.setAttribute("aria-label", "Ver o preview de " + item.titulo);

        botaoEdit.innerHTML = `
            <span class="edit-topo-icone" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>
            </span>
            <span class="edit-topo-texto">Preview</span>
        `;

        botaoEdit.addEventListener("click", () => irParaEdit(item));

        document.getElementById("modal-content")?.appendChild(botaoEdit);

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
        <span class="continuar-lateral-btn-texto">Pra ver</span>
        <span class="continuar-lateral-btn-contagem" id="continuar-lateral-contagem">0</span>
    `;

    const painel = document.createElement("aside");
    painel.className = "continuar-lateral-painel";
    painel.innerHTML = `
        <div class="continuar-lateral-cabecalho">
            <span class="continuar-lateral-titulo">Pra ver ✦</span>
            <button type="button" class="continuar-lateral-fechar" id="continuar-lateral-fechar">✕</button>
        </div>

        <div class="continuar-lateral-abas" role="tablist">
            <button type="button" class="continuar-lateral-aba" role="tab" data-aba="lista" aria-selected="true">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/></svg>
                <span>Pra assistir</span>
                <small id="aba-n-lista">0</small>
            </button>
            <button type="button" class="continuar-lateral-aba" role="tab" data-aba="edits" aria-selected="false">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10h17v9.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="m3.6 10-.9-4.2 16.2-3.3.9 4.2zM7.6 6.8l2.4 3M12 5.9l2.4 3.1M16.4 5l2.4 3"/></svg>
                <span>Edits</span>
                <small id="aba-n-edits">0</small>
            </button>
        </div>

        <div class="continuar-lateral-corpo">

            <div data-secao="lista">

                <div class="continuar-lateral-secao">
                    <div class="continuar-lateral-secao-titulo">▶ Continuar assistindo</div>
                    <div class="continuar-lateral-grid" id="continuar-lateral-grid-assistindo"></div>
                </div>
                <div class="continuar-lateral-secao" id="continuar-lateral-secao-novas" hidden>
                    <div class="continuar-lateral-secao-titulo">✦ Temporada nova disponível</div>
                    <div class="continuar-lateral-grid" id="continuar-lateral-grid-novas"></div>
                </div>
                <div class="continuar-lateral-secao">
                    <div class="continuar-lateral-secao-titulo">✦ Ainda queremos assistir
                        <button type="button" class="sortear-btn" id="continuar-lateral-sortear">🎲 Sortear</button>
                    </div>
                    <div class="continuar-lateral-grid" id="continuar-lateral-grid-queremos"></div>
                </div>

            </div>

            <div class="continuar-lateral-secao" data-secao="edits" hidden>
                <div class="edits-folha">
                    <h3 class="edits-folha-titulo">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10h17v9.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="m3.6 10-.9-4.2 16.2-3.3.9 4.2zM7.6 6.8l2.4 3M12 5.9l2.4 3.1M16.4 5l2.4 3"/></svg>
                        <span>Edits</span>
                    </h3>
                    <div class="continuar-lateral-edits" id="continuar-lateral-edits"></div>
                </div>
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

    // abas: o fundo "de papel" só aparece na aba Edits
    const trocarAba = nome => {

        painel.querySelectorAll("[data-aba]").forEach(a =>
            a.setAttribute("aria-selected", String(a.dataset.aba === nome))
        );

        painel.querySelectorAll("[data-secao]").forEach(s => {
            s.hidden = s.dataset.secao !== nome;
        });

        painel.querySelector(".continuar-lateral-corpo").scrollTop = 0;

        // os edits só são montados na primeira vez que a aba abre
        if (nome === "edits" && window.Edits) {
            window.Edits.montarLista(painel.querySelector("#continuar-lateral-edits"));
        }

    };

    painel.querySelectorAll("[data-aba]").forEach(a =>
        a.addEventListener("click", () => trocarAba(a.dataset.aba))
    );

    const fecharPainel = () => {
        painel.classList.remove("painel-aberto");
        overlay.classList.remove("overlay-visivel");
    };

    botao.addEventListener("click", abrirPainel);
    overlay.addEventListener("click", fecharPainel);
    painel.querySelector("#continuar-lateral-fechar").addEventListener("click", fecharPainel);

    painel.querySelector("#continuar-lateral-sortear").addEventListener("click", () => {
        abrirSorteio(fecharPainel);
    });

    document.addEventListener("keydown", (evento) => {
        // com o player de edit aberto, o Esc é dele
        if (evento.key === "Escape" && !document.body.classList.contains("edit-aberto")) {
            fecharPainel();
        }
    });

    painelLateralCriado = true;

}

function montarPainelLateral(itensAssistindo, itensQueremos) {

    garantirPainelLateral();

    const botao = document.getElementById("continuar-lateral-btn");
    const contagem = document.getElementById("continuar-lateral-contagem");
    const gridAssistindo = document.getElementById("continuar-lateral-grid-assistindo");
    const gridQueremos = document.getElementById("continuar-lateral-grid-queremos");

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
    const novas = itensCache.filter(temNovaTemporada);

    const gridNovas = document.getElementById("continuar-lateral-grid-novas");

    gridNovas.innerHTML = "";

    novas.forEach((item, indice) => {
        gridNovas.appendChild(criarCardAssistido(item, indice));
    });

    document.getElementById("continuar-lateral-secao-novas").hidden = !novas.length;
    document.getElementById("continuar-lateral-sortear").hidden = !itensQueremos.length;

    // o número do botão soma as três listas (os edits chegam um instante depois)
    const atualizar = qtdEdits => {
          const total = itensAssistindo.length + itensQueremos.length + novas.length + qtdEdits;
        botao.style.display = total ? "flex" : "none";
        contagem.textContent = total;
    };

    atualizar(0);

    document.getElementById("aba-n-lista").textContent =
        itensAssistindo.length + itensQueremos.length + novas.length;

    if (window.Edits) {
        window.Edits.carregar().then(lista => {
            atualizar(lista.length);
            document.getElementById("aba-n-edits").textContent =
                new Set(lista.map(e => e.assistidoId || e.chave)).size;
        });
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
// =====================================================
// SORTEIO — tela própria, com opções e confete
// =====================================================

let sorteioConfig = { qtd: 1, tipo: "todos" };
let sorteioJaSaiu = new Set();
let sorteioEl = null;
let sorteioTimer = null;

// lê o tipo (filmes / series / animes) do item da lista "queremos"
function tipoDoQueremos(item) {
    return String(item.tipo ?? item.tipoMidia ?? item.categoriaOriginal ?? "").toLowerCase();
}

function abrirSorteio(fecharPainel) {

    if (!queremosCache.length) return;

    if (fecharPainel) fecharPainel();

    if (!sorteioEl) criarSorteio();

    sorteioEl.hidden = false;
    document.body.classList.add("sorteio-aberto");

    sorteioTelaOpcoes();

}

function fecharSorteio() {

    if (!sorteioEl) return;

    clearTimeout(sorteioTimer);

    sorteioEl.hidden = true;
    document.body.classList.remove("sorteio-aberto");

    sorteioEl.querySelectorAll(".confete").forEach(c => c.remove());

}

function criarSorteio() {

    sorteioEl = document.createElement("div");

    sorteioEl.className = "sorteio";
    sorteioEl.hidden = true;

    sorteioEl.setAttribute("role", "dialog");
    sorteioEl.setAttribute("aria-modal", "true");
    sorteioEl.setAttribute("aria-label", "Sorteio");

    sorteioEl.innerHTML = `
        <button type="button" class="sorteio-fechar" aria-label="Fechar">✕</button>
        <div class="sorteio-caixa"></div>
    `;

    document.body.appendChild(sorteioEl);

    sorteioEl.querySelector(".sorteio-fechar").addEventListener("click", fecharSorteio);

    sorteioEl.addEventListener("click", evento => {

        // tocar no fundo escuro fecha
        if (evento.target === sorteioEl) return fecharSorteio();

        const passo = evento.target.closest("[data-passo]");
        const tipo = evento.target.closest("[data-tipo]");
        const acao = evento.target.closest("[data-acao]");
        const carta = evento.target.closest("[data-carta]");

        if (passo) {
            const campo = sorteioEl.querySelector(".sorteio-numero");
            const maximo = Number(campo.max) || 1;
            const novo = Math.min(Math.max(1, (Number(campo.value) || 1) + Number(passo.dataset.passo)), maximo);
            sorteioConfig.qtd = novo;
            campo.value = novo;
        } else if (tipo) {
            sorteioConfig.tipo = tipo.dataset.tipo;
            sorteioTelaOpcoes();
        } else if (acao) {
            if (acao.dataset.acao === "sortear") fazerSorteio();
            if (acao.dataset.acao === "opcoes") sorteioTelaOpcoes();
        } else if (carta) {
            const item = sorteioUltimo[Number(carta.dataset.carta)];
            fecharSorteio();
            setTimeout(() => {
                abrirDetalhesAssistido(item, { notaEu: 0, notaEla: 0, notaMedia: 0, ehListaFutura: true });
            }, 250);
        }

    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && sorteioEl && !sorteioEl.hidden) fecharSorteio();
    });

}

function sorteioFiltrados() {

    return sorteioConfig.tipo === "todos"
        ? queremosCache.slice()
        : queremosCache.filter(i => tipoDoQueremos(i) === sorteioConfig.tipo);

}

function sorteioTelaOpcoes() {

    const caixa = sorteioEl.querySelector(".sorteio-caixa");

    const contar = t =>
        t === "todos"
            ? queremosCache.length
            : queremosCache.filter(i => tipoDoQueremos(i) === t).length;

    const temTipos = queremosCache.some(i => tipoDoQueremos(i));

    const tipos = [["todos", "Tudo"], ["filmes", "Filmes"], ["series", "Séries"], ["animes", "Animes"]];

    const maximo = Math.max(1, sorteioFiltrados().length);

    sorteioConfig.qtd = Math.min(Math.max(1, sorteioConfig.qtd), maximo);

    caixa.innerHTML = `
        <p class="sorteio-eyebrow"><i>✦</i> nossa lista <i>✦</i></p>
        <h2 class="sorteio-titulo">O que vamos ver?</h2>

        <div class="sorteio-ornamento" aria-hidden="true"><span>♥</span></div>

        <div class="sorteio-grupo">
            <span class="sorteio-rotulo">Quantos?</span>

            <div class="sorteio-contador">
                <button type="button" class="sorteio-mais-menos" data-passo="-1" aria-label="Menos um">−</button>

                <input type="number" class="sorteio-numero" inputmode="numeric"
                       min="1" max="${maximo}" value="${sorteioConfig.qtd}"
                       aria-label="Quantidade a sortear">

                <button type="button" class="sorteio-mais-menos" data-passo="1" aria-label="Mais um">+</button>
            </div>

            <small class="sorteio-max">de ${maximo} na lista</small>
        </div>

        ${temTipos ? `
            <div class="sorteio-grupo">
                <span class="sorteio-rotulo">De quê?</span>
                <div class="sorteio-opcoes">
                    ${tipos.map(([valor, nome]) => `
                        <button type="button" data-tipo="${valor}"
                                class="${sorteioConfig.tipo === valor ? "ativa" : ""}"
                                ${contar(valor) ? "" : "disabled"}>
                            ${nome} <small>${contar(valor)}</small>
                        </button>
                    `).join("")}
                </div>
            </div>
        ` : ""}

        <button type="button" class="sorteio-go" data-acao="sortear">
            <span class="sorteio-go-dado" aria-hidden="true">⚄</span>
            <span>Sortear</span>
        </button>
    `;

    const campo = caixa.querySelector(".sorteio-numero");

    // digitar: aceita qualquer número enquanto digita, corrige ao sair do campo
    campo.addEventListener("input", () => {
        const v = Number(campo.value);
        if (v >= 1) sorteioConfig.qtd = Math.min(v, maximo);
    });

    campo.addEventListener("change", () => {
        const v = Math.min(Math.max(1, Math.round(Number(campo.value) || 1)), maximo);
        sorteioConfig.qtd = v;
        campo.value = v;
    });

    campo.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            campo.blur();
            fazerSorteio();
        }
    });

    campo.addEventListener("focus", () => campo.select());

}

let sorteioUltimo = [];

function fazerSorteio() {

    const caixa = sorteioEl.querySelector(".sorteio-caixa");

    const filtrados = sorteioFiltrados();

    if (!filtrados.length) return;

    // não repete o que já saiu, até a lista acabar
    let pool = filtrados.filter(i => !sorteioJaSaiu.has(i));

    const qtd = Math.min(sorteioConfig.qtd, filtrados.length);

    if (pool.length < qtd) {
        sorteioJaSaiu = new Set();
        pool = filtrados.slice();
    }

    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    sorteioUltimo = pool.slice(0, qtd);

    sorteioUltimo.forEach(i => sorteioJaSaiu.add(i));

    // suspense
    caixa.innerHTML = `
        <div class="sorteio-girando"><span>✦</span></div>
        <p class="sorteio-titulo">sorteando…</p>
    `;

    clearTimeout(sorteioTimer);

    sorteioTimer = setTimeout(() => {

        caixa.innerHTML = `
            <p class="sorteio-eyebrow">✦ hoje a gente vê ✦</p>

            <div class="sorteio-cartas ${qtd === 1 ? "sorteio-um" : ""}">
                ${sorteioUltimo.map((item, i) => `
                    <button type="button" class="sorteio-carta" data-carta="${i}" style="--d:${i * 0.18}s">
                        <span class="sorteio-capa">
                            ${item.capa ? `<img src="${item.capa}" alt="">` : ""}
                        </span>
                        <span class="sorteio-nome">${escaparHTML(item.titulo)}</span>
                    </button>
                `).join("")}
            </div>

            <p class="sorteio-dica">toque numa capa pra ver os detalhes</p>

            <div class="sorteio-acoes">
                <button type="button" class="sorteio-go" data-acao="sortear">
                    <span class="sorteio-go-dado" aria-hidden="true">⚄</span>
                    <span>Sortear de novo</span>
                </button>
                <button type="button" class="sorteio-link" data-acao="opcoes">mudar opções</button>
            </div>
        `;

        soltarConfete();

    }, 1100);

}

function soltarConfete() {

    const cores = ["#f08cc0", "#f6b3d6", "#c9a7f5", "#ffd98e", "#8fd3ff"];

    for (let i = 0; i < 70; i++) {

        const p = document.createElement("span");

        const simbolo = i % 7 === 0;

        p.className = "confete" + (simbolo ? " confete-simbolo" : "");

        if (simbolo) p.textContent = i % 2 ? "♥" : "✦";

        p.style.cssText =
            `left:${Math.random() * 100}%;` +
            `--cor:${cores[i % cores.length]};` +
            `--atraso:${(Math.random() * 0.6).toFixed(2)}s;` +
            `--dur:${(2.4 + Math.random() * 1.8).toFixed(2)}s;` +
            `--giro:${Math.round(Math.random() * 720 - 360)}deg;` +
            `--vai:${Math.round(Math.random() * 160 - 80)}px`;

        sorteioEl.appendChild(p);

        setTimeout(() => p.remove(), 5000);

    }

}
carregarAssistidos();