import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function QrSuccess() {

  const [params] = useSearchParams();

  const [transactionId, setTransactionId] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {

    setTransactionId(params.get("TransactionId"));
    setReference(params.get("TransactionReference"));

    /* CLEAN URL */

    if (window.location.search) {
      window.history.replaceState(
        {},
        document.title,
        "/qr-success"
      );
    }

  }, []);

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

        <p style={{ marginTop: "20px", color:"#333" }}>
          Transaction ID
        </p>

        <strong style={{ color:"#111" }}>
          {transactionId}
        </strong>

        <p style={{ marginTop: "15px", color:"#333" }}>
          Reference
        </p>

        <strong style={{ color:"#111" }}>
          {reference}
        </strong>

        <p style={{
          fontSize: "12px",
          marginTop: "20px",
          color: "#777"
        }}>
          Powered by PayShield
        </p>

      </div>

    </div>

  );

}

