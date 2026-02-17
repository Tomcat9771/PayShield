export default function PaymentCancel() {
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
        Payment cancelled
      </h1>

      <p style={{ fontSize: 16, marginBottom: 12 }}>
        No money was taken.
      </p>

      <p style={{ color: "#555", fontSize: 15 }}>
        If you’d like, you can scan the QR code again and try later.
      </p>
    </div>
  );
}
