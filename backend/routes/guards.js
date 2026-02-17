import express from "express";
import { supabase } from "../lib/supabaseClient.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/* -----------------------------
   Validation regex
------------------------------ */
const NAME_REGEX = /^[A-Za-z ]+$/;
const NUMERIC_REGEX = /^\d+$/;
const SITE_LOCATION_REGEX = /^[A-Za-z0-9\s()\-/#&]+$/;

/* =====================================================
   ✅ PUBLIC: GET /api/guards/public
===================================================== */
router.get("/public", async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing guard id" });
  }

  const { data, error } = await supabase
    .from("guards")
    .select("id, full_name, site_location, payout_method, status")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Guard not found" });
  }

  res.json(data);
});

/* =====================================================
   🔒 GET /api/guards  (admin list)
===================================================== */
router.get("/", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("guards")
    .select(`
	  id,
	  full_name,
	  phone_number,
	  id_type,
	  id_number,
	  site_location,
	  payout_method,
	  status,
	  street_address,
	  suburb,
	  city,
	  province,
	  postal_code
	 `)
    .eq("status", "active")
    .order("full_name");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* =====================================================
   🔒 GET /api/guards/bank-status  (admin)
===================================================== */
router.get("/bank-status", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("guards")
    .select(`
      id,
      full_name,
      phone_number,
      site_location,
      status,
      payout_method,
      street_address,
      suburb,
      city,
      province,
      postal_code,

      guard_bank_details (
        bank_name,
        account_holder,
        account_number,
        branch_code,
        account_type,
        verification_status
      )
    `)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load guards with bank details:", error);
    return res.status(500).json({ error: "Failed to load guards" });
  }

  const guards = data.map((g) => {
    const bank = g.guard_bank_details || null;

    let bank_status = "not_required";
    let bank_verified = null;

    if (g.payout_method === "bank") {
      if (!bank) {
        bank_status = "invalid";
        bank_verified = false;
      } else if (bank.verification_status === "verified") {
        bank_status = "valid";
        bank_verified = true;
      } else {
        bank_status = "invalid";
        bank_verified = false;
      }
    }

    return {
      id: g.id,
      full_name: g.full_name,
      phone_number: g.phone_number,
      site_location: g.site_location,
      status: g.status,
      payout_method: g.payout_method,

      street_address: g.street_address,
      suburb: g.suburb,
      city: g.city,
      province: g.province,
      postal_code: g.postal_code,

      bank_name: bank?.bank_name ?? null,
      account_holder: bank?.account_holder ?? null,
      account_number: bank?.account_number ?? null,
      branch_code: bank?.branch_code ?? null,
      account_type: bank?.account_type ?? null,

      bank_status,
      bank_verified,
    };
  });

  res.json(guards);
});

