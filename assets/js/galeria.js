// =====================================================
// GALERIA — SITE PRINCIPAL
// =====================================================
const EMOJIS_PASTA = {
    roblox: "🎮",
    minecraft: "⛏️",
    genshin: "✨",
    transmitidos: "🎬",
    aleatórios: "🎲",
    aleatorios: "🎲",
    perfil: "💌"
};

// ícone de cada pasta (se a pasta não estiver aqui, o título continua em texto)
const ICONES_PASTA = {
    roblox: "assets/images/assistidos/icons/icon_roblox.png",
    minecraft: "assets/images/assistidos/icons/icon_minecraft.png",
    genshin: "assets/images/assistidos/icons/icon_genshin.png"
};

function adicionarDecoracoesFundoGaleria() {
    const wrapper = document.querySelector(".galeria-pastas-wrapper");
    if (!wrapper || wrapper.querySelector(".hub-fundo-decoracoes")) return;

    const decoracoes = document.createElement("div");
    decoracoes.className = "hub-fundo-decoracoes";
    decoracoes.setAttribute("aria-hidden", "true");
    decoracoes.innerHTML = `
        <img src="assets/images/perfil-decoracoes/coracao-raios.png" alt="" style="--px: 4%; --py: 10%; --pdelay: 0s; --pduracao: 9s;">
        <img src="assets/images/perfil-decoracoes/brilhos-cluster.png" alt="" style="--px: 92%; --py: 8%; --pdelay: 1.2s; --pduracao: 11s;">
        <img src="assets/images/perfil-decoracoes/coracao-raios.png" alt="" style="--px: 90%; --py: 70%; --pdelay: 2.4s; --pduracao: 10s;">
    `;

    wrapper.prepend(decoracoes);
}

let pastasCarregadas = [];
let fotosDaPastaAberta = [];
let indiceFotoAberta = 0;
let nomeDaPastaAberta = "";
let filtroAlbumAdminAtivo = null;

const API_BASE = 'http://localhost:3000';

function urlImagemGaleria(caminho) {
    if (!caminho) return '';

    // Se já for uma URL completa, mantém
    if (caminho.startsWith('http://') || caminho.startsWith('https://')) {
        return caminho;
    }

    // Imagens enviadas pelo backend ficam em /uploads
    if (caminho.startsWith('/uploads/')) {
        return API_BASE + caminho;
    }

    // Imagens antigas/estáticas do site continuam normais
    return caminho;
}


// =====================================================
// PERFIS — pasta especial com moldura temática por plataforma
// =====================================================

// Info de exibição de cada plataforma conhecida. Uma foto com
// plataforma vazia ou não mapeada cai no grupo genérico "outro".
// "categoria" é usada pelos filtros (Todos / Redes Sociais / Jogos / Outros).
const PLATAFORMAS_PERFIL = {
    genshin: { label: "Genshin Impact", emoji: "✨", frase: "", categoria: "jogos" },
    roblox: { label: "Roblox", emoji: "🎮", frase: "", categoria: "jogos" },
        wildrift: { label: "Wild Rift", emoji: "⚔️", frase: "", categoria: "jogos" },
    discord: { label: "Discord", emoji: "💬", frase: "", categoria: "redes" },
    tiktok: { label: "TikTok", emoji: "🎵", frase: "", categoria: "redes" },
    instagram: { label: "Instagram", emoji: "📸", frase: "", categoria: "redes" },
    widgetable: { label: "Widgetable", emoji: "🧩", frase: "", categoria: "redes" },
    rave: { label: "Rave", emoji: "🎬", frase: "", categoria: "redes" }
};

function ehPastaDePerfis(pasta) {
    return Boolean(
        pasta &&
        pasta.nome &&
        pasta.nome.trim().toLowerCase().includes("perfil")
    );
}

