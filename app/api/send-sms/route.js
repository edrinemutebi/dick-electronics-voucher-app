// Test endpoint to check SMS configuration
export async function GET() {
  const username = process.env.EGOSMS_USERNAME || "cybernet256";
  const password = process.env.EGOSMS_PASSWORD || "cyber@256";
  const sender = process.env.EGOSMS_SENDER || "Egosms";

  return new Response(
    JSON.stringify({
      config: {
        username: username ? "SET" : "DEFAULT",
        password: password ? "SET" : "DEFAULT",
        sender: sender,
        usingDefaults: !process.env.EGOSMS_USERNAME && !process.env.EGOSMS_PASSWORD
      },
      testNumber: "256700000000", // Example Ugandan number
      testMessage: "Test SMS from Dick Electronics Voucher App"
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

export async function POST(request) {
  try {
    const { number, message, sender } = await request.json();

    console.log("📱 SMS Request received:", { number, message: message?.substring(0, 50) + "...", sender });

    const username = process.env.EGOSMS_USERNAME || "cybernet256";
    const password = process.env.EGOSMS_PASSWORD || "cyber@256";
    const from = sender || process.env.EGOSMS_SENDER || "Egosms";

    console.log("📱 SMS Config:", {
      username: username ? "SET" : "DEFAULT",
      password: password ? "SET" : "DEFAULT",
      sender: from
    });

    if (!number || !message) {
      console.error("❌ SMS Error: Missing required fields");
      return new Response(
        JSON.stringify({ success: false, message: "number and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format phone number with + prefix for EGOSMS
    const formattedNumber = number.startsWith('+') ? number : `+${number}`;

    // URL encode the message (spaces become + signs)
    const encodedMessage = message.replace(/\s+/g, '+');

    // URL encode password (@ becomes %40)
    const encodedPassword = password.replace('@', '%40');

    // Use "Egosms" as sender (matching user's example)
    const senderName = "Egosms";

    // Build URL exactly as per user's format
    const smsUrl = `https://www.egosms.co/api/v1/plain/?number=${encodeURIComponent(formattedNumber)}&message=${encodedMessage}&username=${username}&password=${encodedPassword}&sender=${senderName}&priority=0`;

    console.log("📱 SMS URL constructed (without password):", smsUrl.replace(password, "***"));
    console.log("📱 SMS Phone formatted:", formattedNumber);
    console.log("📱 SMS Message encoded:", encodedMessage);

    try {
      const res = await fetch(smsUrl, {
        timeout: 30000 // 30 second timeout
      });
      const text = await res.text();

      console.log("📱 SMS Provider Response:", {
        status: res.status,
        statusText: res.statusText,
        responseLength: text.length,
        responsePreview: text.substring(0, 100)
      });

      if (!res.ok) {
        console.error("❌ SMS Provider Error:", { status: res.status, response: text });
        return new Response(
          JSON.stringify({ success: false, message: "Provider returned error", provider: text }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("✅ SMS Sent successfully");
      return new Response(
        JSON.stringify({ success: true, provider: text }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (fetchErr) {
      console.error("❌ SMS Fetch Error:", fetchErr);
      throw fetchErr;
    }
  } catch (err) {
    console.error("❌ SMS API Error:", err);
    return new Response(
      JSON.stringify({ success: false, message: err?.message || "Failed to send SMS" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
