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
        business_type,
        registration_fee_paid,
        operational_status,
        email,
        phone,
        registration_number,
        street_address,
        town,
        city,
        postal_code,
        postal_street,
        postal_town,
        postal_city,
        postal_postal_code,

        business_directors (
          id,
          director_name,
          director_id_number,
          id_file_url,
          verified,
          verified_at
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
        file_url,
        verified,
        created_at
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
  } else {
    console.error("Fetch error:", error);
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
      const business = reg.businesses || {};
      const docs = reg.business_documents || [];

      const requiredDocs = {
        Company: [
          "cipc",
          "proof_of_address",
          "proof_of_bank",
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

      const allDirectorsVerified =
        business?.business_type !== "Company" ||
        (
          business.business_directors?.length > 0 &&
          business.business_directors.every(d => d.verified)
        );

      const canApprove =
        reg.status === "pending" &&
        allDocsVerified &&
        allDirectorsVerified;

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
{/* ================= BUSINESS DETAILS ================= */}

<p><strong>Business Type:</strong> {business?.business_type}</p>

<p><strong>Registration Number:</strong> {business?.registration_number || "N/A"}</p>

<p><strong>Email:</strong> {business?.email}</p>

<p><strong>Phone:</strong> {business?.phone}</p>

<hr style={{ margin: "15px 0" }} />

<p><strong>Physical Address:</strong></p>
<p>
  {business?.street_address}<br />
  {business?.town}<br />
  {business?.city}<br />
  {business?.postal_code}
</p>

<p><strong>Postal Address:</strong></p>
<p>
  {business?.postal_street}<br />
  {business?.postal_town}<br />
  {business?.postal_city}<br />
  {business?.postal_postal_code}
</p>

{/* ================= DIRECTORS ================= */}

{business?.business_type === "Company" && (
  <>
    <hr style={{ margin: "15px 0" }} />
    <h4>Directors</h4>

    {business.business_directors?.map((director) => (
      <div
        key={director.id}
        style={{
          border: "1px solid #eee",
          padding: "10px",
          marginBottom: "10px",
          borderRadius: "6px",
          background: "#fafafa"
        }}
      >
        <p><strong>Name:</strong> {director.director_name}</p>
        <p><strong>ID:</strong> {director.director_id_number}</p>
        <p>
          <strong>Verified:</strong>{" "}
          {director.verified ? "Yes" : "No"}
        </p>
      </div>
    ))}
  </>
)}
  
{/* ================= DOCUMENTS ================= */}

<hr style={{ margin: "15px 0" }} />
<h4>Documents</h4>

{docs.map((doc) => (
  <div key={doc.id} style={{ marginBottom: "8px" }}>
    <p>
      <strong>{doc.document_type}</strong> —{" "}
      {doc.verified ? "Verified" : "Pending"}
    </p>
  </div>
))}

        <p>
            <strong>Registration Created:</strong>{" "}
            {new Date(reg.created_at).toLocaleString()}
          </p>

          <p>
            <strong>Status:</strong> {reg.status}
          </p>

          <p>
            <strong>Operational Status:</strong>{" "}
            {business?.operational_status}
          </p>

          <p>
            <strong>Fee Paid:</strong>{" "}
            {business?.registration_fee_paid ? "Yes" : "No"}
          </p>

          <p>
            <strong>Documents Verified:</strong>{" "}
            {verifiedDocs.length} / {required.length}
          </p>

          {/* ACTION BUTTONS */}
          <div style={{ marginTop: 15 }}>

            {/* Pending */}
            {reg.status === "pending" && (
              <>
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
              </>
            )}

            {/* Approved – Awaiting Payment */}
            {reg.status === "approved" &&
              !business.registration_fee_paid && (
                <GoldButton
                  disabled
                  style={{
                    backgroundColor: "#f39c12",
                    color: "white",
                  }}
                >
                  Awaiting Registration Payment
                </GoldButton>
              )}

            {/* Active */}
            {business.operational_status === "active" && (
              <GoldButton
                disabled
                style={{
                  backgroundColor: "#27ae60",
                  color: "white",
                }}
              >
                Business Active
              </GoldButton>
            )}

            {/* Rejected */}
            {reg.status === "rejected" && (
              <GoldButton
                disabled
                style={{
                  backgroundColor: "#7f8c8d",
                  color: "white",
                }}
              >
                Registration Rejected
              </GoldButton>
            )}

          </div>
        </div>
      );
    })}
  </div>
  );
}