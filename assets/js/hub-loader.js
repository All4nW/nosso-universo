fetch("assets/data/hub.json")
    .then(response => response.json())
    .then(data => {
        console.log("Hub carregado:", data);
    })
    .catch(error => {
        console.error("Erro ao carregar o JSON:", error);
    });