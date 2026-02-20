import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    const { data, error } = await supabase
      .from("business_registrations")
      .select(`
        id,
        status,
        created_at,
        businesses (
          id,
          business_name,
          business_type,
          registration_fee_paid
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

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from("business_registrations")
      .update({ status })
      .eq("id", id);

    if (!error) {
      fetchRegistrations();
    }
  };

  if (loading) return <div>Loading registrations...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h2>Admin – Business Registrations</h2>

      {registrations.map((reg) => {
        const business = reg.businesses;
        const docs = reg.business_documents || [];

        const requiredDocs = {
          Company: [
            "cipc",
            "proof_of_address",
            "proof_of_bank",
            "director_ids",
            "appointment_letter"
          ],
          "Sole Proprietor": [
            "id",
            "proof_of_address",
            "proof_of_bank"
          ]
        };

        const required = requiredDocs[business?.business_type] || [];

        const verifiedDocs = docs
          .filter(d => d.verified)
          .map(d => d.document_type);

        const allDocsVerified =
          required.length > 0 &&
          required.every(r => verifiedDocs.includes(r));

        const canApprove =
          reg.status === "pending" &&
          business?.registration_fee_paid &&
          allDocsVerified;

        return (
          <div
            key={reg.id}
            style={{
              border: "1px solid #ddd",
              padding: "15px",
              marginBottom: "10px",
              borderRadius: "6px"
            }}
          >
            <p><strong>Business:</strong> {business?.business_name}</p>
            <p><strong>Status:</strong> {reg.status}</p>
            <p>
              <strong>Fee Paid:</strong>{" "}
              {business?.registration_fee_paid ? "Yes" : "No"}
            </p>
            <p>
              <strong>Documents Verified:</strong>{" "}
              {verifiedDocs.length} / {required.length}
            </p>

            {canApprove ? (
              <button onClick={() => updateStatus(reg.id, "approved")}>
                Approve
              </button>
            ) : (
              <button disabled style={{ background: "#ccc" }}>
                Approval Requirements Not Met
              </button>
            )}

            {reg.status === "pending" && (
              <button
                style={{ marginLeft: 10, background: "red", color: "white" }}
                onClick={() => updateStatus(reg.id, "rejected")}
              >
                Reject
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
