import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";
global.fetch = fetch;

import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { processPayout } from "./ozowPayoutService.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("SUPABASE_URL:", process.env.SUPABASE_URL);

// 🔥 Config
const MIN_PAYOUT_AMOUNT = 5000;
const MAX_WAIT_DAYS = 7;

function round(n) {
  return Number(Number(n).toFixed(2));
}

/**
 * Run payout aggregation safely
 */
export async function runPayoutBatch() {
  console.log("🚀 Running payout batch...");

  /* =========================
     1️⃣ Fetch eligible transactions
  ========================= */
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("status", "COMPLETE")
    .is("payout_id", null)
    .not("business_id", "is", null);

  if (error) {
    throw new Error("Failed to fetch transactions: " + error.message);
  }

  if (!transactions || !transactions.length) {
    console.log("ℹ️ No transactions to payout");
    return { payoutsCreated: 0 };
  }

  /* =========================
     2️⃣ Group by business_id
  ========================= */
  const grouped = {};

  for (const tx of transactions) {
    if (!grouped[tx.business_id]) {
      grouped[tx.business_id] = {
        business_id: tx.business_id,
        total: 0,
        transactions: [],
      };
    }

    grouped[tx.business_id].total += Number(tx.amount_net);
    grouped[tx.business_id].transactions.push(tx);
  }

  let payoutsCreated = 0;

  /* =========================
     3️⃣ Create payouts
  ========================= */
  for (const group of Object.values(grouped)) {
    const totalAmount = round(group.total);

    // 🕒 Oldest transaction
    const oldestTx = group.transactions.reduce((oldest, tx) => {
      return new Date(tx.created_at) < new Date(oldest.created_at)
        ? tx
        : oldest;
    });

    const oldestDate = new Date(oldestTx.created_at);
    const now = new Date();

    const diffDays =
      (now - oldestDate) / (1000 * 60 * 60 * 24);

    const meetsAmountRule = totalAmount >= MIN_PAYOUT_AMOUNT;
    const meetsTimeRule = diffDays >= MAX_WAIT_DAYS;

    if (!meetsAmountRule && !meetsTimeRule) {
      console.log(
        `⏳ Skipping Business ${group.business_id} (R${totalAmount.toFixed(
          2
        )}, ${diffDays.toFixed(1)} days)`
      );
      continue;
    }

    const payoutId = uuidv4();

    const reason = meetsAmountRule
      ? "AMOUNT_THRESHOLD"
      : "TIME_THRESHOLD";

    console.log(
      `💰 Creating payout for Business ${group.business_id}: R${totalAmount.toFixed(
        2
      )} (${reason})`
    );

    // Insert payout
    const { error: payoutError } = await supabase
      .from("payouts")
      .insert({
        id: payoutId,
        business_id: group.business_id,
        total_amount: totalAmount,
        payout_method: "bank",
        status: "CREATED",
      });

    if (payoutError) {
      console.error("❌ Failed to create payout:", payoutError);
      continue;
    }

    // Link transactions
    const txIds = group.transactions.map((t) => t.id);

    const { error: linkError } = await supabase
      .from("transactions")
      .update({ payout_id: payoutId })
      .in("id", txIds);

    if (linkError) {
      console.error("❌ Failed to link transactions:", linkError);
      continue;
    }

payoutsCreated++;

console.log(
  `✅ Payout created: R${totalAmount.toFixed(2)}`
);

// 🚀 AUTO PROCESS PAYOUT
await processPayout({
  id: payoutId,
  business_id: group.business_id,
  total_amount: totalAmount,
});

  }

  return { payoutsCreated };
}

/**
 * 🔧 Allow manual execution
 */
if (process.argv[1]?.includes("payoutBatchService.js")) {
  runPayoutBatch()
    .then((res) => {
      console.log("✅ Manual batch result:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Manual batch failed:", err);
      process.exit(1);
    });
}



