import express from "express";
import { supabase } from "../lib/supabaseClient.js";
import requireAuth, { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * Protect all transaction routes (admin only)
 */
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/transactions
 * Optional filters:
 *  - startDate
 *  - endDate
 *  - status
 *  - payoutMethod
 *  - guard_id        ✅ ADDED
 */
router.get("/", async (req, res) => {
  const { startDate, endDate, status, payoutMethod, guard_id } = req.query;

  let query = supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);
  if (status) query = query.eq("status", status);
  if (payoutMethod) query = query.eq("payout_method", payoutMethod);

  // ✅ Guard-specific filtering (non-breaking)
  if (guard_id) query = query.eq("guard_id", guard_id);

  const { data, error } = await query;

  if (error) {
    console.error("❌ Transaction fetch error:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data || []);
});

/**
 * POST /api/transactions/:id/reverse
 */
router.post("/:id/reverse", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("transactions")
    .update({ status: "REVERSAL" })
    .eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});

/**
 * POST /api/transactions/:id/retry
 */
router.post("/:id/retry", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("transactions")
    .update({ status: "RETRY" })
    .eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});

/**
 * GET /api/transactions/reconciliation
 * (UNCHANGED – global by design)
 */
router.get("/reconciliation", async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: "Start and end dates required" });
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    count: data.length,
    transactions: data,
  });
});

export default router;
