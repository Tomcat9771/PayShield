import axios from "axios";

const STITCH_ENV = process.env.STITCH_ENV || "sandbox";
const DRY_RUN = process.env.PAYOUT_DRY_RUN !== "false";

const BASE_URL =
  STITCH_ENV === "production"
    ? "https://api.stitch.money"
    : "https://api.sandbox.stitch.money";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  auth: {
    username: process.env.STITCH_CLIENT_ID || "stub",
    password: process.env.STITCH_CLIENT_SECRET || "stub",
  },
});

/* ======================================================
   BANK EFT
====================================================== */
export async function sendBankEFT(payout) {
  if (DRY_RUN) {
    console.log("🧪 Stitch DRY_RUN Bank EFT", payout.id);
    return {
      provider: "STITCH_DRY_RUN",
      reference: `stitch_dry_${payout.id}`,
    };
  }

  // 🔴 Live logic will be enabled only after verification
  throw new Error("Stitch Bank EFT not enabled yet");
}

/* ======================================================
   INSTANT EFT
====================================================== */
export async function sendInstantEFT(payout) {
  if (DRY_RUN) {
    console.log("🧪 Stitch DRY_RUN Instant EFT", payout.id);
    return {
      provider: "STITCH_DRY_RUN",
      reference: `stitch_dry_${payout.id}`,
    };
  }

  throw new Error("Stitch Instant EFT not enabled yet");
}
