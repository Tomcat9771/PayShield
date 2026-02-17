import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/* =========================
   PATH & ENV (WINDOWS SAFE)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load backend/.env
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

/* =========================
   SIMPLE FILE LOGGER
========================= */
const LOG_FILE = path.resolve(__dirname, "../../payout-cron.log");

function log(message) {
  const line = `[${new Date().toLocaleString("en-ZA", {
  timeZone: "Africa/Johannesburg",
  hour12: false
})}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

/* =========================
   SUPABASE CLIENT
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   MAIN JOB
========================= */
async function generatePayouts() {
  log("🕛 Nightly payout generation started");

  try {
    /* =====================================================
       STEP 1: Load unpaid transactions
       ===================================================== */
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("guard_id, guard_name, amount_net")
      .is("payout_id", null);

    if (error) throw error;

    /* =====================================================
       STEP 2: Aggregate balances per guard
       ===================================================== */
    const balances = {};

    for (const tx of transactions) {
      if (!balances[tx.guard_id]) {
        balances[tx.guard_id] = {
          guard_id: tx.guard_id,
          guard_name: tx.guard_name,
          total: 0,
        };
      }
      balances[tx.guard_id].total += Number(tx.amount_net);
    }

    const payoutCandidates = Object.values(balances).filter(
      g => g.total >= 100
    );

    if (payoutCandidates.length === 0) {
      log("ℹ️ No guards eligible for payout today");
      return;
    }

    /* =====================================================
       STEP 3: Create payouts + attach transactions
       ===================================================== */
    for (const guard of payoutCandidates) {
      log(
        `➡️ Creating payout for guard ${guard.guard_id} | R${guard.total.toFixed(
          2
        )}`
      );

      // Create payout
      const { data: payout, error: payoutError } = await supabase
        .from("payouts")
        .insert({
          guard_id: guard.guard_id,
          guard_name: guard.guard_name,
          amount: Number(guard.total.toFixed(2)),
          status: "PENDING",
          payout_date: new Date().toISOString().slice(0, 10),
        })
        .select()
        .single();

      if (payoutError) {
        // One payout per guard per day protection
        if (payoutError.code === "23505") {
          log(
            `⚠️ Payout already exists today for guard ${guard.guard_id}`
          );
          continue;
        }
        throw payoutError;
      }

      // Attach transactions
      const { error: attachError } = await supabase
        .from("transactions")
        .update({ payout_id: payout.id })
        .eq("guard_id", guard.guard_id)
        .is("payout_id", null);

      if (attachError) throw attachError;

      log(`✅ Payout ${payout.id} created for guard ${guard.guard_id}`);
    }

    log("🎉 Nightly payout generation completed successfully");
  } catch (err) {
    log(`❌ Nightly payout generation FAILED: ${err.message}`);
  }
}

/* =========================
   RUN (NO process.exit!)
========================= */
generatePayouts()
  .then(() => {
    log("🧹 Cron finished cleanly");
  })
  .catch(err => {
    log(`❌ Cron fatal error: ${err.message}`);
  });
