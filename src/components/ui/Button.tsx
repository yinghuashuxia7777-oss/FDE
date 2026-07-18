import { SpinnerGap } from '@phosphor-icons/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`button button--${variant} ${className}`.trim()}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <SpinnerGap className="button__spinner" aria-hidden="true" size={18} />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
