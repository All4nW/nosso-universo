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
    // UPLOAD DE CAPA (ASSISTIDOS)
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
    },


    // =====================================================
    // CARTAS
    // =====================================================

    async getCartas() {

        const response =
            await fetch(
                `${this.baseUrl}/letters`
            );

        if (!response.ok) {

            const erro =
                await response.json()
                    .catch(() => ({}));

            throw new Error(
                erro.erro ||
                "Erro ao buscar cartas."
            );
        }

        return await response.json();
    },


    async saveCartas(data) {

        const response =
            await fetch(
                `${this.baseUrl}/letters`,
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
                "Erro ao salvar cartas."
            );
        }

        return await response.json();
    },


    // =====================================================
    // UPLOAD DE IMAGEM (CARTAS)
    // =====================================================

    async uploadImagemCarta(file) {

        const formData =
            new FormData();

        formData.append(
            "imagem",
            file
        );

        const response =
            await fetch(
                `${this.baseUrl}/letters/upload`,
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
    },


    // =====================================================
    // PREVIEW (VÍDEOS VERTICAIS)
    // =====================================================

    async getPreview() {

        const response =
            await fetch(
                `${this.baseUrl}/preview`
            );

        if (!response.ok) {

            const erro =
                await response.json()
                    .catch(() => ({}));

            throw new Error(
                erro.erro ||
                "Erro ao buscar o Preview."
            );
        }

        return await response.json();
    },


    async savePreview(data) {

        const response =
            await fetch(
                `${this.baseUrl}/preview`,
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
                "Erro ao salvar o Preview."
            );
        }

        return await response.json();
    },


    async uploadImagemPreview(file) {

        const formData =
            new FormData();

        formData.append(
            "imagem",
            file
        );

        const response =
            await fetch(
                `${this.baseUrl}/preview/upload-imagem`,
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
                "Erro ao enviar a capa."
            );
        }

        return await response.json();
    },


    async uploadVideoPreview(file) {

        const formData =
            new FormData();

        formData.append(
            "video",
            file
        );

        const response =
            await fetch(
                `${this.baseUrl}/preview/upload-video`,
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
                "Erro ao enviar o vídeo."
            );
        }

        return await response.json();
    }

};

window.API = API;