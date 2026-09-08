'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label: ReactNode;
  description?: ReactNode;
  requiredMark?: boolean;
};

export function Checkbox({
  id,
  label,
  description,
  requiredMark = false,
  className = '',
  disabled,
  ...props
}: CheckboxProps) {
  const inputId = id ?? props.name;

  return (
    <label
      htmlFor={inputId}
      className={[
        'flex gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 transition',
        'hover:border-[rgba(0,180,216,0.35)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-abby-sky has-[:focus-visible]:ring-offset-2',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        id={inputId}
        type="checkbox"
        disabled={disabled}
        className="mt-1 h-4 w-4 shrink-0 rounded border-[#CBD5E1] text-abby-coral accent-abby-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abby-sky focus-visible:ring-offset-2"
        {...props}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-abby-ink">
          {label}
          {requiredMark ? (
            <span className="ml-1 text-abby-coral" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
        {description ? (
          <span className="mt-1 block text-sm leading-relaxed text-abby-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
