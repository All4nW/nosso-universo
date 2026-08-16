const routes = {
    dashboard: "pages/dashboard.html",
    configuracoes: "pages/settings.html",
    timeline: "pages/timeline.html",
    galeria: "pages/gallery.html",
    cartas: "pages/letters.html",
    musicas: "pages/songs.html",
    estrelas: "pages/stars.html",
    assistidos: "pages/assistidos.html"
};


// =====================================================
// CARREGAR PÁGINA
// =====================================================

async function loadPage(page) {

    try {

        const pageContent =
            document.getElementById("page-content");

        if (!routes[page]) {
            throw new Error(
                `Página "${page}" não existe no router.`
            );
        }

        const response =
            await fetch(routes[page]);

        if (!response.ok) {
            throw new Error(
                `Não foi possível carregar ${routes[page]}`
            );
        }

        const html =
            await response.text();

        pageContent.innerHTML = html;


        // =================================================
        // SALVAR PÁGINA ATUAL
        // =================================================

        sessionStorage.setItem(
            "adminPaginaAtual",
            page
        );


        // =================================================
        // MENU ATIVO
        // =================================================

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


        // =================================================
        // SCRIPTS DAS PÁGINAS
        // =================================================

        switch (page) {

            case "configuracoes":

                if (window.initSettings) {
                    await window.initSettings();
                }

                break;


            case "timeline":

                if (window.initTimeline) {
                    await window.initTimeline();
                }

                break;


            case "galeria":

                if (window.initGallery) {
                    await window.initGallery();
                }

                break;


            case "cartas":

                if (window.initLetters) {
                    await window.initLetters();
                }

                break;


            case "musicas":

                if (window.initSongs) {
                    await window.initSongs();
                }

                break;


            case "estrelas":

                if (window.initStars) {
                    await window.initStars();
                }

                break;


            case "assistidos":

                if (window.initAssistidos) {
                    await window.initAssistidos();
                }

                break;


            case "dashboard":
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
        ).innerHTML = `
            <div style="
                padding: 40px;
                color: #ff8f8f;
            ">
                <h2>Erro ao carregar página.</h2>
                <p>${erro.message}</p>
            </div>
        `;

    }

}


window.loadPage = loadPage;