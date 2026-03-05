import { useSearchParams } from "react-router-dom";

export default function QrSuccess() {

  const [params] = useSearchParams();

  const transactionId = params.get("TransactionId");
  const reference = params.get("TransactionReference");

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

        <p style={{ marginTop: "15px" }}>
          Transaction ID:
        </p>

        <strong>{transactionId}</strong>

        <p style={{ marginTop: "10px" }}>
          Reference:
        </p>

        <strong>{reference}</strong>

        <p style={{ fontSize: "12px", marginTop: "20px", color: "#777" }}>
          Powered by PayShield
        </p>

      </div>
    </div>
  );
}

