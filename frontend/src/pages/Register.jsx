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
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) throw error;

      setSuccess("Registration successful. Please check your email.");
      navigate("/login");

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
        <h2 style={typography.heading}>Create Account</h2>

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

        {error && <p style={{ color: colors.danger }}>{error}</p>}
        {success && <p style={{ color: colors.gold }}>{success}</p>}
      </div>
    </div>
  );
}