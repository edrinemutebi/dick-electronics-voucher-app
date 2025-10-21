# Marz Pay Webhook URLs Configuration

## 🎯 Webhook URLs for Marz Pay Dashboard

Based on the [Marz Pay documentation](https://wallet.wearemarz.com/documentation/webhooks), here are the webhook URLs you need to configure in your Marz Pay dashboard:

### **Option 1: Single Webhook URL (Recommended)**

**URL**: `https://your-domain.com/api/webhook`

**Handles**: All payment statuses (Success, Failure, Collection Completed)

**Configuration in Marz Pay Dashboard**:
- Go to Webhooks section
- Add webhook URL: `https://your-domain.com/api/webhook`
- Select events: `collection.completed` and `collection.failed`
- Test the webhook

### **Option 2: Separate Webhook URLs (Alternative)**

If you prefer separate endpoints for different statuses:

#### **Success Webhook**
**URL**: `https://your-domain.com/api/webhook/success`
**Purpose**: Handles successful payments
**Events**: `collection.completed`

#### **Failure Webhook**
**URL**: `https://your-domain.com/api/webhook/failure`
**Purpose**: Handles failed payments
**Events**: `collection.failed`

#### **Collection Completed Webhook**
**URL**: `https://your-domain.com/api/webhook/completed`
**Purpose**: Handles completed collections
**Events**: `collection.completed`

## 🔧 Implementation Status

### ✅ **Single Webhook Handler** (`/api/webhook`)
- [x] Handles `collection.completed` events
- [x] Handles `collection.failed` events
- [x] Generates vouchers for successful payments
- [x] Updates payment status
- [x] Returns HTTP 200 for acknowledgment

### ✅ **Separate Webhook Handlers**
- [x] `/api/webhook/success` - Success payments
- [x] `/api/webhook/failure` - Failed payments  
- [x] `/api/webhook/completed` - Completed collections

## 📋 Marz Pay Dashboard Configuration

### **Step 1: Access Marz Pay Dashboard**
1. Log in to your Marz Pay account
2. Navigate to **Webhooks** section
3. Click **"Create Webhook"** or **"Add Webhook"**

### **Step 2: Configure Webhook URLs**

#### **For Single Webhook (Recommended)**
```
Webhook URL: https://your-domain.com/api/webhook
Events: 
  ✅ collection.completed
  ✅ collection.failed
Method: POST
```

#### **For Separate Webhooks**
```
Success Webhook:
  URL: https://your-domain.com/api/webhook/success
  Events: ✅ collection.completed

Failure Webhook:
  URL: https://your-domain.com/api/webhook/failure
  Events: ✅ collection.failed

Collection Completed Webhook:
  URL: https://your-domain.com/api/webhook/completed
  Events: ✅ collection.completed
```

### **Step 3: Test Webhooks**
1. Use Marz Pay's webhook testing tool
2. Send test webhooks to verify endpoints
3. Check your server logs for webhook calls

## 🧪 Testing Your Webhooks

### **Test Single Webhook**
```bash
# Test success webhook
curl -X POST https://your-domain.com/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "collection.completed",
    "transaction": {
      "reference": "test-success-123",
      "status": "completed",
      "amount": {"raw": 1000, "currency": "UGX"}
    }
  }'

# Test failure webhook
curl -X POST https://your-domain.com/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "collection.failed",
    "transaction": {
      "reference": "test-failure-456",
      "status": "failed",
      "amount": {"raw": 1000, "currency": "UGX"}
    }
  }'
```

### **Test Separate Webhooks**
```bash
# Test success endpoint
curl -X POST https://your-domain.com/api/webhook/success \
  -H "Content-Type: application/json" \
  -d '{"event_type": "collection.completed", "transaction": {"reference": "test-123", "status": "completed"}}'

# Test failure endpoint
curl -X POST https://your-domain.com/api/webhook/failure \
  -H "Content-Type: application/json" \
  -d '{"event_type": "collection.failed", "transaction": {"reference": "test-456", "status": "failed"}}'

# Test completed endpoint
curl -X POST https://your-domain.com/api/webhook/completed \
  -H "Content-Type: application/json" \
  -d '{"event_type": "collection.completed", "transaction": {"reference": "test-789", "status": "completed"}}'
```

## 🚨 Important Notes

### **1. Domain Requirements**
- ❌ **Don't use localhost**: `http://localhost:3000/api/webhook`
- ✅ **Use public domain**: `https://your-domain.com/api/webhook`
- ✅ **Use ngrok for testing**: `https://abc123.ngrok.io/api/webhook`

### **2. HTTPS Required**
- Marz Pay requires HTTPS for webhook URLs
- Use SSL certificate for production
- ngrok provides HTTPS for testing

### **3. Response Requirements**
- Always return HTTP 200 status
- Respond within 30 seconds
- Handle duplicate webhooks (idempotency)

## 🔄 Webhook Flow

### **Complete Payment Flow**
1. **User initiates payment** → Collection API called
2. **Marz Pay processes payment** → User completes payment
3. **Marz Pay sends webhook** → Your webhook handler receives notification
4. **Voucher generated** → Stored in system
5. **Frontend polls status** → Shows voucher to user

### **Webhook Priority**
- **Custom Callback URL**: If provided during collection, takes priority
- **Webhooks**: If no custom callback URL, webhooks are used as fallback

## 📊 Monitoring & Logs

### **Check Webhook Logs**
```bash
# Look for these log messages
grep "webhook received" your-app-logs.log
grep "Payment completed" your-app-logs.log
grep "Payment failed" your-app-logs.log
```

### **Expected Log Messages**
```
Marz Pay webhook received: {
  event_type: "collection.completed",
  transaction_reference: "abc123",
  transaction_status: "completed"
}
Payment completed for reference: abc123
Generated voucher: V1000-A1B2 for amount: 1000
```

## 🚀 Next Steps

1. **Choose webhook configuration** (single or separate)
2. **Set up public domain** (not localhost)
3. **Configure webhooks in Marz Pay dashboard**
4. **Test webhooks with Marz Pay testing tool**
5. **Monitor webhook logs**
6. **Test with real payments**

## 📞 Support

- **Marz Pay Documentation**: [Webhooks Guide](https://wallet.wearemarz.com/documentation/webhooks)
- **Marz Pay Support**: Contact for API issues
- **Your Implementation**: Check logs and test endpoints
