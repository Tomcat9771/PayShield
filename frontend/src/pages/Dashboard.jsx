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

        // 1️⃣ Get user's business
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!business) {
          navigate("/create-business");
          return;
        }

        // 2️⃣ Get registration status
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

        if (registration.status === "rejected") {
          navigate("/registration-rejected");
          return;
        }

        if (registration.status !== "approved") {
          navigate("/awaiting-approval");
          return;
        }

        // ✅ Approved → allow access
        setLoading(false);

      } catch (err) {
        console.error(err);
        navigate("/login");
      }
    };

    checkAccess();
  }, [navigate]);

  if (loading) {
    return <div>Checking access...</div>;
  }

  return (
    <div>
      {/* Your normal dashboard content here */}
      <h1>Dashboard</h1>
    </div>
  );
}
