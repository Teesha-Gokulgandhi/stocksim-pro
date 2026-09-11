import "./SortDropdown.css";

function SortDropdown({ value, onChange }) {
  return (
    <div className="sort-dropdown">
      <label>Sort By</label>

      <select value={value} onChange={onChange}>
        <option value="default">Default</option>
        <option value="priceHigh">Price: High → Low</option>
        <option value="priceLow">Price: Low → High</option>
        <option value="gainers">Top Gainers</option>
        <option value="losers">Top Losers</option>
        <option value="az">Company A → Z</option>
      </select>
    </div>
  );
}

export default SortDropdown;