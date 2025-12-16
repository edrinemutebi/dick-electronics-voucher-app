// /app/api/get-voucher/route.js

// import { db } from "../../../lib/firebase.js";
import { db } from "../../lib/firebase.js";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { collection, query, where, limit, getDocs, updateDoc, doc } from "firebase/firestore";

export async function POST(request) {
  try {
    const { amount, phone } = await request.json();

    console.log(`🔍 get-voucher: Looking for ${amount} UGX voucher for phone ${phone}`);

    // 1️⃣ Get an unused voucher matching EXACT amount
    const vouchersRef = collection(db, "vouchers");
    const q = query(
      vouchersRef,
      where("amount", "==", Number(amount)), // Ensure numeric comparison
      where("used", "==", false),
      limit(1)
    );
    const snapshot = await getDocs(q);

    console.log(`🔍 get-voucher: Found ${snapshot.size} vouchers for amount ${amount}`);

    if (snapshot.empty) {
      console.warn(`⚠️ get-voucher: No vouchers available for amount ${amount} UGX`);
      return new Response(JSON.stringify({
        success: false,
        message: `No vouchers available for ${amount} UGX. Please contact support.`,
        requestedAmount: amount
      }), { status: 404 });
    }

    const voucherDoc = snapshot.docs[0];
    const voucherData = voucherDoc.data();

    // Double-check the voucher amount matches
    if (Number(voucherData.amount) !== Number(amount)) {
      console.error(`🚨 CRITICAL: Voucher amount mismatch! Requested: ${amount}, Voucher: ${voucherData.amount}`);
      return new Response(JSON.stringify({
        success: false,
        message: "Voucher amount mismatch. Please contact support."
      }), { status: 500 });
    }

    console.log(`✅ get-voucher: Assigning voucher ${voucherData.code} (${voucherData.amount} UGX) to ${phone}`);

    // 2️⃣ Mark it as used and assign to user
    await updateDoc(doc(db, "vouchers", voucherDoc.id), {
      used: true,
      assignedTo: phone,
      assignedAt: new Date(),
    });

    return new Response(JSON.stringify({ success: true, voucher: voucherData.code }), { status: 200 });
  } catch (err) {
    console.error("Error fetching voucher:", err);
    return new Response(JSON.stringify({ success: false, message: "Internal Server Error" }), { status: 500 });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ success: true, message: "get-voucher alive" }), { status: 200 });
}
