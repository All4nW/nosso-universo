// =====================================================
// SOBRE NÓS — PAINEL ADMINISTRATIVO
// Os dados ficam em memória até clicar em "Sincronizar com o site",
// que grava assets/data/sobre-nos.json (mesmo fluxo da Galeria).
// =====================================================

const SN_API = 'http://localhost:3000/api/sobre-nos';

let snCategorias = [];
let snCarregado = false;
let snSujo = false;
let snEdicao = null;


const snEl = (id) => document.getElementById(id);

function snEsc(texto) {
    return String(texto ?? '')
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function snNovoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}


// ===== INICIALIZAÇÃO =====

async function initSobreNos() {
    registrarEventosSN();

    // Se ainda há alterações não sincronizadas na memória, mantém elas
    if (!snCarregado || !snSujo) {
        try {
            const resposta = await fetch(SN_API);
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

            const dados = await resposta.json();
            snCategorias = dados.categorias || [];
            snCarregado = true;
        } catch (erro) {
            console.error('[SOBRE NÓS ADMIN] Erro ao carregar:', erro);
            snEl('sn-lista').innerHTML =
                '<div class="timeline-admin-vazio">❌ Não foi possível carregar. O servidor está rodando (reiniciado) e a rota /api/sobre-nos foi adicionada?</div>';
            return;
        }
    }

    renderizarSN();
}


// ===== RENDER =====

function atualizarAvisoSN() {
    const aviso = snEl('sn-aviso');
    if (aviso) aviso.style.display = snSujo ? 'inline' : 'none';
}

function renderizarSN() {
    const lista = snEl('sn-lista');
    if (!lista) return;

    atualizarAvisoSN();

    if (!snCategorias.length) {
        lista.innerHTML = '<div class="timeline-admin-vazio">💗 Nenhuma categoria ainda. Crie a primeira!</div>';
        return;
    }

    lista.innerHTML = snCategorias.map((cat) => `
        <section class="settings-card" style="margin-bottom: 16px;">
            <div class="settings-card-header">
                <span class="settings-card-icone">${snEsc(cat.emoji || '💗')}</span>
                <div>
                    <h3 class="settings-card-titulo">${snEsc(cat.titulo)}</h3>
                    <p class="settings-card-descricao">${cat.itens.length} ${cat.itens.length === 1 ? 'item' : 'itens'}</p>
                </div>
            </div>

            <div class="timeline-admin-topo">
                <button type="button" class="settings-botao settings-botao-primario" data-sn="add-item" data-cat="${cat.id}">＋ Adicionar item</button>
                <button type="button" class="settings-botao settings-botao-secundario" data-sn="edit-cat" data-cat="${cat.id}">✎ Editar categoria</button>
                <button type="button" class="settings-botao settings-botao-secundario" data-sn="del-cat" data-cat="${cat.id}">🗑 Excluir</button>
            </div>

            <div class="timeline-admin-itens">
                ${cat.itens.length ? cat.itens.map((item) => htmlItemSN(cat, item)).join('') : '<div class="timeline-admin-vazio">Nenhum item nesta categoria.</div>'}
            </div>
        </section>
    `).join('');
}

function htmlItemSN(cat, item) {
    const tags = item.tipo === 'juntos'
        ? `<span>Nosso: ${snEsc(item.texto) || '—'}</span>`
        : `<span>Allan: ${snEsc(item.eu) || '—'}</span><span>Jhennyfer: ${snEsc(item.ela) || '—'}</span>`;

    return `
        <div class="timeline-admin-item">
            <div class="timeline-admin-info">
                <h3>${item.emoji ? snEsc(item.emoji) + ' ' : ''}${snEsc(item.rotulo)}</h3>
                <div class="timeline-admin-tags">${tags}</div>
            </div>
            <div class="timeline-admin-acoes">
                <button type="button" class="timeline-admin-btn" data-sn="edit-item" data-cat="${cat.id}" data-item="${item.id}" title="Editar">✎</button>
                <button type="button" class="timeline-admin-btn timeline-admin-excluir" data-sn="del-item" data-cat="${cat.id}" data-item="${item.id}" title="Excluir">🗑</button>
            </div>
        </div>
    `;
}


// ===== EDITOR =====

function atualizarCamposSN() {
    const juntos = snEl('sn-item-tipo').value === 'juntos';
    snEl('sn-campo-duo').style.display = juntos ? 'none' : 'block';
    snEl('sn-campo-juntos').style.display = juntos ? 'block' : 'none';
}

