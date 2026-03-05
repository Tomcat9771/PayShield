export default function QrCancel() {

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

        <h2 style={{ color: "#f59e0b" }}>
          Payment Cancelled
        </h2>

        <p>
          The payment process was cancelled.
        </p>

      </div>

    </div>
  );
}