import { updatePaymentStatus, getPayment } from "../../../lib/storage.js";

export async function POST(request) {
  try {
    const payload = await request.json();
    
    console.log("Marz Pay FAILURE webhook received:", {
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
      console.log("No reference found in FAILURE webhook payload");
      return Response.json({ success: false, message: "No reference found" }, { status: 400 });
    }

    // Get the original payment details
    const payment = getPayment(reference);
    
    if (!payment) {
      console.log(`No payment found for reference: ${reference}`);
      return Response.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    // Handle failed payment
    if (eventType === "collection.failed" || transactionStatus === "failed") {
      console.log(`Payment FAILED for reference: ${reference}`);
      
      // Update payment status to failed
      updatePaymentStatus(reference, "failed");
      
      console.log(`Payment marked as failed for reference ${reference}`);
    }

    // Always return HTTP 200 to acknowledge receipt
    return Response.json({ success: true, message: "FAILURE webhook processed" });
  } catch (error) {
    console.error("FAILURE webhook error:", error);
    return Response.json(
      { success: false, message: "FAILURE webhook processing failed" },
      { status: 500 }
    );
  }
}
