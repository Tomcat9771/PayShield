import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing guard ID" });
  }

  const { data, error } = await supabase
    .from("guards")
    .select("id, full_name, site_location")
    .eq("id", id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Guard not found" });
  }

  res.status(200).json(data);
}
