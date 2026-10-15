// Lista (ou apaga) os arquivos de vídeo e capa que o preview.json não usa mais.
//   node limpar-preview.js            -> só mostra o que sobrou
//   node limpar-preview.js --apagar   -> apaga de verdade
const fs = require("fs");
const path = require("path");

const lista = JSON.parse(fs.readFileSync("assets/data/preview.json", "utf8"));

const usados = new Set();

lista.forEach(item => {
    [item, ...(item.extras || [])].forEach(v => {
        if (v.video) usados.add(path.normalize(v.video));
        if (v.capa) usados.add(path.normalize(v.capa));
    });
});

const pastas = ["assets/videos/preview", "assets/images/preview"];
const sobras = [];

pastas.forEach(pasta => {
    if (!fs.existsSync(pasta)) return;

    fs.readdirSync(pasta).forEach(nome => {
        const arquivo = path.normalize(path.join(pasta, nome));

        if (fs.statSync(arquivo).isFile() && !usados.has(arquivo)) sobras.push(arquivo);
    });
});

let total = 0;

sobras.forEach(arquivo => {
    const mb = fs.statSync(arquivo).size / 1048576;
    total += mb;
    console.log(`${mb.toFixed(1).padStart(7)} MB  ${arquivo}`);
});

console.log(`\n${sobras.length} arquivo(s) sem uso, ${total.toFixed(1)} MB.`);

if (process.argv.includes("--apagar")) {
    sobras.forEach(arquivo => fs.unlinkSync(arquivo));
    console.log("Apagados.");
} else {
    console.log("Nada foi apagado. Rode com --apagar pra remover.");
}