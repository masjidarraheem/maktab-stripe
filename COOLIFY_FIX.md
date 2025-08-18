# 🔧 Coolify Deployment Fix - Port 8788

## ✅ Changes Made
1. **server.js** - Now uses port 8788 as default
2. **Dockerfile** - EXPOSE and HEALTHCHECK use port 8788
3. **Healthcheck improved** - Added retry logic and start period

## 🚀 Steps to Fix in Coolify

### 1. **Update Environment Variables in Coolify**
Add these in Coolify's environment variables section:
```
PORT=8788

```

### 2. **Update Port in Coolify Settings**
- Set Application Port to: `8788`

### 3. **Push Code and Redeploy**
```bash
git add .
git commit -m "Fix port to 8788 and improve healthcheck"
git push
```

### 4. **Trigger Redeployment in Coolify**

## 🔍 Why Healthcheck Was Failing

The healthcheck was failing because:
1. ❌ Port mismatch (server.js was on 8787, healthcheck checking 8788)
2. ❌ Container needed more time to start up

Now fixed with:
1. ✅ Consistent port 8788 everywhere
2. ✅ 30-second start period before first healthcheck
3. ✅ 3 retries before marking unhealthy
4. ✅ Proper timeout and interval settings

## 🧪 Test After Deployment

```bash
# Should return {"ok":true}
curl https://your-coolify-domain.com/health

# Test the checkout endpoint
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

## 📝 Typebot Configuration

Your webhook URL remains:
```
https://your-coolify-domain.com/create-maktab-checkout
```

Coolify handles the internal port mapping, so the public URL doesn't include the port number.

## ⚠️ Important Notes

- The healthcheck now has a 30-second grace period for startup
- Server is consistently using port 8788
- All secrets are in environment variables (not in code)
- wget is available in the Alpine image for healthchecks
