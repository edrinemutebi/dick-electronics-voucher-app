// /app/api/get-voucher/route.js

// import { db } from "../../../lib/firebase.js";
import { db } from "../../lib/firebase.js";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { collection, query, where, limit, getDocs, updateDoc, doc } from "firebase/firestore";

export async function POST(request) {
  try {
    const { amount, phone, reference } = await request.json();

    // 🔒 First check if this phone/reference already has a voucher assigned
    if (phone) {
      const assignedQuery = query(
        collection(db, "vouchers"),
        where("amount", "==", amount),
        where("assignedTo", "==", phone),
        where("used", "==", true),
        limit(1)
      );
      const assignedSnapshot = await getDocs(assignedQuery);
      
      if (!assignedSnapshot.empty) {
        const existingVoucher = assignedSnapshot.docs[0].data();
        console.log("⚠️ Voucher already assigned to this phone, returning existing:", existingVoucher.code);
        return new Response(JSON.stringify({ success: true, voucher: existingVoucher.code }), { status: 200 });
      }
    }

    // 1️⃣ Get an unused voucher matching amount
    const vouchersRef = collection(db, "vouchers");
    const q = query(vouchersRef, where("amount", "==", amount), where("used", "==", false), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return new Response(JSON.stringify({ success: false, message: "No vouchers available for this amount" }), { status: 404 });
    }

    const voucherDoc = snapshot.docs[0];
    const voucherData = voucherDoc.data();

    // 2️⃣ Mark it as used and assign to user
    await updateDoc(doc(db, "vouchers", voucherDoc.id), {
      used: true,
      assignedTo: phone,
      assignedAt: new Date(),
      reference: reference || null,
    });

    console.log("✅ Voucher assigned:", voucherData.code, "to phone:", phone);
    return new Response(JSON.stringify({ success: true, voucher: voucherData.code }), { status: 200 });
  } catch (err) {
    console.error("Error fetching voucher:", err);
    return new Response(JSON.stringify({ success: false, message: "Internal Server Error" }), { status: 500 });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ success: true, message: "get-voucher alive" }), { status: 200 });
}
