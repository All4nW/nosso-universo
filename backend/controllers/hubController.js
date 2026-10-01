const Hub = require("../models/hubModel");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

exports.getCards = async (req, res) => {
    try {
        const admin = req.query.admin === "true";
        res.json(await Hub.getCards(admin));
    } catch (err) {
        console.error("Erro GET hub cards:", err);
        res.status(500).json({ error: "Erro ao buscar cards." });
    }
};

exports.createCard = async (req, res) => {
    try {
        if (!req.body.titulo || !req.body.link) {
            return res.status(400).json({ error: "Título e link são obrigatórios." });
        }

        const id = crypto.randomUUID();
        const files = req.files || {};

        const imagem1 = files.imagem1 ? `/uploads/hub/${files.imagem1[0].filename}` : "";
        const imagem2 = files.imagem2 ? `/uploads/hub/${files.imagem2[0].filename}` : "";
        const imagem3 = files.imagem3 ? `/uploads/hub/${files.imagem3[0].filename}` : "";

        await Hub.createCard({
            id,
            titulo: req.body.titulo,
            descricao: req.body.descricao || "",
            link: req.body.link,
            imagem1, imagem2, imagem3,
            ordem: 999999,
            ativo: req.body.ativo !== "false"
        });

        res.json({ success: true, id });
    } catch (err) {
        console.error("Erro CREATE hub card:", err);
        res.status(500).json({ error: err.message || "Erro ao criar card." });
    }
};

exports.updateCard = async (req, res) => {
    try {
        const atual = await Hub.getCard(req.params.id);
        if (!atual) return res.status(404).json({ error: "Card não encontrado." });

        const files = req.files || {};

        const imagem1 = files.imagem1 ? `/uploads/hub/${files.imagem1[0].filename}` : atual.imagem1;
        const imagem2 = files.imagem2 ? `/uploads/hub/${files.imagem2[0].filename}` : atual.imagem2;
        const imagem3 = files.imagem3 ? `/uploads/hub/${files.imagem3[0].filename}` : atual.imagem3;

        await Hub.updateCard(req.params.id, {
            titulo: req.body.titulo,
            descricao: req.body.descricao || "",
            link: req.body.link,
            imagem1, imagem2, imagem3,
            ativo: req.body.ativo !== "false"
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Erro UPDATE hub card:", err);
        res.status(500).json({ error: err.message || "Erro ao atualizar card." });
    }
};

exports.deleteCard = async (req, res) => {
    try {
        await Hub.deleteCard(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro DELETE hub card:", err);
        res.status(500).json({ error: "Erro ao excluir card." });
    }
};

exports.reorderCards = async (req, res) => {
    try {
        await Hub.reorderCards(req.body.ids);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro REORDER hub cards:", err);
        res.status(500).json({ error: "Erro ao reordenar cards." });
    }
};

exports.exportarHub = async (req, res) => {
    try {
        const cards = await Hub.getCards(false);

        const pastaDestino = path.join(__dirname, "../../assets/images/hub");
        if (!fs.existsSync(pastaDestino)) fs.mkdirSync(pastaDestino, { recursive: true });

        function copiarECaminhoLocal(caminhoOriginal) {
            if (!caminhoOriginal) return "";
            if (!caminhoOriginal.startsWith("/uploads/hub/")) return caminhoOriginal;

            const nomeArquivo = path.basename(caminhoOriginal);
            const origem = path.join(__dirname, "../uploads/hub", nomeArquivo);
            const destino = path.join(pastaDestino, nomeArquivo);

            if (fs.existsSync(origem)) fs.copyFileSync(origem, destino);

            return `assets/images/hub/${nomeArquivo}`;
        }

        const dadosExportados = cards.map((card) => ({
            id: card.id,
            titulo: card.titulo,
            descricao: card.descricao || "",
            link: card.link,
            imagem1: copiarECaminhoLocal(card.imagem1),
            imagem2: copiarECaminhoLocal(card.imagem2),
            imagem3: copiarECaminhoLocal(card.imagem3)
        }));

        const caminhoDestino = path.join(__dirname, "../../assets/data/hub.json");
        fs.writeFileSync(caminhoDestino, JSON.stringify(dadosExportados, null, 2), "utf-8");

        res.json({ success: true, quantidade: dadosExportados.length });
    } catch (err) {
        console.error("Erro ao exportar Hub:", err);
        res.status(500).json({ error: "Erro ao exportar hub." });
    }
};