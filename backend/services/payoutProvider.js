export async function payGuard({
  transactionId,
  guardId,
  amount,
  reference
}) {
  /**
   * This function MUST:
   * - Be idempotent
   * - Throw on failure
   * - Return a provider reference on success
   */

  // 🔒 SAFETY SWITCH (initially OFF)
  if (process.env.PAYOUTS_LIVE !== "true") {
    console.log(
      `🧪 DRY-RUN EFT → guard ${guardId}, amount ${amount}, tx ${transactionId}`
    );

    return {
      provider: "dry-run",
      provider_ref: `dryrun:${transactionId}`
    };
  }

  // 🔌 REAL PROVIDER CALL GOES HERE
  throw new Error("Real payout provider not configured");
}
