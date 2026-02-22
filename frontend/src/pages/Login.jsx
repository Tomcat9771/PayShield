import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { layout, components, typography, colors } from "../theme";
import GoldButton from "../components/GoldButton";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

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
    setInfoMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Supabase returns this message when email not confirmed
      if (
        error.message.toLowerCase().includes("email not confirmed") ||
        error.message.toLowerCase().includes("not confirmed")
      ) {
        setError("");
        setInfoMessage(
          "Your email address has not been verified yet. Please check your inbox and click the verification link before logging in."
        );
      } else {
        setError(error.message);
      }

      setLoading(false);
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  const resendVerification = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setResending(true);
    setError("");
    setInfoMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      setError("Failed to resend verification email.");
    } else {
      setInfoMessage(
        "Verification email sent again. Please check your inbox (and spam folder)."
      );
    }

    setResending(false);
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

          <GoldButton type="submit" fullWidth disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </GoldButton>
        </form>

        {error && (
          <p style={{ color: colors.danger, marginTop: "15px" }}>
            {error}
          </p>
        )}

        {infoMessage && (
          <>
            <p style={{ color: colors.gold, marginTop: "15px" }}>
              {infoMessage}
            </p>

            <GoldButton
              onClick={resendVerification}
              disabled={resending}
              style={{ marginTop: "10px" }}
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </GoldButton>
          </>
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