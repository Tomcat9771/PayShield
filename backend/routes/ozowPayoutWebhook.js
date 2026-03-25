import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ======================================================
   ✅ VERIFY WEBHOOK (SOLID)
====================================================== */

router.post("/verify", async (req, res) => {
  console.log("🔥 OZOW VERIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const payoutId = req.body.PayoutId;
    const merchantRef = req.body.MerchantReference;

    console.log("🔍 payoutId:", payoutId);
    console.log("🔍 merchantRef:", merchantRef);

    let key = null;

    const { data } = await supabase
      .from("payouts")
      .select("encryption_key")
      .or(`provider_ref.eq.${payoutId},merchant_ref.eq.${merchantRef}`)
      .maybeSingle();

    key = data?.encryption_key;

    console.log("🔑 VERIFY KEY FOUND:", key);

    return res.status(200).json({
      isValid: !!key,
    });

  } catch (err) {
    console.error("❌ VERIFY ERROR:", err.message);

    return res.status(200).json({
      isValid: false,
    });
  }
});

/* ======================================================
   ✅ NOTIFY WEBHOOK (FINAL FIX)
====================================================== */

router.post("/notify", async (req, res) => {
  console.log("🔥 OZOW NOTIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const data = req.body;

    const payoutId = data.PayoutId;
    const merchantRef = data.MerchantReference;
    const status = data.PayoutStatus?.Status;
    const subStatus = data.PayoutStatus?.SubStatus;
    const errorMessage = data.PayoutStatus?.ErrorMessage;

    console.log(`📊 STATUS UPDATE: ${payoutId} → status=${status} sub=${subStatus}`);

    // 🔥 STEP 1: Ensure provider_ref is saved (CRITICAL FIX)
    const { data: existing } = await supabase
      .from("payouts")
      .select("id, provider_ref")
      .eq("merchant_ref", merchantRef)
      .maybeSingle();

    if (existing && !existing.provider_ref) {
      console.log("🧩 Linking provider_ref to payout...");
      await supabase
        .from("payouts")
        .update({ provider_ref: payoutId })
        .eq("merchant_ref", merchantRef);
    }

    // 🔥 STEP 2: Update status (WITH FALLBACK)
    let updateQuery = supabase
      .from("payouts")
      .update({
        last_error: status === 99 ? errorMessage : null,
      });

    if (status === 1 && subStatus === 201) {
      updateQuery = updateQuery.update({
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
        last_error: null,
      });
    }

    if (status === 99) {
      updateQuery = updateQuery.update({
        status: "FAILED",
        last_error: errorMessage,
      });
    }

    // 🔥 Try update by provider_ref first
    let { data: updated, error } = await updateQuery.eq("provider_ref", payoutId).select();

    // 🔥 FALLBACK: update using merchant_ref if nothing updated
    if (!updated || updated.length === 0) {
      console.log("⚠️ provider_ref not found, falling back to merchant_ref");

      await supabase
        .from("payouts")
        .update({
          status:
            status === 1 && subStatus === 201
              ? "COMPLETED"
              : status === 99
              ? "FAILED"
              : "PROCESSING",
          completed_at:
            status === 1 && subStatus === 201
              ? new Date().toISOString()
              : null,
          last_error: status === 99 ? errorMessage : null,
          provider_ref: payoutId, // 🔥 ALSO FIXES FUTURE LOOKUPS
        })
        .eq("merchant_ref", merchantRef);
    }

    console.log("✅ DB UPDATE COMPLETE");

    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ NOTIFY ERROR:", err.message);
    return res.status(200).send("OK");
  }
});

export default router;
