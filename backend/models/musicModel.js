const db = require("../database/database");


// =====================================================
// BUSCAR TODAS
// =====================================================

function getMusic(admin = false) {

    return new Promise((resolve, reject) => {

        let sql = `
            SELECT *
            FROM music
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
// BUSCAR UMA
// =====================================================

function getMusicItem(id) {

    return new Promise((resolve, reject) => {

        db.get(
            `
                SELECT *
                FROM music
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

function createMusicItem(data) {

    return new Promise((resolve, reject) => {

        db.run(

            `
                INSERT INTO music (

                    id,
                    titulo,
                    arquivo,
                    inicioSegundos,
                    volume,
                    ordem,
                    ativo

                )

                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,

            [
                data.id,
                data.titulo,
                data.arquivo,
                data.inicioSegundos || 0,
                data.volume || 80,
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

function updateMusicItem(id, data) {

    return new Promise((resolve, reject) => {

        db.run(

            `
                UPDATE music

                SET

                    titulo = ?,
                    arquivo = ?,
                    inicioSegundos = ?,
                    volume = ?,
                    ativo = ?

                WHERE id = ?
            `,

            [
                data.titulo,
                data.arquivo,
                data.inicioSegundos || 0,
                data.volume || 80,
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

function deleteMusicItem(id) {

    return new Promise((resolve, reject) => {

        db.run(

            `
                DELETE FROM music
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

function reorderMusic(ids) {

    return new Promise((resolve, reject) => {

        if (!Array.isArray(ids)) {

            return reject(
                new Error("Lista de IDs inválida.")
            );

        }


        db.serialize(() => {

            const stmt = db.prepare(`
                UPDATE music
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

    getMusic,

    getMusicItem,

    createMusicItem,

    updateMusicItem,

    deleteMusicItem,

    reorderMusic

};