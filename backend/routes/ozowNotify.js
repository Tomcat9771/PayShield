import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/notify", async (req, res) => {
  try {
    const { payoutId, payoutStatus } = req.body;

    let status = "UNKNOWN";

    switch (payoutStatus.status) {
      case 5:
        status = "COMPLETED";
        break;
      case 4:
      case 90:
      case 99:
        status = "FAILED";
        break;
      default:
        status = "PROCESSING";
    }

    await supabase
      .from("payouts")
      .update({ status })
      .eq("ozow_payout_id", payoutId);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

export default router;

