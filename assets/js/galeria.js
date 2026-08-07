// galeria.js
// Pastas ficam sempre visíveis (encolhem após a primeira abertura).
// Ao clicar numa pasta, as fotos aparecem abaixo com animação de entrada
// e uma pequena "explosão" de corações, e a página rola até elas.

let pastasCarregadas = [];

async function carregarGaleria() {
    const containerPastas = document.getElementById('galeria-pastas');
    if (!containerPastas) return;

    try {
        const resposta = await fetch('assets/data/galeria.json');
        pastasCarregadas = await resposta.json();

        containerPastas.innerHTML = '';
        pastasCarregadas.forEach((pasta) => {
            containerPastas.appendChild(criarCardPasta(pasta));
        });
    } catch (erro) {
        console.error('Erro ao carregar a galeria:', erro);
    }

    ativarBotaoTopo();
}

function criarCardPasta(pasta) {
    const card = document.createElement('div');
    card.className = 'galeria-pasta-card';

    const quantidade = pasta.fotos ? pasta.fotos.length : 0;

    card.innerHTML = `
        <div class="galeria-pasta-capa">
            <img src="${pasta.capa}" alt="${pasta.nome}" onerror="this.remove()">
        </div>
        <span class="galeria-pasta-nome">📁 ${pasta.nome}</span>
        <span class="galeria-pasta-quantidade">${quantidade} ${quantidade === 1 ? 'foto' : 'fotos'}</span>
    `;

    card.addEventListener('click', () => abrirPasta(pasta));

    return card;
}

function abrirPasta(pasta) {
    // Encolhe as pastas (só na primeira vez que precisar; se já estiver encolhido, não faz nada)
    document.getElementById('galeria-pastas').classList.add('galeria-pastas-recolhida');

    document.getElementById('galeria-pasta-titulo').textContent = pasta.nome;

    const lista = document.getElementById('galeria-fotos-lista');
    lista.innerHTML = '';

    const fotos = (pasta.fotos || []).slice().sort((a, b) => new Date(a.data) - new Date(b.data));

    if (fotos.length === 0) {
        lista.innerHTML = '<p class="galeria-vazio">Nenhuma foto nesta pasta ainda.</p>';
    } else {
        fotos.forEach((foto, indice) => {
            const item = document.createElement('div');
            item.className = 'galeria-foto-item';
            item.style.setProperty('--delay', `${indice * 0.08}s`);

            item.innerHTML = `
                <div class="galeria-foto-thumb">
                    <img src="${foto.imagem}" alt="${pasta.nome}" onerror="this.parentElement.remove()">
                </div>
                <span class="galeria-foto-data">${formatarData(foto.data)}</span>
            `;

            item.addEventListener('click', () => {
                abrirModal({
                    titulo: pasta.nome,
                    data: foto.data,
                    descricao: foto.descricao || '',
                    fotos: [foto.imagem]
                });
            });

            lista.appendChild(item);
        });
    }

    const containerFotos = document.getElementById('galeria-fotos');
    containerFotos.classList.remove('oculto');

    // Reinicia a animação de entrada (para funcionar de novo ao trocar de pasta)
    containerFotos.classList.remove('galeria-fotos-entrando');
    void containerFotos.offsetWidth;
    containerFotos.classList.add('galeria-fotos-entrando');

    // Explosão de corações no topo da área de fotos
    const rect = containerFotos.getBoundingClientRect();
    if (typeof criarExplosaoCoracoesArea === 'function') {
        criarExplosaoCoracoesArea(rect.left + rect.width / 2, rect.top, rect.width * 0.6);
    }

    // Rola suavemente até a seção de fotos
    containerFotos.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ativarBotaoTopo() {
    const botao = document.getElementById('galeria-topo-btn');
    const view = document.querySelector('.view[data-view="galeria"]');
    if (!botao || !view) return;

    botao.addEventListener('click', () => {
        view.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

carregarGaleria();