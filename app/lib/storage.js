// // Simple in-memory storage for pending payments and vouchers
// // In production, you'd want to use a proper database like PostgreSQL, MongoDB, etc.

// const pendingPayments = new Map();
// const completedVouchers = new Map();

// // Store pending payment
// function storePendingPayment(reference, phone, amount, transactionId) {
//   pendingPayments.set(reference, {
//     phone,
//     amount,
//     transactionId,
//     status: 'processing',
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//     voucher: null
//   });
// }

// // Update payment status
// function updatePaymentStatus(reference, status, voucher = null) {
//   const payment = pendingPayments.get(reference);
//   if (payment) {
//     payment.status = status;
//     payment.updatedAt = new Date().toISOString();
    
//     if (voucher) {
//       payment.voucher = voucher;
//       completedVouchers.set(reference, {
//         ...payment,
//         voucher
//       });
//     }
//   }
// }

// // Get payment by reference
// function getPayment(reference) {
//   return pendingPayments.get(reference);
// }

// // Get completed voucher
// function getVoucher(reference) {
//   return completedVouchers.get(reference);
// }

// // Get all pending payments (for debugging)
// function getAllPendingPayments() {
//   return Array.from(pendingPayments.entries());
// }

// // Clean up old payments (optional - for memory management)
// function cleanupOldPayments() {
//   const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
//   for (const [reference, payment] of pendingPayments.entries()) {
//     if (new Date(payment.createdAt) < oneDayAgo) {
//       pendingPayments.delete(reference);
//     }
//   }
// }

// export {
//   storePendingPayment,
//   updatePaymentStatus,
//   getPayment,
//   getVoucher,
//   getAllPendingPayments,
//   cleanupOldPayments
// };




// /lib/paymentsStore.js
import { db } from "./firebase.js"; 
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  Timestamp
} from "firebase/firestore";

// Define collections
const pendingRef = collection(db, "pendingPayments");
const completedRef = collection(db, "completedVouchers");

// Store a pending payment
export async function storePendingPayment(reference, phone, amount, transactionId) {
  const refDoc = doc(pendingRef, reference);
  await setDoc(refDoc, {
    phone,
    amount,
    transactionId,
    status: "processing",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    voucher: null,
  });
}

// Update payment status
export async function updatePaymentStatus(reference, status, voucher = null) {
  const refDoc = doc(pendingRef, reference);
  const snapshot = await getDoc(refDoc);

  if (!snapshot.exists()) return;

  const data = snapshot.data();
  const updated = {
    ...data,
    status,
    updatedAt: Timestamp.now(),
  };

  if (voucher) {
    updated.voucher = voucher;

    // Move to completed collection
    const completedDoc = doc(completedRef, reference);
    await setDoc(completedDoc, updated);
    await deleteDoc(refDoc);
  } else {
    await updateDoc(refDoc, { status, updatedAt: Timestamp.now() });
  }
}

// Get payment by reference
export async function getPayment(reference) {
  const refDoc = doc(pendingRef, reference);
  const snapshot = await getDoc(refDoc);
  return snapshot.exists() ? snapshot.data() : null;
}

// Get completed voucher
export async function getVoucher(reference) {
  const refDoc = doc(completedRef, reference);
  const snapshot = await getDoc(refDoc);
  return snapshot.exists() ? snapshot.data() : null;
}

// Get all pending payments (for debugging/admin)
export async function getAllPendingPayments() {
  const snapshot = await getDocs(pendingRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Clean up old payments (optional)
export async function cleanupOldPayments() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const snapshot = await getDocs(pendingRef);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.createdAt.toDate() < oneDayAgo) {
      await deleteDoc(docSnap.ref);
    }
  }
}
