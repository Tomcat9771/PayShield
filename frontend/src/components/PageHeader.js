import { useNavigate } from "react-router-dom";
import Breadcrumb from "./Breadcrumb";

export default function PageHeader({
  title,
  breadcrumbs = [],
  showBack = false,
}) {
  const navigate = useNavigate();

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Top row: breadcrumbs + back */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Breadcrumb items={breadcrumbs} />

        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="page-back-button"
          >
            ← Back
          </button>
        )}
      </div>

      {/* Title */}
      <h2 style={{ margin: 0 }}>{title}</h2>
    </div>
  );
}
