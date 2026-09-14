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
  const [horizontalAlign, setHorizontalAlign] = useState("right");
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (placement === "auto") {
        setActivePlacement(spaceBelow < 240 ? "top" : "bottom");
      } else {
        setActivePlacement(placement);
      }
      if (rect.left + 270 > window.innerWidth) {
        setHorizontalAlign("right");
      } else {
        setHorizontalAlign("left");
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
        <div className={`export-menu placement-${activePlacement} align-${horizontalAlign}`}>
          <div className="export-menu-header">Select Export Format</div>

          <button
            type="button"
            className="export-option-btn"
            onClick={() => handleExport("pdf")}
          >
            <span className="opt-icon">
              <FiFileText />
            </span>
            <span className="opt-label">PDF Statement</span>
            <span className="opt-badge">.PDF</span>
          </button>

          <button
            type="button"
            className="export-option-btn"
            onClick={() => handleExport("word")}
          >
            <span className="opt-icon">
              <FiFile />
            </span>
            <span className="opt-label">Word Document</span>
            <span className="opt-badge">.DOC</span>
          </button>

          <button
            type="button"
            className="export-option-btn"
            onClick={() => handleExport("csv")}
          >
            <span className="opt-icon">
              <FiGrid />
            </span>
            <span className="opt-label">Excel Spreadsheet</span>
            <span className="opt-badge">.CSV</span>
          </button>
        </div>
      )}
    </div>
  );
}
