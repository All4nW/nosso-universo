// =====================================================
// NOSSO UNIVERSO — CÉU ESTRELADO
// =====================================================

let estrelasMemorias = [];
let estrelaSelecionada = null;


// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function carregarEstrelas() {

    const campo = document.getElementById("estrelas-campo");

    if (!campo) return;

    try {

        const resposta = await fetch(
            "assets/data/estrelas.json",
            { cache: "no-cache" }
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar estrelas.json.");
        }

        estrelasMemorias = await resposta.json();

    } catch (erro) {

        console.error(
            "Erro ao carregar estrelas:",
            erro
        );

        estrelasMemorias = [];

    }

    criarEstrelasMemorias(campo);
    configurarMemoria();
}


// =====================================================
// GRUPOS DE CONSTELAÇÃO
// Cada tipo pode ter mais de um "grupo" — cada grupo forma
// sua própria mini-constelação, numa área diferente da tela,
// sem se conectar aos outros grupos.
// =====================================================

const CONFIG_CONSTELACOES = {

    clara: [
        // Grupo A — 5 estrelas, canto superior esquerdo
        {
            centro: { x: 20, y: 24 },
            pontos: [
                { x: -11, y: -8  },
                { x:   1, y:  9  },
                { x:  11, y: -5  },
                { x:  21, y: 11  },
                { x:   7, y: 23  }
            ]
        },
        // Grupo B — 3 estrelas, lado direito, mais isoladas
        {
            centro: { x: 80, y: 58 },
            pontos: [
                { x: -13, y: -11 },
                { x:   0, y:   5 },
                { x:  12, y:  -5 }
            ]
        }
    ],

    vermelha: [
        // Grupo único — 4 estrelas (a que você já gostou)
        {
            centro: { x: 28, y: 78 },
            pontos: [
                { x: -14, y:  5 },
                { x:  -3, y: 18 },
                { x:  10, y:  8 },
                { x:  22, y: -14 }
            ]
        }
    ]

};


// Monta a lista final de posições (uma por memória),
// respeitando os grupos configurados acima.
function construirPosicoes(memorias) {

    const contadorPorTipo = {};

    return memorias.map((memoria) => {

        const tipo = memoria.tipo;

        contadorPorTipo[tipo] = contadorPorTipo[tipo] || 0;

        const indiceNoTipo = contadorPorTipo[tipo];

        contadorPorTipo[tipo]++;

        const grupos = CONFIG_CONSTELACOES[tipo] || [];

        let acumulado = 0;

        for (let g = 0; g < grupos.length; g++) {

            const grupo = grupos[g];

            if (indiceNoTipo < acumulado + grupo.pontos.length) {

                const local =
                    grupo.pontos[indiceNoTipo - acumulado];

                return {
                    x: grupo.centro.x + local.x,
                    y: grupo.centro.y + local.y,
                    grupo: `${tipo}-${g}`
                };

            }

            acumulado += grupo.pontos.length;

        }

        // Sobrou alguma estrela sem grupo configurado (ex: você
        // adicionou mais memórias do que posições previstas) —
        // cai numa posição genérica pra não quebrar nada.
        return {
            x: 50,
            y: 50,
            grupo: `${tipo}-extra`
        };

    });

}


// =====================================================
// CRIAR ESTRELAS
// =====================================================

