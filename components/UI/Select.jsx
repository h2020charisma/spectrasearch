/* eslint-disable react/prop-types */
export default function Select({ items, value, setValue }) {
  return (
    <div>
      {items.map((item, i) => (
        <p
          className={`${
            item.name === value ? "selectItemActive" : "selectItem"
          }`}
          onClick={() => setValue(item.name)}
          key={i}
        >
          {item.name === "*" ? "All" : item.name}
        </p>
      ))}
    </div>
  );
}
