// ─── CD MOTOR SHOP — LOGIQUE PANIER PARTAGÉE ─────────────────────────────────
// src/scripts/cart.js
//
// Dans chaque page .astro :
//
//   <script>
//     import { initCart } from '../scripts/cart.js';
//     document.addEventListener('astro:page-load', () => initCart({
//         id: "deep-matte-01", nom: "Deep Matte", prix: 29.90
//     }));
//   </script>

let controller = null;

export function initCart(product) {

    if (controller) controller.abort();
    controller = new AbortController();
    const { signal } = controller;

    // ─── PERSISTANCE ────────────────────────────────────────────────────────────
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem('cd-motor-cart')) || []; } catch { cart = []; }

    const saveCart = () => {
        try { localStorage.setItem('cd-motor-cart', JSON.stringify(cart)); } catch {}
    };

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const safeNumber = (value, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    // ─── TOAST ──────────────────────────────────────────────────────────────────
    let toastTimer = null;
    const showToast = (msg) => {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = '✓ ' + msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
    };

    // ─── HELPERS ────────────────────────────────────────────────────────────────
    const changeQty = (index, delta) => {
        cart[index].qty += delta;
        if (cart[index].qty <= 0) cart.splice(index, 1);
        saveCart();
        updateUI();
    };

    const removeItem = (index) => {
        cart.splice(index, 1);
        saveCart();
        updateUI();
    };

    // ─── MISE À JOUR DE L'INTERFACE ─────────────────────────────────────────────
    const updateUI = () => {
        const countEl = document.getElementById('cart-count');
        const itemsEl = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total');
        if (!countEl || !itemsEl || !totalEl) return;

        countEl.textContent = cart.reduce((a, i) => a + i.qty, 0);

        itemsEl.innerHTML = cart.length === 0
            ? '<p class="text-gray-500 text-xs italic">Votre panier est vide.</p>'
            : cart.map((item, idx) => {
                const name = escapeHtml(item.name);
                const img = escapeHtml(item.img);
                const qty = Math.max(1, safeNumber(item.qty, 1));
                const price = safeNumber(item.price);
                return `
                <div class="flex items-center justify-between group bg-black/20 p-2 rounded-lg">
                    <div class="flex items-center gap-3">
                        <img src="${img}" class="h-10 w-10 object-cover rounded-md border border-white/10" alt="${name}" />
                        <div>
                            <p class="text-[10px] font-black uppercase">${name}</p>
                            <div class="flex items-center gap-2 mt-1">
                                <button data-action="decrease" data-index="${idx}" aria-label="Diminuer" class="text-green-500 hover:text-white px-1 leading-none">−</button>
                                <span class="text-xs">${qty}</span>
                                <button data-action="increase" data-index="${idx}" aria-label="Augmenter" class="text-green-500 hover:text-white px-1 leading-none">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="text-right text-xs">
                        <p class="font-bold">${(price * qty).toFixed(2)}€</p>
                        <button data-action="remove" data-index="${idx}" aria-label="Retirer" class="text-[9px] text-red-500 uppercase font-bold opacity-0 group-hover:opacity-100 transition">Retirer</button>
                    </div>
                </div>`;
            }).join('');

        totalEl.textContent = cart.reduce((a, i) => a + i.price * i.qty, 0).toFixed(2) + '€';

        let shippingEl = document.getElementById('cart-shipping');
        if (!shippingEl) {
            shippingEl = document.createElement('div');
            shippingEl.id = 'cart-shipping';
            shippingEl.className = 'flex justify-between text-xs text-green-500 font-bold mb-2';
            shippingEl.innerHTML = '<span>Livraison :</span><span>0 €</span>';
            totalEl.parentElement.insertAdjacentElement('beforebegin', shippingEl);
        }
        shippingEl.style.display = cart.length > 0 ? 'flex' : 'none';
    };

    // ─── DÉLÉGATION ÉVÉNEMENTS (items) ──────────────────────────────────────────
    const cartDropdown = document.getElementById('cart-dropdown');
    const cartToggle   = document.getElementById('cart-toggle');
    if (!cartDropdown || !cartToggle) return;

    cartDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const idx = parseInt(btn.dataset.index, 10);
        const act = btn.dataset.action;
        if (act === 'increase') changeQty(idx,  1);
        if (act === 'decrease') changeQty(idx, -1);
        if (act === 'remove')   removeItem(idx);
    }, { signal });

    // ─── TOGGLE PANIER ──────────────────────────────────────────────────────────
    const openCart  = () => { cartDropdown.classList.add('is-open');    cartToggle.setAttribute('aria-expanded', 'true');  };
    const closeCart = () => { cartDropdown.classList.remove('is-open'); cartToggle.setAttribute('aria-expanded', 'false'); };

    cartToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        cartDropdown.classList.contains('is-open') ? closeCart() : openCart();
    }, { signal });

    document.addEventListener('click', (e) => {
        if (!cartDropdown.contains(e.target) && !cartToggle.contains(e.target)) {
            closeCart();
        }
    }, { signal });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCart();
    }, { signal });

    // ─── AJOUT AU PANIER ────────────────────────────────────────────────────────
    const addButtons = Array.from(document.querySelectorAll('[data-add-to-cart]'));
    const legacyAddBtn = document.getElementById('add-to-cart');
    if (legacyAddBtn && !addButtons.includes(legacyAddBtn)) addButtons.push(legacyAddBtn);

    const setAddButtonsState = (state) => {
        addButtons.forEach((btn) => {
            const defaultLabel = btn.dataset.defaultLabel || 'Ajouter au panier';
            const addedLabel = btn.dataset.addedLabel || '✓ Ajouté !';
            btn.textContent = state === 'added' ? addedLabel : defaultLabel;
            btn.classList.toggle('bg-green-700', state === 'added');
            btn.classList.toggle('bg-green-600', state !== 'added');
        });
    };

    addButtons.forEach((addBtn) => addBtn.addEventListener('click', () => {
        const selectedQty = typeof product.getQty === 'function' ? product.getQty() : (parseInt(document.getElementById('qty-value')?.textContent, 10) || 1);
        const existing = cart.find(i => i.id === product.id);
        if (existing) { existing.qty += selectedQty; }
        else {
            cart.push({
                id:    product.id,
                name:  product.nom,
                price: product.prix,
                qty:   selectedQty,
                img:   document.getElementById('prod-img')?.src || '',
            });
        }
        saveCart();
        updateUI();

        if (typeof product.resetQty === 'function') product.resetQty();

        setAddButtonsState('added');
        setTimeout(() => {
            setAddButtonsState('default');
        }, 1500);

        showToast(product.nom + ' ajouté au panier');
    }, { signal }));

    document.getElementById('checkout-btn')?.addEventListener('click', async () => {
    if (cart.length === 0) { showToast('Votre panier est vide'); return; }

    const btn = document.getElementById('checkout-btn');
    btn.textContent = 'Vérification…';
    btn.disabled = true;

    try {
        const { supabase } = await import('../lib/supabase.js');
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        // ← Redirige vers login si non connecté
        if (!user) {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        btn.textContent = 'Redirection…';

        const res = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                items: cart,
            }),
        });

        const data = await res.json();

        if (!res.ok || !data.url) {
            throw new Error(data.error || 'Erreur serveur');
        }

        window.location.href = data.url;

    } catch (err) {
        console.error('Stripe checkout error:', err);
        btn.textContent = 'Commander';
        btn.disabled = false;
        showToast('Erreur lors de la redirection vers le paiement');
    }
}, { signal });


    // ─── INIT ────────────────────────────────────────────────────────────────────
    updateUI();
}
