let pastasAdmin = [];
let pastaEditandoId = null;
let pastaCapaSelecionada = null;

let pastaAbertaId = null;
let fotosAdmin = [];
let fotoEditandoId = null;
let fotoImagemSelecionada = null;

let galeriaDragId = null;


async function initGaleria() {
    await carregarPastasAdmin();
    registrarEventosGaleria();
}


// ===== PASTAS =====

async function carregarPastasAdmin() {
    const container = document.getElementById('pastas-admin-itens');
    if (!container) return;

    try {
        const resposta = await fetch('http://localhost:3000/api/galeria/pastas?admin=true');
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        pastasAdmin = await resposta.json();
        renderizarPastasAdmin();
    } catch (erro) {
        console.error('[GALERIA ADMIN] Erro ao carregar pastas:', erro);
        container.innerHTML = '<div class="timeline-admin-vazio">❌ Não foi possível carregar as pastas.</div>';
    }
}

function renderizarPastasAdmin() {
    const container = document.getElementById('pastas-admin-itens');
    if (!container) return;

    if (!pastasAdmin.length) {
        container.innerHTML = '<div class="timeline-admin-vazio">📁 Nenhuma pasta criada ainda.</div>';
        return;
    }

    container.innerHTML = '';

    pastasAdmin.forEach((pasta) => {
        const el = document.createElement('div');
        el.className = 'timeline-admin-item';
        el.draggable = false;
        el.dataset.id = pasta.id;

        const capa = pasta.capa ? resolverImagemGaleria(pasta.capa) : '';

        el.innerHTML = `
            <div class="timeline-admin-arrastar">⋮⋮</div>
            ${capa
                ? `<img class="timeline-admin-thumb" src="${capa}" alt="" onerror="this.style.display='none'">`
                : `<div class="timeline-admin-thumb timeline-admin-thumb-vazio">📁</div>`
            }
            <div class="timeline-admin-info">
                <h3>${escaparHtmlGaleria(pasta.nome)}</h3>
                <div class="timeline-admin-tags">
                    ${pasta.ativo
                        ? '<span class="ativo">● Visível</span>'
                        : '<span class="inativo">● Oculta</span>'
                    }
                </div>
            </div>
            <div class="timeline-admin-acoes">
                <button type="button" class="timeline-admin-btn" data-acao="abrir-fotos" data-id="${pasta.id}" title="Gerenciar fotos">📸</button>
                <button type="button" class="timeline-admin-btn" data-acao="editar-pasta" data-id="${pasta.id}" title="Editar">✎</button>
                <button type="button" class="timeline-admin-btn timeline-admin-excluir" data-acao="excluir-pasta" data-id="${pasta.id}" title="Excluir">🗑</button>
            </div>
        `;

        adicionarEventosDragGaleria(el, 'pasta');
        container.appendChild(el);
    });
}

function abrirFormularioNovaPasta() {
    pastaEditandoId = null;
    pastaCapaSelecionada = null;

    document.getElementById('pasta-nome').value = '';
    document.getElementById('pasta-ativa').checked = true;
    document.getElementById('pasta-capa-atual').innerHTML = '';
    document.getElementById('pasta-form-titulo').textContent = 'Nova pasta';
    document.getElementById('pasta-formulario').style.display = 'block';
}

function editarPasta(id) {
    const pasta = pastasAdmin.find(p => p.id === id);
    if (!pasta) return;

    pastaEditandoId = id;
    pastaCapaSelecionada = null;

    document.getElementById('pasta-nome').value = pasta.nome;
    document.getElementById('pasta-ativa').checked = Boolean(pasta.ativo);
    document.getElementById('pasta-capa-atual').innerHTML =
        pasta.capa ? `<img src="${resolverImagemGaleria(pasta.capa)}" alt="">` : 'Sem capa.';
    document.getElementById('pasta-form-titulo').textContent = 'Editar pasta';
    document.getElementById('pasta-formulario').style.display = 'block';
}

function fecharFormularioPasta() {
    pastaEditandoId = null;
    pastaCapaSelecionada = null;
    document.getElementById('pasta-formulario').style.display = 'none';
}

