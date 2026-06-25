import { useEffect, useState } from "react";

export default function GoToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        padding: "0.55rem 1rem",
        borderRadius: "999px",
        // border: "none",
        cursor: "pointer",
        fontSize: "14px",
        color: "#fff",
        backgroundColor: "#00ace1",
        zIndex: 9999,
        border: "2px solid #fff",
      }}
      aria-label="Go to top"
    >
      ↑ Top
    </button>
  );
}
