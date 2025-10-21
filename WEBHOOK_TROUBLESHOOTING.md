# Marz Pay Webhook Troubleshooting Guide

## 🚨 **Why Webhooks Aren't Triggering - Common Issues & Solutions**

Based on the [Marz Pay webhook documentation](https://wallet.wearemarz.com/documentation/webhooks), here are the most common reasons why webhooks don't trigger:

### **1. 🔧 Marz Pay Dashboard Configuration Issues**

#### **Check Your Webhook Settings:**
1. **Go to Marz Pay Dashboard** → Webhooks section
2. **Verify webhook URL**: `https://dick-electronics-voucher-app.vercel.app/api/webhook`
3. **Check events selected**: 
   - ✅ `collection.completed`
   - ✅ `collection.failed`
4. **Ensure webhook is ACTIVE** (not paused/disabled)
5. **Test webhook** using Marz Pay's testing tool

#### **Webhook URL Format:**
```
✅ CORRECT: https://dick-electronics-voucher-app.vercel.app/api/webhook
❌ WRONG: http://localhost:3000/api/webhook
❌ WRONG: http://192.168.1.15:3000/api/webhook
```

### **2. 🔐 Authentication Issues**

#### **Check Environment Variables in Vercel:**
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

```env
NEXT_PUBLIC_APP_URL=https://dick-electronics-voucher-app.vercel.app
MARZ_API_BASE_URL=https://wallet.wearemarz.com/api/v1
MARZ_API_KEY=your_api_key
MARZ_API_SECRET=your_secret
MARZ_BASE64_AUTH=your_base64_auth
```

### **3. 📞 Callback URL Priority**

According to Marz Pay docs:
- **Custom Callback URL** (from payment API) takes priority
- **Webhooks** are used as fallback

**Your payment API sends:**
```javascript
formData.append("callback_url", "https://dick-electronics-voucher-app.vercel.app/api/webhook");
```

This means webhooks should work!

### **4. 🧪 Test Your Webhook Endpoints**

#### **Test Main Webhook:**
```bash
curl https://dick-electronics-voucher-app.vercel.app/api/webhook
```

#### **Test Verification Endpoint:**
```bash
curl https://dick-electronics-voucher-app.vercel.app/api/webhook/verify
```

#### **Test with Sample Payload:**
```bash
curl -X POST https://dick-electronics-voucher-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "collection.completed",
    "transaction": {
      "reference": "test-123",
      "status": "completed",
      "amount": {"raw": 1000, "currency": "UGX"}
    }
  }'
```

### **5. 📊 Check Vercel Function Logs**

1. **Go to Vercel Dashboard**
2. **Your Project** → **Functions** tab
3. **Check webhook logs** for incoming requests
4. **Look for errors** or missing requests

### **6. 🎯 Marz Pay Specific Issues**

#### **Sandbox vs Production:**
- **Sandbox Mode**: Webhooks might not work in sandbox
- **Production Mode**: Webhooks should work normally

#### **Test Payments:**
- **Test payments** might not trigger webhooks
- **Real payments** should trigger webhooks

#### **Payment Status:**
According to Marz Pay docs:
- ✅ **Completed**: Triggers `collection.completed`
- ❌ **Failed**: Triggers `collection.failed`
- ⏳ **Pending**: No webhook sent

### **7. 🔍 Debugging Steps**

#### **Step 1: Verify Webhook Configuration**
```bash
# Test if webhook is accessible
curl https://dick-electronics-voucher-app.vercel.app/api/webhook
```

#### **Step 2: Check Marz Pay Dashboard**
- Webhook URL is correct
- Events are selected
- Webhook is active

#### **Step 3: Make a Test Payment**
1. Use your app to make a payment
2. Complete the payment on your phone
3. Check Vercel logs for webhook calls

#### **Step 4: Check Payment Status**
- Payment might be in "processing" status
- Webhook only sent when status becomes "completed" or "failed"

### **8. 🚀 Quick Fixes**

#### **Fix 1: Update Webhook URL in Marz Pay**
```
https://dick-electronics-voucher-app.vercel.app/api/webhook
```

#### **Fix 2: Check Environment Variables**
Make sure all Marz Pay credentials are set in Vercel

#### **Fix 3: Test with Real Payment**
- Use real phone number
- Use real amount
- Complete payment on phone

#### **Fix 4: Check Marz Pay Account Status**
- Account might be in sandbox mode
- Account might need activation for Uganda

### **9. 📞 Contact Marz Pay Support**

If webhooks still don't work:
1. **Contact Marz Pay Support**
2. **Ask about webhook configuration**
3. **Verify account status**
4. **Check if Uganda services are enabled**

### **10. 🎯 Expected Webhook Flow**

```
1. User initiates payment → Payment API called
2. Marz Pay processes payment → User completes on phone
3. Payment status changes to "completed"
4. Marz Pay sends webhook → Your webhook receives it
5. Webhook generates voucher → User gets voucher
```

## 🧪 **Test Your Setup Now**

1. **Test webhook endpoint**: `https://dick-electronics-voucher-app.vercel.app/api/webhook`
2. **Configure in Marz Pay dashboard**
3. **Make a real payment**
4. **Check Vercel logs for webhook calls**

## 📋 **Checklist**

- [ ] Webhook URL is public and accessible
- [ ] Marz Pay dashboard configured correctly
- [ ] Environment variables set in Vercel
- [ ] Webhook events selected (completed, failed)
- [ ] Webhook is active in Marz Pay
- [ ] Made a real payment test
- [ ] Checked Vercel function logs

**Your webhook implementation is correct - the issue is likely in Marz Pay configuration!** 🎯
