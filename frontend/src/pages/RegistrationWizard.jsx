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
     LOAD EXISTING IF REJECTED
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

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async () => {
    if (!validateDocuments()) {
      setError("Please upload required documents.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error("User not authenticated");

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
          .update(form)
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

        const filePath = `${Date.now()}-${docType}`;

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
    <div style={layout.page}>
      <div style={layout.card}>
        <h2 style={typography.heading}>
          {isEditMode ? "Edit & Resubmit Business" : "Create Business"}
        </h2>

        {error && (
          <div style={{ color: "red", marginBottom: 15 }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Business Name"
          value={form.business_name}
          onChange={(e) => handleChange("business_name", e.target.value)}
        />

        <input
          type="text"
          placeholder="Owner Name"
          value={form.owner_name}
          onChange={(e) => handleChange("owner_name", e.target.value)}
        />

        <input
          type="text"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
        />

        <input
          type="text"
          placeholder="Email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />

        <GoldButton onClick={handleSubmit} disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </GoldButton>
      </div>
    </div>
  );
}