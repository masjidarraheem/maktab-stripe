const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Stripe = require('stripe');

const {
  STRIPE_SECRET_KEY,
  REGISTRATION_PRICE_ID,        // one-time $100
  TUITION_FIRST_PRICE_ID,       // $100/mo
  TUITION_SECOND_PRICE_ID,      // $75/mo (first sibling)
  TUITION_THIRDPLUS_PRICE_ID,   // $50/mo (each additional sibling after first)
  SUCCESS_URL = 'https://your.site/success?session_id={CHECKOUT_SESSION_ID}',
  CANCEL_URL  = 'https://your.site/cancel',
  STRIPE_WEBHOOK_SECRET         // set after you add the webhook in Stripe
} = process.env;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const app = express();
app.use(cors());

// IMPORTANT: JSON for normal routes, RAW for webhook route
app.use((req, res, next) => {
  if (req.originalUrl === '/stripe-webhook') return next();
  bodyParser.json()(req, res, next);
});

// ---------- Business logic helpers ----------
function makeSubItemsTiered(n) {
  // n >= 1
  const sub = [];
  if (n >= 1) sub.push({ price: TUITION_FIRST_PRICE_ID, quantity: 1 });          // $100
  if (n >= 2) sub.push({ price: TUITION_SECOND_PRICE_ID, quantity: 1 });         // $75
  if (n >= 3) sub.push({ price: TUITION_THIRDPLUS_PRICE_ID, quantity: n - 2 });  // $50 each
  return sub;
}

// ---------- Endpoints ----------

// Healthcheck (Coolify will like this)
app.get('/health', (_req, res) => res.json({ ok: true }));

/**
 * POST /create-maktab-checkout
 * Body (from Typebot):
 * {
 *   "parentEmail": "{{parentEmail}}",
 *   "numChildren": "{{numChildren}}",
 *   "students": "{{students}}",  // comma-separated string
 *   "notes": "{{notes}}",
 *   "option": "TIERED_100_75_50" // not used now, but kept for future
 * }
 */
app.post('/create-maktab-checkout', async (req, res) => {
  try {
    const { parentEmail, numChildren, students, notes } = req.body || {};
    if (!parentEmail) return res.status(400).json({ error: { message: 'parentEmail required' } });
    const n = Number(numChildren);
    if (!Number.isInteger(n) || n < 1) {
      return res.status(400).json({ error: { message: 'numChildren must be integer >= 1' } });
    }

    const regItems = [{ price: REGISTRATION_PRICE_ID, quantity: n }];
    const subItems = makeSubItemsTiered(n);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_creation: 'always',
      customer_email: parentEmail,
      line_items: [...regItems, ...subItems],   // mixed cart: one-time + subscription items
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      metadata: {
        policy: 'TIERED_100_75_50',
        students: students || '',
        numChildren: String(n),
        notes: notes || ''
      },
      subscription_data: {
        metadata: {
          policy: 'TIERED_100_75_50',
          students: students || '',
          numChildren: String(n),
          notes: notes || ''
        }
      }
    });

    return res.json({ data: { checkoutUrl: session.url } });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: { message: err.message } });
  }
});

// Stripe webhook (must receive RAW body)
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.sendStatus(400);
  }

  // Handle events you care about
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      // TODO: mark family enrolled in your DB
      break;
    }
    case 'invoice.payment_succeeded': {
      // TODO: mark monthly payment received
      break;
    }
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      // TODO: pause/remove enrollment
      break;
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`API listening on ${PORT}`));
