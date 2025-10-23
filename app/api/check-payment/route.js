import { getPayment, getVoucher, updatePaymentStatus } from "../../lib/storage.js";
import { db } from "../../lib/firebase.js";
import { collection, query, where, limit, getDocs, updateDoc, doc } from "firebase/firestore";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
        // Build base URL from request headers to work in local and production
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const host = request.headers.get('host');
        const baseUrl = `${proto}://${host}`;
        // Call our MarzPay API checker
        const marzCheckResponse = await fetch(`${baseUrl}/api/check-marz-payment`, {
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
              // Fetch an unused voucher for the amount from Firestore and mark as used
              const vouchersRef = collection(db, "vouchers");
              const q = query(
                vouchersRef,
                where("amount", "==", payment.amount),
                where("used", "==", false),
                limit(1)
              );
              const snapshot = await getDocs(q);

              if (!snapshot.empty) {
                const voucherDoc = snapshot.docs[0];
                const voucherData = voucherDoc.data();

                await updateDoc(doc(db, "vouchers", voucherDoc.id), {
                  used: true,
                  assignedTo: payment.phone,
                  assignedAt: new Date(),
                });

                // Update payment status with voucher code
                await updatePaymentStatus(reference, "successful", voucherData.code);

                return Response.json({
                  success: true,
                  data: {
                    status: "successful",
                    voucher: voucherData.code,
                    amount: payment.amount,
                    phone: payment.phone,
                    completedAt: new Date().toISOString(),
                  },
                });
              } else {
                console.warn("No available vouchers in Firestore for amount:", payment.amount);
                // Update status successful without voucher; client may fallback to /api/get-voucher
                await updatePaymentStatus(reference, "successful");
                return Response.json({
                  success: true,
                  data: {
                    status: "successful",
                    voucher: null,
                    amount: payment.amount,
                    phone: payment.phone,
                  },
                });
              }
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

export async function GET() {
  return Response.json({ success: true, message: "check-payment alive" });
}

// Voucher generation removed; issuing from Firestore inventory instead.
