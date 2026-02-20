import "dotenv/config";
import express from "express";
import cors from "cors";
import adminDocumentsRouter from "./routes/adminDocuments.js";


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
    origin: [
      "http://localhost:5173",
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


/* =========================
   OZOW REDIRECT PAGES
========================= */

app.get("/success.aspx", (req, res) => {
  res.send("<h2>Payment Successful</h2>");
});

app.get("/cancel.aspx", (req, res) => {
  res.send("<h2>Payment Cancelled</h2>");
});

app.get("/error.aspx", (req, res) => {
  res.send("<h2>Payment Error</h2>");
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
