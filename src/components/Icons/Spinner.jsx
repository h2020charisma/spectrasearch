export default function Spinner() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="2em"
      height="2em"
      viewBox="0 0 32 32"
    >
      <rect width="6" height="16" x="1" y="6" fill="#00ace1">
        <animate
          id="svgSpinnersBarsFade0"
          fill="freeze"
          attributeName="opacity"
          begin="0;svgSpinnersBarsFade1.end-0.25s"
          dur="0.75s"
          values="1;0.2"
        />
      </rect>
      <rect width="6" height="16" x="9" y="6" fill="#00ace1" opacity="0.4">
        <animate
          fill="freeze"
          attributeName="opacity"
          begin="svgSpinnersBarsFade0.begin+0.15s"
          dur="0.75s"
          values="1;0.2"
        />
      </rect>
      <rect width="6" height="16" x="17" y="6" fill="#00ace1" opacity="0.3">
        <animate
          id="svgSpinnersBarsFade1"
          fill="freeze"
          attributeName="opacity"
          begin="svgSpinnersBarsFade0.begin+0.3s"
          dur="0.75s"
          values="1;0.2"
        />
      </rect>
    </svg>
  );
}
