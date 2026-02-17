export default function AmountSelector({ value, onChange }) {
  const amounts = [10, 20, 50, 100];

  return (
    <div style={styles.box}>
      {amounts.map(a => (
        <button
          key={a}
          style={{
            ...styles.btn,
            ...(value === a ? styles.active : {})
          }}
          onClick={() => onChange(a)}
        >
          R{a}
        </button>
      ))}

      <input
        type="number"
        placeholder="Custom"
        value={amounts.includes(value) ? "" : value}
        onChange={e => onChange(Number(e.target.value))}
        style={styles.input}
      />
    </div>
  );
}

const styles = {
  box: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 20
  },
  btn: {
    padding: "12px 18px",
    fontSize: 16,
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff"
  },
  active: {
    background: "#000",
    color: "#fff"
  },
  input: {
    padding: 12,
    fontSize: 16,
    width: 120,
    borderRadius: 6,
    border: "1px solid #ccc"
  }
};
