/* eslint-disable react/prop-types */
import "./tableStyles.css";

export default function Box({ children, className }) {
  return <div className={className}>{children}</div>;
}
