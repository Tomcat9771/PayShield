import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import GoldButton from "../components/GoldButton";

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    const { data, error } = await supabase
      .from("business_registrations")
      .select(`
        id,
        status,
        rejection_reason,
        created_at,
        fee_paid,
        businesses (
          id,
          business_name,
          business_type
        ),
        business_documents (
          id,
          document_type,
          verified
        )
      `)
      .order("created_at", { ascending: false });

    if (!error) {
      setRegistrations(data || []);
    }

    setLoading(false);
  };

  /* ======================================
     APPROVE VIA BACKEND (EMAIL TRIGGERED)
  ====================================== */
  const approveRegistration = async (registrationId) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/approve-registration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ registrationId }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Approval failed");
        return;
      }

      fetchRegistrations();
    } catch (err) {
      console.error(err);
      alert("Approval failed");
    }
  };

  /* ======================================
     REJECT (Still Direct For Now)
  ====================================== */
  const rejectRegistration = async (id) => {
    const reason = prompt("Enter rejection reason:");

    if (!reason || reason.trim() === "") {
      alert("Rejection reason is required.");
      return;
    }

    await supabase
      .from("business_registrations")
      .update({
        status: "rejected",
        rejection_reason: reason,
      })
      .eq("id", id);

    fetchRegistrations();
  };

  if (loading)
    return <div style={{ padding: 40 }}>Loading registrations...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h2>Admin – Business Registrations</h2>

      <GoldButton
        onClick={() => navigate("/admin/dashboard")}
        style={{ marginBottom: "25px" }}
      >
        ← Back to Dashboard
      </GoldButton>

      {registrations.map((reg) => {
        const business = reg.businesses;
        const docs = reg.business_documents || [];

        const requiredDocs = {
          Company: [
            "cipc",
            "proof_of_address",
            "proof_of_bank",
            "director_ids",
            "appointment_letter",
          ],
          "Sole Proprietor": [
            "id",
            "proof_of_address",
            "proof_of_bank",
          ],
        };

        const required = requiredDocs[business?.business_type] || [];

        const verifiedDocs = docs
          .filter((d) => d.verified)
          .map((d) => d.document_type);

        const allDocsVerified =
          required.length > 0 &&
          required.every((r) => verifiedDocs.includes(r));

        const canApprove =
          reg.status === "pending" &&
          allDocsVerified;

        return (
          <div
            key={reg.id}
            style={{
              border: "1px solid #ddd",
              padding: "15px",
              marginBottom: "15px",
              borderRadius: "6px",
            }}
          >
            <p>
              <strong>Business:</strong> {business?.business_name}
            </p>
            <p>
              <strong>Status:</strong> {reg.status}
            </p>

            {reg.status === "rejected" && (
              <p style={{ color: "red" }}>
                <strong>Reason:</strong> {reg.rejection_reason}
              </p>
            )}

            <p>
              <strong>Fee Paid:</strong>{" "}
              {reg.fee_paid ? "Yes" : "No"}
            </p>

            <p>
              <strong>Documents Verified:</strong>{" "}
              {verifiedDocs.length} / {required.length}
            </p>

            {canApprove ? (
              <GoldButton
                onClick={() => approveRegistration(reg.id)}
              >
                Approve
              </GoldButton>
            ) : (
              <GoldButton disabled>
                Approval Requirements Not Met
              </GoldButton>
            )}

            {reg.status === "pending" && (
              <GoldButton
                style={{
                  marginLeft: 10,
                  backgroundColor: "#c0392b",
                  color: "white",
                }}
                onClick={() => rejectRegistration(reg.id)}
              >
                Reject
              </GoldButton>
            )}
          </div>
        );
      })}
    </div>
  );
}