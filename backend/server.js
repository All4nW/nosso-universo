const express = require("express");
const cors = require("cors");
const path = require("path");

require("./database/initDatabase");

const settingsRoutes =
    require("./routes/settings");

const adminRoutes =
    require("./routes/admin");

const timelineRoutes =
    require("./routes/timeline");

const musicRoutes =
    require("./routes/music");

const galeriaRoutes = require("./routes/galeria");

const hubRoutes = require("./routes/hub");

const assistidosRoutes =
require("./routes/assistidos");


const app =
    express();


const PORT = 3000;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(
    express.json()
);


// =====================================================
// UPLOADS
// =====================================================

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "uploads"
        )
    )
);

// =====================================================
// ASSETS
// =====================================================

app.use(
    "/assets",
    express.static(
        path.join(
            __dirname,
            "..",
            "assets"
        )
    )
);

// =====================================================
// ROTAS
// =====================================================

app.use(
    "/admin",
    adminRoutes
);


app.use(
    "/api/settings",
    settingsRoutes
);


app.use(
    "/api/timeline",
    timelineRoutes
);


app.use(
    "/api/music",
    musicRoutes
);

app.use("/api/galeria", galeriaRoutes);

app.use("/api/hub", hubRoutes);

app.use("/api/assistidos", assistidosRoutes);



// =====================================================
// TESTE
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.send(
            "Backend do Nosso Universo ❤️"
        );

    }
);


// =====================================================
// SERVIDOR
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            `❤️ Servidor rodando em http://localhost:${PORT}`
        );

    }
);