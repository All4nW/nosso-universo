const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const caminhoBanco = path.join(
    __dirname,
    "nosso-universo.db"
);

const db = new sqlite3.Database(
    caminhoBanco,
    (err) => {

        if (err) {

            console.error(
                "❌ Erro ao conectar ao SQLite:",
                err.message
            );

        } else {

            console.log(
                "✅ Banco SQLite conectado ❤️"
            );

        }

    }
);

module.exports = db;