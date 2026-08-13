let hubCardsAdmin = [];
let hubCardEditandoId = null;
let hubDragId = null;

function iniciarGerenciadorHub() {
    carregarHubCardsAdmin();

    document.getElementById('btn-novo-hubcard')?.addEventListener('click', abrirFormularioNovoHubCard);
    document.getElementById('hubcard-btn-cancelar')?.addEventListener('click', fecharFormularioHubCard);
    document.getElementById('hubcard-btn-salvar')?.addEventListener('click', salvarHubCard);
    document.getElementById('btn-sincronizar-hub')?.addEventListener('click', sincronizarHub);

    document.getElementById('hubcards-admin-itens')?.addEventListener('click', (event) => {
        const botao = event.target.closest('[data-acao]');
        if (!botao) return;
        const id = botao.dataset.id;

        if (botao.dataset.acao === 'editar') editarHubCard(id);
        if (botao.dataset.acao === 'excluir') excluirHubCard(id);
    });
}

async function carregarHubCardsAdmin() {
    const container = document.getElementById('hubcards-admin-itens');
    if (!container) return;

    try {
        const resposta = await fetch('http://localhost:3000/api/hub?admin=true');
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        hubCardsAdmin = await resposta.json();
        renderizarHubCardsAdmin();
    } catch (erro) {
        console.error('[HUB ADMIN] Erro ao carregar:', erro);
        container.innerHTML = '<div class="timeline-admin-vazio">❌ Não foi possível carregar os cards.</div>';
    }
}

function renderizarHubCardsAdmin() {
    const container = document.getElementById('hubcards-admin-itens');
    if (!container) return;

    if (!hubCardsAdmin.length) {
        container.innerHTML = '<div class="timeline-admin-vazio">🌌 Nenhum card criado ainda.</div>';
        return;
    }

    container.innerHTML = '';

    hubCardsAdmin.forEach((card) => {
        const el = document.createElement('div');
        el.className = 'timeline-admin-item';
        el.draggable = false;
        el.dataset.id = card.id;

        const capa = card.imagem1 ? resolverImagemHub(card.imagem1) : '';

        el.innerHTML = `
            <div class="timeline-admin-arrastar">⋮⋮</div>
            ${capa
                ? `<img class="timeline-admin-thumb" src="${capa}" alt="" onerror="this.style.display='none'">`
                : `<div class="timeline-admin-thumb timeline-admin-thumb-vazio">🌌</div>`
            }
            <div class="timeline-admin-info">
                <h3>${escaparHtmlHub(card.titulo)}</h3>
                <p>Leva para: ${escaparHtmlHub(card.link)}</p>
                <div class="timeline-admin-tags">
                    ${card.ativo ? '<span class="ativo">● Visível</span>' : '<span class="inativo">● Oculto</span>'}
                </div>
            </div>
            <div class="timeline-admin-acoes">
                <button type="button" class="timeline-admin-btn" data-acao="editar" data-id="${card.id}" title="Editar">✎</button>
                <button type="button" class="timeline-admin-btn timeline-admin-excluir" data-acao="excluir" data-id="${card.id}" title="Excluir">🗑</button>
            </div>
        `;

        adicionarEventosDragHub(el);
        container.appendChild(el);
    });
}

function abrirFormularioNovoHubCard() {
    hubCardEditandoId = null;

    document.getElementById('hubcard-titulo').value = '';
    document.getElementById('hubcard-descricao').value = '';
    document.getElementById('hubcard-link').value = 'timeline';
    document.getElementById('hubcard-ativo').checked = true;
    document.getElementById('hubcard-imagem1-atual').innerHTML = '';
    document.getElementById('hubcard-imagem2-atual').innerHTML = '';
    document.getElementById('hubcard-imagem3-atual').innerHTML = '';

    document.getElementById('hubcard-formulario').style.display = 'block';
}

function editarHubCard(id) {
    const card = hubCardsAdmin.find(c => c.id === id);
    if (!card) return;

    hubCardEditandoId = id;

    document.getElementById('hubcard-titulo').value = card.titulo;
    document.getElementById('hubcard-descricao').value = card.descricao || '';
    document.getElementById('hubcard-link').value = card.link;
    document.getElementById('hubcard-ativo').checked = Boolean(card.ativo);

    document.getElementById('hubcard-imagem1-atual').innerHTML =
        card.imagem1 ? `<img src="${resolverImagemHub(card.imagem1)}" alt="">` : 'Sem imagem.';
    document.getElementById('hubcard-imagem2-atual').innerHTML =
        card.imagem2 ? `<img src="${resolverImagemHub(card.imagem2)}" alt="">` : 'Sem imagem.';
    document.getElementById('hubcard-imagem3-atual').innerHTML =
        card.imagem3 ? `<img src="${resolverImagemHub(card.imagem3)}" alt="">` : 'Sem imagem.';

    document.getElementById('hubcard-formulario').style.display = 'block';
}

function fecharFormularioHubCard() {
    hubCardEditandoId = null;
    document.getElementById('hubcard-formulario').style.display = 'none';
}

