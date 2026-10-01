const db = require("./database/database");
const crypto = require("crypto");

const cardsExistentes = [
    {
        titulo: "Timeline",
        descricao: "Nossa história, momento a momento.",
        link: "timeline",
        imagem1: "/assets-legado/images/hub/timeline.jpg"
    },
    {
        titulo: "Galeria",
        descricao: "Fotos, jogos, conversas, presentes.",
        link: "galeria",
        imagem1: "/assets-legado/images/hub/galeria.jpg"
    },
    {
        titulo: "Cartas",
        descricao: "Uma biblioteca de envelopes e palavras.",
        link: "cartas",
        imagem1: "/assets-legado/images/hub/cartas.jpg"
    },
    {
        titulo: "Momentos",
        descricao: "Pequenas histórias que marcaram a gente.",
        link: "momentos",
        imagem1: "/assets-legado/images/hub/momentos.jpg"
    },
    {
        titulo: "Nosso futuro",
        descricao: "Sonhos que ainda vamos viver juntos.",
        link: "futuro",
        imagem1: "/assets-legado/images/hub/futuro.jpg"
    },
    {
        titulo: "Céu Estrelado",
        descricao: "Cada estrela, uma memória nossa.",
        link: "estrelas",
        imagem1: "/assets-legado/images/hub/estrelas.jpg"
    }
];

db.serialize(() => {
    const stmt = db.prepare(`
        INSERT INTO hub_cards (id, titulo, descricao, link, imagem1, imagem2, imagem3, ordem, ativo)
        VALUES (?, ?, ?, ?, ?, '', '', ?, 1)
    `);

    cardsExistentes.forEach((card, indice) => {
        stmt.run(
            crypto.randomUUID(),
            card.titulo,
            card.descricao,
            card.link,
            card.imagem1,
            indice + 1
        );
    });

    stmt.finalize(() => {
        console.log("✅ 6 cards importados para o banco!");
    });
});