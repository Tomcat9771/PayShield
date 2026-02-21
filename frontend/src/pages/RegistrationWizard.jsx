import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import GoldButton from "../components/GoldButton";
import { layout, components, typography, colors } from "../theme";

export default function RegistrationWizard() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [businessId, setBusinessId] = useState(null);
  const [registrationId, setRegistrationId] = useState(null);

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
     LOAD EXISTING BUSINESS IF REJECTED
  ========================= */
  useEffect(() => {
    const loadExisting = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

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
        setBusinessId(business.id);
        setRegistrationId(registration.id);

        setForm({
          business_type: business.business_type || "",
          business_name: business.business_name || "",
          owner_name: business.owner_name || "",
          phone: business.phone || "",
          email: business.email || "",
          address: business.address || "",
          registration_number: business.registration_number || "",
        });
      }
    };

    loadExisting();
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

const handleSubmit = async () => {
  if (!validateDocuments()) {
    setError("Please upload required documents.");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    let currentBusinessId;
    let currentRegistrationId;

    if (isEditMode) {
      /* =========================
         FETCH CURRENT IDS
      ========================= */
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

      /* =========================
         UPDATE BUSINESS
      ========================= */
      await supabase
        .from("businesses")
        .update(form)
        .eq("id", currentBusinessId);

      /* =========================
         RESET REGISTRATION STATUS
      ========================= */
      await supabase
        .from("business_registrations")
        .update({
          status: "pending",
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by: null
        })
        .eq("id", currentRegistrationId);

    } else {
      /* =========================
         CREATE NEW BUSINESS
      ========================= */
      const { data: newBusiness } = await supabase
        .from("businesses")
        .insert({
          ...form,
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

    /* =========================
       UPLOAD DOCUMENTS
    ========================= */
    for (const [docType, file] of Object.entries(documents)) {
      if (!file) continue;

      const filePath = `${currentBusinessId}/${docType}-${Date.now()}`;

      await supabase.storage
        .from("business-documents")
        .upload(filePath, file);

      await supabase.from("business_documents").insert({
        business_id: currentBusinessId,
        registration_id: currentRegistrationId,
        document_type: docType,
        file_url: filePath,
        verified: false
      });
    }

    navigate("/awaiting-approval");

  } catch (err) {
    console.error(err);
    setError("Something went wrong.");
  }

  setLoading(false);
};

  return (
    <div style={layout.contentWrapper}>
      <h2 style={typography.heading}>
        {isEditMode ? "Edit & Resubmit Registration" : "Business Registration"}
      </h2>

      {error && <p style={{ color: colors.danger }}>{error}</p>}

      <div style={{ ...components.card, marginTop: 20 }}>
        <select
          value={form.business_type}
          onChange={(e) => handleChange("business_type", e.target.value)}
          style={components.input}
        >
          <option value="">Select Type</option>
          <option value="Sole Proprietor">Sole Proprietor</option>
          <option value="Company">Company</option>
        </select>

        {Object.keys(form)
          .filter(f => f !== "business_type")
          .map(field => (
            <input
              key={field}
              placeholder={field.replace("_", " ")}
              value={form[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              style={components.input}
            />
          ))}

        {requiredDocs[form.business_type]?.map(doc => (
          <div key={doc} style={{ marginBottom: 10 }}>
            <label>{doc}</label>
            <input
              type="file"
              onChange={(e) => handleFileChange(doc, e.target.files[0])}
            />
          </div>
        ))}

        <GoldButton onClick={handleSubmit} disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </GoldButton>
      </div>
    </div>
  );
}
