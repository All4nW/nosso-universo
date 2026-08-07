let configuracoesOriginais = {};


async function initSettings() {

    try {

        const settings = await API.getSettings();

        configuracoesOriginais = {
            corPrincipal: settings.corPrincipal || "#c9a7f5",
            corFundo: settings.corFundo || "#0a0a1a"
        };


        // =========================
        // CORES
        // =========================

        const corDestaque =
            document.getElementById("campo-cor-destaque");

        const corFundo =
            document.getElementById("campo-cor-fundo");


        corDestaque.value =
            configuracoesOriginais.corPrincipal;

        corFundo.value =
            configuracoesOriginais.corFundo;


        atualizarHex(
            corDestaque,
            document.getElementById("valor-cor-destaque")
        );


        atualizarHex(
            corFundo,
            document.getElementById("valor-cor-fundo")
        );


        // =========================
        // EVENTOS
        // =========================

        corDestaque.addEventListener("input", () => {

            atualizarHex(
                corDestaque,
                document.getElementById("valor-cor-destaque")
            );

        });


        corFundo.addEventListener("input", () => {

            atualizarHex(
                corFundo,
                document.getElementById("valor-cor-fundo")
            );

        });


        registrarBotoes();


        // Música
        iniciarGerenciadorMusicas();

    }

    catch (erro) {

        console.error(erro);

        alert("Erro ao carregar configurações.");

    }

}



function atualizarHex(input, elemento) {

    elemento.textContent =
        input.value.toUpperCase();

}



function registrarBotoes() {

    const salvar =
        document.getElementById("btn-salvar-settings");

    const cancelar =
        document.getElementById("btn-cancelar-settings");


    if (salvar) {

        salvar.onclick =
            salvarConfiguracoes;

    }


    if (cancelar) {

        cancelar.onclick =
            cancelarConfiguracoes;

    }

}



async function salvarConfiguracoes() {

    const dados = {

        corPrincipal:
            document.getElementById(
                "campo-cor-destaque"
            ).value,

        corFundo:
            document.getElementById(
                "campo-cor-fundo"
            ).value

    };


    try {

        await API.saveSettings(dados);

        configuracoesOriginais = {
            ...dados
        };

        alert("❤️ Configurações salvas com sucesso!");

    }

    catch (erro) {

        console.error(erro);

        alert("Erro ao salvar configurações.");

    }

}



function cancelarConfiguracoes() {

    const corDestaque =
        document.getElementById("campo-cor-destaque");

    const corFundo =
        document.getElementById("campo-cor-fundo");


    corDestaque.value =
        configuracoesOriginais.corPrincipal;

    corFundo.value =
        configuracoesOriginais.corFundo;


    atualizarHex(
        corDestaque,
        document.getElementById("valor-cor-destaque")
    );


    atualizarHex(
        corFundo,
        document.getElementById("valor-cor-fundo")
    );

}



function iniciarGerenciadorMusicas() {

    const area =
        document.getElementById("area-upload-musica");

    const input =
        document.getElementById("input-musica");


    if (!area || !input) return;


    area.addEventListener("click", () => {

        input.click();

    });


    input.addEventListener("change", (event) => {

        const arquivo =
            event.target.files[0];

        if (!arquivo) return;


        adicionarMusicaVisual(arquivo);

    });

}



function adicionarMusicaVisual(arquivo) {

    const lista =
        document.getElementById("lista-musicas");


    const vazio =
        lista.querySelector(".musicas-vazia");


    if (vazio) {

        vazio.remove();

    }


    const item =
        document.createElement("div");


    item.className =
        "musica-item";


    item.innerHTML = `

        <div class="musica-item-info">

            <span class="musica-item-nome">
                ${arquivo.name}
            </span>

            <span class="musica-item-duracao">
                Música adicionada
            </span>

        </div>

        <div class="musica-item-acoes">

            <button
                class="musica-item-botao"
                type="button">

                ▶

            </button>

            <button
                class="musica-item-botao musica-remover"
                type="button">

                🗑

            </button>

        </div>

    `;


    item
        .querySelector(".musica-remover")
        .onclick = () => {

            item.remove();

            atualizarContadorMusicas();

        };


    lista.appendChild(item);


    atualizarContadorMusicas();

}



function atualizarContadorMusicas() {

    const lista =
        document.getElementById("lista-musicas");

    const contador =
        document.getElementById("contador-musicas");


    const quantidade =
        lista.querySelectorAll(".musica-item").length;


    contador.textContent =
        `${quantidade} ${quantidade === 1 ? "música" : "músicas"}`;

}


window.initSettings = initSettings;