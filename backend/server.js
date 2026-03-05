import "dotenv/config";
import express from "express";
import cors from "cors";

import adminDocumentsRouter from "./routes/adminDocuments.js";
import adminRouter from "./routes/admin.js";
import businessesRouter from "./routes/businesses.js";

import qrPayments from "./routes/ozow/qrPayments.js";
import registrationPayments from "./routes/ozow/registrationPayments.js";
import ozowWebhook from "./routes/ozow/ozow.js";

import requireAuth, { requireAdmin } from "./middleware/auth.js";

/* =========================
   CREATE APP
========================= */

const app = express();

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
        "https://payshield.shieldsconsulting.co.za"
      ];

      if (
        allowed.includes(origin) ||
        origin.includes(".vercel.app")
      ) {
        return callback(null, true);
      }

      console.log("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

/* =========================
   OZOW WEBHOOK (RAW BODY)
========================= */

app.use(
  "/api/webhooks/ozow",
  express.urlencoded({
    extended: false,
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  }),
  ozowWebhook
);

/* =========================
   BODY PARSERS
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   PAYMENT ROUTES
========================= */

app.use("/api/ozow/qr", qrPayments);
app.use("/api/ozow/registration", registrationPayments);

/* =========================
   BUSINESS ROUTES
========================= */

app.use("/api/businesses", businessesRouter);

/* =========================
   ADMIN ROUTES
========================= */

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
  </head>
  <body style="font-family:Arial;text-align:center;padding-top:100px;background:#4b0082;color:white">
    <h1 style="color:${color}">${title}</h1>
    <p>${message}</p>
  </body>
  </html>
  `;
}

app.get("/success.aspx", (req, res) => {
  res.send(
    paymentPage({
      title: "Payment Successful 🎉",
      message: "Your payment was processed successfully.",
      color: "#22c55e"
    })
  );
});

app.get("/cancel.aspx", (req, res) => {
  res.send(
    paymentPage({
      title: "Payment Cancelled ⚠️",
      message: "You cancelled the payment process.",
      color: "#f59e0b"
    })
  );
});

app.get("/error.aspx", (req, res) => {
  res.send(
    paymentPage({
      title: "Payment Error ❌",
      message: "Something went wrong while processing your payment.",
      color: "#ef4444"
    })
  );
});

/* =========================
   QR PAYMENT REDIRECT PAGES
========================= */

app.get("/qr-success", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Payment Successful | PayShield</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="font-family:Arial;text-align:center;padding-top:100px;background:#4b0082;color:white">
    <h1 style="color:#22c55e">Payment Successful 🎉</h1>
    <p>Your payment was completed successfully.</p>
    <p>You may now close this page.</p>
  </body>
  </html>
  `);
});

app.get("/qr-cancel", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Payment Cancelled | PayShield</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="font-family:Arial;text-align:center;padding-top:100px;background:#4b0082;color:white">
    <h1 style="color:#f59e0b">Payment Cancelled</h1>
    <p>The payment was cancelled.</p>
    <p>You may return to the merchant and try again.</p>
  </body>
  </html>
  `);
});

app.get("/qr-error", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Payment Error | PayShield</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="font-family:Arial;text-align:center;padding-top:100px;background:#4b0082;color:white">
    <h1 style="color:#ef4444">Payment Failed</h1>
    <p>Something went wrong while processing the payment.</p>
    <p>Please try again.</p>
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
   START SERVER
========================= */

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 PayShield backend running on ${PORT}`);
});