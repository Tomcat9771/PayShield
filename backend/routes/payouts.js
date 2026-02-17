import express from "express";
import { supabase } from "../lib/supabaseClient.js";
import { sendBankEFT, sendInstantEFT } from "../services/stitchService.js";
import { sendSMS } from "../services/smsService.js";
import { createVoucher } from "../services/instantMoneyService.js";
import { audit } from "../lib/audit.js";

const router = express.Router();
const DRY_RUN = process.env.PAYOUT_DRY_RUN !== "false";

/* =========================
   HELPERS
========================= */
function dryRunResult(payout) {
  return {
    provider: "DRY_RUN",
    reference: `dryrun_${payout.id}`,
    voucher_id: `dryrun_${payout.id}`,
    expires_at: null,
  };
}

console.log(
  DRY_RUN
    ? "🧪 PAYOUT RUNNING IN DRY-RUN MODE"
    : "💸 PAYOUT RUNNING IN LIVE MODE"
);

/* ======================================================
   GET /api/payouts
====================================================== */
router.get("/", async (req, res) => {
  const { guard_id } = req.query;

  let query = supabase
    .from("payouts")
    .select("*")
    .order("created_at", { ascending: false });

  if (guard_id) {
    query = query.eq("guard_id", guard_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Payout fetch error:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data || []);
});

/* ======================================================
   GET /api/payouts/pending
   Admin dashboard – list all pending payouts
====================================================== */
router.get("/pending", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("payouts")
      .select(
        "id, guard_id, guard_name, amount, status, payout_date, created_at"
      )
      .eq("status", "CREATED")
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({ payouts: data || [] });
  } catch (err) {
    console.error("❌ Failed to fetch pending payouts", err);
    res.status(500).json({ error: "Failed to load pending payouts" });
  }
});
/* ======================================================
   GET /api/payouts/pending/summary
   Admin dashboard – list all pending payouts
====================================================== */
router.get("/pending/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("payouts")
      .select("amount, payout_date")
      .eq("status", "CREATED");

    if (error) throw error;

    const totalCount = data.length;
    const totalAmount = data.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    const overdueCount = data.filter(
      p => p.payout_date.slice(0, 10) < today
    ).length;

    res.json({
      totalCount,
      totalAmount,
      overdueCount,
    });
  } catch (err) {
    console.error("❌ Failed to load payout summary", err);
    res.status(500).json({ error: "Failed to load payout summary" });
  }
});
/* ======================================================
   GET /api/payouts/:id
====================================================== */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const { data: payout } = await supabase
    .from("payouts")
    .select("*")
    .eq("id", id)
    .single();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("payout_id", id)
    .order("created_at", { ascending: true });

  res.json({ payout, transactions });
});