function renderizarPerfis(fotos, lista) {

    lista.classList.add("galeria-perfis-vista");
    lista.innerHTML = "";

    const esc = (texto) =>
        String(texto || "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));

    // agrupa as fotos por plataforma
    const grupos = {};

    fotos.forEach((foto) => {

        const chave = (foto.plataforma || "outro").toLowerCase();

        if (!grupos[chave]) grupos[chave] = [];

        grupos[chave].push(foto);

    });

    // plataformas conhecidas primeiro, na ordem da lista; o resto vem depois
    const ordemChaves = [
        ...Object.keys(PLATAFORMAS_PERFIL).filter((c) => grupos[c]),
        ...Object.keys(grupos).filter((c) => !PLATAFORMAS_PERFIL[c])
    ];

    ordemChaves.forEach((chave, indiceSecao) => {

        const info = PLATAFORMAS_PERFIL[chave] || {
            label: chave === "outro" ? "Outros" : chave,
            emoji: "📌",
            frase: "",
            categoria: "outros"
        };

        const fotosDoGrupo = grupos[chave];
        const fotosVisiveis = fotosDoGrupo.slice(0, 2);
        const extras = fotosDoGrupo.length - fotosVisiveis.length;
        const qtd = fotosVisiveis.length;

        const clipeTopo = indiceSecao % 2 === 0 ? "clipe-rosa.png" : "clipe-roxo.png";
        const enfeiteCanto = indiceSecao % 2 === 0 ? "flor-galho.png" : "coracao-fino.png";

        const secao = document.createElement("section");

        secao.className = `perfil-secao perfil-plat-${chave}`;
        secao.style.setProperty("--delay", `${indiceSecao * 0.15}s`);

        const midiaHtml = fotosVisiveis
            .map((foto, i) => {

                const ultima = i === qtd - 1;

                const clipe = i === 0
                    ? `<img class="perfil-decoracao-clipe" src="assets/images/perfil-decoracoes/${clipeTopo}" alt="">`
                    : "";

                // o coraçãozinho-prendedor fica na costura, na segunda foto
                const prendedor = (i === 1 && chave !== "rave")
                    ? `<img class="perfil-decoracao-clipe-coracao" src="assets/images/perfil-decoracoes/clipe-coracao.png" alt="">`
                    : "";

                const canto = ultima
                    ? `<img class="perfil-decoracao-canto" src="assets/images/perfil-decoracoes/${enfeiteCanto}" alt="">`
                    : "";

                const mais = (ultima && extras > 0)
                    ? `<span class="perfil-mais">+${extras}</span>`
                    : "";

                const legenda = foto.descricao
                    ? `<span class="perfil-foto-legenda">${esc(foto.descricao)}</span>`
                    : "";

                return `
                    <div class="perfil-secao-foto perfil-foto-${i + 1}" data-indice="${i}">
                        ${clipe}
                        <img
                            class="perfil-foto-img"
                            src="${urlImagemGaleria(foto.imagem)}"
                            alt=""
                            onerror="this.closest('.perfil-secao-foto').remove()"
                        >
                        ${legenda}
                        ${mais}
                        ${prendedor}
                        ${canto}
                    </div>
                `;

            })
            .join("");

        secao.innerHTML = `

            <header class="perfil-secao-cabecalho">

                <div class="perfil-secao-selo">
                    <span class="perfil-secao-emoji">${info.emoji}</span>
                </div>

                <h3 class="perfil-secao-titulo">${info.label}</h3>

                ${info.frase ? `<p class="perfil-secao-frase">${info.frase}</p>` : ""}

            </header>

            <div class="perfil-secao-midia perfil-secao-midia-${chave} perfil-qtd-${qtd}">
                ${midiaHtml}
            </div>

        `;

        // descobre se cada imagem é vertical ou horizontal e ajusta o tamanho
        secao.querySelectorAll(".perfil-foto-img").forEach((img) => {

            const marcar = () => {

                const moldura = img.closest(".perfil-secao-foto");

                if (!moldura) return;

                moldura.classList.add(
                    img.naturalHeight > img.naturalWidth * 1.1
                        ? "perfil-vertical"
                        : "perfil-horizontal"
                );

            };

            if (img.complete && img.naturalWidth) marcar();
            else img.addEventListener("load", marcar);

        });

        // clicar em qualquer foto abre o carrossel completo da plataforma
        secao.querySelectorAll(".perfil-secao-foto").forEach((elemento) => {

            elemento.addEventListener("click", () => {

                fotosDaPastaAberta = fotosDoGrupo;

                abrirVisualizador(Number(elemento.dataset.indice));

            });

        });

        lista.appendChild(secao);

    });

}


// =====================================================
// CARREGAR GALERIA
// =====================================================

async function carregarGaleria() {

    const containerPastas =
        document.getElementById("galeria-pastas");

    if (!containerPastas) return;

    adicionarDecoracoesFundoGaleria();

    try {

        // =================================================
        // IMPORTANTE:
        // O SITE PRINCIPAL APENAS LÊ o galeria.json.
        //
        // NÃO chamar /api/galeria/exportar aqui.
        // Essa rota escreve/gera o JSON e pode fazer
        // o Live Server detectar uma alteração e recarregar
        // a página infinitamente.
        // =================================================

        const respostaJson =
            await fetch(
                "assets/data/galeria.json",
                {
                    cache: "no-cache"
                }
            );

        if (!respostaJson.ok) {

            throw new Error(
                "Não foi possível carregar galeria.json."
            );

        }

        pastasCarregadas =
            await respostaJson.json();

    }

    catch (erro) {

        console.error(
            "Erro ao carregar a galeria:",
            erro
        );

        pastasCarregadas = [];

    }


    containerPastas.innerHTML = "";


    pastasCarregadas.forEach(
        (pasta, indice) => {

            containerPastas.appendChild(
                criarCardPasta(pasta, indice)
            );

        }
    );


    configurarCarrossel();

}


// =====================================================
// CRIAR CARD DA PASTA
// =====================================================

function criarCardPasta(pasta, indice) {

    const card =
        document.createElement("div");

    card.className =
        "galeria-pasta-card";

    const rotacoes = [-3, 2, -2, 3, -2, 2, -3];

    card.style.setProperty("--rot", `${rotacoes[indice % rotacoes.length]}deg`);
    card.style.setProperty("--i", indice);

    // fotos e vídeos contados separadamente
    const midias =
        pasta.fotos || [];

    const qtdVideos =
        midias.filter(m => ehVideoGaleria(m.imagem)).length;

    const qtdFotos =
        midias.length - qtdVideos;

    const contaFotos =
        (qtdFotos || !qtdVideos)
            ? `<span class="pasta-conta pasta-conta-fotos">${qtdFotos} ${qtdFotos === 1 ? "foto" : "fotos"}</span>`
            : "";

    const contaVideos =
        qtdVideos
            ? `<span class="pasta-conta pasta-conta-videos">${qtdVideos} ${qtdVideos === 1 ? "vídeo" : "vídeos"}</span>`
            : "";

    const chaveEmoji = (pasta.nome || "").trim().toLowerCase();
    const emoji = EMOJIS_PASTA[chaveEmoji] || "🗂️";

    card.innerHTML = `

        <div class="galeria-pasta-aba">
            <span class="galeria-pasta-emoji">${emoji}</span>
        </div>

        <div class="galeria-pasta-papeis">
            <div class="galeria-pasta-capa">
                <img
                    src="${urlImagemGaleria(pasta.capa)}"
                    alt="${pasta.nome || ""}"
                    onerror="this.remove()"
                >
            </div>
        </div>

        <div class="galeria-pasta-frente">
            <span class="galeria-pasta-nome">${pasta.nome || ""}</span>
            <span class="galeria-pasta-quantidade">${contaFotos}${contaVideos}</span>
        </div>

    `;

    card.addEventListener("click", () => {

        // marca a pasta que está aberta
        document
            .querySelectorAll(".galeria-pasta-aberta")
            .forEach(c => c.classList.remove("galeria-pasta-aberta"));

        card.classList.add("galeria-pasta-aberta");

        abrirPasta(pasta);

    });

    return card;

}


// =====================================================
// CARROSSEL
// =====================================================

function configurarCarrossel() {

    const container =
        document.getElementById(
            "galeria-pastas"
        );

    const setaEsq =
        document.getElementById(
            "galeria-seta-esq"
        );

    const setaDir =
        document.getElementById(
            "galeria-seta-dir"
        );

    const fadeEsq =
        document.querySelector(
            ".galeria-fade-esquerda"
        );

    const fadeDir =
        document.querySelector(
            ".galeria-fade-direita"
        );


    if (!container) return;


    function atualizarSetas() {

        const temOverflow =
            container.scrollWidth >
            container.clientWidth + 5;


        if (!temOverflow) {

            setaEsq?.classList.remove(
                "visivel"
            );

            setaDir?.classList.remove(
                "visivel"
            );

            fadeEsq?.classList.remove(
                "visivel"
            );

            fadeDir?.classList.remove(
                "visivel"
            );

            return;

        }


        const noInicio =
            container.scrollLeft <= 5;


        const noFim =
            container.scrollLeft +
                container.clientWidth >=
            container.scrollWidth - 5;


        setaEsq?.classList.toggle(
            "visivel",
            !noInicio
        );

        fadeEsq?.classList.toggle(
            "visivel",
            !noInicio
        );


        setaDir?.classList.toggle(
            "visivel",
            !noFim
        );

        fadeDir?.classList.toggle(
            "visivel",
            !noFim
        );

    }


    setaEsq?.addEventListener(
        "click",
        () => {

            container.scrollBy({
                left: -260,
                behavior: "smooth"
            });

        }
    );


    setaDir?.addEventListener(
        "click",
        () => {

            container.scrollBy({
                left: 260,
                behavior: "smooth"
            });

        }
    );


    container.addEventListener(
        "scroll",
        atualizarSetas
    );


    window.addEventListener(
        "resize",
        atualizarSetas
    );


    atualizarSetas();

}


// =====================================================
// ABRIR PASTA
// =====================================================
// =====================================================
// ÁLBUNS (sub-categorias dentro de uma pasta) — genérico,
// funciona pra qualquer pasta cujas fotos tenham o campo
// "album" preenchido com mais de um valor diferente
// =====================================================

function obterAlbunsDaPasta(fotos) {

    const vistos = new Set();
    const albuns = [];

    fotos.forEach((foto) => {

        const album =
            (foto.album || "").trim();

        if (album && !vistos.has(album)) {
            vistos.add(album);
            albuns.push(album);
        }

    });

    return albuns.sort();

}


function criarFiltroAlbuns(albuns, todasFotos, lista, pasta) {

    const filtro =
        document.createElement("div");

    filtro.className =
        "galeria-filtro-albuns";

    albuns.forEach((album) => {

        const botao =
            document.createElement("button");

        botao.type = "button";
        botao.className = "galeria-filtro-album";
        botao.textContent = album;
        botao.dataset.album = album;

        filtro.appendChild(botao);

    });

    filtro.addEventListener("click", (evento) => {

        const botao =
            evento.target.closest(".galeria-filtro-album");

        if (!botao) return;

        filtro
            .querySelectorAll(".galeria-filtro-album")
            .forEach((b) => b.classList.remove("ativo"));

        botao.classList.add("ativo");

        const albumEscolhido =
            botao.dataset.album;

        const fotosFiltradas =
            todasFotos.filter(
                (foto) => (foto.album || "").trim() === albumEscolhido
            );

        fotosDaPastaAberta = fotosFiltradas;

        renderizarFotosGaleria(fotosFiltradas, lista, pasta, false);

    });

    return filtro;

}


function desenharFotosGaleria(fotos, lista, pasta, mostrarSeloAlbum) {

    lista.innerHTML = "";

    if (!fotos.length) {

        lista.innerHTML = `
            <p class="galeria-vazio">
                Nenhuma foto aqui ainda.
            </p>
        `;

        return;

    }
    // só separa por mês quando as fotos cobrem mais de um mês
    const mesDe = (foto) => String(foto.data || "").slice(0, 7);

    // mostra o mês sempre que as fotos tiverem data
    const separarPorMes =
        new Set(fotos.map(mesDe).filter(Boolean)).size >= 1;

    let mesAnterior = null;

    fotos.forEach((foto, indice) => {
        const mes = mesDe(foto);

        if (separarPorMes && mes && mes !== mesAnterior) {

            const quantidade =
                fotos.filter((f) => mesDe(f) === mes).length;

            lista.appendChild(criarDivisorMes(mes, quantidade, indice));

            mesAnterior = mes;

        }
        
        const item =
            document.createElement("div");

        item.className =
            "galeria-foto-item";

        item.style.setProperty(
            "--delay",
            `${indice * 0.08}s`
        );

        const ehVideo =
            ehVideoGaleria(foto.imagem);

        item.innerHTML = `

            <div class="galeria-foto-thumb">

                ${
                    ehVideo
                        ? `
                            <video
                                class="galeria-video-thumb"
                                src="${urlImagemGaleria(foto.imagem)}"
                                muted
                                preload="metadata"
                                playsinline
                            ></video>
                            <span class="galeria-video-play-badge">▶</span>
                        `
                        : `
                            <img
                                src="${urlImagemGaleria(foto.imagem)}"
                                alt="${pasta.nome || ""}"
                                onerror="this.parentElement.remove()"
                            >
                        `
                }

            </div>

            <span class="galeria-foto-data">
                ${formatarData(foto.data)}
            </span>

        `;

        item.addEventListener(
            "click",
            () => abrirVisualizador(indice)
        );

        lista.appendChild(item);

    });

}

// separador de mês: "Agosto 2025 · 12 ———"
function criarDivisorMes(chave, quantidade, indice) {

    const [ano, mes] = chave.split("-");

    const nome =
        new Date(Number(ano), Number(mes) - 1, 1)
            .toLocaleDateString("pt-BR", { month: "long" });

    const div =
        document.createElement("div");

    div.className = "galeria-mes-divisor";

    div.style.setProperty("--delay", `${indice * 0.08}s`);

    div.innerHTML = `
        <span class="galeria-mes-nome">${nome.charAt(0).toUpperCase() + nome.slice(1)}</span>
        <span class="galeria-mes-ano">${ano}</span>
        <span class="galeria-mes-qtd">${quantidade}</span>
    `;

    return div;

}

// =====================================================
// FILTRO DE JOGO dentro da pasta (ex.: Roblox → Murder Mystery 2...)
// Aparece sozinho quando alguma foto tem jogo preenchido no admin.
// =====================================================

function jogoDaFoto(foto) {
    return String(foto.plataforma || "").trim();
}

let galeriaJogosEventos = false;

function fecharMenusJogos() {

    document.querySelectorAll(".galeria-jogos-menu.aberto").forEach((menu) => {

        menu.classList.remove("aberto");

        menu.querySelector(".galeria-jogos-btn")
            ?.setAttribute("aria-expanded", "false");

    });

}

const JOGO_LEGADO = 900;

// a ordem escolhida no admin vem escondida no nome ("02|MM2")
function nomeDoJogo(valor) {
    return String(valor || "").replace(/^\d{1,4}\|/, "").trim();
}

function ordemDoJogo(valor) {
    const m = String(valor || "").match(/^(\d{1,4})\|/);
    return m ? Number(m[1]) : JOGO_LEGADO;
}

// botão ☰ ao lado do ícone da pasta, com os filtros por jogo dentro
function montarFiltroJogos(fotos, lista, pasta) {

    const titulo = document.getElementById("galeria-pasta-titulo");

    if (!titulo) return;

    titulo.querySelector(".galeria-jogos-menu")?.remove();

    // limpeza da versão antiga (barra de texto solto)
    document.querySelector("#galeria-fotos .galeria-filtro-jogos")?.remove();

    // o Perfil tem layout próprio
    if (ehPastaDePerfis(pasta)) return;

    // nome do filtro → quantas fotos e qual a ordem
    const grupos = new Map();

    fotos.forEach((foto) => {

        const bruto = jogoDaFoto(foto);
        const nome = nomeDoJogo(bruto);

        if (!nome) return;

        const ordem = ordemDoJogo(bruto);
        const atual = grupos.get(nome);

        if (atual) {
            atual.qtd++;
            atual.ordem = Math.min(atual.ordem, ordem);
        } else {
            grupos.set(nome, { qtd: 1, ordem });
        }

    });

    // pasta sem nenhum jogo preenchido: não mostra nada
    if (!grupos.size) return;

    const jogos = [...grupos.entries()].sort((a, b) =>
        (a[1].ordem - b[1].ordem) || a[0].localeCompare(b[0], "pt-BR")
    );

    const opcoes = [
        { jogo: "", rotulo: "Todos", qtd: fotos.length, todos: true },
        ...jogos.map(([nome, g]) => ({ jogo: nome, rotulo: nome, qtd: g.qtd, todos: false }))
    ];

    const caixa = document.createElement("span");

    caixa.className = "galeria-jogos-menu";

    caixa.innerHTML = `

        <button type="button" class="galeria-jogos-btn" aria-label="Filtrar por jogo" aria-haspopup="true" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path class="gj-l1" d="M4 7h16"/>
                <path class="gj-l2" d="M4 12h16"/>
                <path class="gj-l3" d="M4 17h16"/>
            </svg>
            <span class="galeria-jogos-ponto"></span>
        </button>

        <span class="galeria-jogos-chip" hidden></span>

        <div class="galeria-jogos-painel" role="menu">

            <p class="galeria-jogos-titulo">Filtrar por jogo</p>

            ${opcoes.map((o, i) => `
                <button type="button"
                        class="galeria-jogos-opcao ${o.todos ? "galeria-jogos-todos" : ""} ${i === 0 ? "ativa" : ""}"
                        data-i="${i}" style="--n:${i}" role="menuitemradio" aria-checked="${i === 0}">
                    <span></span><small>${o.qtd}</small>
                </button>
            `).join("")}

        </div>

    `;

    // o nome entra como texto (sem risco de quebrar o HTML)
    caixa.querySelectorAll(".galeria-jogos-opcao").forEach((b, i) => {
        b.firstElementChild.textContent = opcoes[i].rotulo;
    });

    const botao = caixa.querySelector(".galeria-jogos-btn");
    const chip = caixa.querySelector(".galeria-jogos-chip");
    const painel = caixa.querySelector(".galeria-jogos-painel");

    botao.addEventListener("click", () => {

        const abrir = !caixa.classList.contains("aberto");

        fecharMenusJogos();

        caixa.classList.toggle("aberto", abrir);

        botao.setAttribute("aria-expanded", String(abrir));

    });

    painel.addEventListener("click", (evento) => {

        const opcao = evento.target.closest("[data-i]");

        if (!opcao) return;

        const escolhida = opcoes[Number(opcao.dataset.i)];

        painel.querySelectorAll(".galeria-jogos-opcao").forEach((b) => {

            const ativa = b === opcao;

            b.classList.toggle("ativa", ativa);
            b.setAttribute("aria-checked", String(ativa));

        });

        botao.classList.toggle("filtrando", Boolean(escolhida.jogo));

        chip.hidden = !escolhida.jogo;
        chip.textContent = escolhida.jogo ? escolhida.rotulo : "";

        const subconjunto = escolhida.jogo
            ? fotos.filter((foto) => nomeDoJogo(jogoDaFoto(foto)) === escolhida.jogo)
            : fotos;

        // o visualizador passa a andar só pelas fotos filtradas
        fotosDaPastaAberta = subconjunto;

        desenharFotosGaleria(subconjunto, lista, pasta, false);

        fecharMenusJogos();

    });

    titulo.appendChild(caixa);

    // tocar fora (ou Esc) fecha — registrado uma vez só
    if (!galeriaJogosEventos) {

        galeriaJogosEventos = true;

        document.addEventListener("click", (evento) => {

            if (evento.target.closest(".galeria-jogos-menu")) return;

            fecharMenusJogos();

        });

        document.addEventListener("keydown", (evento) => {

            if (evento.key === "Escape") fecharMenusJogos();

        });

    }

}

function renderizarFotosGaleria(fotos, lista, pasta, mostrarSeloAlbum) {

    montarFiltroJogos(fotos, lista, pasta);

    desenharFotosGaleria(fotos, lista, pasta, mostrarSeloAlbum);

}

function abrirPasta(pasta) {

    // Sempre reinicia a rolagem no topo da seção,
    // independente de onde a pessoa estava rolada antes.
    const viewGaleria =
        document.querySelector(
            '.view[data-view="galeria"]'
        );

    if (viewGaleria) {
        viewGaleria.scrollTop = 0;
    }

    const pastas =
        document.getElementById(
            "galeria-pastas"
        );

    const titulo =
        document.getElementById(
            "galeria-pasta-titulo"
        );

    const lista =
        document.getElementById(
            "galeria-fotos-lista"
        );

    const containerFotos =
        document.getElementById(
            "galeria-fotos"
        );


    if (!pastas || !titulo || !lista || !containerFotos) {
        return;
    }


    pastas.classList.add(
        "galeria-pastas-recolhida"
    );


    // Remove decoração de fundo de uma abertura anterior, se existir
    containerFotos
        .querySelector(".perfil-fundo-decoracoes")
        ?.remove();

            // tira o filtro de jogo da pasta anterior
    containerFotos
        .querySelector(".galeria-filtro-jogos")
        ?.remove();

            titulo.classList.remove("galeria-pasta-titulo-icone");


    if (ehPastaDePerfis(pasta)) {

        titulo.innerHTML = `
            <img
                src="assets/images/perfil-decoracoes/envelope-coracao.png"
                alt=""
                class="perfil-titulo-icone"
            >
            Nossos Perfis
            <span class="perfil-subtitulo">Perfis combinando</span>
        `;

        // Decoração de fundo espalhada: coraçõezinhos e brilhos
        // flutuando bem sutilmente atrás de tudo, cobrindo a área
        // inteira da seção de Perfis (título + cards).
        const decoracoesFundo =
            document.createElement("div");

        decoracoesFundo.className =
            "perfil-fundo-decoracoes";

        decoracoesFundo.setAttribute(
            "aria-hidden",
            "true"
        );

        decoracoesFundo.innerHTML = `
            <img src="assets/images/perfil-decoracoes/coracao-raios.png" alt="" style="--px: 8%; --py: 10%; --pdelay: 0s; --pduracao: 9s;">
            <img src="assets/images/perfil-decoracoes/brilhos-cluster.png" alt="" style="--px: 88%; --py: 6%; --pdelay: 1.4s; --pduracao: 11s;">
            <img src="assets/images/perfil-decoracoes/coracao-raios.png" alt="" style="--px: 92%; --py: 55%; --pdelay: 2.8s; --pduracao: 10s;">
            <img src="assets/images/perfil-decoracoes/brilhos-cluster.png" alt="" style="--px: 4%; --py: 60%; --pdelay: 0.6s; --pduracao: 8.5s;">
            <img src="assets/images/perfil-decoracoes/coracao-raios.png" alt="" style="--px: 50%; --py: 92%; --pdelay: 2s; --pduracao: 9.5s;">
        `;

        containerFotos.insertBefore(
            decoracoesFundo,
            containerFotos.firstChild
        );

    }

    else {

        const icone = ICONES_PASTA[(pasta.nome || "").trim().toLowerCase()];

        if (icone) {

            titulo.textContent = "";
            titulo.classList.add("galeria-pasta-titulo-icone");

            const img = document.createElement("img");

            img.className = "galeria-pasta-icone galeria-pasta-icone-" + (pasta.nome || "").trim().toLowerCase();
            img.src = icone;
            img.alt = pasta.nome || "";

            // se o arquivo não existir, volta pro título em texto
            img.addEventListener("error", () => {
                titulo.classList.remove("galeria-pasta-titulo-icone");
                img.remove();
            });

            const nome = document.createElement("span");

            nome.className = "galeria-pasta-icone-nome";
            nome.textContent = pasta.nome || "";

            titulo.append(img, nome);

        } else {

            titulo.textContent = pasta.nome || "";

        }

    }


    lista.innerHTML = "";

    lista.classList.remove(
        "galeria-perfis-vista"
    );


    const fotos =
        (pasta.fotos || [])
            .slice()
            .sort(
                (a, b) =>
                    new Date(a.data) -
                    new Date(b.data)
            );


    fotosDaPastaAberta =
        fotos;


    nomeDaPastaAberta =
        pasta.nome || "";


    if (!fotos.length) {

        lista.innerHTML =
            `
                <p class="galeria-vazio">
                    Nenhuma foto nesta pasta ainda.
                </p>
            `;

    }

    else if (ehPastaDePerfis(pasta)) {

        // Layout especial: agrupado por plataforma, com moldura temática.
        renderizarPerfis(fotos, lista);

    }

    else {

        const albuns =
            obterAlbunsDaPasta(fotos);

        containerFotos
            .querySelector(".galeria-filtro-albuns")
            ?.remove();

        if (albuns.length > 0) {

            const filtro =
                criarFiltroAlbuns(albuns, fotos, lista, pasta);

            containerFotos.insertBefore(
                filtro,
                lista
            );

            const fotosSemAlbum =
                fotos.filter(
                    (foto) => !(foto.album || "").trim()
                );

            if (fotosSemAlbum.length > 0) {

                fotosDaPastaAberta =
                    fotosSemAlbum;

                renderizarFotosGaleria(
                    fotosSemAlbum,
                    lista,
                    pasta,
                    false
                );

            } else {

                // Não há fotos soltas — já abre direto no
                // primeiro álbum, em vez de mostrar tela vazia.
                const primeiroAlbum =
                    albuns[0];

                const botaoPrimeiroAlbum =
                    filtro.querySelector(
                        `[data-album="${primeiroAlbum}"]`
                    );

                botaoPrimeiroAlbum
                    ?.classList.add("ativo");

                const fotosDoPrimeiroAlbum =
                    fotos.filter(
                        (foto) => (foto.album || "").trim() === primeiroAlbum
                    );

                fotosDaPastaAberta =
                    fotosDoPrimeiroAlbum;

                renderizarFotosGaleria(
                    fotosDoPrimeiroAlbum,
                    lista,
                    pasta,
                    false
                );

            }

        } else {

            renderizarFotosGaleria(
                fotos,
                lista,
                pasta,
                false
            );

        }

    }


    containerFotos.classList.toggle(
        "galeria-fotos-perfil-fundo",
        ehPastaDePerfis(pasta)
    );


    containerFotos.classList.remove(
        "oculto"
    );


    containerFotos.classList.remove(
        "galeria-fotos-entrando"
    );


    void containerFotos.offsetWidth;


    containerFotos.classList.add(
        "galeria-fotos-entrando"
    );


    const rect =
        containerFotos.getBoundingClientRect();


    if (
        typeof criarExplosaoCoracoesArea ===
        "function"
    ) {

        criarExplosaoCoracoesArea(
            rect.left + rect.width / 2,
            rect.top,
            rect.width * 0.6
        );

    }


    containerFotos.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// =====================================================
// VISUALIZADOR
// =====================================================

function garantirVisualizador() {

    if (
        document.getElementById(
            "foto-visualizador"
        )
    ) {
        return;
    }


    const div =
        document.createElement("div");


    div.id =
        "foto-visualizador";


    div.className =
        "foto-visualizador oculto";


    div.innerHTML = `

        <button
            id="foto-viz-fechar"
            class="foto-visualizador-fechar"
            aria-label="Fechar"
        >
            ✕
        </button>


        <button
            id="foto-viz-anterior"
            class="foto-visualizador-seta foto-visualizador-seta-esquerda"
            aria-label="Anterior"
        >
            ←
        </button>


        <button
            id="foto-viz-proxima"
            class="foto-visualizador-seta foto-visualizador-seta-direita"
            aria-label="Próxima"
        >
            →
        </button>


        <div class="foto-visualizador-conteudo">

            <img
                id="foto-viz-img"
                class="foto-visualizador-img"
                src=""
                alt=""
            >

            <video
                id="foto-viz-video"
                class="foto-visualizador-img foto-visualizador-video oculto"
                controls
                preload="metadata"
                playsinline
            ></video>

            <div class="foto-visualizador-legenda">

                <span
                    id="foto-viz-pasta"
                    class="foto-visualizador-pasta"
                ></span>


                <div
                    id="foto-viz-data"
                    class="foto-visualizador-data"
                ></div>


                <p
                    id="foto-viz-descricao"
                    class="foto-visualizador-descricao"
                ></p>


                <span
                    id="foto-viz-contagem"
                    class="foto-visualizador-contagem"
                ></span>

            </div>

        </div>

    `;


    document.body.appendChild(div);

        ativarGestosVisualizador();


    document
        .getElementById("foto-viz-fechar")
        .addEventListener(
            "click",
            fecharVisualizador
        );


    div.addEventListener(
        "click",
        (event) => {

            if (
                event.target === div
            ) {

                fecharVisualizador();

            }

        }
    );


    document
        .getElementById("foto-viz-anterior")
        .addEventListener(
            "click",
            () => navegarVisualizador(-1)
        );


    document
        .getElementById("foto-viz-proxima")
        .addEventListener(
            "click",
            () => navegarVisualizador(1)
        );


    document.addEventListener(
        "keydown",
        (event) => {

            const viz =
                document.getElementById(
                    "foto-visualizador"
                );


            if (
                !viz ||
                viz.classList.contains("oculto")
            ) {
                return;
            }


            if (
                event.key === "Escape"
            ) {

                fecharVisualizador();

            }


            if (
                event.key === "ArrowLeft"
            ) {

                navegarVisualizador(-1);

            }


            if (
                event.key === "ArrowRight"
            ) {

                navegarVisualizador(1);

            }

        }
    );

}


// =====================================================
// ABRIR VISUALIZADOR
// =====================================================

function abrirVisualizador(indice) {

    garantirVisualizador();


    indiceFotoAberta =
        indice;


    atualizarVisualizador();


    document
        .getElementById(
            "foto-visualizador"
        )
        .classList.remove(
            "oculto"
        );


    document.body.classList.add(
        "modal-aberto"
    );

}


// =====================================================
// FECHAR VISUALIZADOR
// =====================================================

function fecharVisualizador() {

    const video =
        document.getElementById("foto-viz-video");

    if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
    }

    document
        .getElementById("foto-visualizador")
        ?.classList.add("oculto");


    document.body.classList.remove("modal-aberto");

}


// =====================================================
// NAVEGAR
// =====================================================

function navegarVisualizador(direcao) {

    if (
        !fotosDaPastaAberta.length
    ) {
        return;
    }


    indiceFotoAberta =
        (
            indiceFotoAberta +
            direcao +
            fotosDaPastaAberta.length
        ) %
        fotosDaPastaAberta.length;


    atualizarVisualizador();

}


// =====================================================
// ATUALIZAR VISUALIZADOR
// =====================================================

function atualizarVisualizador() {

    const foto =
        fotosDaPastaAberta[
            indiceFotoAberta
        ];


    if (!foto) return;

        resetarZoom();


    const imagem =
        document.getElementById("foto-viz-img");

    const video =
        document.getElementById("foto-viz-video");

    const ehVideo =
        ehVideoGaleria(foto.imagem);


    // Sempre para e limpa o vídeo anterior antes de trocar —
    // evita ele continuar tocando/baixando em segundo plano
    if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
    }


    if (ehVideo) {

        imagem?.classList.add("oculto");
        video?.classList.remove("oculto");

        if (video) {
            // Só define o src agora (na abertura) — o download real
            // só começa quando a pessoa apertar o play do player
            video.src = urlImagemGaleria(foto.imagem);
        }

    } else {

        video?.classList.add("oculto");
        imagem?.classList.remove("oculto");

        if (imagem) {
            imagem.src = urlImagemGaleria(foto.imagem);
        }

    }


    const pasta =
        document.getElementById("foto-viz-pasta");

    const data =
        document.getElementById("foto-viz-data");


    if (pasta) {
        pasta.textContent = nomeDaPastaAberta;
    }


    if (data) {
        data.textContent = formatarData(foto.data);
    }


    const contagem =
        document.getElementById("foto-viz-contagem");


    if (contagem) {

        contagem.textContent =
            fotosDaPastaAberta.length > 1
                ? `${indiceFotoAberta + 1} / ${fotosDaPastaAberta.length}`
                : "";

    }


    const descricao =
        document.getElementById("foto-viz-descricao");


    if (descricao) {

        if (foto.descricao) {

            descricao.textContent = foto.descricao;
            descricao.style.display = "block";

        } else {

            descricao.style.display = "none";

        }

    }

}


