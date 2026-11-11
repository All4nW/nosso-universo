const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const RAIZ_PROJETO = path.join(__dirname, "..", "..");
const PASTA_ASSETS = path.join(RAIZ_PROJETO, "assets");
const LIXEIRA = path.join(__dirname, "..", "_lixeira", "gerenciador");
const INDICE = path.join(LIXEIRA, "indice.json");

// Arquivos dessas pastas são carregados por código (pelo nome),
// então o gerenciador nunca mexe neles.
const PROTEGIDAS = [
    "images/salinha/",
    "images/perfil-decoracoes/",
    "images/assistidos/icons/"
];

const EXT_MIDIA = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg",
    ".mp4", ".webm", ".mov", ".mp3", ".wav", ".ogg", ".m4a"
]);
const EXT_TEXTO = new Set([".json", ".html", ".js", ".css"]);

// pastas de assets/ que não são mídia
const IGNORAR_ASSETS = new Set(["css", "js", "fonts", "data"]);
// pastas que não entram na busca por referências
const PULAR_TEXTOS = new Set(["node_modules", ".git", "_lixeira", "uploads", "database", "images"]);

const paraBarras = (p) => p.split(path.sep).join("/");

function percorrer(dir, aoEncontrar, pular) {
    let itens;
    try {
        itens = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const item of itens) {
        const completo = path.join(dir, item.name);
        if (item.isDirectory()) {
            if (pular && pular(item.name, completo)) continue;
            percorrer(completo, aoEncontrar, pular);
        } else {
            aoEncontrar(completo);
        }
    }
}

function ehProtegido(relAssets) {
    return PROTEGIDAS.some((p) => relAssets.startsWith(p));
}

function topicoDe(relAssets) {
    const partes = relAssets.split("/");
    let t;
    if (partes[0] === "images") t = partes.length > 2 ? partes[1] : "soltas";
    else t = partes.length > 1 ? partes[0] : "soltas";
    return t === "timeline-uploads" ? "timeline" : t;
}

function listarMidias() {
    const midias = [];
    percorrer(
        PASTA_ASSETS,
        (arquivo) => {
            if (!EXT_MIDIA.has(path.extname(arquivo).toLowerCase())) return;
            const relAssets = paraBarras(path.relative(PASTA_ASSETS, arquivo));
            midias.push({
                relAssets,
                caminho: "assets/" + relAssets,
                tamanho: fs.statSync(arquivo).size
            });
        },
        (nome, completo) => IGNORAR_ASSETS.has(paraBarras(path.relative(PASTA_ASSETS, completo)))
    );
    return midias;
}

function carregarTextos() {
    const textos = [];
    percorrer(
        RAIZ_PROJETO,
        (arquivo) => {
            if (!EXT_TEXTO.has(path.extname(arquivo).toLowerCase())) return;
            try {
                if (fs.statSync(arquivo).size > 20 * 1024 * 1024) return;
                textos.push({
                    nome: paraBarras(path.relative(RAIZ_PROJETO, arquivo)),
                    conteudo: fs.readFileSync(arquivo, "utf8")
                });
            } catch { /* ignora arquivo ilegível */ }
        },
        (nome) => PULAR_TEXTOS.has(nome)
    );
    return textos;
}

// Em quais arquivos do site esse arquivo de mídia é citado?
function usadoEm(relAssets, textos) {
    const base = path.basename(relAssets);
    const chaves = [relAssets, encodeURI(relAssets)];
    const chavesBase = base.length >= 6 ? [base, encodeURI(base)] : [];
    const achou = [];

    for (const t of textos) {
        if (
            chaves.some((c) => t.conteudo.includes(c)) ||
            chavesBase.some((c) => t.conteudo.includes(c))
        ) {
            achou.push(t.nome);
        }
    }
    return achou;
}

// Valida o caminho vindo do painel (só mídia dentro de assets/, nunca protegida)
function resolverMidia(caminho) {
    if (typeof caminho !== "string" || !caminho.startsWith("assets/")) return null;

    const absoluto = path.resolve(RAIZ_PROJETO, caminho);
    const relAssets = paraBarras(path.relative(PASTA_ASSETS, absoluto));

    if (!relAssets || relAssets.startsWith("..") || path.isAbsolute(relAssets)) return null;
    if (IGNORAR_ASSETS.has(relAssets.split("/")[0])) return null;
    if (!EXT_MIDIA.has(path.extname(absoluto).toLowerCase())) return null;
    if (ehProtegido(relAssets)) return null;

    return { absoluto, relAssets };
}

function mover(origem, destino) {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    try {
        fs.renameSync(origem, destino);
    } catch {
        fs.copyFileSync(origem, destino);
        fs.unlinkSync(origem);
    }
}

function lerIndice() {
    try {
        return JSON.parse(fs.readFileSync(INDICE, "utf8"));
    } catch {
        return [];
    }
}

