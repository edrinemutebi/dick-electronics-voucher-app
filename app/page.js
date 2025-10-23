"use client";

import { useState } from "react";
import { updatePaymentStatus } from "./lib/storage.js";
import { addDoc, collection } from "firebase/firestore";
// import { db } from "@/lib/firebase.js";
import { db } from "./lib/firebase.js"; // relative path



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
  const [statusMessage, setStatusMessage] = useState("");
  const [pollingInterval, setPollingInterval] = useState(null);

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
    console.log(`🔍 Checking payment status for reference: ${reference}`);
    
    const res = await fetch("/api/check-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log("📊 Payment status response:", data);

    if (data.success) {
      const status = data.data.status;
      console.log(`📊 Current status: ${status}`);

      if (status === "successful") {
        console.log("✅ Payment marked successful, fetching voucher...");

        // If API already returned a voucher, use it directly
        if (data.data && data.data.voucher) {
          setVoucher(data.data.voucher);
          setMessage("Payment completed! Your voucher is ready.");
          setPaymentReference(null);

          // ✅ Save successful transaction to Firestore
          try {
            await addDoc(collection(db, "transactions"), {
              phone,
              amount,
              voucher: data.data.voucher,
              status: "successful",
              reference,
              createdAt: new Date(),
            });
            console.log("✅ Transaction saved to Firestore");
          } catch (fireErr) {
            console.error("❌ Failed to save transaction:", fireErr);
          }
          return true;
        }

        // Otherwise fetch from vouchers inventory
        const voucherRes = await fetch("/api/get-voucher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, phone }),
        });

        const voucherData = await voucherRes.json();

        if (voucherData.success) {
          setVoucher(voucherData.voucher);
          setMessage("Payment completed! Your voucher is ready.");
          setPaymentReference(null); // clear after completion

          // ✅ Save successful transaction to Firestore
          try {
            await addDoc(collection(db, "transactions"), {
              phone,
              amount,
              voucher: voucherData.voucher,
              status: "successful",
              reference,
              createdAt: new Date(),
            });
            console.log("✅ Transaction saved to Firestore");
          } catch (fireErr) {
            console.error("❌ Failed to save transaction:", fireErr);
          }

          return true; // Payment completed
        } else {
          console.warn("⚠️ Voucher not available after successful payment.");
          setError("Payment done, but no voucher available right now. Please contact support.");
          return true;
        }

      } else if (status === "failed") {
        console.log("❌ Payment failed.");
        setError("Payment failed. Please try again.");
        setPaymentReference(null);

        // Optionally save failed attempt
        try {
          await addDoc(collection(db, "transactions"), {
            phone,
            amount,
            status: "failed",
            reference,
            createdAt: new Date(),
          });
          console.log("⚠️ Failed transaction recorded in Firestore.");
        } catch (fireErr) {
          console.error("❌ Failed to record failed transaction:", fireErr);
        }

        return true; // stop polling

      } else {
        console.log(`⏳ Payment still ${status}, continuing to poll...`);
        return false; // Still processing
      }

    } else {
      console.error(`❌ Payment check failed: ${data.message}`);
      setError(data.message || "Failed to check payment status");
      return true; // Stop polling
    }
  } catch (err) {
    console.error("❌ Check payment error:", err);
    setError("Failed to check payment status. Please try again.");
    return true; // Stop polling
  } finally {
    setCheckingPayment(false);
  }
};


  const startPaymentPolling = (reference) => {
    console.log(`🔄 Starting payment polling for reference: ${reference}`);
    
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    setStatusMessage("Payment initiated, waiting for confirmation...");
    let pollCount = 0;
    const maxPolls = 60; // 30 * 2 seconds = 60 seconds max
    let pollingActive = true; // Flag to control polling
    
    const pollInterval = setInterval(async () => {
      if (!pollingActive) {
        console.log(`🛑 Polling stopped for reference: ${reference}`);
        return;
      }
      
      pollCount++;
      console.log(`🔍 Polling attempt ${pollCount}/${maxPolls} for reference: ${reference}`);
      
      // Update status message based on polling progress
      if (pollCount <= 5) {
        setStatusMessage("Payment initiated, waiting for confirmation...");
      } else if (pollCount <= 15) {
        setStatusMessage("Still processing payment, please wait...");
      } else if (pollCount <= 25) {
        setStatusMessage("Payment taking longer than usual, please be patient...");
      } else {
        setStatusMessage("Final attempt, please check your phone for confirmation...");
      }
      
      // Show timeout warning after 30 seconds (15 attempts)
      if (pollCount === 15) {
        console.log("⚠️ Payment taking longer than expected - user can stop if needed");
      }
      
      const isComplete = await checkPaymentStatus(reference);
      if (isComplete) {
        console.log(`✅ Payment completed for reference: ${reference}`);
        setStatusMessage("Payment completed successfully!");
        pollingActive = false;
        clearInterval(pollInterval);
        setPollingInterval(null);
      } else if (pollCount >= maxPolls) {
        console.log(`⏰ Polling timeout reached for reference: ${reference}`);
        pollingActive = false;
        clearInterval(pollInterval);
        setPollingInterval(null);
        if (paymentReference === reference) {
          setError("Payment timeout after 60 seconds. Please check your phone for payment confirmation or try again.");
          setPaymentReference(null);
          setStatusMessage("Payment timeout - please try again");
          // Trigger failed status in storage
          updatePaymentStatus(reference, "failed");
        }
      }
    }, 2000); // Check every 2 seconds as requested
    
    // Store the interval for cleanup
    setPollingInterval(pollInterval);

    // Stop polling after 60 seconds - backup timeout
    setTimeout(() => {
      if (pollingActive) {
        console.log(`⏰ Backup timeout reached for reference: ${reference}`);
        pollingActive = false;
        clearInterval(pollInterval);
        setPollingInterval(null);
        if (paymentReference === reference) {
          setError("Payment timeout after 60 seconds. Please check your phone for payment confirmation or try again.");
          setPaymentReference(null);
          setStatusMessage("Payment timeout - please try again");
          // Trigger failed status in storage
          updatePaymentStatus(reference, "failed");
        }
      }
    }, 60000); // 60 seconds timeout
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
    
    // Clear any existing polling before starting new payment
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
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
        
        // Hide success message - just handle the logic silently
        const marzResponse = data.data.paymentResponse;
        let successMessage = ""; // Empty message - no green card shown
        
        if (data.data.voucher) {
          // Only show message if voucher is ready
          successMessage = "Your voucher code is ready.";
        } else {
          // No message shown for processing - just start polling silently
          // Store reference for polling if payment is still processing
          if (data.data.reference) {
             const { reference, transactionUuid } = data.data; // <-- add this line
            setPaymentReference(data.data.reference);
            // Start polling for payment status
            
            startPaymentPolling(reference, transactionUuid); // <-- updated to include transactionUuid
          }
        }
        
        // Hide detailed transaction information - just show simple message
        // if (marzResponse && marzResponse.data) {
        //   const transaction = marzResponse.data.transaction;
        //   const collection = marzResponse.data.collection;
        //   
        //   if (transaction && collection) {
        //     successMessage = `Payment ${marzResponse.status}! 
        //     Transaction ID: ${transaction.uuid}
        //     Amount: ${collection.amount.formatted} ${collection.amount.currency}
        //     Status: ${transaction.status}
        //     Mode: ${collection.mode}`;
        //     
        //     if (data.data.voucher) {
        //       successMessage += `\nVoucher Code: ${data.data.voucher}`;
        //     }
        //   }
        // }
        
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
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "center", width: "100%", maxWidth: "400px", marginBottom: "1rem" }}>
        <h1>Buy Voucher</h1>
        {/* Debug button hidden */}
        {/* <button
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
        </button> */}
      </div>
      
      {/* Debug panel hidden */}
      {/* {debugMode && (
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
      )} */}
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
          <option value={1000}>Voucher UGX 1,000</option>
          <option value={1500}>Voucher UGX 1,500</option>
          <option value={7000}>Voucher UGX 7,000</option>
        </select>
      <button
        onClick={handlePayment}
        disabled={loading || !phone.trim() || (paymentReference && !voucher)}
        style={{ 
          padding: "0.75rem 2rem", 
          backgroundColor: (loading || (paymentReference && !voucher)) ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "1rem",
          cursor: (loading || (paymentReference && !voucher)) ? "not-allowed" : "pointer",
          width: "300px"
        }}
      >
        {loading ? "Processing Payment..." : (paymentReference && !voucher) ? "Payment Processing..." : "Pay Now"}
      </button>
      {message && !paymentReference && (
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
          padding: "2rem", 
          backgroundColor: "#f8f9fa", 
          color: "#495057",
          borderRadius: "8px",
          width: "300px",
          textAlign: "center",
          border: "2px solid #e9ecef",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          {/* Loading Animation */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center",
            marginBottom: "1rem"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e9ecef",
              borderTop: "4px solid #007bff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "1rem"
            }}></div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "1.1rem",
              fontWeight: "500",
              color: "#007bff"
            }}>
              <span>Processing Payment</span>
              <div style={{
                display: "flex",
                gap: "2px"
              }}>
                <div style={{
                  width: "4px",
                  height: "4px",
                  backgroundColor: "#007bff",
                  borderRadius: "50%",
                  animation: "bounce 1.4s ease-in-out infinite both"
                }}></div>
                <div style={{
                  width: "4px",
                  height: "4px",
                  backgroundColor: "#007bff",
                  borderRadius: "50%",
                  animation: "bounce 1.4s ease-in-out infinite both",
                  animationDelay: "0.16s"
                }}></div>
                <div style={{
                  width: "4px",
                  height: "4px",
                  backgroundColor: "#007bff",
                  borderRadius: "50%",
                  animation: "bounce 1.4s ease-in-out infinite both",
                  animationDelay: "0.32s"
                }}></div>
              </div>
            </div>
          </div>
          
          <p style={{ 
            marginBottom: "1rem", 
            fontSize: "0.9rem",
            color: "#6c757d"
          }}>
            Please wait while we confirm your payment...
          </p>
          
          {/* Manual stop button */}
          {/* <button
            onClick={() => {
              console.log("🛑 User manually stopped polling");
              if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
              }
              setPaymentReference(null);
              setStatusMessage("");
              setError("Payment processing stopped by user. You can try again if needed.");
            }}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Stop Processing
          </button> */}
        </div>
      )}
      
      {/* Status message below processing card */}
      {paymentReference && !voucher && statusMessage && (
        <div style={{
          marginTop: "0.5rem",
          padding: "0.75rem",
          backgroundColor: "#f8f9fa",
          color: "#495057",
          borderRadius: "6px",
          width: "300px",
          textAlign: "center",
          fontSize: "0.875rem",
          border: "1px solid #e9ecef"
        }}>
          {statusMessage}
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
    </>
  );
}
