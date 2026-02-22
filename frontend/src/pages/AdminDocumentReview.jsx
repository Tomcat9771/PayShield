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
      setRegistrations(data || []);
    }

    setLoading(false);
  };

  /* =========================
     VIEW DOCUMENT (BACKEND)
  ========================= */
  const viewDocument = async (filePath) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/documents/get-signed-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ filePath })
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
     VERIFY DOCUMENT (BACKEND)
  ========================= */
  const verifyDocument = async (docId) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/documents/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ documentId: docId })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Verification failed");
        return;
      }

      fetchData();

    } catch (err) {
      console.error(err);
      alert("Verification failed");
    }
  };

  /* =========================
     REJECT DOCUMENT (OPTIONAL)
  ========================= */
  const rejectDocument = async (docId) => {
    const reason = prompt("Reason for rejecting document (optional):");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/documents/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            documentId: docId,
            reason
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Rejection failed");
        return;
      }

      fetchData();

    } catch (err) {
      console.error(err);
      alert("Rejection failed");
    }
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

        const totalDocs = reg.business_documents?.length || 0;
        const verifiedDocs = reg.business_documents?.filter(d => d.verified).length || 0;

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
                  marginBottom: 15,
                  padding: 15,
                  background: "#f8f9fa",
                  borderRadius: 6,
                  border: "1px solid #eee"
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

                <div style={{ marginTop: 10 }}>
                  <GoldButton
                    onClick={() => viewDocument(doc.file_url)}
                  >
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
          </div>
        );
      })}
    </div>
  );
}