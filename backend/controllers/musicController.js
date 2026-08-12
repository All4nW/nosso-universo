const Music =
    require("../models/musicModel");

const crypto =
    require("crypto");

const fs = require("fs");
const path = require("path");


// =====================================================
// GET
// =====================================================

exports.getMusic = async (req, res) => {

    try {

        const admin =
            req.query.admin === "true";


        const dados =
            await Music.getMusic(admin);


        res.json(dados);

    }

    catch (err) {

        console.error(
            "Erro GET Music:",
            err
        );


        res.status(500).json({

            error:
                "Erro ao buscar músicas."

        });

    }

};


// =====================================================
// CRIAR
// =====================================================

exports.createMusic = async (req, res) => {

    try {

        if (
            !req.body.titulo ||
            !req.file
        ) {

            return res.status(400).json({

                error:
                    "Título e arquivo de áudio são obrigatórios."

            });

        }


        const id =
            crypto.randomUUID();


        const arquivo =
            `/uploads/music/${req.file.filename}`;


        const dados = {

            id,

            titulo:
                req.body.titulo,

            arquivo,

            inicioSegundos:
                Number(req.body.inicioSegundos) || 0,

            fimSegundos:
                Number(req.body.fimSegundos) || 0,

            volume:
                Number(req.body.volume) || 80,

            ordem:
                999999,

            ativo:
                req.body.ativo !== "false"

        };


        await Music.createMusicItem(
            dados
        );


        res.json({

            success: true,

            id

        });

    }

    catch (err) {

        console.error(
            "Erro CREATE Music:",
            err
        );


        res.status(500).json({

            error:
                err.message ||
                "Erro ao criar música."

        });

    }

};


// =====================================================
// ATUALIZAR
// =====================================================

exports.updateMusic = async (req, res) => {

    try {

        const atual =
            await Music.getMusicItem(
                req.params.id
            );


        if (!atual) {

            return res.status(404).json({

                error:
                    "Música não encontrada."

            });

        }


        const arquivo =
            req.file
                ? `/uploads/music/${req.file.filename}`
                : atual.arquivo;


        const dados = {

            titulo:
                req.body.titulo,

            arquivo,

            inicioSegundos:
                Number(req.body.inicioSegundos) || 0,

            fimSegundos:
                Number(req.body.fimSegundos) || 0,

            volume:
                Number(req.body.volume) || 80,

            ativo:
                req.body.ativo !== "false"

        };


        await Music.updateMusicItem(
            req.params.id,
            dados
        );


        res.json({

            success: true

        });

    }

    catch (err) {

        console.error(
            "Erro UPDATE Music:",
            err
        );


        res.status(500).json({

            error:
                err.message ||
                "Erro ao atualizar música."

        });

    }

};


// =====================================================
// EXPORTAR PARA O SITE (gera o music.json estático)
// =====================================================

exports.exportarMusic = async (req, res) => {

    try {

        const itens =
            await Music.getMusic(false); // só as ativas


        const pastaDestinoAudio =
            path.join(__dirname, "../../assets/audio");

        if (!fs.existsSync(pastaDestinoAudio)) {
            fs.mkdirSync(pastaDestinoAudio, { recursive: true });
        }


        // Copia um arquivo de backend/uploads/music para assets/audio,
        // e devolve o novo caminho relativo (ou o original, se já for estático).
        function copiarECaminhoLocal(caminhoOriginal) {

            if (!caminhoOriginal) return "";

            if (!caminhoOriginal.startsWith("/uploads/music/")) {
                return caminhoOriginal;
            }

            const nomeArquivo = path.basename(caminhoOriginal);
            const origem = path.join(__dirname, "../uploads/music", nomeArquivo);
            const destino = path.join(pastaDestinoAudio, nomeArquivo);

            if (fs.existsSync(origem)) {
                fs.copyFileSync(origem, destino);
            }

            return `assets/audio/${nomeArquivo}`;

        }


        const dadosExportados =
            itens.map((item) => ({

                id: item.id,
                titulo: item.titulo,
                arquivo: copiarECaminhoLocal(item.arquivo),
                inicioSegundos: item.inicioSegundos || 0,
                fimSegundos: item.fimSegundos || 0,
                volume: item.volume || 80

            }));


        const caminhoDestino =
            path.join(__dirname, "../../assets/data/music.json");


        fs.writeFileSync(
            caminhoDestino,
            JSON.stringify(dadosExportados, null, 2),
            "utf-8"
        );


        res.json({
            success: true,
            quantidade: dadosExportados.length
        });

    }

    catch (err) {

        console.error("Erro ao exportar Music:", err);

        res.status(500).json({
            error: "Erro ao exportar músicas."
        });

    }

};


// =====================================================
// EXCLUIR
// =====================================================

exports.deleteMusic = async (req, res) => {

    try {

        await Music.deleteMusicItem(
            req.params.id
        );


        res.json({

            success: true

        });

    }

    catch (err) {

        console.error(
            "Erro DELETE Music:",
            err
        );


        res.status(500).json({

            error:
                "Erro ao excluir música."

        });

    }

};


// =====================================================
// REORDENAR
// =====================================================

exports.reorderMusic = async (req, res) => {

    try {

        await Music.reorderMusic(
            req.body.ids
        );


        res.json({

            success: true

        });

    }

    catch (err) {

        console.error(
            "Erro REORDER Music:",
            err
        );


        res.status(500).json({

            error:
                "Erro ao reordenar músicas."

        });

    }

};