function criarEstrelasMemorias(campo) {

    campo.innerHTML = "";

    const posicoes = construirPosicoes(estrelasMemorias);

    // Guarda a posição de cada estrela, separada por GRUPO
    // (não só por tipo), pra desenhar as linhas certas.
    const posicoesPorGrupo = {};

    estrelasMemorias.forEach((memoria, indice) => {

        const estrela = document.createElement("button");

        estrela.className =
            `estrela estrela-${memoria.tipo}`;

        estrela.type = "button";

        estrela.dataset.id = memoria.id;

        const posicao = posicoes[indice];

        const tamanho = 16 + ((indice * 7) % 12);
        const delay = (indice * 0.37) % 4;

        estrela.style.setProperty(
            "--estrela-x",
            `${posicao.x}%`
        );

        estrela.style.setProperty(
            "--estrela-y",
            `${posicao.y}%`
        );

        estrela.style.setProperty(
            "--estrela-delay",
            `${delay}s`
        );

        estrela.style.setProperty(
            "--estrela-tamanho",
            `${tamanho}px`
        );

        // Atraso pra entrada escalonada (uma estrela aparecendo após a outra)
        estrela.style.setProperty(
            "--entrada-delay",
            `${indice * 0.16}s`
        );

        estrela.setAttribute(
            "aria-label",
            memoria.titulo
        );

        estrela.innerHTML = `
            <span class="estrela-brilho"></span>
            <span class="estrela-nucleo"></span>
        `;

        estrela.addEventListener(
            "click",
            () => abrirMemoria(memoria, estrela)
        );

        campo.appendChild(estrela);

        if (!posicoesPorGrupo[posicao.grupo]) {
            posicoesPorGrupo[posicao.grupo] = [];
        }

        posicoesPorGrupo[posicao.grupo].push({
            x: posicao.x,
            y: posicao.y,
            tipo: memoria.tipo
        });

    });

    desenharConstelacoes(campo, posicoesPorGrupo);

}


// =====================================================
// ENTRADA ESCALONADA (chamada pelo router ao navegar pra #estrelas)
// =====================================================

function reproduzirEntradaEstrelas() {

    const estrelas = document.querySelectorAll(
        "#estrelas-campo .estrela"
    );

    estrelas.forEach((estrela) => {

        estrela.classList.remove("estrela-entrando");

        void estrela.offsetWidth;

        estrela.classList.add("estrela-entrando");

    });

}

// Exposta globalmente pro router.js poder chamar
window.reproduzirEntradaEstrelas = reproduzirEntradaEstrelas;


// =====================================================
// LINHAS DE CONSTELAÇÃO
// =====================================================

function desenharConstelacoes(campo, posicoesPorGrupo) {

    // Remove um SVG antigo, se existir (ex: ao recarregar)
    const svgAntigo = campo.querySelector(".estrelas-linhas");

    if (svgAntigo) {
        svgAntigo.remove();
    }

    const svg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );

    svg.setAttribute("class", "estrelas-linhas");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");

    let indiceGlobalDeLinha = 0;

    Object.values(posicoesPorGrupo).forEach(
        (posicoes) => {

            // Conecta cada estrela à próxima, mas só dentro
            // do mesmo grupo — grupos diferentes nunca se ligam.
            for (let i = 0; i < posicoes.length - 1; i++) {

                const a = posicoes[i];
                const b = posicoes[i + 1];

                const linha = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "line"
                );

                linha.setAttribute("x1", a.x);
                linha.setAttribute("y1", a.y);
                linha.setAttribute("x2", b.x);
                linha.setAttribute("y2", b.y);

                linha.setAttribute(
                    "class",
                    a.tipo === "vermelha"
                        ? "estrela-linha estrela-linha-vermelha"
                        : "estrela-linha"
                );

                linha.style.setProperty(
                    "--linha-delay",
                    `${0.3 + (indiceGlobalDeLinha * 0.25)}s`
                );

                svg.appendChild(linha);

                indiceGlobalDeLinha++;

            }

        }
    );

    // Insere o SVG como primeiro filho do campo,
    // pra ficar atrás dos botões das estrelas.
    campo.insertBefore(svg, campo.firstChild);

}


// =====================================================
// ABRIR MEMÓRIA
// =====================================================