/* ======================================================
   POST /api/payouts/:id/complete
   Manual completion (Ozow / EFT done outside system)
====================================================== */
router.post("/:id/complete", async (req, res) => {
  const { id } = req.params;
  const { reference } = req.body || {};

  try {
    const { data: payout } = await supabase
      .from("payouts")
      .select("*")
      .eq("id", id)
      .single();

    if (!payout) {
      return res.status(404).json({ error: "Payout not found" });
    }

    if (payout.status !== "PENDING") {
      return res.status(400).json({
        error: `Payout already ${payout.status}`,
      });
    }

    const { error: updateError } = await supabase
      .from("payouts")
      .update({
        status: "COMPLETED",
        payout_method: "MANUAL",
        reference_code: reference ?? null,
        payout_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "CREATED");

    if (updateError) throw updateError;

    await audit({
      admin_id: req.user?.id ?? null,
      action: "payout_completed_manual",
      entity_type: "payout",
      entity_id: id,
      metadata: {
        amount: payout.amount,
        guard_id: payout.guard_id,
        reference,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Manual payout completion failed", err);
    res.status(500).json({ error: "Failed to complete payout" });
  }
});

/* ======================================================
   POST /api/payouts/:id/approve
====================================================== */
router.post("/:id/approve", async (req, res) => {
  const { id } = req.params;

  const { data: payout } = await supabase
    .from("payouts")
    .update({ status: "APPROVED" })
    .eq("id", id)
    .eq("status", "CREATED")
    .select()
    .single();

  if (!payout) {
    return res.status(400).json({ error: "Invalid payout state" });
  }

  await audit({
    admin_id: req.user?.id ?? null,
    action: "payout_approved",
    entity_type: "payout",
    entity_id: id,
  });

  res.json({ ok: true });
});

/* ======================================================
   POST /api/payouts/:id/process
====================================================== */
router.post("/:id/process", async (req, res) => {
  const { id } = req.params;

  const { data: payout } = await supabase
    .from("payouts")
    .update({ status: "PROCESSING" })
    .eq("id", id)
    .eq("status", "APPROVED")
    .select()
    .single();

  if (!payout) {
    return res.status(409).json({ error: "Invalid payout state" });
  }

  await audit({
    admin_id: req.user?.id ?? null,
    action: "payout_processing_started",
    entity_type: "payout",
    entity_id: id,
  });

  try {
    const { data: baseTxs } = await supabase
      .from("transactions")
      .select("*")
      .eq("payout_id", id)
      .is("retry_of", null);

    if (!baseTxs?.length) {
      throw new Error("No base transactions found");
    }

    const attemptTxs = baseTxs.map(tx => ({
      payout_id: id,
      guard_id: tx.guard_id,
      guard_name: tx.guard_name,
      amount_net: tx.amount_net,
      status: "PROCESSING",
      retry_of: tx.id,
    }));

    const { data: newTxs } = await supabase
      .from("transactions")
      .insert(attemptTxs)
      .select();

    let result;

    if (DRY_RUN) {
      result = dryRunResult(payout);
    } else if (payout.payout_method === "bank") {
      result = await sendBankEFT(payout);
    } else if (payout.payout_method === "instant") {
      result = await sendInstantEFT(payout);
    } else if (payout.payout_method === "cash") {
      result = await createVoucher({ payout });

      const { data: guard } = await supabase
        .from("guards")
        .select("phone_number")
        .eq("id", payout.guard_id)
        .single();

      if (!guard?.phone_number) {
        throw new Error("Guard has no phone number");
      }

      await sendSMS({
        to: guard.phone_number,
        message: `Voucher: ${result.voucher_id}\nPIN: ${result.pin}`,
      });
    }

    await supabase
      .from("transactions")
      .update({
        status: "PAID_OUT",
        provider: result.provider,
        provider_ref: result.reference || result.voucher_id,
      })
      .in("id", newTxs.map(t => t.id));

    await supabase
      .from("payouts")
      .update({
        status: "COMPLETED",
        provider: result.provider,
        reference_code: result.reference || result.voucher_id,
        payout_date: new Date().toISOString(),
      })
      .eq("id", id);

    await audit({
      admin_id: req.user?.id ?? null,
      action: "payout_completed",
      entity_type: "payout",
      entity_id: id,
      metadata: {
        provider: result.provider,
        attempts: newTxs.length,
      },
    });

    res.json({ ok: true, dry_run: DRY_RUN });
  } catch (err) {
    const reason = err?.message || "Unknown payout error";

    await supabase
      .from("payouts")
      .update({ status: "FAILED", failure_reason: reason })
      .eq("id", id);

    await audit({
      admin_id: req.user?.id ?? null,
      action: "payout_failed",
      entity_type: "payout",
      entity_id: id,
      metadata: { reason },
    });

    res.status(500).json({ error: "Payout failed", failure_reason: reason });
  }
});

/* ======================================================
   POST /api/payouts/:id/retry
====================================================== */
router.post("/:id/retry", async (req, res) => {
  const { id } = req.params;

  const { data: payout } = await supabase
    .from("payouts")
    .update({
      status: "APPROVED",
      failure_reason: null,
    })
    .eq("id", id)
    .eq("status", "FAILED")
    .select()
    .single();

  if (!payout) {
    return res
      .status(400)
      .json({ error: "Only FAILED payouts can be retried" });
  }

  await audit({
    admin_id: req.user?.id ?? null,
    action: "payout_retried",
    entity_type: "payout",
    entity_id: id,
  });

  res.json({ ok: true });
});

export default router;
