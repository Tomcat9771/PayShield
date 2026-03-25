import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ======================================================
   ✅ STEP 3: VERIFY WEBHOOK (CRITICAL)
====================================================== */

router.post("/verify", async (req, res) => {
  console.log("🔥 OZOW VERIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const payoutId = req.body.PayoutId;
    const merchantRef = req.body.MerchantReference;

    console.log("🔍 Looking up payoutId:", payoutId);

    // ✅ ONLY TRUST provider_ref
    const { data } = await supabase
      .from("payouts")
      .select("encryption_key")
      .eq("provider_ref", payoutId)
      .maybeSingle();

    const key = data?.encryption_key;

    console.log("📦 DB RESULT:", data);
    console.log("🔑 FINAL VERIFY KEY:", key);

    return res.status(200).json({
      PayoutId: payoutId,
      IsVerified: !!key,
      AccountNumberDecryptionKey: key || "",
      Reason: key ? "" : "Missing encryption key",
    });

  } catch (err) {
    console.error("❌ VERIFY ERROR:", err.message);
    return res.status(200).send("OK");
  }
});

/* ======================================================
   ✅ STEP 4: NOTIFY WEBHOOK (STATUS UPDATES)
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

    // 🔥 OPTIONAL: Update payout status in DB
    /*
    await supabase
      .from("payouts")
      .update({
        status: status === 1 ? "COMPLETED" : "FAILED"
      })
      .eq("provider_ref", payoutId);
    */

    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ NOTIFY ERROR:", err.message);
    return res.status(200).send("OK");
  }
});

export default router;