async function salvarHubCard() {
    const titulo = document.getElementById('hubcard-titulo').value.trim();
    if (!titulo) { alert('Digite o título do card.'); return; }

    const formulario = new FormData();
    formulario.append('titulo', titulo);
    formulario.append('descricao', document.getElementById('hubcard-descricao').value);
    formulario.append('link', document.getElementById('hubcard-link').value);
    formulario.append('ativo', document.getElementById('hubcard-ativo').checked);

    const img1 = document.getElementById('hubcard-imagem1');
    const img2 = document.getElementById('hubcard-imagem2');
    const img3 = document.getElementById('hubcard-imagem3');

    if (img1.files[0]) formulario.append('imagem1', img1.files[0]);
    if (img2.files[0]) formulario.append('imagem2', img2.files[0]);
    if (img3.files[0]) formulario.append('imagem3', img3.files[0]);

    if (!hubCardEditandoId && !img1.files[0]) {
        alert('Escolha ao menos a foto principal.');
        return;
    }

    try {
        let url = 'http://localhost:3000/api/hub';
        let metodo = 'POST';

        if (hubCardEditandoId) {
            url += `/${hubCardEditandoId}`;
            metodo = 'PUT';
        }

        const resposta = await fetch(url, { method: metodo, body: formulario });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        fecharFormularioHubCard();
        await carregarHubCardsAdmin();
    } catch (erro) {
        console.error('[HUB ADMIN] Erro ao salvar:', erro);
        alert('❌ Não foi possível salvar o card.');
    }
}

async function excluirHubCard(id) {
    const card = hubCardsAdmin.find(c => c.id === id);
    if (!card) return;
    if (!confirm(`Excluir o card "${card.titulo}"?`)) return;

    try {
        const resposta = await fetch(`http://localhost:3000/api/hub/${id}`, { method: 'DELETE' });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        await carregarHubCardsAdmin();
    } catch (erro) {
        console.error('[HUB ADMIN] Erro ao excluir:', erro);
        alert('Erro ao excluir card.');
    }
}

async function sincronizarHub() {
    try {
        const resposta = await fetch('http://localhost:3000/api/hub/exportar');
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const resultado = await resposta.json();
        alert(`✅ Hub sincronizado! ${resultado.quantidade} cards exportados.\n\nAgora é só fazer o commit/push para publicar.`);
    } catch (erro) {
        console.error('[HUB ADMIN] Erro ao sincronizar:', erro);
        alert('❌ Não foi possível sincronizar com o site.');
    }
}

// Drag & drop (mesmo padrão da Timeline/Galeria)
function adicionarEventosDragHub(elemento) {
    elemento.addEventListener('mousedown', (e) => {
        if (e.target.closest('.timeline-admin-arrastar')) elemento.draggable = true;
    });

    elemento.addEventListener('dragstart', () => {
        hubDragId = elemento.dataset.id;
        elemento.classList.add('timeline-admin-dragging');
    });

    elemento.addEventListener('dragend', () => {
        elemento.classList.remove('timeline-admin-dragging');
        elemento.draggable = false;
        hubDragId = null;
    });

    elemento.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (hubDragId && hubDragId !== elemento.dataset.id) {
            elemento.classList.add('timeline-admin-drag-over');
        }
    });

    elemento.addEventListener('dragleave', (e) => {
        e.currentTarget.classList.remove('timeline-admin-drag-over');
    });

    elemento.addEventListener('drop', async (e) => {
        e.preventDefault();
        const destino = e.currentTarget;
        destino.classList.remove('timeline-admin-drag-over');

        if (!hubDragId || hubDragId === destino.dataset.id) return;

        const lista = document.getElementById('hubcards-admin-itens');
        const arrastado = lista.querySelector(`[data-id="${CSS.escape(hubDragId)}"]`);
        if (!arrastado) return;

        const todos = [...lista.children];
        const iArrastado = todos.indexOf(arrastado);
        const iDestino = todos.indexOf(destino);

        if (iArrastado < iDestino) destino.after(arrastado);
        else destino.before(arrastado);

        await salvarNovaOrdemHub();
    });
}

async function salvarNovaOrdemHub() {
    const itens = [...document.querySelectorAll('#hubcards-admin-itens .timeline-admin-item')];
    const ids = itens.map(item => item.dataset.id);

    try {
        const resposta = await fetch('http://localhost:3000/api/hub/reordenar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });

        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    } catch (erro) {
        console.error('[HUB ADMIN] Erro ao reordenar:', erro);
        alert('Não foi possível salvar a nova ordem.');
        await carregarHubCardsAdmin();
    }
}

function resolverImagemHub(caminho) {
    if (!caminho) return '';
    if (caminho.startsWith('http://') || caminho.startsWith('https://')) return caminho;
    if (caminho.startsWith('/uploads/')) return `http://localhost:3000${caminho}`;
    return `../${caminho}`;
}

function escaparHtmlHub(texto) {
    return String(texto || '')
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}