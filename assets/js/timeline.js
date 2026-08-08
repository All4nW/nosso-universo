// timeline.js
// Lê assets/data/timeline.json e desenha os marcos, alternando esquerda/direita.
// Clicar em um marco abre o modal com o conteúdo completo.

async function carregarTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    try {
        const resposta = await fetch('assets/data/timeline.json');
        const itens = await resposta.json();

        itens.sort((a, b) => new Date(a.data) - new Date(b.data));

        itens.forEach((item, indice) => {
            const elemento = criarItemTimeline(item, indice);
            container.appendChild(elemento);
        });
    } catch (erro) {
        console.error('Erro ao carregar a timeline:', erro);
    }
}

function criarItemTimeline(item, indice) {
    const lado = indice % 2 === 0 ? 'esquerda' : 'direita';

    const elemento = document.createElement('div');
    elemento.className = `timeline-item timeline-item-${lado}`;

    const primeiraFoto = (item.fotos && item.fotos[0]) || null;

    const textoData = item.dataExibicao || formatarData(item.data);

    const ehFuturo = new Date(item.data) > new Date();
    if (ehFuturo) {
        elemento.classList.add('timeline-item-futuro');
    }

    // Selo de quem sugeriu (opcional) — só aparece se o campo existir no JSON
    let selosugestao = '';
    if (item.sugeridoPor === 'ela') {
        selosugestao = '<span class="timeline-badge-sugestao timeline-badge-sugestao-ela">💗 Sugestão dela</span>';
    } else if (item.sugeridoPor === 'mim') {
        selosugestao = '<span class="timeline-badge-sugestao timeline-badge-sugestao-mim">💙 Sugestão minha</span>';
    }

    elemento.innerHTML = `
        <div class="timeline-marker"></div>
        <div class="timeline-card">
            ${ehFuturo ? '<span class="timeline-badge-futuro">💗 Um sonho a caminho</span>' : ''}
            ${selosugestao}
            ${primeiraFoto ? `
                <div class="timeline-card-thumb">
                    <img src="${primeiraFoto}" alt="${item.titulo}" onerror="this.parentElement.remove()">
                </div>
            ` : ''}
            <span class="timeline-card-data">${textoData}</span>
            <h3 class="timeline-card-titulo">${item.titulo}</h3>
            <p class="timeline-card-resumo">${item.resumo || ''}</p>
        </div>
    `;

    elemento.addEventListener('click', () => abrirModal(item));

    return elemento;
}
function ativarBotaoTopoTimeline() {
    const botao = document.getElementById('timeline-topo-btn');
    const view = document.querySelector('.view[data-view="timeline"]');
    if (!botao || !view) return;

    botao.addEventListener('click', () => {
        view.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

ativarBotaoTopoTimeline();
carregarTimeline();

