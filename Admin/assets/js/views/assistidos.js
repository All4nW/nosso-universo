// =====================================================
// ASSISTIDOS — PAINEL ADMINISTRATIVO
// =====================================================

let assistidosItens = [];


// =====================================================
// RESOLVER CAMINHO DA CAPA
// =====================================================
// O admin fica dentro da pasta "Admin/", então um caminho
// relativo como "assets/images/assistidos/xxx.jpg" (que é
// o que fica salvo no JSON, relativo à raiz do site) precisa
// subir um nível para ser encontrado a partir do admin.

function resolverCapaAdmin(capa) {

    if (!capa) return "";

    return `../${capa}`;

}
// =====================================================
// COR AMBIENTE — calculada aqui, uma vez, e gravada no JSON
// =====================================================

function extrairCorDaCapaAdmin(src) {

    return new Promise((resolve) => {

        if (!src) {
            resolve(null);
            return;
        }

        const img = new Image();

        img.onload = () => {

            try {

                const tamanho = 24;
                const canvas = document.createElement("canvas");
                canvas.width = tamanho;
                canvas.height = tamanho;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, tamanho, tamanho);

                const { data } = ctx.getImageData(0, 0, tamanho, tamanho);

                let r = 0, g = 0, b = 0, total = 0;
                let pixelsOpacos = 0;
                let pixelsClaros = 0;

                for (let i = 0; i < data.length; i += 4) {

                    if (data[i + 3] < 100) continue;

                    pixelsOpacos++;

                    const pr = data[i];
                    const pg = data[i + 1];
                    const pb = data[i + 2];
                    const luminancia = (pr + pg + pb) / 3;

                    if (luminancia > 200) pixelsClaros++;
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

                const proporcaoClara = pixelsOpacos ? pixelsClaros / pixelsOpacos : 0;

                if (proporcaoClara > 0.55 || !total) {
                    resolve(null);
                    return;
                }

                resolve({
                    r: Math.round(r / total),
                    g: Math.round(g / total),
                    b: Math.round(b / total)
                });

            } catch (erro) {

                console.warn("Não deu pra extrair cor da capa:", erro);
                resolve(null);

            }

        };

        img.onerror = () => resolve(null);

        img.src = src;

    });

}


// Preenche a cor dos itens antigos que ainda não têm (só roda
// pra quem nunca foi calculado — os já calculados são pulados).
async function preencherCoresFaltantes() {

    let calculados = 0;

    for (const item of assistidosItens) {

        if (item.cor !== undefined) continue;

        item.cor = item.capa
            ? await extrairCorDaCapaAdmin(resolverCapaAdmin(item.capa))
            : null;

        calculados++;

    }

    return calculados;

}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function initAssistidos() {

    const lista =
        document.getElementById(
            "assistidos-lista"
        );

    if (!lista) return;
    document
        .getElementById("assistidos-aura")
        ?.addEventListener("change", atualizarCampoAura);
    configurarEventosAssistidos();

    await carregarAssistidosAdmin();

}


// =====================================================
// CARREGAR
// =====================================================

async function carregarAssistidosAdmin() {

    mostrarStatusAssistidos(
        "Carregando...",
        "info"
    );

    try {

        assistidosItens =
            await API.getAssistidos();

        renderizarAssistidosAdmin();

        mostrarStatusAssistidos(
            `${assistidosItens.length} item(ns) carregado(s).`,
            "sucesso"
        );

    }

    catch (erro) {

        console.error(erro);

        mostrarStatusAssistidos(
            erro.message,
            "erro"
        );

    }

}


// =====================================================
// RENDER
// =====================================================

