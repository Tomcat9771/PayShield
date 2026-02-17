import { supabase } from "../lib/supabaseClient.js";

export async function validateGuardBankDetails(guardId) {
  const { data, error } = await supabase
    .from("guard_bank_details")
    .select(`
      bank_name,
      account_holder,
      account_number,
      branch_code,
      verification_status
    `)
    .eq("guard_id", guardId)
    .single();

  if (error || !data) {
    return {
      valid: false,
      reason: "Missing bank details",
      verified: false,
    };
  }

  const requiredFields = [
    "bank_name",
    "account_holder",
    "account_number",
    "branch_code",
  ];

  for (const field of requiredFields) {
    if (!data[field] || String(data[field]).trim() === "") {
      return {
        valid: false,
        reason: `Invalid or missing field: ${field}`,
        verified: false,
      };
    }
  }

  if (data.account_number.length < 6) {
    return {
      valid: false,
      reason: "Account number too short",
      verified: false,
    };
  }

  if (data.branch_code.length < 4) {
    return {
      valid: false,
      reason: "Branch code invalid",
      verified: false,
    };
  }

  if (data.verification_status !== "verified") {
    return {
      valid: false,
      reason: "Bank details not verified",
      verified: false,
    };
  }

  return {
    valid: true,
    verified: true,
  };
}
