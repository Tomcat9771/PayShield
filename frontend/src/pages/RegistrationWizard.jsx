import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import GoldButton from "../components/GoldButton";
import { layout, typography } from "../theme";

export default function RegistrationWizard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [form, setForm] = useState({
    business_type: "",
    business_name: "",
    owner_name: "",
    phone: "",
    email: "",
    address: "",
    registration_number: "",
  });

  const [documents, setDocuments] = useState({});

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

  /* =========================
     LOAD USER + EXISTING DATA
  ========================= */
  useEffect(() => {
    const loadData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      setForm(prev => ({
        ...prev,
        email: user.email
      }));

      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!business) return;

      const { data: registration } = await supabase
        .from("business_registrations")
        .select("*")
        .eq("business_id", business.id)
        .maybeSingle();

      if (registration?.status === "rejected") {
        setIsEditMode(true);
        setForm({
          business_type: business.business_type || "",
          business_name: business.business_name || "",
          owner_name: business.owner_name || "",
          phone: business.phone || "",
          email: user.email,
          address: business.address || "",
          registration_number: business.registration_number || "",
        });
      }
    };

    loadData();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type, file) => {
    setDocuments(prev => ({ ...prev, [type]: file }));
  };

  const validateDocuments = () => {
    const required = requiredDocs[form.business_type] || [];
    return required.every(doc => documents[doc] || isEditMode);
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async () => {
    if (!validateDocuments()) {
      setError("Please upload all required documents.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error("Not authenticated");

      let currentBusinessId;
      let currentRegistrationId;

      if (isEditMode) {
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        const { data: registration } = await supabase
          .from("business_registrations")
          .select("id")
          .eq("business_id", business.id)
          .single();

        currentBusinessId = business.id;
        currentRegistrationId = registration.id;

        await supabase
          .from("businesses")
          .update({
            ...form,
            email: user.email
          })
          .eq("id", currentBusinessId);

        await supabase
          .from("business_registrations")
          .update({
            status: "pending",
            rejection_reason: null
          })
          .eq("id", currentRegistrationId);

      } else {
        const { data: newBusiness } = await supabase
          .from("businesses")
          .insert({
            ...form,
            email: user.email,
            user_id: user.id,
            registration_fee_paid: false
          })
          .select()
          .single();

        const { data: newReg } = await supabase
          .from("business_registrations")
          .insert({
            business_id: newBusiness.id,
            status: "pending"
          })
          .select()
          .single();

        currentBusinessId = newBusiness.id;
        currentRegistrationId = newReg.id;
      }

      for (const [docType, file] of Object.entries(documents)) {
        if (!file) continue;

        const filePath = `${currentBusinessId}/${Date.now()}-${docType}`;

        await supabase.storage
          .from("business-documents")
          .upload(filePath, file);

        await supabase
          .from("business_documents")
          .insert({
            business_id: currentBusinessId,
            registration_id: currentRegistrationId,
            document_type: docType,
            file_url: filePath,
            verified: false
          });
      }

      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div
      style={{
        ...layout.page,
        display: "flex",
        justifyContent: "center",
        paddingTop: "60px",
        paddingBottom: "60px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          backgroundColor: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(8px)",
          borderRadius: "18px",
          padding: "40px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.35)"
        }}
      >
        <h2
          style={{
            ...typography.heading,
            textAlign: "center",
            marginBottom: "35px"
          }}
        >
          {isEditMode
            ? "Edit & Resubmit Business"
            : "Register Your Business"}
        </h2>

        {error && (
          <div
            style={{
              backgroundColor: "#ffe6e6",
              color: "#c0392b",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              textAlign: "center"
            }}
          >
            {error}
          </div>
        )}

        {/* Business Type */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "white", fontSize: "14px" }}>
            Business Type
          </label>
          <select
            value={form.business_type}
            onChange={(e) =>
              handleChange("business_type", e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              marginTop: "6px"
            }}
          >
            <option value="">Select Business Type</option>
            <option value="Company">Company</option>
            <option value="Sole Proprietor">Sole Proprietor</option>
          </select>
        </div>

        {[
          ["Business Name", "business_name"],
          ["Owner Name", "owner_name"],
          ["Phone", "phone"],
          ["Address", "address"],
          ["Registration Number", "registration_number"]
        ].map(([label, field]) => (
          <div key={field} style={{ marginBottom: "20px" }}>
            <label style={{ color: "white", fontSize: "14px" }}>
              {label}
            </label>
            <input
              value={form[field]}
              onChange={(e) =>
                handleChange(field, e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                marginTop: "6px"
              }}
            />
          </div>
        ))}

        {/* Locked Email */}
        <div style={{ marginBottom: "25px" }}>
          <label style={{ color: "white", fontSize: "14px" }}>
            Verified Email
          </label>
          <input
            type="email"
            value={form.email}
            readOnly
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              marginTop: "6px",
              backgroundColor: "#e9ecef",
              cursor: "not-allowed",
              fontWeight: "bold"
            }}
          />
        </div>

        {/* Documents */}
        {form.business_type &&
          requiredDocs[form.business_type]?.length > 0 && (
            <div style={{ marginTop: "30px" }}>
              <h4
                style={{
                  color: "#FFD700",
                  marginBottom: "15px"
                }}
              >
                Required Documents
              </h4>

              {requiredDocs[form.business_type].map(doc => (
                <div key={doc} style={{ marginBottom: "18px" }}>
                  <label style={{ color: "white", fontSize: "14px" }}>
                    {doc.replace(/_/g, " ")}
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      handleFileChange(
                        doc,
                        e.target.files[0]
                      )
                    }
                    style={{
                      display: "block",
                      marginTop: "6px",
                      color: "white"
                    }}
                  />
                </div>
              ))}
            </div>
          )}

        <div style={{ marginTop: "35px", textAlign: "center" }}>
          <GoldButton
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </GoldButton>
        </div>
      </div>
    </div>
  );
}