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
  SUCCESS_URL = 'https://maktab.rodeomasjid.org/success?session_id={CHECKOUT_SESSION_ID}',
  CANCEL_URL  = 'https://maktab.rodeomasjid.org/cancel',
  STRIPE_WEBHOOK_SECRET         // set after you add the webhook in Stripe
} = process.env;

// Simple in-memory store (replace with database in production)
const enrollments = new Map();
const webhookEvents = new Map();

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const app = express();

// CORS configuration - TEMPORARY: Allow all origins for testing
// TODO: Restrict this in production!
const corsOptions = {
  origin: true,  // Allow all origins temporarily for testing
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path} from ${req.headers.origin || 'no-origin'}`);
  next();
});

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

// Get all enrollments (for admin dashboard)
app.get('/enrollments', (req, res) => {
  const allEnrollments = Array.from(enrollments.values());
  res.json({
    total: allEnrollments.length,
    active: allEnrollments.filter(e => e.status === 'active').length,
    enrollments: allEnrollments
  });
});

// Get specific enrollment by customer ID
app.get('/enrollment/:customerId', (req, res) => {
  const enrollment = enrollments.get(req.params.customerId);
  if (!enrollment) {
    return res.status(404).json({ error: 'Enrollment not found' });
  }
  res.json(enrollment);
});

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
  console.log('📍 /create-maktab-checkout called');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    let parentEmail, numChildren, students, notes;
    
    // Check if request is from Typebot (has variables array)
    if (req.body?.variables && Array.isArray(req.body.variables)) {
      console.log('🤖 Typebot format detected, extracting from variables array');
      const vars = {};
      req.body.variables.forEach(v => {
        vars[v.name] = v.value;
      });
      
      // Extract parent email
      parentEmail = vars.parentEmail || vars.email || vars.parent_email;
      
      // Count number of students from individual student variables
      const studentNames = [];
      // Check for numbered student variables (student, student1, student2, etc.)
      const studentKeys = Object.keys(vars).filter(key => key.match(/^student\d*$/));
      studentKeys.sort(); // Ensure proper order
      
      studentKeys.forEach(key => {
        if (vars[key] && vars[key].trim()) {
          studentNames.push(vars[key].trim());
        }
      });
      
      numChildren = studentNames.length || vars.numChildren || vars.num_children;
      students = studentNames.join(', ') || vars.students || '';
      notes = vars.notes || '';
      
      console.log(`📊 Extracted: email=${parentEmail}, children=${numChildren}, students=${students}`);
    } else {
      // Original format for direct API calls
      ({ parentEmail, numChildren, students, notes } = req.body || {});
    }
    
    // Validate required fields
    if (!parentEmail) {
      console.error('❌ Missing parentEmail');
      return res.status(400).json({ error: { message: 'parentEmail required' } });
    }
    
    const n = Number(numChildren);
    if (!Number.isInteger(n) || n < 1) {
      console.error('❌ Invalid numChildren:', numChildren);
      return res.status(400).json({ error: { message: 'numChildren must be integer >= 1' } });
    }
    
    console.log(`✅ Valid request: ${parentEmail}, ${n} children`);

    const regItems = [{ price: REGISTRATION_PRICE_ID, quantity: 1 }];  // Flat $100 registration fee
    const subItems = makeSubItemsTiered(n);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: parentEmail,  // This automatically creates a customer in subscription mode
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
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.sendStatus(400);
  }

  // Prevent duplicate processing
  if (webhookEvents.has(event.id)) {
    console.log(`⚠️  Duplicate webhook event: ${event.id}`);
    return res.sendStatus(200);
  }
  webhookEvents.set(event.id, Date.now());

  console.log(`📨 Webhook received: ${event.type} [${event.id}]`);

  // Handle events you care about
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`✅ Checkout completed for: ${session.customer_email}`);
        
        // Store enrollment data
        const enrollment = {
          sessionId: session.id,
          customerId: session.customer,
          customerEmail: session.customer_email,
          subscriptionId: session.subscription,
          metadata: session.metadata,
          students: session.metadata?.students,
          numChildren: session.metadata?.numChildren,
          notes: session.metadata?.notes,
          enrolledAt: new Date().toISOString(),
          status: 'active'
        };
        
        enrollments.set(session.customer, enrollment);
        console.log(`📝 Enrollment recorded for customer: ${session.customer}`);
        
        // TODO: Send confirmation email to parent
        // TODO: Notify admin of new enrollment
        // TODO: Create accounts in your learning management system
        
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log(`💰 Payment received from: ${invoice.customer_email} - Amount: $${(invoice.amount_paid / 100).toFixed(2)}`);
        
        // Update enrollment payment history
        const enrollment = enrollments.get(invoice.customer);
        if (enrollment) {
          if (!enrollment.payments) enrollment.payments = [];
          enrollment.payments.push({
            invoiceId: invoice.id,
            amount: invoice.amount_paid,
            date: new Date().toISOString()
          });
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log(`🚫 Subscription cancelled: ${subscription.id}`);
        
        // Mark enrollment as cancelled
        for (const [customerId, enrollment] of enrollments.entries()) {
          if (enrollment.subscriptionId === subscription.id) {
            enrollment.status = 'cancelled';
            enrollment.cancelledAt = new Date().toISOString();
            console.log(`📝 Marked enrollment as cancelled for customer: ${customerId}`);
          }
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`⚠️  Payment failed for: ${invoice.customer_email}`);
        
        // Mark enrollment as at-risk
        const enrollment = enrollments.get(invoice.customer);
        if (enrollment) {
          enrollment.status = 'payment_failed';
          enrollment.lastFailedPayment = new Date().toISOString();
        }
        
        // TODO: Send payment failure notification to parent
        // TODO: Notify admin of payment issue
        break;
      }
      
      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${event.type}:`, err);
    // Don't return error to Stripe, just log it
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 8788;
app.listen(PORT, () => console.log(`API listening on ${PORT}`));
