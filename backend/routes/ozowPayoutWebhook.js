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
  console.log("🔥🔥🔥 VERIFY ENDPOINT HIT 🔥🔥🔥");
  console.log("🔥 OZOW VERIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    // 🔥 FIX: Use correct casing
    const payoutId = req.body.PayoutId;

    // 🔥 FIX: Match using provider_ref (NOT id)
    const { data, error } = await supabase
      .from("payouts")
      .select("encryption_key")
      .eq("provider_ref", payoutId)
      .single();

    if (error) {
      console.log("❌ DB ERROR:", error.message);
    }

    const key = data?.encryption_key;

    console.log("🔑 VERIFY KEY FROM DB:", payoutId, key);

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

    // 🔥 FIX: Correct casing
    const payoutId = data.PayoutId;
    const status = data.PayoutStatus?.Status;
    const subStatus = data.PayoutStatus?.SubStatus;

    console.log(`📊 STATUS UPDATE: ${payoutId} → status=${status} sub=${subStatus}`);

    // 👉 OPTIONAL: Update DB properly
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