import { getAllPendingPayments, getPayment, getVoucher } from "../../lib/storage.js";

export async function GET() {
  try {
    console.log("🔍 Debug: Checking storage state");
    
    const allPayments = getAllPendingPayments();
    console.log(`📊 Total pending payments: ${allPayments.length}`);
    
    // Get details for each payment
    const paymentDetails = allPayments.map(([reference, payment]) => {
      const voucher = getVoucher(reference);
      return {
        reference,
        status: payment.status,
        amount: payment.amount,
        phone: payment.phone,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        hasVoucher: !!voucher,
        voucher: voucher?.voucher || null
      };
    });

    return Response.json({
      success: true,
      message: "Storage debug information",
      total_payments: allPayments.length,
      payments: paymentDetails,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Debug storage error:", error);
    return Response.json(
      { 
        success: false, 
        message: "Failed to get storage debug info",
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { reference } = await request.json();
    
    if (!reference) {
      return Response.json(
        { success: false, message: "Reference required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Debug: Checking specific payment ${reference}`);
    
    const payment = getPayment(reference);
    const voucher = getVoucher(reference);
    
    return Response.json({
      success: true,
      message: "Payment debug information",
      reference: reference,
      payment: payment ? {
        status: payment.status,
        amount: payment.amount,
        phone: payment.phone,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        hasVoucher: payment.voucher
      } : null,
      voucher: voucher ? {
        voucher: voucher.voucher,
        amount: voucher.amount,
        phone: voucher.phone,
        completedAt: voucher.updatedAt
      } : null,
      exists: !!payment,
      hasVoucher: !!voucher,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Debug payment error:", error);
    return Response.json(
      { 
        success: false, 
        message: "Failed to get payment debug info",
        error: error.message 
      },
      { status: 500 }
    );
  }
}

















