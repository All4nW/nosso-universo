document.addEventListener("DOMContentLoaded", () => {

    // Recupera a última página aberta
    const paginaSalva =
        sessionStorage.getItem("adminPaginaAtual");

    // Se existir uma página salva, abre ela.
    // Caso contrário, começa no Dashboard.
    const paginaInicial =
        paginaSalva || "dashboard";

    loadPage(paginaInicial);

});