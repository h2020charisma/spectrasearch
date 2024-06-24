/* eslint-disable react/prop-types */
export default function ImageSelect({ data, imageSelected, setImageSelected }) {
  const renderImageSelect =
    data &&
    data.map((img, i) => (
      <div
        key={i}
        className={`${
          imageSelected == img.value ? "imageSelected" : "imageNonSelected"
        }`}
      >
        <img
          onClick={() => setImageSelected(img.value)}
          src={img.imageLink}
          width={200}
          height={"auto"}
        />
      </div>
    ));
  return <div className="imageSelectWrap">{renderImageSelect}</div>;
}
