import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Ensure this page is reached via recovery / magic link
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        alert("Invalid or expired recovery link.");
        navigate("/login");
      }
    });
  }, [navigate]);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("Password updated. Please log in.");
      await supabase.auth.signOut();
      navigate("/login");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto" }}>
      <h2>Set New Password</h2>
      <form onSubmit={handleReset}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />
        <button disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Saving..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
