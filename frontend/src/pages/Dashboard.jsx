import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { layout, typography } from "../theme";
import { QRCodeCanvas } from "qrcode.react";
import GoldButton from "../components/GoldButton";

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

/* LOAD EARNINGS */

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

/* REALTIME PAYMENTS */

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
reference: payment.customer_reference
});

setTimeout(() => {
setLatestPayment(null);
}, 5000);

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

/* QR DOWNLOAD */

const downloadQR = async () => {

const qrCanvas = document.getElementById("merchantQR");

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 1100;

ctx.fillStyle = "#f5f5f5";
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.strokeStyle = "#5b2c83";
ctx.lineWidth = 12;
ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

const logo = new Image();
logo.src = "/payshield-logo.png";

logo.onload = () => {

ctx.drawImage(logo, 350, 70, 200, 200);

ctx.drawImage(qrCanvas, 200, 330, 500, 500);

ctx.fillStyle = "#1f2937";
ctx.font = "bold 48px Arial";
ctx.textAlign = "center";
ctx.fillText(businessName, canvas.width / 2, 900);

ctx.fillStyle = "#666";
ctx.font = "28px Arial";

ctx.fillText(
"Hosted by Shields Consulting",
canvas.width / 2,
980
);

ctx.fillText(
"www.shieldsconsulting.co.za",
canvas.width / 2,
1020
);

const link = document.createElement("a");

const safeName = businessName
.toLowerCase()
.replace(/[^a-z0-9]/g, "-");

link.download = `${safeName}-payshield-qr.png`;
link.href = canvas.toDataURL("image/png");

link.click();

};

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

{/* Earnings */}

<div
style={{
marginTop: "30px",
display: "flex",
gap: "20px",
flexWrap: "wrap"
}}
>

<div style={{background:"#fff",padding:"20px",borderRadius:"10px",width:"160px"}}>
<b>Today</b>
<div style={{fontSize:"20px",marginTop:"5px"}}>
R{earnings.today.toFixed(2)}
</div>
</div>

<div style={{background:"#fff",padding:"20px",borderRadius:"10px",width:"160px"}}>
<b>This Week</b>
<div style={{fontSize:"20px",marginTop:"5px"}}>
R{earnings.week.toFixed(2)}
</div>
</div>

<div style={{background:"#fff",padding:"20px",borderRadius:"10px",width:"160px"}}>
<b>This Month</b>
<div style={{fontSize:"20px",marginTop:"5px"}}>
R{earnings.month.toFixed(2)}
</div>
</div>

</div>

{/* QR */}

{qrCode && (

<div
style={{
marginTop: "40px",
padding: "30px",
background: "#fff",
borderRadius: "12px",
width: "320px",
textAlign: "center"
}}
>

<h3>My Payment QR</h3>

<QRCodeCanvas
id="merchantQR"
value={qrCode}
size={220}
includeMargin
/>

<p style={{fontSize:"12px",marginTop:"10px",color:"#666"}}>
Scan to pay with PayShield
</p>

<button
onClick={downloadQR}
style={{
marginTop:"20px",
padding:"10px 16px",
background:"#facc15",
border:"none",
borderRadius:"8px",
fontWeight:"bold",
cursor:"pointer"
}}
>
Download QR
</button>

</div>

)}

<div style={{ marginTop: "30px" }}>
<GoldButton onClick={() => navigate("/payments")}>
View Payments
</GoldButton>
</div>

</div>

);

}
