/* eslint-disable react/prop-types */
export default function ErrorComp({ loading, error }) {
  return (
    <div
      style={{
        color: "darkred",
        textAlign: "center",
      }}
    >
      {loading
        ? "Loading..."
        : error
        ? `Sorry, something went wrong while fetching the data: ${error.message}.`
        : "No images found."}
    </div>
  );
}
