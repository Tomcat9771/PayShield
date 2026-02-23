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
  const [directorCount, setDirectorCount] = useState(0);
  const [directors, setDirectors] = useState([]);
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

  // LOAD EXISTING DIRECTORS
  if (business.business_type === "Company") {
    const { data: existingDirectors } = await supabase
      .from("business_directors")
      .select("*")
      .eq("business_id", business.id);

    if (existingDirectors && existingDirectors.length > 0) {
      setDirectorCount(existingDirectors.length);

setDirectors(
  existingDirectors.map(d => ({
    director_name: d.director_name,
    director_id_number: d.director_id_number,
    id_file: null,
    existing_file_url: d.id_file_url,

    // 👇 store originals for comparison
    original_name: d.director_name,
    original_id_number: d.director_id_number
  }))
);
      }
    }
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
const handleDirectorCountChange = (value) => {
  const count = parseInt(value) || 0;
  setDirectorCount(count);

  const newDirectors = Array.from({ length: count }, (_, index) => ({
    director_name: directors[index]?.director_name || "",
    director_id_number: directors[index]?.director_id_number || "",
    id_file: null
  }));

  setDirectors(newDirectors);
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
if (form.business_type === "Company") {
  if (directorCount < 1) {
    return "Please specify number of directors.";
  }

  for (let i = 0; i < directors.length; i++) {
    const d = directors[i];
    const nameChanged = d.director_name !== d.original_name;
const idChanged = d.director_id_number !== d.original_id_number;

if (!d.director_name || !d.director_id_number) {
  return `Please complete all fields for Director ${i + 1}.`;
}

// If changed but no new file uploaded
if ((nameChanged || idChanged) && !d.id_file) {
  return `Please upload a new ID document for Director ${i + 1} because details were changed.`;
}

// If new director (no existing file)
if (!d.existing_file_url && !d.id_file) {
  return `Please upload ID document for Director ${i + 1}.`;
} 
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
// 1️⃣ Get current business (OLD)
const { data: oldBusiness, error: oldError } = await supabase
  .from("businesses")
  .select("*")
  .eq("id", currentBusinessId)
  .single();

if (oldError) throw oldError;

// 2️⃣ Prepare NEW data (what will be saved)
const newBusinessData = {
  ...oldBusiness,
  ...form,
  email: user.email
};

// 3️⃣ Only log if something actually changed
const hasChanges = Object.keys(newBusinessData).some(
  key => JSON.stringify(oldBusiness[key]) !== JSON.stringify(newBusinessData[key])
);

if (hasChanges) {
  const { error: historyError } = await supabase
    .from("business_history")
    .insert({
      business_id: currentBusinessId,
      old_data: oldBusiness,
      new_data: newBusinessData,
      changed_by: user.id
    });

  if (historyError) throw historyError;
}
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
/* =========================
   INSERT DIRECTORS
========================= */
if (form.business_type === "Company") {

  // Only delete existing directors in edit mode
  if (isEditMode) {
    const { error: deleteError } = await supabase
      .from("business_directors")
      .delete()
      .eq("business_id", currentBusinessId);

    if (deleteError) throw deleteError;
  }

  for (const director of directors) {
    let filePath = director.existing_file_url || null;

    // Upload new ID file if provided
    if (director.id_file) {
      filePath = `${currentBusinessId}/directors/${Date.now()}-${director.director_id_number}`;

      const { error: uploadError } = await supabase.storage
        .from("business-documents")
        .upload(filePath, director.id_file);

      if (uploadError) throw uploadError;
    }

    const { error: insertError } = await supabase
      .from("business_directors")
      .insert({
        business_id: currentBusinessId,
        director_name: director.director_name,
        director_id_number: director.director_id_number,
        id_file_url: filePath,
        verified: false,        // 👈 NEW
        verified_at: null       // 👈 OPTIONAL but clean
      });

    if (insertError) throw insertError;
  }
}
 navigate("/dashboard");

    } catch (err) {
      console.error(err);
      setErrorBottom("Something went wrong. Please try again.");
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
{form.business_type === "Company" && (
  <div style={{ marginTop: "30px" }}>
    <h4 style={{ color: "#FFD700" }}>
      Directors *
    </h4>

    <div style={{ marginBottom: "20px" }}>
      <label style={{ color: "white" }}>
        Number of Directors
      </label>
      <input
        type="number"
        min="1"
        value={directorCount}
        onChange={(e) =>
          handleDirectorCountChange(e.target.value)
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

    {directors.map((director, index) => (
      <div
        key={index}
        style={{
          background: "rgba(255,255,255,0.05)",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "20px"
        }}
      >
        <h5 style={{ color: "#FFD700" }}>
          Director {index + 1}
        </h5>

        <input
          placeholder="Director Name"
          value={director.director_name}
          onChange={(e) => {
  const updated = directors.map((d, i) =>
    i === index
      ? { ...d, director_name: e.target.value }
      : d
  );
  setDirectors(updated);
}}

          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            marginBottom: "10px"
          }}
        />

        <input
          placeholder="Director ID Number"
          value={director.director_id_number}
          onChange={(e) => {
  const updated = directors.map((d, i) =>
    i === index
      ? { ...d, director_id_number: e.target.value }
      : d
  );
  setDirectors(updated);
}}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            marginBottom: "10px"
          }}
        />

        <input
          type="file"
          onChange={(e) => {
  const updated = directors.map((d, i) =>
    i === index
      ? { ...d, id_file: e.target.files[0] }
      : d
  );
  setDirectors(updated);
}}
        />
      </div>
    ))}
  </div>
)}

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