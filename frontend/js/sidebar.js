// sidebar.js — hamburguer menu para mobile (inclua em todas as páginas)
(function () {
    // Cria o botão hamburguer e o overlay dinamicamente
    const btn = document.createElement('button');
    btn.id = 'hamburger';
    btn.className = 'hamburger';
    btn.setAttribute('aria-label', 'Abrir menu');
    btn.innerHTML = '<span></span><span></span><span></span>';
    document.body.prepend(btn);

    const overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    const sidebar = document.querySelector('.sidebar, aside');

    function openMenu() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        btn.classList.add('is-active');
        btn.setAttribute('aria-label', 'Fechar menu');
    }

    function closeMenu() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        btn.classList.remove('is-active');
        btn.setAttribute('aria-label', 'Abrir menu');
    }

    btn.addEventListener('click', () => {
        sidebar.classList.contains('open') ? closeMenu() : openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    // Fecha ao navegar (links internos)
    sidebar.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', closeMenu);
    });

    // Fecha ao pressionar ESC
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeMenu();
    });
})();
