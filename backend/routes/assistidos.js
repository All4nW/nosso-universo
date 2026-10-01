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
    "assistidos.json"
);

const IMAGES_DIR = path.join(
    __dirname,
    "..",
    "..",
    "assets",
    "images",
    "assistidos"
);

// =====================================================
// GARANTIR PASTAS
// =====================================================

fs.mkdirSync(
    path.dirname(DATA_PATH),
    {
        recursive: true
    }
);

fs.mkdirSync(
    IMAGES_DIR,
    {
        recursive: true
    }
);

// =====================================================
// MULTER
// =====================================================

const storage = multer.diskStorage({

    destination: (req, file, callback) => {

        callback(
            null,
            IMAGES_DIR
        );

    },

    filename: (req, file, callback) => {

        let extensao =
            path.extname(
                file.originalname
            ).toLowerCase();

        // Caso o arquivo venha sem extensão,
        // tenta descobrir pelo MIME type.
        if (!extensao) {

            const extensoesPorMime = {

                "image/jpeg": ".jpg",

                "image/png": ".png",

                "image/webp": ".webp",

                "image/gif": ".gif"

            };

            extensao =
                extensoesPorMime[
                    file.mimetype
                ] || ".jpg";
        }

        const nome =
            `assistido-${Date.now()}${extensao}`;

        callback(
            null,
            nome
        );

    }

});

// =====================================================
// FILTRO DE IMAGEM
// =====================================================

const upload = multer({

    storage,

    limits: {

        fileSize:
            10 * 1024 * 1024

    },

    fileFilter: (req, file, callback) => {

        const tiposPermitidos = [

            "image/jpeg",

            "image/png",

            "image/webp",

            "image/gif"

        ];

        if (
            tiposPermitidos.includes(
                file.mimetype
            )
        ) {

            return callback(
                null,
                true
            );

        }

        console.log(
            "Imagem recusada:",
            {
                nome:
                    file.originalname,

                tipo:
                    file.mimetype
            }
        );

        return callback(
            new Error(
                "Formato de imagem não permitido."
            )
        );

    }

});

// =====================================================
// LER JSON
// =====================================================

function lerAssistidos() {

    try {

        if (
            !fs.existsSync(
                DATA_PATH
            )
        ) {

            fs.writeFileSync(
                DATA_PATH,
                "[]",
                "utf8"
            );

        }

        const conteudo =
            fs.readFileSync(
                DATA_PATH,
                "utf8"
            );

        return JSON.parse(
            conteudo || "[]"
        );

    }

    catch (erro) {

        console.error(
            "Erro lendo assistidos:",
            erro
        );

        return [];

    }

}

// =====================================================
// GET
// =====================================================

router.get(
    "/",
    (req, res) => {

        res.json(
            lerAssistidos()
        );

    }
);

// =====================================================
// SALVAR / SINCRONIZAR
// =====================================================

router.post(
    "/",
    (req, res) => {

        try {

            const itens =
                req.body;

            if (
                !Array.isArray(
                    itens
                )
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Os dados precisam ser um array."

                    });

            }

            fs.writeFileSync(

                DATA_PATH,

                JSON.stringify(
                    itens,
                    null,
                    4
                ),

                "utf8"

            );

            res.json({

                sucesso: true,

                mensagem:
                    "Assistidos sincronizados com sucesso.",

                total:
                    itens.length

            });

        }

        catch (erro) {

            console.error(
                erro
            );

            res
                .status(500)
                .json({

                    erro:
                        "Erro ao salvar assistidos."

                });

        }

    }
);

// =====================================================
// UPLOAD DA CAPA
// =====================================================

router.post(
    "/upload",
    upload.single("imagem"),
    (req, res) => {

        try {

            if (!req.file) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Nenhuma imagem enviada."

                    });

            }

            const caminho =
    `assets/images/assistidos/${req.file.filename}`;

            res.json({

                sucesso: true,

                caminho

            });

        }

        catch (erro) {

            console.error(
                erro
            );

            res
                .status(500)
                .json({

                    erro:
                        "Erro ao salvar imagem."

                });

        }

    }
);

// =====================================================
// TRATAMENTO DE ERRO DO MULTER
// =====================================================

router.use(
    (erro, req, res, next) => {

        console.error(
            "Erro no upload:",
            erro
        );

        res
            .status(400)
            .json({

                erro:
                    erro.message ||
                    "Erro ao processar upload."

            });

    }
);

module.exports = router;