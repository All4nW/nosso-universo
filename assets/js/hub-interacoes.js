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
// No touch, mostra o leque no instante do toque (puramente visual,
// já que o toque também navega pra outra seção em seguida)
if (window.matchMedia('(hover: none)').matches) {
    document.addEventListener('click', (evento) => {
        const cardTocado = evento.target.closest('.hub-card');
        if (cardTocado) {
            cardTocado.classList.add('hub-card-tocado');
        }
    });
}
});

