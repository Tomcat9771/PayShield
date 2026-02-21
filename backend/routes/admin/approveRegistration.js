import express from "express";
import { supabase } from "../../lib/supabaseClient.js";
import { sendApprovalEmail } from "../../services/emailService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: "Missing registrationId" });
    }

    /* ======================================
       GET REGISTRATION + BUSINESS
    ====================================== */

    const { data: registration, error: regError } = await supabase
      .from("business_registrations")
      .select(`
        id,
        business_id,
        status,
        businesses (
          id,
          business_name,
          email
        )
      `)
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    if (registration.status === "approved") {
      return res.status(400).json({ error: "Already approved" });
    }

    /* ======================================
       UPDATE STATUS
    ====================================== */

    const { error: updateError } = await supabase
      .from("business_registrations")
      .update({
        status: "approved",
        reviewed_at: new Date(),
      })
      .eq("id", registrationId);

    if (updateError) throw updateError;

    /* ======================================
       SEND EMAIL
    ====================================== */

    const business = registration.businesses;

    await sendApprovalEmail(business.email, business.business_name);

    return res.json({ success: true });

  } catch (err) {
    console.error("Approval error:", err);
    return res.status(500).json({ error: "Approval failed" });
  }
});

export default router;