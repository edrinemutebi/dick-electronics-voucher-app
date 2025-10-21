export async function GET() {
  console.log("=== WEBHOOK VERIFICATION REQUEST ===");
  console.log("Timestamp:", new Date().toISOString());
  
  return Response.json({
    status: "verified",
    message: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString(),
    url: "https://dick-electronics-voucher-app.vercel.app/api/webhook",
    events: ["collection.completed", "collection.failed"],
    method: "POST"
  });
}

export async function POST(request) {
  console.log("=== WEBHOOK VERIFICATION POST ===");
  
  try {
    const body = await request.json();
    console.log("Verification payload:", body);
    
    return Response.json({
      status: "verified",
      message: "Webhook endpoint is working",
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Verification error:", error);
    return Response.json({
      status: "error",
      message: "Verification failed",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
