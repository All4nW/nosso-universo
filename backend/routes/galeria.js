const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const controller = require("../controllers/galeriaController");
const router = express.Router();


const pastaUpload = path.join(__dirname, "../uploads/galeria");
if (!fs.existsSync(pastaUpload)) fs.mkdirSync(pastaUpload, { recursive: true });


const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, pastaUpload),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
    }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });


// EXPORTAR (antes das rotas dinâmicas)
router.get("/exportar", controller.exportarGaleria);

// PASTAS
router.get("/pastas", controller.getPastas);
router.post("/pastas", upload.single("capa"), controller.createPasta);
router.put("/pastas/reordenar", controller.reorderPastas);
router.put("/pastas/:id", upload.single("capa"), controller.updatePasta);
router.delete("/pastas/:id", controller.deletePasta);

// FOTOS
router.get("/fotos", controller.getFotos);
router.post("/fotos", upload.single("imagem"), controller.createFoto);
router.put("/fotos/reordenar", controller.reorderFotos);
router.put("/fotos/:id", upload.single("imagem"), controller.updateFoto);
router.delete("/fotos/:id", controller.deleteFoto);


// Middleware de erro — captura falhas do multer (ex: arquivo grande
// demais) e devolve JSON legível em vez do 500 genérico em HTML,
// que o fetch do admin não consegue interpretar.
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                error: "Arquivo muito grande. O limite atual é de 50MB."
            });
        }

        return res.status(400).json({
            error: `Erro no upload: ${err.message}`
        });

    }

    console.error("Erro não tratado nas rotas da Galeria:", err);
    res.status(500).json({ error: "Erro interno ao processar a requisição." });
});


module.exports = router;