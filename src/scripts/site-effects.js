let effectsController = null;

export function initSiteEffects() {
    if (effectsController) effectsController.abort();
    effectsController = new AbortController();
    const { signal } = effectsController;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealTargets = [
        'main > div',
        'section',
        'footer',
        '.card',
        '.product-card',
        '#reviews-slider',
        '#review-form-section',
    ].join(',');

    const targets = Array.from(document.querySelectorAll(revealTargets))
        .filter((el) => !el.closest('nav') && !el.closest('#cart-dropdown') && !el.closest('#account-dropdown'));

    targets.forEach((el, index) => {
        el.setAttribute('data-reveal', '');
        el.style.setProperty('--reveal-delay', `${Math.min(index * 55, 220)}ms`);
        if (reduceMotion) el.classList.add('is-visible');
    });

    if (!reduceMotion && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

        targets.forEach((el) => observer.observe(el));
        signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    } else {
        targets.forEach((el) => el.classList.add('is-visible'));
    }

    document.querySelectorAll('.bg-zinc-900, .product-card, .card').forEach((el) => {
        if (el.closest('nav') || el.closest('#cart-dropdown') || el.closest('#account-dropdown')) return;
        el.classList.add('micro-lift');
    });

    document.querySelectorAll('#prod-img, .hero-cta').forEach((el) => {
        el.setAttribute('data-float', '');
    });
}
