/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import useDebounce from "../../utils/useDebounce";
import SearchIcon from "../Icons/SearchIcon";
import Close from "../Icons/Close";
import useSWR from "swr";
import { apiUrl } from "../../config";

// Suggestions come from the same collections the search itself uses, and the
// non-public ones need the bearer token -- without it the backend answers 401
// and the box silently offered nothing. The token is part of the SWR key so a
// sign-in (or a renewal) revalidates rather than serving the signed-out result
// from cache.
const fetcher = async ([url, token]) => {
  const response = await fetch(
    url,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // fetch only rejects on network failure, so a 401/403 would otherwise look
    // like an empty result set. Raise it, and let the box say so.
    const error = new Error(body?.detail || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
};

export default function SearchSelect({
  qQuery,
  setqQuery,
  setImageSelected,
  queryStringSourcesParams,
  label,
  field,
  setPages,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");

  const debounced = useDebounce(search, 300);

  const apiURL =
    debounced && debounced.length > 0
      ? apiUrl(
          `db/query/field/terms?name=${field}&prefix=${encodeURIComponent(
            debounced,
          )}&limit=25${
            queryStringSourcesParams ? `&${queryStringSourcesParams}` : ""
          }`,
        )
      : null;

  const auth = useAuth();
  const token = auth?.user?.access_token;

  const { data, error } = useSWR(apiURL ? [apiURL, token] : null, fetcher);
  const terms = data?.response || [];

  useEffect(() => {
    const found = qQuery?.some((obj) => obj.name === label);

    if (!found) {
      setSelected("");
      setSearch("");
    }
  }, [qQuery, label]);

  return (
    <section>
      <div className="selectBtn" style={{ position: "relative" }}>
        <SearchIcon />

        <input
          id={`Search for ${label}`}
          data-cy={label.replace(/\s+/g, "-").toLowerCase()}
          className={
            selected ? "searchSelectInput active" : "searchSelectInput"
          }
          value={selected || search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && search) {
              e.preventDefault();

              setqQuery((prev) => [
                ...prev,
                { name: label, value: search, field },
              ]);

              setPages(0);

              setSearch("");
              setSelected("");
              setImageSelected("");
            }
          }}
          placeholder={`Search for ${label}`}
        />

        <div
          style={{
            position: "absolute",
            right: "0.5rem",
            cursor: "pointer",
          }}
          onClick={() => {
            setqQuery((prev) => prev.filter((item) => item.value !== selected));

            setPages(0);

            setSearch("");
            setSelected("");
            setImageSelected("");
          }}
        >
          {(search || selected) && (
            <span className="clearSelection">
              <Close />
            </span>
          )}
        </div>
      </div>

      <div className="selectOptions" style={{ scrollbarWidth: "thin" }}>
        {debounced !== "" &&
          terms.map((value, i) => (
            <p
              data-project={value}
              className="selectItem"
              key={i}
              onClick={() => {
                if (selected !== value) {
                  setqQuery((prev) => [...prev, { name: label, value, field }]);

                  setPages(0);
                }

                setSearch(value);
                setSelected(value);
                setOpen(false);
                setImageSelected("");
              }}
            >
              {value}
            </p>
          ))}

        {!search && terms.length === 0 && (
          <p style={{ opacity: 0.8, textAlign: "center" }}>
            Start typing to display available values
          </p>
        )}

        {/* A refused request is not an empty result: saying "No matches" for a
            401/403 hid an expired session and an inaccessible data source
            behind what looked like a well-answered query. */}
        {debounced.length > 0 && error && (
          <p className="selectMessage selectMessageError" role="status">
            {error.status === 401
              ? "Sign in to search this data source."
              : error.status === 403
                ? "You do not have access to this data source."
                : `Could not load suggestions: ${error.message}`}
          </p>
        )}

        {debounced.length > 0 && !error && terms.length === 0 && (
          <p style={{ opacity: 0.8, textAlign: "center" }}>No matches</p>
        )}
      </div>
    </section>
  );
}