function renderizarAssistidosAdmin() {

    const lista =
        document.getElementById(
            "assistidos-lista"
        );

    if (!lista) return;

    lista.innerHTML = "";


    const ordem = [
        "filmes",
        "series",
        "animes",
        "queremos"
    ];


    ordem.forEach(categoria => {

        const itens =
            assistidosItens.filter(
                item =>
                    item.categoria === categoria
            );

        if (!itens.length) return;


        const bloco =
            document.createElement("div");

        bloco.className =
            "assistidos-admin-categoria";


        const nomes = {

            filmes: "🎬 Filmes",

            series: "📺 Séries",

            animes: "🍿 Animes",

            queremos: "⏳ Ainda queremos assistir"

        };


        bloco.innerHTML = `
            <div class="assistidos-admin-categoria-titulo">
                <h3>${nomes[categoria]}</h3>

                <span>
                    ${itens.length}
                    ${itens.length === 1 ? "item" : "itens"}
                </span>
            </div>
        `;


        itens.forEach(item => {

            bloco.appendChild(
                criarItemAdmin(item)
            );

        });


        lista.appendChild(bloco);

    });


    if (!lista.children.length) {

        lista.innerHTML = `
            <div class="assistidos-admin-vazio">
                <span>🎬</span>

                <h3>Nenhum título ainda</h3>

                <p>
                    Adicione o primeiro filme,
                    série ou anime.
                </p>
            </div>
        `;

    }

}


// =====================================================
// ITEM
// =====================================================

function criarItemAdmin(item) {

    const elemento =
        document.createElement("div");

    elemento.className =
        "assistidos-admin-item";


    const media =
        calcularMedia(item);


    const imagem =
        item.capa
            ? `<img src="${resolverCapaAdmin(item.capa)}" alt="">`
            : `<div class="assistidos-sem-capa">🎬</div>`;


    elemento.innerHTML = `

        <div class="assistidos-admin-imagem">
            ${imagem}
        </div>


        <div class="assistidos-admin-info">

            <strong>
                ${escaparHTML(item.titulo)}
            </strong>

            <span>
                ${item.ano || "Ano não informado"}${item.anoAssistido ? ` · assistido em ${item.anoAssistido}` : ""}
            </span>

            ${
                item.categoria !== "queremos"
                    ? `
                        <div class="assistidos-admin-notas">

                            <span>
                                ⭐ Média:
                                <b>${media}</b>
                            </span>

                            <small>
                                Você:
                                ${item.notaEu ?? "—"}
                                &nbsp;|&nbsp;
                                Ela:
                                ${item.notaEla ?? "—"}
                            </small>

                        </div>
                    `
                    : `
                         <span class="assistidos-admin-lista-futura">
                            ⏳ Ainda queremos assistir${
                                item.tipo
                                    ? " · " + ({ filmes: "Filme", series: "Série", animes: "Anime" }[item.tipo] || "")
                                    : " · ⚠ sem tipo"
                            }
                        </span>
                    `
            }

        </div>


        <div class="assistidos-admin-acoes">

            <button
                type="button"
                data-editar="${item.id}"
            >
                ✎
            </button>

            <button
                type="button"
                data-excluir="${item.id}"
            >
                🗑
            </button>

        </div>

    `;


    return elemento;

}


// =====================================================
// EVENTOS
// =====================================================

