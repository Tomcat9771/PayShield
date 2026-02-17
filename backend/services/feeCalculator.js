import { supabase } from "../lib/supabaseClient.js";

function round(n) {
  return Number(Number(n).toFixed(2));
}

export async function calculateFees(amount, businessId) {
  const T = round(amount);

  if (!T || T <= 0) {
    throw new Error("Invalid transaction amount");
  }

  /* =========================
     1️⃣ Load platform defaults
  ========================= */
  const { data: configRows, error: configError } = await supabase
    .from("platform_config")
    .select("key,value");

  if (configError) {
    throw new Error("Failed to load platform config");
  }

  const config = Object.fromEntries(
    configRows.map(row => [row.key, Number(row.value)])
  );

  /* =========================
     2️⃣ Load business overrides
  ========================= */
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select(`
      platform_percent_override,
      platform_min_override,
      platform_max_override
    `)
    .eq("id", businessId)
    .single();

  if (businessError) {
    throw new Error("Business not found");
  }

  const platformPercent =
    business.platform_percent_override ?? config.platform_percent;

  const platformMin =
    business.platform_min_override ?? config.platform_min;

  const platformMax =
    business.platform_max_override ?? config.platform_max;

  const vatRate = config.vat_percent / 100;
  const ozowPercent = config.ozow_percent / 100;
  const ozowMin = config.ozow_min;
  const payoutFee = config.payout_fee;

  /* =========================
     3️⃣ Calculate Platform Fee
  ========================= */
  let platformFee = T * (platformPercent / 100);
  platformFee = Math.max(platformFee, platformMin);
  platformFee = Math.min(platformFee, platformMax);

  /* =========================
     4️⃣ Calculate Ozow Fee
  ========================= */
  let ozowFee = T * ozowPercent;
  ozowFee = Math.max(ozowFee, ozowMin);

  /* =========================
     5️⃣ VAT
  ========================= */
  const platformVAT = platformFee * vatRate;
  const ozowVAT = ozowFee * vatRate;

  /* =========================
     6️⃣ Net
  ========================= */
  const net =
    T
    - (ozowFee + ozowVAT)
    - (platformFee + platformVAT)
    - payoutFee;

  return {
    amount_gross: round(T),

    ozow_fee: round(ozowFee),
    ozow_vat: round(ozowVAT),

    platform_fee: round(platformFee),
    platform_vat: round(platformVAT),

    payout_fee: round(payoutFee),

    amount_net: round(net),
  };
}
