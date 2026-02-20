import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

/*
  GET /api/admin/documents/:id
  Returns signed URL for a document
*/
router.get("/:id", async (req, res) => {
  try {
    const documentId = req.params.id;

    // Get document record
    const { data: doc, error } = await supabase
      .from("business_documents")
      .select("file_url")
      .eq("id", documentId)
      .single();

    if (error || !doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Generate signed URL (60 sec expiry)
    const { data: signed, error: signError } = await supabase.storage
      .from("business-documents")
      .createSignedUrl(doc.file_url, 60);

    if (signError) throw signError;

    res.json({ url: signed.signedUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate URL" });
  }
});

export default router;
