// Simple in-memory storage for pending payments and vouchers
// In production, you'd want to use a proper database like PostgreSQL, MongoDB, etc.

const pendingPayments = new Map();
const completedVouchers = new Map();

// Store pending payment
function storePendingPayment(reference, phone, amount, transactionId) {
  pendingPayments.set(reference, {
    phone,
    amount,
    transactionId,
    status: 'processing',
    createdAt: new Date().toISOString(),
    voucher: null
  });
}

// Update payment status
function updatePaymentStatus(reference, status, voucher = null) {
  const payment = pendingPayments.get(reference);
  if (payment) {
    payment.status = status;
    payment.updatedAt = new Date().toISOString();
    
    if (voucher) {
      payment.voucher = voucher;
      completedVouchers.set(reference, {
        ...payment,
        voucher
      });
    }
  }
}

// Get payment by reference
function getPayment(reference) {
  return pendingPayments.get(reference);
}

// Get completed voucher
function getVoucher(reference) {
  return completedVouchers.get(reference);
}

// Get all pending payments (for debugging)
function getAllPendingPayments() {
  return Array.from(pendingPayments.entries());
}

// Clean up old payments (optional - for memory management)
function cleanupOldPayments() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  for (const [reference, payment] of pendingPayments.entries()) {
    if (new Date(payment.createdAt) < oneDayAgo) {
      pendingPayments.delete(reference);
    }
  }
}

module.exports = {
  storePendingPayment,
  updatePaymentStatus,
  getPayment,
  getVoucher,
  getAllPendingPayments,
  cleanupOldPayments
};
