import { useState, useRef, useEffect } from "react";
import { FiDownload, FiChevronDown, FiFileText, FiGrid, FiFile } from "react-icons/fi";
import { exportToCSV, exportToPDF, exportToWord } from "../../utils/statementExporter";
import "./ExportDropdown.css";

export default function ExportDropdown({
  data = [],
  filename = "trade_statement",
  title = "Order Execution Statement",
  user = {},
  currency = "INR",
  currencySymbol = "₹",
  disabled = false,
  label = "Export Statement",
  placement = "auto",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePlacement, setActivePlacement] = useState("bottom");
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      if (placement === "auto") {
        const rect = dropdownRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        // If less than 240px below the button, open upwards as dropup
        setActivePlacement(spaceBelow < 240 ? "top" : "bottom");
      } else {
        setActivePlacement(placement);
      }
    }
  }, [isOpen, placement]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = (type) => {
    setIsOpen(false);
    const opts = { filename, title, user, currency, currencySymbol };

    switch (type) {
      case "pdf":
        exportToPDF(data, opts);
        break;
      case "word":
        exportToWord(data, opts);
        break;
      case "csv":
        exportToCSV(data, opts);
        break;
      default:
        break;
    }
  };

  return (
    <div className="export-dropdown-wrap" ref={dropdownRef}>
      <button
        type="button"
        className="export-main-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled || data.length === 0}
        title={data.length === 0 ? "No records to export" : "Export in PDF, Word, or CSV"}
      >
        <FiDownload className="export-icon" />
        <span>{label}</span>
        <FiChevronDown className={`chevron-icon ${isOpen ? "open" : ""}`} />
      </button>

      {isOpen && (
        <div className={`export-menu placement-${activePlacement}`}>
          <div className="export-menu-header">Select Export Format</div>

          <button
            type="button"
            className="export-option-btn"
            onClick={() => handleExport("pdf")}
          >
            <span className="opt-icon pdf">
              <FiFileText />
            </span>
            <div className="opt-text">
              <strong>PDF Statement (.pdf)</strong>
              <small>Print-ready official financial ledger</small>
            </div>
          </button>

          <button
            type="button"
            className="export-option-btn"
            onClick={() => handleExport("word")}
          >
            <span className="opt-icon word">
              <FiFile />
            </span>
            <div className="opt-text">
              <strong>Word Document (.doc)</strong>
              <small>Formatted for MS Word & Docs</small>
            </div>
          </button>

          <button
            type="button"
            className="export-option-btn"
            onClick={() => handleExport("csv")}
          >
            <span className="opt-icon csv">
              <FiGrid />
            </span>
            <div className="opt-text">
              <strong>Excel Spreadsheet (.csv)</strong>
              <small>Raw tabular data for analysis</small>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
