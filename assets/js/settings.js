async function loadSettings() {

    try {

        const response = await fetch("http://localhost:3000/api/settings");
        const settings = await response.json();

        document.querySelector(".welcome-title").textContent = settings.title;
        document.querySelector(".welcome-message").textContent = settings.subtitle;

    } catch (error) {

        console.error("Erro ao carregar configurações:", error);

    }

}

loadSettings();