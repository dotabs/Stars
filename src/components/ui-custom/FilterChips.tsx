import { X } from 'lucide-react';

interface FilterChipsProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
}

export function FilterChips({ options, selected, onChange, multiSelect = true }: FilterChipsProps) {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      if (multiSelect) {
        onChange([...selected, option]);
      } else {
        onChange([option]);
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => toggleOption(option)}
          className={`filter-chip ${selected.includes(option) ? 'active' : ''}`}
        >
          {option}
          {selected.includes(option) && multiSelect && (
            <X className="w-3 h-3 ml-1" />
          )}
        </button>
      ))}
    </div>
  );
}
