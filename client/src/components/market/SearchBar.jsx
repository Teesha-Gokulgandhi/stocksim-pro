import { FiSearch } from "react-icons/fi";
import "./SearchBar.css";

function SearchBar({ value, onChange }) {
  return (
    <div className="search-bar">

      <FiSearch className="search-icon" />

      <input
        type="text"
        placeholder="Search stocks..."
        value={value}
        onChange={onChange}
      />

    </div>
  );
}

export default SearchBar;