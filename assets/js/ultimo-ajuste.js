(async function () {
    const elemento = document.getElementById('ultimo-ajuste');
    if (!elemento) return;

    try {
        const resposta = await fetch('assets/data/ultimo-ajuste.json', { cache: 'no-cache' });
        const dados = await resposta.json();
        elemento.textContent = `♡ último ajuste · ${dados.data}`;
    } catch {
        // Se der erro, simplesmente não mostra nada — não é crítico
    }
})();