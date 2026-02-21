// 🎨 PayShield Theme System

export const colors = {
  background: "#6B1A7B",
  gold: "#F1C50E",
  goldButton: "#FAE418",
  white: "#FFFFFF",
  danger: "#dc2626",
};

export const layout = {
  page: {
    minHeight: "100vh",
    backgroundColor: colors.background,
    color: colors.gold,
  },

  contentWrapper: {
    padding: "40px",
    maxWidth: "1000px",
    margin: "0 auto",
  },
};

export const typography = {
  heading: {
    color: colors.gold,
    marginBottom: "20px",
  },

  subHeading: {
    color: colors.white,
    marginBottom: "15px",
  },

  text: {
    color: colors.white,
  },
};

export const components = {
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },

  goldButton: {
    backgroundColor: colors.goldButton,
    border: `2px solid ${colors.gold}`,
    color: colors.background,
    padding: "10px 24px",
    borderRadius: "30px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "0.2s ease",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "none",
    outline: "none",
    fontSize: "14px",
  },
};

