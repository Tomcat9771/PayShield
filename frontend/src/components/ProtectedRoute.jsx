import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children, mode = "auth" }) {
  const [status, setStatus] = useState("loading"); // loading | redirect | done
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setRedirect("/login");
          setStatus("redirect");
          return;
        }

        const user = session.user;

        /* =========================
           AUTH ONLY
        ========================= */
        if (mode === "auth") {
          setStatus("done");
          return;
        }

        /* =========================
           GET PROFILE (optional)
        ========================= */
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const isAdmin = profile?.role === "admin";
// 🔥 ADMIN OVERRIDE
if (isAdmin && mode !== "admin") {
  setRedirect("/admin/dashboard");
  setStatus("redirect");
  return;
}

        if (mode === "admin") {
          if (isAdmin) {
            setStatus("done");
          } else {
            setRedirect("/dashboard");
            setStatus("redirect");
          }
          return;
        }

        /* =========================
           GET BUSINESS
        ========================= */
        const { data: business } = await supabase
          .from("businesses")
          .select("id, registration_fee_paid")
          .eq("user_id", user.id)
          .maybeSingle();

        if (mode === "no-business") {
          if (!business) {
            setStatus("done");
          } else {
            setRedirect("/dashboard");
            setStatus("redirect");
          }
          return;
        }

        if (!business) {
          setRedirect("/create-business");
          setStatus("redirect");
          return;
        }

        /* =========================
           GET REGISTRATION
        ========================= */
        const { data: registration } = await supabase
          .from("business_registrations")
          .select("status")
          .eq("business_id", business.id)
          .maybeSingle();

        // If no registration exists yet → go create-business
        if (!registration) {
          setRedirect("/create-business");
          setStatus("redirect");
          return;
        }

        /* =========================
           PENDING MODE
        ========================= */
        if (mode === "pending") {
          if (registration.status === "pending") {
            setStatus("done");
          } else {
            setRedirect("/dashboard");
            setStatus("redirect");
          }
          return;
        }

        /* =========================
           APPROVED MODE
        ========================= */
        if (mode === "approved") {
          if (registration.status !== "approved") {
            if (registration.status === "pending") {
              setRedirect("/awaiting-approval");
            } else {
              setRedirect("/create-business");
            }
            setStatus("redirect");
            return;
          }

          if (!business.registration_fee_paid) {
            setRedirect("/pay-registration");
            setStatus("redirect");
            return;
          }

          setStatus("done");
          return;
        }

        setStatus("done");
      } catch (err) {
        console.error(err);
        setRedirect("/login");
        setStatus("redirect");
      }
    };

    run();
  }, [mode]);

  if (status === "loading") {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (status === "redirect") {
    return <Navigate to={redirect} replace />;
  }

  return children;
}

