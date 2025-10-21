// Voucher generation function
function generateVoucher(amount) {
  const prefixMap = { 600: "V600", 1000: "V1000", 1500: "V1500", 7000: "V7000" };
  const prefix = prefixMap[amount] || "VXXXX";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}

export async function POST(request) {
  try {
    console.log("=== MARZ PAY WEBHOOK RECEIVED ===");
    console.log("Timestamp:", new Date().toISOString());
    
    const payload = await request.json();
    console.log("Marz Pay payload:", JSON.stringify(payload, null, 2));

    // Extract data according to Marz Pay documentation
    const eventType = payload.event_type;
    const transaction = payload.transaction;
    const collection = payload.collection;
    const business = payload.business;
    const metadata = payload.metadata;

    const reference = transaction?.reference;
    const status = transaction?.status;
    const amount = transaction?.amount?.raw || collection?.amount?.raw;
    const phoneNumber = transaction?.phone_number || collection?.phone_number;

    console.log("Extracted data:", {
      eventType,
      reference,
      status,
      amount,
      phoneNumber,
      business: business?.name
    });

    // Handle different event types according to Marz Pay docs
    let responseMessage = "Webhook received";
    let voucher = null;

    switch (eventType) {
      case "collection.completed":
        console.log(`✅ Payment completed for reference: ${reference}`);
        
        // Generate voucher for successful payment
        if (amount) {
          voucher = generateVoucher(amount);
          console.log(`🎫 Generated voucher: ${voucher} for amount: ${amount} UGX`);
        }
        
        responseMessage = `Payment completed successfully. Voucher: ${voucher || 'N/A'}`;
        break;

      case "collection.failed":
        console.log(`❌ Payment failed for reference: ${reference}`);
        responseMessage = "Payment failed";
        break;

      default:
        console.log(`❓ Unknown event type: ${eventType} for reference: ${reference}`);
        responseMessage = `Received event: ${eventType}`;
    }

    // Always return HTTP 200 to acknowledge receipt (as per Marz Pay docs)
    const response = {
      success: true,
      message: responseMessage,
      reference: reference,
      event_type: eventType,
      status: status,
      voucher: voucher,
      timestamp: new Date().toISOString()
    };

    console.log("Sending response:", response);
    return Response.json(response);

  } catch (error) {
    console.error("=== WEBHOOK ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    
    // Return HTTP 200 even on error to prevent retries (as per Marz Pay docs)
    return Response.json({
      success: false,
      message: "Webhook processing failed",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }
}

export async function GET() {
  return Response.json({
    message: "Webhook endpoint is working",
    timestamp: new Date().toISOString(),
    status: "healthy"
  });
}