function abrirEditorSN(edicao) {
    if (!snCarregado) {
        alert('Os dados ainda não foram carregados do servidor.');
        return;
    }

    snEdicao = edicao;

    const cat = snCategorias.find((c) => c.id === edicao.catId);
    const ehCategoria = edicao.modo === 'categoria';

    snEl('sn-campos-categoria').style.display = ehCategoria ? 'block' : 'none';
    snEl('sn-campos-item').style.display = ehCategoria ? 'none' : 'block';

    if (ehCategoria) {
        snEl('sn-editor-titulo').textContent = cat ? 'Editar categoria' : 'Nova categoria';
        snEl('sn-cat-emoji').value = cat?.emoji || '';
        snEl('sn-cat-titulo').value = cat?.titulo || '';
    } else {
        const item = cat?.itens.find((i) => i.id === edicao.itemId);

        snEl('sn-editor-titulo').textContent = `${item ? 'Editar item' : 'Novo item'} — ${cat?.titulo || ''}`;
        snEl('sn-item-tipo').value = item?.tipo || 'duo';
        snEl('sn-item-emoji').value = item?.emoji || '';
        snEl('sn-item-rotulo').value = item?.rotulo || '';
        snEl('sn-item-eu').value = item?.eu || '';
        snEl('sn-item-ela').value = item?.ela || '';
        snEl('sn-item-texto').value = item?.texto || '';
        atualizarCamposSN();
    }

    snEl('sn-editor').style.display = 'block';
    snEl('sn-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharEditorSN() {
    snEdicao = null;
    snEl('sn-editor').style.display = 'none';
}

function salvarEditorSN() {
    if (!snEdicao) return;

    if (snEdicao.modo === 'categoria') {
        const titulo = snEl('sn-cat-titulo').value.trim();
        const emoji = snEl('sn-cat-emoji').value.trim() || '💗';

        if (!titulo) { alert('Digite o nome da categoria.'); return; }

        const existente = snCategorias.find((c) => c.id === snEdicao.catId);

        if (existente) {
            existente.titulo = titulo;
            existente.emoji = emoji;
        } else {
            snCategorias.push({ id: snNovoId(), titulo, emoji, itens: [] });
        }
    } else {
        const cat = snCategorias.find((c) => c.id === snEdicao.catId);
        if (!cat) return;

        const tipo = snEl('sn-item-tipo').value;
        const rotulo = snEl('sn-item-rotulo').value.trim();

        if (!rotulo) { alert('Digite o título do item.'); return; }

        const item = {
            id: snEdicao.itemId || snNovoId(),
            tipo,
            emoji: snEl('sn-item-emoji').value.trim(),
            rotulo
        };

        if (tipo === 'duo') {
            item.eu = snEl('sn-item-eu').value.trim();
            item.ela = snEl('sn-item-ela').value.trim();

            if (!item.eu || !item.ela) { alert('Preencha a sua resposta e a dela.'); return; }
        } else {
            item.texto = snEl('sn-item-texto').value.trim();

            if (!item.texto) { alert('Digite a resposta.'); return; }
        }

        const indice = cat.itens.findIndex((i) => i.id === item.id);

        if (indice >= 0) cat.itens[indice] = item;
        else cat.itens.push(item);
    }

    snSujo = true;
    fecharEditorSN();
    renderizarSN();
}


// ===== EXCLUIR =====

function excluirCategoriaSN(catId) {
    const cat = snCategorias.find((c) => c.id === catId);
    if (!cat) return;

    if (!confirm(`Excluir a categoria "${cat.titulo}" e todos os itens dela?`)) return;

    snCategorias = snCategorias.filter((c) => c.id !== catId);
    snSujo = true;
    renderizarSN();
}

function excluirItemSN(catId, itemId) {
    const cat = snCategorias.find((c) => c.id === catId);
    if (!cat) return;

    if (!confirm('Excluir este item?')) return;

    cat.itens = cat.itens.filter((i) => i.id !== itemId);
    snSujo = true;
    renderizarSN();
}


// ===== SINCRONIZAR =====

async function sincronizarSN() {
    // Trava de segurança: nunca grava se os dados não chegaram do
    // servidor, senão uma lista vazia apagaria o arquivo existente.
    if (!snCarregado) {
        alert('Os dados não foram carregados do servidor; sincronizar agora apagaria o que já existe.');
        return;
    }

    try {
        const resposta = await fetch(SN_API, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categorias: snCategorias })
        });

        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        snSujo = false;
        atualizarAvisoSN();
        alert('✅ Sobre Nós sincronizado!\n\nAgora é só fazer o commit/push para publicar.');
    } catch (erro) {
        console.error('[SOBRE NÓS ADMIN] Erro ao sincronizar:', erro);
        alert('❌ Não foi possível sincronizar com o site.');
    }
}


// ===== EVENTOS =====

function registrarEventosSN() {
    snEl('sn-nova-categoria')?.addEventListener('click', () => abrirEditorSN({ modo: 'categoria' }));
    snEl('sn-sincronizar')?.addEventListener('click', sincronizarSN);
    snEl('sn-cancelar')?.addEventListener('click', fecharEditorSN);
    snEl('sn-salvar')?.addEventListener('click', salvarEditorSN);
    snEl('sn-item-tipo')?.addEventListener('change', atualizarCamposSN);

    snEl('sn-lista')?.addEventListener('click', (evento) => {
        const botao = evento.target.closest('[data-sn]');
        if (!botao) return;

        const { sn, cat, item } = botao.dataset;

        if (sn === 'add-item') abrirEditorSN({ modo: 'item', catId: cat });
        if (sn === 'edit-cat') abrirEditorSN({ modo: 'categoria', catId: cat });
        if (sn === 'del-cat') excluirCategoriaSN(cat);
        if (sn === 'edit-item') abrirEditorSN({ modo: 'item', catId: cat, itemId: item });
        if (sn === 'del-item') excluirItemSN(cat, item);
    });
}


window.initSobreNos = initSobreNos;