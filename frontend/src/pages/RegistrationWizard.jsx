import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { layout, components, typography, colors } from "../theme";
import GoldButton from "../components/GoldButton";

export default function RegistrationWizard() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setForm(prev => ({
          ...prev,
          email: data.user.email
        }));
      }
    };
    loadUser();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type, file) => {
    setDocuments(prev => ({ ...prev, [type]: file }));
  };

  const validateStep2 = () => {
    if (
      !form.business_name ||
      !form.owner_name ||
      !form.phone ||
      !form.email ||
      !form.address
    ) return false;

    if (form.business_type === "Company" && !form.registration_number)
      return false;

    return true;
  };

  const validateDocuments = () => {
    const required = requiredDocs[form.business_type] || [];
    return required.every(doc => documents[doc]);
  };

  const handleSubmit = async () => {
    if (!validateDocuments()) {
      setError("Please upload all required documents.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("User not authenticated");

      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        navigate("/pay-registration");
        return;
      }

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .insert({
          ...form,
          user_id: user.id,
          registration_fee_paid: false
        })
        .select()
        .single();

      if (businessError) throw businessError;

      const { data: registration, error: regError } = await supabase
        .from("business_registrations")
        .insert({
          business_id: business.id,
          state: "submitted",
          status: "pending"
        })
        .select()
        .single();

      if (regError) throw regError;

      for (const [docType, file] of Object.entries(documents)) {
        const filePath = `${business.id}/${docType}-${Date.now()}`;

        const { error: uploadError } = await supabase.storage
          .from("business-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        await supabase.from("business_documents").insert({
          business_id: business.id,
          registration_id: registration.id,
          document_type: docType,
          file_url: filePath,
          verified: false
        });
      }

      navigate("/pay-registration");

    } catch (err) {
      console.error(err);
      setError("Registration failed. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div style={layout.contentWrapper}>
      <h2 style={typography.heading}>Business Registration</h2>

      <div
        style={{
          width: "80px",
          height: "3px",
          background: "linear-gradient(to right, #F1C50E, transparent)",
          marginBottom: "30px",
        }}
      />

      {error && (
        <p style={{ color: colors.danger, marginBottom: 20 }}>{error}</p>
      )}

      {step === 1 && (
        <>
          <h3 style={typography.subHeading}>Step A – Business Type</h3>

          <select
            value={form.business_type}
            onChange={(e) => handleChange("business_type", e.target.value)}
            style={components.input}
          >
            <option value="">Select Type</option>
            <option value="Sole Proprietor">Sole Proprietor</option>
            <option value="Company">Company</option>
          </select>

          <GoldButton
            disabled={!form.business_type}
            onClick={() => setStep(2)}
          >
            Next
          </GoldButton>
        </>
      )}

      {step === 2 && (
        <>
          <h3 style={typography.subHeading}>Step B – Business Information</h3>

          {["business_name", "owner_name", "phone", "address"].map(field => (
            <input
              key={field}
              placeholder={field.replace("_", " ")}
              value={form[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              style={components.input}
            />
          ))}

          {form.business_type === "Company" && (
            <input
              placeholder="Registration Number"
              value={form.registration_number}
              onChange={(e) =>
                handleChange("registration_number", e.target.value)
              }
              style={components.input}
            />
          )}

          <div style={{ marginTop: 20, display: "flex", gap: "15px" }}>
            <GoldButton onClick={() => setStep(1)}>Back</GoldButton>

            <GoldButton
              disabled={!validateStep2()}
              onClick={() => setStep(3)}
            >
              Next
            </GoldButton>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h3 style={typography.subHeading}>
            Step C – Upload Required Documents
          </h3>

          {requiredDocs[form.business_type]?.map(doc => (
            <div key={doc} style={{ marginBottom: 15 }}>
              <label style={{ color: colors.white }}>{doc}</label>
              <input
                type="file"
                onChange={(e) =>
                  handleFileChange(doc, e.target.files[0])
                }
              />
            </div>
          ))}

          <div style={{ marginTop: 20, display: "flex", gap: "15px" }}>
            <GoldButton onClick={() => setStep(2)}>
              Back
            </GoldButton>

            <GoldButton
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Registration"}
            </GoldButton>
          </div>
        </>
      )}
    </div>
  );
}

