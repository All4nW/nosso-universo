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

        const pageContent = document.getElementById("page-content");

        const response = await fetch(routes[page]);

        const html = await response.text();

        pageContent.innerHTML = html;

        // Atualiza o menu ativo
        document.querySelectorAll(".sidebar-link").forEach(link => {
            link.classList.remove("sidebar-link-ativo");

            if (link.dataset.page === page) {
                link.classList.add("sidebar-link-ativo");
            }
        });

        // Executa scripts específicos da página
        switch (page) {

            case "configuracoes":
                await initSettings();
                break;

            case "timeline":
                if (window.initTimeline)
                    initTimeline();
                break;

            case "galeria":
                if (window.initGallery)
                    initGallery();
                break;

            case "cartas":
                if (window.initLetters)
                    initLetters();
                break;

            case "musicas":
                if (window.initSongs)
                    initSongs();
                break;

            case "estrelas":
                if (window.initStars)
                    initStars();
                break;
                case "configuracoes":
    await initSettings();
    break;

        }

    }

    catch (erro) {

        console.error(erro);

        document.getElementById("page-content").innerHTML =
            "<h2>Erro ao carregar página.</h2>";

    }

}

window.loadPage = loadPage;