function configurarEventosAssistidos() {

    const novo =
        document.getElementById(
            "assistidos-novo"
        );

    const recarregar =
        document.getElementById(
            "assistidos-recarregar"
        );

    const sincronizar =
        document.getElementById(
            "assistidos-sincronizar"
        );

    const fechar =
        document.getElementById(
            "assistidos-modal-fechar"
        );

    const cancelar =
        document.getElementById(
            "assistidos-cancelar"
        );

    const form =
        document.getElementById(
            "assistidos-form"
        );

    const categoria =
        document.getElementById(
            "assistidos-categoria"
        );

    const imagem =
        document.getElementById(
            "assistidos-imagem"
        );


    novo?.addEventListener(
        "click",
        () => abrirModalAssistido()
    );


    recarregar?.addEventListener(
        "click",
        () =>
            carregarAssistidosAdmin()
    );


    sincronizar?.addEventListener(
        "click",
        sincronizarAssistidos
    );


    fechar?.addEventListener(
        "click",
        fecharModalAssistido
    );


    cancelar?.addEventListener(
        "click",
        fecharModalAssistido
    );


    form?.addEventListener(
        "submit",
        salvarAssistido
    );


    categoria?.addEventListener(
        "change",
        atualizarCampoNotas
    );
    categoria?.addEventListener(
        "change",
        atualizarCampoNotas
    );


    document
        .getElementById("assistidos-item-status")
        ?.addEventListener(
            "change",
            atualizarCampoProgresso
        );


    imagem?.addEventListener(
        "change",
        previewImagemAssistido
    );

    imagem?.addEventListener(
        "change",
        previewImagemAssistido
    );

        imagem?.addEventListener("change", () => {
        if (document.getElementById("assistidos-aura").value === "cor") {
            sugerirCoresDaCapa();
        }
    });


    document.addEventListener(
        "click",
        evento => {

            const editar =
                evento.target.closest(
                    "[data-editar]"
                );

            const excluir =
                evento.target.closest(
                    "[data-excluir]"
                );


            if (editar) {

                const id =
                    editar.dataset.editar;

                editarAssistido(id);

            }


            if (excluir) {

                const id =
                    excluir.dataset.excluir;

                excluirAssistido(id);

            }

        }
    );

}


// =====================================================
// MODAL
// =====================================================

function abrirModalAssistido(item = null) {

    const modal =
        document.getElementById(
            "assistidos-modal"
        );

    if (!modal) return;


    document.getElementById(
        "assistidos-modal-titulo"
    ).textContent =
        item
            ? "Editar título"
            : "Adicionar título";


    document.getElementById(
        "assistidos-id"
    ).value =
        item?.id || "";


    document.getElementById(
        "assistidos-titulo"
    ).value =
        item?.titulo || "";


    document.getElementById(
        "assistidos-categoria"
    ).value =
        item?.categoria || "filmes";


    document.getElementById(
        "assistidos-ano"
    ).value =
        item?.ano || "";

            document.getElementById(
        "assistidos-ano-assistido"
    ).value =
        item
            ? (item.anoAssistido ?? "")
            : new Date().getFullYear();


    document.getElementById(
        "assistidos-nota-eu"
    ).value =
        item?.notaEu ?? "";


    document.getElementById(
        "assistidos-nota-ela"
    ).value =
        item?.notaEla ?? "";


    document.getElementById(
        "assistidos-memoria"
    ).value =
        item?.memoria || "";
    document.getElementById(
        "assistidos-item-status"
    ).value =
        item?.status || "assistido";


    document.getElementById(
        "assistidos-minuto-atual"
    ).value =
        formatarMinutosParaDuracao(item?.progresso?.minutoAtual);

    document.getElementById(
        "assistidos-duracao-total"
    ).value =
        formatarMinutosParaDuracao(item?.progresso?.duracaoTotal);


    document.getElementById(
        "assistidos-temporada"
    ).value =
        item?.progresso?.temporada ?? "";

    document.getElementById(
        "assistidos-episodio"
    ).value =
        item?.progresso?.episodio ?? "";

    document.getElementById(
        "assistidos-minuto-episodio"
    ).value =
        formatarMinutosParaDuracao(item?.progresso?.minutoAtualEpisodio);

    document.getElementById(
        "assistidos-duracao-episodio"
    ).value =
        formatarMinutosParaDuracao(item?.progresso?.duracaoEpisodio);

    const preview =
        document.getElementById(
            "assistidos-preview"
        );


    if (item?.capa) {

        preview.innerHTML = `
            <img
                src="${resolverCapaAdmin(item.capa)}"
                alt=""
            >
        `;

    }

    else {

        preview.innerHTML = "🎬";

    }


    document.getElementById(
        "assistidos-imagem"
    ).value = "";

    document.getElementById("assistidos-tipo").value =
        item?.tipo || "";

    document.getElementById("assistidos-preview-texto").value =
        item?.previewTexto || "";

    document.getElementById("assistidos-links-lista").innerHTML = "";

    (Array.isArray(item?.links) ? item.links : [])
        .forEach(link => adicionarLinhaLink(link.nome, link.url));


    atualizarCampoNotas();
    document.getElementById("assistidos-temp-assistida").value =
        item?.tempAssistida ?? "";

    document.getElementById("assistidos-temp-total").value =
        item?.tempTotal ?? "";
    const aura = String(item?.aura || "").toLowerCase();

    const seletorAura = document.getElementById("assistidos-aura");
    const corAura = document.getElementById("assistidos-aura-cor");

    if (/^#[0-9a-f]{6}$/.test(aura)) {
        seletorAura.value = "cor";
        corAura.value = aura;
    } else if (aura === "branca") {
        seletorAura.value = "branca";
    } else {
        seletorAura.value = "auto";
    }

    atualizarCampoAura();

    modal.classList.remove(
        "oculto"
    );

}


