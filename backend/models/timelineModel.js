const db = require("../database/database");


// =====================================================
// BUSCAR TIMELINE
// =====================================================

function getTimeline(admin = false) {

    return new Promise((resolve, reject) => {

        let sql = `
            SELECT *
            FROM timeline
        `;

        if (!admin) {

            sql += `
                WHERE ativo = 1
            `;

        }

        sql += `
            ORDER BY ordem ASC
        `;


        db.all(sql, (err, rows) => {

            if (err) {

                reject(err);

            } else {

                resolve(rows);

            }

        });

    });

}


// =====================================================
// BUSCAR UM ITEM
// =====================================================

function getTimelineItem(id) {

    return new Promise((resolve, reject) => {

        db.get(
            `
                SELECT *
                FROM timeline
                WHERE id = ?
            `,
            [id],

            (err, row) => {

                if (err) {

                    reject(err);

                } else {

                    resolve(row);

                }

            }
        );

    });

}


// =====================================================
// CRIAR
// =====================================================

function createTimelineItem(data) {

    return new Promise((resolve, reject) => {

        db.run(

            `
                INSERT INTO timeline (

                    id,
                    titulo,
                    data,
                    hora,
                    resumo,
                    descricao,
                    foto,
                    tipo,
                    categoria,
                    sugeridoPor,
                    ordem,
                    ativo

                )

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,

            [
                data.id,
                data.titulo,
                data.data,
                data.hora || "",
                data.resumo || "",
                data.descricao || "",
                data.foto || "",
                data.tipo || "",
                data.categoria || "",
                data.sugeridoPor || "",
                data.ordem || 999999,
                data.ativo ? 1 : 0
            ],

            function (err) {

                if (err) {

                    reject(err);

                } else {

                    resolve({
                        id: data.id
                    });

                }

            }

        );

    });

}


// =====================================================
// ATUALIZAR
// =====================================================

function updateTimelineItem(id, data) {

    return new Promise((resolve, reject) => {

        db.run(

            `
                UPDATE timeline

                SET

                    titulo = ?,
                    data = ?,
                    hora = ?,
                    resumo = ?,
                    descricao = ?,
                    foto = ?,
                    tipo = ?,
                    categoria = ?,
                    sugeridoPor = ?,
                    ativo = ?

                WHERE id = ?
            `,

            [
                data.titulo,
                data.data,
                data.hora || "",
                data.resumo || "",
                data.descricao || "",
                data.foto || "",
                data.tipo || "",
                data.categoria || "",
                data.sugeridoPor || "",
                data.ativo ? 1 : 0,
                id
            ],

            function (err) {

                if (err) {

                    reject(err);

                } else {

                    resolve();

                }

            }

        );

    });

}


// =====================================================
// EXCLUIR
// =====================================================

function deleteTimelineItem(id) {

    return new Promise((resolve, reject) => {

        db.run(

            `
                DELETE FROM timeline
                WHERE id = ?
            `,

            [id],

            function (err) {

                if (err) {

                    reject(err);

                } else {

                    resolve();

                }

            }

        );

    });

}


// =====================================================
// REORDENAR
// =====================================================

function reorderTimeline(ids) {

    return new Promise((resolve, reject) => {

        if (!Array.isArray(ids)) {

            return reject(
                new Error("Lista de IDs inválida.")
            );

        }


        db.serialize(() => {

            const stmt = db.prepare(`
                UPDATE timeline
                SET ordem = ?
                WHERE id = ?
            `);


            ids.forEach((id, index) => {

                stmt.run(
                    index + 1,
                    id
                );

            });


            stmt.finalize((err) => {

                if (err) {

                    reject(err);

                } else {

                    resolve();

                }

            });

        });

    });

}


module.exports = {

    getTimeline,

    getTimelineItem,

    createTimelineItem,

    updateTimelineItem,

    deleteTimelineItem,

    reorderTimeline

};