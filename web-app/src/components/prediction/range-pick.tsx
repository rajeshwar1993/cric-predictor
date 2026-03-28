"use client";

interface RangePickProps {
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function RangePick({ options, value, onChange, disabled }: RangePickProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => !disabled && onChange(option)}
            disabled={disabled}
            className={`min-w-[70px] rounded-[10px] border px-4 py-2 font-stats text-sm font-medium transition-all ${
              isSelected
                ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan)]"
                : "border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
