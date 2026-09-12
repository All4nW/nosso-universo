

function adicionarDecoracoesFundoHub(container) {
    if (container.querySelector('.hub-fundo-decoracoes')) return;

    const decoracoes = document.createElement('div');
    decoracoes.className = 'hub-fundo-decoracoes';
    decoracoes.setAttribute('aria-hidden', 'true');
    decoracoes.innerHTML = `
        <img src="assets/images/perfil-decoracoes/coracao-raios.png" alt="" style="--px: 6%; --py: 12%; --pdelay: 0s; --pduracao: 9s;">
        <img src="assets/images/perfil-decoracoes/brilhos-cluster.png" alt="" style="--px: 90%; --py: 8%; --pdelay: 1.2s; --pduracao: 11s;">
        <img src="assets/images/perfil-decoracoes/coracao-raios.png" alt="" style="--px: 94%; --py: 60%; --pdelay: 2.4s; --pduracao: 10s;">
        <img src="assets/images/perfil-decoracoes/brilhos-cluster.png" alt="" style="--px: 4%; --py: 65%; --pdelay: 0.6s; --pduracao: 8.5s;">
        <img src="assets/images/perfil-decoracoes/coracao-raios.png" alt="" style="--px: 50%; --py: 90%; --pdelay: 1.8s; --pduracao: 9.5s;">
    `;

    container.prepend(decoracoes);
}
async function carregarHubCards() {
    const container = document.getElementById('hub-container');
    if (!container) return;

    adicionarDecoracoesFundoHub(container);

    let cards = [];
    try {
        const resposta = await fetch('assets/data/hub.json', { cache: 'no-cache' });
        if (!resposta.ok) throw new Error('Não foi possível carregar hub.json.');
        cards = await resposta.json();
    } catch (erro) {
        console.error('Erro ao carregar cards do hub:', erro);
        return;
    }

    container.innerHTML = '';

    cards.forEach((card, indice) => {
        container.appendChild(criarHubCard(card, indice));
    });
}

function criarHubCard(card, indice) {
    const rotacoes = [-6, 4, -3, 6, -5, 3, -4];
    const duracoes = [6, 7, 5.5, 6.5, 7.5, 6, 6.8];
    const delaysFloat = [0, 0.4, 0.8, 0.2, 0.6, 1, 0.3];

    const rot = rotacoes[indice % rotacoes.length];
    const duracao = duracoes[indice % duracoes.length];
    const delayFloat = delaysFloat[indice % delaysFloat.length];
    const delayEntrada = (indice * 0.07).toFixed(2);

    const a = document.createElement('a');
    a.href = `#${card.link}`;
    a.className = 'hub-card';
    a.style.setProperty('--delay', `${delayEntrada}s`);

    a.innerHTML = `
        <div class="hub-card-float" style="--rot: ${rot}deg; --float-duration: ${duracao}s; --float-delay: ${delayFloat}s;">
            <div class="hub-card-thumb">
                <div class="stack-layer stack-layer-3" ${card.imagem3 ? `` : ''}></div>
                <div class="stack-layer stack-layer-2"></div>
                <div class="stack-layer stack-layer-1">
                    <img src="${card.imagem1 || ''}" alt="${card.titulo}" onerror="this.remove()">
                </div>
                
                ${card.descricao ? `<div class="hub-card-desc">${card.descricao}</div>` : ''}
            </div>
            <h3 class="hub-card-title">${card.titulo}</h3>
        </div>
    `;

    // Aplica as fotos de fundo (camadas 2 e 3), se existirem
    const layer2 = a.querySelector('.stack-layer-2');
    const layer3 = a.querySelector('.stack-layer-3');

    if (card.imagem2) {
        layer2.style.backgroundImage = `url('${card.imagem2}')`;
        layer2.style.backgroundSize = 'cover';
        layer2.style.backgroundPosition = 'center';
    }

    if (card.imagem3) {
        layer3.style.backgroundImage = `url('${card.imagem3}')`;
        layer3.style.backgroundSize = 'cover';
        layer3.style.backgroundPosition = 'center';
    }

    return a;
}

carregarHubCards();