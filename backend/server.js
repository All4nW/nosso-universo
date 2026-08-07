const express = require("express");

const db = require("./database/database");

require("./database/initDatabase");

const cors = require("cors");

const settingsRoutes = require("./routes/settings");

const adminRoutes = require("./routes/admin");

const app = express();

app.use(cors());

const PORT = 3000;

app.use(express.json());

app.use("/admin", adminRoutes);

app.use("/api/settings", settingsRoutes);

app.get("/", (req, res) => {
    res.send("Backend do Nosso Universo ❤️");
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

