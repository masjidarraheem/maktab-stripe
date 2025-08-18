# 🔍 Debugging Typebot "fetch failed" Error

## The Problem
Typebot is getting: `TypeError: fetch failed` - this means Typebot's server **cannot reach your API**.

## ✅ Quick Fixes Applied
1. **CORS**: Temporarily allowing ALL origins for testing
2. **Logging**: Added detailed request logging
3. **Error handling**: Better error messages

## 🧪 Step-by-Step Debugging

### 1. **Verify Your API is Publicly Accessible**

First, check if your Coolify deployment is actually running and accessible:

```bash
# From your local machine (not the server)
curl https://your-coolify-domain.com/health
```

**Expected:** `{"ok":true}`

If this doesn't work, your server isn't accessible. Check:
- Is the deployment successful in Coolify?
- Is the domain configured correctly?
- Are there any firewall issues?

### 2. **Test the Checkout Endpoint Directly**

```bash
curl -X POST https://your-coolify-domain.com/create-maktab-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "parentEmail": "test@example.com",
    "numChildren": "2",
    "students": "Ahmed, Fatima",
    "notes": "Test from curl",
    "option": "TIERED_100_75_50"
  }'
```

**Expected:** A JSON response with `checkoutUrl`

### 3. **Check Coolify Logs**

In Coolify, check the application logs for:
- `📥` Request logs
- `📍 /create-maktab-checkout called` 
- Error messages

### 4. **Common Issues & Solutions**

#### ❌ **Issue: "fetch failed"**
**Causes:**
1. Server not accessible from internet
2. Wrong URL in Typebot
3. SSL/HTTPS certificate issues

**Solutions:**
1. Verify the URL: Should be `https://` (not `http://`)
2. No port number in URL (Coolify handles this)
3. Domain must be fully qualified

#### ❌ **Issue: CORS Error** 
**Solution:** We've temporarily allowed all origins. This should not be the issue now.

#### ❌ **Issue: 400 Bad Request**
**Check:** Your Typebot variable names match exactly:
- `parentEmail` (not `email`)
- `numChildren` (not `numberOfChildren`)
- Case sensitive!

## 📝 Typebot Configuration Checklist

### ✅ Webhook Block Settings:
```
URL: https://your-coolify-domain.com/create-maktab-checkout
Method: POST
Headers: 
{
  "Content-Type": "application/json"
}
Body:
{
  "parentEmail": "{{parentEmail}}",
  "numChildren": "{{numChildren}}",
  "students": "{{students}}",
  "notes": "{{notes}}",
  "option": "TIERED_100_75_50"
}
```

### ✅ Response Mapping:
- Save `data.checkoutUrl` to variable `checkoutUrl`

## 🚨 Most Likely Issues

Based on the "fetch failed" error, the most likely issues are:

1. **Your Coolify app isn't accessible from the internet yet**
   - Check if the deployment is complete
   - Verify the domain is configured
   - Test with curl from your local machine

2. **Wrong URL in Typebot**
   - Must be HTTPS
   - No port number
   - Correct domain

3. **Coolify deployment issue**
   - Check if healthcheck is passing
   - Look at Coolify logs for errors
   - Ensure all environment variables are set

## 📊 What to Check in Coolify

1. **Application Status**: Is it running?
2. **Healthcheck**: Is it passing?
3. **Logs**: Any error messages?
4. **Environment Variables**: All set correctly?
5. **Domain**: Is it configured and SSL working?

## 🔧 Quick Test Script

Save this as `test.html` and open in browser:

```html
<!DOCTYPE html>
<html>
<head><title>API Test</title></head>
<body>
<h1>Test Maktab API</h1>
<button onclick="testAPI()">Test API</button>
<pre id="result"></pre>
<script>
async function testAPI() {
  const result = document.getElementById('result');
  result.textContent = 'Testing...';
  
  try {
    const response = await fetch('https://your-coolify-domain.com/create-maktab-checkout', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        parentEmail: 'test@example.com',
        numChildren: '2',
        students: 'Test Student 1, Test Student 2',
        notes: 'Browser test',
        option: 'TIERED_100_75_50'
      })
    });
    
    const data = await response.json();
    result.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    result.textContent = 'Error: ' + error.message;
  }
}
</script>
</body>
</html>
```

Replace `your-coolify-domain.com` with your actual domain and test!

## 💡 Next Steps

1. **Push the updated code** with better logging
2. **Redeploy in Coolify**
3. **Test with curl first**
4. **Check Coolify logs**
5. **Then test from Typebot**

The detailed logging will show exactly what's happening!
