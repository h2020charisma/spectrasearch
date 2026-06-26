/* eslint-disable react/prop-types */
import { Link } from "react-router-dom";
import { resolveViewersForItem } from "../../viewers";

// Simple link that opens a result's primary applicable viewer (h5web by default).
// Used for the secondary/hover link spots; the full default+overflow UI is
// ResultActions. Handles both internal-route and external-link viewer kinds.
export default function ViewerLink({ item, children, ...rest }) {
  const primary = resolveViewersForItem(item)[0];
  if (!primary) return children || null;

  if (primary.external) {
    return (
      <a href={primary.href} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={primary.href} target="_blank" {...rest}>
      {children}
    </Link>
  );
}
