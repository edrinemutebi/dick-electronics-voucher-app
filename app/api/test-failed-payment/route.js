import { updatePaymentStatus, getPayment } from "../../lib/storage.js";

export async function POST(request) {
  try {
    const { reference } = await request.json();
    
    if (!reference) {
      return Response.json(
        { success: false, message: "Reference required" },
        { status: 400 }
      );
    }

    // Check if payment exists
    const payment = getPayment(reference);
    if (!payment) {
      return Response.json(
        { success: false, message: "Payment not found" },
        { status: 404 }
      );
    }

    // Simulate a failed payment
    console.log(`Simulating failed payment for reference: ${reference}`);
    updatePaymentStatus(reference, "failed");
    
    return Response.json({
      success: true,
      message: "Payment status updated to failed",
      data: {
        reference,
        status: "failed",
        amount: payment.amount,
        phone: payment.phone
      }
    });
    
  } catch (error) {
    console.error("Test failed payment error:", error);
    return Response.json(
      { success: false, message: "Failed to simulate failed payment" },
      { status: 500 }
    );
  }
}
