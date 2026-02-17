import express from "express";
import { supabase } from "../lib/supabaseClient.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();

/**
 * Protect all ledger routes
 */
router.use(requireAuth);

/**
 * GET /api/ledger
 * Optional query params:
 *  - payout_id
 *  - transaction_id
 *  - guard_id
 *  - entry_type (PAYMENT_RECEIVED | PAYOUT_ASSIGNED | PAYOUT_EXECUTED)
 *  - limit (default 100)
 */
router.get("/", async (req, res) => {
  try {
    const {
      payout_id,
      transaction_id,
      guard_id,
      entry_type,
      limit = 100,
    } = req.query;

    let query = supabase
      .from("ledger_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (payout_id) {
      query = query.eq("payout_id", payout_id);
    }

    if (transaction_id) {
      query = query.eq("transaction_id", transaction_id);
    }

    if (guard_id) {
      query = query.eq("guard_id", guard_id);
    }

    if (entry_type) {
      query = query.eq("entry_type", entry_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Ledger fetch error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      count: data.length,
      entries: data,
    });
  } catch (err) {
    console.error("❌ Ledger route crash:", err);
    res.status(500).json({ error: "Failed to fetch ledger entries" });
  }
});

export default router;
