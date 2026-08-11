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


    titulo.textContent =
        pasta.nome || "";


    lista.innerHTML = "";


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

            </div>

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