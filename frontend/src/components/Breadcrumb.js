import { useNavigate } from "react-router-dom";

export default function Breadcrumb({ items = [], right = null }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 14,
      }}
    >
      {/* LEFT: breadcrumb path */}
      <div>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <span key={index}>
              {item.to && !isLast ? (
                <span
                  onClick={() => navigate(item.to)}
                  style={{
                    cursor: "pointer",
                    color: "#007bff",
                    textDecoration: "underline",
                  }}
                >
                  {item.label}
                </span>
              ) : (
                <strong>{item.label}</strong>
              )}

              {!isLast && " › "}
            </span>
          );
        })}
      </div>

      {/* RIGHT: optional badge / action */}
      {right && <div>{right}</div>}
    </div>
  );
}
