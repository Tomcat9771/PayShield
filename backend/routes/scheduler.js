import express from "express";
import { runPayoutBatch } from "../services/payoutBatchService.js";

const router = express.Router();

router.post("/run-payouts", async (req, res) => {
  const secret = req.headers["x-scheduler-secret"];

  if (secret !== process.env.SCHEDULER_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    console.log("⏰ External scheduler triggered");

    const result = await runPayoutBatch();

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    console.error("❌ Scheduler failed:", err.message);

    res.status(500).json({
      error: "Scheduler failed",
    });
  }
});

export default router;