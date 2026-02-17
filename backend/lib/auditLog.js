import { supabase } from "./supabaseClient.js";

export async function logAdminAction({
  admin_id,
  action,
  entity_type,
  entity_id = null,
  metadata = {},
}) {
  await supabase.from("admin_audit_log").insert([
    {
      admin_id,
      action,
      entity_type,
      entity_id,
      metadata,
    },
  ]);
}
