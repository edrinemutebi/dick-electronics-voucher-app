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

    console.log(`Checking payment status for reference: ${reference}`);
    
    // Check if payment is completed and has voucher
    const voucher = getVoucher(reference);
    if (voucher) {
      console.log(`Payment completed with voucher: ${voucher.voucher}`);
      return Response.json({
        success: true,
        data: {
          status: "successful",
          voucher: voucher.voucher,
          amount: voucher.amount,
          phone: voucher.phone,
          completedAt: voucher.updatedAt
        }
      });
    }
    
    // Check if payment is still pending
    const payment = getPayment(reference);
    if (payment) {
      console.log(`Payment status: ${payment.status}`);
      return Response.json({
        success: true,
        data: {
          status: payment.status,
          amount: payment.amount,
          phone: payment.phone,
          createdAt: payment.createdAt,
          voucher: null
        }
      });
    }
    
    // Payment not found
    return Response.json(
      { success: false, message: "Payment not found" },
      { status: 404 }
    );
    
  } catch (error) {
    console.error("Check payment error:", error);
    return Response.json(
      { success: false, message: "Failed to check payment status" },
      { status: 500 }
    );
  }
}
