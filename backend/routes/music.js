const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const controller =
    require("../controllers/musicController");

const router =
    express.Router();


// =====================================================
// UPLOAD
// =====================================================

const pastaUpload =
    path.join(
        __dirname,
        "../uploads/music"
    );


if (!fs.existsSync(pastaUpload)) {

    fs.mkdirSync(
        pastaUpload,
        {
            recursive: true
        }
    );

}


// =====================================================
// MULTER
// =====================================================

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {

            cb(
                null,
                pastaUpload
            );

        },


        filename: (
            req,
            file,
            cb
        ) => {

            const extensao =
                path.extname(
                    file.originalname
                );


            const nome =
                `${Date.now()}-${Math.round(Math.random() * 1E9)}${extensao}`;


            cb(
                null,
                nome
            );

        }

    });


const upload =
    multer({

        storage,

        limits: {

            fileSize:
                20 * 1024 * 1024

        }

    });


// =====================================================
// ROTAS
// =====================================================

router.get(
    "/",
    controller.getMusic
);


router.post(
    "/",
    upload.single("arquivo"),
    controller.createMusic
);


router.put(
    "/reordenar",
    controller.reorderMusic
);


router.put(
    "/:id",
    upload.single("arquivo"),
    controller.updateMusic
);


router.delete(
    "/:id",
    controller.deleteMusic
);


module.exports = router;