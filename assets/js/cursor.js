// cursor.js
// Cria um brilho suave que segue o cursor do mouse, dando um toque
// "mágico" à interface. Só ativa em dispositivos com mouse (não em toque).

const temMouse = window.matchMedia('(pointer: fine)').matches;

if (temMouse) {
    const brilho = document.createElement('div');
    brilho.id = 'cursor-glow';
    document.body.appendChild(brilho);

    window.addEventListener('mousemove', (e) => {
        brilho.style.left = `${e.clientX}px`;
        brilho.style.top = `${e.clientY}px`;
    });
}