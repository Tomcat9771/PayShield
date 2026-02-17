export default function PaymentFailure() {
  return (
    <div
      style={{
        maxWidth: 520,
        margin: "60px auto",
        padding: "0 20px",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
  <img
    src="/shieldpay-logo.png"
    alt="PayShield"
    style={{
      width: 120,
      maxWidth: "100%",
      display: "inline-block",
    }}
  />
</div>

      <h1 style={{ fontSize: 26, marginBottom: 12 }}>
        Something went wrong
      </h1>

      <p style={{ fontSize: 16, marginBottom: 12 }}>
        Your payment could not be completed.
      </p>

      <p style={{ color: "#555", fontSize: 15 }}>
        Please try again, or contact support if the problem continues.
      </p>
    </div>
  );
}