// =====================================================
// FECHAR MODAL
// =====================================================

function fecharModalAssistido() {

    const modal =
        document.getElementById(
            "assistidos-modal"
        );

    modal?.classList.add(
        "oculto"
    );

}


// =====================================================
// NOTAS
// =====================================================

function atualizarCampoNotas() {

    const categoria =
        document.getElementById(
            "assistidos-categoria"
        ).value;


    const area =
        document.getElementById(
            "assistidos-notas-area"
        );


    if (area) {

        area.style.display =
            categoria === "queremos"
                ? "none"
                : "grid";

    }


    const statusArea =
        document.getElementById(
            "assistidos-status-area"
        );


    if (statusArea) {

        statusArea.style.display =
            categoria === "queremos"
                ? "none"
                : "block";

    }

    const areaAno =
        document.getElementById(
            "assistidos-ano-assistido-area"
        );

    if (areaAno) {

        areaAno.style.display =
            categoria === "queremos"
                ? "none"
                : "block";

    }
    const areaTemp = document.getElementById("assistidos-temporadas-area");

    if (areaTemp) {

        areaTemp.style.display =
            (categoria === "series" || categoria === "animes")
                ? "grid"
                : "none";

    }

        const areaQueremos = document.getElementById("assistidos-queremos-area");

    if (areaQueremos) {

        areaQueremos.style.display =
            categoria === "queremos" ? "block" : "none";

    }
    atualizarCampoProgresso();

}


// =====================================================
// PROGRESSO — mostra o bloco certo (filme x série/anime),
// e só quando o status for "assistindo"
// =====================================================

function atualizarCampoProgresso() {

    const categoria =
        document.getElementById(
            "assistidos-categoria"
        ).value;

    const status =
        document.getElementById(
            "assistidos-item-status"
        )?.value;

    const blocoFilme =
        document.getElementById(
            "assistidos-progresso-filme"
        );

    const blocoSerie =
        document.getElementById(
            "assistidos-progresso-serie"
        );

    if (!blocoFilme || !blocoSerie) return;

    const mostrarProgresso =
        categoria !== "queremos" &&
        status === "assistindo";

    blocoFilme.style.display =
        (mostrarProgresso && categoria === "filmes")
            ? "grid"
            : "none";

    blocoSerie.style.display =
        (mostrarProgresso && (categoria === "series" || categoria === "animes"))
            ? "grid"
            : "none";

}


// =====================================================
// DURAÇÃO — aceita "45" (minutos), "12:30" (mm:ss) ou
// "1:12:30" (h:mm:ss) e converte tudo pra minutos
// =====================================================

function converterDuracaoParaMinutos(texto) {

    if (!texto) return 0;

    const partes =
        String(texto)
            .trim()
            .split(":")
            .map(parte => Number(parte) || 0);

    if (partes.length === 1) {
        return partes[0];
    }

    if (partes.length === 2) {
        const [minutos, segundos] = partes;
        return minutos + (segundos / 60);
    }

    if (partes.length === 3) {
        const [horas, minutos, segundos] = partes;
        return (horas * 60) + minutos + (segundos / 60);
    }

    return 0;

}


