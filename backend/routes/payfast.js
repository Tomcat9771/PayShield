import express from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

/* =========================
   SUPABASE CLIENT
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   PAYFAST ENV
========================= */
const isSandbox = process.env.PAYFAST_ENV === "sandbox";

const PAYFAST = {
  merchant_id: process.env.PAYFAST_MERCHANT_ID,
  merchant_key: process.env.PAYFAST_MERCHANT_KEY,
  passphrase: process.env.PAYFAST_PASSPHRASE || "",
  process_url: isSandbox
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process",
};

/* =========================
   PAYFAST CHECKOUT SIGNATURE
========================= */
function generatePayFastSignature(data) {
  const orderedFields = [
    "merchant_id",
    "merchant_key",
    "return_url",
    "cancel_url",
    "notify_url",
    "amount",
    "item_name",
    "custom_str1",
  ];

  const pairs = [];

  for (const key of orderedFields) {
    if (data[key] !== undefined && data[key] !== "") {
      const encoded = encodeURIComponent(data[key]).replace(/%20/g, "+");
      pairs.push(`${key}=${encoded}`);
    }
  }

  let stringToSign = pairs.join("&");

  // LIVE MODE ONLY
  if (!isSandbox && PAYFAST.passphrase) {
    const encodedPass = encodeURIComponent(PAYFAST.passphrase).replace(/%20/g, "+");
    stringToSign += `&passphrase=${encodedPass}`;
  }

  return crypto.createHash("md5").update(stringToSign).digest("hex");
}

/* =========================
   CREATE PAYFAST PAYMENT
========================= */
router.post("/", async (req, res) => {
  const { guard_id, amount } = req.body;

  if (!guard_id || !amount) {
    return res.status(400).json({ error: "Missing guard_id or amount" });
  }

  const paymentData = {
    merchant_id: PAYFAST.merchant_id,
    merchant_key: PAYFAST.merchant_key,
    return_url: process.env.PAYFAST_RETURN_URL,
    cancel_url: process.env.PAYFAST_CANCEL_URL,
    notify_url: process.env.PAYFAST_NOTIFY_URL,
    amount: Number(amount).toFixed(2),
    item_name: "Guard Support Payment",
    custom_str1: guard_id,
  };

  const signature = generatePayFastSignature(paymentData);

  res.json({
    action: PAYFAST.process_url,
    fields: {
      ...paymentData,
      signature,
    },
  });
});

/* =========================
   PAYFAST IPN
========================= */
router.post("/notify", async (req, res) => {
  console.log("🚨 PAYFAST IPN HIT");

  // PayFast requires immediate 200 OK
  res.status(200).send("OK");

  if (!req.rawBody || !req.body) {
    console.error("❌ Missing rawBody or body");
    return;
  }

  /* =========================
     SIGNATURE VERIFICATION
  ========================= */
  const raw = req.rawBody.trim();

  const parts = raw.split("&").filter(p => !p.startsWith("signature="));
  let stringToHash = parts.join("&");

  if (
    process.env.PAYFAST_ENV === "live" &&
    process.env.PAYFAST_PASSPHRASE
  ) {
    const passphrase = String(process.env.PAYFAST_PASSPHRASE)
      .trim()
      .replace(/ /g, "+");
    stringToHash += `&passphrase=${passphrase}`;
  }

  const calculatedSignature = crypto
    .createHash("md5")
    .update(stringToHash, "utf8")
    .digest("hex");

  if (calculatedSignature !== req.body.signature) {
    console.error("❌ IPN signature mismatch");
    return;
  }

  console.log("✅ IPN signature verified");

  /* =========================
     PROCESS PAYMENT
  ========================= */
  if (req.body.payment_status !== "COMPLETE") {
    console.log("ℹ️ IPN ignored, status:", req.body.payment_status);
    return;
  }

  const {
    pf_payment_id,
    amount_gross,
    item_name,
    custom_str1,
    payment_method,
    email_address,
  } = req.body;

  const guardId = custom_str1 || null;

  // 🔒 CANONICAL COMMISSION RULE (30%)
  const gross = Number(amount_gross);
  const commission = Number((gross * 0.30).toFixed(2));
  const net = Number((gross - commission).toFixed(2));

  /* =========================
     INSERT TRANSACTION
  ========================= */
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      provider: "payfast",
      provider_ref: pf_payment_id,
      guard_id: guardId,
      guard_name: item_name,
      amount_gross: gross,
      commission_amount: commission,
      amount_net: net,
      payment_method: payment_method || "unknown",
      customer_email: email_address || null,
      status: "COMPLETE",
    })
    .select()
    .single();

  if (txError) {
    if (txError.code === "23505") {
      console.log("⚠️ Duplicate IPN ignored:", pf_payment_id);
      return;
    }
    console.error("❌ Transaction insert failed", txError);
    return;
  }

  /* =========================
     LEDGER ENTRY
  ========================= */
  await supabase.from("ledger_entries").insert({
    entry_type: "PAYMENT_RECEIVED",
    transaction_id: transaction.id,
    guard_id: transaction.guard_id,
    amount: transaction.amount_net,
    reference: transaction.provider_ref,
  });

  console.log("💰 TRANSACTION RECORDED:", transaction.id);
});

export default router;
