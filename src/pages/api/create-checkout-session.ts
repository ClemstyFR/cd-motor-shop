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

const MAX_QTY_PER_ITEM = 10;
const MAX_CART_QTY = 20;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return json({ error: 'Connexion requise' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ error: 'Session invalide' }, 401);
    }

    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Panier vide' }, 400);
    }

    const origin = import.meta.env.SITE || 'https://cd-motor-shop.vercel.app';

    const normalizedItems = items.map((item: any) => {
      const product = PRODUCTS[item?.id as keyof typeof PRODUCTS];
      const qty = Number(item?.qty);

      if (!product) throw new Error('Produit invalide');
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
        throw new Error('Quantité invalide');
      }

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        qty,
      };
    });

    const totalQty = normalizedItems.reduce((sum, item) => sum + item.qty, 0);
    if (totalQty > MAX_CART_QTY) {
      return json({ error: 'Quantité maximale dépassée' }, 400);
    }

    const lineItems = normalizedItems.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      metadata: {
        user_id: user.id,
        items_json: JSON.stringify(normalizedItems),
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/`,
    });

    return json({ url: session.url });

  } catch (err: any) {
    console.error('Stripe error:', err);
    return json({ error: err.message || 'Erreur serveur' }, 500);
  }
};
