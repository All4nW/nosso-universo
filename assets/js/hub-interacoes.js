// hub-interacoes.js
// Ao clicar em um card do hub, aplica uma animação de "zoom + fade"
// antes de navegar de fato para a seção — em vez de trocar instantaneamente.

document.addEventListener('click', (evento) => {
    const card = evento.target.closest('.hub-card');
    if (!card) return;

    evento.preventDefault(); // impede a navegação imediata

    const destino = card.getAttribute('href');
    card.classList.add('hub-card-selecionado');

    // Espera a animação terminar antes de trocar de seção de verdade
    setTimeout(() => {
        window.location.hash = destino;
        card.classList.remove('hub-card-selecionado');
    }, 350);
});