const db = require("./database");

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS settings (

            id INTEGER PRIMARY KEY,

            tituloSite TEXT,
            nome1 TEXT,
            nome2 TEXT,
            frase TEXT,

            corPrincipal TEXT,
            corFundo TEXT,

            intensidadeBrilho INTEGER,
            quantidadeEstrelas INTEGER,
            volumeMusica INTEGER

        )
    `);


    // ==========================================
    // GARANTE QUE OS CAMPOS EXISTAM
    // ==========================================

    const colunas = [

        ["tituloSite", "TEXT"],
        ["nome1", "TEXT"],
        ["nome2", "TEXT"],
        ["frase", "TEXT"],

        ["corPrincipal", "TEXT"],
        ["corFundo", "TEXT"],

        ["intensidadeBrilho", "INTEGER"],
        ["quantidadeEstrelas", "INTEGER"],
        ["volumeMusica", "INTEGER"]

    ];


    db.all(
        "PRAGMA table_info(settings)",
        (err, rows) => {

            if (err) {

                console.error(
                    "Erro ao verificar tabela settings:",
                    err
                );

                return;
            }


            const existentes =
                rows.map(coluna => coluna.name);


            colunas.forEach(([nome, tipo]) => {

                if (!existentes.includes(nome)) {

                    db.run(`
                        ALTER TABLE settings
                        ADD COLUMN ${nome} ${tipo}
                    `);

                }

            });


            // ==========================================
            // GARANTE QUE EXISTE O REGISTRO ID 1
            // ==========================================

            db.run(`
                INSERT OR IGNORE INTO settings (

                    id,
                    tituloSite,
                    nome1,
                    nome2,
                    frase,

                    corPrincipal,
                    corFundo,

                    intensidadeBrilho,
                    quantidadeEstrelas,
                    volumeMusica

                )

                VALUES (

                    1,
                    'Nosso Universo',
                    '',
                    '',
                    'Um universo criado dos nossos momentos, para lembrarmos juntos, para sempre.',

                    '#c9a7f5',
                    '#0a0a1a',

                    50,
                    100,
                    30

                )
            `);

        }
    );

});