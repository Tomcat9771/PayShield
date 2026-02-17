import express from "express";
import { supabase } from "../lib/supabaseClient.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/audit
 * Admin-wide audit log (system + admin actions)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select(`
        id,
        admin_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("AUDIT FETCH ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("AUDIT ROUTE ERROR:", err);
    res.status(500).json({ error: "Failed to load audit log" });
  }
});

export default router;
