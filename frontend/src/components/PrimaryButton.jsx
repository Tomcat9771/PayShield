export default function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        width: "100%",
        padding: "14px",
        fontSize: 18,
        borderRadius: 6,
        border: "none",
        background: "#000",
        color: "#fff",
        cursor: "pointer",
        opacity: props.disabled ? 0.7 : 1
      }}
    >
      {children}
    </button>
  );
}
