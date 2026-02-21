import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

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

        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!business) {
          navigate("/create-business");
          return;
        }

        const { data: registration } = await supabase
          .from("business_registrations")
          .select("status")
          .eq("business_id", business.id)
          .single();

        if (!registration) {
          navigate("/create-business");
          return;
        }

        if (registration.status === "pending") {
          navigate("/awaiting-approval");
          return;
        }

        if (registration.status !== "approved") {
          navigate("/awaiting-approval");
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
    return <div style={{ padding: 40 }}>Checking access...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ color: "#F1C50E" }}>Dashboard</h1>
      <p style={{ color: "white" }}>
        Welcome to your PayShield control panel.
      </p>
    </div>
  );
}