// backend/services/instantMoneyService.js
import crypto from "crypto";

/**
 * Standard Bank Instant Money service
 * - Creates cash vouchers
 * - Does NOT store PIN
 * - DRY-RUN SAFE
 */

const isLive = process.env.NODE_ENV === "production";

export async function createVoucher({ payout }) {
  if (!isLive) {
    console.log("🧪 DRY-RUN: Instant Money voucher", payout.id);

    return {
      ok: true,
      provider: "STANDARD_BANK",
      voucher_id: `IM-${crypto.randomUUID().slice(0, 8)}`,
      expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      pin: Math.floor(100000 + Math.random() * 900000).toString(),
      instructions:
        "Collect cash at any Standard Bank ATM or participating retailer",
    };
  }

  // 🔴 LIVE IMPLEMENTATION PLACEHOLDER
  // Call Standard Bank Instant Money API
  // Return voucher_id, pin, expiry

  throw new Error("Instant Money not yet wired (LIVE)");
}

export async function cancelVoucher(voucher_id) {
  if (!isLive) {
    console.log("🧪 DRY-RUN: Cancel voucher", voucher_id);
    return { ok: true };
  }

  // 🔴 LIVE IMPLEMENTATION PLACEHOLDER
  throw new Error("Voucher cancellation not yet wired (LIVE)");
}
