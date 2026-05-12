import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRODUCTS = {
    'deep-matte-01': {
        id: 'deep-matte-01',
        name: 'Deep Matte',
        price: 29.90,
    },
} as const;

export const POST: APIRoute = async ({ request }) => {
    const sig  = request.headers.get('stripe-signature');
    const body = await request.text();

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            sig!,
            import.meta.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err: any) {
        console.error('Webhook signature error:', err.message);
        return new Response(`Webhook error: ${err.message}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;

        // Récupère les items depuis les metadata (incluant les images)
        let items = [];
        try {
            const parsed = JSON.parse(session.metadata?.items_json || '[]');
            items = Array.isArray(parsed)
                ? parsed.map((item: any) => {
                    const product = PRODUCTS[item?.id as keyof typeof PRODUCTS];
                    const qty = Number(item?.qty);
                    if (!product || !Number.isInteger(qty) || qty < 1) return null;
                    return {
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        qty,
                    };
                }).filter(Boolean)
                : [];
        } catch {
            items = [];
        }

        const { data: existingOrder, error: lookupError } = await supabase
            .from('orders')
            .select('id')
            .eq('stripe_session_id', session.id)
            .maybeSingle();

        if (lookupError) {
            console.error('Supabase lookup error:', lookupError);
            return new Response(JSON.stringify({ error: lookupError.message }), { status: 500 });
        }

        if (existingOrder) {
            return new Response(JSON.stringify({ received: true, duplicate: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { error } = await supabase.from('orders').insert({
            user_id: session.metadata?.user_id || null,
            total:   session.amount_total / 100,
            status:  'en cours',
            items,
            stripe_session_id: session.id,
        });

        if (error) {
            console.error('Supabase insert error:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};
