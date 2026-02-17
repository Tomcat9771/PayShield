import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function round(n) {
  return Number(Number(n).toFixed(2));
}

/**
 * Run payout aggregation safely
 * - Groups COMPLETE transactions without payout_id
 * - Creates ONE payout per business
 * - Links transactions → payout
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
     3️⃣ Create payouts + link transactions
  ========================= */
  for (const group of Object.values(grouped)) {
    const payoutId = uuidv4();
    const totalAmount = round(group.total);

    // 3a️⃣ Insert payout
    const { error: payoutError } = await supabase
      .from("payouts")
      .insert({
        id: payoutId,
        business_id: group.business_id,
        amount: totalAmount,
        status: "PENDING",
        reference_code: payoutId,
        payout_date: new Date().toISOString(),
      });

    if (payoutError) {
      console.error("❌ Failed to create payout:", payoutError);
      continue;
    }

    // 3b️⃣ Link transactions to payout
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
      `💰 Payout created for Business ${group.business_id}: R${totalAmount.toFixed(
        2
      )}`
    );
  }

  return { payoutsCreated };
}
