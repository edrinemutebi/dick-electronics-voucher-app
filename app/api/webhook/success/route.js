import { updatePaymentStatus, getPayment } from "../../../lib/storage.js";
import { db } from "../../../lib/firebase.js";
import { collection, query, where, limit, getDocs, updateDoc, doc } from "firebase/firestore";

export async function POST(request) {
  try {
    const payload = await request.json();
    
    console.log("Marz Pay SUCCESS webhook received:", {
      event_type: payload.event_type,
      transaction_reference: payload.transaction?.reference,
      transaction_status: payload.transaction?.status,
      timestamp: new Date().toISOString()
    });

    // Extract reference from the transaction object
    const reference = payload.transaction?.reference;
    const eventType = payload.event_type;
    const transactionStatus = payload.transaction?.status;

    if (!reference) {
      console.log("No reference found in SUCCESS webhook payload");
      return Response.json({ success: false, message: "No reference found" }, { status: 400 });
    }

    // Get the original payment details
    const payment = getPayment(reference);
    
    if (!payment) {
      console.log(`No payment found for reference: ${reference}`);
      return Response.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    // Handle successful payment
    if (eventType === "collection.completed" || transactionStatus === "completed") {
      console.log(`Payment SUCCESS for reference: ${reference}`);

      let voucher = null;

      // Fetch an unused voucher from Firestore that matches the stored payment amount
      if (payment.amount) {
        console.log(`💰 Webhook success: Using stored payment amount: ${payment.amount} UGX`);
        const vouchersRef = collection(db, "vouchers");
        const q = query(
          vouchersRef,
          where("amount", "==", Number(payment.amount)),
          where("used", "==", false),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const voucherDoc = snapshot.docs[0];
          const voucherData = voucherDoc.data();

          // Validate voucher amount matches payment amount
          if (Number(voucherData.amount) !== Number(payment.amount)) {
            console.error(`🚨 CRITICAL: Webhook voucher amount mismatch! Payment: ${payment.amount}, Voucher: ${voucherData.amount}`);
            console.warn(`⚠️ Skipping voucher assignment due to amount mismatch`);
          } else {
            // Mark voucher as used
            await updateDoc(doc(db, "vouchers", voucherDoc.id), {
              used: true,
              assignedTo: payment.phone || "",
              assignedAt: new Date(),
            });

            voucher = voucherData.code;
            console.log(`🎫 Issued Firestore voucher: ${voucher} (${voucherData.amount} UGX) for payment: ${payment.amount} UGX`);
          }
        } else {
          console.warn(`⚠️ No available vouchers in Firestore for amount: ${payment.amount} UGX`);
        }
      }

      // Update payment status with voucher (or without if none available)
      updatePaymentStatus(reference, "successful", voucher);

      console.log(`Payment completed for reference ${reference}. Voucher: ${voucher || 'None available'}`);
    }

    // Always return HTTP 200 to acknowledge receipt
    return Response.json({ success: true, message: "SUCCESS webhook processed" });
  } catch (error) {
    console.error("SUCCESS webhook error:", error);
    return Response.json(
      { success: false, message: "SUCCESS webhook processing failed" },
      { status: 500 }
    );
  }
}
