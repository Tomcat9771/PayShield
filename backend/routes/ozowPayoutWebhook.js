import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ======================================================
   ✅ VERIFY WEBHOOK (CRITICAL - FIXED)
====================================================== */

router.post("/verify", async (req, res) => {
  console.log("🔥 OZOW VERIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const payoutId = req.body.PayoutId;
    const merchantRef = req.body.MerchantReference;

    console.log("🔍 Looking up payoutId:", payoutId);

    let key = null;

    // ✅ 1. Try provider_ref (correct)
    const { data } = await supabase
      .from("payouts")
      .select("encryption_key")
      .eq("provider_ref", payoutId)
      .maybeSingle();

    key = data?.encryption_key;

    // ✅ 2. FIXED FALLBACK (correct column)
    if (!key && merchantRef) {
      console.log("⚠️ FALLBACK using merchant_ref:", merchantRef);

      const fallback = await supabase
        .from("payouts")
        .select("encryption_key")
        .eq("merchant_ref", merchantRef) // ✅ FIXED
        .maybeSingle();

      key = fallback.data?.encryption_key;
    }

    console.log("🔑 FINAL VERIFY KEY:", key);

    // 🔥 CRITICAL: Return EXACT format Ozow expects
    return res.status(200).json({
      isValid: !!key,
    });

  } catch (err) {
    console.error("❌ VERIFY ERROR:", err.message);

    // 🔥 Even on error, MUST return valid response
    return res.status(200).json({
      isValid: false,
    });
  }
});

/* ======================================================
   ✅ NOTIFY WEBHOOK (UPDATED - IMPORTANT)
====================================================== */

router.post("/notify", async (req, res) => {
  console.log("🔥 OZOW NOTIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const data = req.body;

    const payoutId = data.PayoutId;
    const status = data.PayoutStatus?.Status;
    const subStatus = data.PayoutStatus?.SubStatus;

    console.log(`📊 STATUS UPDATE: ${payoutId} → status=${status} sub=${subStatus}`);

    // ✅ UPDATE DB STATUS (IMPORTANT FOR TEST CASES)
    if (status === 1 && subStatus === 201) {
      await supabase
        .from("payouts")
        .update({
          status: "COMPLETED",
          completed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("provider_ref", payoutId);
    }

    if (status === 99) {
      await supabase
        .from("payouts")
        .update({
          status: "FAILED",
          last_error: data.PayoutStatus?.ErrorMessage,
        })
        .eq("provider_ref", payoutId);
    }

    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ NOTIFY ERROR:", err.message);
    return res.status(200).send("OK");
  }
});

export default router;
