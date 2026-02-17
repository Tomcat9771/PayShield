import { useParams } from "react-router-dom";

export default function PaymentSuccess() {
  const { guardId } = useParams();

  return (
    <div style={{ textAlign: "center", marginTop: 60 }}>
      <h2>Payment successful 🎉</h2>
      <p>Thank you for supporting this guard.</p>
      <small>Reference: {guardId}</small>
    </div>
  );
}
