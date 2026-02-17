// backend/services/smsService.js

const isLive = process.env.NODE_ENV === "production";
const provider = process.env.SMS_PROVIDER;

/**
 * Send SMS (voucher PIN delivery)
 * PIN is NEVER stored.
 * In development: DRY-RUN only.
 */
export async function sendSMS({ to, message }) {
  if (!isLive) {
    console.log("🧪 DRY-RUN SMS");
    console.log("📱 To:", to);
    console.log("✉️ Message:", message);
    return { ok: true, provider: "DRY_RUN_SMS" };
  }

  if (provider === "clickatell") {
    return sendViaClickatell({ to, message });
  }

  throw new Error("SMS provider not configured");
}

/* ================================
   CLICKATELL IMPLEMENTATION
================================ */
async function sendViaClickatell({ to, message }) {
  const apiKey = process.env.CLICKATELL_API_KEY;

  if (!apiKey) {
    throw new Error("CLICKATELL_API_KEY missing");
  }

  const response = await fetch("https://platform.clickatell.com/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: message,
      to: [normalizePhone(to)],
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Clickatell error: ${JSON.stringify(result)}`);
  }

  return {
    ok: true,
    provider: "CLICKATELL",
    message_id: result.messages?.[0]?.apiMessageId || null,
  };
}

/* ================================
   HELPERS
================================ */
function normalizePhone(phone) {
  // 079xxxxxxx → +2779xxxxxxx
  if (phone.startsWith("0")) {
    return "+27" + phone.slice(1);
  }
  return phone;
}
