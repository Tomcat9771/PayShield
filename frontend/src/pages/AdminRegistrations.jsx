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
        businesses (
          id,
          businesses (
  id,
  business_name,
  business_type,
  registration_fee_paid,
  business_directors (
    id,
    director_name,
    director_id_number
  ),
  business_history (
            id,
            old_data,
            new_data,
            changed_at
          )
        ),
        business_documents (
          id,
          document_type,
          verified
        ),
        registration_history (
          id,
          old_status,
          new_status,
          rejection_reason,
          changed_by,
          changed_at
        )
      `)
      .order("created_at", { ascending: false });

    if (!error) {
      setRegistrations(data || []);
    }

    setLoading(false);
  };

  const approveRegistration = async (registrationId) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/approve-registration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          reg.status === "pending" && allDocsVerified;

        const history = (reg.registration_history || []).sort(
          (a, b) => new Date(b.changed_at) - new Date(a.changed_at)
        );

        const businessHistory = (business?.business_history || []).sort(
          (a, b) => new Date(b.changed_at) - new Date(a.changed_at)
        );

        return (
          <div
            key={reg.id}
            style={{
              border: "1px solid #ddd",
              padding: "20px",
              marginBottom: "20px",
              borderRadius: "8px",
              background: "#fff",
            }}
          >
            <p>
              <strong>Business:</strong> {business?.business_name}
            </p>

            <p>
              <strong>Status:</strong> {reg.status}
            </p>

            <p>
              <strong>Fee Paid:</strong>{" "}
              {business?.registration_fee_paid ? "Yes" : "No"}
            </p>

            <p>
              <strong>Documents Verified:</strong>{" "}
              {verifiedDocs.length} / {required.length}
            </p>

            {/* REGISTRATION HISTORY */}
            {history.length > 0 && (
              <div
                style={{
                  marginTop: 15,
                  padding: 15,
                  background: "#f8f9fa",
                  borderRadius: 8,
                }}
              >
                <strong>Registration History</strong>

                {history.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      marginTop: 10,
                      padding: 10,
                      background: "#ffffff",
                      borderRadius: 6,
                      border: "1px solid #eee",
                    }}
                  >
                    <div>
                      {h.old_status} → {h.new_status}
                    </div>

                    {h.rejection_reason && (
                      <div style={{ color: "#c0392b", marginTop: 5 }}>
                        Reason: {h.rejection_reason}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 5,
                        opacity: 0.6,
                      }}
                    >
                      {new Date(h.changed_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* =========================
    REGISTRATION HISTORY (FIRST)
========================= */}
{history.length > 0 && (
  <div style={{ marginTop: 15, padding: 15, background: "#f8f9fa", borderRadius: 8 }}>
    <strong>Registration History</strong>

    {history.map((h) => (
      <div key={h.id} style={{ marginTop: 10 }}>
        <div>
          {h.old_status} → {h.new_status}
        </div>

        {h.rejection_reason && (
          <div style={{ color: "#c0392b", marginTop: 5 }}>
            Rejection Reason: {h.rejection_reason}
          </div>
        )}

        <div style={{ fontSize: 12, opacity: 0.6 }}>
          Changed By: {h.changed_by}
        </div>

        <div style={{ fontSize: 12, opacity: 0.6 }}>
          Updated At: {new Date(h.changed_at).toLocaleString()}
        </div>
      </div>
    ))}
  </div>
)}

{/* =========================
    BUSINESS SNAPSHOT VIEW
========================= */}
{businessHistory.length > 0 && (
  <div style={{ marginTop: 20, padding: 15, background: "#eef3ff", borderRadius: 8 }}>
    <strong>Business Details</strong>

    {businessHistory.map((entry) => {
      const newData = entry.new_data || {};

      const orderedFields = [
        "business_type",
        "business_name",
        "owner_name",
        "phone",
        "registration_number",
        "street_address",
        "town",
        "city",
        "postal_code",
        "postal_street",
        "postal_town",
        "postal_city",
        "postal_postal_code",
        "email",
        "operational_status",
        "registration_fee_paid"
      ];

      return (
        <div key={entry.id} style={{ marginTop: 10 }}>
          {orderedFields.map((field) => (
            <div key={field} style={{ marginBottom: 6 }}>
              <strong>{field}:</strong> {String(newData[field] ?? "")}
            </div>
          ))}
        </div>
      );
    })}
  </div>
)}

{/* =========================
    SUPPORTING DOCUMENTS
========================= */}
<div style={{ marginTop: 20 }}>
  <strong>Supporting Documents Submitted</strong>
  {docs.map((doc) => (
    <div key={doc.id} style={{ marginTop: 5 }}>
      {doc.document_type} – {doc.verified ? "Verified" : "Pending"}
    </div>
  ))}
</div>
{/* =========================
    DIRECTORS (IF COMPANY)
========================= */}
{business?.business_type === "Company" && (
  <div style={{ marginTop: 20 }}>
    <strong>Directors</strong>

    {(business.business_directors || []).map((d) => (
      <div key={d.id} style={{ marginTop: 5 }}>
        {d.director_name} – {d.director_id_number}
      </div>
    ))}
  </div>
)}

            {/* ACTION BUTTONS */}
            <div style={{ marginTop: 15 }}>
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
          </div>
        );
      })}
    </div>
  );
}