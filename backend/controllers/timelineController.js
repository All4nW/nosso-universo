const Timeline =
    require("../models/timelineModel");

const crypto =
    require("crypto");


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