import { ChevronDown } from "lucide-react";

export default function SelectControl({ icon: Icon, label, value, options, onChange }) {
  return (
    <label className="select-control">
      <span className="sr-only">{label}</span>
      {Icon ? <Icon size={17} /> : null}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} aria-hidden="true" />
    </label>
  );
}
