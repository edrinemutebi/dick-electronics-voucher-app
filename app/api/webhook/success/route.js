import { updatePaymentStatus, getPayment } from "../../../lib/storage.js";

// Voucher generation function
function generateVoucher(amount) {
  const prefixMap = { 600: "V600", 1000: "V1000", 1500: "V1500", 7000: "V7000" };
  const prefix = prefixMap[amount] || "VXXXX";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}

export async function POST(request) {
  try {
    const payload = await request.json();
    
    console.log("Marz Pay SUCCESS webhook received:", {
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
      console.log("No reference found in SUCCESS webhook payload");
      return Response.json({ success: false, message: "No reference found" }, { status: 400 });
    }

    // Get the original payment details
    const payment = getPayment(reference);
    
    if (!payment) {
      console.log(`No payment found for reference: ${reference}`);
      return Response.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    // Handle successful payment
    if (eventType === "collection.completed" || transactionStatus === "completed") {
      console.log(`Payment SUCCESS for reference: ${reference}`);
      
      // Generate voucher for successful payment
      const voucher = generateVoucher(payment.amount);
      console.log(`Generated voucher: ${voucher} for amount: ${payment.amount}`);
      
      // Update payment status with voucher
      updatePaymentStatus(reference, "successful", voucher);
      
      console.log(`Voucher ${voucher} stored for reference ${reference}`);
    }

    // Always return HTTP 200 to acknowledge receipt
    return Response.json({ success: true, message: "SUCCESS webhook processed" });
  } catch (error) {
    console.error("SUCCESS webhook error:", error);
    return Response.json(
      { success: false, message: "SUCCESS webhook processing failed" },
      { status: 500 }
    );
  }
}
