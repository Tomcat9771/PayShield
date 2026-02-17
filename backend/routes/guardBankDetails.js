import express from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "./login.js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET bank details for a guard
 * Admin only
 */
router.get("/:guardId", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { guardId } = req.params;

  const { data, error } = await supabase
    .from("guard_bank_details")
    .select(
      "bank_name, account_holder, account_number, branch_code, account_type, is_verified"
    )
    .eq("guard_id", guardId)
    .single();

  if (error && error.code !== "PGRST116") {
    return res.status(500).json({ error: error.message });
  }

  res.json(data || null);
});

/**
 * CREATE or UPDATE bank details for a guard
 * Admin only
 */
router.post("/:guardId", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { guardId } = req.params;
  const {
    bank_name,
    account_holder,
    account_number,
    branch_code,
    account_type
  } = req.body;

  if (!bank_name || !account_holder || !account_number || !branch_code) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { error } = await supabase
    .from("guard_bank_details")
    .upsert(
      {
        guard_id: guardId,
        bank_name,
        account_holder,
        account_number,
        branch_code,
        account_type,
        updated_at: new Date().toISOString()
      },
      { onConflict: "guard_id" }
    );

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});

export default router;
