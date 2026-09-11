// =====================================================
// GALERIA — SITE PRINCIPAL
// =====================================================

let pastasCarregadas = [];
let fotosDaPastaAberta = [];
let indiceFotoAberta = 0;
let nomeDaPastaAberta = "";

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
    discord: { label: "Discord", emoji: "💬", frase: "Nosso cantinho", categoria: "redes" },
    tiktok: { label: "TikTok", emoji: "🎵", frase: "Onde a gente perde horas", categoria: "redes" },
    instagram: { label: "Instagram", emoji: "📸", frase: "Onde a gente compartilha", categoria: "redes" },
    roblox: { label: "Roblox", emoji: "🎮", frase: "Nosso lugar de brincar", categoria: "jogos" },
    genshin: { label: "Genshin Impact", emoji: "✨", frase: "Nossa aventura em Teyvat", categoria: "jogos" }
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

    // Agrupa as fotos por plataforma
    const grupos = {};

    fotos.forEach((foto) => {
        const chave =
            (foto.plataforma || "outro").toLowerCase();

        if (!grupos[chave]) grupos[chave] = [];

        grupos[chave].push(foto);
    });

    // Plataformas conhecidas primeiro (na ordem definida acima),
    // qualquer outra plataforma não mapeada vem depois.
    const ordemChaves = [
        ...Object.keys(PLATAFORMAS_PERFIL).filter((c) => grupos[c]),
        ...Object.keys(grupos).filter((c) => !PLATAFORMAS_PERFIL[c])
    ];


    // ====================================
    // TÍTULO SEPARADO (estilo Cartas) + FAIXA DE MÍDIA
    // compacta com 1 ou 2 fotos lado a lado (a sua + a dela),
    // separadas por uma linha fina no meio.
    // ====================================

    ordemChaves.forEach((chave, indiceSecao) => {

        const info =
            PLATAFORMAS_PERFIL[chave] || {
                label: chave === "outro" ? "Outros" : chave,
                emoji: "📌",
                categoria: "outros"
            };

        const fotosDoGrupo =
            grupos[chave];

        const secao =
            document.createElement("div");

        secao.className =
            "perfil-secao";

        secao.style.setProperty(
            "--delay",
            `${indiceSecao * 0.15}s`
        );

        // Mostra até 2 fotos lado a lado (a sua + a dela). Se um
        // dia tiver mais que 2 pra mesma plataforma, ainda dá pra
        // ver todas clicando — o clique abre o carrossel completo.
        const fotosVisiveis =
            fotosDoGrupo.slice(0, 2);

        const midiaHtml =
            fotosVisiveis
                .map((foto, indiceFoto) => {

                    return `
                        <div class="perfil-secao-foto" data-indice="${indiceFoto}">
                            <img
                                src="${urlImagemGaleria(foto.imagem)}"
                                alt=""
                                onerror="this.closest('.perfil-secao-foto').remove()"
                            >
                        </div>
                    `;

                })
                .join("");

        // O coraçãozinho-prendedor só aparece quando tem 2 fotos —
        // flutua centralizado entre as duas, como se as "prendesse".
        const clipeCoracaoHtml =
            fotosVisiveis.length === 2
                ? `
                    <img
                        class="perfil-decoracao-clipe-coracao"
                        src="assets/images/perfil-decoracoes/clipe-coracao.png"
                        alt=""
                    >
                `
                : "";

        // Alterna os enfeites de canto pra não ficar tudo igual —
        // clipe rosa/roxo no topo, flor/coração fino embaixo.
        const clipeCanto =
            indiceSecao % 2 === 0
                ? "clipe-rosa.png"
                : "clipe-roxo.png";

        const enfeiteCanto =
            indiceSecao % 2 === 0
                ? "flor-galho.png"
                : "coracao-fino.png";

        secao.innerHTML = `

            <div class="perfil-secao-cabecalho">
                <span class="perfil-secao-emoji">${info.emoji}</span>
                <h3 class="perfil-secao-titulo">${info.label}</h3>
            </div>

            <div class="perfil-secao-midia-wrapper">

                <div class="perfil-secao-midia perfil-secao-midia-${chave}">

                    <img
                        class="perfil-decoracao-clipe"
                        src="assets/images/perfil-decoracoes/${clipeCanto}"
                        alt=""
                    >

                    ${midiaHtml}
                    ${clipeCoracaoHtml}

                    <img
                        class="perfil-decoracao-canto"
                        src="assets/images/perfil-decoracoes/${enfeiteCanto}"
                        alt=""
                    >

                </div>

            </div>

        `;

        // Clique em qualquer foto abre o carrossel completo daquela
        // plataforma (mesmo que existam mais de 2 fotos no total).
        secao
            .querySelectorAll(".perfil-secao-foto")
            .forEach((elemento) => {

                elemento.addEventListener(
                    "click",
                    () => {

                        fotosDaPastaAberta =
                            fotosDoGrupo;

                        abrirVisualizador(
                            Number(elemento.dataset.indice)
                        );

                    }
                );

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
        (pasta) => {

            containerPastas.appendChild(
                criarCardPasta(pasta)
            );

        }
    );


    configurarCarrossel();

}


// =====================================================
// CRIAR CARD DA PASTA
// =====================================================

function criarCardPasta(pasta) {

    const card =
        document.createElement("div");

    card.className =
        "galeria-pasta-card";


    const quantidade =
        pasta.fotos
            ? pasta.fotos.length
            : 0;


    card.innerHTML = `

        <div class="galeria-pasta-capa">

            <img
                src="${urlImagemGaleria(pasta.capa)}"
                alt="${pasta.nome || ""}"
                onerror="this.remove()"
            >

        </div>

        <span class="galeria-pasta-nome">
            📁 ${pasta.nome || ""}
        </span>

        <span class="galeria-pasta-quantidade">
            ${quantidade}
            ${quantidade === 1 ? "foto" : "fotos"}
        </span>

    `;


    card.addEventListener(
        "click",
        () => abrirPasta(pasta)
    );


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


    if (ehPastaDePerfis(pasta)) {

        titulo.innerHTML = `
            <img
                src="assets/images/perfil-decoracoes/envelope-coracao.png"
                alt=""
                class="perfil-titulo-icone"
            >
            Nossos Perfis
            <span class="perfil-subtitulo">Diferentes lugares, o mesmo nós.</span>
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

        titulo.textContent =
            pasta.nome || "";

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

        fotos.forEach(
            (foto, indice) => {

                const item =
                    document.createElement("div");


                item.className =
                    "galeria-foto-item";


                item.style.setProperty(
                    "--delay",
                    `${indice * 0.08}s`
                );


                item.innerHTML = `

                    <div class="galeria-foto-thumb">

                        <img
                            src="${urlImagemGaleria(foto.imagem)}"
                            alt="${pasta.nome || ""}"
                            onerror="this.parentElement.remove()"
                        >

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

            }
        );

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

    `;


    document.body.appendChild(div);


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

    document
        .getElementById(
            "foto-visualizador"
        )
        ?.classList.add(
            "oculto"
        );


    document.body.classList.remove(
        "modal-aberto"
    );

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


    const imagem =
        document.getElementById(
            "foto-viz-img"
        );


    const pasta =
        document.getElementById(
            "foto-viz-pasta"
        );


    const data =
        document.getElementById(
            "foto-viz-data"
        );


    if (imagem) {

        imagem.src =
            urlImagemGaleria(foto.imagem);

    }


    if (pasta) {

        pasta.textContent =
            nomeDaPastaAberta;

    }


 if (data) {

        data.textContent =
            formatarData(foto.data);

    }


    const contagem =
        document.getElementById(
            "foto-viz-contagem"
        );


    if (contagem) {

        contagem.textContent =
            fotosDaPastaAberta.length > 1
                ? `${indiceFotoAberta + 1} / ${fotosDaPastaAberta.length}`
                : "";

    }


    const descricao =
        document.getElementById(
            "foto-viz-descricao"
        );


    if (descricao) {

        if (foto.descricao) {

            descricao.textContent =
                foto.descricao;

            descricao.style.display =
                "block";

        }

        else {

            descricao.style.display =
                "none";

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


// =====================================================
// INICIALIZAÇÃO
// =====================================================

carregarGaleria();

ativarBotaoTopo();