const db = require("./database/database");

db.run(`
    CREATE TABLE IF NOT EXISTS hub_cards (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        descricao TEXT,
        link TEXT NOT NULL,
        imagem1 TEXT,
        imagem2 TEXT,
        imagem3 TEXT,
        ordem INTEGER DEFAULT 999999,
        ativo INTEGER DEFAULT 1
    )
`, (err) => {
    if (err) console.log("hub_cards:", err.message);
    else console.log("✅ Tabela hub_cards criada");
});