# Typebot-Stripe Integration Guide for Maktab Registration

## ✅ Prerequisites Checklist

### 1. **Stripe Configuration**
- [ ] Created Products and Prices in Stripe Dashboard:
  - Registration Fee (one-time)
  - Tuition First Child ($100/mo)
  - Tuition Second Child ($75/mo)  
  - Tuition Third+ Child ($50/mo)
- [ ] Price IDs added to `.env` file
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook events selected:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.deleted`

### 2. **Coolify Deployment**
- [ ] Application deployed to Coolify
- [ ] Environment variables configured in Coolify
- [ ] Health check passing at `/health`
- [ ] Domain configured with HTTPS

### 3. **Webhook Configuration in Stripe**
Add your webhook endpoint URL in Stripe Dashboard:
```
https://your-coolify-domain.com/stripe-webhook
```

Select these events:
- `checkout.session.completed` ✅
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.deleted`

Copy the webhook signing secret and add to your `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

## 📝 Typebot Configuration

### Step 1: Collect Parent Information
Create input blocks in Typebot to collect:
1. `parentEmail` - Email input block
2. `numChildren` - Number input block (minimum: 1)
3. `students` - Text input block (comma-separated names)
4. `notes` - Text input block (optional)

### Step 2: Add Webhook Block
Configure a webhook block with:

**URL:** `https://your-coolify-domain.com/create-maktab-checkout`

**Method:** POST

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "parentEmail": "{{parentEmail}}",
  "numChildren": "{{numChildren}}",
  "students": "{{students}}",
  "notes": "{{notes}}",
  "option": "TIERED_100_75_50"
}
```

**Response Variable Mapping:**
- Save `data.checkoutUrl` to a variable called `checkoutUrl`

### Step 3: Redirect to Stripe
Add a "Redirect" block that redirects to:
```
{{checkoutUrl}}
```

### Step 4: Handle Success/Cancel Pages
Create pages on your website for:
- `/success` - Show enrollment confirmation
- `/cancel` - Allow retry or contact support

Update these URLs in your `.env`:
```
SUCCESS_URL=https://your-website.com/success?session_id={CHECKOUT_SESSION_ID}
CANCEL_URL=https://your-website.com/cancel
```

## 🔍 Testing the Integration

### 1. Test with Stripe Test Mode
- Use Stripe test keys first
- Test card: `4242 4242 4242 4242`
- Any future expiry date and any CVC

### 2. Test Webhook Events
Use Stripe CLI to test locally:
```bash
stripe listen --forward-to localhost:8788/stripe-webhook
```

Trigger test events:
```bash
stripe trigger checkout.session.completed
```

### 3. Monitor Enrollments
Check enrollments via API:
```bash
# Get all enrollments
curl https://your-domain.com/enrollments

# Get specific enrollment
curl https://your-domain.com/enrollment/{customerId}
```

## 🚀 Production Checklist

Before going live:
- [ ] Switch to Stripe live keys
- [ ] Update SUCCESS_URL and CANCEL_URL to production URLs
- [ ] Set up database persistence (replace in-memory storage)
- [ ] Configure CORS for your specific domains
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure email notifications
- [ ] Set up backup webhook endpoint
- [ ] Test end-to-end flow with real payment

## 📊 Monitoring & Maintenance

### Check Application Health
```bash
curl https://your-domain.com/health
```

### View Enrollments
```bash
curl https://your-domain.com/enrollments
```

### Webhook Event Logs
Check Stripe Dashboard → Developers → Webhooks → [Your endpoint] → Webhook attempts

### Common Issues & Solutions

**Issue:** Webhook signature verification failed
**Solution:** Ensure `STRIPE_WEBHOOK_SECRET` matches the one in Stripe Dashboard

**Issue:** Typebot not receiving checkout URL
**Solution:** Check webhook response format and variable mapping

**Issue:** Subscription not created
**Solution:** Verify all Price IDs are correct and products are active in Stripe

## 🔐 Security Considerations

1. **Never expose** your Stripe secret key
2. **Validate** webhook signatures (already implemented)
3. **Use HTTPS** for all endpoints
4. **Implement rate limiting** for production
5. **Add authentication** to admin endpoints (`/enrollments`)

## 📧 Next Steps - Email Integration

Consider adding:
1. Welcome email after successful enrollment
2. Payment receipt emails
3. Failed payment notifications
4. Upcoming renewal reminders

## 🗄️ Database Integration

Current implementation uses in-memory storage. For production, integrate with:
- PostgreSQL
- MongoDB
- MySQL
- Or your preferred database

Replace the `enrollments` Map with database queries.