// =====================================================
// FORMATAR DATA
// =====================================================

function formatarData(dataString) {

    if (!dataString) {
        return "";
    }


    const data =
        new Date(
            dataString + "T00:00:00"
        );


    return data.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );

}


// =====================================================
// BOTÃO VOLTAR AO TOPO
// =====================================================

function ativarBotaoTopo() {

    const botao =
        document.getElementById(
            "galeria-topo-btn"
        );


    const view =
        document.querySelector(
            '.view[data-view="galeria"]'
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
function ehVideoGaleria(caminho) {
    return /\.(mp4|webm|mov|ogg)$/i.test(caminho || "");
}
function resetarGaleria() {
    const pastas = document.getElementById("galeria-pastas");
    const containerFotos = document.getElementById("galeria-fotos");

        document.querySelectorAll(".galeria-pasta-aberta").forEach(c => c.classList.remove("galeria-pasta-aberta"));

    pastas?.classList.remove("galeria-pastas-recolhida");
    containerFotos?.classList.add("oculto");
    containerFotos?.classList.remove("galeria-fotos-entrando");
}
    document.querySelectorAll(".galeria-pasta-aberta").forEach(c => c.classList.remove("galeria-pasta-aberta"));
window.addEventListener("hashchange", () => {
    if (window.location.hash !== "#galeria") {
        resetarGaleria();
    }
});

// =====================================================
// INICIALIZAÇÃO
// =====================================================
// =====================================================
// ZOOM E GESTOS NO VISUALIZADOR
// =====================================================

const ZOOM_MAX = 5;

const zoomEstado = { escala: 1, x: 0, y: 0 };

function imagemDoVisualizador() {
    return document.getElementById("foto-viz-img");
}

function aplicarZoom() {

    const img = imagemDoVisualizador();

    if (!img) return;

    img.style.transform =
        `translate(${zoomEstado.x}px, ${zoomEstado.y}px) scale(${zoomEstado.escala})`;

    img.classList.toggle("com-zoom", zoomEstado.escala > 1);

    document
        .getElementById("foto-visualizador")
        ?.classList.toggle("viz-zoom", zoomEstado.escala > 1);

}

function resetarZoom() {

    zoomEstado.escala = 1;
    zoomEstado.x = 0;
    zoomEstado.y = 0;

    aplicarZoom();

}

// não deixa a foto sair da tela nem o zoom passar do limite
function limitarZoom() {

    const img = imagemDoVisualizador();

    zoomEstado.escala = Math.min(ZOOM_MAX, Math.max(1, zoomEstado.escala));

    if (!img || zoomEstado.escala === 1) {
        zoomEstado.x = 0;
        zoomEstado.y = 0;
        return;
    }

    const maxX = (img.clientWidth * (zoomEstado.escala - 1)) / 2;
    const maxY = (img.clientHeight * (zoomEstado.escala - 1)) / 2;

    zoomEstado.x = Math.min(maxX, Math.max(-maxX, zoomEstado.x));
    zoomEstado.y = Math.min(maxY, Math.max(-maxY, zoomEstado.y));

}

// muda o zoom mantendo o ponto tocado parado debaixo do dedo/mouse
function zoomarEm(novaEscala, clientX, clientY) {

    const img = imagemDoVisualizador();

    if (!img) return;

    novaEscala = Math.min(ZOOM_MAX, Math.max(1, novaEscala));

    const caixa = img.getBoundingClientRect();

    const centroX = caixa.left + caixa.width / 2 - zoomEstado.x;
    const centroY = caixa.top + caixa.height / 2 - zoomEstado.y;

    const dx = clientX - centroX;
    const dy = clientY - centroY;

    const razao = novaEscala / zoomEstado.escala;

    zoomEstado.x = dx - razao * (dx - zoomEstado.x);
    zoomEstado.y = dy - razao * (dy - zoomEstado.y);
    zoomEstado.escala = novaEscala;

    limitarZoom();
    aplicarZoom();

}

function ativarGestosVisualizador() {

    const viz = document.getElementById("foto-visualizador");

    if (!viz || viz.dataset.gestos) return;

    viz.dataset.gestos = "1";

    const ponteiros = new Map();

    let inicio = null;
    let ultimaDistancia = 0;
    let ultimoMeio = { x: 0, y: 0 };
    let moveu = false;
    let ultimoToque = { t: 0, x: 0, y: 0 };
    let bloqueioAte = 0;

    // evita o navegador "arrastar" a imagem como arquivo
    viz.addEventListener("dragstart", evento => evento.preventDefault());

    viz.addEventListener("pointerdown", evento => {

        if (evento.target.closest("button, video")) return;
        if (evento.pointerType === "mouse" && evento.button !== 0) return;

        if (!ponteiros.size) moveu = false;

        ponteiros.set(evento.pointerId, {
            x: evento.clientX,
            y: evento.clientY,
            ox: evento.clientX,
            oy: evento.clientY
        });

        viz.classList.add("viz-gesto");

        if (ponteiros.size === 1) {

            const img = imagemDoVisualizador();

            inicio = {
                x: evento.clientX,
                y: evento.clientY,
                t: Date.now(),
                naImagem: evento.target === img && !img.classList.contains("oculto")
            };

        } else if (ponteiros.size === 2) {

            const [a, b] = [...ponteiros.values()];

            ultimaDistancia = Math.hypot(a.x - b.x, a.y - b.y);
            ultimoMeio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

            inicio = null;
            moveu = true;

        }

    });

    viz.addEventListener("pointermove", evento => {

        const anterior = ponteiros.get(evento.pointerId);

        if (!anterior) return;

        const atual = { ...anterior, x: evento.clientX, y: evento.clientY };

        ponteiros.set(evento.pointerId, atual);

        // dois dedos: pinça (zoom) e arrasto junto
        if (ponteiros.size === 2) {

            const [a, b] = [...ponteiros.values()];

            const distancia = Math.hypot(a.x - b.x, a.y - b.y);
            const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

            if (ultimaDistancia) {

                zoomarEm(zoomEstado.escala * (distancia / ultimaDistancia), meio.x, meio.y);

                zoomEstado.x += meio.x - ultimoMeio.x;
                zoomEstado.y += meio.y - ultimoMeio.y;

                limitarZoom();
                aplicarZoom();

            }

            ultimaDistancia = distancia;
            ultimoMeio = meio;

            return;

        }

        if (Math.hypot(atual.x - atual.ox, atual.y - atual.oy) > 6) moveu = true;

        // um dedo com zoom: arrasta a foto
        if (zoomEstado.escala > 1) {

            zoomEstado.x += atual.x - anterior.x;
            zoomEstado.y += atual.y - anterior.y;

            limitarZoom();
            aplicarZoom();

        }

    });

    const terminar = evento => {

        if (!ponteiros.has(evento.pointerId)) return;

        ponteiros.delete(evento.pointerId);

        if (ponteiros.size === 1) ultimaDistancia = 0;

        if (ponteiros.size > 0) return;

        viz.classList.remove("viz-gesto");

        // depois de arrastar, o "clique" que o navegador dispara não pode fechar o visualizador
        bloqueioAte = moveu ? Date.now() + 150 : 0;

        if (evento.type === "pointercancel" || !inicio) {
            inicio = null;
            return;
        }

        const dx = evento.clientX - inicio.x;
        const dy = evento.clientY - inicio.y;
        const rapido = Date.now() - inicio.t < 700;

        // deslizar para o lado troca de foto (só sem zoom)
        if (
            zoomEstado.escala === 1 &&
            rapido &&
            Math.abs(dx) > 50 &&
            Math.abs(dx) > Math.abs(dy) * 1.4
        ) {

            navegarVisualizador(dx < 0 ? 1 : -1);

            inicio = null;

            return;

        }

        // toque duplo na foto: amplia / volta
        if (!moveu && inicio.naImagem) {

            const agora = Date.now();

            const perto =
                Math.hypot(evento.clientX - ultimoToque.x, evento.clientY - ultimoToque.y) < 40;

            if (agora - ultimoToque.t < 320 && perto) {

                zoomarEm(zoomEstado.escala > 1 ? 1 : 2.5, evento.clientX, evento.clientY);

                ultimoToque = { t: 0, x: 0, y: 0 };

            } else {

                ultimoToque = { t: agora, x: evento.clientX, y: evento.clientY };

            }

        }

        inicio = null;

    };

    viz.addEventListener("pointerup", terminar);
    viz.addEventListener("pointercancel", terminar);

    document.addEventListener("click", evento => {

        if (Date.now() < bloqueioAte) {
            evento.stopImmediatePropagation();
            evento.preventDefault();
        }

    }, true);

    // rodinha do mouse (e pinça do touchpad)
    viz.addEventListener("wheel", evento => {

        const img = imagemDoVisualizador();

        if (!img || img.classList.contains("oculto")) return;

        evento.preventDefault();

        zoomarEm(
            zoomEstado.escala * (evento.deltaY < 0 ? 1.2 : 1 / 1.2),
            evento.clientX,
            evento.clientY
        );

    }, { passive: false });

    // teclado: + aproxima, - afasta, 0 volta
    document.addEventListener("keydown", evento => {

        if (viz.classList.contains("oculto")) return;

        const img = imagemDoVisualizador();

        if (!img || img.classList.contains("oculto")) return;

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        if (evento.key === "+" || evento.key === "=") zoomarEm(zoomEstado.escala * 1.4, cx, cy);
        if (evento.key === "-") zoomarEm(zoomEstado.escala / 1.4, cx, cy);
        if (evento.key === "0") resetarZoom();

    });

}
carregarGaleria();

ativarBotaoTopo();