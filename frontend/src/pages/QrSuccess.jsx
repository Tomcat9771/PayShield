import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";

export default function QrSuccess() {

  const [params] = useSearchParams();

  const [receipt, setReceipt] = useState({
    transactionId: "",
    reference: null,
    amount: "",
    bank: "",
    date: ""
  });

  useEffect(() => {

    const txId = params.get("TransactionId");
    const amount = params.get("Amount");
    const bank = params.get("BankName");

    if (txId) {
      loadPayment(txId);
    }

    setReceipt(prev => ({
      ...prev,
      transactionId: txId || "",
      amount: amount || "",
      bank: bank || "",
      date: new Date().toLocaleString()
    }));

    /* CLEAN URL */

    if (window.location.search) {
      window.history.replaceState({}, document.title, "/qr-success");
    }

  }, []);

  const loadPayment = async (txId) => {

    try {

      const res = await api.get(`/ozow/qr/payment/${txId}`);

      setReceipt(prev => ({
        ...prev,
        reference: res.data?.customer_reference || "-"
      }));

    } catch (err) {

      console.error("Failed to load reference", err);

      setReceipt(prev => ({
        ...prev,
        reference: "-"
      }));

    }

  };

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
        width: "420px",
        textAlign: "center"
      }}>

        <h2 style={{
          color: "#16a34a",
          marginBottom: "20px"
        }}>
          Payment Successful
        </h2>

        <div style={{ textAlign:"left", marginTop:"20px" }}>

          <ReceiptRow label="Transaction ID" value={receipt.transactionId} />

          <ReceiptRow
            label="Amount"
            value={receipt.amount ? `R${receipt.amount}` : "-"}
          />

          <ReceiptRow
            label="Reference"
            value={
              receipt.reference === null
                ? "Loading..."
                : receipt.reference
            }
          />

          <ReceiptRow label="Bank" value={receipt.bank || "-"} />

          <ReceiptRow label="Date" value={receipt.date} />

        </div>

        <p style={{
          fontSize: "12px",
          marginTop: "30px",
          color: "#777"
        }}>
          Powered by PayShield
        </p>

      </div>

    </div>

  );

}

function ReceiptRow({ label, value }) {

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 0",
      borderBottom: "1px solid #eee"
    }}>
      <span style={{ color:"#555" }}>{label}</span>
      <span style={{ fontWeight:"bold", color:"#111" }}>{value}</span>
    </div>
  );

}
