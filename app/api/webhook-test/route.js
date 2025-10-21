export async function POST(request) {
  try {
    const payload = await request.json();
    
    console.log("Test webhook received:", payload);
    
    // Simple test response
    return Response.json({ 
      success: true, 
      message: "Test webhook working",
      received: payload,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    return Response.json(
      { success: false, message: "Test webhook failed", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ 
    message: "Webhook test endpoint is working",
    timestamp: new Date().toISOString()
  });
}
