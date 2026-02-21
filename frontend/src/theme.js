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
    background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(241,197,14,0.2)",
  },

  goldButton: {
  background: "linear-gradient(145deg, #FAE418, #F1C50E)",
  border: "none",
  color: "#6B1A7B",
  padding: "12px 30px",
  borderRadius: "50px",
  fontWeight: "600",
  letterSpacing: "0.5px",
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(241,197,14,0.4)",
  transition: "all 0.25s ease",
},

  input: {
    width: "100%",
    padding: "14px",
    marginBottom: "18px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#FFFFFF",
    outline: "none",
    fontSize: "14px",
  },
};