async function salvarPasta() {
    const nome = document.getElementById('pasta-nome').value.trim();
    if (!nome) { alert('Digite o nome da pasta.'); return; }

    const formulario = new FormData();
    formulario.append('nome', nome);
    formulario.append('ativo', document.getElementById('pasta-ativa').checked);

    const capaInput = document.getElementById('pasta-capa');
    if (capaInput.files[0]) formulario.append('capa', capaInput.files[0]);

    try {
        let url = 'http://localhost:3000/api/galeria/pastas';
        let metodo = 'POST';

        if (pastaEditandoId) {
            url += `/${pastaEditandoId}`;
            metodo = 'PUT';
        }

        const resposta = await fetch(url, { method: metodo, body: formulario });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        fecharFormularioPasta();
        await carregarPastasAdmin();
    } catch (erro) {
        console.error('[GALERIA ADMIN] Erro ao salvar pasta:', erro);
        alert('❌ Não foi possível salvar a pasta.');
    }
}

async function excluirPasta(id) {
    const pasta = pastasAdmin.find(p => p.id === id);
    if (!pasta) return;
    if (!confirm(`Excluir a pasta "${pasta.nome}" e todas as fotos dela?`)) return;

    try {
        const resposta = await fetch(`http://localhost:3000/api/galeria/pastas/${id}`, { method: 'DELETE' });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        await carregarPastasAdmin();
    } catch (erro) {
        console.error('[GALERIA ADMIN] Erro ao excluir pasta:', erro);
        alert('Erro ao excluir pasta.');
    }
}


// ===== FOTOS =====

async function abrirGerenciadorFotos(pastaId) {
    const pasta = pastasAdmin.find(p => p.id === pastaId);
    if (!pasta) return;

    pastaAbertaId = pastaId;

    document.getElementById('fotos-pasta-nome').textContent = `Fotos — ${pasta.nome}`;
    document.getElementById('fotos-secao').style.display = 'block';
    document.getElementById('fotos-secao').scrollIntoView({ behavior: 'smooth' });

    await carregarFotosAdmin();
}

function fecharGerenciadorFotos() {
    pastaAbertaId = null;
    document.getElementById('fotos-secao').style.display = 'none';
}

async function carregarFotosAdmin() {
    const container = document.getElementById('fotos-admin-itens');
    if (!container || !pastaAbertaId) return;

    try {
        const resposta = await fetch(`http://localhost:3000/api/galeria/fotos?pastaId=${pastaAbertaId}&admin=true`);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        fotosAdmin = await resposta.json();
        renderizarFotosAdmin();
    } catch (erro) {
        console.error('[GALERIA ADMIN] Erro ao carregar fotos:', erro);
        container.innerHTML = '<div class="timeline-admin-vazio">❌ Não foi possível carregar as fotos.</div>';
    }
}

function renderizarFotosAdmin() {
    const container = document.getElementById('fotos-admin-itens');
    if (!container) return;

    if (!fotosAdmin.length) {
        container.innerHTML = '<div class="timeline-admin-vazio">📸 Nenhuma foto nesta pasta ainda.</div>';
        return;
    }

    container.innerHTML = '';

    fotosAdmin.forEach((foto) => {
        const el = document.createElement('div');
        el.className = 'timeline-admin-item';
        el.dataset.id = foto.id;

        el.innerHTML = `
            <div class="timeline-admin-arrastar">⋮⋮</div>
            <img class="timeline-admin-thumb" src="${resolverImagemGaleria(foto.imagem)}" alt="" onerror="this.style.display='none'">
            <div class="timeline-admin-info">
                <div class="timeline-admin-data">${formatarDataGaleria(foto.data)}</div>
                <h3>${escaparHtmlGaleria(foto.descricao || 'Sem descrição')}</h3>
                <div class="timeline-admin-tags">
                    ${foto.ativo ? '<span class="ativo">● Visível</span>' : '<span class="inativo">● Oculta</span>'}
                </div>
            </div>
            <div class="timeline-admin-acoes">
                <button type="button" class="timeline-admin-btn" data-acao="editar-foto" data-id="${foto.id}" title="Editar">✎</button>
                <button type="button" class="timeline-admin-btn timeline-admin-excluir" data-acao="excluir-foto" data-id="${foto.id}" title="Excluir">🗑</button>
            </div>
        `;

        adicionarEventosDragGaleria(el, 'foto');
        container.appendChild(el);
    });
}

