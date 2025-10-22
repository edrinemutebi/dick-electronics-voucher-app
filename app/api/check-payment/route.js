import { getPayment, getVoucher, updatePaymentStatus } from "../../lib/storage.js";

export async function POST(request) {
  try {
    const { reference } = await request.json();
    
    if (!reference) {
      return Response.json(
        { success: false, message: "Reference required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking payment status for reference: ${reference}`);
    
    // Check if payment is completed and has voucher
    const voucher = await getVoucher(reference);
    if (voucher) {
      console.log(`✅ Payment completed with voucher: ${voucher.voucher}`);
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
    
    // Check if payment exists in storage
    const payment = await getPayment(reference);
    if (!payment) {
      console.log(`❌ Payment not found for reference: ${reference}`);
      return Response.json(
        { success: false, message: "Payment not found" },
        { status: 404 }
      );
    }
    
    console.log(`📊 Current payment status: ${payment.status}`);
    console.log(`🆔 Transaction UUID: ${payment.transactionId}`);
    
    // If we have a transaction UUID, check with MarzPay API
    if (payment.transactionId && payment.status === 'processing') {
      console.log(`🌐 Checking MarzPay API for transaction: ${payment.transactionId}`);
      
      try {
        // Call our MarzPay API checker
        const marzCheckResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/check-marz-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            reference: reference, 
            transactionUuid: payment.transactionId 
          })
        });
        
        if (marzCheckResponse.ok) {
          const marzData = await marzCheckResponse.json();
          console.log(`📊 MarzPay API response:`, marzData.data);
          
          if (marzData.success && marzData.data.isComplete) {
            console.log(`✅ Payment completed via MarzPay API: ${marzData.data.internalStatus}`);
            
            // Update our storage with the new status
            if (marzData.data.internalStatus === 'successful' && marzData.data.shouldGenerateVoucher) {
              // Generate voucher for successful payment
              const voucher = generateVoucher(payment.amount);
              console.log(`🎫 Generated voucher: ${voucher} for amount: ${payment.amount}`);
              
              // Update payment status with voucher
             await updatePaymentStatus(reference, "successful", voucher);
              
              return Response.json({
                success: true,
                data: {
                  status: "successful",
                  voucher: voucher,
                  amount: payment.amount,
                  phone: payment.phone,
                  completedAt: new Date().toISOString()
                }
              });
            } else if (marzData.data.internalStatus === 'failed') {
              // Update payment status to failed
              await updatePaymentStatus(reference, "failed");
              
              return Response.json({
                success: true,
                data: {
                  status: "failed",
                  amount: payment.amount,
                  phone: payment.phone,
                  createdAt: payment.createdAt,
                  voucher: null
                }
              });
            }
          } else {
            console.log(`⏳ Payment still processing via MarzPay API: ${marzData.data.internalStatus}`);
          }
        } else {
          console.log(`⚠️ MarzPay API check failed, using local status`);
        }
      } catch (marzError) {
        console.error(`❌ MarzPay API check error:`, marzError);
        console.log(`⚠️ Falling back to local status`);
      }
    }
    
    // Return current local status
    console.log(`📊 Returning local payment status: ${payment.status}`);
    return Response.json({
      success: true,
      data: {
        status: payment.status,
        amount: payment.amount,
        phone: payment.phone,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        voucher: null
      }
    });
    
  } catch (error) {
    console.error("Check payment error:", error);
    return Response.json(
      { success: false, message: "Failed to check payment status" },
      { status: 500 }
    );
  }
}

// Voucher generation function
function generateVoucher(amount) {
  const prefixMap = { 600: "V600", 1000: "V1000", 1500: "V1500", 7000: "V7000" };
  const prefix = prefixMap[amount] || "VXXXX";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}
