import { components } from "../theme";
import { useState } from "react";

export default function GoldButton({
  children,
  onClick,
  type = "button",
  fullWidth = false,
  style = {},
  disabled = false,
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...components.goldButton,
        ...(fullWidth && { width: "100%" }),
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}