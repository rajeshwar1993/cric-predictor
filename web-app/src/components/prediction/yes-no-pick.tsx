"use client";

interface YesNoPickProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function YesNoPick({ value, onChange, disabled }: YesNoPickProps) {
  return (
    <div className="flex gap-3">
      {["Yes", "No"].map((option) => {
        const isSelected = value === option;
        const color = option === "Yes" ? "var(--success)" : "var(--danger)";
        return (
          <button
            key={option}
            type="button"
            onClick={() => !disabled && onChange(option)}
            disabled={disabled}
            className={`flex-1 rounded-[10px] border-2 px-4 py-2.5 font-display text-sm font-semibold transition-all ${
              isSelected
                ? ""
                : "border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-light)]"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            style={
              isSelected
                ? {
                    color,
                    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                    borderColor: color,
                  }
                : undefined
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
