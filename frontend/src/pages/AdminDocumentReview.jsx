import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import GoldButton from "../components/GoldButton";

export default function AdminDocumentReview() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("business_registrations")
.select(`
  id,
  status,
  businesses (
    id,
    business_name,
    business_type,
    business_directors (
      id,
      director_name,
      director_id_number,
      id_file_url,
      verified
    )
  ),
  business_documents (
    id,
    document_type,
    file_url,
    verified,
    created_at
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

  /* =========================
     REQUIRED DOCUMENTS LOGIC
  ========================= */

  const requiredDocsMap = {
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

  /* =========================
     VIEW DOCUMENT
  ========================= */

  const viewDocument = async (filePath) => {
    try {
      const { data, error } = await supabase.storage
        .from("business-documents")
        .createSignedUrl(filePath, 60);

      if (error) {
        console.error("Signed URL error:", error);
        alert("Failed to open document.");
        return;
      }

      window.open(data.signedUrl, "_blank");

    } catch (err) {
      console.error(err);
      alert("Failed to open document.");
    }
  };

  /* =========================
     VERIFY DOCUMENT
  ========================= */

  const verifyDocument = async (docId) => {
    const { error } = await supabase
      .from("business_documents")
      .update({ verified: true })
      .eq("id", docId);

    if (error) {
      alert("Verification failed");
      return;
    }

    fetchData();
  };

  /* =========================
     REJECT DOCUMENT
  ========================= */

  const rejectDocument = async (docId) => {
    const { error } = await supabase
      .from("business_documents")
      .update({ verified: false })
      .eq("id", docId);

    if (error) {
      alert("Rejection failed");
      return;
    }

    fetchData();
  };

  if (loading) return <div style={{ padding: 40 }}>Loading documents...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h2>Admin – Document Review</h2>

      <GoldButton
        onClick={() => navigate("/admin/dashboard")}
        style={{ marginBottom: "25px" }}
      >
        ← Back to Dashboard
      </GoldButton>

      {registrations.map(reg => {

  const business = reg.businesses;
  const businessType = business?.business_type;

  const requiredDocs = requiredDocsMap[businessType] || [];
  const uploadedDocs = reg.business_documents || [];

  const verifiedTypes = uploadedDocs
    .filter(d => d.verified)
    .map(d => d.document_type);

  const verifiedRequiredCount = requiredDocs.filter(r =>
    verifiedTypes.includes(r)
  ).length;

  const allRequiredVerified =
    requiredDocs.length > 0 &&
    requiredDocs.every(r => verifiedTypes.includes(r));

  const directors = business?.business_directors || [];

  const allDirectorsVerified =
    businessType !== "Company" ||
    (directors.length > 0 &&
      directors.every(d => d.verified));

  return (
    <div
      key={reg.id}
      style={{
        border: "1px solid #ddd",
        marginBottom: 20,
        padding: 20,
        borderRadius: 8,
        background: "#fff"
      }}
    >
      <h3>{business?.business_name}</h3>
      <p><strong>Type:</strong> {businessType}</p>
      <p><strong>Status:</strong> {reg.status}</p>

      <p>
        <strong>Documents Verified:</strong>{" "}
        {verifiedRequiredCount} / {requiredDocs.length}
      </p>

      {!allRequiredVerified && (
        <p style={{ color: "#c0392b", fontSize: 13 }}>
          Missing required documents:{" "}
          {requiredDocs
            .filter(r => !verifiedTypes.includes(r))
            .join(", ")}
        </p>
      )}

      {/* =========================
          COMPANY DOCUMENTS
      ========================= */}
      {uploadedDocs.map(doc => (
        <div
          key={doc.id}
          style={{
            marginBottom: 15,
            padding: 15,
            background: "#f8f9fa",
            borderRadius: 6,
            border: "1px solid #eee"
          }}
        >
          <p><strong>{doc.document_type}</strong></p>

          <p>
            Verified:{" "}
            <span style={{ color: doc.verified ? "green" : "red" }}>
              {doc.verified ? "Yes" : "No"}
            </span>
          </p>

          <div style={{ marginTop: 10 }}>
            <GoldButton onClick={() => viewDocument(doc.file_url)}>
              View
            </GoldButton>

            {!doc.verified && (
              <GoldButton
                style={{ marginLeft: 10 }}
                onClick={() => verifyDocument(doc.id)}
              >
                Verify
              </GoldButton>
            )}

            {doc.verified && (
              <GoldButton
                style={{
                  marginLeft: 10,
                  backgroundColor: "#c0392b",
                  color: "white"
                }}
                onClick={() => rejectDocument(doc.id)}
              >
                Reject
              </GoldButton>
            )}
          </div>
        </div>
      ))}

      {/* =========================
          DIRECTOR ID DOCUMENTS
      ========================= */}
      {businessType === "Company" && directors.length > 0 && (
        <div style={{ marginTop: 25 }}>
          <h4>Director ID Documents</h4>

          {directors.map(director => (
            <div
              key={director.id}
              style={{
                marginBottom: 15,
                padding: 15,
                background: "#f1f3f5",
                borderRadius: 6,
                border: "1px solid #ddd"
              }}
            >
              <p><strong>{director.director_name}</strong></p>
              <p>ID Number: {director.director_id_number}</p>

              <p>
                Verified:{" "}
                <span style={{ color: director.verified ? "green" : "red" }}>
                  {director.verified ? "Yes" : "No"}
                </span>
              </p>

              <div style={{ marginTop: 10 }}>
                <GoldButton
                  onClick={() => viewDocument(director.id_file_url)}
                >
                  View ID
                </GoldButton>

                {!director.verified && (
                  <GoldButton
                    style={{ marginLeft: 10 }}
                    onClick={async () => {
                      await supabase
                        .from("business_directors")
                        .update({
                          verified: true,
                          verified_at: new Date()
                        })
                        .eq("id", director.id);

                      fetchData();
                    }}
                  >
                    Verify
                  </GoldButton>
                )}

                {director.verified && (
                  <GoldButton
                    style={{
                      marginLeft: 10,
                      backgroundColor: "#c0392b",
                      color: "white"
                    }}
                    onClick={async () => {
                      await supabase
                        .from("business_directors")
                        .update({ verified: false })
                        .eq("id", director.id);

                      fetchData();
                    }}
                  >
                    Reject
                  </GoldButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DIRECTOR COMPLIANCE WARNING */}
      {businessType === "Company" && !allDirectorsVerified && (
        <p style={{ color: "#c0392b", marginTop: 10 }}>
          All directors must be verified before approval.
        </p>
      )}
    </div>
  );
})}
    </div>
  );
}