function formatarMinutosParaDuracao(minutosTotais) {

    if (!minutosTotais) return "";

    const totalSegundos =
        Math.round(minutosTotais * 60);

    const horas =
        Math.floor(totalSegundos / 3600);

    const minutos =
        Math.floor((totalSegundos % 3600) / 60);

    const segundos =
        totalSegundos % 60;

    const doisDigitos =
        numero => String(numero).padStart(2, "0");

    if (horas > 0) {
        return `${horas}:${doisDigitos(minutos)}:${doisDigitos(segundos)}`;
    }

    return `${minutos}:${doisDigitos(segundos)}`;

}

function atualizarCampoAura() {

    const modo = document.getElementById("assistidos-aura").value;

    document.getElementById("assistidos-aura-cor").style.display =
        modo === "cor" ? "block" : "none";

    const caixa = document.getElementById("assistidos-aura-sugestoes");

    if (modo === "cor") {
        caixa.style.display = "flex";
        sugerirCoresDaCapa();
    } else {
        caixa.style.display = "none";
    }

}

// lê a capa (a nova escolhida ou a já salva) e mostra as cores mais marcantes
async function sugerirCoresDaCapa() {

    const caixa = document.getElementById("assistidos-aura-sugestoes");

    const arquivo = document.getElementById("assistidos-imagem").files[0];

    const id = document.getElementById("assistidos-id").value.trim();
    const existente = assistidosItens.find(i => i.id === id);

    const src = arquivo
        ? URL.createObjectURL(arquivo)
        : (existente?.capa ? resolverCapaAdmin(existente.capa) : "");

    if (!src) {
        caixa.innerHTML = `<small>Escolha uma capa para ver as cores sugeridas.</small>`;
        return;
    }

    caixa.innerHTML = `<small>Lendo as cores da capa…</small>`;

    const cores = await extrairPaletaAdmin(src);

    if (arquivo) URL.revokeObjectURL(src);

    if (!cores.length) {
        caixa.innerHTML = `<small>Não consegui ler cores dessa capa. Use o seletor.</small>`;
        return;
    }

    caixa.innerHTML =
        `<small style="width:100%">Cores da capa (toque numa):</small>` +
        cores.map(hex => `
            <button type="button" data-cor="${hex}" title="${hex}"
                style="width:34px;height:34px;border-radius:50%;border:2px solid rgba(255,255,255,.5);background:${hex};cursor:pointer;"></button>
        `).join("");

    caixa.querySelectorAll("[data-cor]").forEach(b =>
        b.addEventListener("click", () => {
            document.getElementById("assistidos-aura-cor").value = b.dataset.cor;
        })
    );

}

// pega até 5 cores bem diferentes entre si, as que mais aparecem na capa
function extrairPaletaAdmin(src) {

    return new Promise(resolve => {

        const img = new Image();

        img.onload = () => {

            try {

                const W = 40, H = 60;

                const canvas = document.createElement("canvas");
                canvas.width = W;
                canvas.height = H;

                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, W, H);

                const dados = ctx.getImageData(0, 0, W, H).data;

                // agrupa em caixinhas de cor (16 níveis por canal)
                const caixas = new Map();

                for (let i = 0; i < dados.length; i += 4) {

                    const r = dados[i], g = dados[i + 1], b = dados[i + 2];

                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);

                    // ignora quase-preto e quase-branco
                    if (max < 28 || min > 235) continue;

                    const chave = (r >> 4) + "," + (g >> 4) + "," + (b >> 4);

                    const c = caixas.get(chave) || { n: 0, r: 0, g: 0, b: 0 };

                    c.n++;
                    c.r += r;
                    c.g += g;
                    c.b += b;

                    caixas.set(chave, c);

                }

                const ordenadas = [...caixas.values()]
                    .sort((a, b) => b.n - a.n)
                    .map(c => ({
                        r: Math.round(c.r / c.n),
                        g: Math.round(c.g / c.n),
                        b: Math.round(c.b / c.n)
                    }));

                // escolhe cores que não sejam parecidas entre si
                const escolhidas = [];

                for (const c of ordenadas) {

                    const parecida = escolhidas.some(e =>
                        Math.abs(e.r - c.r) + Math.abs(e.g - c.g) + Math.abs(e.b - c.b) < 70
                    );

                    if (!parecida) escolhidas.push(c);

                    if (escolhidas.length === 5) break;

                }

                const hex = n => n.toString(16).padStart(2, "0");

                resolve(escolhidas.map(c => "#" + hex(c.r) + hex(c.g) + hex(c.b)));

            } catch (erro) {

                resolve([]);

            }

        };

        img.onerror = () => resolve([]);

        img.src = src;

    });

}

