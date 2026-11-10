const fs = require("fs");
const path = require("path");

const RAIZ_BACKEND = path.join(__dirname, "..");
const PASTA_UPLOADS = path.join(RAIZ_BACKEND, "uploads");
const LIXEIRA = path.join(RAIZ_BACKEND, "_lixeira");

function moverParaLixeira(origem, subpasta) {
    try {
        if (!fs.existsSync(origem)) return false;

        const destinoDir = path.join(LIXEIRA, subpasta);
        fs.mkdirSync(destinoDir, { recursive: true });

        const destino = path.join(destinoDir, `${Date.now()}-${path.basename(origem)}`);

        try {
            fs.renameSync(origem, destino);
        } catch {
            fs.copyFileSync(origem, destino);
            fs.unlinkSync(origem);
        }
        return true;
    } catch (err) {
        console.error("Erro ao mover para a lixeira:", err);
        return false;
    }
}

// Recebe um caminho como "/uploads/galeria/abc.jpg" e move o arquivo para a lixeira.
function removerUpload(caminhoWeb) {
    if (!caminhoWeb || !caminhoWeb.startsWith("/uploads/")) return;

    const absoluto = path.join(RAIZ_BACKEND, caminhoWeb);

    // segurança: só mexe dentro de backend/uploads
    if (!absoluto.startsWith(PASTA_UPLOADS)) return;

    moverParaLixeira(absoluto, "uploads");
}

// Deixa na pasta do site só os arquivos que o JSON exportado usa.
// O resto vai para backend/_lixeira/site (fora do site, reversível).
function espelharPasta(pastaAbsoluta, nomesUsados) {
    if (!fs.existsSync(pastaAbsoluta)) return 0;

    let movidos = 0;
    for (const nome of fs.readdirSync(pastaAbsoluta)) {
        const arquivo = path.join(pastaAbsoluta, nome);
        if (!fs.statSync(arquivo).isFile()) continue;

        if (!nomesUsados.has(nome)) {
            if (moverParaLixeira(arquivo, "site")) movidos++;
        }
    }
    return movidos;
}

module.exports = { removerUpload, espelharPasta };