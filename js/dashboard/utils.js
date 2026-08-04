export function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// El cajón de navegación mobile se abre/cierra con un checkbox oculto
// (#mobile-menu-toggle, ver dashboard.html). Al elegir algo del menú hay
// que destildarlo a mano: el checkbox no se cierra solo al navegar.
export function closeMobileMenu() {
    const toggle = document.getElementById('mobile-menu-toggle');
    if (toggle) toggle.checked = false;
}