function abrirFormularioNovaFoto() {
    fotoEditandoId = null;
    fotoImagemSelecionada = null;

    document.getElementById('foto-data').value = '';
    document.getElementById('foto-descricao').value = '';
    document.getElementById('foto-ativa').checked = true;
    document.getElementById('foto-imagem-atual').innerHTML = '';
    document.getElementById('foto-formulario').style.display = 'block';
}

function editarFoto(id) {
    const foto = fotosAdmin.find(f => f.id === id);
    if (!foto) return;

    fotoEditandoId = id;
    fotoImagemSelecionada = null;

    document.getElementById('foto-data').value = foto.data;
    document.getElementById('foto-descricao').value = foto.descricao || '';
    document.getElementById('foto-ativa').checked = Boolean(foto.ativo);
    document.getElementById('foto-imagem-atual').innerHTML =
        `<img src="${resolverImagemGaleria(foto.imagem)}" alt="">`;

    document.getElementById('foto-formulario').style.display = 'block';
}

function fecharFormularioFoto() {
    fotoEditandoId = null;
    fotoImagemSelecionada = null;
    document.getElementById('foto-formulario').style.display = 'none';
}

async function salvarFoto() {
    if (!pastaAbertaId) return;

    const data = document.getElementById('foto-data').value;
    const imagemInput = document.getElementById('foto-imagem');

    if (!fotoEditandoId && !imagemInput.files[0]) {
        alert('Escolha uma imagem.');
        return;
    }

    const formulario = new FormData();
    formulario.append('pastaId', pastaAbertaId);
    formulario.append('data', data);
    formulario.append('descricao', document.getElementById('foto-descricao').value);
    formulario.append('ativo', document.getElementById('foto-ativa').checked);

    if (imagemInput.files[0]) formulario.append('imagem', imagemInput.files[0]);

    try {
        let url = 'http://localhost:3000/api/galeria/fotos';
        let metodo = 'POST';

        if (fotoEditandoId) {
            url += `/${fotoEditandoId}`;
            metodo = 'PUT';
        }

        const resposta = await fetch(url, { method: metodo, body: formulario });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        fecharFormularioFoto();
        await carregarFotosAdmin();
    } catch (erro) {
        console.error('[GALERIA ADMIN] Erro ao salvar foto:', erro);
        alert('❌ Não foi possível salvar a foto.');
    }
}

async function excluirFoto(id) {
    if (!confirm('Excluir esta foto?')) return;

    try {
        const resposta = await fetch(`http://localhost:3000/api/galeria/fotos/${id}`, { method: 'DELETE' });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        await carregarFotosAdmin();
    } catch (erro) {
        console.error('[GALERIA ADMIN] Erro ao excluir foto:', erro);
        alert('Erro ao excluir foto.');
    }
}


// ===== SINCRONIZAR =====

async function sincronizarGaleria() {
    try {
        const resposta = await fetch('http://localhost:3000/api/galeria/exportar');
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const resultado = await resposta.json();
        alert(`✅ Galeria sincronizada! ${resultado.quantidade} pastas exportadas.\n\nAgora é só fazer o commit/push para publicar.`);
    } catch (erro) {
        console.error('[GALERIA ADMIN] Erro ao sincronizar:', erro);
        alert('❌ Não foi possível sincronizar com o site.');
    }
}


// ===== EVENTOS =====