function abrirMemoria(memoria, elemento) {

    const memoriaBox =
        document.getElementById("estrela-memoria");

    const campo =
        document.getElementById("estrelas-campo");

    const intro =
        document.getElementById("estrelas-intro");

    if (!memoriaBox || !campo) return;


    estrelaSelecionada = elemento;


    // Remove seleção anterior

    document
        .querySelectorAll(".estrela-selecionada")
        .forEach((estrela) => {

            estrela.classList.remove(
                "estrela-selecionada"
            );

        });


    elemento.classList.add(
        "estrela-selecionada"
    );

    campo.style.setProperty(
        "--selected-x",
        elemento.style.getPropertyValue("--estrela-x")
    );

    campo.style.setProperty(
        "--selected-y",
        elemento.style.getPropertyValue("--estrela-y")
    );


    // Flash de luz no momento do clique
    elemento.classList.remove("estrela-flash");
    void elemento.offsetWidth;
    elemento.classList.add("estrela-flash");

    setTimeout(() => {
        elemento.classList.remove("estrela-flash");
    }, 800);


    // =================================================
    // ESTRELA VERMELHA
    // =================================================

    const view =
        document.querySelector(".estrelas-view");

    if (memoria.tipo === "vermelha") {

        campo.classList.add(
            "campo-vermelho"
        );

        view?.classList.add(
            "ceu-vermelho"
        );

        memoriaBox.classList.add(
            "memoria-vermelha"
        );

    } else {

        campo.classList.remove(
            "campo-vermelho"
        );

        view?.classList.remove(
            "ceu-vermelho"
        );

        memoriaBox.classList.remove(
            "memoria-vermelha"
        );

    }


    // =================================================
    // POSICIONAR O CARD AO LADO DA ESTRELA
    // =================================================

    const xPct = parseFloat(
        elemento.style.getPropertyValue("--estrela-x")
    );

    const yPct = parseFloat(
        elemento.style.getPropertyValue("--estrela-y")
    );

    // Se a estrela estiver muito à direita, o card abre pro lado esquerdo
    const ladoEsquerdo = xPct > 60;

    memoriaBox.style.setProperty(
        "--memoria-x",
        `${xPct}%`
    );

    memoriaBox.style.setProperty(
        "--memoria-y",
        // Trava a posição vertical pra não estourar topo/rodapé
        `${Math.min(Math.max(yPct, 12), 80)}%`
    );

    memoriaBox.classList.toggle(
        "memoria-lado-esquerdo",
        ladoEsquerdo
    );


    // =================================================
    // PREENCHER MEMÓRIA
    // =================================================

    document.getElementById(
        "estrela-memoria-tipo"
    ).textContent =
        memoria.tipo === "vermelha"
            ? "APRENDIZADO"
            : "MOMENTO";


    document.getElementById(
        "estrela-memoria-titulo"
    ).textContent =
        memoria.titulo || "";


    document.getElementById(
        "estrela-memoria-texto"
    ).textContent =
        memoria.mensagem;


    document.getElementById(
        "estrela-memoria-data"
    ).textContent =
        memoria.data || "";


    // =================================================
    // ANIMAÇÃO
    // =================================================

    if (intro) {

        intro.classList.add(
            "estrelas-intro-escondida"
        );

    }


    memoriaBox.classList.remove(
        "oculto"
    );

    memoriaBox.classList.remove(
        "memoria-aparecendo"
    );

    void memoriaBox.offsetWidth;

    memoriaBox.classList.add(
        "memoria-aparecendo"
    );

}


// =====================================================
// FECHAR MEMÓRIA
// =====================================================

function fecharMemoria() {

    const memoriaBox =
        document.getElementById(
            "estrela-memoria"
        );

    const campo =
        document.getElementById(
            "estrelas-campo"
        );

    const intro =
        document.getElementById(
            "estrelas-intro"
        );


    memoriaBox?.classList.add(
        "oculto"
    );


    campo?.classList.remove(
        "campo-vermelho"
    );


    document
        .querySelector(".estrelas-view")
        ?.classList.remove(
            "ceu-vermelho"
        );


    document
        .querySelectorAll(".estrela-selecionada")
        .forEach((estrela) => {

            estrela.classList.remove(
                "estrela-selecionada"
            );

        });


    intro?.classList.remove(
        "estrelas-intro-escondida"
    );


    estrelaSelecionada = null;

}


// =====================================================
// EVENTOS
// =====================================================

function configurarMemoria() {

    const fechar =
        document.getElementById(
            "estrela-memoria-fechar"
        );

    fechar?.addEventListener(
        "click",
        fecharMemoria
    );


    document.addEventListener(
        "keydown",
        (evento) => {

            if (
                evento.key === "Escape"
            ) {

                fecharMemoria();

            }

        }
    );

}


// =====================================================
// INICIAR
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    carregarEstrelas();
});