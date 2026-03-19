import cron from "node-cron";
import { runPayoutBatch } from "../services/payoutBatchService.js";

// ⏰ Runs every hour at minute 0
cron.schedule("0 * * * *", async () => {
  console.log("⏰ Running scheduled payout batch...");

  try {
    const result = await runPayoutBatch();
    console.log("✅ Scheduled payout result:", result);
  } catch (err) {
    console.error("❌ Scheduled payout failed:", err.message);
  }
});