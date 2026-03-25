import express from "express";

const router = express.Router();
const ACCESS_TOKEN = process.env.OZOW_ACCESS_TOKEN;

// In-memory key store
global.payoutKeys = global.payoutKeys || {};

// ======================================================
// ✅ STEP 3: VERIFY WEBHOOK (CRITICAL)
// ======================================================

router.post("/verify", async (req, res) => {
console.log("🔥🔥🔥 VERIFY ENDPOINT HIT 🔥🔥🔥");
  console.log("🔥 OZOW VERIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const incomingToken = Object.entries(req.headers).find(
  ([key]) => key.toLowerCase() === "accesstoken"
)?.[1];
console.log("🔐 Incoming Token:", incomingToken);
console.log("🔐 Expected Token:", ACCESS_TOKEN);

    if (!incomingToken || incomingToken !== ACCESS_TOKEN) {
      console.log("❌ Invalid AccessToken");

      return res.status(200).json({
        PayoutId: "",
        IsVerified: false,
        AccountNumberDecryptionKey: "",
        Reason: "Invalid AccessToken",
      });
    }

    // ✅ DEFINE FIRST
    const payoutId = req.body.payoutId;

    console.log("🔑 VERIFY KEY CHECK:", payoutId, global.payoutKeys[payoutId]);

    const key =
      global.payoutKeys[payoutId] ||
      global.payoutKeys[req.body.merchantReference];

    console.log("🔑 VERIFY KEY:", payoutId, key);

    return res.status(200).json({
      PayoutId: payoutId,
     IsVerified: !!key,
///IsVerified: true,
      AccountNumberDecryptionKey: key || "",
      Reason: key ? "" : "Missing encryption key",
    });

  } catch (err) {
    console.error("❌ VERIFY ERROR:", err.message);
    return res.status(200).send("OK");
  }
});

// ======================================================
// ✅ STEP 4: NOTIFY WEBHOOK (STATUS UPDATES)
// ======================================================
router.post("/notify", async (req, res) => {
  console.log("🔥 OZOW NOTIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const incomingToken = Object.entries(req.headers).find(
  ([key]) => key.toLowerCase() === "accesstoken"
)?.[1];
console.log("🔐 Incoming Token:", incomingToken);
console.log("🔐 Expected Token:", ACCESS_TOKEN);

    if (!incomingToken || incomingToken !== ACCESS_TOKEN) {
      console.log("❌ Invalid AccessToken");
      return res.status(200).send("OK");
    }

    const data = req.body;
    const payoutId = data.payoutId;

    const status = data.payoutStatus?.status;
    const subStatus = data.payoutStatus?.subStatus;

    console.log(`📊 STATUS UPDATE: ${payoutId} → status=${status} sub=${subStatus}`);

    // 👉 You can update DB here if needed

    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ NOTIFY ERROR:", err.message);
    return res.status(200).send("OK");
  }
});

export default router;