function gravarIndice(lista) {
    fs.mkdirSync(LIXEIRA, { recursive: true });
    fs.writeFileSync(INDICE, JSON.stringify(lista, null, 2), "utf8");
}


// ===== LISTAR TUDO =====

router.get("/", (req, res) => {
    try {
        const textos = carregarTextos();

        const midias = listarMidias().map((m) => {
            const protegido = ehProtegido(m.relAssets);
            const usos = protegido ? [] : usadoEm(m.relAssets, textos);

            return {
                caminho: m.caminho,
                nome: path.basename(m.relAssets),
                tamanho: m.tamanho,
                topico: topicoDe(m.relAssets),
                protegido,
                emUso: protegido || usos.length > 0,
                usadoEm: usos.slice(0, 3)
            };
        });

        res.json({ midias });
    } catch (err) {
        console.error("Erro ao listar mídias:", err);
        res.status(500).json({ error: "Erro ao escanear as mídias." });
    }
});


// ===== MOVER PARA A LIXEIRA =====

router.post("/lixeira", (req, res) => {
    try {
        const pedidos = Array.isArray(req.body.caminhos) ? req.body.caminhos : [];
        const textos = carregarTextos();
        const indice = lerIndice();

        const recusados = [];
        let movidos = 0;

        pedidos.forEach((caminho, i) => {
            const alvo = resolverMidia(caminho);

            if (!alvo || !fs.existsSync(alvo.absoluto)) {
                recusados.push({ caminho, motivo: "não encontrado ou protegido" });
                return;
            }

            // segurança: confere de novo se ainda não está em uso
            if (usadoEm(alvo.relAssets, textos).length) {
                recusados.push({ caminho, motivo: "está em uso" });
                return;
            }

            const guardado = `${Date.now()}-${i}-${path.basename(alvo.absoluto)}`;
            const tamanho = fs.statSync(alvo.absoluto).size;

            mover(alvo.absoluto, path.join(LIXEIRA, guardado));

            indice.push({
                guardado,
                original: caminho,
                tamanho,
                em: new Date().toISOString()
            });

            movidos++;
        });

        gravarIndice(indice);

        res.json({ success: true, movidos, recusados });
    } catch (err) {
        console.error("Erro ao mover para a lixeira:", err);
        res.status(500).json({ error: "Erro ao mover para a lixeira." });
    }
});


// ===== VER A LIXEIRA =====

router.get("/lixeira", (req, res) => {
    try {
        const itens = lerIndice().filter((i) => fs.existsSync(path.join(LIXEIRA, i.guardado)));
        res.json({ itens });
    } catch (err) {
        console.error("Erro ao ler a lixeira:", err);
        res.status(500).json({ error: "Erro ao ler a lixeira." });
    }
});


// ===== RESTAURAR =====

router.post("/restaurar", (req, res) => {
    try {
        const pedidos = Array.isArray(req.body.guardados) ? req.body.guardados : [];
        let indice = lerIndice();

        const recusados = [];
        let restaurados = 0;

        pedidos.forEach((guardado) => {
            const item = indice.find((i) => i.guardado === guardado);
            const origem = path.join(LIXEIRA, String(guardado));

            if (!item || !fs.existsSync(origem)) {
                recusados.push({ guardado, motivo: "não está na lixeira" });
                return;
            }

            const absoluto = path.resolve(RAIZ_PROJETO, item.original);
            const dentro = paraBarras(path.relative(PASTA_ASSETS, absoluto));

            if (dentro.startsWith("..") || path.isAbsolute(dentro)) {
                recusados.push({ guardado, motivo: "destino inválido" });
                return;
            }

            if (fs.existsSync(absoluto)) {
                recusados.push({ guardado, motivo: "já existe um arquivo no lugar de origem" });
                return;
            }

            mover(origem, absoluto);
            indice = indice.filter((i) => i.guardado !== guardado);
            restaurados++;
        });

        gravarIndice(indice);

        res.json({ success: true, restaurados, recusados });
    } catch (err) {
        console.error("Erro ao restaurar:", err);
        res.status(500).json({ error: "Erro ao restaurar." });
    }
});


// ===== ESVAZIAR (apaga de vez) =====

router.delete("/lixeira", (req, res) => {
    try {
        const indice = lerIndice();
        let apagados = 0;

        indice.forEach((i) => {
            const arquivo = path.join(LIXEIRA, i.guardado);
            try {
                if (fs.existsSync(arquivo)) {
                    fs.unlinkSync(arquivo);
                    apagados++;
                }
            } catch (e) {
                console.error("Erro ao apagar da lixeira:", e);
            }
        });

        gravarIndice([]);

        res.json({ success: true, apagados });
    } catch (err) {
        console.error("Erro ao esvaziar a lixeira:", err);
        res.status(500).json({ error: "Erro ao esvaziar a lixeira." });
    }
});

module.exports = router;