const Timeline =
    require("../models/timelineModel");

const crypto =
    require("crypto");

const fs = require("fs");
const path = require("path");


// =====================================================
// GET
// =====================================================

exports.getTimeline = async (req, res) => {

    try {

        const admin =
            req.query.admin === "true";


        const dados =
            await Timeline.getTimeline(admin);


        res.json(dados);

    }

    catch (err) {

        console.error(
            "Erro GET Timeline:",
            err
        );


        res.status(500).json({

            error:
                "Erro ao buscar timeline."

        });

    }

};


// =====================================================
// CRIAR
// =====================================================

exports.createTimeline = async (req, res) => {

    try {

        if (
            !req.body.titulo ||
            !req.body.data
        ) {

            return res.status(400).json({

                error:
                    "Título e data são obrigatórios."

            });

        }


        const id =
            crypto.randomUUID();


        const foto =
            req.file
                ? `/uploads/timeline/${req.file.filename}`
                : "";


        const dados = {

            id,

            titulo:
                req.body.titulo,

            data:
                req.body.data,

            hora:
                req.body.hora || "",

            resumo:
                req.body.resumo || "",

            descricao:
                req.body.descricao || "",

            foto,

            tipo:
                req.body.tipo || "",

            categoria:
                req.body.categoria || "",

            sugeridoPor:
                req.body.sugeridoPor || "",

            ordem:
                999999,

            ativo:
                req.body.ativo !== "false"

        };


        await Timeline.createTimelineItem(
            dados
        );


        res.json({

            success: true,

            id

        });

    }

    catch (err) {

        console.error(
            "Erro CREATE Timeline:",
            err
        );


        res.status(500).json({

            error:
                err.message ||
                "Erro ao criar momento."

        });

    }

};


// =====================================================
// ATUALIZAR
// =====================================================

exports.updateTimeline = async (req, res) => {

    try {

        const atual =
            await Timeline.getTimelineItem(
                req.params.id
            );


        if (!atual) {

            return res.status(404).json({

                error:
                    "Momento não encontrado."

            });

        }


        const foto =
            req.file
                ? `/uploads/timeline/${req.file.filename}`
                : atual.foto || "";


        const dados = {

            titulo:
                req.body.titulo,

            data:
                req.body.data,

            hora:
                req.body.hora || "",

            resumo:
                req.body.resumo || "",

            descricao:
                req.body.descricao || "",

            foto,

            tipo:
                req.body.tipo || "",

            categoria:
                req.body.categoria || "",

            sugeridoPor:
                req.body.sugeridoPor || "",

            ativo:
                req.body.ativo !== "false"

        };


        await Timeline.updateTimelineItem(
            req.params.id,
            dados
        );


        res.json({

            success: true

        });

    }

    catch (err) {

        console.error(
            "Erro UPDATE Timeline:",
            err
        );


        res.status(500).json({

            error:
                err.message ||
                "Erro ao atualizar momento."

        });

    }

};


// =====================================================
// EXCLUIR
// =====================================================

exports.deleteTimeline = async (req, res) => {

    try {

        await Timeline.deleteTimelineItem(
            req.params.id
        );


        res.json({

            success: true

        });

    }

    catch (err) {

        console.error(
            "Erro DELETE Timeline:",
            err
        );


        res.status(500).json({

            error:
                "Erro ao excluir momento."

        });

    }

};


// =====================================================
// REORDENAR
// =====================================================

exports.reorderTimeline = async (req, res) => {

    try {

        await Timeline.reorderTimeline(
            req.body.ids
        );


        res.json({

            success: true

        });

    }

    catch (err) {

        console.error(
            "Erro REORDER Timeline:",
            err
        );


        res.status(500).json({

            error:
                "Erro ao reordenar timeline."

        });

    }

};


// =====================================================
// EXPORTAR PARA O SITE (gera o timeline.json estático)
// =====================================================

exports.exportarTimeline = async (req, res) => {

    try {

        const itens =
            await Timeline.getTimeline(false); // só os ativos


        const dadosExportados =
            itens.map((item) => ({

                id: item.id,
                titulo: item.titulo,
                data: item.data,
                hora: item.hora || undefined,
                resumo: item.resumo,
                descricao: item.descricao,
                sugeridoPor: item.sugeridoPor || undefined,

                dataExibicao:
                    item.temDataExata === 0
                        ? item.dataTexto
                        : undefined,

                fotos:
                    item.foto ? [item.foto] : []

            }));


        const caminhoDestino =
            path.join(
                __dirname,
                "../../assets/data/timeline.json"
            );


        fs.writeFileSync(
            caminhoDestino,
            JSON.stringify(dadosExportados, null, 2),
            "utf-8"
        );


        res.json({

            success: true,

            quantidade:
                dadosExportados.length

        });

    }

    catch (err) {

        console.error(
            "Erro ao exportar Timeline:",
            err
        );


        res.status(500).json({

            error:
                "Erro ao exportar timeline."

        });

    }

};