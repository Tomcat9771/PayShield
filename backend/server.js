import "dotenv/config";
import express from "express";
import cors from "cors";
import adminDocumentsRouter from "./routes/adminDocuments.js";
import approveRegistrationRouter from "./routes/admin/approveRegistration.js";
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
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use("/api/admin/approve-registration", approveRegistrationRouter);
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
