import "dotenv/config";
import express from "express";
import cors from "cors";

/* =========================
   ROUTES
========================= */
import ozowRouter from "./routes/ozow.js";
import ozowWebhookRouter from "./routes/webhooks/ozow.js";
import loginRouter from "./routes/login.js";
import businessesRouter from "./routes/businesses.js";
import payoutsRouter from "./routes/payouts.js";
import ledgerRouter from "./routes/ledger.js";
import transactionsRouter from "./routes/transactions.js";
import auditRouter from "./routes/audit.js";

/* =========================
   MIDDLEWARE
========================= */
import requireAuth, { requireAdmin } from "./middleware/auth.js";

const app = express();

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
  })
);

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
   BODY PARSERS (FOR ALL OTHER ROUTES)
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   ROUTES
========================= */

// Auth
app.use("/api/login", loginRouter);

// Ozow Payment Creation (Public)
app.use("/api/ozow", ozowRouter);

// Business Management (Admin Protected)
app.use("/api/businesses", requireAuth, requireAdmin, businessesRouter);

// Admin Protected
app.use("/api/payouts", requireAuth, requireAdmin, payoutsRouter);
app.use("/api/ledger", requireAuth, requireAdmin, ledgerRouter);
app.use("/api/transactions", requireAuth, requireAdmin, transactionsRouter);
app.use("/api/audit", requireAuth, requireAdmin, auditRouter);

/* =========================
   OZOW REDIRECT PAGES
========================= */

app.get("/success.aspx", (req, res) => {
  return res.send(`
    <html>
      <head><title>Payment Successful</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;">
        <h2>✅ Payment Successful</h2>
        <p>Your payment has been received.</p>
        <p>You may close this window.</p>
      </body>
    </html>
  `);
});

app.get("/cancel.aspx", (req, res) => {
  return res.send(`
    <html>
      <head><title>Payment Cancelled</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;">
        <h2>❌ Payment Cancelled</h2>
        <p>You cancelled the payment.</p>
        <p>You may try again.</p>
      </body>
    </html>
  `);
});

app.get("/error.aspx", (req, res) => {
  return res.send(`
    <html>
      <head><title>Payment Error</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;">
        <h2>⚠ Payment Error</h2>
        <p>An error occurred while processing your payment.</p>
        <p>Please try again later.</p>
      </body>
    </html>
  `);
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
