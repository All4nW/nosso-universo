const db = require("./database/database");

db.run(
    `UPDATE hub_cards
     SET imagem1 = REPLACE(imagem1, '/assets-legado/', 'assets/')
     WHERE imagem1 LIKE '/assets-legado/%'`,
    function (err) {
        if (err) console.error(err);
        else console.log(`✅ ${this.changes} card(s) corrigido(s)`);
    }
);