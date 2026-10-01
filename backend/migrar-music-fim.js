const db = require("./database/database");

db.run(
    `ALTER TABLE music ADD COLUMN fimSegundos INTEGER DEFAULT 0`,
    (err) => {
        if (err) console.log("fimSegundos:", err.message);
        else console.log("✅ Coluna fimSegundos adicionada");
    }
