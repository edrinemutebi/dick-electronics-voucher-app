



"use client";

import { useState } from "react";

export default function Home() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [voucher, setVoucher] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [paymentReference, setPaymentReference] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Phone number validation for Uganda
  const validatePhoneNumber = (phone) => {
    // Remove any spaces or special characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    // Check if it's a valid Ugandan phone number (starts with 256, 0, or +256)
    const ugandaPhoneRegex = /^(\+?256|0)?[0-9]{9}$/;
    return ugandaPhoneRegex.test(cleanPhone);
  };

  const formatPhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (cleanPhone.startsWith('0')) {
      return `256${cleanPhone.substring(1)}`;
    } else if (cleanPhone.startsWith('256')) {
      return cleanPhone;
    } else if (cleanPhone.startsWith('+256')) {
      return cleanPhone.substring(1);
    }
    return cleanPhone;
  };

  const checkPaymentStatus = async (reference) => {
    setCheckingPayment(true);
    try {
      const res = await fetch("/api/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        if (data.data.status === "successful" && data.data.voucher) {
          setVoucher(data.data.voucher);
          setMessage(`Payment completed! Your voucher is ready.`);
          setPaymentReference(null); // Clear reference since payment is complete
          return true; // Payment completed
        } else if (data.data.status === "failed") {
          setError("Payment failed. Please try again.");
          setPaymentReference(null);
          return true; // Payment failed
        } else {
          // Still processing
          setMessage(`Payment is still ${data.data.status}. Please wait...`);
          return false; // Still processing
        }
      } else {
        setError(data.message || "Failed to check payment status");
        return true; // Error occurred
      }
    } catch (err) {
      console.error("Check payment error:", err);
      setError("Failed to check payment status. Please try again.");
      return true; // Error occurred
    } finally {
      setCheckingPayment(false);
    }
  };

  const startPaymentPolling = (reference) => {
    const pollInterval = setInterval(async () => {
      const isComplete = await checkPaymentStatus(reference);
      if (isComplete) {
        clearInterval(pollInterval);
      }
    }, 3000); // Check every 3 seconds

    // Stop polling after 5 minutes (300 seconds)
    setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentReference === reference) {
        setError("Payment timeout. Please check your phone for payment confirmation or try again.");
        setPaymentReference(null);
      }
    }, 300000);
  };

  const simulateFailedPayment = async () => {
    if (!paymentReference) {
      setError("No payment reference to simulate failure");
      return;
    }

    try {
      const res = await fetch("/api/test-failed-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: paymentReference }),
      });

      if (res.ok) {
        setMessage("Payment status updated to failed. Check status to see the failure.");
      } else {
        setError("Failed to simulate payment failure");
      }
    } catch (err) {
      setError("Error simulating payment failure");
    }
  };

  const handlePayment = async () => {
    setError("");
    setMessage("");
    setVoucher(null);

    // Validation
    if (!phone.trim()) {
      setError("Please enter a phone number");
      return;
    }

    if (!validatePhoneNumber(phone)) {
      setError("Please enter a valid Ugandan phone number (e.g., 0701234567 or +256701234567)");
      return;
    }

    if (!amount || amount <= 0) {
      setError("Please select a valid voucher amount");
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone, amount }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        // Only set voucher if it exists (payment was successful)
        if (data.data.voucher) {
          setVoucher(data.data.voucher);
        }
        
        // Show detailed Marz API response information
        const marzResponse = data.data.paymentResponse;
        let successMessage = "Payment initiated successfully!";
        
        if (data.data.voucher) {
          successMessage += " Your voucher code is ready.";
        } else {
          successMessage += " Please wait for payment confirmation.";
          // Store reference for polling if payment is still processing
          if (data.data.reference) {
            setPaymentReference(data.data.reference);
            // Start polling for payment status
            startPaymentPolling(data.data.reference);
          }
        }
        
        if (marzResponse && marzResponse.data) {
          const transaction = marzResponse.data.transaction;
          const collection = marzResponse.data.collection;
          
          if (transaction && collection) {
            successMessage = `Payment ${marzResponse.status}! 
            Transaction ID: ${transaction.uuid}
            Amount: ${collection.amount.formatted} ${collection.amount.currency}
            Status: ${transaction.status}
            Mode: ${collection.mode}`;
            
            if (data.data.voucher) {
              successMessage += `\nVoucher Code: ${data.data.voucher}`;
            }
          }
        }
        
        setMessage(successMessage);
      } else {
        setError(data.message || "Payment failed. Please try again.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("Something went wrong. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "400px", marginBottom: "1rem" }}>
        <h1>Buy Voucher</h1>
        <button
          onClick={() => setDebugMode(!debugMode)}
          style={{
            padding: "0.5rem",
            backgroundColor: debugMode ? "#dc3545" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "0.875rem",
            cursor: "pointer"
          }}
        >
          {debugMode ? "Hide Debug" : "Debug"}
        </button>
      </div>
      
      {debugMode && (
        <div style={{ 
          width: "100%", 
          maxWidth: "400px", 
          marginBottom: "1rem", 
          padding: "1rem", 
          backgroundColor: "#f8f9fa", 
          border: "1px solid #dee2e6", 
          borderRadius: "4px",
          fontSize: "0.875rem"
        }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#495057" }}>Debug Panel</h3>
          <p><strong>Payment Reference:</strong> {paymentReference || "None"}</p>
          <p><strong>Current Status:</strong> {paymentReference ? "Processing" : "No payment"}</p>
          {paymentReference && (
            <div style={{ marginTop: "0.5rem" }}>
              <button
                onClick={() => checkPaymentStatus(paymentReference)}
                disabled={checkingPayment}
                style={{
                  padding: "0.25rem 0.5rem",
                  marginRight: "0.5rem",
                  backgroundColor: checkingPayment ? "#ccc" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  cursor: checkingPayment ? "not-allowed" : "pointer"
                }}
              >
                {checkingPayment ? "Checking..." : "Check Status"}
              </button>
              <button
                onClick={simulateFailedPayment}
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  cursor: "pointer"
                }}
              >
                Simulate Failure
              </button>
            </div>
          )}
        </div>
      )}
      <input
        type="tel"
        placeholder="0701234567 or +256701234567"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          setError("");
        }}
        style={{ 
          margin: "1rem 0", 
          padding: "0.75rem", 
          width: "300px",
          border: error ? "2px solid #ff4444" : "2px solid #ddd",
          borderRadius: "4px",
          fontSize: "1rem"
        }}
      />
      {error && (
        <p style={{ color: "#ff4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {error}
        </p>
      )}
        <select
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={{ marginBottom: "1rem", padding: "0.5rem", width: "300px" }}
        >
          <option value={600}>Voucher UGX 600</option>
          <option value={1000}>Voucher UGX 1,000</option>
          <option value={1500}>Voucher UGX 1,500</option>
          <option value={7000}>Voucher UGX 7,000</option>
        </select>
      <button
        onClick={handlePayment}
        disabled={loading || !phone.trim()}
        style={{ 
          padding: "0.75rem 2rem", 
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "1rem",
          cursor: loading ? "not-allowed" : "pointer",
          width: "300px"
        }}
      >
        {loading ? "Processing Payment..." : "Pay Now"}
      </button>
      {message && (
        <div style={{ 
          marginTop: "1rem", 
          padding: "1rem", 
          backgroundColor: "#d4edda", 
          color: "#155724",
          borderRadius: "4px",
          width: "300px",
          textAlign: "center"
        }}>
          {message}
        </div>
      )}
      {paymentReference && !voucher && (
        <div style={{ 
          marginTop: "1rem", 
          padding: "1rem", 
          backgroundColor: "#fff3cd", 
          color: "#856404",
          borderRadius: "4px",
          width: "300px",
          textAlign: "center",
          border: "1px solid #ffeaa7"
        }}>
          <p style={{ marginBottom: "1rem" }}>
            Payment is being processed... This may take a few minutes.
          </p>
          <button
            onClick={() => checkPaymentStatus(paymentReference)}
            disabled={checkingPayment}
            style={{ 
              padding: "0.5rem 1rem", 
              backgroundColor: checkingPayment ? "#ccc" : "#ffc107",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              fontSize: "0.875rem",
              cursor: checkingPayment ? "not-allowed" : "pointer"
            }}
          >
            {checkingPayment ? "Checking..." : "Check Status"}
          </button>
        </div>
      )}
      
      {voucher && (
        <div style={{ 
          marginTop: "2rem", 
          padding: "1.5rem", 
          background: "#e0ffe0", 
          borderRadius: "8px",
          width: "300px",
          textAlign: "center",
          border: "2px solid #28a745"
        }}>
          <h2 style={{ marginBottom: "1rem", color: "#155724" }}>Your Voucher Code:</h2>
          <p style={{ 
            fontSize: "1.5rem", 
            fontWeight: "bold", 
            color: "#155724",
            backgroundColor: "white",
            padding: "1rem",
            borderRadius: "4px",
            border: "2px dashed #28a745"
          }}>
            {voucher}
          </p>
          <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#666" }}>
            Save this code! You can use it to purchase items at Dick Electronics.
          </p>
        </div>
      )}
    </div>
  );
}
