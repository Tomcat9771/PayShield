import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate("/dashboard", { replace: true });
      }
    };

    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Ensure clean account switching
    await supabase.auth.signOut();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  const goldButton = {
    backgroundColor: "#FAE418",
    border: "2px solid #F1C50E",
    color: "#6B1A7B",
    padding: "12px 28px",
    borderRadius: "30px",
    fontWeight: "bold",
    cursor: "pointer",
    width: "100%",
    marginTop: "15px",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "none",
    outline: "none",
    fontSize: "14px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#6B1A7B",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "380px",
          padding: "40px",
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "#F1C50E", marginBottom: "25px" }}>
          Login to PayShield
        </h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          <button disabled={loading} style={goldButton}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && (
          <p style={{ color: "red", marginTop: "15px" }}>{error}</p>
        )}

        <p style={{ marginTop: "20px", color: "white" }}>
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            style={{
              color: "#F1C50E",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  );
}