/* =====================================================
   🔒 PUT /api/guards/:id
   (EDIT PERSONAL + ADDRESS ONLY)
===================================================== */
router.put("/:id", authMiddleware, async (req, res) => {
  const ALLOWED_FIELDS = [
  "full_name",
  "phone_number",
  "id_type",
  "id_number",
  "site_location",
  "street_address",
  "suburb",
  "city",
  "province",
  "postal_code",
];

  const updates = {};

  for (const key of ALLOWED_FIELDS) {
    if (key in req.body) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields provided" });
  }

  if (updates.full_name && !NAME_REGEX.test(updates.full_name)) {
    return res.status(400).json({ error: "Invalid full name" });
  }

  if (updates.phone_number && !NUMERIC_REGEX.test(updates.phone_number)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  if (
  updates.site_location &&
  !SITE_LOCATION_REGEX.test(updates.site_location)
) {
  return res.status(400).json({ error: "Invalid site location" });
}


  const { data, error } = await supabase
    .from("guards")
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
   🔒 POST /api/guards
   (CREATE NEW GUARD)
===================================================== */
router.post("/", authMiddleware, async (req, res) => {
  const {
    full_name,
    phone_number,
    id_type,
    id_number,
    site_location,
    payout_method = "cash",
    street_address,
    suburb,
    city,
    province,
    postal_code,
  } = req.body;

  // ---- Required fields
  if (!full_name || !phone_number) {
    return res.status(400).json({
      error: "Full name and phone number are required",
    });
  }

  if (!id_type || !["ID", "PASSPORT"].includes(id_type)) {
    return res.status(400).json({ error: "Invalid or missing ID type" });
  }

  // ---- Validation
  if (!NAME_REGEX.test(full_name)) {
    return res.status(400).json({ error: "Invalid full name" });
  }

  if (!NUMERIC_REGEX.test(phone_number)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  if (!["cash", "bank"].includes(payout_method)) {
    return res.status(400).json({ error: "Invalid payout method" });
  }

  if (site_location && !SITE_LOCATION_REGEX.test(site_location)) {
    return res.status(400).json({ error: "Invalid site location" });
  }

  if (id_number && typeof id_number !== "string") {
    return res.status(400).json({ error: "Invalid ID number" });
  }

  // ---- Insert
  const { data, error } = await supabase
    .from("guards")
    .insert([
      {
        full_name,
        phone_number,
        id_type,
        id_number: id_number || null,
        site_location: site_location || null,
        payout_method,
        street_address: street_address || null,
        suburb: suburb || null,
        city: city || null,
        province: province || null,
        postal_code: postal_code || null,
        status: "active",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Failed to create guard:", error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

/* =====================================================
   🔒 POST /api/guards/:id/change-payout-method
===================================================== */
router.post("/:id/change-payout-method", authMiddleware, async (req, res) => {
  const { payout_method } = req.body;

  if (!["cash", "bank"].includes(payout_method)) {
    return res.status(400).json({ error: "Invalid payout method" });
  }

  const { data: guard, error: guardError } = await supabase
    .from("guards")
    .select("id, payout_method")
    .eq("id", req.params.id)
    .single();

  if (guardError || !guard) {
    return res.status(404).json({ error: "Guard not found" });
  }

  if (guard.payout_method === payout_method) {
    return res.status(400).json({ error: "Payout method unchanged" });
  }

  const { error } = await supabase
    .from("guards")
    .update({
      payout_method,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guard.id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({
    ok: true,
    message:
      payout_method === "bank"
        ? "Payout method changed to bank. Bank details required."
        : "Payout method changed to cash.",
  });
});

/* =====================================================
   🔒 PUT /api/guards/:id/bank-details
   (ADD or CHANGE — forces re-verification)
===================================================== */
router.put("/:id/bank-details", authMiddleware, async (req, res) => {
  const {
    bank_name,
    account_holder,
    account_number,
    branch_code,
    account_type,
  } = req.body;

  if (!bank_name || !account_holder || !account_number || !branch_code) {
    return res.status(400).json({ error: "Missing bank fields" });
  }

  const { data: guard, error: guardError } = await supabase
    .from("guards")
    .select("id, payout_method")
    .eq("id", req.params.id)
    .single();

  if (guardError || !guard) {
    return res.status(404).json({ error: "Guard not found" });
  }

  if (guard.payout_method !== "bank") {
    return res.status(400).json({
      error: "Payout method must be bank to add or change bank details",
    });
  }

  const { data: existing } = await supabase
    .from("guard_bank_details")
    .select("id")
    .eq("guard_id", guard.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("guard_bank_details")
      .update({
        bank_name,
        account_holder,
        account_number,
        branch_code,
        account_type,
        verification_status: "unverified",
        is_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq("guard_id", guard.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      ok: true,
      message: "Bank details updated. Re-verification required.",
    });
  }

  const { error } = await supabase
    .from("guard_bank_details")
    .insert([
      {
        guard_id: guard.id,
        bank_name,
        account_holder,
        account_number,
        branch_code,
        account_type,
        verification_status: "unverified",
        is_verified: false,
      },
    ]);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({
    ok: true,
    message: "Bank details added. Verification required.",
  });
});

/* =====================================================
   🔒 POST /api/guards/:id/verify-bank
===================================================== */
router.post("/:id/verify-bank", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("guard_bank_details")
    .update({
      verification_status: "verified",
      is_verified: true,
      verified_at: new Date().toISOString(),
    })
    .eq("guard_id", req.params.id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
});

/* =====================================================
   🔒 POST /api/guards/:id/unverify-bank
===================================================== */
router.post("/:id/unverify-bank", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("guard_bank_details")
    .update({
      verification_status: "unverified",
      is_verified: false,
    })
    .eq("guard_id", req.params.id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
});

/* =====================================================
   🔒 DELETE /api/guards/:id  (soft delete)
===================================================== */
router.delete("/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("guards")
    .update({
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
