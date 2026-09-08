const db = require("../database/database");


// ===== MIGRAÇÃO: coluna "plataforma" em galeria_fotos =====
// Roda toda vez que o servidor sobe. Se a coluna já existe,
// o SQLite retorna erro "duplicate column name" — ignoramos
// esse erro específico, é só sinal de que já foi aplicada antes.

db.run(
    `ALTER TABLE galeria_fotos ADD COLUMN plataforma TEXT DEFAULT ''`,
    (err) => {

        if (
            err &&
            !String(err.message).includes("duplicate column")
        ) {

            console.error(
                "Erro ao adicionar coluna 'plataforma':",
                err
            );

        }

    }
);


// ===== PASTAS =====

function getPastas(admin = false) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM galeria_pastas`;
        if (!admin) sql += ` WHERE ativo = 1`;
        sql += ` ORDER BY ordem ASC`;

        db.all(sql, (err, rows) => err ? reject(err) : resolve(rows));
    });
}

function getPasta(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM galeria_pastas WHERE id = ?`, [id],
            (err, row) => err ? reject(err) : resolve(row));
    });
}

function createPasta(data) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO galeria_pastas (id, nome, capa, ordem, ativo) VALUES (?, ?, ?, ?, ?)`,
            [data.id, data.nome, data.capa || "", data.ordem || 999999, data.ativo ? 1 : 0],
            (err) => err ? reject(err) : resolve({ id: data.id })
        );
    });
}

function updatePasta(id, data) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE galeria_pastas SET nome = ?, capa = ?, ativo = ? WHERE id = ?`,
            [data.nome, data.capa, data.ativo ? 1 : 0, id],
            (err) => err ? reject(err) : resolve()
        );
    });
}

function deletePasta(id) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`DELETE FROM galeria_fotos WHERE pastaId = ?`, [id]);
            db.run(`DELETE FROM galeria_pastas WHERE id = ?`, [id],
                (err) => err ? reject(err) : resolve());
        });
    });
}

function reorderPastas(ids) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const stmt = db.prepare(`UPDATE galeria_pastas SET ordem = ? WHERE id = ?`);
            ids.forEach((id, i) => stmt.run(i + 1, id));
            stmt.finalize((err) => err ? reject(err) : resolve());
        });
    });
}


// ===== FOTOS =====

function getFotos(pastaId, admin = false) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM galeria_fotos WHERE pastaId = ?`;
        if (!admin) sql += ` AND ativo = 1`;
        sql += ` ORDER BY ordem ASC, data ASC`;

        db.all(sql, [pastaId], (err, rows) => err ? reject(err) : resolve(rows));
    });
}

function getFoto(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM galeria_fotos WHERE id = ?`, [id],
            (err, row) => err ? reject(err) : resolve(row));
    });
}

function createFoto(data) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO galeria_fotos (id, pastaId, imagem, data, descricao, plataforma, ordem, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.id,
                data.pastaId,
                data.imagem,
                data.data || "",
                data.descricao || "",
                data.plataforma || "",
                data.ordem || 999999,
                data.ativo ? 1 : 0
            ],
            (err) => err ? reject(err) : resolve({ id: data.id })
        );
    });
}

function updateFoto(id, data) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE galeria_fotos SET pastaId = ?, imagem = ?, data = ?, descricao = ?, plataforma = ?, ativo = ? WHERE id = ?`,
            [
                data.pastaId,
                data.imagem,
                data.data,
                data.descricao,
                data.plataforma || "",
                data.ativo ? 1 : 0,
                id
            ],
            (err) => err ? reject(err) : resolve()
        );
    });
}

function deleteFoto(id) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM galeria_fotos WHERE id = ?`, [id],
            (err) => err ? reject(err) : resolve());
    });
}

function reorderFotos(ids) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const stmt = db.prepare(`UPDATE galeria_fotos SET ordem = ? WHERE id = ?`);
            ids.forEach((id, i) => stmt.run(i + 1, id));
            stmt.finalize((err) => err ? reject(err) : resolve());
        });
    });
}


module.exports = {
    getPastas, getPasta, createPasta, updatePasta, deletePasta, reorderPastas,
    getFotos, getFoto, createFoto, updateFoto, deleteFoto, reorderFotos
};