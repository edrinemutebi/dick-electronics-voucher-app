import { getPayment, getVoucher } from "../../lib/storage.js";

export async function POST(request) {
  try {
    const { reference } = await request.json();
    
    if (!reference) {
      return Response.json(
        { success: false, message: "Reference required" },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing callback for reference: ${reference}`);
    
    // Check current payment status
    const payment = getPayment(reference);
    const voucher = getVoucher(reference);
    
    console.log("Current payment status:", {
      payment: payment ? {
        reference: payment.reference,
        status: payment.status,
        amount: payment.amount,
        phone: payment.phone,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      } : null,
      voucher: voucher ? {
        reference: voucher.reference,
        voucher: voucher.voucher,
        amount: voucher.amount,
        phone: voucher.phone,
        completedAt: voucher.updatedAt
      } : null
    });

    // Simulate a MarzPay webhook callback
    const mockMarzPayPayload = {
      "event_type": "collection.completed",
      "transaction": {
        "uuid": `test-uuid-${Date.now()}`,
        "reference": reference,
        "status": "completed",
        "amount": {
          "formatted": `${payment?.amount || 1000}.00`,
          "raw": payment?.amount || 1000,
          "currency": "UGX"
        },
        "provider": "mtn",
        "phone_number": payment?.phone || "+256712345678",
        "description": "Test callback simulation",
        "created_at": new Date().toISOString(),
        "updated_at": new Date().toISOString()
      },
      "collection": {
        "provider": "mtn",
        "phone_number": payment?.phone || "+256712345678",
        "amount": {
          "formatted": `${payment?.amount || 1000}.00`,
          "raw": payment?.amount || 1000,
          "currency": "UGX"
        },
        "mode": "mtnuganda",
        "provider_reference": `test-provider-ref-${Date.now()}`
      },
      "business": {
        "uuid": "test-business-uuid",
        "name": "Dick Electronics"
      },
      "metadata": {
        "sandbox_mode": true,
        "environment": "test",
        "timestamp": new Date().toISOString()
      }
    };

    console.log("Simulating MarzPay webhook callback...");
    
    // Call the webhook endpoint internally
    const webhookResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockMarzPayPayload)
    });

    const webhookResult = await webhookResponse.json();
    
    console.log("Webhook response:", webhookResult);

    // Check status after callback
    const updatedPayment = getPayment(reference);
    const updatedVoucher = getVoucher(reference);

    return Response.json({
      success: true,
      message: "Callback test completed",
      reference: reference,
      before: {
        payment: payment,
        voucher: voucher
      },
      after: {
        payment: updatedPayment,
        voucher: updatedVoucher
      },
      webhook_response: webhookResult,
      callback_url: "https://dick-electronics-voucher-app.vercel.app/api/webhook",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Callback test error:", error);
    return Response.json(
      { 
        success: false, 
        message: "Callback test failed",
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    message: "Callback test endpoint",
    usage: "POST with { reference: 'your-reference' } to test callback",
    callback_url: "https://dick-electronics-voucher-app.vercel.app/api/webhook",
    timestamp: new Date().toISOString()
  });
}

