function ArrowOpen({ open }) {
  return (
    <svg
      style={{ transform: open ? "rotate(90deg)" : "" }}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="15.5564"
        y="7.77817"
        width="2"
        height="11"
        transform="rotate(135 15.5564 7.77817)"
        fill="#8D8D8D"
      />
      <rect
        x="14.1422"
        y="6.36395"
        width="2"
        height="11"
        transform="rotate(45 14.1422 6.36395)"
        fill="#8D8D8D"
      />
    </svg>
  );
}

export default ArrowOpen;
