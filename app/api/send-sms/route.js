export async function POST(request) {
  try {
    const { number, message, sender } = await request.json();

    const username = process.env.EGOSMS_USERNAME || "cybernet256";
    const password = process.env.EGOSMS_PASSWORD || "cyber@256";
    const from = sender || process.env.EGOSMS_SENDER || "Egosms";

    if (!number || !message) {
      return new Response(
        JSON.stringify({ success: false, message: "number and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL("https://www.egosms.co/api/v1/plain/");
    url.searchParams.set("number", number);
    url.searchParams.set("message", message);
    url.searchParams.set("username", username);
    url.searchParams.set("password", password);
    url.searchParams.set("sender", from);
    url.searchParams.set("priority", "0");

    const res = await fetch(url.toString());
    const text = await res.text();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ success: false, message: "Provider returned error", provider: text }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, provider: text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: err?.message || "Failed to send SMS" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
