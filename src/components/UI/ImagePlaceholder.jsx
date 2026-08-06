function ImagePlaceholder() {
  const count = 15;
  return (
    <ul className="imagePlaceholderWrap">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: "0.8rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            marginBottom: "1.2rem",
          }}
        >
          <div
            className="pulse"
            style={{
              height: "85px",
              width: "164px",
              background: "light-dark(#e5e7eb, #404040)",
              marginBottom: 6,
              borderRadius: 4,
            }}
          />

          <div
            className="pulse"
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

export default ImagePlaceholder;
