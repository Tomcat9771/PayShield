import { supabase } from "../lib/supabaseClient.js";

/* ==========================================
   REQUIRE AUTH
========================================== */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const token = authHeader.split(" ")[1];

    // Validate token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const authUser = data.user;

    // Load profile (role comes from profiles table)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", authUser.id)
      .single();

    if (profileError) {
      return res.status(403).json({ error: "Profile not found" });
    }

    req.user = {
      id: authUser.id,
      email: authUser.email,
      role: profile.role,
      full_name: profile.full_name
    };

    next();

  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

/* ==========================================
   REQUIRE ADMIN
========================================== */
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export default requireAuth;
export { requireAdmin };
