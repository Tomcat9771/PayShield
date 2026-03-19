import axios from "axios";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { generateOzowHash } from "../utils/ozowHash.js";
import { encryptAccountNumber } from "../utils/ozowEncrypt.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🔁 Use MOCK for now
const OZOW_BASE_URL = "https://stagingpayoutsapi.ozow.com/mock/v1";

export async function processPayout(payout) {
  try {
    // Get bank details
    const { data: bankDetails, error } = await supabase
      .from("business_bank_details")
      .select("*")
      .eq("business_id", payout.business_id)
      .single();

    if (error || !bankDetails) {
      throw new Error("Bank details not found");
    }

    const encryptionKey = crypto.randomBytes(16).toString("hex");

    const encryptedAccount = encryptAccountNumber(
      bankDetails.account_number,
      encryptionKey,
      payout.id,
      payout.total_amount
    );

    const hash = generateOzowHash({
      siteCode: process.env.OZOW_SITE_CODE,
      amount: payout.total_amount,
      merchantReference: payout.id,
      customerBankReference: "PayShield",
      isRtc: false,
      notifyUrl: process.env.OZOW_NOTIFY_URL,
      bankGroupId: bankDetails.bank_group_id,
      accountNumber: encryptedAccount,
      branchCode: bankDetails.branch_code,
      apiKey: process.env.OZOW_API_KEY,
    });

    const requestBody = {
      siteCode: process.env.OZOW_SITE_CODE,
      amount: payout.total_amount,
      merchantReference: payout.id,
      customerBankReference: "PayShield",
      isRtc: false,
      notifyUrl: process.env.OZOW_NOTIFY_URL,
      bankingDetails: {
        bankGroupId: bankDetails.bank_group_id,
        accountNumber: encryptedAccount,
        branchCode: bankDetails.branch_code,
      },
      hashCheck: hash,
    };

    console.log("🚀 Auto-processing payout:", payout.id);

    const response = await axios.post(
      `${OZOW_BASE_URL}/requestpayout`,
      requestBody,
      {
        headers: {
          ApiKey: process.env.OZOW_API_KEY,
          SiteCode: process.env.OZOW_SITE_CODE,
        },
      }
    );

    // Update payout
    await supabase
      .from("payouts")
      .update({
        status: "PROCESSING",
        provider_ref: response.data.payoutId,
        encryption_key: encryptionKey,
      })
      .eq("id", payout.id);

    return { success: true };
  } catch (err) {
    console.error("❌ Auto payout failed:", err.message);

    await supabase
      .from("payouts")
      .update({
        status: "FAILED",
        last_error: err.message,
      })
      .eq("id", payout.id);

    return { success: false };
  }
}