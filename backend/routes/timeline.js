const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const controller =
    require("../controllers/timelineController");

const router =
    express.Router();


// =====================================================
// UPLOAD
// =====================================================

const pastaUpload =
    path.join(
        __dirname,
        "../uploads/timeline"
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
                10 * 1024 * 1024

        }

    });


// =====================================================
// ROTAS
// =====================================================

router.get(
    "/",
    controller.getTimeline
);


router.post(
    "/",
    upload.single("foto"),
    controller.createTimeline
);


router.put(
    "/reordenar",
    controller.reorderTimeline
);


router.put(
    "/:id",
    upload.single("foto"),
    controller.updateTimeline
);


router.delete(
    "/:id",
    controller.deleteTimeline
);


module.exports = router;