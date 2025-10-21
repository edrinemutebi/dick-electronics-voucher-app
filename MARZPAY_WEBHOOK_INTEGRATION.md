# MarzPay Webhook Integration

This document describes the implementation of MarzPay webhook integration for the Dick Electronics voucher system.

## Webhook URL

**Production URL:** `https://dick-electronics-voucher-app.vercel.app/api/webhook`

## Implementation Features

### ✅ MarzPay Documentation Compliance

- **HTTP 200 Response**: Always returns HTTP 200 to acknowledge receipt of callbacks
- **Payload Structure**: Handles MarzPay webhook payload structure according to documentation
- **Event Types**: Supports `collection.completed` and `collection.failed` events
- **Status Mapping**: Implements MTN and Airtel status mapping as per documentation

### ✅ Advanced Features

1. **Idempotency Handling**: Prevents duplicate callback processing
2. **Status Mapping**: Maps provider-specific statuses to internal statuses
3. **Voucher Generation**: Automatically generates vouchers for successful payments
4. **Comprehensive Logging**: Detailed logging for debugging and monitoring
5. **Error Handling**: Graceful error handling with proper HTTP responses

## Status Mapping

### MTN Status Mapping
```
successful/completed/success → completed
failed/rejected/failure → failed
pending/timeout/pending_confirmation → pending
expired → failed
```

### Airtel Status Mapping
```
TS (Transaction Successful) → completed
TF (Transaction Failed) → failed
TP (Transaction Pending) → pending
```

## Webhook Payload Structure

The webhook expects MarzPay payloads in the following format:

### Successful Payment Payload
```json
{
  "event_type": "collection.completed",
  "transaction": {
    "uuid": "transaction-uuid",
    "reference": "transaction-reference",
    "status": "completed",
    "amount": {
      "formatted": "10,000.00",
      "raw": 10000,
      "currency": "UGX"
    },
    "provider": "mtn",
    "phone_number": "+256712345678",
    "description": "Payment description",
    "created_at": "2025-08-20T15:18:48.000000Z",
    "updated_at": "2025-08-20T15:18:48.000000Z"
  },
  "collection": {
    "provider": "mtn",
    "phone_number": "+256712345678",
    "amount": {
      "formatted": "10,000.00",
      "raw": 10000,
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

## Response Format

The webhook returns the following response format:

```json
{
  "success": true,
  "message": "Payment completed successfully. Voucher: V1000-ABC1",
  "reference": "transaction-reference",
  "event_type": "collection.completed",
  "original_status": "completed",
  "mapped_status": "completed",
  "provider": "mtn",
  "voucher": "V1000-ABC1",
  "callback_id": "transaction-reference-collection.completed-transaction-uuid",
  "timestamp": "2025-01-20T15:18:48.000Z"
}
```

## Voucher Generation

Vouchers are automatically generated for successful payments based on the amount:

- **600 UGX** → `V600-XXXX`
- **1000 UGX** → `V1000-XXXX`
- **1500 UGX** → `V1500-XXXX`
- **7000 UGX** → `V7000-XXXX`

## Testing

### Test the Webhook Endpoint

```bash
# Test webhook health
curl https://dick-electronics-voucher-app.vercel.app/api/webhook

# Run comprehensive tests
node test-marzpay-webhook.js
```

### Test Payloads

The system includes test payloads for:
- Successful MTN payments
- Failed Airtel payments
- MTN status mapping verification
- Duplicate callback handling

## Monitoring and Debugging

### Logs to Monitor

1. **Webhook Receipt**: `=== MARZ PAY WEBHOOK RECEIVED ===`
2. **Status Mapping**: `Status mapping: {original} ({provider}) -> {mapped}`
3. **Voucher Generation**: `🎫 Generated voucher: {voucher} for amount: {amount} UGX`
4. **Duplicate Detection**: `Duplicate callback detected for {callbackId}, ignoring`

### Health Check

GET `/api/webhook` returns:
```json
{
  "message": "MarzPay webhook endpoint is working",
  "status": "healthy",
  "endpoint": "https://dick-electronics-voucher-app.vercel.app/api/webhook",
  "events_supported": ["collection.completed", "collection.failed"],
  "providers_supported": ["mtn", "airtel"],
  "features": [
    "Status mapping (MTN/Airtel to internal statuses)",
    "Idempotency handling for duplicate callbacks",
    "Voucher generation for successful payments",
    "HTTP 200 acknowledgment for all callbacks"
  ],
  "processed_callbacks_count": 0
}
```

## Configuration in MarzPay Dashboard

1. Go to Webhooks in your MarzPay dashboard
2. Click "Create Webhook"
3. Enter endpoint URL: `https://dick-electronics-voucher-app.vercel.app/api/webhook`
4. Select events: `collection.completed`, `collection.failed`
5. Test the webhook to ensure it's working correctly

## Best Practices Implemented

- ✅ Always respond with HTTP 200 to acknowledge receipt
- ✅ Implement idempotency to handle duplicate callbacks
- ✅ Use transaction reference to track and verify payments
- ✅ Set up proper error handling and logging
- ✅ Map provider statuses to internal statuses
- ✅ Generate vouchers for successful payments only

## Troubleshooting

### Common Issues

1. **Webhook not receiving callbacks**: Check MarzPay dashboard configuration
2. **Duplicate callbacks**: Idempotency handling should prevent this
3. **Status mapping issues**: Check provider-specific status values
4. **Voucher not generated**: Verify payment amount matches voucher tiers

### Debug Steps

1. Check webhook health: `GET /api/webhook`
2. Review logs for webhook receipt and processing
3. Verify MarzPay dashboard webhook configuration
4. Test with sample payloads using the test script

## Security Considerations

- Webhook endpoint is public but only processes valid MarzPay payloads
- Idempotency prevents duplicate processing
- All errors are logged for monitoring
- HTTP 200 responses prevent retry loops
