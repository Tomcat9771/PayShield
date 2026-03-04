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
const [latestPayment, setLatestPayment] = useState(null);

const [earnings, setEarnings] = useState({
today: 0,
week: 0,
month: 0
});

useEffect(() => {

let realtimeChannel;

const paymentSound = new Audio("/payment.mp3");

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

// Get registration
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

// Get QR code
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

/* =========================
LOAD EARNINGS
========================= */

const { data: tx } = await supabase
.from("transactions")
.select("amount_net, created_at, status")
.eq("business_id", business.id)
.eq("status", "COMPLETE");

if (tx) {

const now = new Date();

const startOfDay = new Date();
startOfDay.setHours(0,0,0,0);

const startOfWeek = new Date();
startOfWeek.setDate(now.getDate() - 7);

const startOfMonth = new Date(
now.getFullYear(),
now.getMonth(),
1
);

let todayTotal = 0;
let weekTotal = 0;
let monthTotal = 0;

tx.forEach(t => {

const d = new Date(t.created_at);

if (d >= startOfDay) todayTotal += Number(t.amount_net);
if (d >= startOfWeek) weekTotal += Number(t.amount_net);
if (d >= startOfMonth) monthTotal += Number(t.amount_net);

});

setEarnings({
today: todayTotal,
week: weekTotal,
month: monthTotal
});

}

/* =========================
REALTIME PAYMENT LISTENER
========================= */

realtimeChannel = supabase
.channel("merchant-payments")
.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "transactions",
filter: `business_id=eq.${business.id}`
},
(payload) => {

const payment = payload.new;

if (payment.status === "COMPLETE") {

setLatestPayment({
amount: payment.amount_net,
reference: payment.provider_ref
});

// auto hide popup
setTimeout(() => {
setLatestPayment(null);
}, 5000);

// 🔔 play sound
paymentSound.currentTime = 0;
paymentSound.play().catch(() => {});

}

}
)
.subscribe();

setLoading(false);

} catch (err) {

console.error(err);
navigate("/login");

}

};

loadDashboard();

return () => {
if (realtimeChannel) {
supabase.removeChannel(realtimeChannel);
}
};

}, [navigate]);

const downloadQR = () => {

const canvas = document.getElementById("merchantQR");

const pngUrl = canvas
.toDataURL("image/png")
.replace("image/png", "image/octet-stream");

const safeName = businessName
.toLowerCase()
.replace(/[^a-z0-9]/g, "-");

const fileName = `${safeName}-qr.png`;

const downloadLink = document.createElement("a");

downloadLink.href = pngUrl;
downloadLink.download = fileName;

document.body.appendChild(downloadLink);
downloadLink.click();
document.body.removeChild(downloadLink);

};

if (loading) {
return <div style={layout.contentWrapper}>Loading...</div>;
}

return (

<div style={layout.contentWrapper}>

<h1 style={typography.heading}>Dashboard</h1>

<p style={typography.text}>
Welcome {businessName}
</p>

{/* =========================
LIVE PAYMENT POPUP
========================= */}

{latestPayment && (

<div
style={{
position: "fixed",
top: "20px",
right: "20px",
background: "#22c55e",
color: "white",
padding: "18px 22px",
borderRadius: "10px",
boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
fontWeight: "bold",
zIndex: 9999,
animation: "slideIn 0.4s ease"
}}
>

<div>💰 Payment Received</div>

<div style={{ marginTop: "6px", fontSize: "18px" }}>
R{Number(latestPayment.amount).toFixed(2)}
</div>

{latestPayment.reference && (

<div style={{ fontSize: "12px", marginTop: "3px" }}>
Ref: {latestPayment.reference}
</div>
)}

</div>

)}

{/* =========================
EARNINGS PANEL
========================= */}

<div
style={{
marginTop: "30px",
display: "flex",
gap: "20px",
flexWrap: "wrap"
}}
>

<div style={{
background:"#fff",
padding:"20px",
borderRadius:"10px",
width:"160px"
}}>
<b>Today</b>
<div style={{fontSize:"20px",marginTop:"5px"}}>
R{earnings.today.toFixed(2)}
</div>
</div>

<div style={{
background:"#fff",
padding:"20px",
borderRadius:"10px",
width:"160px"
}}>
<b>This Week</b>
<div style={{fontSize:"20px",marginTop:"5px"}}>
R{earnings.week.toFixed(2)}
</div>
</div>

<div style={{
background:"#fff",
padding:"20px",
borderRadius:"10px",
width:"160px"
}}>
<b>This Month</b>
<div style={{fontSize:"20px",marginTop:"5px"}}>
R{earnings.month.toFixed(2)}
</div>
</div>

</div>

{/* =========================
QR CODE
========================= */}

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

Download QR </button>

</div>

)}

<button
onClick={() => navigate("/payments")}
style={{
marginTop: "30px",
padding: "10px 16px",
background: "#4f46e5",
color: "white",
border: "none",
borderRadius: "8px",
cursor: "pointer"
}}

>

View Payments </button>

<style>
{`
@keyframes slideIn {
from {
transform: translateX(120%);
opacity: 0;
}
to {
transform: translateX(0);
opacity: 1;
}
}
`}
</style>

</div>

);

}
