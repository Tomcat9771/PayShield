import "dotenv/config";
import express from "express";
import cors from "cors";
import adminDocumentsRouter from "./routes/adminDocuments.js";
import adminRouter from "./routes/admin.js";


/* =========================
   CREATE APP FIRST
========================= */
const app = express();

/* =========================
   ROUTES
========================= */
import ozowRouter from "./routes/ozow.js";
import ozowWebhookRouter from "./routes/webhooks/ozow.js";
import businessesRouter from "./routes/businesses.js";

/* =========================
   MIDDLEWARE
========================= */
import requireAuth, { requireAdmin } from "./middleware/auth.js";

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowed = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://payshield.shieldsconsulting.co.za",
        "https://pay-shield-green.vercel.app",
      ];

      if (allowed.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use("/api/admin/documents", adminDocumentsRouter);
/* =========================
   OZOW WEBHOOK (RAW BODY REQUIRED)
========================= */
app.use(
  "/api/webhooks/ozow",
  express.urlencoded({
    extended: false,
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
  ozowWebhookRouter
);

/* =========================
   BODY PARSERS (OTHER ROUTES)
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   ROUTES
========================= */

// Ozow Payment Creation
app.use("/api/ozow", ozowRouter);

// Business Management
app.use("/api/businesses", businessesRouter);

app.use(
  "/api/admin/documents",
  requireAuth,
  requireAdmin,
  adminDocumentsRouter
);
app.use("/api/admin", adminRouter);

/* =========================
   OZOW REDIRECT PAGES
========================= */
function paymentPage({ title, message, color }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title} | PayShield</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="6;url=https://payshield.shieldsconsulting.co.za" />
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: linear-gradient(135deg, #4b0082, #2e0057);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }
      .card {
        background: white;
        color: #111;
        padding: 40px;
        border-radius: 16px;
        text-align: center;
        width: 90%;
        max-width: 420px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.25);
      }
      h1 {
        margin-top: 0;
        color: ${color};
      }
      .btn {
        display: inline-block;
        margin-top: 20px;
        padding: 12px 20px;
        background: #4b0082;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      }
      .btn:hover {
        opacity: 0.9;
      }
      .logo {
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 20px;
        color: #4b0082;
      }
      .small {
        margin-top: 15px;
        font-size: 12px;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo">PayShield</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <a class="btn" href="https://payshield.shieldsconsulting.co.za">
        Return to Dashboard
      </a>
      <div class="small">
        You will be redirected automatically in a few seconds...
      </div>
    </div>
  </body>
  </html>
  `;
}

app.get("/success.aspx", (req, res) => {
  res.send(
    paymentPage({
      title: "Payment Successful 🎉",
      message:
        "Your payment was processed successfully. Your account is now active.",
      color: "#22c55e",
    })
  );
});

app.get("/cancel.aspx", (req, res) => {
  res.send(
    paymentPage({
      title: "Payment Cancelled ⚠️",
      message:
        "You cancelled the payment process. No funds were deducted.",
      color: "#f59e0b",
    })
  );
});

app.get("/error.aspx", (req, res) => {
  res.send(
    paymentPage({
      title: "Payment Error ❌",
      message:
        "Something went wrong while processing your payment. Please try again.",
      color: "#ef4444",
    })
  );
});
/* =========================
   HEALTH CHECK
========================= */
app.get("/health", (req, res) => {
  res.json({ status: "PayShield API running" });
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 PayShield backend running on ${PORT}`);
});
