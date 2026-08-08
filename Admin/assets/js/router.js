const routes = {
    dashboard: "pages/dashboard.html",
    configuracoes: "pages/settings.html",
    timeline: "pages/timeline.html",
    galeria: "pages/gallery.html",
    cartas: "pages/letters.html",
    musicas: "pages/songs.html",
    estrelas: "pages/stars.html"
};

async function loadPage(page) {

    try {

        const pageContent =
            document.getElementById("page-content");

        const response =
            await fetch(routes[page]);

        const html =
            await response.text();

        pageContent.innerHTML =
            html;


        // =========================
        // SALVAR PÁGINA ATUAL
        // =========================

        sessionStorage.setItem(
            "adminPaginaAtual",
            page
        );


        // =========================
        // MENU ATIVO
        // =========================

        document
            .querySelectorAll(".sidebar-link")
            .forEach(link => {

                link.classList.remove(
                    "sidebar-link-ativo"
                );

                if (
                    link.dataset.page === page
                ) {

                    link.classList.add(
                        "sidebar-link-ativo"
                    );

                }

            });


        // =========================
        // SCRIPTS DAS PÁGINAS
        // =========================

        switch (page) {

            case "configuracoes":

                if (window.initSettings) {
                    await initSettings();
                }

                break;


            case "timeline":

                if (window.initTimeline) {
                    await initTimeline();
                }

                break;


            case "galeria":

                if (window.initGallery) {
                    await initGallery();
                }

                break;


            case "cartas":

                if (window.initLetters) {
                    await initLetters();
                }

                break;


            case "musicas":

                if (window.initSongs) {
                    await initSongs();
                }

                break;


            case "estrelas":

                if (window.initStars) {
                    await initStars();
                }

                break;

        }

    }

    catch (erro) {

        console.error(
            "Erro ao carregar página:",
            erro
        );

        document.getElementById(
            "page-content"
        ).innerHTML =
            "<h2>Erro ao carregar página.</h2>";

    }

}


window.loadPage =
    loadPage;