function adicionarLinhaLink(nome = "", url = "") {

    let lista = document.getElementById("assistidos-links-lista");

    // se a caixinha da lista não existir no HTML, cria na hora
    if (!lista) {

        lista = document.createElement("div");

        lista.id = "assistidos-links-lista";

        document.getElementById("assistidos-links-add")?.before(lista);

    }

    const linha = document.createElement("div");

    linha.className = "assistidos-link-linha";

    linha.style.cssText =
        "display:grid;grid-template-columns:1fr 1.6fr auto;gap:8px;margin-bottom:8px;align-items:center;";

    linha.innerHTML = `
        <input type="text" class="assistidos-link-nome" placeholder="Nome (ex.: Trailer)">
        <input type="text" class="assistidos-link-url" placeholder="https://...">
        <button type="button" class="assistidos-link-remover" title="Remover" aria-label="Remover link">✕</button>
    `;

    linha.querySelector(".assistidos-link-nome").value = nome;
    linha.querySelector(".assistidos-link-url").value = url;

    linha
        .querySelector(".assistidos-link-remover")
        .addEventListener("click", () => linha.remove());

    lista.appendChild(linha);

}

window.adicionarLinhaLink = adicionarLinhaLink;

function lerLinksDoForm() {

    return [...document.querySelectorAll("#assistidos-links-lista .assistidos-link-linha")]
        .map(linha => {

            let url = linha.querySelector(".assistidos-link-url").value.trim();

            const nome = linha.querySelector(".assistidos-link-nome").value.trim();

            if (!url) return null;

            // aceita colar sem o https://
            if (!/^https?:\/\//i.test(url)) url = "https://" + url;

            return { nome: nome || "Abrir link", url };

        })
        .filter(Boolean);

}


// =====================================================
// PREVIEW
// =====================================================

function previewImagemAssistido(evento) {

    const arquivo =
        evento.target.files[0];

    if (!arquivo) return;


    const preview =
        document.getElementById(
            "assistidos-preview"
        );


    const url =
        URL.createObjectURL(
            arquivo
        );


    preview.innerHTML = `
        <img
            src="${url}"
            alt=""
        >
    `;

}


// =====================================================
// SALVAR
// =====================================================

async function salvarAssistido(evento) {

    evento.preventDefault();


    const id =
        document.getElementById(
            "assistidos-id"
        ).value.trim();


    const titulo =
        document.getElementById(
            "assistidos-titulo"
        ).value.trim();


    const categoria =
        document.getElementById(
            "assistidos-categoria"
        ).value;


    if (!titulo) {

        alert(
            "Digite um título."
        );

        return;

    }


    const existente =
        assistidosItens.find(
            item => item.id === id
        );


    let capa =
        existente?.capa || "";


    // =================================================
    // UPLOAD
    // =================================================

    const arquivo =
        document.getElementById(
            "assistidos-imagem"
        ).files[0];


    if (arquivo) {

        mostrarStatusAssistidos(
            "Enviando imagem...",
            "info"
        );


        try {

            const resultado =
                await API.uploadImagem(
                    arquivo
                );

            capa =
                resultado.caminho;

        }

        catch (erro) {

            alert(
                "Erro ao enviar imagem: " +
                erro.message
            );

            return;

        }

    }

    // =================================================
    // COR AMBIENTE
    // =================================================

    let cor;

    if (arquivo) {

        const urlTemporaria = URL.createObjectURL(arquivo);
        cor = await extrairCorDaCapaAdmin(urlTemporaria);
        URL.revokeObjectURL(urlTemporaria);

    }

    else if (existente && existente.cor !== undefined) {

        cor = existente.cor;

    }

    else {

        cor = capa
            ? await extrairCorDaCapaAdmin(resolverCapaAdmin(capa))
            : null;

    }


    const status =
        categoria === "queremos"
            ? null
            : (document.getElementById("assistidos-item-status")?.value || "assistido");


    let progresso = null;


    if (status === "assistindo") {

        if (categoria === "filmes") {

            progresso = {

                minutoAtual:
                    converterDuracaoParaMinutos(document.getElementById("assistidos-minuto-atual").value),

                duracaoTotal:
                    converterDuracaoParaMinutos(document.getElementById("assistidos-duracao-total").value)

            };

        }

        else if (categoria === "series" || categoria === "animes") {

            progresso = {

                temporada:
                    Number(document.getElementById("assistidos-temporada").value) || 1,

                episodio:
                    Number(document.getElementById("assistidos-episodio").value) || 1,

                minutoAtualEpisodio:
                    converterDuracaoParaMinutos(document.getElementById("assistidos-minuto-episodio").value),

                duracaoEpisodio:
                    converterDuracaoParaMinutos(document.getElementById("assistidos-duracao-episodio").value)

            };

        }

    }
    const modoAura = document.getElementById("assistidos-aura").value;

    const aura =
        modoAura === "branca"
            ? "branca"
            : modoAura === "cor"
                ? document.getElementById("assistidos-aura-cor").value
                : undefined;
    const ehSerie = categoria === "series" || categoria === "animes";

    const tempAssistida = ehSerie
        ? (Number(document.getElementById("assistidos-temp-assistida").value) || undefined)
        : undefined;

    const tempTotal = ehSerie
        ? (Number(document.getElementById("assistidos-temp-total").value) || undefined)
        : undefined;

            const ehQueremos = categoria === "queremos";

    const tipo = ehQueremos
        ? (document.getElementById("assistidos-tipo").value || undefined)
        : undefined;

    const previewTexto = ehQueremos
        ? (document.getElementById("assistidos-preview-texto").value.trim() || undefined)
        : undefined;

    const linksLidos = ehQueremos ? lerLinksDoForm() : [];

    const links = linksLidos.length ? linksLidos : undefined;


    const novoItem = {

        id:
            id ||
            criarSlug(titulo),

        categoria,

        titulo,

        ano:
            Number(
                document.getElementById(
                    "assistidos-ano"
                ).value
            ) || null,

                    anoAssistido:
            categoria === "queremos"
                ? null
                : (Number(
                    document.getElementById(
                        "assistidos-ano-assistido"
                    ).value
                ) || null),

        capa,

        cor,

        aura,

                tempAssistida,
        tempTotal,

                tipo,
        previewTexto,
        links,
        
        status,

        progresso,

        notaEu:
            categoria === "queremos"
                ? null
                : converterNota(
                    document.getElementById(
                        "assistidos-nota-eu"
                    ).value
                ),

        notaEla:
            categoria === "queremos"
                ? null
                : converterNota(
                    document.getElementById(
                        "assistidos-nota-ela"
                    ).value
                ),

        memoria:
            document.getElementById(
                "assistidos-memoria"
            ).value.trim()

    };


    const indice =
        assistidosItens.findIndex(
            item =>
                item.id === novoItem.id
        );

    const categoriaMudou =
        indice >= 0 &&
        assistidosItens[indice].categoria !== novoItem.categoria;


    if (indice >= 0) {

        if (categoriaMudou) {

            // Categoria mudou: sai do lugar antigo e vai pro final,
            // como se fosse um item recém-adicionado naquela categoria
            assistidosItens.splice(indice, 1);

            assistidosItens.push(
                novoItem
            );

        }

        else {

            // Sem mudança de categoria: mantém a posição de sempre
            assistidosItens[indice] =
                novoItem;

        }

    }

    else {

        assistidosItens.push(
            novoItem
        );

    }


    mostrarStatusAssistidos(
        "Salvando...",
        "info"
    );


    try {

        await API.saveAssistidos(
            assistidosItens
        );

        fecharModalAssistido();

        renderizarAssistidosAdmin();

        mostrarStatusAssistidos(
            "Título salvo.",
            "sucesso"
        );

    }

    catch (erro) {

        console.error(erro);

        mostrarStatusAssistidos(
            erro.message,
            "erro"
        );

    }

}


// =====================================================
// EDITAR
// =====================================================

function editarAssistido(id) {

    const item =
        assistidosItens.find(
            item => item.id === id
        );


    if (!item) return;


    abrirModalAssistido(
        item
    );

}


// =====================================================
// EXCLUIR
// =====================================================

async function excluirAssistido(id) {

    const item =
        assistidosItens.find(
            item => item.id === id
        );


    if (!item) return;


    const confirmar =
        confirm(
            `Excluir "${item.titulo}"?`
        );


    if (!confirmar) return;


    assistidosItens =
        assistidosItens.filter(
            item => item.id !== id
        );


    try {

        await API.saveAssistidos(
            assistidosItens
        );


        renderizarAssistidosAdmin();


        mostrarStatusAssistidos(
            "Título excluído.",
            "sucesso"
        );

    }

    catch (erro) {

        alert(
            erro.message
        );

    }

}


// =====================================================
// SINCRONIZAR
// =====================================================

async function sincronizarAssistidos() {

    const botao =
        document.getElementById(
            "assistidos-sincronizar"
        );


    if (botao) {

        botao.disabled = true;

        botao.textContent =
            "🔄 Sincronizando...";

    }


    try {

        mostrarStatusAssistidos(
            "Calculando cores das capas...",
            "info"
        );

        await preencherCoresFaltantes();

        await API.saveAssistidos(
            assistidosItens
        );


        mostrarStatusAssistidos(
            "✓ Sincronizado! Os dados foram gravados no site.",
            "sucesso"
        );

    }

    catch (erro) {

        console.error(erro);

        mostrarStatusAssistidos(
            erro.message,
            "erro"
        );

    }


    finally {

        if (botao) {

            botao.disabled = false;

            botao.textContent =
                "🔄 Sincronizar com o site";

        }

    }

}


// =====================================================
// MÉDIA
// =====================================================

function calcularMedia(item) {

    const notas = [];


    if (
        typeof item.notaEu === "number"
    ) {

        notas.push(
            item.notaEu
        );

    }


    if (
        typeof item.notaEla === "number"
    ) {

        notas.push(
            item.notaEla
        );

    }


    if (!notas.length) {

        return "—";

    }


    const media =
        notas.reduce(
            (total, nota) =>
                total + nota,
            0
        ) / notas.length;


    return media
        .toFixed(1)
        .replace(
            ".0",
            ""
        );

}


// =====================================================
// STATUS
// =====================================================

function mostrarStatusAssistidos(
    mensagem,
    tipo
) {

    const status =
        document.getElementById(
            "assistidos-status"
        );


    if (!status) return;


    status.textContent =
        mensagem;


    status.className =
        `assistidos-status ${tipo}`;


    clearTimeout(
        mostrarStatusAssistidos.timer
    );


    mostrarStatusAssistidos.timer =
        setTimeout(
            () => {

                status.textContent =
                    "";

                status.className =
                    "assistidos-status";

            },
            4000
        );

}


// =====================================================
// UTILIDADES
// =====================================================

function criarSlug(texto) {

    return texto
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        );

}


function converterNota(valor) {

    if (
        valor === "" ||
        valor === null ||
        valor === undefined
    ) {

        return null;

    }


    const numero =
        Number(
            String(valor)
                .replace(",", ".")
        );


    if (
        Number.isNaN(numero)
    ) {

        return null;

    }


    return Math.min(
        10,
        Math.max(
            0,
            numero
        )
    );

}


function escaparHTML(texto) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        texto || "";

    return div.innerHTML;

}


window.initAssistidos =
    initAssistidos;