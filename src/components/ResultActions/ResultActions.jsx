/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { viewersForType, viewerHref } from "../../viewers";
import { useCollection, itemKey } from "../../store/collection";
import "./resultActions.css";

// Per-result dispatch: the primary viewer is a direct click on `children`; a ⋮
// overflow menu exposes the other viewers (1:n registry) plus "Add to collection".
export default function ResultActions({ item, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const viewers = viewersForType(item?.type);
  const primary = viewers[0];

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
      <Link
        className="ra-primary"
        to={viewerHref(primary, item)}
        target="_blank"
        title={`Open in ${primary.label}`}
      >
        {children ?? primary.label}
      </Link>
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
          {viewers.map((v) => (
            <Link
              key={v.id}
              className="ra-menu-item"
              to={viewerHref(v, item)}
              target="_blank"
              onClick={() => setOpen(false)}
            >
              Open in {v.label}
            </Link>
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
