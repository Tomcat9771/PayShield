import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { layout, typography } from "../theme";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (!user) {
          navigate("/login");
          return;
        }

        setLoading(false);
      } catch (err) {
        navigate("/login");
      }
    };

    checkAccess();
  }, [navigate]);

  if (loading) {
    return <div style={layout.contentWrapper}>Checking access...</div>;
  }

  return (
    <div style={layout.contentWrapper}>
      <h1 style={typography.heading}>Dashboard</h1>
      <p style={typography.text}>
        Welcome to your PayShield control panel.
      </p>
    </div>
  );
}