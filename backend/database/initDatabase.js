const db = require("./database");

db.serialize(() => {

    // =====================================================
    // SETTINGS
    // =====================================================

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


    // =====================================================
    // TIMELINE
    // =====================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS timeline (

            id TEXT PRIMARY KEY,

            titulo TEXT NOT NULL,

            data TEXT NOT NULL,

            hora TEXT DEFAULT '',

            resumo TEXT DEFAULT '',

            descricao TEXT DEFAULT '',

            foto TEXT DEFAULT '',

            tipo TEXT DEFAULT '',

            categoria TEXT DEFAULT '',

            sugeridoPor TEXT DEFAULT '',

            ordem INTEGER DEFAULT 0,

            ativo INTEGER DEFAULT 1

        )
    `);


    // =====================================================
    // DADOS INICIAIS DA TIMELINE
    // =====================================================

    db.run(`
        INSERT OR IGNORE INTO timeline (

            id,
            titulo,
            data,
            hora,
            resumo,
            descricao,
            foto,
            tipo,
            categoria,
            sugeridoPor,
            ordem,
            ativo

        )

        VALUES

        (
            'inicio-namoro',
            'O início do nosso namoro',
            '2025-08-05',
            '',
            'O dia em que começamos a nossa história juntos.',
            'Escreva aqui os detalhes desse dia especial.',
            '',
            'Marco',
            'Relacionamento',
            '',
            1,
            1
        ),

        (
            'primeira-ligacao',
            'Nossa primeira ligação',
            '2025-08-05',
            '',
            'No mesmo dia, nossa primeira conversa por chamada.',
            'Escreva aqui como foi essa primeira ligação.',
            '',
            'Momento',
            'Relacionamento',
            '',
            2,
            1
        ),

        (
            'primeiro-jogo-tower-of-hell',
            'Nosso primeiro jogo: Tower of Hell',
            '2025-08-15',
            '',
            'Sugerido por ela, nosso primeiro jogo juntos no Roblox.',
            'Escreva aqui como foi jogar Tower of Hell juntos pela primeira vez.',
            'assets/images/timeline/tower-of-hell.jpg',
            'Jogo',
            'Roblox',
            'ela',
            3,
            1
        ),

        (
            'primeiro-jogo-altitorture',
            'Nosso primeiro jogo: Altitorture',
            '2025-08-16',
            '',
            'Sugerido por mim, outro jogo especial dessa fase inicial.',
            'Escreva aqui como foi jogar Altitorture juntos.',
            'assets/images/timeline/altitorture.jpg',
            'Jogo',
            'Roblox',
            'mim',
            4,
            1
        ),

        (
            'um-ano-namoro',
            '1 ano de namoro',
            '2026-08-05',
            '',
            'Completamos nosso primeiro ano juntos.',
            'Escreva aqui sobre esse marco especial.',
            '',
            'Marco',
            'Relacionamento',
            '',
            5,
            1
        ),

        (
            'primeiro-encontro-presencial',
            'Nosso primeiro encontro',
            '2026-12-01',
            '',
            'O dia em que finalmente vamos nos encontrar pessoalmente.',
            'Um momento que estamos esperando com muita ansiedade e amor.',
            '',
            'Sonho',
            'Futuro',
            '',
            6,
            1
        )

    `);

});