import React from "react";
import "./Dropdown.css";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  value,
  onChange,
  options,
  placeholder,
  className = "",
}) => {
  return (
    <div className={`custom-dropdown ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="custom-dropdown-select"
      >
        {placeholder && placeholder.trim() !== "" && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="custom-dropdown-arrow">▼</span>
    </div>
  );
};

export default Dropdown;
