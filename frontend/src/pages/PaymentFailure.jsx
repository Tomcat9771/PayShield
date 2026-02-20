export default function PaymentFailure() {
  return (
    <div style={{ padding: 30 }}>
      <h2>Payment Failed</h2>
      <p>
        Your registration payment was not completed.
      </p>

      <button onClick={() => window.location.href = "/pay-registration"}>
        Try Again
      </button>
    </div>
  );
}
