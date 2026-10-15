// =====================================================
// NOSSO UNIVERSO — EDITS
// Lista dos filmes que têm edit (aba do painel lateral) e um
// player único (usado pela lista e pelo modal de cada filme).
//
// Dados: assets/data/preview.json (o mesmo de antes).
// Cada entrada tem um vídeo principal e, às vezes, "extras";
// aqui tudo vira uma lista só de edits.
//
// Leve no celular: a galeria só mostra capas (lazy) e o
// player cria UM <video> por vez, destruído ao fechar.
// =====================================================

(function () {

    "use strict";

    const CAMINHO = "assets/data/preview.json";

    let todos = null;        // todos os edits (achatados)
    let pendente = null;     // promessa do carregamento

    // estado do player
    let fila = [];           // lista que está tocando
    let pos = 0;             // posição na fila
    let somLigado = true;
    let arrastando = false;
    let ultimoFoco = null;
    let semFilme = false;    // true quando o player abre de dentro do modal do filme

    let el = null;           // elementos do player (criados na 1ª abertura)


    // =================================================
    // DADOS
    // =================================================

    function formatar(segundos) {

        const total = Math.max(0, Math.floor(Number(segundos) || 0));

        return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;

    }

    function escapar(texto) {

        const div = document.createElement("div");

        div.textContent = texto || "";

        return div.innerHTML;

    }

    async function carregar() {

        if (todos) return todos;

        if (!pendente) {

            pendente = fetch(CAMINHO, { cache: "no-cache" })
                .then(r => (r.ok ? r.json() : []))
                .catch(() => [])
                .then(dados => {

                    const ordenados = (Array.isArray(dados) ? dados : [])
                        .map((d, i) => ({ d, i }))
                        .sort((a, b) =>
                            ((Number(a.d.ordem) || Infinity) - (Number(b.d.ordem) || Infinity)) ||
                            (a.i - b.i)
                        );

                    const saida = [];

                    ordenados.forEach(({ d }) => {

                        const videos = [d, ...(Array.isArray(d.extras) ? d.extras : [])]
                            .filter(v => v && v.video);

                        videos.forEach((v, n) => {

                            saida.push({
                                chave: `${d.id}-${n}`,
                                video: v.video,
                                capa: v.capa || "",
                                razao: (Number(v.largura) > 0 && Number(v.altura) > 0)
                                    ? Number(v.largura) / Number(v.altura)
                                    : 16 / 9,
                                duracao: Number(v.duracao) || 0,
                                assistidoId: d.assistidoId ? String(d.assistidoId) : "",
                                titulo: d.assistidoTitulo || d.titulo || "Preview",
                                categoria: d.assistidoCategoria || "",
                                numero: n + 1,
                                total: videos.length
                            });

                        });

                    });

                    todos = saida;

                    return todos;

                });

        }

        return pendente;

    }

    // os edits de um filme (ou série/anime), pelo id dele no assistidos.json
    async function doFilme(id) {

        const lista = await carregar();

        return lista.filter(e => e.assistidoId === String(id));

    }


    // =================================================
    // LISTA DE EDITS (aba "Edits" do painel lateral): um cartão
    // por filme, com a capa ao lado dos vídeos, nome, detalhes
    // e as miniaturas de cada edit.
    // =================================================

    const ROTULO_CATEGORIA = { filmes: "Filme", series: "Série", animes: "Anime" };

    function agrupar(lista) {

        const grupos = new Map();

        lista.forEach(edit => {

            const chave = edit.assistidoId || edit.chave;

            if (!grupos.has(chave)) {

                grupos.set(chave, {
                    assistidoId: edit.assistidoId,
                    titulo: edit.titulo,
                    edits: []
                });

            }

            grupos.get(chave).edits.push(edit);

        });

        return [...grupos.values()];

    }

    // monta a lista de filmes com edit dentro de um container
    // (o painel lateral do assistidos.js chama isso na aba "Edits")
    async function montarLista(container) {

        if (!container || container.dataset.pronto) return;

        container.dataset.pronto = "1";

        const lista = await carregar();

        container.innerHTML = "";

        if (!lista.length) {

            container.innerHTML = `<p class="edits-vazio">Ainda não há previews por aqui.</p>`;

            return;

        }

        agrupar(lista).forEach((grupo, indice) => {

            container.appendChild(criarCartaoFilme(grupo, lista, indice));

        });

    }

    function criarCartaoFilme(grupo, todosEdits, indice) {

        const item = acharItem(grupo.assistidoId);

        const n = grupo.edits.length;

        const cartao = document.createElement("article");

        cartao.className = "edits-filme";

        cartao.style.setProperty("--atraso", `${Math.min(indice, 8) * 0.05}s`);

        // capa do filme
        const poster = document.createElement("button");

        poster.type = "button";
        poster.className = "edits-filme-poster";

        poster.setAttribute("aria-label", `Detalhes de ${grupo.titulo}`);

        if (item && item.capa) {

            const img = document.createElement("img");

            img.src = item.capa;
            img.alt = "";
            img.loading = "lazy";
            img.decoding = "async";

            img.addEventListener("error", () => img.remove());

            poster.appendChild(img);

        }

        poster.addEventListener("click", () => detalhesDe(item));

        // título, "Filme • 1999" e a pílula "3 vídeos"
        const info = document.createElement("div");

        info.className = "edits-filme-info";

        const titulo = document.createElement("h3");

        titulo.className = "edits-filme-titulo";

        titulo.textContent = grupo.titulo;

        const meta = document.createElement("p");

        meta.className = "edits-filme-meta";

        const rotulo = item ? ROTULO_CATEGORIA[item.categoria] : "";

        const linha = [rotulo, item && item.ano].filter(Boolean).join(" • ");

        meta.innerHTML =
            (linha ? `<span class="edits-filme-linha">${linha}</span>` : "") +
            `<span class="edits-chip">${n} ${n === 1 ? "vídeo" : "vídeos"}</span>`;

        info.append(titulo, meta);

        // UMA miniatura só; o player segue pros outros edits do filme
        const primeiro = grupo.edits[0];

        const videos = document.createElement("div");

        videos.className = "edits-filme-videos";

        const mini = document.createElement("button");

        mini.type = "button";
        mini.className = "edits-video edits-video-unico";

        mini.setAttribute("aria-label", `Ver os previews de ${grupo.titulo}`);

        if (primeiro.capa) {

            const img = document.createElement("img");

            img.src = primeiro.capa;
            img.alt = "";
            img.loading = "lazy";
            img.decoding = "async";

            img.addEventListener("error", () => img.remove());

            mini.appendChild(img);

        }

        mini.insertAdjacentHTML(
            "beforeend",
            `<span class="edits-video-play" aria-hidden="true">▶</span>` +
            (primeiro.duracao ? `<span class="edits-video-dur">${formatar(primeiro.duracao)}</span>` : "") +
            (n > 1 ? `<span class="edits-video-mais">+${n - 1}</span>` : "")
        );

        mini.addEventListener("click", () => abrir(grupo.edits, 0));

        videos.appendChild(mini);

        cartao.append(poster, info, videos);

        return cartao;

    }


    // =================================================
    // PLAYER
    // =================================================

    const ICONE_SOM = `<svg class="ep-ico-som" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.8a7.2 7.2 0 0 1 0 10.4"/></svg>`;
    const ICONE_MUDO = `<svg class="ep-ico-mudo" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></svg>`;

    function criarPlayer() {

        if (el) return;

        const raiz = document.createElement("div");

        raiz.id = "edit-player";

        raiz.className = "edit-player";

        raiz.hidden = true;

        raiz.setAttribute("role", "dialog");

        raiz.setAttribute("aria-modal", "true");

raiz.setAttribute("aria-label", "Preview");

        raiz.innerHTML = `
            <div class="ep-caixa">

                <div class="ep-topo">
                    <div class="ep-info">
                        <b class="ep-titulo"></b>
                        <small class="ep-pos"></small>
                    </div>
                    <button type="button" class="ep-btn ep-fechar" aria-label="Fechar">✕</button>
                </div>

                <div class="ep-tela">
                    <video playsinline preload="metadata"></video>
                    <button type="button" class="ep-area" aria-label="Tocar ou pausar"></button>
                    <span class="ep-play-grande" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M8.5 5.6v12.8c0 .8.9 1.3 1.6.8l9.6-6.4c.6-.4.6-1.2 0-1.6L10.1 4.8c-.7-.5-1.6 0-1.6.8z"/></svg>
                    </span>
                    <span class="ep-carregando" aria-hidden="true"></span>
                    <button type="button" class="ep-nav ep-ant" aria-label="Preview anterior">‹</button>
                    <button type="button" class="ep-nav ep-prox" aria-label="Próximo preview">›</button>
                </div>

                <div class="ep-base">

                    <div class="ep-progresso">
                        <span class="ep-tempo ep-atual">0:00</span>

                        <div class="ep-barra" role="slider" tabindex="0"
                             aria-label="Progresso do vídeo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                            <div class="ep-trilho">
                                <div class="ep-fill"></div>
                                <div class="ep-bolinha"></div>
                            </div>
                        </div>

                        <span class="ep-tempo ep-total">0:00</span>

                        <button type="button" class="ep-btn ep-som" aria-label="Ligar ou desligar o som">
                            ${ICONE_SOM}${ICONE_MUDO}
                        </button>
                    </div>

                    <button type="button" class="ep-filme">ver o filme <span aria-hidden="true">♡</span></button>

                </div>

            </div>
        `;

        document.body.appendChild(raiz);

        const q = s => raiz.querySelector(s);

        el = {
            raiz,
            video: q("video"),
            titulo: q(".ep-titulo"),
            pos: q(".ep-pos"),
            tela: q(".ep-tela"),
            fill: q(".ep-fill"),
            bolinha: q(".ep-bolinha"),
            barra: q(".ep-barra"),
            trilho: q(".ep-trilho"),
            atual: q(".ep-atual"),
            total: q(".ep-total"),
            filme: q(".ep-filme")
        };

        ligarEventos(q);

    }

    function ligarEventos(q) {

        const { raiz, video } = el;

        q(".ep-fechar").addEventListener("click", fechar);

        raiz.addEventListener("click", e => {

            // tocar no fundo escuro (fora da caixa) fecha
            if (e.target === raiz) fechar();

        });

        q(".ep-area").addEventListener("click", alternar);

        q(".ep-ant").addEventListener("click", () => ir(-1));

        q(".ep-prox").addEventListener("click", () => ir(1));

        q(".ep-som").addEventListener("click", () => {

            somLigado = !somLigado;

            video.muted = !somLigado;

            raiz.classList.toggle("sem-som", !somLigado);

        });

        el.filme.addEventListener("click", verOFilme);

        // estados do vídeo
        video.addEventListener("playing", () => {

            raiz.classList.remove("carregando", "pausado");

        });

        video.addEventListener("pause", () => {

            if (!video.ended) raiz.classList.add("pausado");

        });

        video.addEventListener("waiting", () => raiz.classList.add("carregando"));

        video.addEventListener("canplay", () => raiz.classList.remove("carregando"));

        video.addEventListener("loadedmetadata", () => {

            if (isFinite(video.duration)) el.total.textContent = formatar(video.duration);

        });

        video.addEventListener("timeupdate", () => {

            if (!arrastando && video.duration) {

                mostrarProgresso(video.currentTime / video.duration);

            }

        });

        video.addEventListener("ended", () => {

            if (fila.length > 1) ir(1);

            else {

                video.currentTime = 0;

                video.play().catch(() => {});

            }

        });

        video.addEventListener("error", () => {

            raiz.classList.remove("carregando");

            raiz.classList.add("pausado");

        });

        // barra de progresso: tocar ou arrastar pula pro ponto
        const fracao = e => {

            const caixa = el.trilho.getBoundingClientRect();

            return (e.clientX - caixa.left) / caixa.width;

        };

        el.barra.addEventListener("pointerdown", e => {

            if (!video.duration) return;

            e.preventDefault();

            arrastando = true;

            try { el.barra.setPointerCapture(e.pointerId); } catch (_) { /* sem captura */ }

            buscar(fracao(e));

        });

        el.barra.addEventListener("pointermove", e => {

            if (arrastando) buscar(fracao(e));

        });

        ["pointerup", "pointercancel"].forEach(nome => {

            el.barra.addEventListener(nome, () => { arrastando = false; });

        });

        el.barra.addEventListener("keydown", e => {

            if (!video.duration) return;

            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {

                e.preventDefault();

                e.stopPropagation();

                buscar((video.currentTime + (e.key === "ArrowRight" ? 5 : -5)) / video.duration);

            }

        });

        // deslizar de lado na tela troca de edit
        let x0 = 0;
        let y0 = 0;

        el.tela.addEventListener("touchstart", e => {

            x0 = e.touches[0].clientX;
            y0 = e.touches[0].clientY;

        }, { passive: true });

        el.tela.addEventListener("touchend", e => {

            const dx = e.changedTouches[0].clientX - x0;
            const dy = e.changedTouches[0].clientY - y0;

            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {

                ir(dx < 0 ? 1 : -1);

            }

        }, { passive: true });

        // teclado
        document.addEventListener("keydown", e => {

            if (raiz.hidden) return;

            if (e.key === "Escape") {

                fechar();

            } else if (e.key === "ArrowRight") {

                ir(1);

            } else if (e.key === "ArrowLeft") {

                ir(-1);

            } else if (e.key === " " && !e.target.closest("button, [role=slider]")) {

                e.preventDefault();

                alternar();

            }

        });

        // trocar de aba/app pausa
        document.addEventListener("visibilitychange", () => {

            if (document.hidden && !raiz.hidden) video.pause();

        });

    }

    function mostrarProgresso(f) {

        const v = Math.min(Math.max(f, 0), 1);

        el.fill.style.transform = `scaleX(${v})`;

        el.bolinha.style.left = `${v * 100}%`;

        el.atual.textContent = formatar(v * (el.video.duration || 0));

        el.barra.setAttribute("aria-valuenow", String(Math.round(v * 100)));

    }

    function buscar(f) {

        const { video } = el;

        if (!video.duration) return;

        const v = Math.min(Math.max(f, 0), 1);

        video.currentTime = v * video.duration;

        mostrarProgresso(v);

    }

    function alternar() {

        const { video } = el;

        if (video.paused) {

            video.play().catch(() => {});

        } else {

            video.pause();

        }

    }

    async function tocarAtual() {

        const { video, raiz } = el;

        video.muted = !somLigado;

        raiz.classList.add("carregando");

        try {

            await video.play();

        } catch (erro) {

            // o navegador não deixou tocar com som: toca mudo
            if (erro && erro.name === "NotAllowedError" && !video.muted) {

                video.muted = true;

                somLigado = false;

                raiz.classList.add("sem-som");

                try { await video.play(); } catch (_) { raiz.classList.remove("carregando"); }

            } else if (!erro || erro.name !== "AbortError") {

                raiz.classList.remove("carregando");

                raiz.classList.add("pausado");

            }

        }

    }

    function carregarNaTela(indice) {

        const edit = fila[indice];

        if (!edit) return;

        pos = indice;

        const { video, raiz } = el;

        el.titulo.textContent = edit.titulo;

        el.pos.textContent =
            fila.length > 1 ? `${indice + 1} de ${fila.length}` : "";

        el.tela.style.setProperty(
            "--r",
            Math.min(Math.max(edit.razao, 0.5), 2.4).toFixed(4)
        );

        raiz.classList.toggle("unico", fila.length < 2);

        raiz.classList.remove("pausado");

        el.fill.style.transform = "scaleX(0)";

        el.bolinha.style.left = "0%";

        el.atual.textContent = "0:00";

        el.total.textContent = formatar(edit.duracao);

        el.filme.hidden = semFilme || !acharItem(edit.assistidoId);

        video.poster = edit.capa || "";

        video.src = edit.video;

        tocarAtual();

    }

    function ir(passo) {

        if (fila.length < 2) return;

        carregarNaTela((pos + passo + fila.length) % fila.length);

    }

    function abrir(lista, indice = 0, opcoes = {}) {

        if (!lista || !lista.length) return;

        criarPlayer();

        fila = lista;

        semFilme = Boolean(opcoes.semFilme);

        ultimoFoco = document.activeElement;

        el.raiz.classList.toggle("sem-som", !somLigado);

        el.raiz.hidden = false;

        document.body.classList.add("edit-aberto");

        carregarNaTela(Math.min(Math.max(indice, 0), lista.length - 1));

        el.raiz.querySelector(".ep-fechar").focus({ preventScroll: true });

    }

    function fechar() {

        if (!el || el.raiz.hidden) return;

        const { video } = el;

        video.pause();

        // esvazia o src pra soltar a conexão e a memória
        video.removeAttribute("src");

        video.load();

        el.raiz.hidden = true;

        document.body.classList.remove("edit-aberto");

        fila = [];

        if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus({ preventScroll: true });

    }


    // =================================================
    // LIGAÇÃO COM O CATÁLOGO (assistidos.js)
    // =================================================

    function acharItem(id) {

        if (!id || typeof itensCache === "undefined") return null;

        return itensCache.find(
            item => String(item.id ?? item.titulo) === String(id)
        ) || null;

    }

    function detalhesDe(item) {

        if (!item || typeof abrirDetalhesAssistido !== "function") return;

        const notas =
            typeof lerNotasDoItem === "function"
                ? lerNotasDoItem(item)
                : { notaEu: 0, notaEla: 0 };

        abrirDetalhesAssistido(item, {
            notaEu: notas.notaEu,
            notaEla: notas.notaEla,
            notaMedia: 0,
            ehListaFutura: item.categoria === "queremos",
            ehContinuar: item.status === "assistindo" && item.categoria !== "queremos"
        });

    }

    function verOFilme() {

        const edit = fila[pos];

        const item = edit && acharItem(edit.assistidoId);

        if (!item) return;

        fechar();

        detalhesDe(item);

    }

    window.Edits = {
        carregar,
        doFilme,
        abrir,
        fechar,
        montarLista
    };

})();