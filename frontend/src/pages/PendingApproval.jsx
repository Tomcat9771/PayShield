import { layout, components, typography, colors } from "../theme";

export default function PendingApproval() {
  return (
    <div
      style={{
        ...layout.page,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          ...components.card,
          maxWidth: "600px",
          textAlign: "center",
        }}
      >
        <h2 style={typography.heading}>
          ⏳ Registration Pending Approval
        </h2>

        <p style={typography.text}>
          Your registration has been submitted and is currently under review.
        </p>

        <p style={typography.text}>
          You will be notified once your business has been approved.
        </p>

        <div
          style={{
            width: "80px",
            height: "3px",
            background: `linear-gradient(to right, ${colors.gold}, transparent)`,
            margin: "25px auto 0 auto",
          }}
        />
      </div>
    </div>
  );
}