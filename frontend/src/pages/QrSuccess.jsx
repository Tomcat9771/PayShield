export default function QrSuccess() {

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#3b0764"
    }}>

      <div style={{
        background: "white",
        padding: "40px",
        borderRadius: "16px",
        textAlign: "center",
        width: "420px"
      }}>

        <h2 style={{ color: "#16a34a" }}>
          Payment Successful
        </h2>

        <p>
          Your payment was processed successfully.
        </p>

        <p style={{ fontSize: "12px", color: "#777" }}>
          Powered by PayShield
        </p>

      </div>

    </div>
  );
}