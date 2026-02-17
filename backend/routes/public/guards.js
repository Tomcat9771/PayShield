const express = require("express");
const router = express.Router();

const { getSupabaseClient } = require("../../lib/supabaseClient");
const supabase = getSupabaseClient();

const { requireAuth, requireAdmin } = require("../../authUtils");

/**
 * ============================
 * AUTHENTICATED (ADMIN / DASHBOARD)
 * ============================
 */

/**
 * GET /api/guards
 * Authenticated users can view guards
 */
router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("guards")
    .select(`
      id,
      full_name,
      id_number,
      phone_number,
      site_location,
      status,
      payout_method,
      photo_url,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

/**
 * GET /api/guards/:id
 * Authenticated users can view a single guard
 */
router.get("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("guards")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Guard not found" });
  }

  res.json(data);
});

/**
 * POST /api/guards
 * Admin only: create guard
 */
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const {
    full_name,
    id_number,
    phone_number,
    site_location,
    status,
    payout_method,
    photo_url,
  } = req.body;

  if (!full_name) {
    return res.status(400).json({ error: "full_name is required" });
  }

  const { data, error } = await supabase
    .from("guards")
    .insert([
      {
        full_name,
        id_number,
        phone_number,
        site_location,
        status: status || "active",
        payout_method,
        photo_url,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

/**
 * PUT /api/guards/:id
 * Admin only: update guard
 */
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  const updates = {
    ...req.body,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("guards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

/**
 * DELETE /api/guards/:id
 * Admin only: delete guard
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("guards")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});

/**
 * ============================
 * PUBLIC (QR PAYMENT PAGE)
 * ============================
 */

/**
 * GET /api/guards/public/:id
 * PUBLIC: Used by /pay/:guardId page
 */
router.get("/public/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("guards")
      .select("id, full_name, site_location, photo_url")
      .eq("id", id)
      .eq("status", "active")
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Guard not found" });
    }

    return res.json({
      id: data.id,
      name: data.full_name,
      location: data.site_location,
      photo_url: data.photo_url,
    });
  } catch (err) {
    console.error("❌ Public guard fetch error:", err);
    return res.status(500).json({ error: "Failed to load guard" });
  }
});

module.exports = router;
