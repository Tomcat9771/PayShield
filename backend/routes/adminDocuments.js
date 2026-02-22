import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

/* ======================================
   GET SIGNED URL
====================================== */
router.post("/get-signed-url", async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ error: "Invalid file path" });
    }

    if (filePath.includes("..")) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    const { data, error } = await supabase.storage
      .from("business-documents")
      .createSignedUrl(filePath, 60 * 5); // 5 minutes

    if (error) {
      console.error("Signed URL error:", error);
      return res.status(500).json({ error: "Could not generate signed URL" });
    }

    return res.json({ url: data.signedUrl });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ======================================
   VERIFY DOCUMENT
====================================== */
router.post("/verify", async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: "Missing document ID" });
    }

    const { error } = await supabase
      .from("business_documents")
      .update({
        verified: true,
        verified_at: new Date(),
      })
      .eq("id", documentId);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Could not verify document" });
    }

    // Optional audit log
    try {
      await supabase.from("admin_audit_log").insert({
        admin_email: "system",
        action: "document_verified",
        entity_type: "business_document",
        entity_id: documentId,
        metadata: {
          verified_at: new Date().toISOString(),
        },
      });
    } catch (logError) {
      console.error("Audit log failed:", logError.message);
    }

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ======================================
   REJECT DOCUMENT (OPTIONAL)
====================================== */
router.post("/reject", async (req, res) => {
  try {
    const { documentId, reason } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: "Missing document ID" });
    }

    const { error } = await supabase
      .from("business_documents")
      .update({
        verified: false,
        rejection_reason: reason || null,
      })
      .eq("id", documentId);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Could not reject document" });
    }

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;