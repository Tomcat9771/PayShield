import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      setEmail(session.user.email);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.role === "admin") {
        setRole("ADMIN");
      } else {
        setRole("USER");
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div>
      {/* HEADER */}
      <div
        style={{
          background: "#111827",
          color: "white",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: "bold" }}>PayShield</div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span>{email}</span>

          <span
            style={{
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              background: role === "ADMIN" ? "#dc2626" : "#2563eb",
            }}
          >
            {role}
          </span>

          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div>{children}</div>
    </div>
  );
}

