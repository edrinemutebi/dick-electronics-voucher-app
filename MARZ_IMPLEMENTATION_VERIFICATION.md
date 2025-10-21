# Marz Pay Implementation Verification

## 🔍 Current Implementation Status

### ✅ What We Have Implemented Correctly

1. **Collection API Integration** (`app/api/pay/route.js`)
   - ✅ Correct API endpoint: `https://wallet.wearemarz.com/api/v1/collect-money`
   - ✅ Proper form data structure with all required fields
   - ✅ Phone number formatting for Uganda (+256XXXXXXXXX)
   - ✅ Callback URL configuration
   - ✅ Authentication with Basic Auth

2. **Webhook Handler** (`app/api/webhook/route.js`)
   - ✅ Handles Marz Pay webhook payload structure
   - ✅ Processes `collection.completed` and `collection.failed` events
   - ✅ Returns HTTP 200 for acknowledgment
   - ✅ Generates vouchers for successful payments

3. **Payment Status Tracking** (`app/lib/storage.js`)
   - ✅ Stores pending payments with reference IDs
   - ✅ Updates payment status based on webhook events
   - ✅ Tracks voucher generation

### 🔧 Required Webhook URLs for Marz Pay Dashboard

Based on the Marz Pay documentation, you need to configure these webhook URLs in your Marz Pay dashboard:

#### **Primary Webhook URL (Recommended)**
```
https://your-domain.com/api/webhook
```

#### **Alternative: Separate Endpoints for Each Status**
If you want separate endpoints for different statuses:

```
Success: https://your-domain.com/api/webhook/success
Failure: https://your-domain.com/api/webhook/failure  
Collection Completed: https://your-domain.com/api/webhook/completed
```

## 📋 Implementation Checklist

### ✅ Collection API (app/api/pay/route.js)
- [x] Correct API endpoint: `/collect-money`
- [x] Proper form data structure
- [x] Phone number formatting
- [x] Callback URL configuration
- [x] Authentication headers
- [x] Error handling

### ✅ Webhook Handler (app/api/webhook/route.js)
- [x] Handles `collection.completed` events
- [x] Handles `collection.failed` events
- [x] Returns HTTP 200 status
- [x] Generates vouchers for successful payments
- [x] Updates payment status

### ✅ Frontend Integration (app/page.js)
- [x] Payment form with validation
- [x] Phone number validation for Uganda
- [x] Amount selection
- [x] Payment status polling
- [x] Voucher display
- [x] Error handling

### ✅ Storage System (app/lib/storage.js)
- [x] Pending payment storage
- [x] Voucher storage
- [x] Status updates
- [x] Reference tracking

## 🚨 Issues to Fix

### 1. **Webhook URL Configuration**
**Current Issue**: Using localhost URL
```javascript
// Current (WRONG)
formData.append("callback_url", `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhook`);

// Should be (CORRECT)
formData.append("callback_url", `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`);
```

### 2. **Environment Variables**
Make sure these are set:
```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
MARZ_API_BASE_URL=https://wallet.wearemarz.com/api/v1
MARZ_API_KEY=your_api_key
MARZ_API_SECRET=your_api_secret
MARZ_BASE64_AUTH=your_base64_auth
```

### 3. **Webhook Dashboard Configuration**
In your Marz Pay dashboard, configure:
- **Webhook URL**: `https://your-domain.com/api/webhook`
- **Events**: Select `collection.completed` and `collection.failed`
- **Test**: Use Marz Pay's webhook testing tool

## 🧪 Testing Your Implementation

### 1. **Test Collection API**
```bash
curl -X POST https://your-domain.com/api/pay \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+256791291294",
    "amount": 1000
  }'
```

### 2. **Test Webhook**
```bash
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

### 3. **Test Payment Status**
```bash
curl -X POST https://your-domain.com/api/check-payment \
  -H "Content-Type: application/json" \
  -d '{"reference": "test-reference-123"}'
```

## 📊 Expected Flow

1. **User initiates payment** → Collection API called
2. **Marz Pay processes payment** → User completes payment on phone
3. **Marz Pay sends webhook** → Your webhook handler receives notification
4. **Voucher generated** → Stored in system
5. **Frontend polls status** → Shows voucher to user

## 🔗 Required Webhook URLs Summary

### **Single Webhook URL (Recommended)**
```
https://your-domain.com/api/webhook
```
**Handles**: Success, Failure, Collection Completed

### **Multiple Webhook URLs (Alternative)**
```
Success: https://your-domain.com/api/webhook/success
Failure: https://your-domain.com/api/webhook/failure
Collection Completed: https://your-domain.com/api/webhook/completed
```

## 🚀 Next Steps

1. **Set up production domain** (not localhost)
2. **Configure environment variables**
3. **Set up webhook in Marz Pay dashboard**
4. **Test with real payments**
5. **Monitor webhook logs**

## 📞 Support

If you need help with Marz Pay configuration:
- Check Marz Pay dashboard for webhook settings
- Use their webhook testing tools
- Contact Marz Pay support for API issues
