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

      setRole(profile?.role === "admin" ? "ADMIN" : "USER");
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#6B1A7B",
        color: "#F1C50E",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #F1C50E",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
  <img
    src="/shieldpay-logo.png"
    alt="PayShield Logo"
    style={{ height: "50px" }}
  />
  <span style={{ fontWeight: "bold", fontSize: "20px" }}>
    PayShield
  </span>
</div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "white" }}>{email}</span>

          <span
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "bold",
              background: role === "ADMIN" ? "#dc2626" : "#F1C50E",
              color: role === "ADMIN" ? "white" : "#6B1A7B",
            }}
          >
            {role}
          </span>

          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "#FAE418",
              border: "2px solid #F1C50E",
              color: "#6B1A7B",
              padding: "8px 18px",
              borderRadius: "30px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div style={{ padding: "40px" }}>{children}</div>
    </div>
  );
}
