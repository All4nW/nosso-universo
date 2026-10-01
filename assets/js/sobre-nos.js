// =====================================================
// MURAL — abas Timeline | Sobre Nós
// Insere o seletor no topo da view da Timeline, renomeia o
// título para "Mural" e monta o "Sobre Nós" como um mural:
// cada pergunta ganha uma composição diferente (par, diagonal,
// recado preso, destaque, faixa...) e os personagens mudam de
// expressão conforme a pergunta.
// Dados vêm de assets/data/sobre-nos.json (gerado pelo admin).
// Tudo aparece, mesmo com os campos vazios. O ☰ filtra por categoria.
// =====================================================

(function () {

    const view = document.querySelector('.view[data-view="timeline"]');
    const timeline = view && view.querySelector(".timeline-container");

    if (!view || !timeline) return;

    // ---------- personagens e expressões ----------
    // Arquivos: icon_flins.png, icon_flins_1.png ... _4  (Allan)
    //           icon_lauma.png, icon_lauma_1.png ... _4  (Jhennyfer)
    // Cada humor aponta o número do arquivo de cada um (0 = sem sufixo).
    // Se uma expressão não combinar com o desenho, é só trocar o número aqui.

    const PASTA = "assets/images/sobre-nos/";

    // A fita das perguntas vai como variável CSS (--fita). Dentro de variável,
    // o url() é resolvido em relação ao arquivo .css e não à página, então o
    // caminho precisa ser absoluto pra achar a imagem em qualquer pasta.
    const URL_FITA = new URL(`${PASTA}icon_perguntas.png`, document.baseURI).href;

    const PERSONAGENS = {
        allan: { arquivo: "icon_flins", nome: "Allan" },
        jhennyfer: { arquivo: "icon_lauma", nome: "Jhennyfer" }
    };

    const HUMORES = {
        normal: { allan: 0, jhennyfer: 0 },
        feliz: { allan: 2, jhennyfer: 2 },
        sonhador: { allan: 1, jhennyfer: 1 },
        fofo: { allan: 3, jhennyfer: 4 },
        bravo: { allan: 4, jhennyfer: 3 }
    };

    // O humor sai de palavras da pergunta. A primeira regra que bater vence.
    // Pra forçar um humor numa pergunta específica, o item do JSON pode ter
    // "humor": "bravo" (ou um número de 0 a 4 pra escolher o arquivo direto).
    const REGRAS_HUMOR = [
        ["bravo", /irrita|odeia|odio|raiva|chato|pior|nao suporto|nao gosto|medo|briga|defeito|ciume|estress/],
        ["feliz", /jogo|game|bebida|drink|festa|doce|sobremesa|sorvete|cafe|comemor|viag|passeio|show|danc/],
        ["sonhador", /filme|serie|anime|livro|sonho|futuro|plano|casa|morar|meta|imagin|universo|estrela|noite|lua/],
        ["fofo", /dormir|sono|manha|abrac|beij|carinho|pet|gato|cachorro|colo|cheiro|apelido|mimo|amor/],
        ["normal", /comida|prato|lanche|almo|jantar|salgad|pizza|cor |estacao|cidade|pais|numero/]
    ];

    // Sem palavra-chave: alterna, pra nunca ficar tudo com a mesma cara.
    const CICLO_HUMOR = ["normal", "feliz", "sonhador", "fofo"];

    // Ícone que fica ao lado do título de cada categoria (por tema).
    // Categoria sem ícone aqui continua com o emoji. Pra adicionar
    // (ex.: entretenimento, personalidade), é só uma linha nova.
    const ICONE_CATEGORIA = {
        gostos: "icon_comida.png",
        preferencias: "icon_preferencia.png",
        musica: "icon_musica.png",
        nossas: "icon_sonossas.png",
        dois: "icon_nosdois.png",
        futuro: "icon_futuro.png"
    };

    // Moldura (imagem de balão) de cada um: o personagem entra no quadro
    // e a resposta é escrita no papel. Todos os layouts usam.
    const MOLDURAS = {
        allan: "icon_balao.png",
        jhennyfer: "icon_balao_1.png"
    };

    // Balão duplo (um polaroid de cada lado): usado quando a resposta é
    // a mesma pros dois ("nosso" / "os dois"). Um balão só, sem legenda.
    const MOLDURA_DUPLA = "icon_balao_2.png";

    // Todas as perguntas usam o mesmo arranjo da primeira (par): mesmo
    // tamanho e mesma posição. Pra voltar a variar, é só listar mais layouts:
    // ["par"], ["diag"], ["post"], ["destaque"] (e o 2º valor true inverte).
    const SEQ = [
        ["par"]
    ];

    const ROTACOES = [-1.2, 0.9, -0.6, 1.2];
    const TODAS = "todas";

    let categorias = [];
    let carregado = false;
    let categoriaAtiva = TODAS;
    let drawerAberta = false;

    const esc = (texto) => {
        const div = document.createElement("div");
        div.textContent = texto == null ? "" : texto;
        return div.innerHTML;
    };

    const norm = (texto) =>
        String(texto || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");


    // ---------- título "Mural" ----------

    const titulo = view.querySelector(".section-title");
    if (titulo) titulo.textContent = "Mural";


    // ---------- estrutura ----------

    const topo = document.createElement("div");
    topo.className = "sn-topo";

    const abas = document.createElement("div");
    abas.className = "sn-abas";
    abas.dataset.ativa = "timeline";
    abas.setAttribute("role", "tablist");
    abas.innerHTML = `
        <span class="sn-abas-marcador"></span>
        <button type="button" class="sn-aba ativa" data-aba="timeline" role="tab">✨ Timeline</button>
        <button type="button" class="sn-aba" data-aba="sobre" role="tab">💗 Sobre Nós</button>
    `;

    // Botão flutuante no canto: fica fora da linha das abas, então
    // abrir "Sobre Nós" não empurra o seletor pro lado.
    const menuFab = document.createElement("button");
    menuFab.type = "button";
    menuFab.className = "sn-menu-fab";
    menuFab.setAttribute("aria-label", "Índice de categorias");
    menuFab.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M5 7h14M5 12h9M5 17h14"/>
        </svg>
    `;

    topo.appendChild(abas);

    const painel = document.createElement("section");
    painel.className = "sn-painel";
    painel.hidden = true;

    const overlay = document.createElement("div");
    overlay.className = "sn-drawer-overlay";

    const drawer = document.createElement("div");
    drawer.className = "sn-drawer";
    drawer.innerHTML = `
        <p class="sn-drawer-titulo">Índice</p>
        <div class="sn-drawer-lista"></div>
    `;

    timeline.before(topo);
    timeline.after(painel);
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    document.body.appendChild(menuFab);

    // O botão só aparece enquanto o painel "Sobre Nós" está na tela
    // (some sozinho ao voltar pra Timeline ou trocar de view).
    new IntersectionObserver(([entrada]) => {
        menuFab.classList.toggle("visivel", entrada.isIntersecting);
        if (!entrada.isIntersecting) fecharDrawer();
    }).observe(painel);


    // ---------- dados ----------

    async function carregar() {

        try {

            const resposta = await fetch("assets/data/sobre-nos.json", { cache: "no-cache" });
            if (!resposta.ok) throw new Error("sem arquivo");

            const dados = await resposta.json();

            // Não filtra por conteúdo: tudo aparece, mesmo vazio.
            // Só descarta categoria que não tem nenhum item cadastrado.
            categorias = (dados.categorias || [])
                .map((categoria) => ({
                    ...categoria,
                    itens: categoria.itens || []
                }))
                .filter((categoria) => categoria.itens.length);

        } catch {

            categorias = [];

        }

        carregado = true;
        categoriaAtiva = TODAS;

    }


    // ---------- índice de categorias ----------

    function renderizarDrawer() {

        const itemTudo = `
            <button type="button" class="sn-drawer-item ${categoriaAtiva === TODAS ? "ativo" : ""}" data-cat="${TODAS}">
                <span class="sn-drawer-item-emoji">✨</span>
                <span>Tudo</span>
            </button>
        `;

        drawer.querySelector(".sn-drawer-lista").innerHTML = itemTudo + categorias.map((c) => `
            <button type="button" class="sn-drawer-item ${c.id === categoriaAtiva ? "ativo" : ""}" data-cat="${esc(c.id)}">
                <span class="sn-drawer-item-emoji">${esc(c.emoji || "💗")}</span>
                <span>${esc(c.titulo)}</span>
            </button>
        `).join("");

    }

    function abrirDrawer() {

        drawerAberta = true;
        overlay.classList.add("visivel");
        drawer.classList.add("aberta");

    }

    function fecharDrawer() {

        drawerAberta = false;
        overlay.classList.remove("visivel");
        drawer.classList.remove("aberta");

    }

    menuFab.addEventListener("click", abrirDrawer);
    overlay.addEventListener("click", fecharDrawer);

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && drawerAberta) fecharDrawer();
    });

    drawer.addEventListener("click", (evento) => {

        const item = evento.target.closest(".sn-drawer-item");
        if (!item) return;

        categoriaAtiva = item.dataset.cat;
        fecharDrawer();
        montarPainel();
        view.scrollTo({ top: 0 });

    });


    // ---------- personagens ----------

    function humorDe(item, indice) {

        const h = item.humor;

        if (typeof h === "number") return { allan: h, jhennyfer: h };
        if (typeof h === "string" && HUMORES[norm(h)]) return HUMORES[norm(h)];

        const texto = norm(item.rotulo) + " ";

        for (const [nome, regra] of REGRAS_HUMOR) {
            if (regra.test(texto)) return HUMORES[nome];
        }

        return HUMORES[CICLO_HUMOR[indice % CICLO_HUMOR.length]];

    }

    // Figurinha do personagem. Se o arquivo da expressão não existir,
    // cai pro desenho base (icon_flins.png / icon_lauma.png).
    function imgPersonagem(quem, humor) {

        const p = PERSONAGENS[quem];
        const n = humor[quem];
        const base = `${PASTA}${p.arquivo}`;
        const src = `${base}${n ? "_" + n : ""}.png`;

        return `<img src="${src}" alt="${p.nome}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${base}.png'">`;

    }

    function fig(quem, humor, classe = "") {

        return `<span class="sn-fig sn-fig-${quem} ${classe}">${imgPersonagem(quem, humor)}</span>`;

    }


    // ---------- peças do mural ----------

    function htmlPeca(item, indice, ctx) {

        const humor = humorDe(item, indice);

        const q = `<p class="sn-q" style="--fita:url('${URL_FITA}')">${item.emoji ? `<span class="sn-q-emoji">${esc(item.emoji)}</span>` : ""}${esc(item.rotulo)}</p>`;

        const resp = (valor, classe = "") => {
            const vazio = !norm(valor);
            return `<span class="sn-resp ${classe} ${vazio ? "sn-resp-vazia" : ""}">${vazio ? "—" : esc(valor)}</span>`;
        };

        // Nota = moldura de balão (imagem) + personagem no quadro + resposta no papel.
        const nota = (quem, valor, classe = "") => {

            const vazio = !norm(valor);

            // Quanto mais curta a resposta, maior a letra (ocupa bem o papel).
            // Respostas longas diminuem pra caber sem cortar.
            const n = String(valor || "").trim().length;
            const tam = n <= 10 ? 10 : n <= 16 ? 8.5 : n <= 26 ? 7 : n <= 40 ? 6 : 5;

            return `
                <div class="sn-nota sn-nota-balao sn-nota-${quem} ${classe} ${vazio ? "sn-nota-vazia" : ""}">
                    <img class="sn-balao-fundo" src="${PASTA}${MOLDURAS[quem]}" alt="" loading="lazy" decoding="async">
                    <span class="sn-balao-foto">${imgPersonagem(quem, humor)}</span>
                    <span class="sn-resp sn-balao-texto ${vazio ? "sn-resp-vazia" : ""}" style="--tam:${tam}">${vazio ? "—" : esc(valor)}</span>
                </div>
            `;

        };

        const coracao = `<span class="sn-coracao" aria-hidden="true">♥</span>`;

        // "juntos" (ou respostas iguais): os dois cards mostram a mesma resposta
        const juntos = item.tipo === "juntos" || (norm(item.eu) && norm(item.eu) === norm(item.ela));
        const valor = {
            allan: item.tipo === "juntos" ? item.texto : item.eu,
            jhennyfer: item.tipo === "juntos" ? item.texto : item.ela
        };
        const tag = juntos ? `<span class="sn-tag">${item.tipo === "juntos" ? "nosso" : "os dois"}</span>` : "";

        let [layout, inv] = SEQ[ctx.p++ % SEQ.length];
        const invClasse = inv ? "sn-inv" : "";

        let corpo;

        if (juntos) {

            layout = "dupla";

            const texto = valor.allan;
            const vazio = !norm(texto);

            // o papel do balão duplo é mais estreito: letra um pouco menor
            const n = String(texto || "").trim().length;
            const tam = (n <= 10 ? 10 : n <= 16 ? 8.5 : n <= 26 ? 7 : n <= 40 ? 6 : 5) * 0.7;

            corpo = `
                ${q}
                <div class="sn-nota sn-nota-balao sn-nota-dupla ${vazio ? "sn-nota-vazia" : ""}">
                    <img class="sn-balao-fundo" src="${PASTA}${MOLDURA_DUPLA}" alt="" loading="lazy" decoding="async">
                    <span class="sn-balao-foto sn-foto-esq">${imgPersonagem("allan", humor)}</span>
                    <span class="sn-balao-foto sn-foto-dir">${imgPersonagem("jhennyfer", humor)}</span>
                    <span class="sn-resp sn-balao-texto ${vazio ? "sn-resp-vazia" : ""}" style="--tam:${tam}">${vazio ? "—" : esc(texto)}</span>
                </div>
            `;

        } else if (layout === "par" || layout === "post") {

            // par: as duas notas lado a lado; post: mesma ideia, mais compacta
            corpo = `
                ${q}
                <div class="sn-par ${layout === "post" ? "sn-compacto" : ""} ${invClasse}">
                    ${nota("allan", valor.allan)}
                    ${coracao}
                    ${nota("jhennyfer", valor.jhennyfer)}
                </div>
                ${tag}
            `;

        } else if (layout === "diag") {

            // diagonal: uma nota à esquerda, a outra à direita e mais abaixo
            corpo = `
                <div class="sn-diag ${invClasse}">
                    ${q}
                    ${nota("allan", valor.allan)}
                    ${nota("jhennyfer", valor.jhennyfer)}
                </div>
                ${tag}
            `;

        } else {

            // destaque: uma nota grande e a outra menor ao lado
            const temEu = norm(item.eu);
            const temEla = norm(item.ela);

            let principal = indice % 2 === 0 ? "allan" : "jhennyfer";
            if (juntos) principal = "allan";
            else if (temEu && !temEla) principal = "allan";
            else if (temEla && !temEu) principal = "jhennyfer";

            const outro = principal === "allan" ? "jhennyfer" : "allan";

            corpo = `
                ${q}
                <div class="sn-destaque ${invClasse}">
                    ${nota(principal, valor[principal], "sn-nota-grande")}
                    ${nota(outro, valor[outro], "sn-nota-pequena")}
                </div>
                ${tag}
            `;

        }

        const estilo = `--delay:${Math.min(indice, 8) * 0.08}s;--r:${ROTACOES[indice % ROTACOES.length]}deg`;

        return `<article class="sn-peca" data-layout="${layout}" data-pos="e" data-w="l" style="${estilo}">${corpo}</article>`;

    }

    // Cada categoria tem uma pequena linguagem visual própria (via CSS).
    function temaDe(categoria) {

        const t = norm(categoria.titulo || categoria.id);

        if (/gost/.test(t)) return "gostos";
        if (/entret/.test(t)) return "entretenimento";
        if (/music/.test(t)) return "musica";
        if (/prefer/.test(t)) return "preferencias";
        if (/personal/.test(t)) return "personalidade";
        if (/nossa/.test(t)) return "nossas";
        if (/dois/.test(t)) return "dois";
        if (/futuro/.test(t)) return "futuro";

        return "geral";

    }

    function htmlCategoria(categoria) {

        const ctx = { p: 0, j: 0 };
        const tema = temaDe(categoria);

        const icone = ICONE_CATEGORIA[tema]
            ? `<img class="sn-cat-icone" src="${PASTA}${ICONE_CATEGORIA[tema]}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`
            : "";

        return `
            <section class="sn-secao" data-tema="${tema}">
                <h3 class="sn-cat-titulo">
                    ${icone || `<span class="sn-cat-emoji">${esc(categoria.emoji || "")}</span>`}
                    <span>${esc(categoria.titulo)}</span>
                </h3>
                <div class="sn-conteudo">
                    ${categoria.itens.map((item, i) => htmlPeca(item, i, ctx)).join("")}
                </div>
            </section>
        `;

    }

    // ---------- texto sempre dentro do papel ----------
    // Cada resposta começa no tamanho calculado (--tam) e diminui, se
    // precisar, até caber inteira no papel: sem quebrar palavra no meio
    // e sem cortar nada. Refaz ao redimensionar a janela.

    function ajustarTexto(cartao) {

        const el = cartao.querySelector(".sn-balao-texto");
        if (!el || !el.clientWidth || !el.clientHeight) return;

        el.style.fontSize = "";
        el.style.overflowWrap = "";

        let tamanho = parseFloat(getComputedStyle(el).fontSize);

        const estoura = () =>
            el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;

        while (estoura() && tamanho > 10) {
            tamanho -= 0.5;
            el.style.fontSize = `${tamanho}px`;
        }

        // Último recurso (palavra gigante): quebra em vez de vazar pra fora
        if (estoura()) el.style.overflowWrap = "anywhere";

    }

    function ajustarTextos() {

        painel.querySelectorAll(".sn-nota-balao").forEach((cartao) => {

            const fundo = cartao.querySelector(".sn-balao-fundo");

            // Enquanto a imagem do balão não carrega, a altura do papel é 0
            if (fundo && !(fundo.complete && fundo.naturalWidth)) {
                fundo.addEventListener("load", () => ajustarTexto(cartao), { once: true });
                return;
            }

            ajustarTexto(cartao);

        });

    }

    let temporizadorResize;

    window.addEventListener("resize", () => {
        clearTimeout(temporizadorResize);
        temporizadorResize = setTimeout(ajustarTextos, 150);
    });

    function montarPainel() {

        renderizarDrawer();
        menuFab.classList.toggle("filtrando", categoriaAtiva !== TODAS);

        if (!categorias.length) {
            painel.innerHTML = `<p class="sn-vazio">Ainda não tem nada por aqui.</p>`;
            return;
        }

        const visiveis = categoriaAtiva === TODAS
            ? categorias
            : categorias.filter((c) => c.id === categoriaAtiva);

        painel.innerHTML = `
            <div class="sn-secoes sn-trocando">
                ${(visiveis.length ? visiveis : categorias).map(htmlCategoria).join("")}
            </div>
        `;

        ajustarTextos();

        // A fonte do texto carrega depois: refaz a medição quando ela chegar
        if (document.fonts) {
            if (document.fonts.load) document.fonts.load('700 1em "EB Garamond"').then(ajustarTextos).catch(() => {});
            if (document.fonts.ready) document.fonts.ready.then(ajustarTextos);
        }

    }


    // ---------- troca de abas ----------

    abas.addEventListener("click", async (evento) => {

        const botao = evento.target.closest(".sn-aba");
        if (!botao) return;

        const sobre = botao.dataset.aba === "sobre";

        abas.dataset.ativa = botao.dataset.aba;

        abas
            .querySelectorAll(".sn-aba")
            .forEach((b) => b.classList.toggle("ativa", b === botao));

        timeline.style.display = sobre ? "none" : "";
        painel.hidden = !sobre;

        if (!sobre) {
            fecharDrawer();
        } else if (!carregado) {
            await carregar();
            montarPainel();
        }

        view.scrollTo({ top: 0 });

    });

})();