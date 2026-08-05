// menu.js
// Injeta o link fixo de "voltar ao universo" (components/navbar.html)
// em qualquer página que tenha o elemento #navbar-placeholder.

async function carregarNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    try {
        const resposta = await fetch('components/navbar.html');
        const html = await resposta.text();
        placeholder.innerHTML = html;
    } catch (erro) {
        console.error('Erro ao carregar o navbar:', erro);
    }
}

carregarNavbar();