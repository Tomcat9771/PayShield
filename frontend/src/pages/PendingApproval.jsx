import { useNavigate } from "react-router-dom";

export default function PendingApproval() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>⏳ Registration Pending Approval</h2>

      <p>
        Your registration has been submitted and is currently under review.
      </p>

      <p>
        You will be notified once your business has been approved.
      </p>

      <button
        style={{ marginTop: "20px" }}
        onClick={() => navigate("/dashboard")}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
