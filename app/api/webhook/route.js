import { updatePaymentStatus, getPayment } from "../../lib/storage.js";

// Voucher generation function (same as in pay route)
function generateVoucher(amount) {
  const prefixMap = { 600: "V600", 1000: "V1000", 1500: "V1500", 7000: "V7000" };
  const prefix = prefixMap[amount] || "VXXXX";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}

export async function POST(request) {
  try {
    const payload = await request.json();
    
    console.log("Marz Pay webhook received:", {
      event_type: payload.event_type,
      transaction_reference: payload.transaction?.reference,
      transaction_status: payload.transaction?.status,
      timestamp: new Date().toISOString()
    });

    // Extract reference from the transaction object
    const reference = payload.transaction?.reference;
    const eventType = payload.event_type;
    const transactionStatus = payload.transaction?.status;

    if (!reference) {
      console.log("No reference found in webhook payload");
      return Response.json({ success: false, message: "No reference found" }, { status: 400 });
    }

    // Get the original payment details
    const payment = getPayment(reference);
    
    if (!payment) {
      console.log(`No payment found for reference: ${reference}`);
      return Response.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    // Handle different event types based on Marz Pay documentation
    switch (eventType) {
      case "collection.completed":
        console.log(`Payment completed for reference: ${reference}`);
        
        // Generate voucher for successful payment
        const voucher = generateVoucher(payment.amount);
        console.log(`Generated voucher: ${voucher} for amount: ${payment.amount}`);
        
        // Update payment status with voucher
        updatePaymentStatus(reference, "successful", voucher);
        
        // Here you could:
        // - Send SMS to user with voucher code
        // - Send email confirmation
        // - Update database
        // - Send push notification
        
        console.log(`Voucher ${voucher} stored for reference ${reference}`);
        break;
        
      case "collection.failed":
        console.log(`Payment failed for reference: ${reference}`);
        updatePaymentStatus(reference, "failed");
        // Handle failed payment - maybe send failure notification
        break;
        
      default:
        console.log(`Unknown event type: ${eventType} for reference: ${reference}`);
        // Map transaction status to our internal status
        if (transactionStatus === "completed") {
          const voucher = generateVoucher(payment.amount);
          updatePaymentStatus(reference, "successful", voucher);
        } else if (transactionStatus === "failed") {
          updatePaymentStatus(reference, "failed");
        }
    }

    // Always return HTTP 200 to acknowledge receipt (as per Marz Pay docs)
    return Response.json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json(
      { success: false, message: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

