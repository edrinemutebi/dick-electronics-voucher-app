# Payment Failure Detection & Monitoring Guide

## 🔍 How to Detect Failed Payments

### 1. **Webhook-Based Detection (Primary)**
When Marz Pay sends a webhook with `status: "failed"`:

```javascript
// In app/api/webhook/route.js
case "failed":
  console.log(`Payment failed for reference: ${reference}`);
  updatePaymentStatus(reference, "failed");
  // Handle failed payment - maybe send failure notification
  break;
```

### 2. **Frontend Polling Detection**
The frontend automatically detects failed payments:

```javascript
// In app/page.js
else if (data.data.status === "failed") {
  setError("Payment failed. Please try again.");
  setPaymentReference(null);
  return true; // Payment failed
}
```

### 3. **Manual Status Checking**
Check payment status via API:

```javascript
const response = await fetch("/api/check-payment", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ reference: "your-reference-id" }),
});

const data = await response.json();
if (data.data.status === "failed") {
  console.log("Payment failed!");
}
```

## 📊 Payment Status States

| Status | Description | User Action | Voucher Generated |
|--------|-------------|-------------|-------------------|
| `processing` | Payment initiated, waiting for user | Wait or check status | ❌ No |
| `successful` | Payment completed successfully | None needed | ✅ Yes |
| `failed` | Payment failed/cancelled | Try again | ❌ No |
| `pending` | Still waiting for confirmation | Wait | ❌ No |

## 🧪 Testing Failed Payments

### Method 1: Use Debug Panel
1. Make a payment
2. Click "Debug" button
3. Click "Simulate Failure" 
4. Click "Check Status" to see the failure

### Method 2: Direct API Call
```bash
curl -X POST http://localhost:3000/api/test-failed-payment \
  -H "Content-Type: application/json" \
  -d '{"reference":"your-reference-id"}'
```

### Method 3: Check Logs
Look for these log messages:
```
Payment failed for reference: abc123
Payment status: failed
```

## 🔧 Monitoring in Production

### 1. **Server Logs**
Monitor your server logs for:
```
Payment failed for reference: [reference]
```

### 2. **Database Queries** (when you add a database)
```sql
-- Check all failed payments
SELECT * FROM payments WHERE status = 'failed';

-- Check payments by date
SELECT * FROM payments 
WHERE status = 'failed' 
AND created_at >= '2024-01-01';
```

### 3. **API Monitoring**
Set up monitoring for:
- `/api/webhook` endpoint (webhook failures)
- `/api/check-payment` endpoint (status check failures)

## 🚨 Common Failure Scenarios

### 1. **User Cancels Payment**
- Marz Pay sends webhook with `status: "failed"`
- System updates payment status
- User sees "Payment failed. Please try again."

### 2. **Insufficient Funds**
- Payment times out or fails
- Webhook notifies of failure
- User can retry with different amount

### 3. **Network Issues**
- Payment API call fails
- Frontend shows network error
- User can retry

### 4. **Invalid Phone Number**
- Payment rejected by Marz Pay
- Immediate failure response
- User must correct phone number

## 📱 User Experience for Failed Payments

### What Users See:
1. **Red error message**: "Payment failed. Please try again."
2. **Retry option**: Can make new payment
3. **Clear status**: No voucher shown
4. **Debug info**: (if debug mode enabled)

### What Happens Behind the Scenes:
1. Webhook receives failure notification
2. Payment status updated to "failed"
3. No voucher generated
4. User can start new payment

## 🔄 Retry Logic

The system handles retries by:
1. Clearing the failed payment reference
2. Allowing new payment attempts
3. Not generating duplicate vouchers
4. Providing clear error messages

## 📈 Analytics & Reporting

Track failed payments by:
1. **Count by reason**: Network, insufficient funds, user cancellation
2. **Time patterns**: Peak failure times
3. **Phone number patterns**: Invalid numbers
4. **Amount patterns**: Failed amounts

## 🛠️ Debugging Tools

### Debug Panel Features:
- Show current payment reference
- Manual status checking
- Simulate payment failures
- Real-time status updates

### Console Logs:
```javascript
// Enable detailed logging
console.log("Payment webhook received:", { status, reference });
console.log("Payment status:", payment.status);
```

## 🚀 Next Steps

1. **Add Database Storage**: Replace in-memory storage
2. **Email Notifications**: Notify users of failures
3. **SMS Alerts**: Send failure notifications
4. **Analytics Dashboard**: Track failure rates
5. **Retry Logic**: Automatic retry for network failures
