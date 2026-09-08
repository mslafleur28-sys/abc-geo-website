'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-abby-coral text-white border-transparent hover:bg-[#E85A3C] hover:shadow-[0_8px_24px_rgba(255,107,74,0.28)]',
  secondary:
    'bg-transparent text-abby-sky-ink border-[rgba(0,180,216,0.45)] hover:bg-[rgba(0,180,216,0.1)]',
  ghost:
    'bg-white text-abby-ink border-[#E2E8F0] hover:bg-abby-soft',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-[0.95rem]',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      className = '',
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abby-sky focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-55',
          'hover:-translate-y-px',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </button>
    );
  },
);
