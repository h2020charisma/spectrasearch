export default function ListPlaceholder({ count = 5 }) {
  return (
    <ul>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: "12px 0" }} className="listPlaceholder">
          <div
            className="listPlaceholderLines pulse"
            style={{
              height: 10,
              width: "70%",
              background: "light-dark(#e5e7eb, #404040)",
              marginBottom: 6,
              borderRadius: 4,
            }}
          />

          <div
            className="listPlaceholderLines pulse"
            style={{
              height: 10,
              width: "40%",
              background: "light-dark(#e5e7eb, #404040)",
              borderRadius: 4,
            }}
          />
        </div>
      ))}
    </ul>
  );
}
