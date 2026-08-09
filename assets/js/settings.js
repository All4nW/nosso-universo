async function loadSettings() {

    try {

        const response = await fetch("http://localhost:3000/api/settings");
        const settings = await response.json();

        const titulo =
            document.querySelector(".welcome-title");

        const mensagem =
            document.querySelector(".welcome-message");

        // Só substitui o texto se o campo realmente tiver conteúdo,
        // evitando que um valor vazio apague o texto original do HTML.
        if (titulo && settings.title) {
            titulo.textContent = settings.title;
        }

        if (mensagem && settings.subtitle) {
            mensagem.textContent = settings.subtitle;
        }

    } catch (error) {

        console.error("Erro ao carregar configurações:", error);

    }

}

loadSettings();