const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const controller = require("../controllers/hubController");
const router = express.Router();

const pastaUpload = path.join(__dirname, "../uploads/hub");
if (!fs.existsSync(pastaUpload)) fs.mkdirSync(pastaUpload, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, pastaUpload),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
    }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const uploadCampos = upload.fields([
    { name: "imagem1", maxCount: 1 },
    { name: "imagem2", maxCount: 1 },
    { name: "imagem3", maxCount: 1 }
]);

router.get("/exportar", controller.exportarHub);
router.get("/", controller.getCards);
router.post("/", uploadCampos, controller.createCard);
router.put("/reordenar", controller.reorderCards);
router.put("/:id", uploadCampos, controller.updateCard);
router.delete("/:id", controller.deleteCard);

module.exports = router;