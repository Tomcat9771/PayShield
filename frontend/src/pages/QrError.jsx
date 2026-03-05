export default function QrError() {

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

        <h2 style={{ color: "#dc2626" }}>
          Payment Failed
        </h2>

        <p>
          Something went wrong with the payment.
        </p>

      </div>

    </div>
  );
}