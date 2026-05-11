// ─── CD MOTOR SHOP — BONHOMME DE COMPTE NAVBAR ───────────────────────────────
// src/scripts/auth-nav.js
//
// Usage dans chaque page .astro :
//
//   <script>
//     import { initAuthNav } from '../scripts/auth-nav.js';
//     document.addEventListener('astro:page-load', () => initAuthNav());
//   </script>
//
// Requiert le HTML suivant dans la navbar (voir commentaires ci-dessous).

let authController = null;

export async function initAuthNav() {
    if (authController) authController.abort();
    authController = new AbortController();
    const { signal } = authController;

    // Importer supabase dynamiquement pour compatibilité avec Astro
    const { supabase } = await import('../lib/supabase.js');

    const btn      = document.getElementById('account-btn');
    const dropdown = document.getElementById('account-dropdown');
    const avatar   = document.getElementById('account-avatar');
    const emailEl  = document.getElementById('account-email');
    const logoutBtn= document.getElementById('logout-btn');

    if (!btn || !dropdown) return;

    // ─── État initial ────────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    renderState(user);

    // ─── Écoute les changements de session (login / logout) ─────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        renderState(session?.user ?? null);
    });
    // Annule la subscription quand la page change
    signal.addEventListener('abort', () => subscription.unsubscribe());

    // ─── Rendu selon l'état ──────────────────────────────────────────────────
    function renderState(user) {
        if (user) {
            // Connecté : affiche l'initiale dans un cercle vert
            const initial = (user.email?.[0] ?? '?').toUpperCase();
            btn.innerHTML = `
                <span class="h-8 w-8 rounded-full bg-green-600 text-white text-xs font-black flex items-center justify-center ring-2 ring-transparent hover:ring-green-500 transition">
                    ${initial}
                </span>`;
            btn.setAttribute('aria-label', 'Mon compte');
            if (emailEl) emailEl.textContent = user.email ?? '';
        } else {
            // Déconnecté : icône bonhomme neutre
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-gray-400 hover:text-green-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zM19 20a7 7 0 10-14 0"/>
                </svg>`;
            btn.setAttribute('aria-label', 'Se connecter');
        }

        // Si pas connecté, le bouton redirige directement vers /login
        btn.onclick = (e) => {
            e.stopPropagation();
            if (!user) { window.location.href = '/login'; return; }
            const isOpen = dropdown.classList.contains('is-open');
            isOpen ? closeDropdown() : openDropdown();
        };
    }

    // ─── Toggle dropdown ─────────────────────────────────────────────────────
    const openDropdown  = () => { dropdown.classList.add('is-open');    btn.setAttribute('aria-expanded', 'true');  };
    const closeDropdown = () => { dropdown.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };

    dropdown.addEventListener('click', (e) => e.stopPropagation(), { signal });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) closeDropdown();
    }, { signal });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDropdown();
    }, { signal });

    // ─── Déconnexion ─────────────────────────────────────────────────────────
    logoutBtn?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        closeDropdown();
        window.location.href = '/';
    }, { signal });
}
