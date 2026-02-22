import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import GoldButton from "../components/GoldButton";
import { layout, typography } from "../theme";

export default function RegistrationWizard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errorTop, setErrorTop] = useState(null);
const [errorBottom, setErrorBottom] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [form, setForm] = useState({
  business_type: "",
  business_name: "",
  owner_name: "",
  phone: "",
  email: "",

  street_address: "",
  town: "",
  city: "",
  postal_code: "",

  postal_same: true,
  postal_street: "",
  postal_town: "",
  postal_city: "",
  postal_postal_code: "",

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
          street_address: business.street_address || "",
town: business.town || "",
city: business.city || "",
postal_code: business.postal_code || "",
postal_street: business.postal_street || "",
postal_town: business.postal_town || "",
postal_city: business.postal_city || "",
postal_postal_code: business.postal_postal_code || "",
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

  const validateForm = () => {
  if (
    !form.business_type ||
    !form.business_name ||
    !form.owner_name ||
    !form.phone ||
    !form.street_address ||
    !form.town ||
    !form.city ||
    !form.postal_code ||
    !form.registration_number
  ) {
    return "Please complete all required fields.";
  }

  if (!form.postal_same) {
    if (
      !form.postal_street ||
      !form.postal_town ||
      !form.postal_city ||
      !form.postal_postal_code
    ) {
      return "Please complete all postal address fields.";
    }
  }

  const required = requiredDocs[form.business_type] || [];
  const missingDocs = required.some(doc => !documents[doc] && !isEditMode);

  if (missingDocs) {
    return "Please upload all required documents.";
  }

  return null;
};

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async () => {
    const validationError = validateForm();
if (validationError) {
  setErrorBottom(validationError);
  return;
}

setErrorBottom(null);

    setLoading(true);
    setErrorBottom(null);

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
  business_type: form.business_type,
  business_name: form.business_name,
  owner_name: form.owner_name,
  phone: form.phone,
  email: user.email,

  street_address: form.street_address,
  town: form.town,
  city: form.city,
  postal_code: form.postal_code,

  postal_street: form.postal_same ? form.street_address : form.postal_street,
  postal_town: form.postal_same ? form.town : form.postal_town,
  postal_city: form.postal_same ? form.city : form.postal_city,
  postal_postal_code: form.postal_same ? form.postal_code : form.postal_postal_code,

  registration_number: form.registration_number,

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

    } 
catch (err) {
  console.error(err);
  setErrorBottom("Something went wrong. Please try again.");
} 
    finally {
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

      {/* Business Type */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ color: "white" }}>
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

      {/* BASIC FIELDS */}
      {[
        ["Business Name", "business_name"],
        ["Owner Name", "owner_name"],
        ["Phone", "phone"],
        ["Registration Number", "registration_number"]
      ].map(([label, field]) => (
        <div key={field} style={{ marginBottom: "20px" }}>
          <label style={{ color: "white" }}>
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

      {/* STREET ADDRESS */}
      <h4 style={{ color: "#FFD700", marginTop: "20px" }}>
        Street Address *
      </h4>

      {["street_address","town","city","postal_code"].map(field => (
        <div key={field} style={{ marginBottom: "15px" }}>
          <input
            placeholder={field.replace(/_/g," ")}
            value={form[field]}
            onChange={(e)=>handleChange(field,e.target.value)}
            style={{
              width:"100%",
              padding:"12px",
              borderRadius:"8px",
              border:"none"
            }}
          />
        </div>
      ))}

      <label style={{ color:"white", marginTop:"10px", display:"block" }}>
        <input
          type="checkbox"
          checked={form.postal_same}
          onChange={(e)=>handleChange("postal_same",e.target.checked)}
        />
        &nbsp;Postal address same as street
      </label>

      {!form.postal_same && (
        <>
          <h4 style={{ color: "#FFD700", marginTop: "20px" }}>
            Postal Address *
          </h4>

          {["postal_street","postal_town","postal_city","postal_postal_code"].map(field => (
            <div key={field} style={{ marginBottom: "15px" }}>
              <input
                placeholder={field.replace(/_/g," ")}
                value={form[field]}
                onChange={(e)=>handleChange(field,e.target.value)}
                style={{
                  width:"100%",
                  padding:"12px",
                  borderRadius:"8px",
                  border:"none"
                }}
              />
            </div>
          ))}
        </>
      )}

      {/* VERIFIED EMAIL */}
      <div style={{ marginBottom: "25px" }}>
        <label style={{ color: "white" }}>
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
            cursor: "not-allowed"
          }}
        />
      </div>

      {/* DOCUMENTS */}
      {form.business_type &&
        requiredDocs[form.business_type]?.length > 0 && (
          <div style={{ marginTop: "30px" }}>
            <h4 style={{ color: "#FFD700" }}>
              Required Documents
            </h4>

            {requiredDocs[form.business_type].map(doc => (
              <div key={doc} style={{ marginBottom: "18px" }}>
                <label style={{ color: "white" }}>
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
                />
              </div>
            ))}
          </div>
        )}

      {/* BOTTOM ERROR */}
      {errorBottom && (
        <div
          style={{
            color: "#ff4d4d",
            marginBottom: "15px",
            textAlign: "center"
          }}
        >
          {errorBottom}
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