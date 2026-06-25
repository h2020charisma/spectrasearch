/* eslint-disable react/prop-types */
import { Link } from "react-router-dom";
import { primaryViewer, viewerHref } from "../../viewers";

// Simple link that opens a result's primary viewer (h5web by default). Used for
// the secondary/hover link spots; the full default+overflow UI is ResultActions.
export default function ViewerLink({ item, children, ...rest }) {
  const viewer = primaryViewer(item?.type);
  return (
    <Link to={viewerHref(viewer, item)} target="_blank" {...rest}>
      {children}
    </Link>
  );
}
