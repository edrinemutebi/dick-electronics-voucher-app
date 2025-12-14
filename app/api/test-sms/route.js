export async function POST(request) {
  try {
    const { number } = await request.json();

    if (!number) {
      return new Response(
        JSON.stringify({ success: false, message: "number is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("🧪 Test SMS Request:", { number });

    const message = `Test SMS from Dick Electronics Voucher App - ${new Date().toLocaleString()}`;

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, message }),
    });

    const result = await response.json();

    console.log("🧪 Test SMS Result:", result);

    return new Response(
      JSON.stringify({
        success: response.ok && result.success,
        message: result.message || "Test SMS sent",
        details: result
      }),
      { status: response.ok ? 200 : 500, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Test SMS Error:", err);
    return new Response(
      JSON.stringify({ success: false, message: err?.message || "Test SMS failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
