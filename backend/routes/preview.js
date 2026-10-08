const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();

// =====================================================
// CAMINHOS
// =====================================================

const DATA_PATH = path.join(
    __dirname,
    "..",
    "..",
    "assets",
    "data",
    "preview.json"
);

const IMAGES_DIR = path.join(
    __dirname,
    "..",
    "..",
    "assets",
    "images",
    "preview"
);

const VIDEOS_DIR = path.join(
    __dirname,
    "..",
    "..",
    "assets",
    "videos",
    "preview"
);

// =====================================================
// GARANTIR PASTAS
// =====================================================

fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR, { recursive: true });

// =====================================================
// MULTER — CAPAS (imagens)
// =====================================================

const storageImagem = multer.diskStorage({

    destination: (req, file, callback) => {
        callback(null, IMAGES_DIR);
    },

    filename: (req, file, callback) => {

        let extensao =
            path.extname(file.originalname).toLowerCase();

        if (!extensao) {

            const extensoesPorMime = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/webp": ".webp",
                "image/gif": ".gif"
            };

            extensao =
                extensoesPorMime[file.mimetype] || ".jpg";
        }

        callback(null, `preview-capa-${Date.now()}${extensao}`);
    }

});

const uploadImagem = multer({

    storage: storageImagem,

    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },

    fileFilter: (req, file, callback) => {

        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (tiposPermitidos.includes(file.mimetype)) {
            return callback(null, true);
        }

        console.log("Imagem recusada:", {
            nome: file.originalname,
            tipo: file.mimetype
        });

        return callback(
            new Error("Formato de imagem não permitido.")
        );
    }

});

// =====================================================
// MULTER — VÍDEOS
// =====================================================

const LIMITE_VIDEO_MB = 100;

const storageVideo = multer.diskStorage({

    destination: (req, file, callback) => {
        callback(null, VIDEOS_DIR);
    },

    filename: (req, file, callback) => {

        let extensao =
            path.extname(file.originalname).toLowerCase();

        if (!extensao) {

            const extensoesPorMime = {
                "video/mp4": ".mp4",
                "video/webm": ".webm",
                "video/quicktime": ".mov"
            };

            extensao =
                extensoesPorMime[file.mimetype] || ".mp4";
        }

        callback(null, `preview-video-${Date.now()}${extensao}`);
    }

});

const uploadVideo = multer({

    storage: storageVideo,

    limits: {
        fileSize: LIMITE_VIDEO_MB * 1024 * 1024
    },

    fileFilter: (req, file, callback) => {

        const tiposPermitidos = [
            "video/mp4",
            "video/webm",
            "video/quicktime"
        ];

        if (tiposPermitidos.includes(file.mimetype)) {
            return callback(null, true);
        }

        console.log("Vídeo recusado:", {
            nome: file.originalname,
            tipo: file.mimetype
        });

        return callback(
            new Error("Formato de vídeo não permitido. Use MP4.")
        );
    }

});

// =====================================================
// LER JSON
// =====================================================

function lerPreview() {

    try {

        if (!fs.existsSync(DATA_PATH)) {
            fs.writeFileSync(DATA_PATH, "[]", "utf8");
        }

        const conteudo =
            fs.readFileSync(DATA_PATH, "utf8");

        return JSON.parse(conteudo || "[]");

    }

    catch (erro) {

        console.error("Erro lendo preview.json:", erro);

        return [];

    }

}

// =====================================================
// GET
// =====================================================

router.get("/", (req, res) => {

    res.json(lerPreview());

});

// =====================================================
// SALVAR / SINCRONIZAR
// =====================================================

router.post("/", (req, res) => {

    try {

        const itens = req.body;

        if (!Array.isArray(itens)) {

            return res.status(400).json({
                erro: "Os dados precisam ser um array."
            });

        }

        fs.writeFileSync(
            DATA_PATH,
            JSON.stringify(itens, null, 4),
            "utf8"
        );

        res.json({
            sucesso: true,
            mensagem: "Preview sincronizado com sucesso.",
            total: itens.length
        });

    }

    catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: "Erro ao salvar o Preview."
        });

    }

});

// =====================================================
// UPLOAD DA CAPA
// =====================================================

router.post(
    "/upload-imagem",
    uploadImagem.single("imagem"),
    (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({
                    erro: "Nenhuma imagem enviada."
                });

            }

            res.json({
                sucesso: true,
                caminho: `assets/images/preview/${req.file.filename}`
            });

        }

        catch (erro) {

            console.error(erro);

            res.status(500).json({
                erro: "Erro ao salvar a capa."
            });

        }

    }
);

// =====================================================
// UPLOAD DO VÍDEO
// =====================================================

router.post(
    "/upload-video",
    uploadVideo.single("video"),
    (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({
                    erro: "Nenhum vídeo enviado."
                });

            }

            res.json({
                sucesso: true,
                caminho: `assets/videos/preview/${req.file.filename}`
            });

        }

        catch (erro) {

            console.error(erro);

            res.status(500).json({
                erro: "Erro ao salvar o vídeo."
            });

        }

    }
);

// =====================================================
// TRATAMENTO DE ERRO DO MULTER
// =====================================================

router.use((erro, req, res, next) => {

    console.error("Erro no upload:", erro);

    let mensagem =
        erro.message || "Erro ao processar upload.";

    if (erro.code === "LIMIT_FILE_SIZE") {

        mensagem =
            `Arquivo grande demais (limite de ${LIMITE_VIDEO_MB} MB para vídeo e 10 MB para imagem).`;

    }

    res.status(400).json({
        erro: mensagem
    });

});

module.exports = router;