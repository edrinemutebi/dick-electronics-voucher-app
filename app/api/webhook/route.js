// Simple webhook handler without external dependencies
function generateVoucher(amount) {
  const prefixMap = { 600: "V600", 1000: "V1000", 1500: "V1500", 7000: "V7000" };
  const prefix = prefixMap[amount] || "VXXXX";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}

export async function POST(request) {
  try {
    console.log("Webhook received at:", new Date().toISOString());
    
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

    // Simple response for now - just acknowledge receipt
    let responseMessage = "Webhook received successfully";
    
    if (eventType === "collection.completed" || transactionStatus === "completed") {
      console.log(`Payment completed for reference: ${reference}`);
      responseMessage = "Payment completed - voucher will be generated";
    } else if (eventType === "collection.failed" || transactionStatus === "failed") {
      console.log(`Payment failed for reference: ${reference}`);
      responseMessage = "Payment failed";
    }

    // Always return HTTP 200 to acknowledge receipt (as per Marz Pay docs)
    return Response.json({ 
      success: true, 
      message: responseMessage,
      reference: reference,
      event_type: eventType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Webhook error:", error);
    
    // Return a proper JSON error response
    return Response.json(
      { 
        success: false, 
        message: "Webhook processing failed",
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for testing
export async function GET() {
  return Response.json({
    message: "Webhook endpoint is working",
    timestamp: new Date().toISOString()
  });
}

