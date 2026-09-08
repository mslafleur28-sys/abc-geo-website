'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
};

export function Input({
  id,
  label,
  hint,
  error,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-abby-ink"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'w-full rounded-lg border bg-white px-3.5 py-2.5 text-abby-ink shadow-sm transition',
          'placeholder:text-abby-muted/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abby-sky focus-visible:ring-offset-2',
          error
            ? 'border-[#EF4444]'
            : 'border-[#E2E8F0] hover:border-[rgba(0,180,216,0.4)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-abby-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-[#EF4444]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
