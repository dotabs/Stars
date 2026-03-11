import { memo, useMemo } from 'react';
import { X } from 'lucide-react';

interface FilterChipsProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
}

export const FilterChips = memo(function FilterChips({
  options,
  selected,
  onChange,
  multiSelect = true,
}: FilterChipsProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleOption = (option: string) => {
    if (selectedSet.has(option)) {
      onChange(selected.filter((selectedOption) => selectedOption !== option));
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
          className={`filter-chip ${selectedSet.has(option) ? 'active' : ''}`}
        >
          {option}
          {selectedSet.has(option) && multiSelect && (
            <X className="w-3 h-3 ml-1" />
          )}
        </button>
      ))}
    </div>
  );
});
