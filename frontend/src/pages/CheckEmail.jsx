import { useLocation, useNavigate } from "react-router-dom";
import { layout, components, typography, colors } from "../theme";
import GoldButton from "../components/GoldButton";

export default function CheckEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

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
          width: "420px",
          textAlign: "center",
        }}
      >
        <img
          src="/shieldpay-logo.png"
          alt="PayShield Logo"
          style={{ height: "60px", marginBottom: "20px" }}
        />

        <h2 style={typography.heading}>Check Your Email</h2>

        <p style={{ marginTop: 15, color: colors.white }}>
          We’ve sent a verification link to:
        </p>

        {email && (
          <p style={{ color: colors.gold, fontWeight: "bold" }}>
            {email}
          </p>
        )}

        <p style={{ marginTop: 10, color: colors.white }}>
          Please click the link in that email to activate your account.
        </p>

        <GoldButton
          style={{ marginTop: 20 }}
          onClick={() => navigate("/login")}
        >
          Go to Login
        </GoldButton>
      </div>
    </div>
  );
}