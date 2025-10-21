export async function POST(request) {
  // Always return a JSON response, no matter what
  try {
    console.log("=== WEBHOOK RECEIVED ===");
    console.log("Timestamp:", new Date().toISOString());
    
    // Try to parse the request body
    let payload = {};
    try {
      payload = await request.json();
      console.log("Payload received:", JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.log("Failed to parse JSON:", parseError.message);
      payload = { error: "Invalid JSON" };
    }

    // Extract basic info
    const reference = payload?.transaction?.reference || payload?.reference || "unknown";
    const eventType = payload?.event_type || "unknown";
    const status = payload?.transaction?.status || payload?.status || "unknown";

    console.log("Extracted info:", { reference, eventType, status });

    // Always return success to Marz Pay
    const response = {
      success: true,
      message: "Webhook received and processed",
      reference: reference,
      event_type: eventType,
      status: status,
      timestamp: new Date().toISOString()
    };

    console.log("Sending response:", response);
    return Response.json(response);

  } catch (error) {
    console.error("=== WEBHOOK ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    
    // Even on error, return JSON
    return Response.json({
      success: false,
      message: "Webhook error occurred",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 200 }); // Return 200 to prevent retries
  }
}

export async function GET() {
  return Response.json({
    message: "Webhook endpoint is working",
    timestamp: new Date().toISOString(),
    status: "healthy"
  });
}

