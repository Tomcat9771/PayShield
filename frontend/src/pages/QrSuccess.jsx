import { useSearchParams } from "react-router-dom";

export default function QrSuccess() {

  const [params] = useSearchParams();

  const transactionId = params.get("TransactionId");
  useEffect(() => {

  const loadPayment = async () => {

    const res = await api.get(`/payments/${transactionId}`);

    setReference(res.data.customer_reference);

  };

  if (transactionId) {
    loadPayment();
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

        <h2 style={{ color: "#16a34a", marginBottom: "20px" }}>
          Payment Successful
        </h2>

        <p style={{ color: "#333", fontWeight: "bold" }}>
          Transaction ID
        </p>

        <p style={{ color: "#1f2937", wordBreak: "break-all" }}>
          {transactionId}
        </p>

        <p style={{ color: "#333", fontWeight: "bold", marginTop: "15px" }}>
          Reference
        </p>

        <p style={{ color: "#1f2937", wordBreak: "break-all" }}>
          {reference}
        </p>

        <p style={{
          fontSize: "12px",
          marginTop: "25px",
          color: "#777"
        }}>
          Powered by PayShield
        </p>

      </div>
    </div>
  );
}