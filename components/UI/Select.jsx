/* eslint-disable react/prop-types */
export default function Select({ items, value, setValue }) {
  return (
    <div>
      {items &&
        items.map((item, i) => (
          <p
            className={`${
              item.value === value ? "selectItemActive" : "selectItem"
            }`}
            onClick={() => setValue(item.value)}
            key={i}
          >
            {item.value === "*" ? "All" : item.value}
          </p>
        ))}
    </div>
  );
}
