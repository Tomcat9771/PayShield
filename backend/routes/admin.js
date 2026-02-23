import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// APPROVE REGISTRATION (Documents Approved Only)
router.post("/approve-registration", async (req, res) => {
  console.log("🔥 ADMIN APPROVE HIT");

  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: "registrationId required" });
    }

    // 1️⃣ Fetch registration
    const { data: registration, error: fetchError } = await supabase
      .from("business_registrations")
      .select("id, business_id")
      .eq("id", registrationId)
      .single();

    if (fetchError || !registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // 2️⃣ Mark registration as approved
    const { error: updateRegError } = await supabase
      .from("business_registrations")
      .update({
        status: "approved",
        rejection_reason: null,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", registrationId);

    if (updateRegError) {
      console.error(updateRegError);
      return res.status(400).json({ error: updateRegError.message });
    }

    // 3️⃣ Set business to VERIFIED (NOT ACTIVE)
    const { error: updateBusinessError } = await supabase
      .from("businesses")
      .update({
        operational_status: "verified"
      })
      .eq("id", registration.business_id);

    if (updateBusinessError) {
      console.error(updateBusinessError);
      return res.status(400).json({ error: updateBusinessError.message });
    }

    return res.json({
      ok: true,
      message: "Registration approved. Awaiting payment."
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;

