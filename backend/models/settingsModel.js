const db = require("../database/database");


function getSettings() {

    return new Promise((resolve, reject) => {

        db.get(

            "SELECT * FROM settings WHERE id = 1",

            (err, row) => {

                if (err) {

                    reject(err);

                } else {

                    resolve(row);

                }

            }

        );

    });

}



function saveSettings(data) {

    return new Promise((resolve, reject) => {

        db.run(

            `UPDATE settings

            SET

                tituloSite = ?,
                nome1 = ?,
                nome2 = ?,
                frase = ?,

                corPrincipal = ?,
                corFundo = ?,

                intensidadeBrilho = ?,
                quantidadeEstrelas = ?,
                volumeMusica = ?

            WHERE id = 1`,

            [

                data.tituloSite,
                data.nome1,
                data.nome2,
                data.frase,

                data.corPrincipal,
                data.corFundo,

                data.intensidadeBrilho,
                data.quantidadeEstrelas,
                data.volumeMusica

            ],

            function (err) {

                if (err) {

                    reject(err);

                } else {

                    resolve();

                }

            }

        );

    });

}



module.exports = {

    getSettings,
    saveSettings

};