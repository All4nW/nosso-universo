const db = require("./database/database");

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS galeria_pastas (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            capa TEXT,
            ordem INTEGER DEFAULT 999999,
            ativo INTEGER DEFAULT 1
        )
    `, (err) => {
        if (err) console.log("pastas:", err.message);
        else console.log("✅ Tabela galeria_pastas criada");
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS galeria_fotos (
            id TEXT PRIMARY KEY,
            pastaId TEXT NOT NULL,
            imagem TEXT NOT NULL,
            data TEXT,
            descricao TEXT,
            ordem INTEGER DEFAULT 999999,
            ativo INTEGER DEFAULT 1
        )
    `, (err) => {
        if (err) console.log("fotos:", err.message);
        else console.log("✅ Tabela galeria_fotos criada");
    });

});