import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/approve-registration", async (req, res) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: "registrationId required" });
    }

    // 1️⃣ Get registration
    const { data: registration, error: fetchError } = await supabase
      .from("business_registrations")
      .select("business_id")
      .eq("id", registrationId)
      .single();

    if (fetchError || !registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // 2️⃣ Update registration status
    const { error: updateRegError } = await supabase
      .from("business_registrations")
      .update({
        status: "approved",
        rejection_reason: null
      })
      .eq("id", registrationId);

    if (updateRegError) {
      return res.status(400).json({ error: updateRegError.message });
    }

    // 3️⃣ Update business operational_status
    const { error: updateBusinessError } = await supabase
      .from("businesses")
      .update({
        operational_status: "approved"
      })
      .eq("id", registration.business_id);

    if (updateBusinessError) {
      return res.status(400).json({ error: updateBusinessError.message });
    }

    return res.json({ ok: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;

