import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/approve-registration", async (req, res) => {
  console.log("🔥 APPROVE ROUTE HIT - NEW VERSION");

  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: "registrationId required" });
    }

    // Fetch registration
    const { data: registration, error: fetchError } = await supabase
      .from("business_registrations")
      .select("id, business_id, status")
      .eq("id", registrationId)
      .single();

    if (fetchError || !registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    console.log("📌 Registration found:", registration);

    // Approve registration (NO fee validation)
    const { error: updateRegError } = await supabase
      .from("business_registrations")
      .update({
        status: "approved",
        rejection_reason: null,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", registrationId);

    if (updateRegError) {
      console.error("❌ Registration update error:", updateRegError);
      return res.status(400).json({ error: updateRegError.message });
    }

    // Set business operational_status to approved
    const { error: updateBusinessError } = await supabase
      .from("businesses")
      .update({
        operational_status: "approved"
      })
      .eq("id", registration.business_id);

    if (updateBusinessError) {
      console.error("❌ Business update error:", updateBusinessError);
      return res.status(400).json({ error: updateBusinessError.message });
    }

    console.log("✅ Registration approved successfully");

    return res.json({
      ok: true,
      version: "ADMIN_ROUTE_V2_NO_FEE_CHECK"
    });

  } catch (err) {
    console.error("🔥 Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;