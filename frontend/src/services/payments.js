export async function createPayFastPayment(guardId, amount) {
  const res = await fetch("/api/payments/payfast/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guard_id: guardId,
      amount
    })
  });

  if (!res.ok) {
    throw new Error("Payment failed");
  }

  return res.json();
}
