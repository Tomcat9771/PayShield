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
          business_type
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
      setRegistrations(data);
    }

    setLoading(false);
  };

  /* =========================
     VIEW DOCUMENT (BACKEND SIGNED URL)
  ========================= */
  const viewDocument = async (docId) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session.access_token;

      const res = await fetch(
        `http://localhost:4000/api/admin/documents/${docId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        alert("Unable to generate secure link.");
      }

    } catch (err) {
      console.error(err);
      alert("Failed to open document.");
    }
  };

  /* =========================
     VERIFY / UNVERIFY DOC
  ========================= */
  const toggleVerify = async (docId, currentStatus) => {
    const { error } = await supabase
      .from("business_documents")
      .update({ verified: !currentStatus })
      .eq("id", docId);

    if (!error) {
      fetchData();
    }
  };

  if (loading) return <div>Loading documents...</div>;

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

        const totalDocs = reg.business_documents?.length || 0;
        const verifiedDocs = reg.business_documents?.filter(d => d.verified).length || 0;

        return (
          <div
            key={reg.id}
            style={{
              border: "1px solid #ccc",
              marginBottom: 20,
              padding: 20,
              borderRadius: 6
            }}
          >
            <h3>{reg.businesses?.business_name}</h3>
            <p><strong>Type:</strong> {reg.businesses?.business_type}</p>
            <p><strong>Status:</strong> {reg.status}</p>

            <p>
              <strong>Documents Verified:</strong>{" "}
              {verifiedDocs} / {totalDocs}
            </p>

            {reg.business_documents?.map(doc => (
              <div
                key={doc.id}
                style={{
                  marginBottom: 10,
                  padding: 10,
                  background: "#f8f8f8",
                  borderRadius: 4
                }}
              >
                <p>
                  <strong>{doc.document_type}</strong>
                </p>

                <p>
                  Verified:{" "}
                  <span style={{ color: doc.verified ? "green" : "red" }}>
                    {doc.verified ? "Yes" : "No"}
                  </span>
                </p>

                <button onClick={() => viewDocument(doc.id)}>
                  View
                </button>

                <button
                  style={{ marginLeft: 10 }}
                  onClick={() => toggleVerify(doc.id, doc.verified)}
                >
                  {doc.verified ? "Unverify" : "Verify"}
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
