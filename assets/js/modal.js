// modal.js
// Componente reutilizável: qualquer seção pode chamar abrirModal(item)
// passando um objeto { titulo, data, descricao, fotos } ou { ..., foto }.

async function carregarModal() {
    const placeholder = document.getElementById('modal-placeholder');
    if (!placeholder) return;

    try {
        const resposta = await fetch('components/modal.html');
        const html = await resposta.text();
        placeholder.innerHTML = html;

        ativarFechamentoModal();
    } catch (erro) {
        console.error('Erro ao carregar o modal:', erro);
    }
}

function ativarFechamentoModal() {
    const overlay = document.getElementById('modal-overlay');
    const botaoFechar = document.getElementById('modal-fechar');
    if (!overlay || !botaoFechar) return;

    botaoFechar.addEventListener('click', fecharModal);

    overlay.addEventListener('click', (evento) => {
        if (evento.target === overlay) fecharModal();
    });

    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') fecharModal();
    });
}

function formatarData(dataString) {
    const data = new Date(dataString + 'T00:00:00');
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Resolve o caminho da imagem tanto pra fotos enviadas pelo Admin
// (/uploads/... precisa do host do backend) quanto pra fotos estáticas.
function resolverImagemModal(caminho) {
    if (!caminho) return '';

    if (caminho.startsWith('http://') || caminho.startsWith('https://')) {
        return caminho;
    }

    if (caminho.startsWith('/uploads/')) {
        return `http://localhost:3000${caminho}`;
    }

    return caminho;
}

function abrirModal(item) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    document.getElementById('modal-titulo').textContent = item.titulo;
    document.getElementById('modal-data').textContent = item.dataExibicao || formatarData(item.data);
    document.getElementById('modal-descricao').textContent = item.descricao;

    const fotosContainer = document.getElementById('modal-fotos');
    fotosContainer.innerHTML = '';

    // Aceita os dois formatos: item.fotos (array, JSON estático)
    // ou item.foto (string única, vinda da API/backend).
    const fotos =
        item.fotos && item.fotos.length
            ? item.fotos
            : (item.foto ? [item.foto] : []);

    fotos.forEach((src) => {
        const img = document.createElement('img');
        img.src = resolverImagemModal(src);
        img.alt = item.titulo;
        img.onerror = () => img.remove();
        fotosContainer.appendChild(img);
    });

    overlay.classList.remove('oculto');
    document.body.classList.add('modal-aberto');
}

function fecharModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.classList.add('oculto');
    document.body.classList.remove('modal-aberto');
}

carregarModal();