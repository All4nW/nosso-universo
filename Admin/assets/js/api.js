const API = {

    baseUrl: "http://localhost:3000/api",

    // =====================================================
    // SETTINGS
    // =====================================================

    async getSettings() {

        const response =
            await fetch(`${this.baseUrl}/settings`);

        if (!response.ok) {
            throw new Error(
                "Erro ao buscar configurações."
            );
        }

        return await response.json();
    },


    async saveSettings(data) {

        const response =
            await fetch(
                `${this.baseUrl}/settings`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(data)
                }
            );

        if (!response.ok) {
            throw new Error(
                "Erro ao salvar configurações."
            );
        }

        return await response.json();
    },


    // =====================================================
    // ASSISTIDOS
    // =====================================================

    async getAssistidos() {

        const response =
            await fetch(
                `${this.baseUrl}/assistidos`
            );

        if (!response.ok) {

            const erro =
                await response.json()
                    .catch(() => ({}));

            throw new Error(
                erro.erro ||
                "Erro ao buscar assistidos."
            );
        }

        return await response.json();
    },


    async saveAssistidos(data) {

        const response =
            await fetch(
                `${this.baseUrl}/assistidos`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(data)
                }
            );

        if (!response.ok) {

            const erro =
                await response.json()
                    .catch(() => ({}));

            throw new Error(
                erro.erro ||
                "Erro ao salvar assistidos."
            );
        }

        return await response.json();
    },


    // =====================================================
    // UPLOAD DE CAPA
    // =====================================================

    async uploadImagem(file) {

        const formData =
            new FormData();

        formData.append(
            "imagem",
            file
        );

        const response =
            await fetch(
                `${this.baseUrl}/assistidos/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );

        if (!response.ok) {

            const erro =
                await response.json()
                    .catch(() => ({}));

            throw new Error(
                erro.erro ||
                "Erro ao enviar imagem."
            );
        }

        return await response.json();
    }

};

window.API = API;