function registrarEventosGaleria() {
    document.getElementById('btn-nova-pasta')?.addEventListener('click', abrirFormularioNovaPasta);
    document.getElementById('pasta-btn-cancelar')?.addEventListener('click', fecharFormularioPasta);
    document.getElementById('pasta-btn-salvar')?.addEventListener('click', salvarPasta);
    document.getElementById('btn-sincronizar-galeria')?.addEventListener('click', sincronizarGaleria);

    document.getElementById('btn-voltar-pastas')?.addEventListener('click', fecharGerenciadorFotos);
    document.getElementById('btn-nova-foto')?.addEventListener('click', abrirFormularioNovaFoto);
    document.getElementById('foto-btn-cancelar')?.addEventListener('click', fecharFormularioFoto);
    document.getElementById('foto-btn-salvar')?.addEventListener('click', salvarFoto);

    document.getElementById('pastas-admin-itens')?.addEventListener('click', (event) => {
        const botao = event.target.closest('[data-acao]');
        if (!botao) return;
        const id = botao.dataset.id;

        if (botao.dataset.acao === 'abrir-fotos') abrirGerenciadorFotos(id);
        if (botao.dataset.acao === 'editar-pasta') editarPasta(id);
        if (botao.dataset.acao === 'excluir-pasta') excluirPasta(id);
    });

    document.getElementById('fotos-admin-itens')?.addEventListener('click', (event) => {
        const botao = event.target.closest('[data-acao]');
        if (!botao) return;
        const id = botao.dataset.id;

        if (botao.dataset.acao === 'editar-foto') editarFoto(id);
        if (botao.dataset.acao === 'excluir-foto') excluirFoto(id);
    });
}


// ===== DRAG & DROP =====

function adicionarEventosDragGaleria(elemento, tipo) {
    elemento.addEventListener('mousedown', (e) => {
        if (e.target.closest('.timeline-admin-arrastar')) {
            elemento.draggable = true;
        }
    });

    elemento.addEventListener('dragstart', () => {
        galeriaDragId = elemento.dataset.id;
        elemento.classList.add('timeline-admin-dragging');
    });

    elemento.addEventListener('dragend', () => {
        elemento.classList.remove('timeline-admin-dragging');
        elemento.draggable = false;
        galeriaDragId = null;
    });

    elemento.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (galeriaDragId && galeriaDragId !== elemento.dataset.id) {
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

        if (!galeriaDragId || galeriaDragId === destino.dataset.id) return;

        const containerId = tipo === 'pasta' ? 'pastas-admin-itens' : 'fotos-admin-itens';
        const lista = document.getElementById(containerId);
        const arrastado = lista.querySelector(`[data-id="${CSS.escape(galeriaDragId)}"]`);
        if (!arrastado) return;

        const todos = [...lista.children];
        const iArrastado = todos.indexOf(arrastado);
        const iDestino = todos.indexOf(destino);

        if (iArrastado < iDestino) destino.after(arrastado);
        else destino.before(arrastado);

        await salvarNovaOrdemGaleria(tipo);
    });
}

async function salvarNovaOrdemGaleria(tipo) {
    const containerId = tipo === 'pasta' ? 'pastas-admin-itens' : 'fotos-admin-itens';
    const endpoint = tipo === 'pasta' ? 'pastas/reordenar' : 'fotos/reordenar';

    const itens = [...document.querySelectorAll(`#${containerId} .timeline-admin-item`)];
    const ids = itens.map(item => item.dataset.id);

    try {
        const resposta = await fetch(`http://localhost:3000/api/galeria/${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });

        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    } catch (erro) {
        console.error('[GALERIA ADMIN] Erro ao reordenar:', erro);
        alert('Não foi possível salvar a nova ordem.');
        if (tipo === 'pasta') await carregarPastasAdmin();
        else await carregarFotosAdmin();
    }
}


// ===== UTILITÁRIOS =====

function resolverImagemGaleria(caminho) {
    if (!caminho) return '';
    if (caminho.startsWith('http://') || caminho.startsWith('https://')) return caminho;
    if (caminho.startsWith('/uploads/')) return `http://localhost:3000${caminho}`;
    return caminho;
}

function formatarDataGaleria(data) {
    if (!data) return '';
    const partes = data.split('-');
    if (partes.length !== 3) return data;
    const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function escaparHtmlGaleria(texto) {
    return String(texto || '')
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}


// ===== EXPOR / AUTO-INIT =====

window.initGaleria = initGaleria;

function iniciarGaleriaAutomaticamente() {
    if (document.getElementById('pastas-admin-itens')) initGaleria();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarGaleriaAutomaticamente);
} else {
    iniciarGaleriaAutomaticamente();
}