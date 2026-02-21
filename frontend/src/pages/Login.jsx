import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { layout, components, typography, colors } from "../theme";

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

  return (
    <div
      style={{
        ...layout.page,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          ...components.card,
          width: "380px",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <img
          src="/shieldpay-logo.png"
          alt="PayShield Logo"
          style={{
            height: "60px",
            marginBottom: "20px",
          }}
        />

        <h2 style={typography.heading}>Login to PayShield</h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={components.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={components.input}
          />

          <button
            disabled={loading}
            style={{
              ...components.goldButton,
              width: "100%",
              marginTop: "10px",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && (
          <p style={{ color: colors.danger, marginTop: "15px" }}>
            {error}
          </p>
        )}

        <p style={{ marginTop: "20px", color: colors.white }}>
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            style={{
              color: colors.gold,
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