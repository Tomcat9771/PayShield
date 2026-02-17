import { supabase } from "./supabaseClient.js";

export async function audit({
  admin_id = null,
  action,
  entity_type,
  entity_id = null,
  metadata = null,
}) {
  const payload = {
    admin_id,
    action,
    entity_type,
    entity_id,
    metadata,
  };

  const { error } = await supabase
    .from("admin_audit_log")
    .insert(payload);

  if (error) {
    console.error("❌ AUDIT INSERT FAILED:", error);
  }
}
