# Webhook Setup Guide

## Current Issue
Your webhook URL is set to `http://localhost:3000/api/webhook`, which Marz Pay cannot reach from their servers.

## Marz Pay Webhook Structure
Based on the [official Marz Pay documentation](https://wallet.wearemarz.com/documentation/webhooks), your webhook now handles:

- **Event Types**: `collection.completed` and `collection.failed`
- **Payload Structure**: Full transaction details with business and metadata
- **Status Mapping**: MTN/Airtel statuses mapped to internal statuses
- **Callback Priority**: Custom callback URL takes priority over webhooks

## Solutions

### 1. For Development/Testing
Use a tunneling service like ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, expose port 3000
ngrok http 3000
```

This will give you a public URL like `https://abc123.ngrok.io` that you can use for webhooks.

### 2. For Production
Deploy your app to a service like:
- Vercel (recommended for Next.js)
- Netlify
- Railway
- DigitalOcean App Platform

Then update your environment variables:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. Environment Variables Needed

Create a `.env.local` file:

```env
# Marz Pay API Configuration
MARZ_API_BASE_URL=https://wallet.wearemarz.com/api/v1
MARZ_API_KEY=your_api_key
MARZ_API_SECRET=your_api_secret
MARZ_BASE64_AUTH=your_base64_auth

# App URL (for webhook callbacks)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 4. Testing the Webhook

1. Start your app with the public URL
2. Make a test payment
3. Check the logs to see if the webhook is called
4. The webhook should generate and store the voucher

#### Test Webhook Manually
```bash
# Run the test script
node test-webhook.js

# Or test with curl
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

### 5. Webhook Flow

1. User initiates payment → Payment API stores pending payment
2. Marz Pay processes payment → Calls your webhook
3. Webhook generates voucher → Stores it in memory
4. Frontend polls for status → Shows voucher when ready

## Current Implementation Features

✅ **Storage System**: In-memory storage for pending payments and vouchers
✅ **Webhook Handler**: Processes payment status updates
✅ **Status Checking**: API endpoint to check payment status
✅ **Frontend Polling**: Automatically checks for payment completion
✅ **Manual Check**: User can manually check payment status
✅ **Voucher Generation**: Only generates vouchers for successful payments

## Next Steps

1. Set up proper webhook URL (not localhost)
2. Test the complete flow
3. Consider using a database instead of in-memory storage for production
4. Add SMS/email notifications when vouchers are ready
