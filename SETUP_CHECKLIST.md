# 🚀 Quick Setup Checklist for Typebot-Stripe Integration

You mentioned you have this running in Coolify with Stripe webhooks configured. Here's what you need to complete:

## ✅ Immediate Action Items

### 1. **Update Environment Variables** 🔴 CRITICAL
Edit your `.env` file and update these URLs to your actual domains:
```bash
SUCCESS_URL=https://your-actual-domain.com/success?session_id={CHECKOUT_SESSION_ID}
CANCEL_URL=https://your-actual-domain.com/cancel
```

### 2. **Configure Stripe Webhook Events**
Ensure these events are selected in your Stripe webhook:
- ✅ `checkout.session.completed` (you mentioned this is done)
- ⚠️ `invoice.payment_succeeded` (for tracking monthly payments)
- ⚠️ `invoice.payment_failed` (for payment failures)
- ⚠️ `customer.subscription.deleted` (for cancellations)

Your webhook URL should be:
```
https://your-coolify-domain.com/stripe-webhook
```

### 3. **Configure Typebot Webhook Block**
In your Typebot flow, set up the webhook block:

**Endpoint:** `https://your-coolify-domain.com/create-maktab-checkout`

**Request Body:**
```json
{
  "parentEmail": "{{parentEmail}}",
  "numChildren": "{{numChildren}}",
  "students": "{{students}}",
  "notes": "{{notes}}",
  "option": "TIERED_100_75_50"
}
```

**Save Response:** Map `data.checkoutUrl` to a variable

**Redirect:** Use the `{{checkoutUrl}}` variable to redirect users to Stripe

### 4. **Update CORS Settings** (if needed)
In `server.js`, add your Typebot and website domains to the `allowedOrigins` array (lines 32-39).

### 5. **Test the Integration**
```bash
# Check if your service is running
curl https://your-coolify-domain.com/health

# View enrollments (after testing)
curl https://your-coolify-domain.com/enrollments
```

## 📝 What We've Implemented for You

### ✅ Enhanced Webhook Handling
- Processes enrollment data from `checkout.session.completed`
- Tracks payment history
- Handles subscription cancellations
- Prevents duplicate event processing
- Comprehensive logging with emojis for easy debugging

### ✅ Monitoring Endpoints
- `/health` - Health check for Coolify
- `/enrollments` - View all enrollments
- `/enrollment/:customerId` - Get specific enrollment details

### ✅ CORS Configuration
- Set up to work with Typebot
- Configurable for your production domains

### ✅ Error Handling
- Webhook signature verification
- Duplicate event prevention
- Graceful error handling

## ⚠️ Important Notes

1. **Current Storage:** Using in-memory storage (data lost on restart). For production, implement database storage.

2. **Security:** Add authentication to the `/enrollments` endpoints before production.

3. **Success/Cancel Pages:** Create these pages on your website to handle post-payment flow.

4. **Email Notifications:** Consider adding email confirmations (see TODOs in webhook handlers).

## 🧪 Testing Commands

Test locally with Stripe CLI:
```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:8788/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
```

## 🔍 Debugging Tips

1. **Check Logs in Coolify** - Look for emoji indicators:
   - ✅ Success
   - ❌ Errors
   - ⚠️ Warnings
   - 📨 Webhook received
   - 💰 Payment received

2. **Verify Webhook Signature** - If failing, double-check `STRIPE_WEBHOOK_SECRET` in your environment

3. **Test Typebot Connection** - Use browser DevTools Network tab to see the webhook response

## 🎯 You're Almost There!

Just complete items 1-3 in the "Immediate Action Items" section above, and your integration should be fully functional!
