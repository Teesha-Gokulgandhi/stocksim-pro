import { useMemo } from "react";
import "./FilterBar.css";

function FilterBar({ stocks = [], selected, onSelect }) {
  const sectors = useMemo(() => {
    const unique = [...new Set(stocks.map((s) => s.sector).filter(Boolean))].sort();
    return ["All", ...unique];
  }, [stocks]);

  return (
    <div className="filter-bar-wrapper">
      <div className="filter-bar-scrollable">
        {sectors.map((sec) => (
          <button
            key={sec}
            type="button"
            className={selected === sec ? "sector-pill active" : "sector-pill"}
            onClick={() => onSelect(sec)}
          >
            {sec === "All" ? "All Sectors" : sec}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FilterBar;