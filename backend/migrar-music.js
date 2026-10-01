const db = require("./database/database");

db.serialize(() => {

    db.run(
        `
            CREATE TABLE IF NOT EXISTS music (

                id TEXT PRIMARY KEY,
                titulo TEXT NOT NULL,
                arquivo TEXT NOT NULL,
                inicioSegundos INTEGER DEFAULT 0,
                volume INTEGER DEFAULT 80,
                ordem INTEGER DEFAULT 999999,
                ativo INTEGER DEFAULT 1

            )
        `,
        (err) => {
            if (err) console.log("Erro ao criar tabela music:", err.message);
            else console.log("✅ Tabela music criada");
        }
    );

});