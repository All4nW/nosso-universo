const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database/nosso-universo.db", (err) => {

    if (err) {
        console.error("Erro ao conectar ao banco:", err.message);
    } else {
        console.log("✅ Banco SQLite conectado.");
    }

});

module.exports = db;