const API = {

    baseUrl: "http://localhost:3000/api",

    async getSettings() {

        const response = await fetch(`${this.baseUrl}/settings`);

        if (!response.ok) {
            throw new Error("Erro ao buscar configurações.");
        }

        return await response.json();
    },

    async saveSettings(data) {

        const response = await fetch(`${this.baseUrl}/settings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error("Erro ao salvar configurações.");
        }

        return await response.json();
    }

};

window.API = API;