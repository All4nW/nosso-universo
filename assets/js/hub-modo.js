// hub-modo.js
// Escolhe entre os dois hubs: o clássico (cards 2D) e o 3D (universo).
// A escolha fica salva no aparelho (localStorage).
//
//   HubModo.obter()              -> 'classico' | '3d'
//   HubModo.definir('3d')        -> troca na hora e salva
//   HubModo.alternar()           -> inverte o modo atual
//   HubModo.aplicar()            -> monta o hub do modo atual (chame no lugar de carregarHubCards())

(function () {
'use strict';

const CHAVE = 'nossoUniversoHubModo';

// >>> ajuste aqui: a data em que vocês começaram (a mesma do contador do hub atual)
const DATA_INICIO = '2025-08-05T00:00:00';

function obter() {
    try {
        return localStorage.getItem(CHAVE) === 'classico' ? 'classico' : '3d';
    } catch (e) {
        return '3d';
    }
}

function definir(modo) {
    try { localStorage.setItem(CHAVE, modo === 'classico' ? 'classico' : '3d'); } catch (e) {}
    aplicar();
}

function alternar() {
    definir(obter() === '3d' ? 'classico' : '3d');
}

function aplicar() {
    const container = document.getElementById('hub-container');
    if (!container) return;
        console.log('[HUB] aplicar() rodou, modo:', obter(), '| Hub3D existe:', Boolean(window.Hub3D));

    if (window.Hub3D) window.Hub3D.desmontar();
    container.innerHTML = '';
    container.classList.remove('hub-3d');

    const usarClassico = () => {
        container.classList.remove('hub-3d');
        container.innerHTML = '';
        if (typeof window.carregarHubCards === 'function') window.carregarHubCards();
    };

    if (obter() === '3d' && window.Hub3D) {
        container.classList.add('hub-3d');
        window.Hub3D.montar(container, {
            dataInicio: DATA_INICIO,
            aoFalhar: (erro) => {
                console.warn('Hub3D falhou, voltando pro clássico:', erro);
                usarClassico();
            }
        });
    } else {
        usarClassico();
    }
        sincronizarAlavanca();
    if (container.animate) container.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: 'ease-out' });
}

// ---------- alavanca 2D/3D ----------
function sincronizarAlavanca() {
    const b = document.getElementById('hub-alavanca');
    if (!b) return;
    const is3d = obter() === '3d';
    b.classList.toggle('modo-3d', is3d);
    b.setAttribute('aria-checked', String(is3d));
    b.setAttribute('aria-label', is3d ? 'Hub 3D ativo. Trocar para o hub clássico' : 'Hub clássico ativo. Trocar para o hub 3D');
}

function atualizarVisibilidadeAlavanca() {
    const b = document.getElementById('hub-alavanca');
    if (b) b.classList.toggle('visivel', location.hash === '#hub');
}

function criarAlavanca() {
    if (document.getElementById('hub-alavanca')) return;
    const b = document.createElement('button');
    b.id = 'hub-alavanca';
    b.type = 'button';
    b.className = 'hub-alavanca';
    b.setAttribute('role', 'switch');
    b.innerHTML =
        '<span class="hub-alavanca-trilho">' +
        '<span>2D</span><span>3D</span>' +
        '<span class="hub-alavanca-manopla">' +
        '<span class="hub-alavanca-ico hub-ico-2d">♡</span>' +
        '<span class="hub-alavanca-ico hub-ico-3d">✦</span>' +
        '</span></span>';
    b.addEventListener('click', () => {
        b.classList.remove('ping');
        void b.offsetWidth;
        b.classList.add('ping');
        alternar();
    });
    document.body.appendChild(b);
    sincronizarAlavanca();
    atualizarVisibilidadeAlavanca();
    addEventListener('hashchange', atualizarVisibilidadeAlavanca);
}

criarAlavanca();

window.HubModo = { obter: obter, definir: definir, alternar: alternar, aplicar: aplicar };

})();