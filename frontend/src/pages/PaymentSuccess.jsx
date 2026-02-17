export default function PaymentSuccess() {
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

      <h1 style={{ fontSize: 28, marginBottom: 12 }}>
        Thank you for your support 💛
      </h1>

      <p style={{ fontSize: 18, marginBottom: 12 }}>
        Your payment was successful.
      </p>

      <p style={{ color: "#555", fontSize: 16, marginBottom: 24 }}>
        Contributions like yours help our security staff feel valued and
        supported.
      </p>

      <p style={{ fontSize: 14, color: "#777" }}>
        You may safely close this page.
      </p>
    </div>
  );
}
