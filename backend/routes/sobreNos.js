const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Mesmo lugar onde o exportarGaleria grava o galeria.json
const arquivo = path.join(__dirname, "../../assets/data/sobre-nos.json");


// LER
router.get("/", (req, res) => {
    try {
        if (!fs.existsSync(arquivo)) {
            return res.json({ categorias: [] });
        }

        res.json(JSON.parse(fs.readFileSync(arquivo, "utf-8")));
    } catch (err) {
        console.error("Erro GET sobre-nos:", err);
        res.status(500).json({ error: "Erro ao ler Sobre Nós." });
    }
});


// GRAVAR (o admin manda tudo de uma vez, ao clicar em Sincronizar)
router.put("/", (req, res) => {
    try {
        const categorias = req.body && req.body.categorias;

        if (!Array.isArray(categorias)) {
            return res.status(400).json({ error: "Formato inválido." });
        }

        fs.mkdirSync(path.dirname(arquivo), { recursive: true });

        fs.writeFileSync(
            arquivo,
            JSON.stringify({ categorias }, null, 2),
            "utf-8"
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Erro PUT sobre-nos:", err);
        res.status(500).json({ error: "Erro ao gravar Sobre Nós." });
    }
});


module.exports = router;