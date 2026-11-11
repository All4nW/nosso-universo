(function () {

    const MIDIAS_API = "http://localhost:3000/api/midias";
    const MB10 = 10 * 1024 * 1024;

    const ROTULOS = {
        galeria: "🖼 Galeria",
        timeline: "📅 Timeline",
        assistidos: "🎬 Assistidos",
        hub: "🌌 Hub",
        letters: "💌 Cartas",
        "sobre-nos": "💗 Sobre Nós",
        preview: "🎞 Preview",
        salinha: "🏠 Salinha",
        "perfil-decoracoes": "✨ Decorações de perfil",
        soltas: "📄 Arquivos soltos"
    };

    let midias = [];
    let marcados = new Set();
    let itensLixeira = [];
    let marcadosLixeira = new Set();
    let corpos = {};
    const abertos = new Set(["__perdidos__"]);

    const $ = (id) => document.getElementById(id);

    function esc(texto) {
        return String(texto ?? "")
            .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function mb(bytes) {
        return (bytes / 1048576).toFixed(1).replace(".", ",") + " MB";
    }

    function rotulo(topico) {
        return ROTULOS[topico] || `📁 ${topico}`;
    }

    function urlArquivo(caminho) {
        return "http://localhost:3000/" + encodeURI(caminho);
    }

    const ehVideo = (n) => /\.(mp4|webm|mov)$/i.test(n);
    const ehAudio = (n) => /\.(mp3|wav|ogg|m4a)$/i.test(n);

    function status(texto, tipo) {
        const el = $("midias-status");
        if (!el) return;
        el.textContent = texto || "";
        el.className = "midias-status " + (tipo || "");
    }

    function perdidos() {
        return midias.filter((m) => !m.emUso);
    }


    // ---------- miniaturas e linhas ----------

    function miniatura(m) {
        if (ehAudio(m.nome)) {
            return '<div class="midias-thumb midias-thumb-icone">🎵</div>';
        }
        if (ehVideo(m.nome)) {
            return `<video class="midias-thumb" src="${esc(urlArquivo(m.caminho))}" muted preload="metadata" playsinline></video>`;
        }
        return `<img class="midias-thumb" loading="lazy" src="${esc(urlArquivo(m.caminho))}" alt="">`;
    }

    function linhaEmUso(m) {
        const meta = m.protegido
            ? "🔒 carregado por código (protegido)"
            : "usado em: " + (m.usadoEm.length ? m.usadoEm.map(esc).join(", ") : "—");

        return `
            <div class="midias-linha">
                <div class="midias-info">
                    <span class="midias-nome" title="${esc(m.caminho)}">${esc(m.caminho.replace(/^assets\//, ""))}</span>
                    <span class="midias-meta">${meta}</span>
                </div>
                <span class="midias-tamanho ${m.tamanho > MB10 ? "midias-pesado" : ""}">${mb(m.tamanho)}</span>
            </div>`;
    }

    function linhaPerdida(m) {
        return `
            <label class="midias-linha midias-linha-perdida">
                <input type="checkbox" class="midias-cb" data-caminho="${esc(m.caminho)}" ${marcados.has(m.caminho) ? "checked" : ""}>
                ${miniatura(m)}
                <div class="midias-info">
                    <span class="midias-nome" title="${esc(m.caminho)}">${esc(m.caminho.replace(/^assets\//, ""))}</span>
                    <span class="midias-meta">${rotulo(m.topico)}</span>
                </div>
                <span class="midias-tamanho ${m.tamanho > MB10 ? "midias-pesado" : ""}">${mb(m.tamanho)}</span>
            </label>`;
    }


    // ---------- corpos dos tópicos ----------

    function corpoPerdidos() {
        const lista = perdidos().sort(
            (a, b) => a.topico.localeCompare(b.topico) || b.tamanho - a.tamanho
        );

        if (!lista.length) {
            return '<div class="midias-vazio">Nenhum arquivo perdido 🎉</div>';
        }

        return `
            <div class="midias-barra">
                <button type="button" class="settings-botao settings-botao-secundario" data-acao="marcar-todos">Marcar todos</button>
                <button type="button" class="settings-botao settings-botao-secundario" data-acao="desmarcar">Desmarcar</button>
                <button type="button" class="settings-botao settings-botao-primario" data-acao="mover" id="midias-btn-mover">🗑 Mover marcados para a lixeira (${marcados.size})</button>
            </div>
            ${lista.map(linhaPerdida).join("")}`;
    }

    function corpoPesados() {
        return [...midias]
            .sort((a, b) => b.tamanho - a.tamanho)
            .slice(0, 15)
            .map(linhaEmUso)
            .join("");
    }

    function corpoTopico(topico) {
        return midias
            .filter((m) => m.emUso && m.topico === topico)
            .sort((a, b) => b.tamanho - a.tamanho)
            .map(linhaEmUso)
            .join("");
    }

    function detalhes(chave, titulo, extra, classe, fnCorpo) {
        corpos[chave] = fnCorpo;
        const aberto = abertos.has(chave);

        return `
            <details class="midias-topico ${classe || ""}" data-chave="${esc(chave)}" ${aberto ? 'open data-pronto="1"' : ""}>
                <summary><span>${titulo}</span><span class="midias-extra">${extra}</span></summary>
                <div class="midias-corpo">${aberto ? fnCorpo() : ""}</div>
            </details>`;
    }


    // ---------- render geral ----------

    function render() {
        const cont = $("midias-topicos");
        if (!cont) return;

        corpos = {};

        const lost = perdidos();
        const total = midias.reduce((s, m) => s + m.tamanho, 0);
        const totalLost = lost.reduce((s, m) => s + m.tamanho, 0);

        const resumo = $("midias-resumo");
        if (resumo) {
            resumo.textContent =
                `${midias.length} arquivos · ${mb(total)} no total · ` +
                `${lost.length} perdido(s) (${mb(totalLost)})`;
        }

        const grupos = {};
        midias.filter((m) => m.emUso).forEach((m) => {
            (grupos[m.topico] = grupos[m.topico] || []).push(m);
        });

        let html = detalhes(
            "__perdidos__",
            "⚠️ Perdidos — não usados em nenhum lugar",
            `${lost.length} arquivo(s) · ${mb(totalLost)}`,
            "midias-topico-alerta",
            corpoPerdidos
        );

        html += detalhes(
            "__pesados__",
            "⚖️ Mais pesados",
            "top 15",
            "",
            corpoPesados
        );

        Object.keys(grupos)
            .sort((a, b) =>
                grupos[b].reduce((s, m) => s + m.tamanho, 0) -
                grupos[a].reduce((s, m) => s + m.tamanho, 0)
            )
            .forEach((topico) => {
                const soma = grupos[topico].reduce((s, m) => s + m.tamanho, 0);
                html += detalhes(
                    "t:" + topico,
                    rotulo(topico),
                    `${grupos[topico].length} em uso · ${mb(soma)}`,
                    "",
                    () => corpoTopico(topico)
                );
            });

        cont.innerHTML = html;
    }


    // ---------- ações ----------

    async function escanear() {
        status("🔍 Escaneando...", "carregando");

        try {
            const resposta = await fetch(MIDIAS_API);
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

            const dados = await resposta.json();
            midias = dados.midias || [];
            marcados.clear();

            render();
            status("", "");
        } catch (erro) {
            console.error("[MIDIAS] Erro ao escanear:", erro);
            status("❌ Não consegui escanear. O servidor está ligado e com a rota /api/midias adicionada?", "erro");
        }
    }

    async function moverMarcados() {
        const lista = [...marcados];

        if (!lista.length) {
            alert("Marque pelo menos um arquivo.");
            return;
        }

        if (!confirm(`Mover ${lista.length} arquivo(s) para a lixeira? Dá para restaurar depois.`)) return;

        try {
            const resposta = await fetch(`${MIDIAS_API}/lixeira`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caminhos: lista })
            });

            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

            const r = await resposta.json();

            await escanear();

            let msg = `✅ ${r.movidos} arquivo(s) movidos para a lixeira. Agora faça git add -A, commit e push.`;
            if (r.recusados && r.recusados.length) {
                msg += ` (${r.recusados.length} recusado(s): estavam em uso ou protegidos)`;
            }
            status(msg, "ok");
        } catch (erro) {
            console.error("[MIDIAS] Erro ao mover:", erro);
            status("❌ Não foi possível mover os arquivos.", "erro");
        }
    }


    // ---------- lixeira ----------

    function renderLixeira() {
        const el = $("midias-lixeira");
        if (!el) return;

        if (!itensLixeira.length) {
            el.innerHTML = '<div class="midias-vazio">A lixeira do gerenciador está vazia.</div>';
            return;
        }

        el.innerHTML = `
            <div class="midias-barra">
                <button type="button" class="settings-botao settings-botao-primario" data-acao="restaurar">♻️ Restaurar marcados</button>
                <button type="button" class="settings-botao settings-botao-secundario" data-acao="esvaziar">🔥 Esvaziar (apagar de vez)</button>
            </div>
            ${itensLixeira.map((i) => `
                <label class="midias-linha">
                    <input type="checkbox" class="midias-cb-lixeira" data-guardado="${esc(i.guardado)}" ${marcadosLixeira.has(i.guardado) ? "checked" : ""}>
                    <div class="midias-info">
                        <span class="midias-nome" title="${esc(i.original)}">${esc(i.original.replace(/^assets\//, ""))}</span>
                        <span class="midias-meta">movido em ${esc(new Date(i.em).toLocaleString("pt-BR"))}</span>
                    </div>
                    <span class="midias-tamanho">${mb(i.tamanho)}</span>
                </label>`).join("")}`;
    }

    async function carregarLixeira() {
        try {
            const resposta = await fetch(`${MIDIAS_API}/lixeira`);
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

            itensLixeira = (await resposta.json()).itens || [];
            marcadosLixeira.clear();
            renderLixeira();
        } catch (erro) {
            console.error("[MIDIAS] Erro ao ler a lixeira:", erro);
            status("❌ Não consegui ler a lixeira.", "erro");
        }
    }

    async function alternarLixeira() {
        const el = $("midias-lixeira");
        if (!el) return;

        const abrir = el.style.display === "none";
        el.style.display = abrir ? "block" : "none";

        if (abrir) await carregarLixeira();
    }

    async function restaurarMarcados() {
        const lista = [...marcadosLixeira];

        if (!lista.length) {
            alert("Marque pelo menos um arquivo.");
            return;
        }

        try {
            const resposta = await fetch(`${MIDIAS_API}/restaurar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guardados: lista })
            });

            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

            const r = await resposta.json();

            await carregarLixeira();
            await escanear();

            let msg = `✅ ${r.restaurados} arquivo(s) restaurados.`;
            if (r.recusados && r.recusados.length) {
                msg += ` ${r.recusados.length} não deu: ${r.recusados.map((x) => x.motivo).join("; ")}.`;
            }
            status(msg, "ok");
        } catch (erro) {
            console.error("[MIDIAS] Erro ao restaurar:", erro);
            status("❌ Não foi possível restaurar.", "erro");
        }
    }

    async function esvaziarLixeira() {
        if (!itensLixeira.length) return;

        if (!confirm(`Apagar DE VEZ ${itensLixeira.length} arquivo(s)? Isso não tem volta.`)) return;

        try {
            const resposta = await fetch(`${MIDIAS_API}/lixeira`, { method: "DELETE" });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

            await carregarLixeira();
            status("✅ Lixeira esvaziada.", "ok");
        } catch (erro) {
            console.error("[MIDIAS] Erro ao esvaziar:", erro);
            status("❌ Não foi possível esvaziar a lixeira.", "erro");
        }
    }


    // ---------- init ----------

    window.iniciarGerenciadorMidias = function () {
        const cont = $("midias-topicos");
        if (!cont) return;

        $("midias-btn-escanear").onclick = escanear;
        $("midias-btn-lixeira").onclick = alternarLixeira;

        // abre o tópico: monta o conteúdo só quando abrir (evita carregar centenas de miniaturas)
        cont.addEventListener("toggle", (event) => {
            const det = event.target;
            if (!det.matches || !det.matches("details.midias-topico")) return;

            const chave = det.dataset.chave;

            if (det.open) {
                abertos.add(chave);

                if (!det.dataset.pronto && corpos[chave]) {
                    det.querySelector(".midias-corpo").innerHTML = corpos[chave]();
                    det.dataset.pronto = "1";
                }
            } else {
                abertos.delete(chave);
            }
        }, true);

        cont.addEventListener("click", (event) => {
            const botao = event.target.closest("[data-acao]");
            if (!botao) return;

            if (botao.dataset.acao === "marcar-todos") {
                perdidos().forEach((m) => marcados.add(m.caminho));
                cont.querySelectorAll(".midias-cb").forEach((cb) => { cb.checked = true; });
                atualizarBotaoMover();
            }

            if (botao.dataset.acao === "desmarcar") {
                marcados.clear();
                cont.querySelectorAll(".midias-cb").forEach((cb) => { cb.checked = false; });
                atualizarBotaoMover();
            }

            if (botao.dataset.acao === "mover") moverMarcados();
        });

        cont.addEventListener("change", (event) => {
            const cb = event.target.closest(".midias-cb");
            if (!cb) return;

            if (cb.checked) marcados.add(cb.dataset.caminho);
            else marcados.delete(cb.dataset.caminho);

            atualizarBotaoMover();
        });

        const lixeira = $("midias-lixeira");

        lixeira.addEventListener("click", (event) => {
            const botao = event.target.closest("[data-acao]");
            if (!botao) return;

            if (botao.dataset.acao === "restaurar") restaurarMarcados();
            if (botao.dataset.acao === "esvaziar") esvaziarLixeira();
        });

        lixeira.addEventListener("change", (event) => {
            const cb = event.target.closest(".midias-cb-lixeira");
            if (!cb) return;

            if (cb.checked) marcadosLixeira.add(cb.dataset.guardado);
            else marcadosLixeira.delete(cb.dataset.guardado);
        });

        escanear();
    };

    function atualizarBotaoMover() {
        const botao = $("midias-btn-mover");
        if (botao) botao.textContent = `🗑 Mover marcados para a lixeira (${marcados.size})`;
    }


    // ---------- seções recolhíveis da página de Configurações ----------

    window.iniciarSecoesRecolhiveis = function () {
        document.querySelectorAll(".settings-grid > .settings-card").forEach((card) => {
            const cabecalho = card.querySelector(":scope > .settings-card-header");
            const corpo = card.querySelector(":scope > .settings-card-corpo");

            if (!cabecalho || !corpo) return;

            const titulo = (card.querySelector(".settings-card-titulo")?.textContent || "").trim();
            const chave = "adminSecaoAberta:" + titulo;

            let aberta = false;
            try { aberta = localStorage.getItem(chave) === "1"; } catch (_) {}

            cabecalho.classList.add("secao-cabecalho");
            card.classList.toggle("secao-fechada", !aberta);

            cabecalho.addEventListener("click", () => {
                const fechada = card.classList.toggle("secao-fechada");
                try { localStorage.setItem(chave, fechada ? "0" : "1"); } catch (_) {}
            });
        });
    };

})();