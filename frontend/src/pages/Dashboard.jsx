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

        // 1️⃣ Get business
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!business) {
          navigate("/create-business");
          return;
        }

        // 2️⃣ Get registration
        const { data: registration } = await supabase
          .from("business_registrations")
          .select("status")
          .eq("business_id", business.id)
          .single();

        if (!registration) {
          navigate("/create-business");
          return;
        }

        // 3️⃣ Handle status properly (NO FALLTHROUGH)
        if (registration.status === "pending") {
          navigate("/awaiting-approval");
          return;
        }

        if (registration.status === "rejected") {
          navigate("/registration-rejected");
          return;
        }

        if (registration.status === "approved") {
          setLoading(false);
          return;
        }

        // Safety fallback
        navigate("/create-business");

      } catch (err) {
        console.error(err);
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

      <div
        style={{
          width: "80px",
          height: "3px",
          background: "linear-gradient(to right, #F1C50E, transparent)",
          marginBottom: "30px",
        }}
      />

      <p style={typography.text}>
        Welcome to your PayShield control panel.
      </p>
    </div>
  );
}