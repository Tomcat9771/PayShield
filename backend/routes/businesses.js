import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =====================================================
   GET ALL BUSINESSES
===================================================== */
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

/* =====================================================
   GET SINGLE BUSINESS
===================================================== */
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) {
    return res.status(404).json({ error: "Business not found" });
  }

  res.json(data);
});

/* =====================================================
   CREATE BUSINESS
===================================================== */
router.post("/", async (req, res) => {
  const {
    business_name,
    owner_name,
    email,
    phone,
    business_type,
    registration_number,
    address,
    platform_percent_override,
    platform_min_override,
    platform_max_override,
  } = req.body;

  if (!business_name || !owner_name || !email || !phone) {
    return res.status(400).json({
      error: "business_name, owner_name, email and phone are required",
    });
  }

  const { data, error } = await supabase
    .from("businesses")
    .insert({
      business_name,
      owner_name,
      email,
      phone,
      business_type: business_type || null,
      registration_number: registration_number || null,
      address: address || null,
      platform_percent_override: platform_percent_override ?? null,
      platform_min_override: platform_min_override ?? null,
      platform_max_override: platform_max_override ?? null,
      status: "submitted",
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

/* =====================================================
   UPDATE BUSINESS
===================================================== */
router.put("/:id", async (req, res) => {
  const updates = { ...req.body };

  delete updates.id;
  delete updates.created_at;

  const { data, error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

/* =====================================================
   ACTIVATE BUSINESS (after verification)
===================================================== */
router.post("/:id/activate", async (req, res) => {
  const { data: business, error: fetchError } = await supabase
    .from("businesses")
    .select("verified")
    .eq("id", req.params.id)
    .single();

  if (fetchError || !business) {
    return res.status(404).json({ error: "Business not found" });
  }

  if (!business.verified) {
    return res.status(400).json({
      error: "Business must be verified before activation",
    });
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      status: "active",
    })
    .eq("id", req.params.id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
});

/* =====================================================
   SOFT DELETE (REJECT)
===================================================== */
router.post("/:id/reject", async (req, res) => {
  const { rejection_reason } = req.body;

  const { error } = await supabase
    .from("businesses")
    .update({
      status: "rejected",
      rejection_reason: rejection_reason || null,
    })
    .eq("id", req.params.id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
});

export default router;
