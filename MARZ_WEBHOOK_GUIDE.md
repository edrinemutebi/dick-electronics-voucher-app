# Marz Pay Webhook Integration Guide

Based on the [official Marz Pay webhook documentation](https://wallet.wearemarz.com/documentation/webhooks), here's how to properly integrate with their webhook system.

## 🔗 Webhook Setup

### 1. **Webhook URL Configuration**
Your webhook URL should be: `https://your-domain.com/api/webhook`

**Important:** 
- ❌ Don't use `localhost` - Marz Pay can't reach your local machine
- ✅ Use a public URL (ngrok for testing, production domain for live)

### 2. **Marz Pay Dashboard Setup**
1. Go to Webhooks in your Marz Pay dashboard
2. Click "Create Webhook" 
3. Enter your endpoint URL: `https://your-domain.com/api/webhook`
4. Select events: `collection.completed` and `collection.failed`
5. Test your webhook to ensure it's working

## 📨 Webhook Payload Structure

### Successful Payment Payload
```json
{
  "event_type": "collection.completed",
  "transaction": {
    "uuid": "transaction-uuid",
    "reference": "your-reference-id",
    "status": "completed",
    "amount": {
      "formatted": "1,000.00",
      "raw": 1000,
      "currency": "UGX"
    },
    "provider": "mtn",
    "phone_number": "+256712345678",
    "description": "Voucher payment 1000",
    "created_at": "2025-08-20T15:18:48.000000Z",
    "updated_at": "2025-08-20T15:18:48.000000Z"
  },
  "collection": {
    "provider": "mtn",
    "phone_number": "+256712345678",
    "amount": {
      "formatted": "1,000.00",
      "raw": 1000,
      "currency": "UGX"
    },
    "mode": "mtnuganda",
    "provider_reference": "mtn-transaction-id"
  },
  "business": {
    "uuid": "business-uuid",
    "name": "Business Name"
  },
  "metadata": {
    "sandbox_mode": false,
    "environment": "production",
    "timestamp": "2025-08-20T15:18:48.000000Z"
  }
}
```

### Failed Payment Payload
```json
{
  "event_type": "collection.failed",
  "transaction": {
    "uuid": "transaction-uuid",
    "reference": "your-reference-id",
    "status": "failed",
    "amount": {
      "formatted": "1,000.00",
      "raw": 1000,
      "currency": "UGX"
    },
    "provider": "mtn",
    "phone_number": "+256712345678",
    "description": "Voucher payment 1000",
    "created_at": "2025-08-20T15:18:48.000000Z",
    "updated_at": "2025-08-20T15:18:48.000000Z"
  }
}
```

## 🔄 Callback Flow

### Complete Transaction Flow
1. **Business creates collection request** (with callback URL)
2. **MTN/Airtel processes payment**
3. **MTN/Airtel sends callback** to Marz Pay
4. **Marz Pay processes the callback**
5. **IF payment is successful:**
   - Transaction status updated to 'completed'
   - Business balance updated
   - **Callback sent to business** (your webhook)
6. **All processing complete**

### Callback Priority System
- **Custom Callback URL:** If provided during collection, takes priority
- **Webhooks:** If no custom callback URL, webhooks are used as fallback

## 📊 Status Mapping

### MTN Status Mapping
- `successful/completed/success` → `completed`
- `failed/rejected/failure` → `failed`
- `pending/timeout/pending_confirmation` → `pending`
- `expired` → `failed`

### Airtel Status Mapping
- `TS (Transaction Successful)` → `completed`
- `TF (Transaction Failed)` → `failed`
- `TP (Transaction Pending)` → `pending`

## 🛠️ Implementation Details

### Your Webhook Handler
```javascript
// Handles Marz Pay webhook payloads
switch (eventType) {
  case "collection.completed":
    // Generate voucher for successful payment
    const voucher = generateVoucher(payment.amount);
    updatePaymentStatus(reference, "successful", voucher);
    break;
    
  case "collection.failed":
    // Handle failed payment
    updatePaymentStatus(reference, "failed");
    break;
}
```

### Key Points:
- ✅ **Always return HTTP 200** to acknowledge receipt
- ✅ **Use transaction.reference** to identify payments
- ✅ **Handle both event_type and transaction.status**
- ✅ **Implement idempotency** for duplicate callbacks

## 🧪 Testing Your Webhook

### 1. **Local Testing with ngrok**
```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# Use the ngrok URL in Marz Pay dashboard
# Example: https://abc123.ngrok.io/api/webhook
```

### 2. **Test Webhook Payload**
```bash
# Test successful payment
curl -X POST https://your-domain.com/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "collection.completed",
    "transaction": {
      "reference": "test-reference-123",
      "status": "completed",
      "amount": {"raw": 1000, "currency": "UGX"}
    }
  }'
```

### 3. **Monitor Logs**
Look for these log messages:
```
Marz Pay webhook received: {
  event_type: "collection.completed",
  transaction_reference: "test-reference-123",
  transaction_status: "completed"
}
Payment completed for reference: test-reference-123
Generated voucher: V1000-A1B2 for amount: 1000
```

## 🚨 Common Issues & Solutions

### Issue 1: Webhook Not Receiving Callbacks
**Solution:** 
- Check webhook URL is public (not localhost)
- Verify webhook is configured in Marz Pay dashboard
- Test webhook endpoint manually

### Issue 2: Duplicate Callbacks
**Solution:**
- Implement idempotency using transaction reference
- Check if payment already processed before generating voucher

### Issue 3: Webhook Timeout
**Solution:**
- Return HTTP 200 immediately
- Process webhook data asynchronously
- Use queue system for heavy processing

## 📈 Production Checklist

- [ ] Webhook URL is public and accessible
- [ ] Webhook configured in Marz Pay dashboard
- [ ] Test webhook with real payments
- [ ] Monitor webhook logs
- [ ] Handle duplicate callbacks
- [ ] Return HTTP 200 for all webhook requests
- [ ] Implement proper error handling
- [ ] Set up monitoring and alerts

## 🔗 References

- [Marz Pay Webhook Documentation](https://wallet.wearemarz.com/documentation/webhooks)
- [Marz Pay API Documentation](https://wallet.wearemarz.com/documentation)
- [Webhook Best Practices](https://wallet.wearemarz.com/documentation/webhooks#best-practices)
