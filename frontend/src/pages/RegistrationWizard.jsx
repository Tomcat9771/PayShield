import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

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

  /* =========================
     REQUIRED DOCUMENTS
  ========================= */
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
     AUTO FILL AUTH EMAIL
  ========================= */
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

      /* =========================
         PREVENT DUPLICATE BUSINESS
      ========================= */
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        navigate("/pay-registration");
        return;
      }

      /* =========================
         CREATE BUSINESS
      ========================= */
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

      /* =========================
         CREATE REGISTRATION
      ========================= */
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

      /* =========================
         UPLOAD DOCUMENTS (PRIVATE BUCKET)
      ========================= */
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
          file_url: filePath, // STORE PATH ONLY (PRIVATE)
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
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h2>Business Registration</h2>

      {error && (
        <p style={{ color: "red", marginBottom: 20 }}>{error}</p>
      )}

      {/* =========================
         STEP 1 – BUSINESS TYPE
      ========================= */}
      {step === 1 && (
        <>
          <h3>Step A – Business Type</h3>

          <select
            value={form.business_type}
            onChange={(e) => handleChange("business_type", e.target.value)}
          >
            <option value="">Select Type</option>
            <option value="Sole Proprietor">Sole Proprietor</option>
            <option value="Company">Company</option>
          </select>

          <br /><br />

          <button
            disabled={!form.business_type}
            onClick={() => setStep(2)}
          >
            Next
          </button>
        </>
      )}

      {/* =========================
         STEP 2 – BUSINESS INFO
      ========================= */}
      {step === 2 && (
        <>
          <h3>Step B – Business Information</h3>

          <input
            placeholder="Business Name"
            value={form.business_name}
            onChange={e => handleChange("business_name", e.target.value)}
          />

          <input
            placeholder="Owner Name"
            value={form.owner_name}
            onChange={e => handleChange("owner_name", e.target.value)}
          />

          <input
            placeholder="Phone"
            value={form.phone}
            onChange={e => handleChange("phone", e.target.value)}
          />

          <input
            placeholder="Email"
            value={form.email}
            disabled
          />

          <input
            placeholder="Address"
            value={form.address}
            onChange={e => handleChange("address", e.target.value)}
          />

          {form.business_type === "Company" && (
            <input
              placeholder="Registration Number"
              value={form.registration_number}
              onChange={e => handleChange("registration_number", e.target.value)}
            />
          )}

          <br /><br />

          <button onClick={() => setStep(1)}>Back</button>
          <button
            disabled={!validateStep2()}
            onClick={() => setStep(3)}
          >
            Next
          </button>
        </>
      )}

      {/* =========================
         STEP 3 – DOCUMENT UPLOAD
      ========================= */}
      {step === 3 && (
        <>
          <h3>Step C – Upload Required Documents</h3>

          {requiredDocs[form.business_type]?.map(doc => (
            <div key={doc} style={{ marginBottom: 10 }}>
              <label>{doc}</label>
              <input
                type="file"
                onChange={e => handleFileChange(doc, e.target.files[0])}
              />
            </div>
          ))}

          <br />

          <button onClick={() => setStep(2)}>Back</button>
          <button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Registration"}
          </button>
        </>
      )}
    </div>
  );
}
