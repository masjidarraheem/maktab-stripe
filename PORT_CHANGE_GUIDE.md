# 🔧 Port Changed from 8787 → 8788

## ✅ Files Updated
- `server.js` - Default port changed to 8788
- `Dockerfile` - EXPOSE and HEALTHCHECK updated
- `docker-compose.yml` - Port mapping updated
- Documentation files updated

## 🚀 Steps to Fix Your 500 Error in Coolify

### 1. **Update Coolify Settings**
In your Coolify deployment for this project:
- Change the **Port** setting from `8787` to `8788`
- Add environment variable: `PORT=8788`

### 2. **Redeploy in Coolify**
- Push these changes to your repository
- Trigger a new deployment in Coolify

### 3. **Update Your Typebot Webhook URL**
Change the webhook URL to use the new port:
```
https://your-coolify-domain.com/create-maktab-checkout
```
(The domain stays the same - Coolify handles the port mapping internally)

## 🔍 Debugging the 500 Error

The 500 error was likely because:
1. Port 8787 was already taken by another project
2. The server couldn't start properly

After changing to port 8788 and redeploying, the error should be resolved.

## 📝 Test Your Setup

After redeployment, test these endpoints:
```bash
# Health check
curl https://your-coolify-domain.com/health

# Test the checkout endpoint manually
curl -X POST https://your-coolify-domain.com/create-maktab-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "parentEmail": "test@example.com",
    "numChildren": "2",
    "students": "Ahmed, Fatima",
    "notes": "Test",
    "option": "TIERED_100_75_50"
  }'
```

You should get back:
```json
{
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/..."
  }
}
```

## ⚠️ Important Notes

- **Coolify handles port mapping** - You still access your app through the normal domain (no port in URL)
- **Environment variable `PORT=8788`** must be set in Coolify
- **The public URL doesn't change** - Only the internal port changes

## 🎯 Summary

1. Redeploy with port 8788 in Coolify
2. Test the health endpoint
3. Test from Typebot
4. Your 500 error should be resolved!
