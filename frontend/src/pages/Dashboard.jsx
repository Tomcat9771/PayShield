import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { layout, typography } from "../theme";
import { QRCodeCanvas } from "qrcode.react";

export default function Dashboard() {
const navigate = useNavigate();
const [loading, setLoading] = useState(true);
const [qrCode, setQrCode] = useState(null);
const [businessName, setBusinessName] = useState("");

useEffect(() => {
const loadDashboard = async () => {
try {
const { data: userData } = await supabase.auth.getUser();
const user = userData?.user;

    if (!user) {
      navigate("/login");
      return;
    }

    // Get business
    const { data: business } = await supabase
      .from("businesses")
      .select("id,business_name")
      .eq("user_id", user.id)
      .single();

    if (!business) {
      navigate("/create-business");
      return;
    }

    setBusinessName(business.business_name);

    // Get QR code
    const { data: registration } = await supabase
      .from("business_registrations")
      .select("id,status")
      .eq("business_id", business.id)
      .single();

    if (!registration) {
      navigate("/create-business");
      return;
    }

    if (registration.status !== "approved") {
      navigate("/awaiting-approval");
      return;
    }

    const { data: qr } = await supabase
      .from("qr_codes")
      .select("code")
      .eq("registration_id", registration.id)
      .single();

    if (qr) {
      const qrUrl =
        "https://payshield.shieldsconsulting.co.za/pay/" +
        qr.code;

      setQrCode(qrUrl);
    }

    setLoading(false);
  } catch (err) {
    console.error(err);
    navigate("/login");
  }
};

loadDashboard();

}, [navigate]);

const downloadQR = () => {
const canvas = document.getElementById("merchantQR");
const pngUrl = canvas
.toDataURL("image/png")
.replace("image/png", "image/octet-stream");

const downloadLink = document.createElement("a");
downloadLink.href = pngUrl;
downloadLink.download = "payshield-qr.png";
document.body.appendChild(downloadLink);
downloadLink.click();
document.body.removeChild(downloadLink);

};

if (loading) {
return <div style={layout.contentWrapper}>Loading...</div>;
}

return ( <div style={layout.contentWrapper}> <h1 style={typography.heading}>Dashboard</h1>

  <p style={typography.text}>
    Welcome {businessName}
  </p>

  {qrCode && (
    <div
      style={{
        marginTop: "40px",
        padding: "30px",
        background: "#fff",
        borderRadius: "12px",
        width: "320px",
        textAlign: "center",
      }}
    >
      <h3>My Payment QR</h3>

      <QRCodeCanvas
        id="merchantQR"
        value={qrCode}
        size={220}
        includeMargin
      />

      <p
        style={{
          fontSize: "12px",
          marginTop: "10px",
          color: "#666",
        }}
      >
        Scan to pay with PayShield
      </p>

      <button
        onClick={downloadQR}
        style={{
          marginTop: "20px",
          padding: "10px 16px",
          background: "#facc15",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Download QR
      </button>
    </div>
  )}
</div>

);
}
