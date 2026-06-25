import { Link } from "react-router-dom";
import Header from "../components/Header/Header";
import { useCollection, itemKey } from "../store/collection";
import { multiViewersForItems, viewerMultiHref } from "../viewers";
import "../components/ResultActions/resultActions.css";

// "My collection": the set of results the user compiled across searches
// (persisted in localStorage). Open them together in a multi-capable viewer.
export default function CollectionPage() {
  const items = useCollection((s) => s.items);
  const remove = useCollection((s) => s.remove);
  const clear = useCollection((s) => s.clear);
  const multiViewers = multiViewersForItems(items);

  return (
    <>
      <Header />
      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
        <Link to="/" style={{ display: "inline-block", marginBottom: 12 }}>
          ← Back to search
        </Link>
        <h2 style={{ marginBottom: 12 }}>My collection ({items.length})</h2>

        {items.length === 0 ? (
          <p style={{ color: "#5b5b5b" }}>
            Add results to your collection from the search results (the ⋮ menu →
            “Add to collection”), then open them together here.
          </p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
              {multiViewers.map((v) => (
                <Link
                  key={v.id}
                  className="shareBtn"
                  to={viewerMultiHref(v, items)}
                  target="_blank"
                >
                  Open {items.length} in {v.label}
                </Link>
              ))}
              <button className="shareBtn" onClick={clear}>
                Clear
              </button>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {items.map((it) => (
                <li
                  key={itemKey(it)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {it.imageLink && (
                    <img src={it.imageLink} alt={it.text} width={48} height="auto" />
                  )}
                  <span style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, color: "#888", marginRight: 8 }}>
                      {it.type}
                    </span>
                    {it.text || it.id}
                  </span>
                  <button
                    className="ra-more"
                    onClick={() => remove(itemKey(it))}
                    title="Remove"
                    aria-label="Remove from collection"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
