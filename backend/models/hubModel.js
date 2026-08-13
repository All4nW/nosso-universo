const db = require("../database/database");

function getCards(admin = false) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM hub_cards`;
        if (!admin) sql += ` WHERE ativo = 1`;
        sql += ` ORDER BY ordem ASC`;
        db.all(sql, (err, rows) => err ? reject(err) : resolve(rows));
    });
}

function getCard(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM hub_cards WHERE id = ?`, [id],
            (err, row) => err ? reject(err) : resolve(row));
    });
}

function createCard(data) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO hub_cards (id, titulo, descricao, link, imagem1, imagem2, imagem3, ordem, ativo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.id, data.titulo, data.descricao || "", data.link,
             data.imagem1 || "", data.imagem2 || "", data.imagem3 || "",
             data.ordem || 999999, data.ativo ? 1 : 0],
            (err) => err ? reject(err) : resolve({ id: data.id })
        );
    });
}

function updateCard(id, data) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE hub_cards SET titulo = ?, descricao = ?, link = ?,
             imagem1 = ?, imagem2 = ?, imagem3 = ?, ativo = ? WHERE id = ?`,
            [data.titulo, data.descricao, data.link,
             data.imagem1, data.imagem2, data.imagem3, data.ativo ? 1 : 0, id],
            (err) => err ? reject(err) : resolve()
        );
    });
}

function deleteCard(id) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM hub_cards WHERE id = ?`, [id],
            (err) => err ? reject(err) : resolve());
    });
}

function reorderCards(ids) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const stmt = db.prepare(`UPDATE hub_cards SET ordem = ? WHERE id = ?`);
            ids.forEach((id, i) => stmt.run(i + 1, id));
            stmt.finalize((err) => err ? reject(err) : resolve());
        });
    });
}

module.exports = { getCards, getCard, createCard, updateCard, deleteCard, reorderCards };