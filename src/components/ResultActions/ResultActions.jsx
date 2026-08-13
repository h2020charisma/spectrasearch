/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { resolveViewersForItem } from "../../viewers";
import { useCollection, itemKey } from "../../store/collection";
import "./resultActions.css";

// Renders an internal route as a react-router <Link>, or an external site as a
// plain <a target="_blank"> — the only difference between the two viewer kinds.
function ViewerAnchor({ external, href, className, title, onClick, children }) {
  if (external) {
    return (
      <a
        className={className}
        href={href}
        target="_blank"
        rel="noreferrer"
        title={title}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }
  return (
    <Link className={className} to={href} target="_blank" title={title} onClick={onClick}>
      {children}
    </Link>
  );
}

// Per-result dispatch: the primary viewer is a direct click on `children`; a ⋮
// overflow menu exposes the other applicable viewers (1:n registry, route +
// external) plus "Add to collection".
export default function ResultActions({ item, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Resolved per item: external viewers that don't apply (CompTox w/o DTXSID,
  // AOP-Wiki on an assay) are already filtered out.
  const resolved = resolveViewersForItem(item);
  const primary = resolved[0];

  const inCollection = useCollection((s) =>
    s.items.some((i) => itemKey(i) === itemKey(item))
  );
  const toggle = useCollection((s) => s.toggle);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!primary) return children || null;

  return (
    <span className="resultActions" ref={ref}>
      <ViewerAnchor
        external={primary.external}
        href={primary.href}
        className="ra-primary"
        title={`Open in ${primary.viewer.label}`}
      >
        {children ?? primary.viewer.label}
      </ViewerAnchor>
      <button
        className="ra-more"
        onClick={() => setOpen((o) => !o)}
        title="More actions"
        aria-label="More actions"
      >
        ⋮
      </button>
      {open && (
        <div className="ra-menu">
          {resolved.map(({ viewer, href, external }) => (
            <ViewerAnchor
              key={viewer.id}
              external={external}
              href={href}
              className="ra-menu-item"
              onClick={() => setOpen(false)}
            >
              Open in {viewer.label}
            </ViewerAnchor>
          ))}
          <div className="ra-menu-sep" />
          <button
            className="ra-menu-item"
            onClick={() => {
              toggle(item);
              setOpen(false);
            }}
          >
            {inCollection ? "★ Remove from collection" : "☆ Add to collection"}
          </button>
        </div>
      )}
    </span>
  );
}
