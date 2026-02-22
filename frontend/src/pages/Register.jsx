import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { layout, components, typography, colors } from "../theme";
import GoldButton from "../components/GoldButton";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmed`
        }
      });

      if (error) throw error;

      // Redirect to check-email page instead of login
      navigate("/check-email", { state: { email: form.email } });

    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
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
      <div style={{ ...components.card, width: "380px", textAlign: "center" }}>
        <img
          src="/shieldpay-logo.png"
          alt="PayShield Logo"
          style={{ height: "60px", marginBottom: "20px" }}
        />

        <h2 style={typography.heading}>Create PayShield Account</h2>

        <form onSubmit={handleRegister}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
            required
            style={components.input}
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
            required
            style={components.input}
          />

          <GoldButton type="submit" fullWidth disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </GoldButton>
        </form>

        {error && (
          <p style={{ color: colors.danger, marginTop: 15 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}