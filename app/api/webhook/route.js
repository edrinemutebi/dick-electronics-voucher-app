import { db } from "../../lib/firebase.js";
import { collection, query, where, limit, getDocs, updateDoc, doc } from "firebase/firestore";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// MarzPay status mapping according to documentation
function mapMarzPayStatus(providerStatus, provider) {
  const mtnMapping = {
    'successful': 'completed',
    'completed': 'completed', 
    'success': 'completed',
    'failed': 'failed',
    'rejected': 'failed',
    'failure': 'failed',
    'pending': 'pending',
    'timeout': 'pending',
    'pending_confirmation': 'pending',
    'expired': 'failed'
  };

  const airtelMapping = {
    'TS': 'completed', // Transaction Successful
    'TF': 'failed',    // Transaction Failed
    'TP': 'pending'    // Transaction Pending
  };

  if (provider === 'mtn') {
    return mtnMapping[providerStatus] || providerStatus;
  } else if (provider === 'airtel') {
    return airtelMapping[providerStatus] || providerStatus;
  }
  
  return providerStatus;
}

// Idempotency tracking to handle duplicate callbacks
const processedCallbacks = new Set();

export async function POST(request) {
  try {
    console.log("=== MARZ PAY WEBHOOK RECEIVED ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Custom Callback URL: https://dick-electronics-voucher-app.vercel.app/api/webhook");
    
    const payload = await request.json();
    console.log("Marz Pay payload:", JSON.stringify(payload, null, 2));

    // Extract data according to Marz Pay documentation
    const eventType = payload.event_type;
    const transaction = payload.transaction;
    const collection = payload.collection;
    const business = payload.business;
    const metadata = payload.metadata;

    const reference = transaction?.reference;
    const status = transaction?.status;
    const amount = transaction?.amount?.raw || collection?.amount?.raw;
    const phoneNumber = transaction?.phone_number || collection?.phone_number;
    const provider = collection?.provider || transaction?.provider;

    // Create unique callback identifier for idempotency
    const callbackId = `${reference}-${eventType}-${transaction?.uuid}`;
    
    // Check for duplicate callbacks
    if (processedCallbacks.has(callbackId)) {
      console.log(`Duplicate callback detected for ${callbackId}, ignoring`);
      return Response.json({
        success: true,
        message: "Duplicate callback ignored",
        reference: reference,
        timestamp: new Date().toISOString()
      });
    }

    // Mark callback as processed
    processedCallbacks.add(callbackId);

    // Apply MarzPay status mapping
    const mappedStatus = mapMarzPayStatus(status, provider);
    
    console.log(`Status mapping: ${status} (${provider}) -> ${mappedStatus}`);

    console.log("Extracted data:", {
      eventType,
      reference,
      originalStatus: status,
      mappedStatus,
      amount,
      phoneNumber,
      provider,
      business: business?.name
    });

    // Handle different event types according to Marz Pay docs
    let responseMessage = "Webhook received";
    let voucher = null;

    // Import storage functions
    const { updatePaymentStatus, getPayment, storePendingPayment } = await import("../../lib/storage.js");
    
    // Check if payment exists in storage
    let existingPayment = getPayment(reference);
    console.log(`🔍 Payment lookup for reference ${reference}:`, existingPayment ? `Found (amount: ${existingPayment.amount})` : 'Not found');

    // If payment doesn't exist, create it (for webhook-only scenarios)
    if (!existingPayment) {
      console.log(`📝 Creating payment record for webhook-only scenario: ${reference} with webhook amount: ${amount}`);
      storePendingPayment(reference, phoneNumber || "+256000000000", amount || 1000, `webhook-${Date.now()}`);
      existingPayment = getPayment(reference);
    }
    
    // Use mapped status for decision making
    if (mappedStatus === "completed" || eventType === "collection.completed") {
      console.log(`✅ Payment completed for reference: ${reference}`);

      // CRITICAL: Use the stored payment amount, not the webhook amount
      // Webhook amount might be wrong or different from what user actually paid
      const paymentAmount = existingPayment?.amount || amount;
      console.log(`💰 Using stored payment amount: ${paymentAmount} UGX (webhook amount: ${amount} UGX)`);

      // Fetch an unused voucher from Firestore and mark as used
      if (paymentAmount) {
        const vouchersRef = collection(db, "vouchers");
        const q = query(
          vouchersRef,
          where("amount", "==", Number(paymentAmount)),
          where("used", "==", false),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const voucherDoc = snapshot.docs[0];
          const voucherData = voucherDoc.data();

          // Validate voucher amount matches stored payment amount
          if (Number(voucherData.amount) !== Number(paymentAmount)) {
            console.error(`🚨 CRITICAL: Webhook voucher amount mismatch! Stored payment: ${paymentAmount}, Voucher: ${voucherData.amount}`);
            console.warn(`⚠️ Skipping voucher assignment due to amount mismatch`);
            updatePaymentStatus(reference, "successful");
          } else {
            await updateDoc(doc(db, "vouchers", voucherDoc.id), {
              used: true,
              assignedTo: phoneNumber || "",
              assignedAt: new Date(),
            });

            voucher = voucherData.code;
            updatePaymentStatus(reference, "successful", voucher);
            console.log(`🎫 Issued Firestore voucher: ${voucher} (${voucherData.amount} UGX) for stored payment: ${paymentAmount} UGX`);
          }
        } else {
          console.warn(`⚠️ No available vouchers in Firestore for stored amount: ${paymentAmount} UGX`);
          updatePaymentStatus(reference, "successful");
        }
      }
      
      responseMessage = `Payment completed successfully. Voucher: ${voucher || 'N/A'}`;
    } else if (mappedStatus === "failed" || eventType === "collection.failed") {
      console.log(`❌ Payment failed for reference: ${reference}`);
      
      // Update payment status to failed in storage
      updatePaymentStatus(reference, "failed");
      console.log(`💾 Updated payment status to failed in storage for reference: ${reference}`);
      
      responseMessage = "Payment failed";
    } else if (mappedStatus === "pending") {
      console.log(`⏳ Payment pending for reference: ${reference}`);
      responseMessage = "Payment is pending";
    } else {
      console.log(`❓ Unknown event type: ${eventType} with status: ${mappedStatus} for reference: ${reference}`);
      responseMessage = `Received event: ${eventType} with status: ${mappedStatus}`;
    }

    // Always return HTTP 200 to acknowledge receipt (as per Marz Pay docs)
    const response = {
      success: true,
      message: responseMessage,
      reference: reference,
      event_type: eventType,
      original_status: status,
      mapped_status: mappedStatus,
      provider: provider,
      voucher: voucher,
      callback_id: callbackId,
      timestamp: new Date().toISOString()
    };

    console.log("Sending response:", response);
    return Response.json(response);

  } catch (error) {
    console.error("=== WEBHOOK ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    
    // Return HTTP 200 even on error to prevent retries (as per Marz Pay docs)
    return Response.json({
      success: false,
      message: "Webhook processing failed",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }
}

export async function GET() {
  console.log("=== WEBHOOK GET REQUEST (TEST) ===");
  console.log("Timestamp:", new Date().toISOString());
  
  return Response.json({
    message: "MarzPay webhook endpoint is working",
    timestamp: new Date().toISOString(),
    status: "healthy",
    endpoint: "https://dick-electronics-voucher-app.vercel.app/api/webhook",
    events_supported: ["collection.completed", "collection.failed"],
    providers_supported: ["mtn", "airtel"],
    features: [
      "Status mapping (MTN/Airtel to internal statuses)",
      "Idempotency handling for duplicate callbacks", 
      "Voucher generation for successful payments",
      "HTTP 200 acknowledgment for all callbacks"
    ],
    processed_callbacks_count: processedCallbacks.size
  });
}

