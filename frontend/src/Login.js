import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "./apiClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await login(email, password);

      // ✅ STORE TOKEN (match apiClient)
      localStorage.setItem("guardpay_token", res.token);

      navigate("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#3b1d6a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 12,
          padding: "32px 28px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/shieldpay-logo.png"
            alt="PayShield"
            style={{ height: 48, marginBottom: 10 }}
          />
          <h2 style={{ margin: 0 }}>PayShield</h2>
          <p style={{ margin: "6px 0 0", color: "#666" }}>
            Admin Login
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fdecea",
              color: "#b91c1c",
              padding: "10px 12px",
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 14, fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              border: "none",
              background: "#6d28d9",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 12,
            color: "#777",
          }}
        >
          Hosted by Shields Consulting
        </div>
      </div>
    </div>
  );
}
