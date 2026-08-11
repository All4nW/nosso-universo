const Galeria = require("../models/galeriaModel");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");


// ===== PASTAS =====

exports.getPastas = async (req, res) => {
    try {
        const admin = req.query.admin === "true";
        res.json(await Galeria.getPastas(admin));
    } catch (err) {
        console.error("Erro GET pastas:", err);
        res.status(500).json({ error: "Erro ao buscar pastas." });
    }
};

exports.createPasta = async (req, res) => {
    try {
        if (!req.body.nome) {
            return res.status(400).json({ error: "Nome é obrigatório." });
        }

        const id = crypto.randomUUID();
        const capa = req.file ? `/uploads/galeria/${req.file.filename}` : "";

        await Galeria.createPasta({
            id, nome: req.body.nome, capa,
            ordem: 999999, ativo: req.body.ativo !== "false"
        });

        res.json({ success: true, id });
    } catch (err) {
        console.error("Erro CREATE pasta:", err);
        res.status(500).json({ error: err.message || "Erro ao criar pasta." });
    }
};

exports.updatePasta = async (req, res) => {
    try {
        const atual = await Galeria.getPasta(req.params.id);
        if (!atual) return res.status(404).json({ error: "Pasta não encontrada." });

        const capa = req.file ? `/uploads/galeria/${req.file.filename}` : atual.capa;

        await Galeria.updatePasta(req.params.id, {
            nome: req.body.nome, capa, ativo: req.body.ativo !== "false"
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Erro UPDATE pasta:", err);
        res.status(500).json({ error: err.message || "Erro ao atualizar pasta." });
    }
};

exports.deletePasta = async (req, res) => {
    try {
        await Galeria.deletePasta(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro DELETE pasta:", err);
        res.status(500).json({ error: "Erro ao excluir pasta." });
    }
};

exports.reorderPastas = async (req, res) => {
    try {
        await Galeria.reorderPastas(req.body.ids);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro REORDER pastas:", err);
        res.status(500).json({ error: "Erro ao reordenar pastas." });
    }
};


// ===== FOTOS =====

exports.getFotos = async (req, res) => {
    try {
        const admin = req.query.admin === "true";
        const pastaId = req.query.pastaId;

        if (!pastaId) return res.status(400).json({ error: "pastaId é obrigatório." });

        res.json(await Galeria.getFotos(pastaId, admin));
    } catch (err) {
        console.error("Erro GET fotos:", err);
        res.status(500).json({ error: "Erro ao buscar fotos." });
    }
};

exports.createFoto = async (req, res) => {
    try {
        if (!req.body.pastaId || !req.file) {
            return res.status(400).json({ error: "Pasta e imagem são obrigatórias." });
        }

        const id = crypto.randomUUID();
        const imagem = `/uploads/galeria/${req.file.filename}`;

        await Galeria.createFoto({
            id,
            pastaId: req.body.pastaId,
            imagem,
            data: req.body.data || "",
            descricao: req.body.descricao || "",
            ordem: 999999,
            ativo: req.body.ativo !== "false"
        });

        res.json({ success: true, id });
    } catch (err) {
        console.error("Erro CREATE foto:", err);
        res.status(500).json({ error: err.message || "Erro ao criar foto." });
    }
};

exports.updateFoto = async (req, res) => {
    try {
        const atual = await Galeria.getFoto(req.params.id);
        if (!atual) return res.status(404).json({ error: "Foto não encontrada." });

        const imagem = req.file ? `/uploads/galeria/${req.file.filename}` : atual.imagem;

        await Galeria.updateFoto(req.params.id, {
            pastaId: req.body.pastaId || atual.pastaId,
            imagem,
            data: req.body.data || "",
            descricao: req.body.descricao || "",
            ativo: req.body.ativo !== "false"
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Erro UPDATE foto:", err);
        res.status(500).json({ error: err.message || "Erro ao atualizar foto." });
    }
};

exports.deleteFoto = async (req, res) => {
    try {
        await Galeria.deleteFoto(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro DELETE foto:", err);
        res.status(500).json({ error: "Erro ao excluir foto." });
    }
};

exports.reorderFotos = async (req, res) => {
    try {
        await Galeria.reorderFotos(req.body.ids);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro REORDER fotos:", err);
        res.status(500).json({ error: "Erro ao reordenar fotos." });
    }
};


// ===== EXPORTAR =====

exports.exportarGaleria = async (req, res) => {
    try {
        const pastas = await Galeria.getPastas(false);

        const pastaDestinoImagens = path.join(__dirname, "../../assets/images/galeria");
        if (!fs.existsSync(pastaDestinoImagens)) {
            fs.mkdirSync(pastaDestinoImagens, { recursive: true });
        }

        // Copia um arquivo de backend/uploads/galeria para assets/images/galeria,
        // e devolve o novo caminho relativo (ou o caminho original, se já for estático).
        function copiarECaminhoLocal(caminhoOriginal) {
            if (!caminhoOriginal) return "";

            if (!caminhoOriginal.startsWith("/uploads/galeria/")) {
                // Já é um caminho estático (ex: assets/images/...) — mantém como está.
                return caminhoOriginal;
            }

            const nomeArquivo = path.basename(caminhoOriginal);
            const origem = path.join(__dirname, "../uploads/galeria", nomeArquivo);
            const destino = path.join(pastaDestinoImagens, nomeArquivo);

            if (fs.existsSync(origem)) {
                fs.copyFileSync(origem, destino);
            }

            return `assets/images/galeria/${nomeArquivo}`;
        }

        const dadosExportados = [];

        for (const pasta of pastas) {
            const fotos = await Galeria.getFotos(pasta.id, false);

            dadosExportados.push({
                id: pasta.id,
                nome: pasta.nome,
                capa: copiarECaminhoLocal(pasta.capa),
                fotos: fotos.map(f => ({
                    data: f.data,
                    imagem: copiarECaminhoLocal(f.imagem),
                    descricao: f.descricao || ""
                }))
            });
        }

        const caminhoDestino = path.join(__dirname, "../../assets/data/galeria.json");
        fs.writeFileSync(caminhoDestino, JSON.stringify(dadosExportados, null, 2), "utf-8");

        res.json({ success: true, quantidade: dadosExportados.length });
    } catch (err) {
        console.error("Erro ao exportar Galeria:", err);
        res.status(500).json({ error: "Erro ao exportar galeria." });
    }
};