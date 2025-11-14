import React from "react";
import styles from "./Dropdown.module.css";

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
    <div className={`${styles.customDropdown} ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.customDropdownSelect}
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
      <span className={styles.customDropdownArrow}>▼</span>
    </div>
  );
};

export default Dropdown;
