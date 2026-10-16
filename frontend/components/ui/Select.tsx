"use client";

import React, { forwardRef, ChangeEvent } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, fullWidth = false, className = "", id, onChange, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${selectId}-error` : undefined;
    const hintId = hint ? `${selectId}-hint` : undefined;

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(event.target.value);
      }
    };

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label htmlFor={selectId} className="block text-label-sm text-foreground mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full bg-surface border rounded-md
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
              disabled:opacity-50 disabled:cursor-not-allowed
              appearance-none
              px-3 py-2 pr-10
              ${error ? "border-danger focus-visible:ring-danger" : "border-border hover:border-border-strong"}
              ${className}
            `}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={`${errorId || ""} ${hintId || ""}`.trim() || undefined}
            onChange={handleChange}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-body-xs text-danger" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-body-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";